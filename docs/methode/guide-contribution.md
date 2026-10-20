# Guide de contribution

[Guide général](../REFERENCE_GENERALE.md) · [Organisation documentaire](organisation-documentaire.md)

Les [consignes du dépôt](../../AGENTS.md) restent prioritaires ; ce guide les
complète pour les commandes, le style, les tests et les commits.

## Structure du projet

- `apps/web` : application Next.js (App Router), API, composants, styles et
  tests dans `src/` ; parcours Playwright dans `e2e/` ; scripts de contrôle et
  de maintenance dans `scripts/`.
- `packages/database` : schéma Prisma, migrations, scripts de sauvegarde, de
  restauration et de récupération du compte racine, tests `node --test`.
- `packages/shared` : contrats et types sûrs pour le navigateur.
- `docs/` : documentation, organisée selon son [index](../README.md) ;
  `scripts/` : contrôleur documentaire et utilitaires du dépôt.
- Architecture détaillée : [cartographie du système](../systeme/architecture.md).

## Build, test et développement

Monorepo Bun (version déclarée dans `packageManager` du
[manifest racine](../../package.json)) et Turborepo. Depuis la racine :

| Besoin | Commande |
| --- | --- |
| Client Prisma (requis avant types et tests sur un clone neuf) | `bun --cwd packages/database run build` |
| Serveur de développement (http://localhost:3001) | `bun run dev` |
| Vérification complète, identique à la CI | `bun run check` |
| Lint, types, tests de tous les paquets | `bun run lint` · `bun run typecheck` · `bun run test` |
| Budget d’architecture | `bun run --filter web check:architecture` |
| Parcours E2E (build de production, base dédiée) | `bun run test:e2e` |
| Migrations (wrapper sûr) | `bun run db:migrate:deploy` |
| Documentation | `bun run docs:check` (`docs:check:test` si le contrôleur change) |

Dans `apps/web` : un fichier de test `bunx vitest run src/__tests__/<nom>.test.ts`,
un test par nom avec `-t "<libellé>"`, lint ciblé `bunx eslint <fichiers>`,
types `bun run typecheck` (`npx tsc` ne fonctionne pas : TypeScript n’est
installé que par Bun). Variables d’environnement : `apps/web/.env.sample` et
`packages/database/.env.sample`.

Les commandes qui écrivent (maintenance, migrations, initialisation,
restauration) ne sont pas des vérifications neutres : viser une base isolée.
Détails et limites : [tests et contrôles](../systeme/tests.md).

## Style et nommage

- Prettier : 2 espaces, guillemets simples, points-virgules, virgules finales,
  80 colonnes, `arrowParens: always`, plugin Tailwind (ordre des classes).
- ESLint (Next.js, TypeScript, imports triés, clés triées, sécurité,
  imports inutilisés) ; TypeScript en mode strict.
- Composants exportés en PascalCase ; fichiers de module selon le dossier
  (`PersonDetailPage.tsx`, `person.service.ts`, `users-list.utils.ts`).
  Suivre le nommage existant ; ne pas renommer en masse.
- Alias : `$ui`, `$components`, `$features`, `$server`, `$constants`,
  `$utils`, `$hooks`, `$context`, `$types`, `$env`.
- Aucune couleur codée, aucun contrôle HTML natif hors `components/ui`,
  aucune autocomplétion réactivée ([design](../design/README.md)).
- Textes de l’interface et de la documentation en français, avec les accents ;
  routes en français.

## Tests

- Vitest pour `src/**/*.test.ts` (pas de `.tsx`), exécuté côté serveur ; les
  composants sont rendus avec `renderToStaticMarkup`.
- Les suites `*-postgres.test.ts` sont ignorées tant que leur variable
  `<MODULE>_TEST_DATABASE_URL` n’est pas définie ; elles visent une base locale
  jetable et refusent une autre cible.
- `packages/database` utilise `node --test`.
- Aucun seuil de couverture : couvrir les comportements modifiés par des tests
  ciblés, sans test décoratif.

## Commits et pull requests

- Format observé : `feat(scope): …`, `fix(scope): …`, `refactor(scope): …`,
  `docs: …`, `feat(audits): …` pour les bancs et preuves.
- PR : objectif, commandes exécutées et résultats, captures pour l’interface,
  limites de vérification.
- CI : [ci.yml](../../.github/workflows/ci.yml) lance `bun run check` puis un
  parcours E2E de production ; sa configuration ne prouve pas une exécution réussie.
- Ne pas committer ni pousser sans demande explicite.

## Documentation et agents

- Avant toute création ou évolution, suivre la [référence générale](../REFERENCE_GENERALE.md) :
  parcourir ses 36 points et ouvrir seulement les fichiers des points concernés.
- Utiliser Context7 (`resolve-library-id`, puis `query-docs`) pour la
  documentation des bibliothèques, en vérifiant la version installée.
- Chaque page a sa [fiche](../pages/README.md) : la créer avec une nouvelle page,
  l’actualiser à chaque reprise. Les retours visuels du propriétaire vont dans
  le [journal des préférences](../design/preferences.md).
- Conserver les décisions durables dans leur document propriétaire selon
  l’[organisation documentaire](organisation-documentaire.md), sans recopier les
  rapports datés. Lancer `bun run docs:check` après chaque modification documentaire.
