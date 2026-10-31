# Données

[Cartographie](README.md) · [Fiche Schéma Prisma](../references/schema-prisma.md) ·
[Fiche Migrations](../references/migrations.md) · [Confidentialité](../references/confidentialite.md) ·
[Guide de la base](../../packages/database/prisma/README.md) ·
[Schéma Prisma](../../packages/database/prisma/schema.prisma)

Relevé du 19 octobre 2026 dans `packages/database/prisma/schema.prisma` :
**17 modèles, 12 énumérations, PostgreSQL**. Les migrations contiennent aussi
des contraintes `CHECK`, des déclencheurs et des index partiels absents du
schéma Prisma : ne pas les retirer parce qu’ils n’y figurent pas. La revue
complète du schéma est celle du [13 octobre 2026](../audits/2026-10-13-schema-prisma.md).

Le projet est en développement : les données locales ne sont pas jetables par
défaut ; toute évolution passe par une migration reproductible, appliquée avec
le wrapper sûr `bun run db:migrate:deploy` et une sauvegarde
([procédures](../exploitation/operations.md)).

## Modèles par domaine

Colonnes : nombre de champs (relations comprises), nombre d’`@@index` et
`@@unique`, modèles cibles des relations.

### Comptes, sessions et sécurité

| Modèle | Champs | Index | Relations | Rôle |
| --- | ---: | ---: | --- | --- |
| `User` | 30 | 13 | sessions, audit, MFA, réservations d’identifiant, paramètres, annonces | Compte de connexion, rôle `UserRole`, compte racine protégé |
| `LoginNameReservation` | 4 | 1 | `User` | Identifiants réservés (pas de réutilisation après suppression) |
| `Session` | 17 | 4 | `User` | Sessions avec expiration absolue et d’inactivité, preuves récentes |
| `TotpCredential` | 10 | 1 | `User` | Secret TOTP chiffré du compte |
| `TotpEnrollment` | 9 | 1 | `User` | Configuration MFA en cours |
| `MfaRecoveryCode` | 7 | 2 | `User` | Codes de secours (empreintes) |
| `MfaLoginChallenge` | 11 | 2 | `User` | Défi de connexion entre mot de passe et MFA |
| `RateLimit` | 7 | 1 | — | Compteurs de limitation de débit |

### Journal d’audit

| Modèle | Champs | Index | Relations | Rôle |
| --- | ---: | ---: | --- | --- |
| `AuditLog` | 30 | 21 | `User`, `AuditFieldChange` | Événements durables (actions, catégories, flux, résultat, gravité) |
| `AuditFieldChange` | 20 | 3 | `AuditLog`, `AuditEncryptionKeyVersion` | Valeurs avant/après par champ, chiffrées selon `AuditValueStorageMode` |
| `AuditEncryptionKeyVersion` | 4 | 0 | `AuditFieldChange` | Versions de clé de chiffrement du journal ([rotation](../exploitation/operations.md#rotation-des-clés-daudit)) |

### Répertoire des personnes

| Modèle | Champs | Index | Relations | Rôle |
| --- | ---: | ---: | --- | --- |
| `Person` | 16 | 12 | emails, téléphones, profils sociaux | Fiche personne, statut `PersonStructureStatus`, version optimiste |
| `PersonEmail` | 10 | 3 | `Person` | Emails, un principal |
| `PersonPhone` | 10 | 3 | `Person` | Téléphones, un principal |
| `PersonSocialProfile` | 14 | 5 | `Person` | Réseaux sociaux, propriétaire protégé (REP-20) |
| `PersonDeletionTombstone` | 3 | 0 | — | Trace minimale d’une fiche supprimée |

### Système et préparation

| Modèle | Champs | Index | Relations | Rôle |
| --- | ---: | ---: | --- | --- |
| `SystemSetting` | 8 | 2 | `User` | Paramètres système versionnés (conservation) |

`InternalAnnouncement` et `ArchivedStaffProfile`, tables sans code, sont retirées
du schéma le 25 octobre 2026 par `20261025120000_remove_orphan_tables` (REV-18).
L’actualité interne redéfinira son stockage à sa reconstruction.

## Énumérations

`UserRole`, `MfaChallengePurpose`, `MfaAuthenticationMethod`,
`PersonStructureStatus`, `AuditFieldChangeType`, `AuditValueStorageMode`,
`AuditAction`, `AuditCategory`, `AuditEventKind`, `AuditStream`,
`AuditOutcome`, `AuditSeverity`.

## Migrations

**59 migrations** dans `packages/database/prisma/migrations`, de
`20250723121213_init` à `20261030130000_audit_view_action` (valeur `AUDIT_VIEW` de `AuditAction`, consultation du journal). Repères :

| Période | Migrations notables |
| --- | --- |
| Janvier–février 2026 | Ancien périmètre financier et sportif (`add_sponsors`, `add_structure`, `float_to_decimal`, `add_fiscal_years`, `add_expense_reports`…), puis réduction aux comptes (`users_only_schema`, juin) |
| Juin–juillet 2026 | Sessions, audit durable, MFA obligatoire, permissions canoniques, suppression irréversible d’un compte, socle Personnes, retrait du worker |
| Juillet 2026 | Module Partenaires (retiré le 21 septembre 2026 par `remove_partner_module`), actualité interne |
| Septembre–octobre 2026 | Retrait des notifications, nom facultatif, propriété des coordonnées, version positive des paramètres, permissions du site actuel, retrait du verrou par compte, retrait des tables sans code, retrait de l’autorisation de provenance des champs, conservation du journal à un an par défaut, type d’événement « Journal consulté » |

**Regroupement de l’historique — décision du 25 octobre 2026 (REV-19)** : les
migrations seront regroupées en une migration de base **juste avant la
première mise en production**, pas avant : chaque module encore à construire
ajouterait des migrations et la base de travail devrait être réalignée deux
fois. À ce moment : générer la base depuis le schéma, y reporter à la main les
`CHECK`, triggers et index partiels absents de `schema.prisma`, comparer le
`pg_dump --schema-only` d’une base issue de l’historique avec celui d’une base
issue du regroupement, puis, après sauvegarde signée, marquer la base de
travail comme alignée et retirer `baseline-existing-database` et
`migration-baseline`.

`20260204_soft_delete_transactions` porte un horodatage court (8 chiffres) ;
il est conservé tel quel car déjà appliqué. Les commentaires SQL de plusieurs
migrations citent d’anciens chemins de documentation ([SYS-05](constats.md)).
Une migration appliquée n’est jamais modifiée.

## Relevé

```bash
grep -cE '^model ' packages/database/prisma/schema.prisma
grep -cE '^enum ' packages/database/prisma/schema.prisma
ls packages/database/prisma/migrations | grep -v toml | wc -l
```
