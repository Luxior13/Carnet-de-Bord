import {
  AuditAction,
  AuditCategory,
  AuditEventKind,
  AuditOutcome,
  AuditSeverity,
  AuditStream,
  Prisma,
  PrismaClient,
  UserRole,
} from '@prisma/client';

import { createDatabaseBackup } from './database-backup';
import { getPublicTables } from './database-tools';

const RESET_CONFIRMATION = 'RESET-PROTECTED-ROOT-MFA';
const REQUIRED_TABLES = [
  'AuditLog',
  'MfaLoginChallenge',
  'MfaRecoveryCode',
  'RateLimit',
  'Session',
  'TotpCredential',
  'TotpEnrollment',
  'User',
] as const;

type RootRow = {
  deletedAt: Date | null;
  failedLoginAttempts: number;
  firstName: string;
  id: string;
  isActive: boolean;
  lastName: string;
  lockedUntil: Date | null;
  loginName: string;
  mfaEnabledAt: Date | null;
  role: UserRole;
};

type ScriptArguments = {
  confirmLogin: string;
  dryRun: boolean;
};

function parseArguments(arguments_: string[]): ScriptArguments {
  const normalizedArguments = arguments_.filter(
    (argument) => argument !== '--',
  );
  const loginArguments = normalizedArguments.filter((argument) =>
    argument.startsWith('--confirm-login='),
  );
  const resetArguments = normalizedArguments.filter((argument) =>
    argument.startsWith('--confirm-reset-mfa='),
  );
  const allowedArguments = normalizedArguments.filter(
    (argument) =>
      argument === '--dry-run' ||
      argument.startsWith('--confirm-login=') ||
      argument.startsWith('--confirm-reset-mfa='),
  );

  if (allowedArguments.length !== normalizedArguments.length) {
    throw new Error(
      'Argument inconnu. Consultez packages/database/ROOT_RECOVERY.md.',
    );
  }
  if (loginArguments.length !== 1) {
    throw new Error(
      'Un unique argument --confirm-login=<identifiant actuel> est obligatoire.',
    );
  }
  if (resetArguments.length !== 1) {
    throw new Error(
      `Un unique argument --confirm-reset-mfa=${RESET_CONFIRMATION} est obligatoire.`,
    );
  }

  const confirmLogin =
    loginArguments[0]?.slice('--confirm-login='.length) ?? '';
  const resetConfirmation =
    resetArguments[0]?.slice('--confirm-reset-mfa='.length) ?? '';

  if (confirmLogin.length === 0) {
    throw new Error('L’identifiant de confirmation ne peut pas être vide.');
  }
  if (resetConfirmation !== RESET_CONFIRMATION) {
    throw new Error(
      `Confirmation incorrecte. La valeur exacte attendue est ${RESET_CONFIRMATION}.`,
    );
  }

  return {
    confirmLogin,
    dryRun: normalizedArguments.includes('--dry-run'),
  };
}

function assertProtectedRoot(roots: RootRow[], confirmLogin: string): RootRow {
  if (roots.length !== 1) {
    throw new Error(
      `Réinitialisation refusée : exactement un compte racine protégé est requis (${roots.length} trouvé).`,
    );
  }

  const root = roots[0];

  if (!root) {
    throw new Error('Réinitialisation refusée : compte racine introuvable.');
  }
  if (
    root.role !== UserRole.ADMIN ||
    !root.isActive ||
    root.deletedAt !== null
  ) {
    throw new Error(
      'Réinitialisation refusée : le compte racine doit être ADMIN, actif et non supprimé.',
    );
  }
  if (root.loginName !== confirmLogin) {
    throw new Error(
      'Réinitialisation refusée : --confirm-login ne correspond pas exactement à l’identifiant racine actuel.',
    );
  }

  return root;
}

const prisma = new PrismaClient();

