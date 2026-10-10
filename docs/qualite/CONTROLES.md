# Choisir les contrôles et lire leur résultat

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
| `bun run check` | Chaîne générale : documentation, tests du contrôleur, lint, types, architecture, tests, build et budget de build | S’arrête au premier échec ; les étapes suivantes sont alors non exécutées ; ne comprend pas les E2E |

`maintenance`, les migrations, les scripts d’initialisation et les restaurations
ne sont pas des vérifications neutres : ils peuvent écrire, purger ou remplacer
des données. Consulter [OPERATIONS](../references/OPERATIONS.md) et le
[guide de la base](../../packages/database/prisma/README.md) selon le besoin.
Utiliser une cible isolée pour les essais qui modifient des données.

## Couverture de la documentation

Le [contrôleur](../../scripts/check-docs.mjs) découvre les fichiers Markdown de
`docs/` et `features/`, ainsi que `AGENTS.md` et le guide de la base. Il contrôle
les liens relatifs, images locales et ancres Markdown, y compris dans le même
fichier. Les exemples entre délimiteurs de code sont ignorés. Les destinations
externes ne sont pas interrogées. Les index exigés sont déclarés dans le script.

Les contrôles d’index portent sur les documents directement propriétaires de chaque
dossier : fiches, modèles, suivis, décisions, références, plans, audits et intentions
à la racine de `features/`. Les pièces brutes et sous-dossiers ne deviennent pas
des rapports à indexer individuellement. Les chemins cités comme texte ou code,
les fragments de fichiers non Markdown et la syntaxe Markdown exotique demandent
une relecture humaine. Ce script ne remplace pas un moteur complet de rendu Markdown.

Exception explicite : l’index de `features/pages/` référence toutes ses fiches
historiques, sous-dossiers compris, pour qu’aucune ancienne intention ne soit
introuvable depuis le catalogue. Leur présence ne prouve aucune fonction livrée.

Un lien cassé se corrige vers la vraie source. Pour un fichier retiré cité dans un
audit historique, conserver son ancien chemin comme texte explicitement historique.
Ne pas recréer un fichier obsolète ni ajouter une exclusion globale pour rendre le
contrôle vert. Tester le contrôleur lui-même quand sa logique change.

## Vérifications manuelles ciblées

Pour une page : action principale, lecture après rechargement, refus d’accès,
clavier/focus, petit écran et état d’erreur selon les sujets applicables. Une capture
seule ne démontre ni l’interaction ni la sauvegarde. Pour une donnée : contrôler
sa source, les règles de calcul, les filtres et sa portée d’autorisation.

Consigner commande/scénario, date, environnement, résultat et limite selon
[la méthode d’audit](AUDITS.md). Une ancienne réussite n’annule pas un échec actuel.
Les problèmes connus et résultats datés sont dans les
[rapports](../audits/README.md) et les [suivis](pages/README.md), pas figés dans ce guide.
