> **Module retire le 21 septembre 2026.** La page, ses routes API et ses donnees
> ont ete supprimees. Ce document est conserve comme historique. Pour
> reconstruire le module, utiliser
> `features/pages/bureau-juridique/sponsors-partenaires.md`, qui contient la
> specification complete (systeme de suivi, contacts, champs, API, tests).

# Sponsors & partenaires

Route : `/bureau-juridique/sponsors`
Pole : Bureau & juridique

## Role de la page

Sponsors, contacts, livrables et partenaires.

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

- `/tresorerie/sponsoring-financier` - Sponsoring financier.
- `/bureau-juridique/contrats` - Contrats.
- `/bureau-juridique/personnes-contacts` - Personnes & contacts.
- `/bureau-juridique/incidents-sanctions` - Incidents et sanctions.
- `/bureau-juridique/documents` - Documents & chartes.
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
