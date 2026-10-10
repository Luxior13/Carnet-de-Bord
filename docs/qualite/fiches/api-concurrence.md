# Q14 — API, intégrité et concurrence

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Une lecture serveur, une mutation, un import ou une commande peut-elle être rejouée ou concurrencée ?

## Questions

- Si une commande touche plusieurs objets, quelles versions doivent être vérifiées ensemble ? Une version de page unique protège-t-elle réellement les objets enfants ?
- Après une écriture réussie, l’échec d’un rafraîchissement ou d’un effet secondaire fait-il annoncer à tort que l’enregistrement a échoué, encourageant une répétition ?

- Quels entrées, sorties, statuts et erreurs composent le contrat public ?
- Le serveur valide-t-il types, bornes, valeurs autorisées et champs inconnus ?
- Les champs retournés sont-ils limités au besoin et au droit du demandeur ?
- Quelles écritures doivent réussir ou échouer ensemble ? L’audit obligatoire est-il dans la même transaction ?
- Deux demandes simultanées peuvent-elles dépasser un quota, doubler un paiement ou écraser une édition ?
- Une version optimiste, une contrainte ou un verrou protège-t-il l’invariant concerné ?
- La clé d’idempotence représente-t-elle une commande précise, son auteur et son périmètre ?
- La même clé avec un contenu différent est-elle refusée plutôt qu’interprétée comme succès ?
- Après timeout, le client sait-il si la commande a été appliquée ? Comment retrouver son résultat ?
- Les autorisations et préconditions sont-elles recontrôlées à l’exécution, pas seulement à l’ouverture du formulaire ?
- Un effet externe peut-il être annulé par une transaction de base ? Sinon, quelle séparation et quelle reprise ?
- Les erreurs ont-elles une forme stable sans fuite de contenu, avec une issue possible ?
- Une opération en lot est-elle atomique ou partielle, avec résultat par élément et bornes explicites ?

## Vérifier

Entrée invalide, accès refusé, conflit, double demande, exécution concurrente, panne
au milieu et nouvelle tentative. Vérifier l’état final en base pour les invariants
sensibles. Tester les anciens consommateurs lorsqu’un contrat partagé change.

Ne pas laisser une promesse détachée garantir un travail métier après la réponse
HTTP. Les effets durables différés nécessitent un mécanisme explicite.

## Trace attendue

Contrat, invariants, frontière transactionnelle, stratégie de concurrence et de
rejeu, résultat attendu en cas d’échec.

## Non-applicabilité et réexamen

Hors impact pour une retouche de présentation sans modification du chargement ni
des commandes. Lecture seule ne signifie pas absence de risque d’exposition ou de charge.

## Références

[Architecture](../../references/FEATURE_ARCHITECTURE.md) · [Permissions](permissions.md) ·
[Automatisations](automatisations-integrations.md) si un effet différé est nécessaire.
