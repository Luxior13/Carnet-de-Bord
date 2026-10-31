# Tests et contrôles

[Cartographie](README.md) · [Fiche Tests et validation](../references/tests-validation.md) ·
[Méthode d’audit](../methode/audit.md) · [Guide de contribution](../methode/guide-contribution.md)

## Familles de tests

Relevé du 20 octobre 2026.

| Famille | Volume | Emplacement | Commande |
| --- | --- | --- | --- |
| Tests web (Vitest, rendu serveur `renderToStaticMarkup`) | 115 fichiers `*.test.ts` | `apps/web/src/__tests__/` et quelques modules | `bun run test` ; un fichier : `bunx vitest run src/__tests__/<nom>.test.ts` depuis `apps/web` |
| Tests SQL sur PostgreSQL jetable | 12 fichiers `*-postgres.test.ts` (inclus ci-dessus) | `apps/web/src/__tests__/` | `bun run test:postgres` avec `POSTGRES_TEST_ADMIN_URL` (rôle d’un PostgreSQL **local** autorisé à créer des bases) : recrée les dix bases `*_test`, applique les migrations après avoir vérifié la cible, puis lance les douze suites (dont `audit-journal-postgres`, base `audit_journal_service_test`, depuis le 30 octobre 2026). Exécuté par la CI depuis le 24 octobre 2026. Sans PostgreSQL configuré, un serveur jetable se démarre avec les binaires installés : `initdb -D <dossier> -U postgres --auth=trust`, `pg_ctl -D <dossier> -o "-p 5433 -c listen_addresses=127.0.0.1" start`, puis `POSTGRES_TEST_ADMIN_URL=postgresql://postgres@127.0.0.1:5433/postgres` ; l’arrêter ensuite avec `pg_ctl stop`. Sans leur variable `<MODULE>_TEST_DATABASE_URL`, ces suites sont ignorées par `bun run test` |
| Tests de la base | 5 fichiers (`node --test`) | `packages/database/test/` : format, signature et chiffrement des sauvegardes, stockage de l’actualité interne, plan de performance | `bun --cwd packages/database run test` |
| Parcours navigateur Playwright | `admin-smoke.spec.ts` et ses contrôles (création et fiche utilisateur, paramètres) | `apps/web/e2e/` | `bun run test:e2e` (build de production, base dont le nom contient `e2e` ou `test`) |
| Contrats de structure | Frontières shadcn, autocomplétion, design system, contrats UX | `apps/web/src/__tests__/` | Inclus dans `bun run test` |
| Documentation | Liens, ancres, index, fiches de page | [check-docs.mjs](../../scripts/check-docs.mjs) | `bun run docs:check`, `bun run docs:check:test` |

La CI ([ci.yml](../../.github/workflows/ci.yml)) installe les dépendances,
génère le client Prisma, audite les dépendances, lance `bun run check` puis un
parcours E2E de production. Sa configuration ne prouve pas une exécution réussie.

## Choisir les contrôles et lire leur résultat

Les commandes ci-dessous partent de la racine du dépôt. Leur définition se trouve
dans les scripts [racine](../../package.json), [web](../../apps/web/package.json)
et [base](../../packages/database/package.json). Sélectionner selon le changement
et le risque ; une correction documentaire ne demande pas un audit de production.

| Commande | Objet | Limite / effet à connaître |
| --- | --- | --- |
| `bun run docs:check` | Liens locaux, ancres Markdown et présence dans les index documentaires | Ne prouve pas l’exactitude métier ni la disponibilité des liens Internet |
| `bun run docs:check:test` | Régressions du contrôleur documentaire | Utilise des fichiers temporaires isolés, supprimés après les tests |
| `bun run lint` | Conventions et analyses statiques | Un succès ne démontre pas un parcours |
| `bun run typecheck` | Contrats TypeScript | Ne prouve pas les contraintes réellement déployées en base |
| `bun run --filter web check:architecture` | Budgets structurels du code | Un dépassement exige une analyse, pas un relèvement automatique du seuil |
| `bun run test` | Suites automatisées des packages | Lire les simulations, prérequis et tests ignorés ; aucun verdict global si une suite échoue |
| `bun run build` | Compilation de production | Produit des artefacts ; ne publie pas le site |
| `bun run --filter web check:performance` | Budgets des artefacts du build | Exige un build à jour ; ne mesure pas les requêtes SQL ni une session utilisateur |
| `bun run test:e2e` | Parcours navigateur et préparation E2E | Examiner la configuration et la préparation avant exécution ; environnement et comptes dédiés requis |
| `bun run persons:performance` | Mesures du répertoire en base | Vérifier la cible, le volume et les effets du script ; ne pas viser une base réelle par défaut |
| `bun run check` | Chaîne générale : documentation, tests du contrôleur, lint, code mort (knip), types, architecture, tests, build et budget de build | S’arrête au premier échec ; les étapes suivantes sont alors non exécutées ; ne comprend pas les E2E |

