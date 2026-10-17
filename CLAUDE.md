# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Les règles de travail du dépôt (méthode de revue, suivi des pages, consignation
des décisions, Context7) sont dans [AGENTS.md](AGENTS.md) et s'appliquent
intégralement. Ce fichier ne les répète pas ; il résume les commandes et
l'architecture.

## Commandes

Monorepo Bun (1.3.10) + Turborepo. Depuis la racine :

| Besoin | Commande |
| --- | --- |
| Serveur de dev (web sur http://localhost:3001) | `bun run dev` |
| Vérification complète, identique à la CI | `bun run check` |
| Lint / types / tests de tous les paquets | `bun run lint` · `bun run typecheck` · `bun run test` |
| Contrôle des liens et index documentaires (après toute modif de `docs/`) | `bun run docs:check` |
| Budget d'architecture (taille des fichiers, frontière base de données) | `bun run --filter web check:architecture` |
| E2E Playwright (build de production + base dédiée) | `bun run test:e2e` |
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
`<MODULE>_TEST_DATABASE_URL` n'est pas définie (liste dans `turbo.json`).
`packages/database` utilise `node --test`, pas Vitest.

Variables d'environnement : `apps/web/.env.sample` et
`packages/database/.env.sample`. Les E2E exigent une base distincte dont le nom
contient `e2e` ou `test`.

## Architecture

- `apps/web` : Next.js 15 (App Router), React 19, Tailwind v4, primitives
  shadcn/Radix dans `src/components/ui`. Routes françaises (`/membres`,
  `/systeme`, `/mon-compte`…), API sous `src/app/api`.
- `packages/database` (`@repo/database`) : Prisma 6 sur PostgreSQL, migrations
  SQL, scripts de sauvegarde/restauration chiffrées et de récupération root.
  Les migrations contiennent des `CHECK`, triggers et index partiels absents de
  `schema.prisma` : ne pas les retirer parce qu'ils n'y figurent pas.
- `packages/shared` (`@repo/shared`) : contrats et types sûrs pour le
  navigateur (ex. `UserRole`).

### Découpage d'une fonctionnalité (`docs/references/FEATURE_ARCHITECTURE.md`)

```text
src/features/<module>/
  components/  hooks/  schemas/ (Zod)  types/
  server/      repository, service métier, politiques (seul accès base)
src/app/api/<module>/route.ts   adaptateur HTTP mince
```

Une route enchaîne toujours : `requireAuth()` → `requirePermission(user,
PERMISSIONS.X.Y)` (`$server/api-auth`) → `parseJsonBody` + `schema.safeParse` →
service de `features/<module>/server` → `apiSuccess` / `apiErrors` enveloppés
dans `withPrivateNoStore` (`$server/api-response`). Les mutations utilisent une
version optimiste et écrivent l'audit dans la même transaction.

Chaque fonctionnalité est déclarée dans `feature-registry.constants.ts`
(clé, route, permissions, statut `planned`/`live`). Les permissions des
fonctionnalités `planned` (`ROADMAP_PERMISSIONS`) ne sont jamais effectives.
Référentiel des droits : `$constants/permissions.constants.ts` et
`docs/references/PERMISSIONS.md`.

`src/middleware.ts` gère CSRF (cookie + en-tête `x-csrf-token` sur toute
mutation), CSP avec nonce, identifiant de requête et limitation de débit ;
la session est un cookie `session` résolu par `$server/auth`.

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
visuelles dans `docs/references/DESIGN_SYSTEM.md`. Les règles des CSS modules
sont hors couche et l'emportent sur toute classe Tailwind, y compris celle
passée par l'appelant : dans une primitive, préférer des utilitaires (résolus
par `cn()` / tailwind-merge) quand un `className` externe doit pouvoir
surcharger.

## Documentation

- `docs/qualite/` : revue générale, fiches par sujet, suivis de pages
  (`pages/`) ; `docs/references/` : règles canoniques ; `docs/audits/` :
  preuves datées, à ne pas lire comme règles courantes.
- `features/` (racine) : intentions métier historiques, pas l'état livré.
  L'état courant vient de `docs/references/FEUILLE_DE_ROUTE.md` et des suivis.
