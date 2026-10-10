# Q04 — Accessibilité et adaptation

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Une interaction, un contenu ou une présentation est-il ajouté ou modifié ?

## Questions

- Un redimensionnement, une rotation, le clavier virtuel ou le passage tableau/cartes fait-il perdre saisie, sélection, focus ou accès aux actions ?
- Un élément essentiel masqué faute de place reste-t-il accessible au tactile et au clavier, sans dépendre d’une infobulle ?

- La structure HTML exprime-t-elle titres, sections, tableau, formulaire et liste ?
- Chaque contrôle a-t-il un nom accessible compréhensible hors contexte visuel ?
- Tout est-il utilisable au clavier dans un ordre cohérent, avec focus visible ?
- Le focus reste-t-il perceptible sous le header, le rail collant ou une fenêtre ?
- Une fenêtre gère-t-elle ouverture, confinement nécessaire, Échap et retour du focus ?
- Une erreur est-elle liée au champ et expliquée autrement que par la couleur ?
- Les annonces de chargement, résultat et erreur sont-elles utiles sans répétition excessive ?
- Le contraste est-il suffisant dans tous les états utiles, y compris placeholder et survol ?
- Les cibles, espacements et interactions conviennent-ils au tactile sans dépendre du survol ?
- Le contenu résiste-t-il au zoom, à l’agrandissement du texte, aux couleurs forcées et au mouvement réduit ?
- Les avatars, icônes et images ont-ils une alternative utile ou sont-ils correctement décoratifs ?
- Une virtualisation, un glisser-déposer ou un tableau interactif garde-t-il une alternative accessible ?

## Vérifier

Combiner inspection sémantique, clavier réel, mesures visuelles et outils automatisés.
Pour les parcours importants ou composants complexes, utiliser un lecteur d’écran.
Différencier zoom texte, zoom natif et émulation mobile. Un moteur WebKit automatisé
ne prouve pas le comportement de Safari/iOS réel.

Le projet vise des contrôles conformes au niveau AA de WCAG 2.2 ; le choix d’une
cible de confort plus grande n’est pas une citation d’une obligation universelle.
Une passe automatisée ne suffit pas à déclarer la conformité d’une page entière.
[Référence W3C](https://www.w3.org/WAI/WCAG22/quickref/).

## Trace attendue

Parcours, outils, environnements, critères examinés et limites. Décrire les défauts
reproductibles ; ne pas écrire « accessible » après une simple capture.

## Non-applicabilité et réexamen

La lecture détaillée peut être hors impact pour un changement serveur sans effet
sur l’expérience. Toute interaction ou présentation modifiée la réactive.

## Références

[Design system](../../references/DESIGN_SYSTEM.md) · [Tests](tests-validation.md).
