# Q06 — Formulaires, actions et validations

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : L’utilisateur saisit-il, décide-t-il, publie-t-il ou déclenche-t-il une mutation ?

## Questions

- Quels champs sont indispensables ? Valeur absente, zéro, chaîne vide et valeur par défaut ont-ils le même sens ?
- Les labels, aides, formats et règles de validation expliquent-ils la saisie avant l’erreur ?
- Les règles sont-elles validées côté serveur, indépendamment du navigateur ?
- Une donnée calculée est-elle présentée comme telle plutôt que rendue artificiellement éditable ?
- Que devient la saisie après erreur réseau, expiration de session, retour navigateur ou fermeture ?
- Une seconde personne peut-elle modifier la ressource ? Le conflit protège-t-il contre l’écrasement silencieux ?
- Le double clic, une nouvelle tentative ou un timeout peuvent-ils exécuter deux fois l’action ?
- L’enregistrement est-il explicite ou automatique ? Quel état indique ce qui est réellement sauvegardé ?
- L’annulation annule-t-elle une saisie locale, une opération lancée ou seulement la fermeture de l’écran ?
- Une action dangereuse explique-t-elle son objet, son effet et son caractère récupérable ?
- Une publication ou validation impose-t-elle un état préalable, un décideur et une éventuelle séparation des responsabilités ?
- Une action en lot produit-elle un succès total, partiel ou atomique, avec un résultat exploitable ?

## Vérifier

Saisie correcte/incorrecte, serveur refusant une valeur, répétition, conflit,
interruption, perte de droit, erreur puis reprise. Le bouton de soumission indique
l’attente sans faire perdre le contexte ; un succès n’est annoncé qu’après la
confirmation attendue du serveur.

## Trace attendue

Champs, validation, transitions, portée de l’action, traitement des conflits,
retour après succès et comportement de la saisie non enregistrée.

## Non-applicabilité et réexamen

Non applicable pour une vue de lecture sans commande métier ; un simple lien vers
un formulaire ne rend pas cette page propriétaire de la logique du formulaire.

## Références

[API et concurrence](api-concurrence.md) · [Toasts](toasts-feedback.md) ·
[Permissions](permissions.md).
