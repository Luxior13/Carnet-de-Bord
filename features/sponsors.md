# Sponsors & partenaires

## État

Le module est disponible à l'adresse `/bureau-juridique/partenaires`.

## Objectif

Conserver une fiche canonique par organisation et centraliser ses catégories,
son statut, ses périodes de relation, ses interlocuteurs du Répertoire et son
suivi
interne.

Une organisation conserve la même fiche lorsqu'une relation se termine puis
reprend plusieurs années plus tard. Chaque reprise crée une nouvelle période ;
les contrats, documents et opérations financières resteront dans leurs
modules respectifs.

## Pages

- Liste paginée avec recherche, filtres et tri.
- Création des informations essentielles.
- Fiche avec les onglets Informations, Contacts, Suivi et Activité.

Le statut se gère dans l'onglet Suivi depuis une barre contenant toujours les
cinq statuts dans le même ordre. Le statut courant est sélectionné et les
transitions disponibles ne changent jamais de place. Lorsqu'une transition
nécessite une étape préalable, son bouton reste visible et l'explique au survol
ou au focus clavier. Les dates utiles restent affichées ; un modal apparaît
seulement pour ouvrir, terminer, corriger une période ou reprendre les
échanges depuis une relation active.

À l'ouverture d'une activation, la date de début est préremplie avec le jour
civil courant en `Europe/Paris`. Lors d'une fin, la date de fin reçoit ce même
jour tandis que la date de début existante reste visible. Ces valeurs demeurent
modifiables et peuvent être effacées lorsqu'une date métier est inconnue.
Depuis « Actif », choisir « En discussion » clôt la période active puis reprend
les échanges dans une seule transaction. La date de fin est préremplie avec le
jour courant et une précision facultative peut expliquer ce retour. Si la
relation reste réellement active pendant une renégociation, son statut reste
« Actif » et la renégociation se documente simplement dans le suivi.

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

L'auteur d'une note peut corriger son texte et, s'il possède aussi l'accès au
Répertoire, son interlocuteur lié pendant les 30 minutes qui suivent sa
création.
Le serveur calcule et revérifie ce délai depuis la date de création. Une note
est verrouillée définitivement dès que son action a été terminée une première
fois, même si l'action est ensuite rouverte. Une fois la note verrouillée ou le
délai expiré, la correction se documente par une nouvelle note afin de garder
un suivi compréhensible.

## Contacts

L'onglet Contacts réunit deux informations distinctes sans les mélanger :

- les coordonnées générales propres à l'organisation ;
- les interlocuteurs issus du Répertoire.

Les coordonnées générales regroupent les emails et téléphones du standard, de
la facturation, des partenariats ou d'un autre service générique. Chaque
coordonnée possède un libellé court et un seul email et téléphone peuvent être
principaux. Leur ajout, leur correction, leur changement de priorité et leur
suppression reposent sur des mutations granulaires : modifier une coordonnée ne
réécrit ni les autres coordonnées ni les informations générales de la fiche.
Une adresse ou un numéro personnel doit rester dans le Répertoire et ne doit
pas être saisi comme coordonnée générale.

Les interlocuteurs sont séparés entre liaisons actives et historique. L'ajout
passe par un modal de recherche du Répertoire, puis permet de renseigner un
rôle libre avec suggestions, une date de début facultative et l'interlocuteur
principal. Un email et un téléphone préférés peuvent être choisis parmi ceux de
la fiche source. La liaison ne conserve que `selectedEmailId` et
`selectedPhoneId` : les valeurs, noms, pseudos et libellés des coordonnées ne
sont jamais recopiés. Une correction dans le Répertoire est donc visible
immédiatement partout. Modifier la fiche source reste une action séparée,
protégée par `persons:update`.

Terminer une liaison propose le jour civil courant en `Europe/Paris`, tout en
autorisant une date inconnue. La liaison clôturée reste visible dans « Anciens
interlocuteurs » et ne peut plus redevenir active. Relier ultérieurement la même
personne crée toujours une nouvelle ligne : l'ancienne date de fin n'est jamais
effacée. La suppression d'un email ou d'un téléphone sélectionné remet sa
référence à `null` sans supprimer la liaison. La suppression définitive d'une
fiche du Répertoire clôt toutes ses liaisons, retire leur statut principal,
efface les références de coordonnées et les représente uniquement sous une
forme anonymisée, sans ancienne identité ni coordonnée.

Une organisation peut avoir au maximum 30 interlocuteurs actifs. Cette limite est
contrôlée sous verrou côté serveur et n'impose aucune limite à l'historique.
La base garantit également qu'une même personne ne possède pas deux liaisons
actives simultanées avec la même organisation.

`partners:view` permet de consulter les coordonnées générales.
`partners:manage` permet de les gérer. Afficher un interlocuteur et ses
coordonnées choisies exige en plus `persons:view` ; le rechercher, le lier ou
modifier sa liaison exige `partners:manage` et `persons:view`. Aucune permission
supplémentaire n'est créée pour l'onglet.

Le journal technique décrit séparément l'ajout, la modification ou la
suppression d'une coordonnée générale et les changements de liaison. Il ne
reçoit que des identifiants opaques, le type d'opération et les champs modifiés,
jamais une adresse, un numéro, un nom, un pseudo ou le libellé libre d'un
interlocuteur. Les toasts et notifications suivent la même règle.

## Concurrence

Ajouter une note ne dépend pas de la version globale de la fiche : deux
administrateurs peuvent donc documenter le dossier sans se bloquer
artificiellement. La réalisation ou la réouverture d'une action utilise la
version propre de cette action, et demander une seconde fois l'état déjà
enregistré est traité comme une opération sans effet. Les changements couplés
de statut, période et événement métier restent atomiques. Corriger une note
utilise sa propre version optimiste : deux formulaires ouverts sur la même note
ne peuvent pas s'écraser silencieusement. Une liaison d'interlocuteur possède elle
aussi sa propre version en plus de celle de la fiche : une suppression de la
personne ou une modification concurrente ne peut donc pas être écrasée par un
ancien formulaire. Une coordonnée générale possède également sa propre version
et ses mutations dédiées ne remplacent jamais toute la collection.

## Conservation et sauvegarde

Le fil métier est distinct de `AuditLog` : ses événements et leurs snapshots
d'acteur restent lisibles sans dépendre de la durée de rétention du journal
technique ni de l'existence future du compte utilisateur. Les notes et les
comptes ayant terminé une action possèdent également un snapshot lisible.
Un trigger PostgreSQL interdit toute suppression directe d'un événement tant
que sa fiche existe ; les événements ne disparaissent physiquement que par la
cascade déclenchée lors de la suppression réelle de leur fiche propriétaire.
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

La consultation ou l'association de l'identité d'un interlocuteur exige
également
`persons:view`. Choisir une coordonnée existante ne la modifie pas ; toute
mutation de la fiche du Répertoire exige toujours `persons:update`. Les
coordonnées générales de l'organisation restent gouvernées uniquement par
`partners:view` et `partners:manage`.
