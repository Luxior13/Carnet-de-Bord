# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Les consignes communes à tous les agents sont dans `AGENTS.md`, importé
ci-dessous. Elles priment ; ce fichier les complète par le parcours de travail,
la boucle des retours du propriétaire, les commandes et l’architecture.

@AGENTS.md

## Parcours de travail

- Tout travail commence par [docs/REFERENCE_GENERALE.md](docs/REFERENCE_GENERALE.md),
  suivi du début à la fin : cadrer, parcourir les 36 points, ouvrir seulement
  les fichiers détaillés des points concernés, conclure en mettant à jour la
  documentation (section 6 du guide).
- Avant de toucher une page, lire sa fiche dans [docs/pages](docs/pages/README.md)
  et, pour l’interface, le [système de design](docs/design/README.md) et le
  [journal des préférences](docs/design/preferences.md).
- Ne pas charger toute la documentation : les audits datés, les revues datées
  en bas des fiches, les propositions et les intentions historiques ne se lisent
  que pour un besoin précis.

## Retours du propriétaire

Quand le propriétaire écrit « je préfère ça », « j’aime », « je n’aime pas »,
« ok go » sur un rendu, valide ou refuse une présentation :

1. Ajouter l’entrée datée dans le [journal des préférences](docs/design/preferences.md)
   et mettre à jour son tableau « Règles en vigueur ».
2. Reporter la règle dans le fichier propriétaire : [fondations](docs/design/fondations.md),
   [composants](docs/design/composants.md), [comportements](docs/design/comportements.md),
   [gabarits](docs/design/gabarits.md) ou la fiche de la page.
3. Ajouter les pages concernées non encore alignées dans
   [Harmonisation](docs/design/harmonisation.md).
4. Le faire dans le même tour que la modification de code, sans demander
   d’autorisation supplémentaire. Si la portée est ambiguë, l’écrire comme
   question ouverte dans le journal plutôt que de bloquer.

La documentation du dépôt est la source de ces décisions. La mémoire de Claude
ne sert qu’aux informations qui n’ont pas leur place dans le dépôt.

## Commandes

Monorepo Bun (version du `packageManager` racine) + Turborepo. Depuis la racine :

