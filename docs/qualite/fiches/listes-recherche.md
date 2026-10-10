# Q05 — Listes, recherche, filtres et pagination

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Y a-t-il une collection, une synthèse, une recherche ou des résultats volumineux ?

## Questions

- Avec un curseur, le total représente-t-il tout le filtre autorisé ou seulement les lignes restantes après le curseur ? Tester aussi une page suivante et un résultat vide.
- Une position de ligne, un rang métier et un identifiant sont-ils distingués ? Leur sens reste-t-il correct après tri, filtrage et passage en cartes ?

- Quelles colonnes aident à identifier, comparer ou décider ? Les autres appartiennent-elles à la fiche ?
- Le tableau garde-t-il une largeur suffisante avant de basculer en cartes ?
- La taille de page, la recherche et les filtres sont-ils bornés côté serveur ?
- Quelle pagination correspond au volume et au besoin : numérotée bornée ou curseur pour un flux croissant ?
- L’ordre est-il stable, avec critère de départage ? Que se passe-t-il si une ligne change entre deux pages ?
- Recherche, tri, valeurs nulles, accents, casse et dates ont-ils une sémantique explicite ?
- Pour une recherche d'identité, l'ordre des mots et les noms composés donnent-ils
  le résultat attendu ? Les caractères spéciaux restent-ils littéraux ?
- Les paramètres d’URL sont-ils validés et restaurés ? Un filtre réinitialise-t-il la page au bon moment ?
- Une réponse de recherche lente peut-elle écraser une réponse plus récente ?
- Les totaux sont-ils globaux ou filtrés, exacts ou estimés, et visibles uniquement dans le périmètre autorisé ?
- Si un compteur est cliquable, ouvre-t-il le sous-ensemble annoncé ? Les critères
  conservés ou remplacés sont-ils explicites, et le filtre appliqué est-il retirable ?
- Au retour d'une fiche, faut-il retrouver filtres, page, défilement et focus ?
  Avec un curseur, le précédent est-il encore connu ? Prévoir une reprise pour
  un lien partagé ; borner toute mémorisation et l'isoler par compte et critères.
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
[Permissions](permissions.md) · [Design system](../../references/DESIGN_SYSTEM.md) ·
[Répertoire — décisions courantes](../pages/membres-repertoire.md).
