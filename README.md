# Carnet de Bord

Outil de gestion privé de **Noctambule**, structure esport associative préparée
à évoluer vers une société : comptes et autorisations, répertoire des membres,
paramètres et feuille de route. Projet en développement actif.

## Documentation

- [Référence générale](docs/REFERENCE_GENERALE.md) — **point d’entrée de tout travail** : les 36 points à examiner, chacun relié à son fichier détaillé.
- [Index de la documentation](docs/README.md) — carte de tous les dossiers.
- [Fiches des pages](docs/pages/README.md) — une fiche par page et par section importante.
- [Système de design](docs/design/README.md) — pages de référence, fondations, composants, comportements, gabarits, préférences du propriétaire, harmonisation.
- [Cartographie du système](docs/systeme/README.md) — architecture, routes, API, données, tests et constats.
- [Feuille de route](docs/propositions/feuille-de-route.md) — priorités de construction.
- [Consignes des agents](AGENTS.md) et [consignes propres à Claude](CLAUDE.md).

## Développement

Prérequis : Bun (version du `packageManager` de [package.json](package.json)) et
une base PostgreSQL locale.

```bash
bun install
cp apps/web/.env.sample apps/web/.env
cp packages/database/.env.sample packages/database/.env
bun --cwd packages/database run build
bun run db:migrate:deploy
bun run dev
```

L’application web répond sur http://localhost:3001.

## Qualité

```bash
bun run check          # documentation, lint, types, architecture, tests, build, budgets
bun run docs:check     # liens, index et fiches de la documentation
bun run test:e2e       # parcours navigateur sur une base dédiée (nom contenant e2e ou test)
```

Détail des commandes, des tests sur bases isolées et de leurs limites :
[tests et contrôles](docs/systeme/tests.md) et
[guide de contribution](docs/methode/guide-contribution.md).

## Base de données et exploitation

Les migrations passent par le wrapper sûr `bun run db:migrate:deploy`. Les
sauvegardes, restaurations, secrets et la récupération du compte racine sont
décrits dans les [procédures d’exploitation](docs/exploitation/README.md) et le
[guide de la base](packages/database/prisma/README.md). Les commandes qui
écrivent (maintenance, migrations, restauration) ne sont jamais des
vérifications neutres : viser une base isolée pour les essais.
