# Journal financier

Route : `/tresorerie/journal-financier`
Pole : Tresorerie

## Role de la page

Historique des actions financieres.

## Ce qu'il y aura sur la page

- Lecture organisee de donnees gerees ailleurs.
- Filtres pour retrouver rapidement un element.
- Liens vers la page source ou la fiche principale.
- Notes de contexte privees si necessaire.

## Actions principales

- Ouvrir la source officielle de la donnee.
- Ajouter un rappel ou une note si autorise.
- Consulter les liaisons sans dupliquer.

## Donnees gerees ici

- Aucune donnee source, ou seulement des notes privees.

## Donnees liees en lecture seule

- Donnees venant du site public ou d autres modules prives.

## Liaisons entre pages

- `/tresorerie/operations` - Operations.
- `/tresorerie/factures-justificatifs` - Factures / justificatifs.
- `/tresorerie/validations-finance` - Validations finance.
- `/systeme/exports-sauvegardes` - Exports / sauvegardes.

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
