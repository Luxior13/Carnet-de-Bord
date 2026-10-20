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

Le projet est actuellement en développement. Cela ne justifie ni un reset
implicite ni la réécriture des migrations déjà appliquées : vérifier la cible
et la liste des migrations en attente avant d'utiliser le wrapper ci-dessus.
Il applique les migrations existantes ; il ne certifie pas l'absence de dérive
du schéma. Voir le [comportement de Prisma Migrate v6](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/development-and-production).

Le schéma courant ne contient aucun worker ni aucune file de tâches. La
migration `20260722120000_remove_background_worker` retire la table historique
`BackgroundJob` et son enum. Ne modifiez pas la migration de fondation déjà
appliquée : la suppression se fait volontairement dans cette nouvelle
migration.

## Fiches Personnes

La migration `20260721120000_person_identity_foundation` crée les tables
d’identité, les contacts, les profils sociaux, l’historique de champs chiffré et
`PersonDeletionTombstone`.

`Person` représente une personne physique, indépendamment d'un compte `User` :
pas de clé étrangère entre eux, ni de rapprochement automatique par email.
`birthDate` est une date civile PostgreSQL `DATE`. Les trois collections de
coordonnées appartiennent à une personne et sont supprimées en cascade avec
elle ; leurs doublons sont interdits dans cette fiche, pas entre deux personnes.

Le contrat complet comprend le schéma Prisma, les migrations SQL et le
[contrôle de disponibilité du Répertoire](../../../apps/web/src/features/persons/server/person-schema-readiness.ts).
Les `CHECK`, fonctions, triggers et index uniques partiels ne sont pas tous
représentés par le langage de schéma de Prisma 6. Ne pas les supprimer parce
qu'ils n'apparaissent pas dans `schema.prisma` ; consulter la
[documentation officielle v6 des fonctionnalités SQL complémentaires](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/unsupported-database-features).

| Garantie                                                                                                                          | Responsable                                                      |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Identité minimale, paires de valeurs renseignées, versions positives, clés étrangères                                             | Contraintes SQL et validation du service                         |
| Au plus une coordonnée principale par personne, ou par réseau social                                                              | Index uniques partiels SQL                                       |
| Une principale lorsque la collection n'est pas vide, limites de 10 emails / 10 téléphones / 20 profils, normalisation des valeurs | Services de mutation, avec comparaison de version et transaction |
| Interdiction de déplacer une coordonnée vers une autre personne                                                                   | Triggers des trois collections                                   |

Pour les mutations, la version annoncée doit d'abord correspondre à celle de la
fiche lue. La mise à jour conditionnelle de cette même version protège ensuite
contre une écriture concurrente. Conserver ces deux contrôles lorsqu'une règle
dépend des collections déjà lues, notamment leur taille ou leur principale.

La migration additive `20261011180000_person_coordinate_ownership` étend aux
profils sociaux la protection déjà présente sur les emails et téléphones. Elle
réutilise `prevent_person_coordinate_reassignment`, sans réécrire les données.
Le contrôle de disponibilité attend les trois triggers actifs.

Une suppression est synchrone et transactionnelle. Le tombstone contient
uniquement l’identifiant de la fiche, l’identifiant idempotent de l’opération et
la date. Il est immuable et garantit l’idempotence des nouvelles tentatives de
suppression dans l’état courant de la base.

Une sauvegarde créée avant la suppression ne contient nécessairement ni le
tombstone ni la suppression. Sa restauration peut donc réintroduire la fiche :
ce cas doit être traité lors de la procédure de restauration et par une durée
de conservation des sauvegardes adaptée.

### Comparer le schéma et la base

Le 11 octobre 2026, Prisma 6.19.3 a omis l'opérateur `varchar_pattern_ops` dans
son introspection de six index B-tree de préfixe pourtant présents avec la bonne
définition SQL : les trois index d'identité de `Person`, puis ceux de l'email,
du téléphone et de l'identifiant social. `migrate diff` proposait donc de les
recréer. Ce résultat ne démontrait pas une absence d'index.

Avant d'appliquer un diff, comparer ses opérations aux migrations et aux
catalogues PostgreSQL (`pg_indexes`, opérateurs, contraintes et triggers).
Ne jamais exécuter automatiquement le SQL généré pour faire disparaître ce
signal d'introspection. Les
[preuves du schéma entièrement migré](../../../docs/audits/repertoire-2026-10-11/banc-schema/README.md)
distinguent validation Prisma, différence signalée et état SQL réel.

