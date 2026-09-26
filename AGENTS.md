# Instructions du dépôt

## Point d’entrée

Pour toute création, modification, correction, refonte ou suppression, commencer par
[la revue générale](docs/qualite/REVUE_GENERALE.md). Parcourir ses questions de
sélection, puis lire uniquement les fiches pertinentes. La méthode vaut aussi pour
une API, une tâche, un schéma ou un composant partagé, même sans page.

- Respecter le périmètre demandé et les décisions déjà données dans la conversation.
- Qualifier le besoin avant de développer. Une capacité inutile peut être omise.
- Adapter la profondeur de contrôle au risque ; une retouche de texte ne demande
  pas le même travail qu’une migration ou un changement de permissions.
- Ne pas transformer une fiche en exigence de créer une notification, une table,
  un cache, un service ou une permission.
- Un sujet sans effet sur ce changement peut être « hors impact » ; un sujet
  absent de la fonctionnalité peut être « non applicable ». Justifier brièvement.
- Ne pas confondre contrôle non effectué et validation réussie.
- Consulter les décisions courantes de la page et les références canoniques.
  Ne pas recopier un audit daté comme règle générale.
- Mettre à jour le suivi existant ; créer un suivi de page seulement si des
  décisions durables le justifient. Aucun nouveau dossier pour chaque retouche.
- Ces documents n’ajoutent aucune demande de permission pour le travail déjà
  autorisé. Les autorisations explicites de la session restent applicables.

## Contexte et références

Outil de gestion de Noctambule : structure esport actuellement associative,
préparée à évoluer vers une société. Séparer personnes, comptes, relations datées,
équipes, entités juridiques, saisons et exercices. Ne pas réécrire les anciens
engagements lors d’une évolution de structure.

[Organisation documentaire](docs/qualite/README.md) ·
[Références du projet](docs/qualite/REFERENCES.md).

Le code et les tests décrivent l’état implémenté, pas nécessairement l’état souhaité.
Une divergence avec une décision explicite se corrige ou se signale ; elle ne se
résout pas en supposant que le document le plus long a raison.

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