`maintenance`, les migrations, les scripts d’initialisation et les restaurations
ne sont pas des vérifications neutres : ils peuvent écrire, purger ou remplacer
des données. Consulter [Exploitation](../exploitation/operations.md) et le
[guide de la base](../../packages/database/prisma/README.md) selon le besoin.
Utiliser une cible isolée pour les essais qui modifient des données.

Régression SQL du répertoire : depuis `apps/web`, lancer
`bun run test src/__tests__/persons-list-postgres.test.ts` avec
`PERSONS_LIST_TEST_DATABASE_URL` pointant vers une base locale jetable nommée
`repertoire_pagination_test`. Ce groupe est ignoré sans cette variable ; il crée
et supprime un schéma unique et n'utilise pas `DATABASE_URL`. Le schéma minimal
teste la liste et ses comptages, pas les migrations ni les mutations métier.
Lancer directement la commande pour une preuve nouvelle, sans cache Turbo.

Régression SQL de la recherche Utilisateurs : depuis `apps/web`, lancer
`bun run test src/__tests__/users-list-postgres.test.ts` avec
`USERS_LIST_TEST_DATABASE_URL` pointant vers une base locale jetable nommée
`users_list_test`. Sans cette variable, ce groupe est ignoré. Il crée et supprime
son propre schéma unique, refuse une cible non locale ou un autre nom de base,
et n'utilise jamais `DATABASE_URL` par défaut. Le schéma minimal vérifie la
recherche et sa visibilité ; il ne valide pas les migrations, les sessions ou
les mutations. Exécuter directement pour une preuve nouvelle sans cache Turbo.
La variable est déclarée dans l'environnement de la tâche de test Turbo.

## Couverture de la documentation

Le [contrôleur](../../scripts/check-docs.mjs) découvre tous les fichiers
Markdown de `docs/` (rapports d’audit et preuves compris), `AGENTS.md`,
`CLAUDE.md`, `README.md` et les guides de la base. Il contrôle les liens
relatifs, images locales et ancres Markdown avec la casse exacte, y compris dans
le même fichier ; les exemples entre délimiteurs de code et les commentaires
sont ignorés, les destinations externes ne sont pas interrogées. Il exige aussi :
chaque fiche de `references/` reliée depuis le guide, aucun document orphelin
dans les dossiers de référence, chaque fiche de `pages/` accessible depuis son
index, chaque `page.tsx` citée par une fiche et chaque rapport daté relié depuis
l’index des audits. Le périmètre exact est décrit dans
l’[index de la documentation](../README.md#contrôle-du-référentiel).

Les chemins cités comme texte ou code, les fragments de fichiers non Markdown et
la syntaxe Markdown exotique demandent une relecture humaine. Ce script ne
remplace pas un moteur complet de rendu Markdown.

Les intentions historiques de `propositions/intentions/` restent toutes
accessibles depuis leurs index, sous-dossiers compris. Leur présence ne prouve
aucune fonction livrée.

Un lien cassé se corrige vers la vraie source. Pour un fichier retiré cité dans un
audit historique, conserver son ancien chemin comme texte explicitement historique.
Ne pas recréer un fichier obsolète ni ajouter une exclusion globale pour rendre le
contrôle vert. Tester le contrôleur lui-même (`bun run docs:check:test`) quand sa
logique change.

## Vérifications manuelles ciblées

Pour une page : action principale, lecture après rechargement, refus d’accès,
clavier/focus, petit écran et état d’erreur selon les sujets applicables. Une capture
seule ne démontre ni l’interaction ni la sauvegarde. Pour une donnée : contrôler
sa source, les règles de calcul, les filtres et sa portée d’autorisation.

Consigner commande/scénario, date, environnement, résultat et limite selon
[la méthode d’audit](../methode/audit.md). Une ancienne réussite n’annule pas un échec actuel.
Les problèmes connus et résultats datés sont dans les
[rapports](../audits/README.md) et les [suivis](../pages/README.md), pas figés dans ce guide.
