# Remboursements

Route : `/tresorerie/remboursements`
Pole : Tresorerie

## Role de la page

Remboursements membres ou staff.

## Ce qu'il y aura sur la page

- Tableau financier avec montants, dates, statuts et categories.
- Filtres par periode, type, tiers et statut.
- Details des operations et justificatifs lies.
- Synthese des totaux et alertes financieres.

## Actions principales

- Creer ou modifier une operation selon permissions.
- Lier une facture, un sponsor, un adherent ou une personne.
- Demander une validation si action sensible.
- Exporter les donnees autorisees.

## Donnees gerees ici

- Donnees financieres de cette page.

## Donnees liees en lecture seule

- Sponsors, adherents, contrats, factures et journal financier.

## Liaisons entre pages

- `/vie-interne/membres` - Membres.
- `/bureau-juridique/personnes-contacts` - Personnes & contacts.
- `/tresorerie/operations` - Operations.
- `/tresorerie/factures-justificatifs` - Factures / justificatifs.
- `/tresorerie/validations-finance` - Validations finance.
- `/tresorerie/journal-financier` - Journal financier.
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
