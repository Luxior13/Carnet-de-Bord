# Q05 — Listes, recherche, filtres et pagination

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Y a-t-il une collection, une synthèse, une recherche ou des résultats volumineux ?

## Questions

- Quelles colonnes aident à identifier, comparer ou décider ? Les autres appartiennent-elles à la fiche ?
- Le tableau garde-t-il une largeur suffisante avant de basculer en cartes ?
- La taille de page, la recherche et les filtres sont-ils bornés côté serveur ?
- Quelle pagination correspond au volume et au besoin : numérotée bornée ou curseur pour un flux croissant ?
- L’ordre est-il stable, avec critère de départage ? Que se passe-t-il si une ligne change entre deux pages ?
- Recherche, tri, valeurs nulles, accents, casse et dates ont-ils une sémantique explicite ?
- Les paramètres d’URL sont-ils validés et restaurés ? Un filtre réinitialise-t-il la page au bon moment ?
- Une réponse de recherche lente peut-elle écraser une réponse plus récente ?
- Les totaux sont-ils globaux ou filtrés, exacts ou estimés, et visibles uniquement dans le périmètre autorisé ?
- Les compteurs et agrégations imposent-ils un coût disproportionné à chaque frappe ?
- La sélection multiple couvre-t-elle la page, le filtre entier ou une liste figée d’identifiants ?
- Une suppression laisse-t-elle une page vide invalide ? Que signifie « tout sélectionner » après un changement de filtre ?

## Vérifier

Zéro, un, une page pleine, plusieurs pages et dernière page partielle ; données
longues, grands totaux, droits limités, erreur après succès, réponses désordonnées.
Limiter les lignes réellement rendues et les commandes de pagination.
Préserver l’accès aux métadonnées dans la présentation compacte.

## Trace attendue

Colonnes, filtres, ordre, stratégie de pagination, taille maximale, portée des
totaux et comportement des résultats périmés.

## Non-applicabilité et réexamen

Non applicable sans collection ni agrégation. Rouvrir si la volumétrie, le coût
des statistiques ou une action collective change.

## Références

[Architecture](../../references/FEATURE_ARCHITECTURE.md) · [Performance](performance.md) ·
[Permissions](permissions.md).
