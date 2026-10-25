# Vérification de clôture avant nouvelle fonctionnalité — 25 octobre 2026

[Index des audits](README.md) · [Méthode d’audit](../methode/audit.md) ·
[Revue complète du 23 octobre](2026-10-23-revue-complete.md) ·
[Cohérence des droits](2026-10-25-coherence-des-droits.md)

## Question, périmètre et état examiné

- **Demande du propriétaire** : refaire un tour complet « sur tous les points
  possibles » avant de passer à une nouvelle fonctionnalité.
- **Type** : clôture globale au sens de la [méthode](../methode/audit.md#conclure-et-maintenir).
  Liste finie : chaîne de contrôle complète, suites SQL, bancs client courants
  de chaque page, relecture du code serveur modifié depuis la revue du
  23 octobre, alignement base / migrations / schéma, dépendances, configuration
  et points encore ouverts dans la documentation. La revue complète du
  23 octobre et l’audit des droits du 25 octobre ne sont pas refaits.
- **État** : branche `main`, commit `da1add2`, plus les corrections de cette
  passe ; Bun 1.4.2, Node 24.14.0, Next 15.5.23 puis 15.5.28 (CLO-01),
  React 19.1.8, Prisma 6.19.3.
- **Données** : PostgreSQL 17 local jetable (port 5433) pour les suites SQL et
  la comparaison de schéma ; base de travail partagée lue seulement par
  `prisma migrate status`, sans écriture. Bancs client sur API simulées.
- **Empêché** : le serveur de dev du propriétaire occupait le port 3001 et
  verrouillait le moteur Prisma. Build de production, budget de performance et
  E2E (qui exigent ce port et un build) restent à exécuter ; le `test` de turbo
  a échoué sur ce verrou (EPERM au `prisma generate`), Vitest a donc été lancé
  directement.

## Contrôles exécutés

| Contrôle | Commande / preuve | Résultat |
| --- | --- | --- |
| Documentation et contrôleur | `bun run docs:check`, `docs:check:test` | Réussi (311 documents, 16/16 tests du contrôleur) |
| Lint, code mort, types | `bun run lint`, `knip`, `typecheck` | Réussi |
| Budget d’architecture | `bun run --filter web check:architecture` | Réussi |
| Tests de la base | `node --test` de `@repo/database` | 34/34 |
| Tests web | `bunx vitest run` dans `apps/web` | 1 242 réussis, 228 SQL ignorés faute de variable (normal) |
| Suites SQL | `bun run test:postgres` sur PostgreSQL local | 11 fichiers, 228/228 |
| Migrations de la base de travail | `prisma migrate status` (lecture) | 56 migrations, base à jour |
| Schéma ↔ migrations | `prisma migrate diff --from-migrations … --to-schema-datamodel` sur base jetable | Aucun écart réel : seuls les 6 index `varchar_pattern_ops` déclarés par `ops: raw(...)` apparaissent, faux positif connu de Prisma |
| Environnement | Clés de `env.ts` comparées à `.env.sample` | Alignées ; clés MFA versionnées lues par `mfa-keys.ts` |
| Bancs client courants | 17 bancs, un par page ou section | 16 complets, modales partiel (CLO-06) |
| Vulnérabilités | `bun audit` (étape de la CI, seuil `high`) | 23 alertes au premier passage ; **aucune** après CLO-01 (531 paquets) |
| Vérification complète après mise à jour | `bun run check` (build et budget de performance compris), serveur de dev arrêté par le propriétaire | Réussi |
| Suites SQL après mise à jour | `bun run test:postgres` | 228/228 |
| E2E de production | `bun run test:e2e` sur une base PostgreSQL locale jetable par passage (`carnet_e2e_*`), superadmin au mot de passe aléatoire non affiché | Réussi après CLO-08, CLO-09 et CLO-10 (parcours complet, 1,4 min) |

### Bancs client

| Banc | Résultat |
| --- | --- |
| Accueil | 8/8 |
| Connexion | 29/29 |
| Nouvelle fiche personne | 28/28 |
| Nouvel utilisateur | 28/28 |
| États techniques | 13/13 |
| Feuille de route | 18/18 |
| Fiche personne | 31/31 |
| Fiche utilisateur | 50/50 |
| Mon compte | 28/28 |
| Mon compte — Sécurité | 8/8 |
| Navigation générale | 19/19 |
| Barres de sections | 8/8 après mise à jour d’une hauteur de référence (CLO-07) |
| Paramètres | 33/33 après mise à jour du banc (CLO-07) |
| Répertoire | 41/41 |
| Sessions d’un utilisateur | 11/11 |
| Utilisateurs | 42/42 |
| Modales (transverse) | 79 scénarios de disposition réussis ; scénarios intégrés arrêtés à la page Paramètres (CLO-06) |

Les trois échecs du premier passage venaient des bancs, pas de
l’application : attente `autocomplete="off"` remplacée par REV-07, mode de
preuve `critical-mfa` supprimé par REV-03, hauteur de page figée au
12 octobre, et fixture de contact sans les propriétés ajoutées depuis.

## Relecture du code

Fichiers serveur modifiés depuis la revue (75 fichiers) ; lecture complète de
`session.ts`, `password.ts`, `login.service.ts`, `sensitive-action.ts`,
`user-admin.service.ts`, `user-mfa-reset.service.ts`,
`user-password-reset.service.ts`, du diff du middleware et des gardes de route
concernées. Points vérifiés : comparaison du mot de passe même pour un
identifiant inconnu, compte désactivé refusé avec le message générique,
remplacement du hachage sans toucher `updatedAt`, preuves revérifiées dans la
transaction, refus avant divulgation de l’état d’un administrateur, refus de
`Sec-Fetch-Site` étranger sur les mutations. Aucun défaut de sécurité trouvé.

## Constats

| ID | Nature / priorité | Constat | Action | État |
| --- | --- | --- | --- | --- |
| CLO-01 | Défaut, **P1** | `bun audit` échoue : Next 15.5.23 porte trois alertes critiques (exécution de code à distance par l’optimisation d’images et sur serveur Windows) et sharp 0.35.3 deux élevées ; le reste touche l’outillage (ESLint, Vitest, Vite, Prisma CLI). L’étape « Audit dependencies » de la CI échouera au prochain envoi | Après accord (« ok go ») : Next et `@next/eslint-plugin-next` 15.5.28, Vitest 4.1.12 ; surcharges racine `sharp` 0.35.5, `vite` 7.3.7, `brace-expansion` 1.1.21, `js-yaml` 4.3.2, ajout de `source-map-js` 1.2.2, `@humanfs/node` 0.16.8 et `deepmerge-ts` 8.0.2 (majeure, sous le CLI Prisma : `validate`, `generate` et `migrate status` vérifiés). `bun audit` : aucune vulnérabilité | Clos |
| CLO-02 | Vérification, P2 | Build de production, budget de performance et E2E non rejoués depuis les lots 4 et 5 | `bun run check` complet et E2E réussis | Clos |
| CLO-08 | Défaut, P1 | La préparation E2E (`scripts/e2e-setup.mjs`, non typé) écrivait encore `failedLoginAttempts` et `lockedUntil`, colonnes supprimées par REV-01 : aucun E2E ne pouvait démarrer | Champs retirés | Clos |
| CLO-09 | Défaut, P2 | Paramètres : une actualisation réussie déplaçait le focus de « Actualiser », toujours présent, vers le premier titre de carte | Focus déplacé seulement s’il est perdu ; scénario de banc ajouté, en échec sur l’ancien code ([fiche](../pages/systeme/parametres.md)) | Clos |
| CLO-10 | Test en retard, P3 | L’E2E du Répertoire cherchait le menu « Filtrer par statut », remplacé le 20 octobre par les filtres rapides | Scénario aligné sur les boutons du groupe « Filtrer par statut » | Clos |
| CLO-03 | Libellé, P3 | « que vous ne possedez pas » sans accent dans un refus de la fiche utilisateur | Corrigé | Clos |
| CLO-04 | Doc, P3 | `permissions.md` disait REV-15 « décision attendue », alors que la décision est prise depuis le 25 octobre | Corrigé | Clos |
| CLO-05 | Dette, P3 | Commentaire de `user-password-reset.service.ts` citant encore le verrou de compte retiré (REV-01) | Corrigé | Clos |
| CLO-06 | Dette de banc, P3 | Banc transverse des modales : scénarios intégrés antérieurs aux refontes des Paramètres (14 octobre) et de la fiche utilisateur (20 octobre) ; données simulées périmées | Disposition, verrouillage et contact remis à jour (79 réussis) ; parcours couverts par les bancs de chaque page. Reprendre ou retirer les scénarios intégrés à la prochaine modification d’une fenêtre | Différé |
| CLO-07 | Dette de banc, P3 | Bancs Paramètres et Barres de sections en retard sur REV-07, REV-03 et une hauteur de page | Mis à jour et rejoués : 33/33 et 8/8 | Clos |

## Points ouverts conservés

- **REV-08** (cookies `__Host-`) : corrigé à vérifier au premier déploiement HTTPS.
- **REV-19** (regroupement des migrations) : avant la première mise en production.
- **REV-15** et **REV-20** : décisions prises, à construire avec le premier
  module concerné ; ce sont les **prérequis de la prochaine fonctionnalité**
  métier (liaison compte ↔ personne et affectations datées si ses droits
  dépendent d’une équipe ou d’une entité ; TanStack Query installé avec ce
  premier consommateur).
- Limites déjà documentées et sans défaut : journal d’activité (volumes,
  moteurs, lecteur d’écran), UI-C11 (Safari, lecteur d’écran), REP-02 (cadrage
  métier).

## Verdict

**Conforme sur le périmètre vérifié.** Après accord du propriétaire, la
mise à jour de sécurité (CLO-01) est faite ; vérification complète, suites
SQL, E2E de production et bancs client réussissent. La passe a trouvé et
corrigé deux défauts que seuls l’E2E et le build révélaient (CLO-08, CLO-09).
Reste différée la remise à jour des scénarios intégrés du banc des modales
(CLO-06). La prochaine fonctionnalité peut commencer ; ses prérequis sont
REV-15 et REV-20 ci-dessus selon son besoin.