| Besoin | Commande |
| --- | --- |
| Serveur de dev (web sur http://localhost:3001) | `bun run dev` |
| Vérification complète, identique à la CI | `bun run check` |
| Lint / types / tests de tous les paquets | `bun run lint` · `bun run typecheck` · `bun run test` |
| Code mort : fichiers, exports et dépendances sans usage (inclus dans `check`) | `bun run knip` (configuration `knip.jsonc`) |
| Contrôle des liens, index et fiches (après toute modif de `docs/`) | `bun run docs:check` (`docs:check:test` si `scripts/check-docs.mjs` change) |
| Budget d'architecture (taille des fichiers, frontière base de données) | `bun run --filter web check:architecture` |
| E2E Playwright (build de production + base dédiée) | `bun run test:e2e` |
| Suites SQL `*-postgres` sur bases locales jetables | `bun run test:postgres` (`POSTGRES_TEST_ADMIN_URL` local requis) |
| Migrations | `bun run db:migrate:deploy` (wrapper sûr, voir `packages/database/prisma/README.md`) |
| Client Prisma (requis avant typecheck/tests sur un clone neuf) | `bun --cwd packages/database run build` |

Dans `apps/web` :

- Un fichier de test : `bunx vitest run src/__tests__/<nom>.test.ts`
- Un test par nom : `bunx vitest run src/__tests__/<nom>.test.ts -t "<libellé>"`
- Lint ciblé : `bunx eslint <fichiers>` ; types : `bun run typecheck`
  (`npx tsc` ne fonctionne pas ici, TypeScript n'est installé que par Bun).

Les tests Vitest ne couvrent que `src/**/*.test.ts` (pas de `.tsx`), tournent
côté serveur et rendent les composants avec `renderToStaticMarkup`. Les suites
`*-postgres.test.ts` sont ignorées (`describe.skipIf`) tant que leur variable
`<MODULE>_TEST_DATABASE_URL` n'est pas définie (liste dans `turbo.json`) ;
`bun run test:postgres` les prépare et les lance sur un PostgreSQL local.
`packages/database` utilise `node --test`, pas Vitest.

Variables d'environnement : `apps/web/.env.sample` et
`packages/database/.env.sample`. Les E2E exigent une base distincte dont le nom
contient `e2e` ou `test`. Ne pas committer ni pousser sans demande explicite.

## Architecture

Cartographie complète : [docs/systeme](docs/systeme/README.md).

- `apps/web` : Next.js 15 (App Router), React 19, Tailwind v4, primitives
  shadcn/Radix dans `src/components/ui`. Routes françaises (`/membres`,
  `/systeme`, `/mon-compte`…), API sous `src/app/api`.
- `packages/database` (`@repo/database`) : Prisma 6 sur PostgreSQL, migrations
  SQL, scripts de sauvegarde/restauration chiffrées et de récupération root.
  Les migrations contiennent des `CHECK`, triggers et index partiels absents de
  `schema.prisma` : ne pas les retirer parce qu'ils n'y figurent pas.
- `packages/shared` (`@repo/shared`) : contrats et types sûrs pour le
  navigateur (ex. `UserRole`).

### Découpage d'une fonctionnalité ([architecture d’une fonctionnalité](docs/references/architecture-fonctionnalite.md))

```text
src/features/<module>/
  components/  hooks/  schemas/ (Zod)  types/
  server/      repository, service métier, politiques (seul accès base)
src/app/api/<module>/route.ts   adaptateur HTTP mince
```

Une route enchaîne toujours : `requireAuth()` → `requirePermission(user,
PERMISSIONS.X.Y)` (`$server/api-auth`) → `parseJsonBody` + `schema.safeParse` →
service de `features/<module>/server` → `apiSuccess` / `apiErrors` enveloppés
dans `withPrivateNoStore` (`$server/api-response`). Un service signale un refus
en levant une `ServiceError` (`$server/service-error`, avec `assertPermission`
et `assertRecent…` pour les droits et preuves) ; la route la traduit avec
`serviceErrorResponse`. Les mutations utilisent une version optimiste et
écrivent l'audit dans la même transaction.

Chaque fonctionnalité est déclarée dans `feature-registry.constants.ts`
(clé, route, permissions, statut `planned`/`live`). Les permissions des
fonctionnalités `planned` (`ROADMAP_PERMISSIONS`) ne sont jamais effectives.
Référentiel des droits : `$constants/permissions.constants.ts` (règles ; il
réexporte le catalogue de `permission-catalog.constants.ts`) et
[docs/domaines/permissions.md](docs/domaines/permissions.md).

`src/middleware.ts` gère CSRF (cookie + en-tête `x-csrf-token`, refus d'une
mutation dont `Sec-Fetch-Site` n'est pas `same-origin`, sur toute
mutation), CSP avec nonce, identifiant de requête et limitation de débit ;
la session est un cookie `session` résolu par `$server/session` (mots de
passe : `$server/password` ; journal d'audit : `$server/audit-log`).

### Contraintes vérifiées par `check:architecture`

- `@repo/database` / `@prisma/client` ne s'importent que depuis `app/api/`,
  `shared/server/` ou `features/*/server/`.
- 800 lignes maximum par fichier `.ts`/`.tsx` (exceptions historiques
  plafonnées dans `apps/web/scripts/check-architecture-budget.mjs`).

### Alias (`apps/web/tsconfig.json`)

`$ui` → `components/ui`, `$components`, `$features`, `$server` →
`shared/server`, `$constants`, `$utils`, `$hooks`, `$context`, `$types`
(tous sous `shared/` sauf `$ui`, `$components`, `$features`, `$app`), `$env`.

### Styles

Les jetons et la police des champs sont dans `src/app/globals.css` ; les règles
visuelles dans le [système de design](docs/design/README.md) (valeurs dans les
[fondations](docs/design/fondations.md)). Les règles des CSS modules sont hors
couche et l'emportent sur toute classe Tailwind, y compris celle passée par
l'appelant : dans une primitive, préférer des utilitaires (résolus par `cn()` /
tailwind-merge) quand un `className` externe doit pouvoir surcharger.

## Documentation

- [docs/README.md](docs/README.md) : carte de tous les dossiers.
- `docs/references/` : une fiche par point du guide ; `docs/design/` : système
  de design ; `docs/pages/` : une fiche par page et par section ;
  `docs/domaines/` : règles métier ; `docs/systeme/` : cartographie du code ;
  `docs/audits/` : preuves datées, à ne pas lire comme règles courantes.
- `docs/propositions/` : feuille de route (seule source des priorités), plans,
  et `intentions/` (ancien dossier `features/` de la racine), intentions
  historiques, pas l'état livré.
