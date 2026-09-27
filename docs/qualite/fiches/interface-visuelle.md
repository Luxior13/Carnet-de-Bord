# Q03 — Composition, couleurs et composants

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Le rendu, la densité, la hiérarchie ou un état visuel change-t-il ?

## Questions

- La composition correspond-elle à une liste, fiche, saisie, lecture ou synthèse ?
- Pour chaque élément examiné, est-ce le bon composant et la bonne variante pour
  le besoin, ou seulement le composant déjà présent ? Faut-il le conserver,
  simplifier, remplacer ou retirer ? Comparer les alternatives utiles avant de styliser.
- Les éléments composés (champ avec unité et actions, recherche avec filtres,
  menu avec badges) forment-ils un ensemble cohérent, sans multiplier les contours
  ou les contrôles concurrents ?
- Le regard trouve-t-il d’abord l’information et l’action prioritaires ?
- Le hero apporte-t-il quelque chose ? Titre seul ou titre avec une phrase courte suffit-il ?
- L’axe de centrage sert-il le travail ? La largeur reste-t-elle confortable avec sidebar, rail et scrollbar ?
- Quels espacements, hauteurs, alignements et densités restent cohérents quand il y a beaucoup de données ?
- Un rail mérite-t-il d’être latéral et collant ? Où passe-t-il lorsqu’il ne tient plus ?
- La police réellement chargée, les graisses et les tailles distinguent-elles titre, identité, valeur et métadonnée ?
- Les couleurs ont-elles un sens stable ? Un badge d’information ressemble-t-il à une urgence ou à un bouton ?
- Fonds, contours, alternance et séparateurs distinguent-ils les groupes sans concurrencer les données ?
- Les arrondis, icônes, ombres, animations et effets apportent-ils une fonction perceptible ?
- Que deviennent nom long, grand compteur, alerte, valeur absente, 1 ligne et 100 lignes ?
- Un changement local de jeton modifie-t-il aussi une fenêtre ou un menu rendu hors de la page ?

## Vérifier chaque état

Repos, survol, focus clavier, actif/sélectionné, ouvert, désactivé, attente, erreur
et succès si pertinents. Vérifier contours visibles, absence de saut, focus non
coupé, texte lisible et fermeture des menus. Contrôler le CSS calculé et le rendu,
pas seulement la présence d’une classe.

Examiner petit écran, largeur intermédiaire, grand écran, sidebar ouverte/réduite,
zoom et défilement. Une capture statique n’est qu’un des contrôles.

## Trace attendue

Hiérarchie, densité, sens des couleurs, disposition et raisons des écarts au design
system. Utiliser les jetons existants ou formaliser leur évolution.

## Non-applicabilité et réexamen

Hors impact si aucun rendu ni état visuel ne change. Ne pas imposer le tableau
Utilisateurs à un formulaire, un calendrier ou une page de lecture.

## Références

[Design system](../../DESIGN_SYSTEM.md) · [Accessibilité](accessibilite.md) ·
[Audit historique Utilisateurs](../../AUDIT_UI_UTILISATEURS_2026-09-26.md).
