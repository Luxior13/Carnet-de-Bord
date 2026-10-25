# Constats du système

[Cartographie](README.md) · [Harmonisation du design](../design/harmonisation.md)

Écarts relevés lors de la cartographie du 19 octobre 2026. Un constat
**n’autorise aucune suppression de données** ; sa correction passe par un
travail dédié, avec la vérification adaptée. Les écarts de design sont suivis
séparément dans [Harmonisation](../design/harmonisation.md) (`HARMO-xx`).

États : **ouvert**, **à qualifier** (comportement ou intention à confirmer avant
de parler de défaut), **documenté** (aucune action de code attendue), **clos**
avec preuve.

| ID | Constat | Source | État | Prochaine action |
| --- | --- | --- | --- | --- |
| SYS-01 | L’actualité interne (`internalNews`, `planned`) avait un module complet sans page ni route API (`features/internal-news`, `PageHero`, contrôle de santé dédié) | [Architecture](architecture.md#registre-des-fonctionnalités) | Clos le 20 octobre 2026 | Code applicatif et contrôle de santé retirés (types, lint, budget et 101 fichiers de tests réussis). Conservés volontairement : la table `InternalAnnouncement`, sa migration, son format de sauvegarde et son test, ainsi que l’entrée `planned` et ses permissions de feuille de route ; retirer la table demande une migration dédiée après vérification qu’elle est vide |
| SYS-02 | `ResourceStateBoundary` et la primitive `Tabs` n’avaient aucun consommateur | [Composants](../design/composants.md#à-retirer-ou-à-adopter) | Clos le 20 octobre 2026 | Retirés avec la dépendance `@radix-ui/react-tabs` ; contrats de design mis à jour |
| SYS-03 | La section Activité de la fiche utilisateur, retirée depuis le 10 octobre 2026, gardait `UserHistoryTab`, `useUserDetailAudit`, leurs utilitaires et capacités, jamais atteints (permissions d’activité jamais accordées) | [Utilisateurs](../pages/systeme/utilisateurs/README.md), [API](api.md#utilisateurs) | Clos le 20 octobre 2026 | Chaîne retirée ; `?section=history` ouvre toujours Profil. La route `GET /api/users/[id]/audit` qui répond 410 est conservée volontairement ; une garde de non-régression vérifie l’absence de l’onglet |
| SYS-04 | `app/administration/page.tsx` et `app/tableau-de-bord/[[...slug]]/page.tsx` doublaient les alias permanents de `next.config.ts` et n’étaient jamais atteints | [Routes](routes.md#alias-et-redirections-permanentes) | Clos le 20 octobre 2026 | Fichiers retirés ; les alias `/administration` et `/tableau-de-bord` continuent de rediriger |
| SYS-05 | Les commentaires SQL de migrations appliquées citent d’anciens chemins de documentation (`docs/OPERATIONS.md`, `features/pages/...`), déplacés le 19 octobre 2026 | [Données](donnees.md#migrations) | Documenté | Aucune : une migration appliquée n’est jamais modifiée ; nouveaux emplacements dans le [rapport de réorganisation](../audits/2026-10-19-organisation-complete.md) |
| SYS-07 | Environ 980 lignes de modules sans appelant (`features/audit/audit-display.ts`, `system-activity.types.ts`, `person-audit-display.ts`, `person-journal.ts`, `useAsyncResource`, `csv.ts`) et du code d’authentification mort | [Revue complète](../audits/2026-10-23-revue-complete.md) (REV-03, REV-16) | Clos le 25 octobre 2026 | Code d’authentification mort retiré le 24 octobre ; modules orphelins, exports et dépendances inutiles retirés le 25 octobre ; knip intégré à `bun run check` ([suivi](../audits/2026-10-23-revue-complete.md#suivi--lot-3-du-25-octobre-2026)) |
| SYS-08 | Les 11 suites `*-postgres.test.ts` ne s’exécutent ni en CI ni en local (PostgreSQL 17 installé sur le poste, mais aucune base de test configurée) ; les compteurs à facettes du 20 octobre n’ont jamais tourné sur PostgreSQL | [Revue complète](../audits/2026-10-23-revue-complete.md) (REV-21) | Clos le 24 octobre 2026 | `bun run test:postgres` et étape CI ajoutés ; 225 tests SQL sur 225 réussis sur un PostgreSQL local temporaire, après mise à jour de cinq tests périmés |
| SYS-09 | Authentification et comptes hors du découpage documenté : `auth.ts` de 1 348 lignes, logique et transactions dans les routes, enveloppes d’erreur écrites à la main | [Revue complète](../audits/2026-10-23-revue-complete.md) (REV-04) | Clos le 25 octobre 2026 | `auth.ts` réparti ; routes d’authentification, du compte, de l’administration des utilisateurs et des paramètres réduites à l’adaptateur HTTP ; refus portés par `ServiceError` ([suivi](../audits/2026-10-23-revue-complete.md#suivi--lot-4-seconde-partie-25-octobre-2026)) |
| SYS-10 | Tables sans code (`InternalAnnouncement`, `ArchivedStaffProfile`) et compatibilités de déploiement sans production (alias de permissions, jetons de session en clair, route 410) | [Revue complète](../audits/2026-10-23-revue-complete.md) (REV-02, REV-13, REV-17, REV-18) | Clos le 25 octobre 2026 : jetons en clair et alias de permissions retirés le 24 octobre, route 410 le 25 octobre ; les deux tables et la clé `audit:view_sensitive` restante retirées du schéma par `20261025120000_remove_orphan_tables`, vérifiée sur PostgreSQL local ; export des lignes et sauvegarde v10 signée prises sur la base de travail | Migration appliquée par le propriétaire le 25 octobre 2026 et contrôlée en lecture ([suivi](../audits/2026-10-23-revue-complete.md#suivi--lot-5-mots-de-passe-25-octobre-2026)) |
| SYS-06 | `bun run maintenance` exécute les purges de conservation mais aucun planificateur n’est décrit dans le dépôt | [Architecture](architecture.md), [Paramètres](../pages/systeme/parametres.md) (PAR-S-01) | À qualifier | Décrire la planification réelle dans les [procédures d’exploitation](../exploitation/operations.md) lors de la mise en exploitation |

## Ajouter un constat

Nouvel identifiant `SYS-xx` à la suite ; source précise (fichier, commande) ;
état ; prochaine action ou déclencheur. Un constat corrigé passe à « clos »
avec la preuve et la date, sans être supprimé.
