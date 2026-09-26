# Q18 — Optimisation et caches

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Existe-t-il un problème mesuré ou une complexité évitable justifiant une optimisation ?

## Questions

- Quel problème mesuré ou quelle complexité concrète veut-on réduire ?
- Peut-on supprimer un calcul, une requête ou une dépendance avant d’ajouter un mécanisme ?
- L’amélioration traite-t-elle le goulot réel ou seulement une partie facile à modifier ?
- Quel comportement doit rester strictement équivalent : droits, ordre, fraîcheur, effets et erreurs ?
- Un cache a-t-il une clé incluant les bons périmètres, une durée et une invalidation fiables ?
- Une révocation de droit, mutation, suppression ou changement de configuration invalide-t-il le résultat concerné ?
- Un cache partagé peut-il exposer à un compte la réponse destinée à un autre ?
- La mémoïsation ou virtualisation simplifie-t-elle vraiment le travail, sans casser clavier, lecteur d’écran ni recherche ?
- Déplacer un calcul au client expose-t-il des données ou pénalise-t-il un appareil modeste ?
- Préchargement et chargement différé économisent-ils réellement des octets ou déclenchent-ils des requêtes inutiles ?
- Index, dénormalisation ou pré-calcul ont-ils un coût d’écriture, une source de vérité et une procédure de reconstruction ?
- En cas d’échec du mécanisme, quel résultat sûr et quelle observation restent possibles ?
- Le gain justifie-t-il la complexité, la maintenance et le coût d’exploitation ?

## Vérifier

Comparer le même scénario avant/après, puis vérifier résultats et permissions.
Tester cache vide, périmètres différents, invalidation, données supprimées et panne
si ces mécanismes sont introduits. Documenter la stratégie de retour à une solution
plus simple.

L’optimisation n’est pas un quota de travail obligatoire à chaque page. Ne pas
ajouter cache, file, service ou index « pour le long terme » sans justification.

## Trace attendue

Mesure initiale, option simple examinée, solution, gain, contreparties et limite.

## Non-applicabilité et réexamen

Non applicable sans problème de coût ni complexité évitable identifiée. La fiche
Performance peut conclure que l’état actuel est suffisant.

## Références

[Performance](performance.md) · [Architecture](architecture.md) ·
[Permissions](permissions.md) si un résultat est partagé.
