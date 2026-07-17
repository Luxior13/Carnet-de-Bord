# Database migration workflow

The application database must be managed by Prisma Migrate. Do not use
`prisma db push` on a shared or production database.

## Existing unmanaged database

The historical database was created without a `_prisma_migrations` table. It
must be baselined exactly once before normal deploys can run.

1. Take a provider-level snapshot when available.
2. Review the configured `DATABASE_URL`.
3. Run `bun run db:backup` and verify the ignored JSON backup path.
4. Run `bun run db:migrate:baseline --confirm=I_HAVE_A_VERIFIED_BACKUP` from
   `packages/database` (the equivalent environment variable is also accepted).
5. Run `bun run db:migrate:status` and verify that the schema is up to date.

The baseline command refuses unknown or failed migration records. It applies
the idempotent reconciliation SQL before recording the historical migrations.
Legacy `StaffProfile` rows are copied to `ArchivedStaffProfile`, never erased.

## Normal deploy

Use `bun run db:migrate:deploy`. Its preflight refuses to run migrations on an
existing application schema with no migration history. A genuinely empty
database is allowed and receives the full migration chain.

Always test migrations on a clone and an empty database before production.

## Backup and restore drill

`bun run db:backup` writes a versioned snapshot and a SHA-256 sidecar with
owner-only permissions. The snapshot contains authentication material and must
be moved immediately to encrypted, access-controlled storage.

Restoration is deliberately restricted to a migrated, completely empty
database. Verify the snapshot and target first:

```powershell
bun run db:restore -- --file="C:\secure\backup.json" --dry-run
```

After reviewing the reported target and row counts, perform the offline restore:

```powershell
bun run db:restore -- --file="C:\secure\backup.json" --confirm-empty-restore=RESTORE-INTO-EMPTY-DATABASE
```

Run this drill regularly on an isolated database and verify application login,
MFA, notifications, audit history and background jobs before declaring the
backup usable.
