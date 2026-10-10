# Documentation du projet

Pour créer ou faire évoluer une page, un module, une API ou une tâche, commencer
par la [revue générale](qualite/REVUE_GENERALE.md), qui sélectionne les fiches
utiles au besoin et à ses effets indirects. Ne lire que ce qui sert ; un sujet
absent est ignoré.

## Dossiers

- [qualite/](qualite/README.md) : méthode de revue, fiches par sujet, suivis par
  page, modèles et décisions.
- [Références](qualite/REFERENCES.md) : règles et sources propriétaires (navigation, permissions,
  structure, design system, feuille de route, exploitation…).
- [Plans](plans/README.md) : propositions avec leur statut, passées ou à venir.
- [Audits](audits/README.md) : rapports datés, portée et limites des vérifications.
- [Intentions métier](../features/README.md) : anciens cadrages, reliés à la matrice actuelle.

## Pour le prochain changement

Pour l'interface, partir du [design system](references/DESIGN_SYSTEM.md) et du
[Répertoire de référence](qualite/pages/membres-repertoire.md), complété par
[Utilisateurs](qualite/pages/systeme-utilisateurs.md). Le guide indique les
composants à réutiliser, les tokens courants et les adaptations selon le type
de page. Les anciens audits et maquettes ne remplacent pas ces règles.

Sélectionner les sujets avec la revue générale, lire le
[suivi courant](qualite/pages/README.md), puis mettre à jour la décision dans son
document propriétaire. Pour une revue approfondie :
[méthode d’audit](qualite/AUDITS.md), [modèle](qualite/modeles/audit.md) et
[contrôles](qualite/CONTROLES.md). Terminer par `bun run docs:check`.

## Compréhension du projet

La [cartographie du 10 octobre 2026](audits/COMPREHENSION_PROJET_2026-10-10.md)
relie les pages actives, les modules, les données et les protections. Elle
consigne aussi les contrôles exécutés et leurs limites ; les références vivantes
restent propriétaires des règles courantes.
