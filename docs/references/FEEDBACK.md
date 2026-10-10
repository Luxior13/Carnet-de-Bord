# Feedback utilisateur — conception de référence

Ce document fixe les quatre signaux que le site peut envoyer : **toast**,
**notification**, **alerte** et **rappel**. La
[revue générale](../qualite/REVUE_GENERALE.md) permet de déterminer si le changement
concerne un retour utilisateur. Lire ensuite les sections pertinentes : un retour
local peut suffire et aucune notification n'est ajoutée sans besoin identifié.

---

## 1. Les quatre signaux

| Signal | Durée | Persistance | Exemple | Quand |
| --- | --- | --- | --- | --- |
| **Toast** | quelques secondes | non | « Sauvegarde réussie » | après une commande dont le résultat nécessite une confirmation visible |
| **Notification** | jusqu'à lecture ou rétention | oui | « Un compte a été révoqué », « Statut modifié » | un événement durable à consulter |
| **Alerte** | jusqu'à l'action | oui | « Validation en attente », « Document à accepter » | quelqu'un doit agir |
| **Rappel** | jusqu'à l'échéance | oui | « Réunion demain », « Cotisation à renouveler » | une date future approche |

La distinction tient en une phrase : le toast confirme ce que je viens de
faire, la notification m'informe de ce qui s'est passé, l'alerte me demande de
faire quelque chose, le rappel me prévient de ce qui va arriver.

---

## 2. La gravité

Quatre niveaux de conception pour un futur message durable, à recadrer lors de la
reconstruction des notifications. Leur ancien modèle a été retiré ; ils ne
décrivent pas un enum actuellement livré ni les niveaux du journal d’audit :

- `INFO` : information neutre.
- `SUCCESS` : quelque chose a réussi.
- `WARNING` : quelque chose mérite attention, sans danger immédiat.
- `CRITICAL` : une action est attendue, ou la sécurité est en jeu.

La gravité ne remplace jamais une décision serveur : un message `CRITICAL` ne
donne aucun droit supplémentaire.

---

## 3. Comment choisir

À chaque changement, répondre dans cet ordre :

1. L'utilisateur vient-il d'agir ? → choisir le retour utile : changement visible,
   message local ou **toast** si le résultat serait autrement ambigu.
2. Un destinataire a-t-il besoin de retrouver cet événement plus tard ? → envisager
   une **notification**, distincte d'une trace d'audit.
3. Quelqu'un doit-il faire quelque chose ? → une **alerte** avec responsable et issue.
4. Une date approche-t-elle et une anticipation est-elle utile ? → un **rappel**.

Une navigation, une sélection ou un filtre n'exigent pas un toast. Une erreur de
saisie reste liée au champ ; une panne bloquante garde une explication et une
nouvelle tentative dans la page. Les fiches [Toasts](../qualite/fiches/toasts-feedback.md)
et [Notifications](../qualite/fiches/notifications.md) détaillent les contrôles lorsque
ces signaux sont pertinents.

Une action critique n'est jamais confirmée par un simple toast : elle passe par
une confirmation, un audit et, selon le risque, une preuve récente.

---

## 4. Checklist de modification

Avant de terminer une modification, vérifier les points applicables au signal
retenu ; une notification, alerte ou un rappel absent ne doit pas être créé pour
satisfaire cette liste :

- L'action réussie a un retour visible, sans laisser l'utilisateur deviner.
- L'action échouée explique ce qui ne va pas et permet de réessayer.
- Personne ne reçoit un message dont il n'a pas besoin.
- Une notification possède une clé de déduplication et un lien vers l'objet.
- Une alerte possède un propriétaire et une issue possible.
- Un rappel est attaché à une entité et à une date.
- Aucun message ne contient de note interne, de coordonnée ou de valeur
  sensible.
- Le message critique reste accompagné de l'audit qui le justifie.

---

## 5. Ce qui n'arrive jamais

- Un toast qui remplace une confirmation critique.
- Une notification sans déduplication, qui se répète à chaque affichage.
- Une alerte sans action possible, qui condamne l'utilisateur à la voir pour
  rien.
- Un message portant une donnée personnelle ou une note interne.
- Un canal externe non demandé : l'email et Discord restent hors périmètre tant
  qu'un canal n'est pas explicitement choisi.

---

## 6. Où cela vit dans le code

- **Toast** : `sonner`, monté une fois dans le layout.
- **Notification** : le module et ses tables ont été retirés le 9 octobre 2026.
  La boîte personnelle est replanifiée sur la feuille de route ; sa
  spécification reste dans [features/notifications-rappels.md](../../features/notifications-rappels.md).
- **Alertes et rappels** : futurs blocs de « Mon travail » et du calendrier,
  à raccorder à la future boîte personnelle.
- **Notifications de sécurité** : plus émises en attendant la reconstruction du
  module ; les actions sensibles restent tracées dans le journal d'activité.

---

## 7. Liens

- [NAVIGATION.md](NAVIGATION.md) — où vivent les futures notifications et Mon travail.
- [FEUILLE_DE_ROUTE.md](FEUILLE_DE_ROUTE.md) — la reconstruction du module.
