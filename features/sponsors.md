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

Le statut se gère dans l'onglet Suivi par des commandes métier explicites :
commencer ou reprendre les échanges, activer, terminer ou classer sans suite.
Le statut courant et les dates utiles restent visibles ; aucun état interdit
n'est présenté en grisé. Un modal apparaît seulement pour ouvrir, terminer ou
corriger une période.

Le même onglet contient un fil métier permanent réunissant les notes, les
changements de relation et la réalisation ou réouverture des actions. Une
activation avec ouverture de période n'y produit qu'une seule ligne lisible.
Les actions encore ouvertes forment un résumé compact avec leur échéance et le
contexte de leur note, même si celle-ci est ancienne. Le fil est paginé et ne
dépend pas de la durée de conservation du journal technique.

La première page du fil est chargée uniquement à l'ouverture de l'onglet, puis
les pages précédentes sont demandées par curseur stable. Les notes restent les
éléments principaux ; les événements système sont plus compacts et l'ensemble
est regroupé par jour. Les actions ouvertes sont chargées séparément avec la
première page afin qu'une action attachée à une ancienne note reste visible,
sans répéter cette requête à chaque page suivante.

Les changements de statut, corrections de période, réalisations et
réouvertures créent des événements métier append-only dans la même transaction
que la modification qu'ils décrivent. Une note constitue directement une ligne
du fil et n'est donc pas dupliquée par un second événement. Une note portant une
action ne peut pas être supprimée, ce qui conserve le contexte des événements
de réalisation et de réouverture.

## Concurrence

Ajouter une note ne dépend pas de la version globale de la fiche : deux
administrateurs peuvent donc documenter le dossier sans se bloquer
artificiellement. La réalisation ou la réouverture d'une action utilise la
version propre de cette action, et demander une seconde fois l'état déjà
enregistré est traité comme une opération sans effet. Les changements couplés
de statut, période et événement métier restent atomiques.

## Conservation et sauvegarde

Le fil métier est distinct de `AuditLog` : ses événements et leurs snapshots
d'acteur restent lisibles sans dépendre de la durée de rétention du journal
technique ni de l'existence future du compte utilisateur. Les notes et les
comptes ayant terminé une action possèdent également un snapshot lisible.
Lors de la migration, une fiche déjà existante reçoit un repère système daté de
la migration sans inventer son ancien statut ni une fausse date de création de
la relation.

Le format signé de sauvegarde v7 contient les notes, leurs actions et les
événements du fil dans l'ordre de leurs dépendances. La readiness du module
exige la table `PartnerTimelineEvent`. Aucun worker ni aucune tâche planifiée
n'est nécessaire.

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
