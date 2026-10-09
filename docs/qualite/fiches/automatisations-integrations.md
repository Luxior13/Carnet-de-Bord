# Q23 — Automatisations et intégrations

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Un traitement différé, webhook, prestataire, canal externe ou outil d’IA intervient-il ?

## Questions

- Quel travail a réellement besoin d’être différé, planifié, synchronisé ou confié à un tiers ?
- Une opération bornée dans la requête ou une commande ponctuelle suffit-elle ?
- Quel déclencheur et quelle source de vérité évitent les boucles de synchronisation ?
- Quel identifiant protège du doublon, du rejeu et des événements reçus dans le désordre ?
- Les webhooks sont-ils authentifiés, bornés et validés avant toute mutation ?
- Comment traiter délai, quota, interruption, reprise, échec durable et message inexploitable ?
- L’état visible distingue-t-il demandé, en cours, réussi, partiel et échoué ?
- Les droits sont-ils revérifiés à l’exécution, notamment après départ d’un responsable ?
- Qui observe le traitement, reçoit une alerte utile et peut le relancer ou l’arrêter ?
- Secrets, accès fournisseur et données transmises sont-ils limités, révocables et renouvelables ?
- Quel comportement maintient le site utilisable pendant une panne du prestataire ?
- Un arrêt d’intégration retire-t-il webhooks, planifications, clés et données dérivées ?
- Pour Discord/email, quels canaux et destinataires ont été explicitement choisis ?
- Pour un outil d’IA, quelles données peuvent sortir, quels résultats doivent être vérifiés, et quelle décision reste humaine ?

## Vérifier

Doublon, ordre inversé, signature invalide, panne, timeout, quota, révocation,
redémarrage, suppression de l’objet source et interruption de planification.
Les appels externes de test utilisent sandbox ou simulation adaptée, sans envoi
réel à des personnes non prévu par la tâche.

Ne pas introduire une file permanente uniquement pour anticiper. Si un traitement
durable est nécessaire, documenter stockage d’état, reprise et exploitation ensemble.

## Trace attendue

Contrat du tiers, flux de données, idempotence, erreurs, responsabilité, coût et
procédure de sortie. Un fournisseur indisponible ne doit pas être présenté comme livré.

## Non-applicabilité et réexamen

Non applicable sans traitement automatique ni système externe. Rouvrir lorsque
les limites de la requête synchrone sont réellement atteintes.

## Références

[Exploitation actuelle](../../references/OPERATIONS.md) · [API](api-concurrence.md) ·
[Notifications](notifications.md) · [Confidentialité](confidentialite.md).
