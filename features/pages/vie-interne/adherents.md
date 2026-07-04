# Adherents

Route : `/vie-interne/adherents`
Pole : Vie interne

## Role de la page

Adhesions, statuts et cotisations liees.

## Ce qu'il y aura sur la page

- Liste principale avec recherche, filtres et tri.
- Cartes ou lignes resumant les informations importantes.
- Fiche detaillee accessible depuis chaque ligne.
- Etats archive, actif, a traiter ou sensible selon la page.

## Actions principales

- Creer un element.
- Modifier les informations principales.
- Archiver sans supprimer.
- Ouvrir les donnees liees.

## Donnees gerees ici

- Elements principaux de cette page.

## Donnees liees en lecture seule

- Donnees liees affichees en lecture seule selon les permissions.

## Liaisons entre pages

- `/tresorerie/cotisations-adherents` - Cotisations adherents.
- `/tresorerie/operations` - Operations.
- `/vie-interne/membres` - Membres.
- `/bureau-juridique/personnes-contacts` - Personnes & contacts.
- `/vie-interne/calendrier-interne` - Calendrier interne.
- `/vie-interne/notifications-rappels` - Notifications et rappels.

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
