# Q01 — Besoin, périmètre et règles métier

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : À chaque changement : quel problème résout-on, pour qui et avec quel résultat observable ?

## Décider avant de construire

- Quelle tâche concrète doit devenir plus simple, plus fiable ou plus rapide ?
- Qui la réalise : joueur, coach, bénévole, bureau, trésorier, prestataire ? Qui en subit les conséquences ?
- Quel objet métier et quel module sont propriétaires de la règle ?
- Le besoin existe-t-il aujourd’hui, à une échéance connue, ou seulement comme hypothèse ?
- Une fonction existante, un filtre ou une action contextuelle répond-il déjà au besoin ?
- Quel résultat observable définit la réussite ? Quel est le coût de ne rien faire ?
- Quelles règles sont invariantes et lesquelles dépendent de l’entité, du jeu, de la saison ou du contrat ?
- Quels états et transitions sont autorisés ? Qui tranche une exception ou un litige ?
- Quelles données et quel travail deviennent inutiles si la fonction est retirée ?
- La complexité ajoutée est-elle proportionnée au nombre d’utilisateurs et à la fréquence d’usage ?

## Examiner les cas métier

Décrire un cas normal, un cas limite et un échec avec des données plausibles.
Inclure changement de responsable, personne sans compte, dossier historique et
droit retiré si ces situations existent. Pour une action collective, distinguer
les réussites partielles d’un succès total.

## Trace attendue

Problème, public, propriétaire, périmètre, règles, critère de réussite et hypothèses.
Pour une retouche locale, quelques lignes suffisent. Ne pas réinventer le plan
produit dans cette fiche.

## Non-applicabilité et réexamen

Le cadrage reste nécessaire à chaque changement, même brièvement. Rouvrir lors
d’un nouvel usage ou d’un changement de périmètre ; ne pas perpétuer une fonction
uniquement parce qu’elle a déjà été développée.

## Références

[Feuille de route](../../references/FEUILLE_DE_ROUTE.md) · [Navigation](../../references/NAVIGATION.md) ·
[Structure](../../references/STRUCTURE.md).
