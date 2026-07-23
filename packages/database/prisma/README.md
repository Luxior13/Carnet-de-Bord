# Base de données

## Migrations

Valider et générer le client :

```bash
bunx prisma validate --schema packages/database/prisma/schema.prisma
bunx prisma generate --schema packages/database/prisma/schema.prisma
```

Déployer les migrations :

```bash
bun run db:migrate:deploy
```

Le schéma courant ne contient aucun worker ni aucune file de tâches. La
migration `20260722120000_remove_background_worker` retire la table historique
`BackgroundJob` et son enum. Ne modifiez pas la migration de fondation déjà
appliquée : la suppression se fait volontairement dans cette nouvelle
migration.

## Fiches Personnes

La migration `20260721120000_person_identity_foundation` crée les tables
d’identité, les contacts, les profils sociaux, l’historique de champs chiffré et
`PersonDeletionTombstone`.

Une suppression est synchrone et transactionnelle. Le tombstone contient
uniquement l’identifiant de la fiche, l’identifiant idempotent de l’opération et
la date. Il est immuable et garantit l’idempotence des nouvelles tentatives de
suppression dans l’état courant de la base.

Une sauvegarde créée avant la suppression ne contient nécessairement ni le
tombstone ni la suppression. Sa restauration peut donc réintroduire la fiche :
ce cas doit être traité lors de la procédure de restauration et par une durée
de conservation des sauvegardes adaptée.

## Sauvegardes

Créer une sauvegarde signée v6 :

```bash
bun run --filter @repo/database db:backup
```

Variables requises :

- toutes les `AUDIT_ENCRYPTION_KEY_V<n>` encore référencées ;
- `DATABASE_BACKUP_SIGNING_CURRENT_VERSION` ;
- `DATABASE_BACKUP_SIGNING_PRIVATE_KEY_V<n>` ;
- `DATABASE_BACKUP_SIGNING_PUBLIC_KEY_V<n>` pour l’auto-vérification.

Le format exporte les tables dans l’ordre des clés étrangères, par lots bornés,
avec checksum SHA-256 et enveloppe Ed25519. Il n’exporte aucune file ni aucun
état de worker.

## Restauration

La cible doit être vide, migrée et isolée du trafic :

```bash
bun run --filter @repo/database db:restore -- --file="C:\secure\backup.jsonl" --dry-run
bun run --filter @repo/database db:restore -- --file="C:\secure\backup.jsonl" --confirm-empty-restore=RESTORE-INTO-EMPTY-DATABASE
```

Le fichier de signature est obligatoire. La restauration valide le flux fermé,
le checksum, la signature, les compteurs, les clés AES et l’existence d’un seul
compte racine valide avant de considérer l’opération terminée.

## Performance Personnes

Le contrôle de plans s’exécute uniquement sur une base isolée explicitement
confirmée :

```bash
bun run persons:performance
```

Ne pointez jamais ce contrôle de charge vers la base applicative courante.
