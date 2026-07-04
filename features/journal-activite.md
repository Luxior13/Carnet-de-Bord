# Journal d'activite

## Objectif

Garder une trace des actions importantes faites sur la plateforme privee, surtout sur les donnees sensibles comme la tresorerie, les contrats, les membres, les sanctions et les documents.

## Ce que la feature doit permettre

- Enregistrer automatiquement les actions importantes.
- Savoir qui a fait une action.
- Savoir quand l'action a ete faite.
- Savoir quelle donnee a ete concernee.
- Voir l'historique global pour les admins.
- Voir un historique local dans les fiches liees.
- Filtrer par utilisateur, module, type d'action ou date.
- Aider a comprendre une erreur ou un changement.
- Garder une trace des validations importantes.

## Actions a tracer

- Ajout d'une operation de tresorerie.
- Modification d'une operation de tresorerie.
- Ajout ou modification d'un sponsor.
- Changement de statut d'un contrat.
- Ajout ou modification d'une sanction.
- Archivage d'un membre.
- Modification d'une charte ou document officiel.
- Export de donnees sensibles.
- Validation ou refus d'une action sensible.
- Changement de permissions.

## Donnees a garder

- Utilisateur auteur.
- Type d'action.
- Module concerne.
- Entite concernee.
- Date et heure.
- Ancienne valeur si utile.
- Nouvelle valeur si utile.
- Message ou raison.
- Adresse IP si necessaire.
- Niveau de sensibilite.

## Role dans l'organisation UX

Le journal d'activite est une feature transversale.
Il peut exister comme page admin globale, mais il doit aussi apparaitre en historique local dans les fiches importantes.

Exemples :

- Fiche sponsor : historique des modifications du sponsor.
- Fiche membre : historique des notes, sanctions ou documents lies.
- Tresorerie : historique des operations financieres.
- Contrats : historique des statuts et signatures.
- Documents : historique des versions et exports.

## Idees d'ecran

- Page admin journal global.
- Filtres par module.
- Filtres par utilisateur.
- Filtres par date.
- Historique local dans une fiche.
- Detail d'une action.

## Permissions

- Voir le journal global.
- Voir l'historique local d'une fiche.
- Voir les actions sensibles.
- Exporter le journal si autorise.

## A clarifier

- Combien de temps garder les logs.
- Quelles actions doivent obligatoirement etre tracees.
- Si les anciennes valeurs sensibles doivent etre stockees ou masquees.
