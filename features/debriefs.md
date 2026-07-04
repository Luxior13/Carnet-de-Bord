# Debriefs

## Objectif

Garder les retours internes apres les moments importants de la structure esport : reunions, matchs, scrims, entrainements, tryouts ou periodes de test.

## Ce que la feature doit permettre

- Creer un debrief.
- Lier un debrief a une reunion.
- Lier un debrief a un match ou scrim public plus tard.
- Lier un debrief a un entrainement.
- Lier un debrief a un tryout ou candidat.
- Mentionner les membres concernes.
- Noter les points positifs.
- Noter les problemes ou axes d'amelioration.
- Ajouter des decisions prises.
- Creer des actions a faire apres le debrief.
- Retrouver l'historique des debriefs.

## Donnees a garder

- Titre.
- Type de debrief.
- Date.
- Element lie.
- Participants ou personnes concernees.
- Resume.
- Points positifs.
- Points a corriger.
- Decisions.
- Actions a faire.
- Auteur.
- Niveau de sensibilite.
- Notes internes.

## Types possibles

- Reunion.
- Match.
- Scrim.
- Entrainement.
- Tryout.
- Saison.
- Membre.
- Autre.

## Role dans l'organisation UX

Debriefs est une feature transversale.
La page peut servir a retrouver tous les debriefs, mais la creation doit surtout etre possible depuis les elements lies.

Exemples :

- Depuis une reunion, ajouter le debrief de la reunion.
- Depuis un match ou scrim importe plus tard, ajouter le debrief prive.
- Depuis un entrainement, ajouter les retours de session.
- Depuis une fiche membre, voir les debriefs ou la personne est mentionnee.
- Depuis le tableau de bord, voir les debriefs a faire ou recents.

## Idees d'ecran

- Liste des debriefs.
- Fiche debrief.
- Formulaire rapide depuis une reunion.
- Bloc decisions.
- Bloc actions a faire.
- Bloc personnes concernees.
- Historique des debriefs lies a un membre.

## Permissions

- Voir les debriefs.
- Voir les debriefs sensibles.
- Ajouter un debrief.
- Modifier un debrief.
- Mentionner un membre.
- Archiver un debrief.

## A clarifier

- Si tous les staffs peuvent voir tous les debriefs.
- Si les joueurs peuvent voir certains debriefs les concernant.
- Si les actions issues d'un debrief doivent creer des taches internes.
