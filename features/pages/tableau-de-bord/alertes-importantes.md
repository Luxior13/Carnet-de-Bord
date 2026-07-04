# Alertes importantes

Route : `/tableau-de-bord/alertes-importantes`
Pole : Tableau de bord

## Role de la page

Points importants a traiter rapidement.

## Ce qu'il y aura sur la page

- Tableau de suivi avec statuts.
- Vue detaillee par dossier ou demande.
- Commentaires, pieces jointes et historique.
- Actions de validation ou de cloture.

## Actions principales

- Ajouter une entree.
- Changer le statut.
- Assigner une personne responsable.
- Lier a une fiche personne, document ou operation.

## Donnees gerees ici

- Dossiers, statuts, decisions et historique de traitement.

## Donnees liees en lecture seule

- Personnes, documents, rappels et journal lies.

## Liaisons entre pages

- `/bureau-juridique/incidents-sanctions` - Incidents et sanctions.
- `/tresorerie/validations-finance` - Validations finance.
- `/recherche` - Recherche globale.
- `/tableau-de-bord/mes-taches` - Mes taches.
- `/tableau-de-bord/mes-rappels` - Mes rappels.
- `/systeme/journal-activite` - Journal d'activite.

## Regles UX

- Garder la page lisible en liste puis fiche detaillee.
- Ne pas dupliquer une donnee geree dans un autre module.
- Afficher les donnees sensibles seulement selon les permissions.
- Mettre les actions importantes pres de leur contexte.

## Points a clarifier avant implementation

- Champs exacts a garder.
- Permissions fines de lecture et modification.
- Statuts, filtres et tags utiles.
- Donnees a afficher en lecture seule depuis les autres pages.
