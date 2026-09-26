# Q08 — Notifications, alertes et rappels

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Un destinataire doit-il être informé plus tard, agir ou respecter une échéance ?

## Questions

- Quel événement métier, validé et daté, justifie le message ? À quoi sert-il au destinataire ?
- Qui reçoit : acteur, responsable, membre concerné, équipe, délégataire ? Qui ne doit rien recevoir ?
- Le destinataire a-t-il encore accès à l’objet au moment de l’émission puis de la consultation ?
- Le titre, l’extrait, le compteur ou le lien révèlent-ils un dossier confidentiel ?
- Lecture, archivage, acquittement et résolution métier sont-ils des états distincts ?
- Quelle clé évite un doublon après nouvelle tentative ou concurrence ?
- Faut-il grouper des événements, limiter une cadence ou offrir une préférence ?
- Pour une alerte, qui est responsable et quelle action la résout ? Que faire après son départ ?
- Pour un rappel, quelle date source, quel fuseau, quelle annulation et quelle replanification ?
- Que montre un ancien lien si l’objet est supprimé, déplacé ou devenu inaccessible ?
- Quelle durée de conservation et quelle purge ? Une preuve d’action reste-t-elle ailleurs ?
- Le canal reste-t-il interne ? Un email, Discord ou prestataire a-t-il été explicitement choisi ?
- Une défaillance d’envoi empêche-t-elle la commande métier ou devient-elle un échec à reprendre selon une règle explicite ?

## Décider avant d’ajouter

Définir événement, audience, contenu minimal, gravité, déduplication, canal et
cycle de vie. Une notification n’est pas nécessaire parce qu’une mutation existe.
Ne jamais déclencher l’envoi à chaque affichage de la page.

Événement et notification ne sont pas interchangeables : garder le module source
propriétaire du fait et du statut. Ne promettre une remise ou une lecture ni sur
un simple enregistrement ni sur l’acceptation d’un prestataire.

## Vérifier

Destinataire autorisé/interdit, retrait de droit, doublon, objet absent, changement
d’échéance, fuseau, panne du canal, regroupement et purge. Pour un traitement durable,
consulter la fiche Automatisations.

## Non-applicabilité et réexamen

Non applicable si personne n’a besoin d’être informé plus tard, d’agir ou d’être
rappelé. Conserver cette décision sans créer de modèle, de table ou de canal.

## Références

[Feedback](../../FEEDBACK.md) · [Permissions](permissions.md) ·
[Automatisations](automatisations-integrations.md) si nécessaire.
