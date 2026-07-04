# Documents & chartes

Route : `/bureau-juridique/documents`
Pole : Bureau & juridique

## Role de la page

Coffre documentaire, chartes et contrats.

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

- `/bureau-juridique/documents-officiels` - Documents officiels.
- `/bureau-juridique/contrats` - Contrats.
- `/bureau-juridique/acceptation-chartes` - Acceptation des chartes.
- `/bureau-juridique/personnes-contacts` - Personnes & contacts.
- `/bureau-juridique/incidents-sanctions` - Incidents et sanctions.
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