## Module partenaires retiré

La migration `20260921120000_remove_partner_module` supprime les dix tables du
domaine `Partner*`, ses enums et ses fonctions de trigger. Le module « Sponsors
& partenaires » a été retiré de l'application le 21 septembre 2026 et sera
reconstruit plus tard. Sa spécification complète est conservée dans
`docs/propositions/intentions/pages/bureau-juridique/sponsors-partenaires.md`.

Le journal d'audit n'est pas modifié : les valeurs `PARTNER_*` des enums
`AuditAction` / `AuditCategory` et les lignes déjà écrites restent en place afin
de ne pas casser l'affichage d'anciens journaux, exactement comme
`BACKGROUND_JOB_UPDATE` avant elles. Aucun code ne produit plus ces événements.

La fonction `prevent_person_coordinate_reassignment` et ses déclencheurs sur
`PersonEmail` / `PersonPhone` sont conservés : ils protègent l'intégrité des
coordonnées du Répertoire et n'appartiennent pas au domaine partenaire. La
protection de `PersonSocialProfile` a ensuite été ajoutée séparément, comme
décrit ci-dessus.

## Revue du schéma courant

La [revue exhaustive du 13 octobre 2026](../../../docs/audits/2026-10-13-schema-prisma.md)
documente chaque déclaration du schéma et les objets SQL complémentaires.
Elle distingue les garanties de stockage des règles portées par les services.

`SystemSetting.version` est strictement positive en stockage : `0` désigne
uniquement l'absence de surcharge dans le contrat de l'API. La migration
`20261013120000_system_setting_positive_version` ajoute ce CHECK sans réécrire
les lignes existantes. Une ligne invalide fait échouer la migration : rechercher
sa provenance et corriger explicitement sa version avant de résoudre l'échec
et de relancer le déploiement. Les valeurs et historiques valides sont préservés.

Les instants `DateTime` utilisent la convention UTC dans des `TIMESTAMP(3)` ;
`Person.birthDate` reste une date civile PostgreSQL `DATE`. Les écrivains SQL
directs doivent transmettre des instants UTC ou fixer `TimeZone` à `UTC` avant
d'utiliser les défauts `CURRENT_TIMESTAMP`. Le fuseau d'affichage n'est pas un
fuseau de stockage. Les producteurs applicatifs transmettent leurs dates et la
purge convertit explicitement son horloge en UTC.

## Sauvegardes

Créer une sauvegarde signée v9 :

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
le checksum et la signature, puis authentifie chaque valeur chiffrée avant
toute connexion à la cible, y compris avec `--dry-run`. Il faut conserver :

- `AUDIT_ENCRYPTION_CURRENT_VERSION` et les clés `AUDIT_ENCRYPTION_KEY_V<n>`
  exigées par le manifeste et les valeurs chiffrées ;
- `MFA_ENCRYPTION_KEY_V1` dès que la sauvegarde contient un secret TOTP actif
  ou une inscription TOTP en cours ;
- la clé publique Ed25519 correspondant à la signature ; la clé privée n'est
  pas nécessaire pour restaurer.

Une clé AES de longueur correcte mais différente de la clé d'origine est
refusée. Le contrôle inclut le rattachement de l'enveloppe à son compte ou à
son événement d'audit ; aucun clair n'est écrit dans la sortie de commande.
Les compteurs et l'existence d'un seul compte racine valide sont contrôlés
avant de considérer l'opération terminée. Les trois lectures bornées du fichier
(signature, déchiffrement, insertion) comparent son empreinte ; aucune copie
complète du contenu déchiffré n'est conservée. Le format reste v9.

## Performance Personnes

Le contrôle de plans exige `PERSONS_PERFORMANCE_DATABASE_URL` vers une base ou
un schéma isolé dont le nom identifie un usage `test`, `e2e` ou `perf`. Il ne
reprend jamais `DATABASE_URL` comme cible et refuse la base applicative
courante. La confirmation doit correspondre exactement à la cible normalisée
affichée par le script ; exemple à adapter, avec la variable dédiée définie :

```bash
bun run persons:performance -- --confirm-target='localhost:5432/noctambule_perf?schema=public'
```

Le jeu attendu contient au moins 100 000 personnes, 1 million d'audits et
3 millions de changements de champs. Ce contrôle ne remplace pas les mesures
plus petites du banc de la liste et ne doit pas être déclaré réussi sans
exécution sur ce volume. Ne pointez jamais ce contrôle de charge vers la base
applicative courante.
