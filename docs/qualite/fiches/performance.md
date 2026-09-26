# Q17 — Performance et capacité

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Le coût de chargement, calcul, requête, rendu ou stockage peut-il changer avec le volume ?

## Questions

- Quelle expérience attend-on : premier affichage, recherche, sauvegarde, export ou travail en arrière-plan ?
- Quel volume actuel et plausible : lignes, fichiers, historique, utilisateurs simultanés et équipes/saisons ?
- Quel budget de latence, mémoire, taille de réponse et bundle convient au parcours ?
- Le budget est-il documenté et mesuré sur un environnement représentatif ?
- Le temps vient-il du réseau, serveur, SQL, agrégations, sérialisation, JavaScript ou rendu ?
- Combien de requêtes et de lignes sont lues ? Y a-t-il N+1, graphe non borné ou calcul répété ?
- Les index servent-ils réellement les filtres et l’ordre ; les plans sont-ils vérifiés sur un jeu pertinent ?
- Les totaux coûtent-ils plus cher que la liste ? Une saisie déclenche-t-elle trop de requêtes ?
- Quelle différence entre froid/chaud, petite/grande page, compte limité/administrateur et charge concurrente ?
- Le changement augmente-t-il le coût d’écriture, le stockage, les sauvegardes ou un quota fournisseur ?
- Les statistiques de performance exposent-elles des données ou créent-elles une cardinalité excessive ?
- Quel seuil et quel symptôme déclencheront un réexamen ?

## Vérifier

Mesurer avant/après avec versions, machine, volume, concurrence et scénario décrits.
Utiliser médiane et percentiles utiles, pas seulement un meilleur temps isolé.
Les fixtures qui simulent 10 000 comptes et n’en rendent que 20 vérifient l’interface,
pas la vitesse SQL ni les règles réelles d’accès.

Les budgets existants de bundle et d’architecture sont des garde-fous partiels.
Un petit bundle ne garantit pas une API rapide. Les essais de charge utilisent
une base isolée et des données de test.

## Trace attendue

Hypothèse, protocole, budget, résultat, goulot identifié et déclencheur de réexamen.
Ne pas annoncer « optimisé » sans mesure adaptée à l’objectif.

## Non-applicabilité et réexamen

Hors impact pour une correction sans effet significatif sur chargement/calcul.
Revoir lors d’une hausse de volume, d’un incident ou d’un nouvel usage intensif.

## Références

[Budget de performance](../../../apps/web/scripts/check-performance-budget.mjs) ·
[Guide de base et mesure Personnes](../../../packages/database/prisma/README.md) ·
[Optimisation](optimisation.md) si un changement est justifié.
