import { AuditAction as PrismaAuditAction } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAuditLogWithHeaders: vi.fn(),
  prisma: {
    auditLog: { count: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    person: { findMany: vi.fn(), findUnique: vi.fn() },
    user: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock('server-only', () => ({}));
vi.mock('$env', () => ({ env: { NODE_ENV: 'test' } }));
vi.mock('$server/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('$server/audit-log', () => ({
  createAuditLogWithHeaders: mocks.createAuditLogWithHeaders,
}));

import {
  buildJournalParams,
  DEFAULT_JOURNAL_QUERY,
  isJournalSearchApplicable,
  readJournalQuery,
  summarizeJournalChanges,
} from '$features/audit/audit-journal.types';
import { JOURNAL_ACTION_LABELS } from '$features/audit/server/audit-journal.labels';
import {
  getReaderRights,
  type JournalRow,
  projectJournalEvent,
} from '$features/audit/server/audit-journal.projection';
import {
  listJournalEvents,
  traceJournalView,
} from '$features/audit/server/audit-journal.service';

const superadmin = {
  id: 'root',
  isProtected: true,
  permissions: null,
  role: 'ADMIN' as const,
};
const admin = {
  id: 'admin',
  isProtected: false,
  permissions: null,
  role: 'ADMIN' as const,
};
/** Journal reader without access to the Répertoire. */
const auditor = {
  id: 'auditor',
  isProtected: false,
  permissions: { 'audit:view': true },
  role: 'USER' as const,
};

const row = (overrides: Partial<JournalRow> = {}): JournalRow => ({
  action: 'USER_UPDATE',
  actorDisplayNameSnapshot: 'Camille Exemple',
  actorLoginNameSnapshot: 'camille.exemple',
  actorRoleSnapshot: 'ADMIN',
  category: 'USER',
  createdAt: new Date('2026-10-30T12:00:00Z'),
  description: 'Utilisateur modifié: alex.exemple',
  entityId: null,
  entityType: null,
  eventKind: 'ACTIVITY',
  eventVersion: 1,
  fieldChanges: [],
  id: 'event-1',
  ipAddress: '2001:0db8:0000:0000:0000:0000:0000:0001',
  metadata: null,
  outcome: 'SUCCESS',
  pageKey: null,
  poleKey: null,
  requestId: null,
  severity: 'INFO',
  stream: 'IDENTITY',
  tabKey: null,
  targetDisplayNameSnapshot: 'Alex Exemple',
  targetLoginNameSnapshot: 'alex.exemple',
  targetRoleSnapshot: 'USER',
  targetUserId: 'alex',
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36',
  userId: 'camille',
  ...overrides,
});

describe('activity journal query (30 October 2026)', () => {
  it('reads known filters, drops malformed ones and writes only changes', () => {
    const query = readJournalQuery(
      new URLSearchParams(
        'type=security&show=failures&period=30d&search=  alex   ex &user=abc_1&person=../x&page=3',
      ),
    );

    expect(query).toEqual({
      page: 3,
      period: '30d',
      person: null,
      search: 'alex ex',
      show: 'failures',
      type: 'security',
      user: 'abc_1',
    });
    expect(buildJournalParams(query).toString()).toBe(
      'type=security&show=failures&period=30d&search=alex+ex&user=abc_1&page=3',
    );
    expect(
      readJournalQuery(new URLSearchParams('type=x&period=10y&page=0')),
    ).toEqual(DEFAULT_JOURNAL_QUERY);
    expect(buildJournalParams(DEFAULT_JOURNAL_QUERY).toString()).toBe('');
  });

  it('applies a search from three letters or digits', () => {
    expect(isJournalSearchApplicable('al')).toBe(false);
    expect(isJournalSearchApplicable('a.l')).toBe(false);
    expect(isJournalSearchApplicable('ale')).toBe(true);
  });

  it('names each changed field once on the collapsed line', () => {
    const change = (
      label: string,
      field?: string,
    ): { after: string; before: string; field?: string; label: string } => ({
      after: 'b',
      before: 'a',
      field,
      label,
    });

    expect(summarizeJournalChanges([])).toBeNull();
    expect(summarizeJournalChanges([change('Prénom'), change('Nom')])).toBe(
      'Prénom, Nom',
    );
    expect(
      summarizeJournalChanges([
        change('Coordonnées · Email', 'Email'),
        change('Coordonnées · Email', 'Email'),
        change('Coordonnées · Téléphone', 'Téléphone'),
        change('Identité · Prénom', 'Prénom'),
      ]),
    ).toBe('Email, Téléphone, Prénom');
    expect(
      summarizeJournalChanges(
        ['Prénom', 'Nom', 'Pseudo', 'Naissance', 'Statut', 'Email'].map(
          (label) => change(label),
        ),
      ),
    ).toBe('Prénom, Nom et 4 autres');
  });

  it('has a French label for every persisted action', () => {
    expect(Object.keys(JOURNAL_ACTION_LABELS).sort()).toEqual(
      Object.values(PrismaAuditAction).sort(),
    );
  });
});

