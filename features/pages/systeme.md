# Vue d'ensemble

Route : `/systeme`
Pole : Systeme

## Role de la page

Accueil du pole systeme.

## Ce qu'il y aura sur la page

- Vue d'ensemble du pole avec indicateurs, alertes et raccourcis.
- Liste des elements recents ou importants selon les permissions.
- Acces rapide vers les pages principales du pole.
- Bloc de rappels, validations ou actions attendues.

## Actions principales

- Ouvrir une page specialisee.
- Filtrer les alertes importantes.
- Acceder aux fiches liees.
- Lancer une action rapide si la permission le permet.

## Donnees gerees ici

- Aucune donnee lourde directement, surtout de la synthese.

## Donnees liees en lecture seule

- Donnees agregees des pages du meme pole.
- Alertes, rappels, validations et historique recent.

## Liaisons entre pages

- `/administration/utilisateurs` - Utilisateurs & permissions.
- `/systeme/parametres` - Parametres.
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
