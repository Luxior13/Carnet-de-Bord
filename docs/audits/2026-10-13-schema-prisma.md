# Schéma Prisma — revue exhaustive du 13 octobre 2026

**Périmètre : les 562 lignes du schéma courant, ses consommateurs et les objets
SQL complémentaires.** Cette revue répond à la demande explicite de lecture
ligne par ligne après la clôture des pages. La validation Prisma antérieure
n'était pas présentée comme une telle revue. Les interfaces ne sont pas
réauditées ici.

**Statut : clos le 13 octobre 2026 pour ce périmètre.**

État examiné : `c54e5d813c40e71acd892e2973bbb303d9c74644`, avec les corrections
de clôture présentes dans l'arbre de travail, puis les corrections décrites
ci-dessous. Le schéma lui-même conserve l'empreinte SHA-256
`3dc1b46d9a0da543c9bb502af82545dc87cbb6474d27d1a6d4635fe6b592d13b`.
Versions exécutées : Prisma/client **6.19.3**, PostgreSQL **17.10**, Bun **1.4.2**.

## Conclusion

Les **19 modèles, 12 enums et deux blocs de configuration** ont été examinés.
La structure convient au socle actuellement livré et ne nécessite pas une
refonte. Deux défauts confirmés ont été corrigés et vérifiés : une version de
paramètre invalide acceptée par SQL et une restauration pouvant accepter des
clés de déchiffrement absentes ou incorrectes.

Le développement métier peut continuer. Cette clôture porte sur le schéma et
les parcours actuels ; elle ne prétend pas valider à l'avance les futures
équipes, adhésions, entités juridiques ou finances. Une nouvelle fonctionnalité
rouvrira seulement les relations et règles qu'elle affecte.

## Trace de lecture

Chaque champ est confronté à sa finalité, ses consommateurs, son type natif,
sa nullabilité, son défaut, son cycle de vie et ses garanties. Chaque relation,
index et valeur d'enum possède une entrée dans les pièces suivantes :

| Pièce | Couverture |
| --- | --- |
| [Comptes et authentification](schema-prisma-2026-10-13/comptes.md) | Configuration, rôles, comptes, réservation des identifiants, sessions, TOTP, codes et challenges MFA |
| [Personnes et coordonnées](schema-prisma-2026-10-13/personnes.md) | Identité, statut courant, emails, téléphones, profils sociaux, suppression ; 47 colonnes et 32 index SQL |
| [Journal et tables transverses](schema-prisma-2026-10-13/audit-technique.md) | Enums et tables d'audit, archive Staff, limiteur, actualités internes, paramètres ; 84 colonnes |

La [couverture mécanique](schema-prisma-2026-10-13/preuves/couverture.json)
contrôle l'absence d'oubli dans ces tableaux. Ce contrôle textuel complète
la lecture critique ; il ne prouve pas la justesse d'une déclaration.
Résultat : **396/396 déclarations couvertes**, sans omission ni double
attribution — 205 colonnes, 32 relations Prisma, 74 membres d'enum,
82 directives et trois propriétés de configuration. Les 383 reproductions
exactes et 13 formulations abrégées sont distinguées dans la preuve.

La sélection de la revue générale couvre Q01, Q09–Q17, Q19, Q21–Q22 et
Q25–Q30 pour leurs effets sur le stockage, les secrets, les mutations, les
historiques et la restauration. Q05–Q06 sont examinés au titre des requêtes et
validations consommatrices. Q02–Q04 et Q07–Q08 sont hors impact : aucun parcours
visuel, composant ou notification ne change. Q18 n'introduit aucune optimisation
sans mesure. Q20, Q23–Q24 et Q26 n'ajoutent ni fichier métier, automatisation,
gouvernance ni finance ; les frontières futures de la structure restent celles
de la référence canonique.

## Défauts corrigés

| Constat | Effet et correction | Preuve et statut |
| --- | --- | --- |
| SCH-TECH-01 — version de paramètre | SQL acceptait `SystemSetting.version = 0`, alors que l'API utilise `0` pour une ligne absente : une ligne existante devenait impossible à modifier normalement. Une migration additive impose `version >= 1`. | **Clos.** Ancien schéma reproduit ; INSERT/UPDATE `0` et `-1` refusés ; upgrade valide inchangé ; upgrade invalide refusé sans réécriture ; reprise après correction explicite testée. |
| SCH-AUTH-01 — clés de restauration | Le précontrôle vérifiait la présence/forme des clés d'audit, mais pas leur correspondance avec les valeurs, et ne contrôlait pas la clé TOTP. Une restauration pouvait aboutir à des données indéchiffrables. | **Clos.** Précontrôle AES-GCM de chaque enveloppe MFA et audit après signature, avant connexion à la cible ; vérification du contexte authentifié et du contenu décodé, flux borné et empreinte conservés. Tests unitaires et CLI réelle réussis. |

