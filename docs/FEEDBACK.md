# Feedback utilisateur — conception de référence

Ce document fixe les quatre signaux que le site peut envoyer : **toast**,
**notification**, **alerte** et **rappel**. Il se lit à chaque modification,
qu'il s'agisse d'une nouvelle action, d'une nouvelle page ou d'un changement de
comportement : on ajoute le signal utile, on ne l'oublie pas, et on n'en ajoute
jamais un inutile.

---

## 1. Les quatre signaux

| Signal | Durée | Persistance | Exemple | Quand |
| --- | --- | --- | --- | --- |
| **Toast** | quelques secondes | non | « Sauvegarde réussie », « Email invalide » | après une action immédiate |
| **Notification** | jusqu'à lecture ou rétention | oui | « Un compte a été révoqué », « Statut modifié » | un événement durable à consulter |
| **Alerte** | jusqu'à l'action | oui | « Validation en attente », « Document à accepter » | quelqu'un doit agir |
| **Rappel** | jusqu'à l'échéance | oui | « Réunion demain », « Cotisation à renouveler » | une date future approche |

La distinction tient en une phrase : le toast confirme ce que je viens de
faire, la notification m'informe de ce qui s'est passé, l'alerte me demande de
faire quelque chose, le rappel me prévient de ce qui va arriver.

---

## 2. La gravité

Quatre niveaux, déjà portés par le modèle de données :

- `INFO` : information neutre.
- `SUCCESS` : quelque chose a réussi.
- `WARNING` : quelque chose mérite attention, sans danger immédiat.
- `CRITICAL` : une action est attendue, ou la sécurité est en jeu.

La gravité ne remplace jamais une décision serveur : un message `CRITICAL` ne
donne aucun droit supplémentaire.

---

## 3. Comment choisir

À chaque changement, répondre dans cet ordre :

1. L'utilisateur vient-il d'agir ? → un **toast**.
2. L'événement doit-il rester consultable plus tard ? → une **notification**.
3. Quelqu'un doit-il faire quelque chose ? → une **alerte**.
4. Une date approche-t-elle ? → un **rappel**.

Une action critique n'est jamais confirmée par un simple toast : elle passe par
une confirmation, un audit et, selon le risque, une preuve récente.

---

## 4. Checklist de modification

Avant de terminer une modification, vérifier :

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
- **Notification** : `Notification` et `NotificationRecipient`, avec rétention
  réglable via `notifications.retentionDays`.
- **Alertes et rappels** : futurs blocs de « Mon travail » et du calendrier,
  branchés sur les mêmes modèles.
- **Notifications de sécurité** : déjà émises pour les révocations de session,
  les changements de mot de passe et les réinitialisations de MFA.

---

## 7. Liens

- [NAVIGATION.md](NAVIGATION.md) — où vivent les notifications et Mon travail.
- [ROLES_ET_PERMISSIONS.md](ROLES_ET_PERMISSIONS.md) — qui peut envoyer et lire.
- [PERMISSIONS.md](PERMISSIONS.md) — les permissions `notifications:*`.
