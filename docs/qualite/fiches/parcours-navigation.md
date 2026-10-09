# Q02 — Parcours, navigation et contenu

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Une page, un lien, une action, un état ou un libellé change-t-il ?

## Questions

- D’où arrive-t-on, pourquoi, et où doit-on aller après l’action ?
- Faut-il une page, une rubrique, un onglet, une fenêtre ou simplement un filtre ?
- Le titre, la courte description et l’action principale expliquent-ils des choses différentes ?
- L’action est-elle proche de l’objet qu’elle modifie, avec un libellé qui décrit son effet ?
- Le fil d’Ariane représente-t-il une hiérarchie réelle ? Un retour contextuel ou une annulation est-il aussi utile ?
- Les filtres, la page courante et le contexte sont-ils conservés après consultation ?
- Rechargement, lien partagé, retour/précédent navigateur et URL ancienne fonctionnent-ils ?
- Quelle explication donner pour vide, aucun résultat, erreur, absence de droit et fonction indisponible ?
- Un compte limité ou une personne peu habituée comprend-il les termes, dates et conséquences ?
- Une donnée importante tronquée reste-t-elle accessible autrement qu’au survol ?
- Supprimer une route casse-t-il favoris, liens de notifications, emails, exports ou navigation historique ?
- Une étape évitable ou une confirmation répétitive gêne-t-elle un usage quotidien ?

## Vérifier

Exécuter le parcours principal depuis une arrivée réaliste, au clavier et sur petit
écran. Ouvrir un lien direct ; recharger ; modifier un filtre ; consulter puis revenir.
Un menu masqué ne remplace pas une politique d’accès serveur.

## Trace attendue

Entrées, sortie, action principale, états nécessaires, comportement de retour et
éventuelles URL de compatibilité.

## Non-applicabilité et réexamen

Hors impact pour une modification strictement interne sans effet visible, route
ni message. Rouvrir si une règle, un droit ou un état change l’action possible.

## Références

[Navigation](../../references/NAVIGATION.md) · [UX selon le type de page](../REVUE_GENERALE.md) ·
[Formulaires](formulaires-actions.md) si une saisie est concernée.
