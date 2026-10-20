# Architecture

[Cartographie](README.md) · [Architecture d’une fonctionnalité](../references/architecture-fonctionnalite.md) ·
[Fiche Architecture](../references/architecture.md)

Relevé du 19 octobre 2026. Les versions et commandes font foi dans les
manifests : [racine](../../package.json), [web](../../apps/web/package.json),
[base](../../packages/database/package.json), [partagé](../../packages/shared/package.json).

## Applications et paquets

| Élément | Rôle | Points d’entrée |
| --- | --- | --- |
| `apps/web` | Application Next.js 15 (App Router), React 19, Tailwind v4, primitives shadcn/Radix locales, routes françaises et API sous `src/app/api` | [app/](../../apps/web/src/app/), [middleware](../../apps/web/src/middleware.ts), [env](../../apps/web/src/env.ts) |
| `packages/database` (`@repo/database`) | Prisma 6 sur PostgreSQL, migrations SQL, sauvegarde et restauration chiffrées et signées, récupération du compte racine | [schéma](../../packages/database/prisma/schema.prisma), [guide de la base](../../packages/database/prisma/README.md), [récupération](../../packages/database/ROOT_RECOVERY.md) |
| `packages/shared` (`@repo/shared`) | Contrats et types sûrs pour le navigateur (ex. `UserRole`) | [src/](../../packages/shared/src/) |

Monorepo Bun (`packageManager` du manifest racine) et Turborepo
([turbo.json](../../turbo.json)). Aucun worker ni service de tâches : la
maintenance (purges de conservation) s’exécute par `bun run maintenance`
([run-maintenance.ts](../../apps/web/scripts/run-maintenance.ts)), à planifier en
exploitation ([procédures](../exploitation/operations.md)).

## Organisation de `apps/web/src`

| Dossier | Contenu |
| --- | --- |
| `app/` | Pages, layouts, états de route (`error`, `loading`, `not-found`) et routes API |
| `features/<module>/` | `components/`, `hooks/`, `schemas/` (Zod), `types/`, `server/` (repository, service métier, politiques : seul accès base) |
| `components/ui` | Primitives shadcn/Radix adaptées aux tokens |
| `components/layout` | Compositions transverses : bandeau, sections, états, navigation de sections, barre d’enregistrement |
| `components/users` | Fiche utilisateur et éditeur d’autorisations |
| `shared/` | `constants`, `context`, `hooks`, `server` (authentification, réponses API, Prisma), `types`, `utils` |

Alias (`apps/web/tsconfig.json`) : `$ui` → `components/ui`, `$components`,
`$features`, `$server` → `shared/server`, `$constants`, `$utils`, `$hooks`,
`$context`, `$types`, `$env`.

## Flux d’une requête

```text
Navigateur
└─ middleware.ts : CSRF (cookie + en-tête x-csrf-token sur toute mutation),
   CSP avec nonce, identifiant de requête, limitation de débit
   ├─ Page (composant serveur) : getPageAuthSession → droits → service → rendu
   └─ Route API : requireAuth → requirePermission(PERMISSIONS.X.Y)
      → parseJsonBody + schema.safeParse → service de features/<module>/server
      → apiSuccess / apiErrors dans withPrivateNoStore
         └─ Prisma (transaction ; version optimiste et audit dans la même transaction)
```

La session est un cookie `session` résolu par `$server/auth`. Les actions
sensibles demandent une preuve récente (`requireRecentPasswordReauthentication`,
`requireRecentSensitiveActionProof`) ; la double authentification est
obligatoire.

## Registre des fonctionnalités

Chaque fonctionnalité est déclarée dans
[feature-registry.constants.ts](../../apps/web/src/shared/constants/feature-registry.constants.ts).
Les permissions d’une fonctionnalité `planned` ne sont jamais effectives.

| Clé | Libellé | Pôle | Route | Statut |
| --- | --- | --- | --- | --- |
| `dashboard` | Mon travail | Aujourd’hui | `/` | `live` |
| `persons` | Répertoire | Membres | `/membres/repertoire` | `live` |
| `internalNews` | Actualité interne | Activité | `/activite/actualites` | `planned` ; seule la table et ses permissions de feuille de route existent ([SYS-01](constats.md)) |
| `users` | Utilisateurs | Système | `/systeme/utilisateurs` | `live` |
| `systemSettings` | Paramètres système | Système | `/systeme/parametres` | `live` |
| `roadmap` | Feuille de route | Système | `/systeme/feuille-de-route` | `live` |
| `systemActivity` | Journal d’activité | Système | `/systeme/journal-activite` | `planned` (page retirée le 9 octobre 2026) |

Mon compte (`/mon-compte`) et la connexion ne sont pas des fonctionnalités du
registre : ils relèvent du socle personnel et de l’authentification.

## Contrôles d’architecture

- `bun run --filter web check:architecture` ([script](../../apps/web/scripts/check-architecture-budget.mjs)) :
  `@repo/database` et `@prisma/client` importés seulement depuis `app/api/`,
  `shared/server/` ou `features/*/server/` ; 800 lignes au plus par fichier
  `.ts`/`.tsx`, exceptions historiques plafonnées dans le script.
- `bun run --filter web check:performance` ([script](../../apps/web/scripts/check-performance-budget.mjs)) :
  budgets des artefacts du build.
- `shadcn-boundaries.test.ts` : aucun contrôle HTML natif hors de `components/ui`.

## Observation

- Santé : `GET /api/health`, `/api/health/live`, `/api/health/ready`.
- Mesures de performance du navigateur : `POST /api/observability/web-vitals`
  (`WebVitalsReporter`), session requise.
- `instrumentation.ts` et `instrumentation-client.ts` à la racine de `src`.

## Dépendances principales

Next.js 15.5, React 19.1, Prisma 6.19, Zod 4, cmdk, sonner, lucide-react,
DiceBear, bcryptjs ; Vitest et Playwright pour les tests. Les versions exactes
sont celles des manifests ; consulter Context7 pour leur documentation
([consignes](../../AGENTS.md#context7)).
