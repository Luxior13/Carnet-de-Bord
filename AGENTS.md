# Consignes du projet pour les agents

## Contexte et données

- Outil de gestion de Noctambule : structure esport actuellement associative,
  préparée à évoluer vers une société. Séparer personnes, comptes, relations
  datées, équipes, entités juridiques, saisons et exercices. Ne pas réécrire les
  anciens engagements lors d’une évolution de structure
  ([domaines](docs/domaines/README.md)).
- Le projet est **en développement** (rappel du propriétaire du 11 octobre 2026).
  Privilégier les simplifications et refactorisations utiles au besoin actuel ;
  ne pas conserver une compatibilité hypothétique avec une production inexistante.
- Ce contexte ne rend pas les données locales jetables par défaut. Les garanties
  d’intégrité, les contrôles d’accès et les migrations reproductibles restent
  exigés ; les essais qui écrivent visent une base isolée, et une opération
  destructive demande un périmètre explicite et une sauvegarde
  ([procédures d’exploitation](docs/exploitation/operations.md)).
- Le code et les tests décrivent l’état implémenté, pas nécessairement l’état
  souhaité. Une divergence avec une décision explicite se corrige ou se signale ;
  elle ne se résout pas en supposant que le document le plus long a raison.

## Point d’entrée pour créer et faire évoluer

- Pour toute création, modification, correction, optimisation, refonte ou
  suppression (page, section, API, tâche, schéma, composant partagé, même sans
  page), commencer par [docs/REFERENCE_GENERALE.md](docs/REFERENCE_GENERALE.md).
- Suivre ce guide du début à la fin : cadrer le résultat attendu et le niveau de
  risque, parcourir ses 36 points, ouvrir uniquement les fichiers détaillés des
  points concernés, puis conclure en mettant à jour la documentation. Consulter
  d’abord la [fiche de la page ou du module](docs/pages/README.md).
- Respecter le périmètre demandé et les décisions déjà données dans la
  conversation. Qualifier le besoin avant de développer ; une capacité inutile
  peut être omise.
- Ne pas lire toute la documentation : ignorer les fiches dont le sujet est
  absent du besoin et de ses effets indirects. Un sujet sans effet sur ce
  changement est « hors impact », un sujet absent de la fonctionnalité « non
  applicable » ; justifier brièvement.
- Adapter la profondeur de contrôle au risque ; une retouche de texte ne demande
  pas le même travail qu’une migration ou un changement de permissions.
- Ne pas transformer une fiche en exigence de créer une notification, une table,
  un cache, un service ou une permission. Réutiliser les mécanismes communs.
- Revoir la sélection si le périmètre change. Pour un composant partagé, suivre
  ses consommateurs ; pour une suppression, vérifier ses dépendances encore actives.
- Ne pas confondre contrôle non effectué et validation réussie. Un correctif non
  revérifié reste « corrigé à vérifier ». Pour un audit ciblé, complet ou
  transverse, utiliser la [méthode d’audit](docs/methode/audit.md).

## Continuité des décisions et organisation

- Suivre la [répartition documentaire](docs/methode/organisation-documentaire.md) :
  une règle commune a un document propriétaire, une page a une fiche courante,
  un audit conserve ses preuves datées. **Consigner au fil de l’eau** tout point
  de décision, règle ou connaissance durable évoqué en conversation dans le
  document concerné, sans attendre d’autorisation ; distinguer fait observé,
  décision retenue et proposition à discuter.
- Chaque page existante a une fiche dans `docs/pages/`, et chaque section
  importante d’une page à sections a la sienne ; un module a un dossier avec un
  `README.md` commun. Une nouvelle page reçoit sa fiche en même temps que sa
  création ; une page retirée garde sa fiche marquée « retirée ». Une retouche
  mineure actualise la fiche seulement si elle change une information durable.
  Les fiches marquées « Suivi à compléter » se complètent à la première reprise.
- Pour l’interface, partir du [système de design](docs/design/README.md) :
  pages de référence (liste `/membres/repertoire`, complétée par
  `/systeme/utilisateurs` ; fiche `/systeme/utilisateurs/[id]` pour la barre
  d’enregistrement), gabarits, composants, fondations et comportements, puis la
  fiche de la page. Examiner aussi le choix de chaque contrôle, la justesse des
  données, les libellés, les états et les interactions ; consigner les
  adaptations de composition dans la fiche.
- **Préférences du propriétaire :** chaque retour visuel ou d’ergonomie
  (« je préfère ça », « j’aime », « je n’aime pas », « ok go » sur un rendu) est
  consigné le jour même dans le [journal des préférences](docs/design/preferences.md),
  puis reporté dans le fichier de design propriétaire de la règle et, pour les
  pages pas encore alignées, dans l’[harmonisation](docs/design/harmonisation.md).
  Une préférence exprimée sur une page s’applique par défaut aux pages du même gabarit.
- Pour créer, refondre ou revoir une page en profondeur, utiliser la
  [grille de questions de revue](docs/methode/questions-revue-page.md). Pour une
  retouche ciblée, limiter la passe aux éléments touchés et à leurs effets
  indirects ; la grille ne crée ni fonctionnalités obligatoires ni demandes de
  confirmation supplémentaires.
- Les décisions déjà données restent applicables ; cette documentation n’ajoute
  aucune demande de permission au travail autorisé. Une proposition documentée
  n’est toutefois pas une décision adoptée.
- Tenir à jour la [cartographie du système](docs/systeme/README.md) lorsqu’une
  route, une API, un modèle, un script ou une famille de tests est ajouté ou retiré.
- Après une modification documentaire, exécuter `bun run docs:check` et
  actualiser les index concernés ; `bun run docs:check:test` si le contrôleur
  évolue. Les anciennes preuves restent datées ; un contrôle documentaire ne
  valide ni un parcours ni une livraison.

## Repères du dépôt

- Monorepo Bun et Turborepo. L’application vit dans `apps/web`, les données
  dans `packages/database` et les contrats partagés dans `packages/shared`.
  Commandes et architecture résumées dans [CLAUDE.md](CLAUDE.md) et le
  [guide de contribution](docs/methode/guide-contribution.md).
- Les versions et scripts actuels viennent des [manifests](package.json),
  notamment [web](apps/web/package.json) et [database](packages/database/package.json).
  Ne pas reprendre les versions ou commandes d’un ancien audit.
- L’[index de la documentation](docs/README.md) permet de retrouver les
  documents spécialisés ; ne lire que ceux qui s’appliquent au besoin.

## Context7

Use Context7 MCP to fetch current documentation whenever the user asks about a
library, framework, SDK, API, CLI tool, or cloud service, including API syntax,
configuration, migrations, library-specific debugging and setup. Use it even for
well-known tools. Prefer it over web search for library documentation.

Do not use it merely for refactoring, scripts from scratch, business-logic
debugging, code review or general programming concepts.

1. Start with `resolve-library-id`, with the library name and the documentation
   question, unless an exact `/org/project` ID is already supplied.
2. Select by exact name, relevance, snippet coverage, source reputation and
   benchmark. Retry with a better query if needed. Prefer the requested version.
3. Call `query-docs` for one concept at a time using the chosen ID.
4. Use the fetched documentation, checking it against the version actually
   installed. Do not copy newer-version commands into this project blindly.

En cas de documentation indisponible ou incompatible avec la version installée,
le préciser et consulter une source officielle adaptée. Ne jamais prétendre
avoir vérifié une documentation qui n’a pas été obtenue.
