# Notifications et rappels

Route : `/vie-interne/notifications-rappels`
Pole : Vie interne

## Role de la page

Rappels transversaux et notifications internes.

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

- `/vie-interne/membres` - Membres.
- `/vie-interne/adherents` - Adherents.
- `/bureau-juridique/personnes-contacts` - Personnes & contacts.
- `/vie-interne/calendrier-interne` - Calendrier interne.

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
