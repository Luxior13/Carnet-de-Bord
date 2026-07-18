# Exploitation du socle applicatif

Ce document complète le contrat de création des fonctionnalités. Il décrit les
processus qui doivent accompagner l'application en production.

## Processus obligatoires

- Le serveur web est déployé après `bun run db:migrate:deploy` puis validé par
  `GET /api/health/ready`.
- Un worker séparé exécute `bun run --filter web worker`. Un seul worker suffit
  au départ ; plusieurs instances peuvent ensuite partager la file grâce aux
  verrous PostgreSQL `SKIP LOCKED`.
- Pour un ordonnanceur sans processus permanent, exécuter
  `bun run --filter web worker --once` à intervalle court.
- Les secrets restent dans le gestionnaire de secrets du déploiement. La table
  `SystemSetting` n'accepte que les paramètres non secrets du catalogue fermé.

## Déploiement

1. Exécuter `bun install --frozen-lockfile` et `bun run check`.
2. Créer une sauvegarde et conserver le fichier JSON avec son fichier
   `.sha256` dans un stockage chiffré distinct du serveur.
3. Exécuter `bun run db:migrate:deploy`.
4. Démarrer le web et le worker.
5. Attendre une réponse HTTP 200 de `/api/health/ready` avant de recevoir du
   trafic. La readiness contrôle le schéma, les enums, les index critiques et
   l'unicité du compte racine protégé.

### Migration canonique des permissions du 18 juillet 2026

La migration `20260718120000_canonical_live_permissions` est une migration de
contrat : elle remplace les anciennes clés stockées et supprime les droits
obsolètes. Elle ne doit jamais coexister avec un ancien binaire qui ne connaît
que les anciennes clés.

- Drainer le trafic, puis arrêter toutes les instances web et tous les workers
  avant `db:migrate:deploy`.
- Vérifier qu'aucun ancien processus ne peut redémarrer automatiquement pendant
  la migration.
- Déployer uniquement le nouveau web et le nouveau worker après le succès de la
  migration, puis rouvrir le trafic après la readiness.
- Pour une infrastructure rolling sans fenêtre de maintenance, ne pas exécuter
  cette migration en l'état : livrer d'abord le code dual-read sur toutes les
  instances, migrer après leur drainage complet, puis retirer les alias dans
  une version ultérieure.

La sauvegarde de l'étape 2 est obligatoire pour ce changement de données.

### Scission de la gestion des autorisations du 18 juillet 2026

La migration
`20260718180000_split_access_delegation_permissions` remplace les anciennes
clés globales `users:update_access` et `users:edit_permissions` par trois
capacités indépendantes : accorder (`users:grant_access`), retirer
(`users:revoke_access`) et déléguer leur gestion (`users:delegate_access`). Elle
conserve la valeur effective et les surcharges différentielles des presets
USER et ADMIN.

Cette migration est elle aussi une migration de contrat. Appliquer exactement
la procédure d'arrêt complet décrite ci-dessus : aucun ancien web ou worker ne
doit lire ou réécrire les permissions pendant ou après la conversion. Le
nouveau code conserve une lecture temporaire des deux anciennes clés, mais
toutes les nouvelles écritures utilisent les trois clés séparées. Seul le
compte racine peut attribuer ou retirer `users:delegate_access`, et aucun de ces
droits ne permet de créer un ADMIN ou de modifier un rôle.

### Suppression irréversible des comptes du 19 juillet 2026

La migration `20260719120000_irreversible_user_deletion` convertit les anciens
comptes archivés en tombstones anonymes et immuables, remplace le droit
d'archivage par une nouvelle capacité de suppression et installe les
protections PostgreSQL du compte racine et des tombstones. C'est une migration
de contrat et de données, incompatible avec un déploiement rolling mêlant les
anciens et les nouveaux binaires.