try {
  const scriptArguments = parseArguments(process.argv.slice(2));
  const tables = await getPublicTables(prisma);
  const missingTables = REQUIRED_TABLES.filter((table) => !tables.has(table));

  if (missingTables.length > 0) {
    throw new Error(
      `Schéma MFA incomplet. Appliquez les migrations avant cette procédure. Tables manquantes : ${missingTables.join(', ')}.`,
    );
  }

  const [mfaResetAuditAction] = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM "pg_catalog"."pg_enum" enum_value
      INNER JOIN "pg_catalog"."pg_type" enum_type
        ON enum_type."oid" = enum_value."enumtypid"
      INNER JOIN "pg_catalog"."pg_namespace" enum_namespace
        ON enum_namespace."oid" = enum_type."typnamespace"
      WHERE enum_namespace."nspname" = 'public'
        AND enum_type."typname" = 'AuditAction'
        AND enum_value."enumlabel" = 'MFA_RESET'
    ) AS "exists"
  `;

  if (!mfaResetAuditAction?.exists) {
    throw new Error(
      'Schéma MFA incomplet : la valeur AuditAction.MFA_RESET est absente. Appliquez les migrations.',
    );
  }

  const preflightRoots = await prisma.user.findMany({
    select: {
      deletedAt: true,
      failedLoginAttempts: true,
      firstName: true,
      id: true,
      isActive: true,
      lastName: true,
      lockedUntil: true,
      loginName: true,
      mfaEnabledAt: true,
      role: true,
    },
    where: { isProtected: true },
  });

  assertProtectedRoot(preflightRoots, scriptArguments.confirmLogin);

  if (scriptArguments.dryRun) {
    process.stdout.write(
      'Vérification à blanc réussie. Aucune sauvegarde ni mutation de la base n’a été effectuée.\n',
    );
  } else {
    const backup = await createDatabaseBackup(prisma);
    process.stdout.write(`Sauvegarde de sécurité créée : ${backup.filePath}\n`);

    const resetResult = await prisma.$transaction(
      async (transaction) => {
        const lockedRoots = await transaction.$queryRaw<RootRow[]>`
          SELECT
            "id",
            "loginName",
            "role",
            "isActive",
            "deletedAt",
            "failedLoginAttempts",
            "firstName",
            "lockedUntil",
            "lastName",
            "mfaEnabledAt"
          FROM "public"."User"
          WHERE "isProtected" = true
          FOR UPDATE
        `;
        const root = assertProtectedRoot(
          lockedRoots,
          scriptArguments.confirmLogin,
        );

        const deletedSessions = await transaction.session.deleteMany({
          where: { userId: root.id },
        });
        const deletedChallenges =
          await transaction.mfaLoginChallenge.deleteMany({
            where: { userId: root.id },
          });
        const deletedEnrollments = await transaction.totpEnrollment.deleteMany({
          where: { userId: root.id },
        });
        const deletedCredentials = await transaction.totpCredential.deleteMany({
          where: { userId: root.id },
        });
        const deletedRecoveryCodes =
          await transaction.mfaRecoveryCode.deleteMany({
            where: { userId: root.id },
          });
        const deletedRateLimits = await transaction.rateLimit.deleteMany({
          where: {
            OR: [
              { key: { startsWith: 'auth-login:' } },
              { key: { startsWith: 'auth-mfa:' } },
              {
                key: {
                  in: [
                    `account-reauth:${root.id}`,
                    `account-mfa-manage:${root.id}`,
                    `admin-mfa-reset-password:${root.id}`,
                    `admin-mfa-reset-totp:${root.id}`,
                  ],
                },
              },
            ],
          },
        });

        await transaction.user.update({
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            mfaEnabledAt: null,
            securityVersion: { increment: 1 },
          },
          where: { id: root.id },
        });

        await transaction.auditLog.create({
          data: {
            action: AuditAction.MFA_RESET,
            category: AuditCategory.AUTH,
            description:
              'Double authentification racine réinitialisée hors ligne',
            eventKind: AuditEventKind.ACTIVITY,
            eventVersion: 1,
            metadata: {
              deletedChallenges: deletedChallenges.count,
              deletedCredentials: deletedCredentials.count,
              deletedEnrollments: deletedEnrollments.count,
              deletedRateLimits: deletedRateLimits.count,
              deletedRecoveryCodes: deletedRecoveryCodes.count,
              deletedSessions: deletedSessions.count,
              previousAccountLock: root.lockedUntil !== null,
              previousFailedLoginAttempts: root.failedLoginAttempts,
              previousMfaEnabled: root.mfaEnabledAt !== null,
              recoveryMode: 'OFFLINE_ROOT_MFA_RESET',
            },
            outcome: AuditOutcome.SUCCESS,
            severity: AuditSeverity.CRITICAL,
            stream: AuditStream.SECURITY,
            targetDisplayNameSnapshot:
              `${root.firstName.trim()} ${root.lastName.trim()}`.trim() ||
              root.loginName,
            targetLoginNameSnapshot: root.loginName,
            targetRoleSnapshot: root.role,
            targetUserId: root.id,
          },
        });

        return {
          deletedChallenges: deletedChallenges.count,
          deletedCredentials: deletedCredentials.count,
          deletedEnrollments: deletedEnrollments.count,
          deletedRateLimits: deletedRateLimits.count,
          deletedRecoveryCodes: deletedRecoveryCodes.count,
          deletedSessions: deletedSessions.count,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    process.stdout.write(
      `Réinitialisation MFA racine terminée. Sessions révoquées : ${resetResult.deletedSessions}. Le prochain accès imposera la configuration d’un nouvel authentificateur.\n`,
    );
  }
} catch (error) {
  const message = error instanceof Error ? error.message : 'Erreur inconnue';
  process.stderr.write(`Échec de la récupération MFA racine : ${message}\n`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
