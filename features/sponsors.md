# Sponsors & partenaires

## État

Le module est disponible à l'adresse `/bureau-juridique/partenaires`.

## Objectif

Conserver une fiche canonique par organisation et centraliser ses catégories,
son statut, ses périodes de relation, ses contacts du Répertoire et son suivi
interne.

Une organisation conserve la même fiche lorsqu'une relation se termine puis
reprend plusieurs années plus tard. Chaque reprise crée une nouvelle période ;
les contrats, documents et opérations financières resteront dans leurs
modules respectifs.

## Pages

- Liste paginée avec recherche, filtres et tri.
- Création des informations essentielles.
- Fiche avec les onglets Informations, Contacts, Suivi et Activité.

Le statut se gère dans l'onglet Suivi depuis un menu déroulant compact. Les
transitions simples sont enregistrées directement ; un modal apparaît seulement
pour ouvrir, terminer ou corriger une période. Le même onglet présente les
entrées les plus récentes et un bouton d'ajout ouvrant un modal ; aucun résumé
manuel n'est demandé et la liste des suivis constitue elle-même la chronologie.
Les actions encore ouvertes restent visibles même si leur suivi est ancien ;
les dates et le motif d'une période peuvent être corrigés avec audit.

## Cycle de vie

- Prospect.
- En discussion.
- Actif.
- Terminé.
- Sans suite.

Une fiche vide créée par erreur peut être supprimée. Une véritable relation
terminée reste conservée. Les doublons contenant déjà un historique devront
être fusionnés au lieu d'être supprimés.

## Permissions

- `partners:view`.
- `partners:manage`.
- `partners:delete`.

La consultation ou l'association de l'identité d'un contact exige également
`persons:view`.