La [migration](../../packages/database/prisma/migrations/20261013120000_system_setting_positive_version/migration.sql)
est un unique `ALTER TABLE ADD CONSTRAINT`, atomique. Elle ne réécrit aucun
paramètre. Des données invalides font échouer le déploiement avec la contrainte
nommée ; il faut examiner leur provenance, les réparer explicitement puis
résoudre la migration échouée avant reprise. Aucun ancien fichier de migration
n'est modifié. Une première variante à transaction explicite a été simplifiée
après que l'essai a montré que Prisma masquait son message de refus initial.

Le format de sauvegarde reste **v9**. Le précontrôle utilise les enveloppes
existantes ; aucune table, clé en base ou dépendance n'a été ajoutée.
La [restauration](../../packages/database/prisma/README.md#restauration) et le
[guide d'exploitation](../exploitation/operations.md#restauration) précisent les
clés à conserver.

## Concordance Prisma, migrations et PostgreSQL

Le [catalogue final](schema-prisma-2026-10-13/preuves/catalogue-apres.json)
recense **205 colonnes, 70 contraintes, 112 index, 11 déclencheurs,
11 fonctions applicatives et 74 valeurs d'enum**. Les extensions présentes
sont `plpgsql` et `pg_trgm`. Les définitions sont conservées, pas seulement
leur nombre. Les fonctions de purge, protections du compte racine/tombstones,
propriété des coordonnées, audit append-only et enveloppes chiffrées ont été
relues avec leurs appels et règles de suppression.

- Les 53 migrations ont été appliquées sur des bases isolées. La comparaison
  de chaque checksum au fichier courant est réussie.
- Une base vide et une base peuplée issue des 52 migrations précédentes
  aboutissent au même catalogue. Par rapport au
  [catalogue précédent](schema-prisma-2026-10-13/preuves/catalogue-avant.json),
  seul le nouveau CHECK de version est ajouté.
- Le [diff entre migrations rejouées et base](schema-prisma-2026-10-13/preuves/diff-migrations.sql)
  est vide dans le périmètre représentable par Prisma.
- Le [diff entre base et schéma](schema-prisma-2026-10-13/preuves/diff-prisma.sql)
  retrouve la limite d'introspection déjà connue de Prisma 6.19.3 : trois
  suppressions d'index proposées puis six créations de préfixes. Les six
  index `varchar_pattern_ops` existent réellement et sont valides. Ce diff
  n'a pas été exécuté et ne justifie pas de recréer les index.

Context7 a été consulté avec la version 6.19.3 ; le résultat versionné était
peu pertinent pour les objets SQL non représentables. La
[documentation officielle v6](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/unsupported-database-features)
et l'aide de la CLI installée ont complété cette vérification. Triggers,
CHECK et index partiels sont confrontés au catalogue, car un diff Prisma
ne certifie pas leur présence à lui seul.

## Choix conservés et limites de conception

- `Person` reste indépendante de `User`. Un email partagé ne fusionne pas les
  identités. `structureStatus` est un repère de répertoire, pas une adhésion,
  un contrat ou une appartenance à une équipe datée.
- Les contraintes SQL protègent les relations et invariants structurels ;
  les services gardent normalisation, limites des collections, présence d'au
  moins une coordonnée principale, droits et versions optimistes. Cette
  séparation est explicitée, sans prétendre que SQL valide toute règle métier.
- Le triplet unique d'AuditLog est requis par la FK composite de ses détails.
  Les enums historiques et l'archive Staff conservent des données existantes ;
  les supprimer n'est pas une refactorisation neutre.
- Certains index concernent des usages dormants ou historiques. Aucun coût
  problématique n'a été mesuré ici ; leur retrait n'est pas requis pour la
  clôture. Aucun gain de performance n'est annoncé sur la seule lecture.
- Les instants utilisent UTC, la naissance un `DATE`. Une
  [sonde avec session Europe/Paris](schema-prisma-2026-10-13/preuves/fuseau.json)
  confirme le trajet Prisma testé. Les écrivains SQL directs doivent aussi
  respecter UTC, notamment avec les défauts `CURRENT_TIMESTAMP`.
- La rétention d'audit reste commune et la restauration d'une ancienne
  sauvegarde exige toujours de réconcilier les suppressions intervenues depuis.
  Ces limites déjà documentées ne sont pas effacées par cet audit.

## Vérifications de cette passe

| Contrôle réellement exécuté | Résultat |
| --- | --- |
| [Migration, données existantes, reprise, catalogue, diff et validation Prisma](schema-prisma-2026-10-13/preuves/resultats-schema.json) | 12 scénarios réussis ; 53 migrations |
| [Régression Paramètres sur PostgreSQL](schema-prisma-2026-10-13/preuves/regression-parametres.json) | 20 tests réussis, aucun ignoré ; deux nouveaux cas SQL |
| [Tests du paquet database](schema-prisma-2026-10-13/preuves/comptes-verification.json) | 33 réussis, dont 12 précontrôles crypto ; clés absentes/fausses, contexte, corruption et lecture bornée |
| [Restauration réelle signée](schema-prisma-2026-10-13/preuves/resultats-restauration.json) | 7/7 ; les 19 tables peuplées sont identiques avant/après ; quatre refus de clés sans écriture, dry-run, restauration, cible non vide |
| Contrôles statiques | Typecheck web et database, lint des sources/tests modifiés et `git diff --check` réussis |
| Documentation | `docs:check` réussi : 268 fichiers ; couverture des 396 déclarations sans omission |

Les tests Paramètres appellent les handlers avec un instantané de session
simulé et PostgreSQL réel. Le banc de restauration utilise la CLI et des
enveloppes cryptographiques réelles, avec des données exclusivement fictives.
Il vérifie toutes les tables, notamment BYTEA, BigInt, date civile et seeds TOTP.
Ce n'est pas un nouveau test navigateur de connexion après restauration.

La campagne des pages reste datée dans le
[rapport de clôture du socle](2026-10-12-cloture-socle.md). Son build, ses
tests navigateur et ses mesures de charge ne sont pas présentés comme rejoués
ici. Aucun test à très grand volume ni audit opérationnel d'une future
production n'est déduit de la présente validation.

## Reproduction et nettoyage

Le [montage isolé](schema-prisma-2026-10-13/setup.ps1) crée un cluster PostgreSQL
17 sur `127.0.0.1:54664`, six bases dédiées et des secrets temporaires, sans
lire les données de développement. À partir d'un environnement neuf :

```powershell
& docs/audits/schema-prisma-2026-10-13/setup.ps1 -Phase Start
bun docs/audits/schema-prisma-2026-10-13/verify.ts
bun docs/audits/schema-prisma-2026-10-13/restore.ts
bun docs/audits/schema-prisma-2026-10-13/timezone.ts
```

La suite Paramètres utilise exclusivement `SETTINGS_TEST_DATABASE_URL` vers
`settings_service_test` après application des migrations ; elle ne réutilise
pas la base du scénario de restauration. Les pièces conservent seulement les
catalogues et résultats non secrets. Terminer avec `setup.ps1 -Phase Stop` :
arrêt du cluster possédé, suppression des seules sauvegardes créées par le banc,
des six bases, secrets et journaux temporaires. Le schéma de la base de
développement n'est pas modifié par cette campagne.

Nettoyage effectivement terminé : cluster arrêté, port 54664 libre, six bases,
trois fichiers de sauvegarde, clés et journaux privés supprimés. Seules les
preuves non sensibles et les scripts de reproduction restent dans le dépôt.

## Application à la base de travail — 13 octobre 2026

À la suite de l'autorisation explicite d'appliquer la migration, la base de
travail habituelle a reçu `20261013120000_system_setting_positive_version`.
Cette étape est distincte de la campagne isolée ci-dessus : la cible configurée
est hébergée à distance, et les configurations web/database désignent la même
base. Les identifiants de connexion ne sont pas conservés dans les preuves.

Précontrôles : 52 migrations appliquées, checksums conformes, aucun échec non
résolu et cette seule migration en attente ; aucune version stockée invalide.
Une sauvegarde complète signée v9 a été créée et conservée avant application.
La configuration de travail ne fournissant pas de paire de signature complète,
cette copie utilise une paire Ed25519 dédiée : la clé privée a servi en mémoire,
et la clé publique correspondante est conservée avec les artefacts dans
`.codex-tmp/database-backups/`, suffixe `.verification-key.json`. Elle permet
de vérifier cette copie sans modifier les fichiers d'environnement du site.
Les clés AES d'origine restent nécessaires à la restauration.

Le wrapper `bun run db:migrate:deploy` a réussi. Le contrôle final relève
**53 migrations appliquées, aucune en attente**, un CHECK `version >= 1`
présent et validé, et un contenu de `SystemSetting` inchangé. Aucun reset ni
réécriture de données. Le [résultat d'application](schema-prisma-2026-10-13/preuves/application-base-travail.json)
conserve ces constats sans données métier ni secrets.

Les endpoints web locaux `live` et `ready` sur le port 3001 n'étaient pas
joignables lors du contrôle ; cette étape valide donc l'application SQL et
son statut, sans annoncer une nouvelle validation HTTP du site.
