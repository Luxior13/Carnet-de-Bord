# Parametres

Route : `/systeme/parametres`
Pole : Systeme

## Role de la page

Configuration des jeux, statuts, categories et tags.

## Ce qu'il y aura sur la page

- Configuration ou administration globale.
- Liste des elements techniques ou transversaux.
- Historique et impact des modifications.
- Permissions et garde-fous avant action sensible.

## Actions principales

- Configurer une option.
- Verifier les impacts avant validation.
- Consulter le journal associe.
- Exporter ou archiver si necessaire.

## Donnees gerees ici

- Parametres, securite ou donnees transversales.

## Donnees liees en lecture seule

- Journal, validations, roles et modules dependants.

## Liaisons entre pages

- `/administration/utilisateurs` - Utilisateurs & permissions.
- `/systeme/validations` - Validations globales.
- `/systeme/journal-activite` - Journal d'activite.
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