describe('activity journal projection', () => {
  it('shows the IP to the superadmin only and the browser to every reader', () => {
    const forRoot = projectJournalEvent(
      row(),
      getReaderRights(superadmin),
      new Map(),
    );
    const forAdmin = projectJournalEvent(
      row(),
      getReaderRights(admin),
      new Map(),
    );

    expect(forRoot.ip).toBe('2001:db8::1');
    expect(forRoot.ipMasked).toBe(false);
    expect(forAdmin.ip).toBeNull();
    expect(forAdmin.ipMasked).toBe(true);
    expect(forAdmin.browser).toBe('Windows · Chrome');
    expect(forAdmin.label).toBe('Compte modifié');
    expect(forAdmin.target).toMatchObject({
      kind: 'user',
      name: 'Alex Exemple',
    });
  });

  it('lists account changes and masks the contact address without its right', () => {
    const event = row({
      metadata: {
        after: { contactEmail: 'b@exemple.fr', isActive: false, role: 'ADMIN' },
        before: { contactEmail: 'a@exemple.fr', isActive: true, role: 'USER' },
      },
    });

    expect(
      projectJournalEvent(event, getReaderRights(admin), new Map()).changes,
    ).toEqual([
      {
        after: 'b@exemple.fr',
        before: 'a@exemple.fr',
        label: 'Email de contact',
      },
      { after: 'Administrateur', before: 'Utilisateur', label: 'Rôle' },
      { after: 'Non', before: 'Oui', label: 'Compte actif' },
    ]);
    expect(
      projectJournalEvent(event, getReaderRights(auditor), new Map())
        .changes[0],
    ).toEqual({
      after: 'Valeur masquée',
      before: 'Valeur masquée',
      label: 'Email de contact',
    });
  });

  it('links an account only for a reader who may open its page', () => {
    const event = row({});

    expect(
      projectJournalEvent(event, getReaderRights(admin), new Map()).target,
    ).toMatchObject({
      href: expect.stringContaining('/systeme/utilisateurs/'),
    });
    // The auditor holds audit:view alone: the account stays named, unlinked.
    expect(
      projectJournalEvent(event, getReaderRights(auditor), new Map()).target,
    ).toMatchObject({ href: null, kind: 'user', name: 'Alex Exemple' });
  });

  it('names granted and revoked permissions and the reason of a failed login', () => {
    const permissions = projectJournalEvent(
      row({
        action: 'PERMISSION_UPDATE',
        metadata: {
          effectivelyGrantedPermissionKeys: ['persons:view'],
          effectivelyRevokedPermissionKeys: ['users:view'],
        },
      }),
      getReaderRights(admin),
      new Map(),
    );
    const login = projectJournalEvent(
      row({
        action: 'LOGIN_FAILED',
        actorDisplayNameSnapshot: null,
        actorLoginNameSnapshot: null,
        category: 'AUTH',
        eventKind: 'CONNECTION',
        metadata: { reason: 'INVALID_CREDENTIALS' },
        outcome: 'FAILURE',
        stream: 'AUTHENTICATION',
        targetUserId: null,
        userId: null,
      }),
      getReaderRights(admin),
      new Map(),
    );

    expect(permissions.facts).toEqual([
      { label: 'Accordées', value: 'Consulter le répertoire' },
      { label: 'Retirées', value: 'Consulter les utilisateurs' },
    ]);
    expect(login).toMatchObject({
      actor: { id: null, name: 'Aucun compte reconnu' },
      facts: [
        { label: 'Motif', value: 'Identifiant ou mot de passe incorrect' },
      ],
      subject: 'Utilisateur modifié: alex.exemple',
      tone: 'failure',
      typeLabel: 'Sécurité',
    });
  });

  it('explains a block of refused attempts with its step, proof and duration', () => {
    const blocked = projectJournalEvent(
      row({
        action: 'ATTEMPTS_BLOCKED',
        actorDisplayNameSnapshot: null,
        actorLoginNameSnapshot: null,
        category: 'AUTH',
        eventKind: 'CONNECTION',
        metadata: {
          blockedForSeconds: 1790,
          loginName: 'alex.exemple',
          proof: 'password',
          step: 'login',
        },
        outcome: 'FAILURE',
        severity: 'WARNING',
        stream: 'AUTHENTICATION',
        userId: null,
      }),
      getReaderRights(admin),
      new Map(),
    );

    expect(blocked).toMatchObject({
      actor: { id: null, name: 'Aucun compte reconnu' },
      facts: [
        { label: 'Étape', value: 'Connexion' },
        { label: 'Preuve refusée', value: 'Mot de passe' },
        { label: 'Durée du blocage', value: 'environ 30 min' },
      ],
      label: 'Tentatives bloquées',
      tone: 'failure',
      typeLabel: 'Sécurité',
    });
  });

  it('follows the Répertoire rights for a person record and its values', () => {
    const personEvent = row({
      action: 'PERSON_UPDATE',
      category: 'PERSON',
      entityId: 'person-1',
      entityType: 'PERSON',
      fieldChanges: [
        {
          afterHash: null,
          afterValue: '"OUTSIDE_STRUCTURE"',
          auditLogId: 'event-1',
          beforeHash: null,
          beforeValue: '"IN_STRUCTURE"',
          changeType: 'UPDATE',
          createdAt: new Date('2026-10-30T12:00:00Z'),
          entityId: 'person-1',
          entityType: 'PERSON',
          fieldKey: 'structureStatus',
          id: 'change-1',
          recordId: null,
          sectionKey: 'structure',
          valueKeyVersion: null,
          valueMode: 'PLAIN',
          valuesAuthTag: null,
          valuesCiphertext: null,
          valuesIv: null,
        },
        {
          afterHash: null,
          afterValue: null,
          auditLogId: 'event-1',
          beforeHash: null,
          beforeValue: null,
          changeType: 'DELETE',
          createdAt: new Date('2026-10-30T12:00:00Z'),
          entityId: 'person-1',
          entityType: 'PERSON',
          fieldKey: 'email',
          id: 'change-2',
          recordId: 'email-1',
          sectionKey: 'contacts',
          valueKeyVersion: null,
          valueMode: 'NONE',
          valuesAuthTag: null,
          valuesCiphertext: null,
          valuesIv: null,
        },
      ],
      stream: 'IDENTITY',
      targetUserId: null,
    });
    const names = new Map([['person-1', 'MaxLaFontaine']]);
    const forAdmin = projectJournalEvent(
      personEvent,
      getReaderRights(admin),
      names,
    );
    const forAuditor = projectJournalEvent(
      personEvent,
      getReaderRights(auditor),
      names,
    );

    expect(forAdmin.target).toEqual({
      href: '/membres/repertoire/person-1',
      id: 'person-1',
      kind: 'person',
      name: 'MaxLaFontaine',
    });
    expect(forAdmin.changes).toEqual([
      {
        after: 'Hors structure',
        before: 'Dans la structure',
        field: 'Rattachement',
        label: 'Structure · Rattachement',
      },
      {
        after: 'Valeur effacée',
        before: 'Valeur effacée',
        field: 'Email',
        label: 'Coordonnées · Email',
      },
    ]);
    expect(forAuditor.target).toMatchObject({
      href: null,
      name: 'Fiche du répertoire',
    });
    expect(forAuditor.changes[0]).toMatchObject({
      after: 'Valeur masquée',
      before: 'Valeur masquée',
    });
    expect(
      projectJournalEvent(personEvent, getReaderRights(admin), new Map())
        .target,
    ).toMatchObject({ href: null, name: 'Fiche supprimée' });
  });
});

