import 'server-only';

import type { NotificationSeverity, Prisma } from '@prisma/client';

import { createNotification } from '$server/notifications';

export type SecurityNotificationKind =
  | 'ACCESS_CHANGED'
  | 'ACCOUNT_ACTIVATED'
  | 'ACCOUNT_DEACTIVATED'
  | 'CONTACT_EMAIL_CHANGED'
  | 'LOGIN_NAME_CHANGED'
  | 'MFA_DISABLED'
  | 'MFA_ENABLED'
  | 'MFA_RESET'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET'
  | 'RECOVERY_CODES_REGENERATED'
  | 'SESSIONS_REVOKED';

type SecurityNotificationClient = Pick<
  Prisma.TransactionClient,
  'notification' | 'notificationRecipient'
>;

type SecurityNotificationDefinition = {
  body: string;
  href: string;
  severity: NotificationSeverity;
  title: string;
};

const SECURITY_NOTIFICATION_DEFINITIONS = {
  ACCESS_CHANGED: {
    body: 'Votre rôle ou vos autorisations ont été modifiés. Vérifiez que vos accès correspondent à vos responsabilités.',
    href: '/mon-compte',
    severity: 'WARNING',
    title: 'Vos accès ont été modifiés',
  },
  ACCOUNT_ACTIVATED: {
    body: 'Votre compte a été réactivé. Vous pouvez de nouveau accéder au site.',
    href: '/mon-compte',
    severity: 'SUCCESS',
    title: 'Votre compte a été réactivé',
  },
  ACCOUNT_DEACTIVATED: {
    body: 'Votre compte a été désactivé. Contactez un administrateur si cette action est inattendue.',
    href: '/mon-compte',
    severity: 'CRITICAL',
    title: 'Votre compte a été désactivé',
  },
  CONTACT_EMAIL_CHANGED: {
    body: 'L’adresse email de contact de votre compte a été modifiée.',
    href: '/mon-compte',
    severity: 'WARNING',
    title: 'Email de contact modifié',
  },
  LOGIN_NAME_CHANGED: {
    body: 'Votre identifiant de connexion a été modifié. Vos autres sessions ont été révoquées.',
    href: '/mon-compte?section=security',
    severity: 'WARNING',
    title: 'Identifiant de connexion modifié',
  },
  MFA_DISABLED: {
    body: 'La double authentification de votre compte a été désactivée. Réactivez-la si cette action est inattendue.',
    href: '/mon-compte?section=security',
    severity: 'CRITICAL',
    title: 'Double authentification désactivée',
  },
  MFA_ENABLED: {
    body: 'La double authentification protège maintenant votre compte.',
    href: '/mon-compte?section=security',
    severity: 'SUCCESS',
    title: 'Double authentification activée',
  },
  MFA_RESET: {
    body: 'La double authentification de votre compte a été réinitialisée par le compte racine. Toutes vos sessions ont été révoquées.',
    href: '/mon-compte?section=security',
    severity: 'CRITICAL',
    title: 'Double authentification réinitialisée',
  },
  PASSWORD_CHANGED: {
    body: 'Votre mot de passe a été modifié et vos autres sessions ont été révoquées.',
    href: '/mon-compte?section=security',
    severity: 'SUCCESS',
    title: 'Mot de passe modifié',
  },
  PASSWORD_RESET: {
    body: 'Votre mot de passe a été réinitialisé par un administrateur. Un mot de passe temporaire est requis à votre prochaine connexion.',
    href: '/mon-compte?section=security',
    severity: 'CRITICAL',
    title: 'Mot de passe réinitialisé',
  },
  RECOVERY_CODES_REGENERATED: {
    body: 'De nouveaux codes de secours ont été générés. Les anciens codes ne sont plus valides.',
    href: '/mon-compte?section=security',
    severity: 'WARNING',
    title: 'Codes de secours renouvelés',
  },
  SESSIONS_REVOKED: {
    body: 'Une ou plusieurs sessions de votre compte ont été révoquées.',
    href: '/mon-compte?section=security',
    severity: 'WARNING',
    title: 'Sessions révoquées',
  },
} as const satisfies Record<
  SecurityNotificationKind,
  SecurityNotificationDefinition
>;

export const createSecurityNotification = async (
  input: {
    actorUserId?: string | null;
    kind: SecurityNotificationKind;
    recipientUserId: string;
  },
  client: SecurityNotificationClient,
): Promise<void> => {
  const definition = SECURITY_NOTIFICATION_DEFINITIONS[input.kind];

  await createNotification(
    {
      ...definition,
      createdById:
        input.actorUserId && input.actorUserId !== input.recipientUserId
          ? input.actorUserId
          : null,
      recipientUserIds: [input.recipientUserId],
      type: `security.${input.kind.toLowerCase()}`,
    },
    client,
  );
};