1. Placer le site en maintenance, drainer le trafic, puis arrêter toutes les
   instances web, tous les workers permanents et tout ordonnanceur exécutant
   `bun run --filter web worker --once`. Désactiver leur redémarrage automatique
   pendant toute l'intervention.
2. Depuis la racine du dépôt correspondant à la version encore en production,
   exécuter `bun run --filter @repo/database db:backup`. Vérifier les nombres de
   lignes affichés, conserver ensemble le JSON et son fichier `.sha256`, puis
   les copier dans un stockage chiffré distinct du serveur.
3. Sur une base vide, isolée et au schéma compatible avec cette sauvegarde,
   vérifier le fichier et son checksum avec
   `bun run --filter @repo/database db:restore -- --file="<backup.json>" --dry-run`.
   Ne poursuivre que si cette vérification réussit.
4. Depuis le dépôt ou l'artefact de la nouvelle version contenant cette
   migration, l'exécuter sur la base de production toujours hors trafic avec
   `bun run db:migrate:deploy`. Tout échec laisse le site en maintenance et doit
   être diagnostiqué avant de démarrer un processus applicatif.
5. Déployer puis démarrer simultanément le nouveau web et le nouveau worker
   issus de la même version. Aucun ancien processus ne doit redémarrer après la
   migration.
6. Interroger `GET /api/health/ready` et ne rouvrir le trafic qu'après une
   réponse HTTP 200. Cette readiness vérifie notamment les contraintes et les
   triggers actifs qui rendent les tombstones et le cycle de vie du compte
   racine immuables.

Cette suppression ne possède aucun rollback logique : ne jamais tenter de
retirer `deletedAt`, de restaurer un compte dans la base migrée ou d'inverser la
migration par des mises à jour manuelles. Si le déploiement doit être annulé,
arrêter de nouveau le web et les workers, provisionner une base entièrement
vide avec le schéma et le code compatibles avec la sauvegarde pré-migration,
puis exécuter d'abord :

```powershell
bun run --filter @repo/database db:restore -- --file="<backup.json>" --dry-run
```

Après contrôle de la cible et des nombres de lignes, restaurer hors ligne avec :

```powershell
bun run --filter @repo/database db:restore -- --file="<backup.json>" --confirm-empty-restore=RESTORE-INTO-EMPTY-DATABASE
```

Redéployer ensuite uniquement la version applicative compatible, valider sa
readiness, puis rouvrir le trafic. La restauration remplace la base migrée ;
elle ne fusionne jamais la sauvegarde avec une base existante.

## Sauvegarde et restauration

- Programmer une sauvegarde quotidienne et surveiller son code de sortie.
- Répliquer les sauvegardes hors machine avec chiffrement au repos et politique
  de rétention.
- Réaliser au minimum chaque trimestre un exercice de restauration dans une
  base vide et isolée avec `db:restore --dry-run`, puis avec la confirmation
  explicite documentée dans `packages/database/prisma/README.md`.
- Une sauvegarde n'est considérée valide qu'après vérification du checksum et
  démarrage réussi de l'application restaurée.

## Surveillance minimale

- Alerter sur la readiness, les réponses HTTP 5xx/429, les tâches `FAILED` et
  les tâches `RUNNING` dont le verrou expire fréquemment.
- Centraliser les logs JSON et conserver le `requestId` entre proxy, serveur et
  collecteur. Les champs sensibles sont masqués par le logger applicatif.
- Suivre la durée et le volume des requêtes principales ; utiliser les curseurs
  signés pour toute liste non bornée.
- Revoir les seuils de rétention et de limitation après mesure réelle, jamais
  en supprimant les garde-fous dans une route isolée.

## Évolution

Chaque nouvelle table doit être ajoutée à la migration, à la readiness, au
manifeste de sauvegarde/restauration et à une politique de rétention. Chaque
nouvelle tâche de fond doit avoir une clé d'idempotence, un nombre maximal de
tentatives et un handler enregistré dans le worker.
