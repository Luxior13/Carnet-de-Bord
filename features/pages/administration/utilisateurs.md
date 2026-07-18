# Utilisateurs

Route : `/administration/utilisateurs`
Pôle : Système

## Role de la page

Comptes, rôles et autorisations administratives.

## Ce qu'il y aura sur la page

- Configuration ou administration globale.
- Liste des elements techniques ou transversaux.
- Historique et impact des modifications.
- Autorisations et garde-fous avant action sensible.

## Actions principales

- Configurer une option.
- Verifier les impacts avant validation.
- Consulter le journal associe.
- Desactiver, reactiver ou supprimer un compte selon les autorisations.

## Donnees gerees ici

- Parametres, securite ou donnees transversales.

## Donnees liees en lecture seule

- Journal, validations, roles et modules dependants.

## Liaisons entre pages

- `/systeme/parametres` - Parametres.
- `/systeme/validations` - Validations globales.
- `/systeme/journal-activite` - Journal d'activite.
- `/systeme/exports-sauvegardes` - Exports / sauvegardes.

## Regles UX

- Garder la page lisible en liste puis fiche detaillee.
- Ne pas dupliquer une donnee geree dans un autre module.
- Afficher les données sensibles seulement selon les autorisations.
- Mettre les actions importantes pres de leur contexte.

## Points a clarifier avant implementation

- Champs exacts a garder.
- Autorisations fines de consultation et de modification.
- Statuts, filtres et tags utiles.
- Donnees a afficher en lecture seule depuis les autres pages.