describe('activity journal service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.auditLog.count.mockResolvedValue(0);
    mocks.prisma.auditLog.findMany.mockResolvedValue([]);
    mocks.prisma.user.findMany.mockResolvedValue([{ id: 'root' }]);
  });

  const lastWhere = (): unknown =>
    mocks.prisma.auditLog.findMany.mock.calls.at(-1)?.[0]?.where;

  it('hides the protected account from every other reader, not from itself', async () => {
    await listJournalEvents(admin, DEFAULT_JOURNAL_QUERY, null);
    expect(JSON.stringify(lastWhere())).toContain('"notIn":["root"]');

    await listJournalEvents(superadmin, DEFAULT_JOURNAL_QUERY, null);
    expect(JSON.stringify(lastWhere())).not.toContain('notIn');
  });

  it('applies type, importance, record and search filters', async () => {
    await listJournalEvents(
      superadmin,
      {
        ...DEFAULT_JOURNAL_QUERY,
        person: 'person-1',
        search: 'ale',
        show: 'failures',
        type: 'security',
      },
      null,
    );
    const where = JSON.stringify(lastWhere());

    expect(where).toContain('"stream":{"in":["AUTHENTICATION","SECURITY"]}');
    expect(where).toContain('"outcome":"FAILURE"');
    expect(where).toContain('"entityId":"person-1","entityType":"PERSON"');
    expect(where).toContain('"contains":"ale","mode":"insensitive"');
  });

  it('keeps the reading instant of the first page and refuses a future one', async () => {
    const asOf = new Date(Date.now() - 60_000).toISOString();
    const response = await listJournalEvents(
      superadmin,
      { ...DEFAULT_JOURNAL_QUERY, page: 2 },
      asOf,
    );
    expect(response.asOf).toBe(asOf);
    expect(mocks.prisma.auditLog.findMany.mock.calls.at(-1)?.[0]).toMatchObject(
      { skip: 50, take: 50 },
    );

    const future = new Date(Date.now() + 3_600_000).toISOString();
    expect(
      (await listJournalEvents(superadmin, DEFAULT_JOURNAL_QUERY, future)).asOf,
    ).not.toBe(future);
  });

  it('traces a reading once per reader every fifteen minutes', async () => {
    mocks.prisma.auditLog.findFirst.mockResolvedValueOnce(null);
    await traceJournalView(admin);
    expect(mocks.createAuditLogWithHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUDIT_VIEW',
        userId: 'admin',
      }),
      { required: true },
    );

    mocks.prisma.auditLog.findFirst.mockResolvedValueOnce({ id: 'recent' });
    await traceJournalView(admin);
    expect(mocks.createAuditLogWithHeaders).toHaveBeenCalledTimes(1);
  });
});
