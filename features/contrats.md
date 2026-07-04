# Contrats

## Objectif

Centraliser les contrats importants de la structure sans creer une page isolee de tout le reste.
Les contrats doivent surtout etre lies aux sponsors, membres, documents officiels et operations de tresorerie.

## Ce que la feature doit permettre

- Ajouter un contrat.
- Associer un contrat a un sponsor, un membre, un adherent ou une autre entite.
- Stocker ou lier le fichier PDF du contrat.
- Suivre les dates importantes.
- Suivre le statut du contrat.
- Ajouter des notes internes.
- Prevoir une date de renouvellement.
- Lier un contrat a une ou plusieurs operations de tresorerie.
- Archiver un contrat expire sans le supprimer.

## Donnees a garder

- Titre du contrat.
- Type de contrat.
- Entite liee.
- Date de debut.
- Date de fin.
- Date de signature.
- Statut.
- Montant si applicable.
- Document PDF.
- Responsable interne.
- Rappel de renouvellement.
- Notes internes.

## Types possibles

- Sponsor.
- Joueur.
- Staff.
- Adherent.
- Partenaire.
- Administratif.
- Autre.

## Statuts possibles

- Brouillon.
- En attente de signature.
- Actif.
- En attente de renouvellement.
- Expire.
- Termine.
- Archive.

## Role dans l'organisation UX

Contrats peut etre une sous-partie de documents officiels plutot qu'une grosse page separee dans la sidebar.
Un contrat doit aussi etre visible depuis les fiches liees.

Exemples :

- Un contrat sponsor est visible depuis la fiche sponsor.
- Un contrat membre est visible depuis la fiche membre.
- Un montant de contrat peut etre lie a la tresorerie.
- Une expiration de contrat peut remonter dans le tableau de bord.
- Un rappel de renouvellement peut etre cree dans notifications et rappels.

## Idees d'ecran

- Liste des contrats.
- Fiche contrat.
- Bloc document PDF.
- Bloc dates importantes.
- Bloc entite liee.
- Bloc tresorerie liee.
- Historique des changements.

## Permissions

- Voir les contrats.
- Voir les montants.
- Ajouter un contrat.
- Modifier un contrat.
- Ajouter ou remplacer un PDF.
- Archiver un contrat.

## A clarifier

- Si contrats doit etre une page dans la sidebar ou un onglet dans documents officiels.
- Qui peut voir les contrats sensibles.
- Si la signature doit etre geree dans le site ou seulement stockee apres signature.
