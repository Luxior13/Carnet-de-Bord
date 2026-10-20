# Questions pour concevoir et revoir une page

Cette grille sert à concevoir une page, reprendre une section ou examiner un
parcours en profondeur. Partir des tâches de l’utilisateur, décider de la
composition, puis examiner chaque élément et ses comportements. La structure
existante fait partie de ce qui peut être remis en question ; une réécriture
complète reste une option valable.

Les questions s’adressent à la personne ou à l’agent qui réalise le travail.
Chercher les réponses dans les décisions déjà prises, les références, le code,
les données autorisées et le rendu. Solliciter le propriétaire seulement pour
une information ou une décision nécessaire qui reste réellement indéterminée.

La [référence générale](../REFERENCE_GENERALE.md) reste le point d’entrée,
le [système de design](../design/README.md) porte les règles visuelles,
et la [fiche de page](../pages/README.md) conserve les réponses durables.
Cette grille organise les questions ; elle ne duplique pas les règles métier.

## Utiliser la grille

1. **Cadrer.** Identifier la page, les sections, les utilisateurs, la tâche et
   les dépendances. Lire la fiche et retrouver les décisions applicables.
2. **Inventorier.** Recenser les zones et familles d’éléments, y compris les
   contenus masqués, fenêtres, menus, états et variantes selon les droits.
3. **Recomposer.** Décrire l’organisation que l’on choisirait en partant des
   usages, puis comparer avec l’existant et les alternatives utiles.
4. **Approfondir.** Appliquer les questions à chaque élément concerné ; examiner
   ce qu’il faut conserver, déplacer, fusionner, remplacer, retirer ou ajouter.
5. **Vérifier.** Exercer les parcours et limites pertinents, puis consigner les
   décisions, preuves et points restant ouverts dans leurs documents propriétaires.

Pour une création, une refonte ou une revue complète, parcourir toutes les
rubriques pour déterminer leur pertinence, puis approfondir chacune de celles
qui s’appliquent. Pour une retouche ciblée, suivre les éléments modifiés et
leurs effets indirects. Une question sans réponse reste **à clarifier** ; elle
ne devient pas « non applicable » par défaut.

L’inventaire doit rendre la couverture visible. Une série de questions cochées
ne prouve pas un parcours. La lecture, le rendu, une simulation et une écriture
réelle sont des preuves différentes. Les données locales ne sont pas jetables
par défaut : les essais qui écrivent visent une base isolée
([consignes](../../AGENTS.md)).

La grille s’utilise comme référence commune : ne pas recopier toutes ses
questions dans chaque fiche, ni créer une fonctionnalité pour remplir une rubrique.

## Sommaire

