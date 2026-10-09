# Q07 — Toasts et retours immédiats

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Faut-il expliquer le résultat d’une action ou un échec ? Un retour local suffit-il ?

## Questions

- Après l’action, l’utilisateur sait-il ce qui s’est réellement passé ?
- Le résultat est-il déjà visible dans la page, le bouton, le compteur ou l’état sauvegardé ?
- Un message local persistant serait-il plus utile qu’un toast qui disparaît ?
- L’erreur concerne-t-elle un champ, une commande entière ou une indisponibilité générale ?
- Faut-il conserver une action « Réessayer », un lien ou une explication au-delà de quelques secondes ?
- Le message distingue-t-il réussite, traitement accepté/en cours, échec et résultat partiel ?
- Le vocabulaire décrit-il une conséquence métier compréhensible, sans code technique ni donnée confidentielle ?
- Le même succès est-il annoncé deux fois par la page et une couche réseau partagée ?
- La répétition d’une action crée-t-elle une pile de messages ou des annonces vocales gênantes ?
- Une option d’annulation est-elle réellement disponible côté serveur, dans la durée annoncée ?
- Un toast peut-il masquer une commande ou disparaître avant qu’une personne puisse le lire ?

## Choisir

Un changement de filtre, une navigation ou une sélection n’exigent pas un toast.
Une erreur de champ reste près du champ. Une panne bloquante reste visible avec
une issue. Une commande peut recevoir un toast unique si le résultat serait
sinon ambigu. La durée et la gravité correspondent au message, pas à une habitude.

Le toast n’est ni une confirmation avant action critique, ni une trace d’audit,
ni une notification durable à un tiers.

## Vérifier et consigner

Tester succès, refus, panne, nouvelle tentative et répétition. Contrôler annonce
accessible, absence de doublon et conservation du message indispensable.
Consigner emplacement, texte, déclencheur et raison d’utiliser ou non un toast.

## Non-applicabilité et réexamen

Pas de toast à ajouter sans besoin de retour immédiat. Revoir la décision si
l’action devient asynchrone, partielle ou difficile à constater dans la page.

## Références

[Politique de feedback](../../references/FEEDBACK.md) · [Notifications](notifications.md)
uniquement si un événement durable doit être communiqué.