| Travail | Questions |
| --- | --- |
| Comprendre | [1 Usages](#1-usages-et-réussite), [2 Parcours](#2-parcours-et-contexte), [3 Inventaire](#3-inventaire-complet-de-la-surface), [4 Données](#4-sens-et-fiabilité-des-données), [5 Accès](#5-droits-et-lecture-seule) |
| Composer | [6 Organisation](#6-conception-de-la-page), [7 Bandeau](#7-bandeau-et-identité), [8 Sections](#8-sections-colonnes-et-densité), [9 Lisibilité](#9-typographie-couleurs-et-repères), [10 Textes](#10-libellés-et-aide) |
| Choisir les éléments | [11 Actions](#11-boutons-et-actions), [12 Listes](#12-listes-recherche-et-comparaison), [13 Formulaires](#13-formulaires-et-validation), [14 Valeurs particulières](#14-dates-nombres-montants-et-liens), [15 Sélections](#15-sélections-et-relations), [16 Composants à envisager](#16-composants-à-envisager) |
| Définir le comportement | [17 Navigation](#17-navigation-et-sections), [18 Fenêtres](#18-fenêtres-menus-et-panneaux), [19 Sauvegarde](#19-brouillons-et-sauvegarde), [20 Attente et erreurs](#20-attente-erreurs-et-reprise), [21 États limites](#21-états-vides-et-cas-limites) |
| Examiner les contraintes | [22 Mobile](#22-mobile-et-espace-disponible), [23 Accessibilité](#23-clavier-et-accessibilité), [24 Fichiers](#24-documents-imports-et-exports), [25 Effets indirects](#25-effets-indirects), [26 Architecture](#26-performance-et-composants-partagés) |
| Terminer | [27 Vérifications](#27-vérifications-et-preuves), [28 Trace de la revue](#28-décisions-et-continuité) |

## 1 Usages et réussite

- Qui utilise cette page et avec quelle responsabilité : membre, responsable, administrateur, compte racine ?
- Quelle tâche doit pouvoir être terminée ici, formulée avec un verbe et un résultat concret ?
- Quelle est la tâche principale ? Quelles tâches secondaires l’accompagnent réellement ?
- Que veut savoir l’utilisateur avant d’agir ? Que connaît-il déjà en arrivant ?
- S’agit-il surtout de consulter, comparer, rechercher, saisir, organiser, décider ou vérifier ?
- L’usage est-il fréquent, occasionnel, urgent, réalisé seul ou en coordination avec d’autres personnes ?
- Quelles erreurs coûtent du temps, altèrent une donnée ou produisent un effet durable ?
- Quels irritants sont observés dans le code ou le parcours ? Lesquels sont encore des hypothèses ?
- Quel résultat observable permettra de dire que la reprise améliore l’usage ?
- Quelles décisions déjà données, règles métier et contraintes doivent continuer à s’appliquer ?

## 2 Parcours et contexte

- D’où arrive-t-on : liste filtrée, recherche rapide, lien direct, autre section, Mon compte ?
- Quelle information de contexte doit suivre l’utilisateur jusqu’ici ?
- Quelle première action est probable ? Est-elle immédiatement repérable ?
- Quelles étapes doit-on réaliser avant la tâche principale, et pourquoi ?
- L’ordre de lecture suit-il l’ordre de décision et de saisie ?
- Quelles informations faut-il rapprocher pour éviter de mémoriser une valeur entre deux écrans ?
- Quels allers-retours sont nécessaires ? Lesquels pourraient disparaître en regroupant des éléments ?
- Où va-t-on après réussite, annulation ou refus ? Le retour conserve-t-il un contexte utile ?
- Le parcours fonctionne-t-il pour une première utilisation et pour quelqu’un qui connaît déjà la page ?
- Une action relève-t-elle d’une autre fiche, d’un autre rôle ou d’un autre moment du parcours ?

## 3 Inventaire complet de la surface

- Quelles routes, créations, éditions, sections et variantes appartiennent au périmètre travaillé ?
- Quels fichiers construisent le cadre, le bandeau, les sections, les actions et le chargement ?
- Quels composants sont locaux, partagés, rendus dans un portail ou chargés seulement après interaction ?
- Quels éléments sont sous la ligne de flottaison, derrière un menu, un popover, une section ou une fenêtre ?
- Quels éléments apparaissent seulement avec une sélection, un brouillon, une erreur ou un certain droit ?
- Quelles variantes dépendent du rôle, du compte racine, de l’état de l’entité, de ses relations ou du volume ?
- Quels outils existent au survol, au clic secondaire, au clavier ou au toucher ? Restent-ils découvrables ?
- Quels états du serveur, preuves récentes ou données liées modifient ce qui est affiché ?
- A-t-on examiné le composant rendu et ses données, au-delà du seul fichier de route ?
- Les familles répétées sont-elles couvertes avec leurs variantes significatives et leurs cas exceptionnels ?

### Questions à répéter pour chaque élément

| Angle | Questions |
| --- | --- |
| Utilité | Quelle tâche sert-il ? Que perd-on en le retirant ? Est-il au bon endroit ? |
| Information | Quelle donnée montre-t-il, d’où vient-elle, dans quel périmètre et avec quelle fraîcheur ? |
| Contrôle | Pourquoi ce bouton, champ, lien, liste ou badge ? Une autre forme serait-elle plus directe ? |
| Hiérarchie | Est-il plus visible que son importance réelle ? Est-il noyé parmi des éléments secondaires ? |
| Compréhension | Son libellé et sa valeur suffisent-ils à comprendre son rôle, sa portée et son effet ? |
| Interaction | Que se passe-t-il au clic, à Entrée, à Échap, à Tab, au toucher et au retour navigateur ? |
| État | Que devient-il vide, actif, sélectionné, invalide, désactivé, en attente, en conflit ou en lecture seule ? |
| Accessibilité | Quel nom est annoncé ? Où est le focus ? L’information existe-t-elle sans couleur ni survol ? |
| Adaptation | Que devient-il avec un texte long, une fenêtre étroite, peu de hauteur ou un zoom important ? |
| Effets | Quelle donnée ou autre surface peut changer ? Quelles protections et reprises s’appliquent ? |
| Décision | Faut-il le conserver, déplacer, fusionner, remplacer, retirer ou compléter ? Pour quel gain concret ? |
| Preuve | Quel contrôle établit son comportement ? Que reste-t-il à vérifier ? |

## 4 Sens et fiabilité des données

- Chaque valeur correspond-elle à ce que son libellé annonce ?
- Distingue-t-on zéro, absence, inconnu, masqué, non applicable, non chargé et valeur calculée ?
- Les valeurs affichées viennent-elles d’une source enregistrée, d’un brouillon ou d’un calcul ?
- Un total porte-t-il sur tous les éléments autorisés, les filtres actifs ou seulement les lignes chargées ?
- Les unités, périodes et fuseaux nécessaires à l’interprétation sont-ils visibles ?
- L’ordre affiché est-il un rang métier, un ordre manuel, une date ou une position de liste ?
- Plusieurs éléments montrent-ils la même donnée avec des valeurs ou des règles différentes ?
- Que devient une relation supprimée, archivée, renommée, désactivée ou devenue inaccessible ?
- Les données anciennes et incomplètes restent-elles consultables sans être réinterprétées arbitrairement ?
- Un compteur cliquable ouvre-t-il exactement le sous-ensemble annoncé ?
- Les modifications d’une autre personne et les réponses tardives peuvent-elles rendre l’affichage périmé ?

Références : [schéma Prisma](../references/schema-prisma.md),
[API et concurrence](../references/api-concurrence.md), domaine du module depuis
l’[index des domaines](../domaines/README.md).

## 5 Droits et lecture seule

- Qui peut consulter, créer, modifier, archiver, supprimer ou déléguer ?
- Les droits sont-ils identiques sur l’entité, les données liées et les différentes actions ?
- L’interface reflète-t-elle les droits calculés par le serveur, y compris le compte racine protégé ?
- Une donnée interdite est-elle également absente de la réponse, des compteurs et des suggestions ?
- L’accès direct à une route ou une commande est-il contrôlé, indépendamment du bouton visible ?
- Faut-il masquer une action indisponible ou l’expliquer par un état désactivé accessible ?
- La lecture seule conserve-t-elle recherche, filtres, navigation, copie et consultation des détails autorisés ?
- Une preuve récente (mot de passe, MFA) est-elle demandée au bon moment, avec une reprise claire ?
- Que voit-on si la permission change pendant la saisie ou si la session expire ?
- Une protection ou une responsabilité particulière est-elle expliquée près de l’action concernée ?

Références : [permissions](../references/permissions.md), [domaine Permissions](../domaines/permissions.md),
[confidentialité](../references/confidentialite.md).

## 6 Conception de la page

- Si cette page n’existait pas, quelle composition choisirait-on pour la tâche principale ?
- Quelles sont les trois informations ou actions à comprendre en premier ?
- Quel [gabarit](../design/gabarits.md) sert le mieux l’usage : liste, fiche, création, réglages, lecture ?
- Faut-il une surface continue, plusieurs sections, une comparaison en colonnes ou une progression par étapes ?
- Quelles informations doivent rester ensemble pour être comprises ou modifiées correctement ?
- Quelles cartes, bordures, titres et compteurs répètent une structure déjà visible ?
- Que peut-on simplifier, fusionner ou retirer avant d’ajouter un composant ?
- Quelles actions essentielles sont cachées, éloignées ou visuellement secondaires ?
- La composition tient-elle avec un seul élément comme avec beaucoup de contenu ?
- Quelles alternatives utiles ont été comparées, et pourquoi la solution retenue sert-elle mieux l’usage ?
- Quelle partie de l’existant est conservée pour une raison d’usage démontrable ?

Référence : [partir des tâches](../design/principes.md#partir-des-tâches).

## 7 Bandeau et identité

- Comprend-on immédiatement quelle entité et quelle partie de sa gestion sont ouvertes ?
- Le titre identifie-t-il l’objet sans répéter inutilement le fil d’Ariane ?
- Un avatar ou pictogramme apporte-t-il une reconnaissance utile ?
- Le titre long, l’avatar absent et une identité incomplète restent-ils lisibles ?
- La description situe-t-elle la tâche avec une phrase utile ?
- Quelles métadonnées doivent être visibles avant d’agir : rôle, statut, accès, dernière modification ?
- Quels compteurs aident réellement à décider ? Lesquels répètent la liste ou la synthèse ?
- L’action principale de la page doit-elle être dans le bandeau ou près de son contenu ?
- Le retour vers la liste ramène-t-il au bon contexte ?
- Le bandeau conserve-t-il une hauteur raisonnable sur mobile et dans une fenêtre basse ?

## 8 Sections colonnes et densité

- Les sections correspondent-elles à des sujets ou tâches distincts ?
- Les titres décrivent-ils leur contenu plutôt qu’une catégorie technique ?
- Une séparation visuelle suffit-elle à la place d’une nouvelle carte ou d’un nouvel en-tête ?
- Les niveaux d’emboîtement respectent-ils les [règles fondatrices](../design/principes.md#règles-fondatrices) ?
- Un état ou un compteur utile peut-il vivre dans le bandeau ou dans sa section plutôt que dans une carte de synthèse ?
- Les colonnes rapprochent-elles des éléments à comparer ou produisent-elles un ordre de lecture confus ?
- Les espacements expriment-ils les regroupements, avec davantage d’espace entre sujets qu’entre éléments liés ?
- Les alignements, largeurs de champs et hauteurs de lignes restent-ils cohérents ?
- Une barre collante apporte-t-elle un accès utile sans masquer le contenu ni le focus ?
- La page comporte-t-elle des zones vides causées par sa structure plutôt que par un besoin de respiration ?

## 9 Typographie couleurs et repères

- La hiérarchie titre, sous-titre, label, valeur, aide et métadonnée est-elle évidente ?
- La police, les graisses, rayons et dimensions suivent-ils la [variante autorisée](../design/fondations.md#variantes-autorisées) de chaque rôle ?
- Les données importantes ressortent-elles avant les explications secondaires ?
- Les champs sont-ils identifiables au repos, sans devoir les survoler ?
- Les couleurs expriment-elles un état, une action, un accès ou un pôle stable ?
- Deux couleurs proches portent-elles des sens différents qu’il faut expliciter par du texte ?
- Le contraste reste-t-il lisible dans les états secondaires, désactivés, sélectionnés et en erreur ?
- Les icônes sont-elles cohérentes en sens, taille et alignement ? Ont-elles besoin d’un libellé ?
- Les badges apportent-ils une information distincte et restent-ils compréhensibles sans leur couleur ?
- Les marges, portails, portée indigo et chargements utilisent-ils les styles attendus ?
- Les noms longs et nombres volumineux restent-ils accessibles sans dépendre d’une infobulle ?
- Les survols et animations gardent-ils les éléments stables et respectent-ils la réduction des mouvements ?

## 10 Libellés et aide

- Les mots correspondent-ils au vocabulaire de l’utilisateur et aux règles du domaine ?
- Une même notion porte-t-elle le même nom dans les menus, formulaires, messages et pages liées ?
- Les intitulés « Tous », « Actifs », « Résultats » ou « Total » ont-ils une portée précise ?
- Le bouton annonce-t-il son effet : ajouter, enregistrer, révoquer, réinitialiser ou supprimer ?
- Les actions « Annuler », « Fermer », « Retour » et « Réinitialiser » ont-elles des effets distincts et explicites ?
- Le label subsiste-t-il lorsque le champ est rempli ? Le placeholder reste-t-il un exemple ?
- Une aide est-elle nécessaire avant la saisie, au moment d’une erreur ou seulement à la demande ?
- Une information essentielle est-elle cachée derrière une icône, un survol ou un message éphémère ?
- Les accords, pluriels, accents, nombres et exemples français sont-ils corrects ?
- Les messages indiquent-ils une action utile sans exposer des détails internes ou des secrets ?

## 11 Boutons et actions

- Quelle action est principale pour chaque zone ? Sa place et son poids visuel le montrent-ils ?
- Les actions secondaires restent-elles disponibles sans concurrencer cette action ?
- Une commande navigue-t-elle ou modifie-t-elle une donnée ? Le composant choisi reflète-t-il cette différence ?
- Une action porte-t-elle sur la page, une section, une ligne ou une sélection ?
- Les actions fréquentes sont-elles accessibles directement ? Un menu convient-il aux actions occasionnelles ?
- Deux boutons réalisent-ils la même opération sans aider un parcours différent ?
- Un bouton indisponible explique-t-il ce qui manque pour continuer ?
- Les actions destructrices sont-elles distinctes, avec la bonne cible et les conséquences connues ?
- La confirmation protège-t-elle un risque réel ? Une action courante et réversible est-elle inutilement ralentie ?
- Double clic, Entrée, touche Espace ou clic répété produisent-ils une seule opération attendue ?
- Le bouton conserve-t-il sa place, son nom et un état d’attente compréhensible pendant le traitement ?

## 12 Listes recherche et comparaison

- Que doit-on reconnaître ou comparer d’une ligne à l’autre ?
- Les colonnes visibles contiennent-elles les données utiles à cette comparaison, selon les droits ?
- Un tableau, une liste ou des cartes présentent-ils mieux le contenu réel et ses variations ?
- La ligne entière doit-elle être un lien ? Les actions internes évitent-elles les interactions imbriquées ?
- L’ordre par défaut correspond-il à la priorité d’usage ? Le départage est-il stable ?
- Une date ou un nombre est-il trié sur sa valeur réelle plutôt que sur son texte formaté ?
- Que recherche-t-on exactement : nom, pseudo, identifiant, email, téléphone, réseau ?
- Casse, accents, mots combinés, espaces et caractères spéciaux sont-ils traités comme annoncé ?
- Les filtres sont-ils utiles, combinables et compréhensibles ?
- Voit-on les filtres actifs et peut-on retirer un filtre ou tout réinitialiser facilement ?
- Les compteurs suivent-ils la recherche et les filtres attendus, avec une portée explicite ?
- Une recherche lente ou ancienne peut-elle remplacer les résultats d’une recherche plus récente ?
- Le choix entre curseur, pages numérotées ou autre chargement suit-il le volume et la tâche ?
- Après ajout, suppression, filtrage ou pagination, où vont sélection, défilement et focus ?
- Après retour d’une fiche, quels filtres, pages et positions sont restaurés ?
- Un résultat vide permet-il de distinguer absence de données, filtres trop précis et absence d’accès ?

Référence : [listes et recherche](../references/listes-recherche.md),
[comportements](../design/comportements.md#listes-recherche-et-pagination).

## 13 Formulaires et validation

- Quels champs sont nécessaires à la tâche et lesquels peuvent être retirés ou calculés ?
- L’ordre des champs suit-il celui des informations disponibles pour l’utilisateur ?
- Les groupes de champs correspondent-ils au sens métier et au périmètre de sauvegarde ?
- Chaque contrôle possède-t-il un label, un état obligatoire exact et une aide seulement si nécessaire ?
- Le type de contrôle correspond-il à la donnée : texte, nombre, liste, date, choix exclusif ou multiple ?
- Les valeurs par défaut sont-elles justifiées, explicites et différentes d’une information réellement saisie ?
- Les champs calculés, hérités, verrouillés ou modifiables sont-ils distingués ?
- Les bornes, formats, longueurs et normalisations proviennent-ils du contrat métier actuel (schéma Zod partagé) ?
- Coller une valeur ou saisir avec un clavier mobile fonctionne-t-il, sans autocomplétion ?
- Les erreurs apparaissent-elles au moment utile et restent-elles associées à leur champ ?
- Peut-on comprendre et rejoindre le premier champ invalide, y compris dans une section fermée ?
- Une donnée masquée ou inaccessible est-elle préservée lors d’une mise à jour partielle ?
- Le formulaire reste-t-il utilisable avec plusieurs erreurs, une très longue valeur ou des valeurs anciennes ?
- La touche Entrée soumet-elle le bon formulaire sans déclencher une commande annexe ?

Référence : [formulaires et actions](../references/formulaires-actions.md).

## 14 Dates nombres montants et liens

- S’agit-il d’une date civile, d’un instant, d’un horaire local, d’une durée ou d’une période ?
- Quel fuseau sert à saisir, afficher, comparer et filtrer ? Est-il explicite quand nécessaire ?
- Peut-on saisir, choisir, effacer et corriger une date sans ambiguïté ?
- Les bornes début/fin et les dates inconnues ou partielles sont-elles traitées selon le domaine ?
- Zéro est-il une valeur valide ? Distingue-t-on zéro et champ vide à l’affichage comme à la sauvegarde ?
- Les entiers, décimales, signes, séparateurs français et arrondis sont-ils correctement gérés ?
- Des boutons de progression ont-ils un pas métier défini ? La saisie directe reste-t-elle disponible si utile ?
- Une valeur a-t-elle une unité, une borne ou une devise qui doit rester visible près du champ ?
- Un rang, un identifiant, une durée et une quantité utilisent-ils chacun le contrôle et le format appropriés ?
- Les URL acceptées, liens externes et protocoles suivent-ils les validations existantes ?
- Un lien absent, invalide ou devenu inaccessible possède-t-il un état compréhensible ?

Références : [dates et localisation](../references/temps-localisation.md),
[finances et contrats](../references/finance-contrats.md).

## 15 Sélections et relations

- Le choix est-il exclusif, multiple, ordonné ou hiérarchique ?
- Combien d’options sont plausibles aujourd’hui et à terme ?
- Un petit groupe de boutons suffit-il, ou faut-il un sélecteur avec recherche ?
- Les options permettent-elles de différencier des entités qui ont le même nom ?
- L’utilisateur choisit-il une entité liée ou saisit-il un texte libre ? La différence est-elle visible ?
- Faut-il autoriser une création depuis ce choix, et dispose-t-on déjà du droit et du parcours nécessaires ?
- L’état actuel reste-t-il visible si l’option devient inactive, historique ou absente du catalogue courant ?
- Le changement d’un parent rend-il les choix enfants incohérents ? Comment cette situation est-elle expliquée ?
- La navigation dans les options, leur sélection et leur effacement fonctionnent-ils au clavier et au toucher ?
- Le menu se place-t-il sans masquer le champ, sortir de l’écran ou devenir impossible à faire défiler ?

## 16 Composants à envisager

Les options ci-dessous servent à comparer des solutions. Un ajout doit répondre
à une difficulté précise et préserver la simplicité de la page. Vérifier le
[catalogue](../design/composants.md) avant de créer une variante ; les noms
proposés ici ne signifient pas que chaque composant existe déjà.

| Besoin observé | Option à examiner | Questions avant de choisir |
| --- | --- | --- |
| Comparer les mêmes propriétés | Tableau ou liste alignée | Les colonnes sont-elles stables ? Quel contenu reste prioritaire sur mobile ? |
| Exposer quelques états fréquents | Filtres visibles ou compteurs de synthèse | Les catégories sont-elles distinctes ? Les compteurs ont-ils le même périmètre ? |
| Choisir parmi beaucoup d’entités | Sélecteur avec recherche | Quelle donnée recherche-t-on ? Comment gérer doublons, attente et choix absent ? |
| Choisir plusieurs éléments | Sélection multiple avec récapitulatif | Les choix restent-ils lisibles, retirables et accessibles ? |
| Choisir une date ou une période | Champ de date | Quelle précision, quel fuseau et quelles bornes ? |
| Ajuster une quantité | Champ numérique avec commandes de pas | Le pas et les limites sont-ils définis ? Le contrôle risque-t-il des modifications involontaires ? |
| Séparer des tâches durables | Sections à URL (`PageSectionNavigation`) | Les contenus sont-ils autonomes ? La navigation protège-t-elle les brouillons et les liens directs ? |
| Alléger des détails secondaires | Popover d’aide ou section repliable | Peut-on terminer la tâche sans l’ouvrir ? Une erreur ou action importante risque-t-elle d’y rester cachée ? |
| Modifier peu de données ponctuelles | Fenêtre | Le contexte et le brouillon parent restent-ils compréhensibles ? Les actions tiennent-elles en faible hauteur ? |
| Réaliser une opération longue ou partageable | Page dédiée | Faut-il une URL, plus d’espace, plusieurs sections et un retour contextuel ? |
| Fournir un contexte de décision | Synthèse ou rail | Qu’apporte-t-il qui n’est pas déjà dans le contenu ? Reste-t-il secondaire ? |
| Retrouver une action occasionnelle | Menu d’actions | Quelles actions doivent rester visibles ? Les noms et cibles sont-ils explicites ? |
| Agir sur plusieurs lignes | Sélection et barre d’actions groupées | Le besoin est-il fréquent ? Comment expliquer la portée, les refus et les réussites partielles ? |
| Enregistrer un brouillon | `SectionActionBar` | Quelle zone sauvegarde-t-elle ? Masque-t-elle du contenu, une erreur ou le clavier mobile ? |
| Confirmer une action sensible | `AlertDialog`, preuve récente | Le risque justifie-t-il la confirmation ? La preuve est-elle demandée une seule fois ? |
| Expliquer une condition | Aide près du champ ou infobulle | L’aide est-elle indispensable ? Peut-elle être lue au toucher et par une aide technique ? |
| Signaler un résultat | Retour local, alerte persistante ou toast | Combien de temps l’information doit-elle rester disponible ? Quelle reprise proposer ? |
| Accompagner une première utilisation | État vide avec action pertinente | L’utilisateur a-t-il le droit d’agir ? Quelle seule prochaine étape peut-on lui indiquer ? |
| Examiner une évolution | Historique d’un champ | L’information existe-t-elle déjà et aide-t-elle une décision ? Quels droits la protègent ? |
| Chercher une commande ou destination | Recherche rapide du header | Le nombre d’actions le justifie-t-il ? Le parcours courant reste-t-il découvrable ? |

Pour chaque ajout envisagé : quel problème résout-il, quelle alternative plus
simple a été examinée, quel composant existant peut servir, quels états et droits
faudra-t-il couvrir, et quel critère permettra de vérifier son utilité ?

Points d’entrée locaux à examiner selon le besoin :
[bandeau](../../apps/web/src/components/layout/PageIdentityHero.tsx),
[liste](../../apps/web/src/components/ui/data-table-section.tsx),
[recherche de liste](../../apps/web/src/components/ui/list-search-field.tsx),
[pagination](../../apps/web/src/components/ui/pagination.tsx),
[barre de sections](../../apps/web/src/components/layout/PageSectionNavigation.tsx),
[barre d’enregistrement](../../apps/web/src/components/layout/SectionActionBar.tsx),
[dialogues](../../apps/web/src/components/ui/dialog.tsx),
[confirmations](../../apps/web/src/components/ui/alert-dialog.tsx),
[menus](../../apps/web/src/components/ui/dropdown-menu.tsx),
[popovers](../../apps/web/src/components/ui/popover.tsx),
[sélecteurs](../../apps/web/src/components/ui/select.tsx),
[états de contenu](../../apps/web/src/components/layout/ContentState.tsx).
Leurs contrats et consommateurs actuels sont à lire avant de les adapter.

## 17 Navigation et sections

- La page appartient-elle à la navigation globale, au module ou à une section locale ?
- Une nouvelle section représente-t-elle une tâche distincte ou un contenu qui devrait rester visible ?
- Peut-on identifier la section active et sa relation avec le titre de page ?
- Les liens directs, paramètres `section`, fragments et rechargements ouvrent-ils la bonne vue ?
- Retour et avance du navigateur suivent-ils le comportement annoncé ?
- Que doit conserver un changement de section : recherche, sélection, position, saisie, erreurs ?
- Une navigation qui modifie des filtres explique-t-elle sa nouvelle portée ?
- Quitter la page, fermer une fenêtre ou ouvrir un lien protège-t-il le bon brouillon ?
- Si un élément sélectionné disparaît, existe-t-il une destination et un focus de repli cohérents ?
- Le lien de retour mène-t-il à la liste ou au contexte réellement attendu ?

Référence : [navigation](../domaines/navigation.md), [comportements](../design/comportements.md#navigation-protégée-et-changement-de-section).

## 18 Fenêtres menus et panneaux

- Le contenu gagne-t-il à rester dans une fenêtre plutôt que dans la page ?
- La largeur et la hauteur suivent-elles son contenu et l’espace disponible ?
- Le titre et la description expliquent-ils l’objet, la tâche et la portée de l’action ?
- Le premier focus est-il placé à un endroit utile, sans déclencher une action involontaire ?
- Tab, Maj+Tab, Échap, clic extérieur et bouton Fermer ont-ils un comportement cohérent ?
- Après fermeture, abandon ou succès, le focus rejoint-il un élément existant et pertinent ?
- Une fenêtre imbriquée laisse-t-elle une seule zone active, sans double confirmation ni perte de saisie ?
- Le menu ou la fenêtre reprend-il les styles communs lorsqu’il est rendu dans un portail ?
- Les contenus longs et messages d’erreur restent-ils défilables ?
- Les actions sont-elles accessibles avec peu de hauteur et un clavier virtuel ouvert ?
- Pendant une opération, quelles fermetures sont possibles et comment l’attente se termine-t-elle ?

## 19 Brouillons et sauvegarde

- Quel objet est sauvegardé : champ, ligne, section, fenêtre ou fiche entière ?
- Quelles modifications sont immédiates et lesquelles restent un brouillon ?
- L’utilisateur sait-il ce qui n’est pas encore enregistré et où l’enregistrer ?
- Annuler restaure-t-il les bonnes valeurs sans prétendre annuler une opération déjà exécutée ?
- Une sauvegarde en cours empêche-t-elle les opérations incompatibles sans bloquer inutilement la consultation ?
- Les valeurs et la version de référence sont-elles mises à jour après réussite ?
- Un conflit laisse-t-il le brouillon récupérable et permet-il de comprendre la version enregistrée ?
- Une fermeture, un changement de section ou un retour arrière produit-il une seule décision d’abandon ?
- Les gardes et demandes de confirmation disparaissent-elles lorsque le brouillon n’est plus modifié ?

## 20 Attente erreurs et reprise

- Quel état voit-on avant les données, pendant une recherche, un envoi ou un rafraîchissement ?
- Le squelette conserve-t-il les dimensions et la structure principales de la page ?
- Le contenu déjà utilisable reste-t-il visible pendant un chargement partiel ?
- L’attente est-elle perceptible sans figer toutes les commandes ni déplacer les actions ?
- Une erreur distingue-t-elle problème de saisie, refus d’accès, conflit, panne et résultat inconnu ?
- La saisie, la sélection et le contexte restent-ils disponibles après refus ou erreur réseau ?
- Toutes les issues libèrent-elles l’état d’attente, y compris une promesse rejetée ou un délai de 30 secondes ?
- Une réponse ancienne peut-elle effacer un changement plus récent ou rouvrir un panneau fermé ?
- Une commande exécutée dont la réponse est perdue peut-elle être rejouée sans effet indésirable ?
- Le message de reprise reste-t-il visible assez longtemps et propose-t-il une action sûre ?

Références : [toasts et retours immédiats](../references/toasts-feedback.md),
[API et concurrence](../references/api-concurrence.md).

## 21 États vides et cas limites

- La première utilisation explique-t-elle ce qu’on peut faire, avec une action adaptée aux droits ?
- Zéro élément est-il distingué d’un filtre sans résultat, d’une panne et d’un accès insuffisant ?
- Une seule ligne, une seule option ou une seule section justifie-t-elle tous les contrôles affichés ?
- Les très grands volumes et nombres de pages restent-ils navigables ?
- Les noms identiques, très longs, sans espace, accentués ou inhabituels restent-ils exploitables ?
- Une relation sans enfant, une sélection retirée et un objet supprimé ailleurs ont-ils un état stable ?
- Une entité historique ou partiellement renseignée peut-elle être consultée et corrigée selon les droits ?
- Les avertissements simultanés, multiples erreurs et longs messages gardent-ils les actions accessibles ?
- Une action indisponible dans l’état actuel a-t-elle une explication ou une alternative utile ?

## 22 Mobile et espace disponible

- L’adaptation dépend-elle de la largeur réelle du contenu, compte tenu de la sidebar et du rail ?
- Entre petit téléphone, tablette et ordinateur, existe-t-il une largeur intermédiaire qui casse la composition ?
- L’ordre mobile conserve-t-il les informations et actions prioritaires ?
- Une colonne cachée laisse-t-elle son information essentielle accessible autrement ?
- Les champs, sélecteurs et boutons gardent-ils un libellé lisible et une cible de 44 px ?
- Les cartes et lignes acceptent-elles le retour à la ligne plutôt qu’une troncature inaccessible ?
- Menus et fenêtres tiennent-ils dans une fenêtre basse ou en paysage ?
- Le clavier virtuel masque-t-il la saisie, les erreurs ou l’enregistrement ?
- Redimensionnement et rotation préservent-ils saisie, sélection, section et position utile ?
- Le parcours fonctionne-t-il au toucher, sans survol et avec un clavier externe ?

## 23 Clavier et accessibilité

- Titres, listes, tableaux, champs et régions portent-ils une sémantique adaptée à leur rôle ?
- Chaque contrôle possède-t-il un nom accessible fidèle à son libellé visible et à son effet ?
- L’ordre de tabulation suit-il l’ordre de lecture et d’action ?
- Le focus est-il visible sur tous les fonds et reste-t-il hors des zones masquées par une barre collante ?
- Les actions fonctionnent-elles avec Tab, Maj+Tab, Entrée, Espace et les flèches lorsque pertinentes ?
- Effacement, suppression, filtrage, fermeture et pagination laissent-ils le focus à un endroit utile ?
- Les erreurs sont-elles liées aux champs, compréhensibles sans couleur et annoncées au bon moment ?
- Les changements de résultats sont-ils annoncés sans lire toute la page à chaque caractère saisi ?
- Agrandissement du texte, zoom et repli étroit préservent-ils le contenu et les commandes ?
- La préférence de réduction des animations, le contraste renforcé et les couleurs forcées sont-ils respectés ?
- Pour un parcours essentiel ou complexe, quel contrôle avec une aide technique est pertinent ?

Référence : [accessibilité et adaptation](../references/accessibilite.md).

## 24 Documents imports et exports

Approfondir si la page présente ou manipule ces ressources.

- Le fichier sert-il l’identification, la lecture ou une action réelle ?
- Les formats, tailles et quantités acceptés sont-ils annoncés et validés côté serveur ?
- Chargement, progression, remplacement, échec, annulation et absence de fichier ont-ils des états utiles ?
- Les droits de lecture, téléchargement et écriture s’appliquent-ils aux ressources elles-mêmes ?
- Un import peut-il expliquer ses lignes invalides, doublons, effets et réussites partielles ?
- Un export représente-t-il le périmètre annoncé, avec les bons filtres, versions et droits ?
- Un secret remis une seule fois (mot de passe provisoire, codes de secours) est-il protégé et non conservé ?

Références : [documents et fichiers](../references/documents-fichiers.md),
[imports et exports](../references/imports-exports.md).

## 25 Effets indirects

Approfondir les sujets présents sur la page ou touchés indirectement.

- Une modification change-t-elle aussi une liste, une synthèse, une autre section ou Mon compte ?
- Une action produit-elle déjà un événement d’audit, et son contenu reste-t-il juste ?
- Un changement de droits, de rôle ou de statut se propage-t-il aux sessions ouvertes ?
- Un changement de date ou de durée modifie-t-il une purge de conservation ?
- Après suppression, quelles références, compteurs et liens doivent continuer à fonctionner ?
- Une donnée privée peut-elle apparaître dans une URL, un stockage de session ou un export ?
- Les consommateurs concernés ont-ils été identifiés avant de changer un composant ou un contrat commun ?

Références selon le sujet : [audit et historique](../references/audit-historique.md),
[notifications](../references/notifications.md),
[automatisations](../references/automatisations-integrations.md),
[suppression et archivage](../references/suppression-archivage.md).

## 26 Performance et composants partagés

- Quelle quantité de données est lue, transmise et rendue pour cette tâche ?
- Les requêtes, compteurs et suggestions ont-ils des limites adaptées au volume et aux permissions ?
- Des sections masquées, grands menus ou fichiers inutilisés déclenchent-ils un travail évitable ?
- La recherche et les interactions restent-elles réactives avec un volume représentatif ?
- Un cache ou une optimisation répond-il à un problème mesuré, avec des règles de fraîcheur correctes ?
- Le composant commun couvre-t-il déjà le besoin et ses états avant d’ajouter une nouvelle variante ?
- Les valeurs visuelles, options, validations ou calculs sont-ils dupliqués et susceptibles de diverger ?
- Le changement conserve-t-il des responsabilités claires entre présentation, règles métier et écritures ?
- Les dépendances, anciens usages et protections des consommateurs ont-ils été vérifiés avant un retrait ?

Références : [performance](../references/performance.md),
[optimisation](../references/optimisation.md), [architecture](../references/architecture.md).

## 27 Vérifications et preuves

- Quel parcours démontre la tâche principale de bout en bout dans l’environnement disponible ?
- Quels scénarios couvrent les variantes des éléments réellement inventoriés ?
- A-t-on vérifié le comportement et les données, au-delà de la présence d’un composant ou d’une classe CSS ?
- Quel rendu a été inspecté sur petit, intermédiaire et grand écran, puis à faible hauteur ?
- A-t-on parcouru les contrôles au clavier et contrôlé le focus après les actions qui retirent un élément ?
- Les scénarios d’erreur, attente, conflit et reprise correspondent-ils aux mécanismes effectivement touchés ?
- Les rôles, le compte racine et les lectures seules concernés ont-ils été exercés au bon niveau ?
- Les tests distinguent-ils logique client simulée, intégration isolée et parcours authentifié ?
- Les données et services utilisés pour la vérification sont-ils isolés et autorisés ?
- Chaque correction possède-t-elle une preuve adaptée ou reste-t-elle « corrigée à vérifier » ?

### Choisir les scénarios à partir de la page

| Situation | Ce que le scénario doit établir |
| --- | --- |
| Parcours courant | L’utilisateur termine la tâche avec les bonnes données et la bonne destination |
| Zéro, un et beaucoup d’éléments | Composition, compteurs, filtrage et accès au dernier élément restent corrects |
| Valeurs limites | Zéro, absence, noms longs, grands nombres et relations manquantes gardent leur sens |
| Filtres combinés | Le sous-ensemble, les compteurs, l’effacement et la réinitialisation correspondent |
| Retour et rechargement | Vue, contexte et éventuelle restauration respectent le comportement défini |
| Brouillon et sortie | Conservation, annulation et abandon concernent les bonnes données |
| Erreur et attente | Le contexte est préservé, l’attente se termine et une reprise utile existe |
| Conflit et réponse perdue | Les écritures réussies et le brouillon restant sont distingués, sans rejeu automatique |
| Permissions | Consultation et mutations reflètent les droits sur chaque entrée touchée |
| Mobile et fenêtre basse | Contenu, clavier et actions restent utilisables sans masquer un élément essentiel |
| Clavier et focus | L’ordre et la restauration permettent de poursuivre sans repartir du document |
| Composant partagé | Les consommateurs affectés conservent leurs comportements attendus |

Référence : [tests et validation](../references/tests-validation.md),
[tests et contrôles disponibles](../systeme/tests.md).

## 28 Décisions et continuité

- L’inventaire couvre-t-il toutes les zones et variantes du périmètre annoncé ?
- Quels éléments changent de place ou de forme, pour quel gain d’usage ?
- Quels éléments sont conservés, fusionnés, retirés ou ajoutés, et pourquoi ?
- Les propositions encore ouvertes sont-elles distinguées des décisions appliquées ?
- Chaque inconnue, défaut ou limite importante possède-t-il une prochaine action ou un déclencheur de reprise ?
- La fiche décrit-elle l’état actuel plutôt qu’une accumulation de versions contradictoires ?
- Les nouvelles décisions communes sont-elles conservées dans leur référence propriétaire ?
- La conclusion distingue-t-elle ce qui est implémenté, vérifié et livré ?

### Trace courte dans la fiche de page

Pour une reprise substantielle, utiliser les rubriques du
[modèle de fiche](modeles/suivi-page.md). Consigner : tâche et critère de
réussite, inventaire des zones et variantes, composition retenue et raisons,
contrats des contrôles importants, décisions d’ajout ou de simplification,
vérifications et points ouverts. Regrouper les éléments répétitifs lorsque
leur comportement est identique ; noter leurs exceptions.

| Zone ou famille | Besoin et constat | Décision et raison | Vérification ou point ouvert |
| --- | --- | --- | --- |
| Exemple à adapter : liste de comptes | Retrouver un compte et lire son accès | Comparer tableau et cartes ; garder identité, accès et état associés aux largeurs utiles | Parcours avec noms longs, filtre vide, droits réduits et clavier |

Cette ligne illustre le raisonnement attendu, sans constituer une recette
exécutée. Les preuves détaillées restent dans les audits datés, selon
l’[organisation documentaire](organisation-documentaire.md).

Grille reprise le 19 octobre 2026 du site Noctambule, où elle a été créée à la
demande du propriétaire le 17 octobre 2026, et adaptée à Carnet de Bord.
L’enrichir lorsqu’un angle utile manque ; conserver un seul emplacement pour ces
questions communes.
