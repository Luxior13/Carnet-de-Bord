# Sponsors & partenaires - memoire du module retire

Statut : **module retire volontairement le 21 septembre 2026** pour repartir
d'une base plus petite et plus saine (connexion, journaux, securite,
performance, style). La page reste annoncee sur `/feuille-de-route` a l'etat
planifie et ne doit etre reactivee qu'une fois le socle stabilise.

La migration `20260921120000_remove_partner_module` a ete appliquee a la base
configuree le 21 septembre 2026 : les dix tables du domaine et leurs donnees
n'existent plus. Les evenements d'audit `PARTNER_*` deja enregistres restent
lisibles, car le journal est append-only.

Ce fichier est la **memoire complete du module** : il decrit ce qui existait
reellement, les regles metier deja tranchees, les champs exacts et la procedure
de remise en service. Il remplace toute note orale : ne pas reimplementer ce
module sans le relire en entier.

Documents historiques encore presents :

- `features/sponsors.md` : description produit du module au moment de sa mise
  en ligne.
- `PLAN_SPONSORS_PARTENAIRES.md` : plan de construction V1 avec les cases
  cochees et les extensions deja prevues.
- `features/pages/bureau-juridique/sponsors.md` : fiche de preparation
  generique plus ancienne (route `/bureau-juridique/sponsors`).

---

## 1. Pourquoi le module a ete retire

Objectif : reduire le nombre de pages metier independantes pour reconstruire
proprement la base du site (authentification, journal d'activite, securite,
performance, design system) et fixer les idees sur le tres long terme.

Consequences assumees :

- la route `/bureau-juridique/partenaires` et toutes ses sous-routes
  n'existent plus ;
- les 10 tables du domaine partenaire ont ete supprimees de la base ;
- les permissions `partners:view`, `partners:manage` et `partners:delete`
  redeviennent des identifiants **planifies** (jamais effectifs, jamais
  attribuables) tant que le module n'est pas reactive ;
- le pole « Bureau & juridique » n'a plus aucune page live, il n'apparait donc
  plus dans la sidebar : il reste visible uniquement sur `/feuille-de-route`.

---

## 2. Objectif produit (a conserver tel quel)

- Conserver **une fiche canonique par organisation** et centraliser ses
  categories, son statut, ses periodes de relation, ses interlocuteurs et son
  suivi interne.
- Une organisation garde **la meme fiche** quand une relation se termine puis
  reprend des mois ou des annees plus tard : chaque reprise cree une nouvelle
  periode, les anciennes dates ne sont jamais ecrasees.
- Ne jamais dupliquer une donnee geree ailleurs :
  - identite et coordonnees d'une personne -> `/vie-interne/repertoire` ;
  - contrats, documents, factures, montants -> leurs futurs modules ;
  - rappels et notifications -> futur module de rappels.
- Le statut courant est **une decision metier explicite**, jamais deduit d'une
  date, d'un contrat ou d'une action.
- Le module doit pouvoir etre masque seul (readiness) sans rendre le site
  indisponible.

Nommage retenu : page « Sponsors & partenaires », fiche appelee « Partenaire »
dans l'interface, modele `PartnerOrganization` en base. Une organisation peut
etre sponsor, partenaire, ou cumuler les deux categories.

---

## 3. Routes cibles

| Route | Role |
| --- | --- |
| `/bureau-juridique/partenaires` | Liste paginee (recherche, filtres, tri) |
| `/bureau-juridique/partenaires/nouveau` | Creation guidee |
| `/bureau-juridique/partenaires/[id]?section=information\|contacts\|suivi\|activite` | Fiche a rail d'onglets |

Ancienne route planifiee `/bureau-juridique/sponsors` : simple redirection vers
la route canonique. A decider lors de la remise en service : redirection de
compatibilite ou disparition pure.

---

## 4. Statuts et transitions

Statuts (5, dans cet ordre fixe d'affichage) :

| Cle | Libelle |
| --- | --- |
| `PROSPECT` | Prospect |
| `DISCUSSION` | En discussion |
| `ACTIVE` | Actif |
| `ENDED` | Termine |
| `CLOSED` | Sans suite |

Transitions autorisees (le bouton reste toujours visible, meme indisponible,
avec une aide expliquant l'etape prealable) :

| Depuis | Vers |
| --- | --- |
| `PROSPECT` | `PROSPECT`, `DISCUSSION`, `CLOSED` |
| `DISCUSSION` | `DISCUSSION`, `ACTIVE`, `CLOSED` |
| `ACTIVE` | `ACTIVE`, `DISCUSSION`, `ENDED` |
| `ENDED` | `ENDED`, `DISCUSSION` |
| `CLOSED` | `CLOSED`, `DISCUSSION` |

Regles retenues :

- une relation terminee passe par `ENDED`, elle n'est pas supprimee ;
- une fiche `ENDED` ou `CLOSED` revient d'abord en `DISCUSSION` avant une
  nouvelle activation ;
- depuis `ACTIVE`, choisir « En discussion » cloture la periode active puis
  reprend les echanges **dans une seule transaction** ;
- si la relation reste reellement active pendant une renegociation, le statut
  reste `ACTIVE` et la renegociation se documente seulement dans le suivi ;
- « Sans suite » remplace un ancien statut « Refuse » trop restrictif ;
- la barre de statut ne change jamais de composition ni d'ordre apres un
  changement ; un modal n'apparait que pour ouvrir, terminer ou corriger une
  periode (activation, fin, correction des dates/motif, reprise des echanges).

Dates : a l'activation, la date de debut est preremplie au jour civil courant
en `Europe/Paris` ; a la fin, la date de fin recoit ce meme jour et le debut
existant reste visible. Les deux restent modifiables et peuvent etre effacees
si la date metier est inconnue. `endedOn >= startedOn` est toujours exige.

---

## 5. Onglet Informations - champs exacts

| Champ | Type / limite | Regles |
| --- | --- | --- |
| `name` | texte, 1 a 200, obligatoire | espaces en trop refuses (`name = btrim(name)`, non vide) |
| `normalizedName` | texte, 400 | derive : NFKD, accents retires, minuscules `fr-FR`, espaces compresses |
| `categories` | 1 a 2 valeurs parmi `SPONSOR`, `PARTNER` | au moins une, sans doublon |
| `description` | texte, 500 max, facultatif | vide converti en `null` |
| `website` | URL http/https, 2048 max, facultatif | utilisateur/mot de passe dans l'URL refuses ; `normalizedDomain` = hostname en minuscules, point final retire |
| `status` | enum des 5 statuts | defaut `PROSPECT` a la creation |
| `version` | entier > 0 | optimisation optimiste de la fiche |
| `createdById` / `updatedById` | reference `User`, `SET NULL` | affiches en « createur » et « derniere modification » |
| `createdAt` / `updatedAt` | horodatages | affichage dans le fuseau de l'utilisateur |

Periodes de relation (`PartnerRelationshipPeriod`) :

| Champ | Type | Regles |
| --- | --- | --- |
| `startedOn` / `endedOn` | dates civiles (`DATE`) | facultatifs, `endedOn >= startedOn` |
| `closedAt` | horodatage technique | `null` = periode ouverte ; une seule periode ouverte par organisation (index unique partiel) |
| `closingNote` | texte, 300 max | motif facultatif de fin |
| `version` | entier > 0 | version propre |

Une periode n'est creee que pour un etat impliquant une relation reelle
(`ACTIVE` ou `ENDED`). Un `PROSPECT` ou un dossier `CLOSED` ne cree pas de
periode vide. La chronologie des periodes ne doit pas etre confondue avec le
statut courant.

Champs volontairement **non crees** en V1 : raison sociale, adresse, pays,
SIREN, TVA, anciens noms, logo televerse. A ajouter seulement quand un module
juridique en a un besoin reel (les contrats futurs garderont leur propre
photographie legale immuable).

---

## 6. Onglet Contacts - deux blocs a ne jamais melanger

### 6.1 Coordonnees generales de l'organisation

`PartnerOrganizationContactChannel`, max **10 par organisation**, CRUD
granulaire (ajouter / corriger / changer la priorite / supprimer une seule
coordonnee, sans jamais reecrire toute la collection ni les informations
generales de la fiche).

| Champ | Type | Regles |
| --- | --- | --- |
| `type` | `EMAIL` ou `PHONE` | un seul principal par type (index unique partiel `organizationId + type` ou `isPrimary = true`) |
| `value` | texte, 320 max | email valide, ou telephone valide via `libphonenumber-js` avec code pays (defaut `FR`) |
| `normalizedValue` | texte, 320 | email en minuscules ; telephone au format international `E.164` |
| `label` | texte, 40 max, obligatoire | libelle court : standard, facturation, partenariats, etc. |
| `isPrimary` | booleen | un seul par type |
| `version` | entier > 0 | version propre a la coordonnee |

Regle metier importante : ces coordonnees doivent rester **reellement
generiques**. Une adresse ou un numero personnel reste dans le Repertoire et
ne doit jamais etre saisi ici.

### 6.2 Interlocuteurs issus du Repertoire

`PartnerContact`, max **30 liaisons actives** par organisation (verrou serveur ;
l'historique reste illimite). Une meme personne ne peut pas avoir deux liaisons
actives simultanees avec la meme organisation (index unique partiel).

| Champ | Type | Regles |
| --- | --- | --- |
| `personId` | reference `Person`, `SET NULL` | `null` uniquement apres suppression de la fiche source |
| `label` | texte, 80 max, obligatoire | role libre : direction, commercial, communication, technique, texte court |
| `isPrimary` | booleen | un seul interlocuteur principal par organisation (index unique partiel) |
| `startedOn` / `endedOn` | dates civiles facultatives | `endedOn >= startedOn` |
| `closedAt` | horodatage technique | marqueur de cloture **independant** d'une date metier qui peut etre inconnue |
| `selectedEmailId` / `selectedPhoneId` | references `PersonEmail` / `PersonPhone`, `SET NULL` | voir ci-dessous |
| `version` | entier > 0 | version propre a la liaison |

Decision structurante : **on ne recopie jamais** la valeur, le nom, le pseudo
ni le libelle des coordonnees. La liaison ne stocke que `selectedEmailId` et
`selectedPhoneId`. Une correction dans le Repertoire est donc immediatement
visible partout, et modifier la fiche source reste une action separee protegee
par `persons:update`.

Regles de cycle de vie deja tranchees :

- l'ajout passe par un modal de recherche du Repertoire, puis un role libre
  avec suggestions, une date de debut facultative et le marqueur « principal » ;
- les coordonnees principales de la personne sont preselecionnees, mais un
  autre choix (ou aucun choix) reste possible ;
- une liaison terminee ne peut **jamais** redevenir active : on cree une
  nouvelle liaison, l'ancienne date de fin n'est jamais effacee ;
- une liaison terminee ne peut pas etre definie comme principal, et ses
  coordonnees selectionnees ne peuvent plus etre modifiees ;
- une liaison creee par erreur peut seule etre supprimee (pas encore
  implemente en V1) ;
- la suppression d'un email ou telephone selectionne remet la reference a
  `null` sans supprimer la liaison ;
- la suppression definitive d'une fiche du Repertoire, dans la meme
  transaction, cloture toutes ses liaisons, retire le statut principal, efface
  les references de coordonnees et la represente anonymisee sous
  « Interlocuteur supprime », sans ancienne identite ni coordonnee ;
- garde-fous base : `selectedEmailId`/`selectedPhoneId` doivent appartenir a la
  personne de la liaison, et `PersonEmail.personId`/`PersonPhone.personId` sont
  immuables (trigger `PersonEmail_prevent_person_reassignment` /
  `PersonPhone_prevent_person_reassignment` conserve, il protege aussi les
  donnees du Repertoire).

Visibilite : `partners:view` permet de voir les coordonnees generales.
`partners:manage` permet de les gerer. Afficher ou lier un interlocuteur exige
**en plus** `persons:view`. Aucune permission supplementaire n'est creee pour
l'onglet.

Le journal technique ne recoit que des identifiants opaques, le type
d'operation et les champs modifies : **jamais** une adresse, un numero, un nom,
un pseudo ou le libelle libre d'un interlocuteur.

---

## 7. Onglet Suivi - le systeme de suivi, dans le detail

### 7.1 Principe

Un **fil de suivi unique** (et non deux blocs « situation en bref » +
« historique ») rassemble deux natures d'elements :

- les **notes** ecrites par les personnes (`PartnerFollowUpEntry`) ;
- les **evenements metier** persistants (`PartnerTimelineEvent`), qui
  racontent les changements de relation.

Le suivi ressemble visuellement a une suite de messages internes, mais ce n'est
**pas un chat** : aucune reponse imbriquee, aucun statut lu/non lu, aucune
mention complexe, aucun envoi au partenaire.

### 7.2 Note de suivi

| Champ | Type | Regles |
| --- | --- | --- |
| `text` | texte, 1 a 4000, obligatoire | btrim, non vide |
| `occurredAt` | horodatage | defaut : maintenant ; modifiable a la creation |
| `partnerContactId` | liaison facultative | doit appartenir a la fiche |
| `authorId` + `authorDisplayNameSnapshot` + `authorLoginNameSnapshot` | auteur + copie lisible | le snapshot reste lisible meme si le compte disparait |
| `version` | entier > 0 | version propre a la note |

Trois evenements metier peuvent produire une ligne du fil en plus des notes :
creation de relation, changement de statut, correction de periode. Une
activation avec ouverture de periode ne produit **qu'une seule ligne lisible**,
jamais deux operations.

Le fil est ordonne du plus recent au plus ancien, regroupe par jour, et pagine
**par curseur signe** avec un instantane stable (`snapshotAt`) pour que les
pages suivantes ne bougent pas. Les evenements systeme sont affiches plus
compacts que les notes.

### 7.3 Action facultative attachee a une note

`PartnerFollowUpAction`, **une par note** (index unique sur `entryId`).

| Champ | Type | Regles |
| --- | --- | --- |
| `description` | texte, 1 a 300, obligatoire | btrim |
| `dueOn` | date civile facultative | echeance, affichee en retard si depassee |
| `completedAt` | horodatage facultatif | `null` = a faire |
| `completedById` + snapshots nom/identifiant | qui a termine | coherent avec `completedAt` (contrainte SQL) |
| `version` | entier > 0 | version propre a l'action |

Regles :

- les actions encore ouvertes sont chargees **separement** de la page courante
  du fil, afin qu'une action ancienne reste toujours visible ; la requete n'est
  repetee que pour la premiere page ;
- elles sont affichees en resume compact en haut de l'onglet, avec echeance,
  retard et contexte de la note source ;
- marquer une action comme faite ne supprime ni la note ni son historique ;
- une action terminee peut etre **rouverte** (avec audit et evenement) ;
- demander deux fois le meme etat est traite comme une operation sans effet ;
- aucune fiche et aucune action ne sont assignees durablement a un
  utilisateur dans la premiere version ;
- tous les porteurs de `partners:manage` peuvent ajouter une note ou terminer
  une action ouverte : aucun « responsable » permanent n'est necessaire.

### 7.4 Correction d'une note (regle exacte)

- seul **l'auteur** de la note peut la corriger ;
- la fenetre est de **30 minutes** apres `createdAt` ;
- le delai est calcule et reverifie **cote serveur** depuis `createdAt` :
  l'interface n'est qu'une aide visuelle ;
- la correction repose sur la **version propre de la note**, jamais sur la
  version globale de la fiche ;
- la note est **verrouillee definitivement** des que son action a ete terminee
  une premiere fois, meme si l'action est ensuite rouverte ;
- une note portant une action **ne peut pas etre supprimee** : cela protegerait
  le contexte des evenements de realisation et de reouverture. Une suppression
  de note sans action etait prevue plus tard (confirmation + version + audit) ;
- apres expiration ou verrouillage, on ajoute une **nouvelle note de
  correction** au lieu de reecrire l'historique.

### 7.5 Evenements metier du fil (append-only)

`PartnerTimelineEvent` : faits metier immuables, distincts du journal technique
`AuditLog` et donc independants de sa duree de retention et de l'existence
future des comptes.

| Type | Payload |
| --- | --- |
| `RELATIONSHIP_CREATED` | `status`, `startedOn`, `endedOn`, `closingNote`, `source?: 'migration'` |
| `STATUS_CHANGED` | `fromStatus`, `toStatus`, `startedOn`, `endedOn`, `closingNote` |
| `PERIOD_CORRECTED` | `status`, `startedOn`, `endedOn`, `closingNote`, `previousStartedOn`, `previousEndedOn`, `previousClosingNote` |
| `ACTION_COMPLETED` | `description`, `dueOn`, `completedAt` |
| `ACTION_REOPENED` | `description`, `dueOn` |
| `ACTION_UPDATED` | `description`, `dueOn`, `previousDescription`, `previousDueOn` |

Colonnes : `organizationId`, `type`, `operationId` (unique, idempotence),
`actorId` + snapshots, `occurredAt`, `formatVersion`, `periodId`, `actionId`,
`followUpEntryId`, `payload` JSONB objet.

Garde-fous base a recreer absolument :

- trigger `validate_partner_timeline_event_scope` : une periode, une note ou
  une action referencee doit appartenir a la meme fiche (l'action est verifiee
  via sa note porteuse) ;
- trigger `prevent_partner_timeline_event_update` : seules les remises a
  `null` de references sont permises, le fait metier est immuable ;
- trigger `prevent_partner_timeline_event_delete` : suppression physique
  autorisee uniquement par la cascade de suppression de la fiche proprietaire
  (le trigger distingue les deux cas en regardant si la fiche existe encore) ;
- a la migration de creation, une fiche existante recevait un repere systeme
  date du jour de migration **sans inventer** son ancien statut ni une fausse
  date de creation de relation.

### 7.6 Ce qui ne doit jamais fuiter

- le texte complet d'une note : absent du journal technique global, des toasts
  et des notifications ;
- les coordonnees privees : hors des journaux, des telemetries et des caches ;
- l'audit d'une liaison ne contient aucun nom, pseudo, `personId`, valeur de
  coordonnee ni libelle libre ;
- l'activite indique qu'une note a ete creee, corrigee, supprimee ou terminee,
  sans recopier son contenu.

---

## 8. Concurrence et versions

- Ajouter une note **ne depend pas** de la version globale de la fiche : deux
  administrateurs documentent le dossier sans se bloquer artificiellement.
- La fiche garde une version optimiste (`version`) incrementee a chaque
  mutation qui la touche, y compris les mutations independantes.
- La correction d'une note utilise sa propre version, la realisation d'une
  action la version de l'action, une liaison la sienne, une coordonnee la
  sienne.
- Les changements couples statut + periode + evenement metier restent
  atomiques dans une seule transaction.
- Repeter le meme etat d'action est un no-op, pas une erreur.

---

## 9. Permissions

| Cle | Portee | Risque | Preset USER | Preset ADMIN | Surcharge |
| --- | --- | --- | --- | --- | --- |
| `partners:view` | liste, fiche, coordonnees generales, suivi | sensible | non | oui | oui |
| `partners:manage` | creer/modifier organisation, coordonnees, liaisons, suivi | sensible | non | oui | oui |
| `partners:delete` | supprimer uniquement une fiche vide | critique | non | oui | oui |

Dependances : `partners:manage` et `partners:delete` dependent de
`partners:view`.

Regles croisees :

- `partners:view` sans `persons:view` montre l'organisation et ses coordonnees
  generales mais masque **entierement** les interlocuteurs, leurs liaisons et
  leurs coordonnees selectionnees (« Contact restreint », sans fuite
  d'identite) ;
- lier, rechercher ou modifier un interlocuteur exige `partners:manage` **et**
  `persons:view` ;
- une permission partenaire ne donne jamais le droit de modifier une fiche du
  Repertoire ;
- l'historique detaille d'un champ exige `partners:view` et
  `audit:view_field_history` ;
- toutes les permissions sont verifiees cote serveur ; masquer un bouton n'est
  jamais une autorisation.

A la remise en service, ces trois cles devront **sortir de
`ROADMAP_PERMISSIONS`** et revenir dans `PERMISSIONS` avec leur
`PermissionCategory` (`poleKey: 'legal'`, ton `legal`, icone `Handshake`,
`assignment: 'delegable'`), leurs presets et leurs tests, dans le meme
changement que la page.

---

## 10. Audit

Actions techniques produites par le module (aujourd'hui historiques, plus aucun
code ne les emet) :

- `PARTNER_CREATE`, `PARTNER_UPDATE`, `PARTNER_STATUS_UPDATE` ;
- `PARTNER_PERIOD_CREATE`, `PARTNER_PERIOD_UPDATE` ;
- `PARTNER_CONTACTS_UPDATE`, `PARTNER_FOLLOW_UP_CREATE`,
  `PARTNER_FOLLOW_UP_UPDATE`, `PARTNER_FOLLOW_UP_DELETE`,
  `PARTNER_FOLLOW_UP_COMPLETE`, `PARTNER_DELETE` ;
- `PARTNER_MERGE` : jamais active, reservee a la future fusion manuelle.

Categorie `PARTNER`, `entityType` `PARTNER`, `entityId` = identifiant de
l'organisation, `poleKey` = `legal`, `pageKey` = `partners`, `tabKey` =
`information` ou `follow-up` selon l'onglet concerne, plus `changedSections` en
metadonnee.

Les valeurs d'enum `AuditAction.PARTNER_*` et `AuditCategory.PARTNER` sont
**conservees** en base et dans le rendu du journal, exactement comme
`BACKGROUND_JOB_UPDATE` : elles ne sont plus produites mais restent lisibles
pour ne pas casser l'affichage d'anciens journaux.

---

## 11. Modele de donnees a recreer

Dix tables, dans cet ordre de dependance :

1. `PartnerOrganization` (fiche canonique : nom, `normalizedName`, description,
   site, `normalizedDomain`, statut, version, createur/modificateur, dates) ;
2. `PartnerOrganizationCategory` (unique `organizationId + category`) ;
3. `PartnerOrganizationContactChannel` (coordonnees generales, unique
   `organizationId + type + normalizedValue`, unique principal par type) ;
4. `PartnerRelationshipPeriod` (une seule periode ouverte par organisation) ;
5. `PartnerContact` (liaison Repertoire, unique active `organizationId +
   personId`, unique principal, references de coordonnees) ;
6. `PartnerFollowUpEntry` (note) ;
7. `PartnerFollowUpAction` (action unique par note) ;
8. `PartnerTimelineEvent` (fait metier immuable) ;
9. `PartnerOrganizationDeletionTombstone` (idempotence de suppression,
   immuable par trigger) ;
10. `PartnerOrganizationMergeRedirect` (redirection de fusion, immuable).

Enums : `PartnerOrganizationCategoryType`, `PartnerOrganizationStatus`,
`PartnerContactChannelType`, `PartnerTimelineEventType`.

Contraintes et index a ne pas oublier :

- `CHECK` de nettoyage sur chaque champ texte (`= btrim(...) AND <> ''`) et
  `version > 0` partout ;
- contraintes de coherence : `endedOn >= startedOn`,
  `closedAt IS NULL OR isPrimary = false`,
  `(completedAt IS NULL AND completedById IS NULL) OR completedAt IS NOT NULL` ;
- index uniques partiels : periode ouverte unique, contact actif unique par
  personne, contact principal unique, coordonnee principale unique par type ;
- index de liste : `(normalizedName, id)`, `(status, normalizedName, id)`,
  `(updatedAt, id)`, `(status, updatedAt, id)` ;
- index trigram `gin_trgm_ops` sur `normalizedName` pour la recherche ;
- index de fil : `(organizationId, occurredAt DESC, id DESC)`.

---

## 12. API a recreer

| Methode et route | Permission | Role |
| --- | --- | --- |
| `GET /api/partenaires` | `partners:view` | liste paginee (filtres categorie/statut, recherche, tri nom ou modification) |
| `POST /api/partenaires` | `partners:manage` | creation + avertissement de doublons |
| `GET /api/partenaires/[id]` | `partners:view` | fiche complete |
| `PATCH /api/partenaires/[id]` | `partners:manage` | informations + categories |
| `DELETE /api/partenaires/[id]` | `partners:delete` | suppression d'une fiche vide (idempotence) |
| `PATCH /api/partenaires/[id]/statut` | `partners:manage` | statut + periode, transactionnel |
| `GET /api/partenaires/[id]/fil` | `partners:view` | fil pagine + actions ouvertes |
| `POST /api/partenaires/[id]/suivis` | `partners:manage` | nouvelle note (+ action facultative) |
| `PATCH /api/partenaires/[id]/suivis/[entryId]` | `partners:manage` | correction de note (auteur, 30 min, version) |
| `DELETE /api/partenaires/[id]/suivis/[entryId]` | `partners:manage` | suppression interdite si la note porte une action |
| `PATCH /api/partenaires/[id]/suivis/[entryId]/action` | `partners:manage` | terminer / rouvrir l'action |
| `POST /api/partenaires/[id]/coordonnees` | `partners:manage` | ajouter une coordonnee generale |
| `PATCH`/`DELETE /api/partenaires/[id]/coordonnees/[channelId]` | `partners:manage` | corriger / supprimer une coordonnee |
| `POST /api/partenaires/[id]/contacts` | `partners:manage` + `persons:view` | lier un interlocuteur |
| `PATCH /api/partenaires/[id]/contacts/[contactId]` | `partners:manage` + `persons:view` | corriger / cloturer la liaison |
| `GET /api/partenaires/[id]/activite` | `partners:view` | activite contextuelle (100 derniers evenements) |

Codes d'erreur metier dedies : `PARTNER_CHANNEL_ALREADY_EXISTS`,
`PARTNER_CHANNEL_LIMIT_REACHED`, `PARTNER_CHANNEL_NOT_FOUND`,
`PARTNER_CHANNEL_VERSION_CONFLICT`, `PARTNER_CONTACT_ALREADY_ACTIVE`,
`PARTNER_CONTACT_LIMIT_REACHED`, `PARTNER_CONTACT_REOPEN_FORBIDDEN`,
`PARTNER_CONTACT_VERSION_CONFLICT`, `PARTNER_DEPENDENCY_CONFLICT`,
`PARTNER_FEATURE_NOT_CONFIGURED`, `PARTNER_VERSION_CONFLICT`.

Toutes les reponses sont privees (`Cache-Control: private, no-store`,
`Pragma: no-cache`) et propagent `x-request-id`.

---

## 13. Interface a recreer

- **Liste** : hero, bouton « Nouveau partenaire », resume compact, recherche
  (nom, domaine, coordonnee generale, interlocuteur seulement avec
  `persons:view`), filtres categorie et statut, tri (nom, derniere
  modification), ligne entiere cliquable, pagination serveur, filtres
  conserves dans l'URL, etats chargement / rafraichissement / erreur / vide /
  acces refuse.
- **Creation** : page dediee (pas un petit modal) demandant le minimum (nom,
  une categorie, statut initial, description et site facultatifs, premieres
  coordonnees generales facultatives, premieres dates seulement pour un etat
  impliquant une relation reelle, premier contact facultatif), avertissement
  de doublons sans blocage, redirection vers la fiche, protection contre la
  navigation accidentelle.
- **Fiche** : meme largeur, meme rail et meme bouton retour que les fiches du
  Repertoire et des utilisateurs. Hero compact (nom, categories, statut, site).
  Quatre onglets : `Informations`, `Contacts`, `Suivi`, `Activite`.
- **Composants existants a recréer** : liste, formulaire de creation, fiche et
  son rail, section coordonnees generales, section interlocuteurs, modales de
  liaison et de coordonnees, selecteur de coordonnees d'une personne, barre de
  statut et badge, composeur / editeur de note, section des actions ouvertes,
  elements du fil, badge de statut, avertissement de doublon.
- **Ton visuel** : pole « Bureau & juridique » (ton `legal`).

---

## 14. Navigation, registre et readiness

- Registre (`feature-registry`) : entree `partners`, `availability: 'live'`
  uniquement a la remise en service, `href` `/bureau-juridique/partenaires`,
  icone `Handshake`, permission requise `partners:view`, localisation d'audit
  `poleKey: legal`, `pageKey: partners`, `pageLabel: Sponsors & partenaires`.
- Navigation : le pole « Bureau & juridique » n'apparait dans la sidebar que
  s'il possede au moins une page live. Aujourd'hui il n'existe que sur
  `/feuille-de-route`, a l'etat planifie.
- Readiness : verifier l'existence des 10 tables, des colonnes
  `selectedEmailId`/`selectedPhoneId`, des deux cles etrangeres et du trigger
  `PartnerContact_selected_coordinates_guard`, avec cache court de succes, et
  masquer seulement ce module si ce n'est pas pret.
- `/api/health/ready` exposait `checks.partners` ; a recreer avec la readiness.
- Disponibilite applicative : le contexte de disponibilite des fonctionnalites
  retiretait `partners` des modules operationnels tant que le schema n'etait
  pas pret.

---

## 15. Sauvegarde, conservation et exploitation

- Chaque table du module devra etre reinscrite **dans l'ordre de dependance**
  dans le manifeste de sauvegarde/restauration, avec incrementation du format
  signe et mise a jour des tests de format.
- Les donnees metier du module n'expirent pas automatiquement tant que la fiche
  existe ; la retention ne concerne que l'audit technique et les
  notifications.
- A la creation, le format signe contenait les notes, leurs actions et les
  evenements du fil.
- Aucun worker ni tache planifiee n'est necessaire pour ce module.

---

## 16. Hors perimetre (decisions deja prises)

Pas de gestion de contrat, pas de montant de sponsoring, pas d'operation
financiere, pas de facture, pas de document ou piece jointe, pas de rappel ou
tache automatique, pas de synchronisation avec le site public, pas d'envoi
d'email, pas de portail partenaire, pas de logo televerse, pas de permission
distincte pour les notes ou les coordonnees, pas d'export metier en V1, pas de
fusion invisible.

Extensions deja identifiees, a preparer sans les anticiper :

- affichage inverse, en lecture seule, des organisations liees sur une fiche du
  Repertoire (sans `partners:view`, aucune liaison n'est revelee) ;
- liens en lecture seule vers contrats, documents, operations financieres,
  rappels, reunions et actualites internes ;
- fusion transactionnelle de doublons : identifiant canonique conserve,
  reaffectation des periodes/contacts/suivis, redirection technique depuis
  l'ancien identifiant, collisions de categorie / contact principal / periode
  ouverte resolues avant validation, protegee par `partners:delete`,
  confirmation nominative, idempotence, version et audit `PARTNER_MERGE` ;
- notifications aux comptes explicitement choisis (sans liaison
  `Person`/`User`) et rappels de renouvellement, uniquement avec le futur
  module de rappels ;
- export metier seulement avec un besoin identifie, une permission dediee, un
  volume borne et les memes masquages de contacts ;
- champs juridiques (raison sociale, adresse, pays, SIREN, TVA, anciens noms)
  seulement quand un module legal les reclame.

---

## 17. Checklist de remise en service

1. Relire ce fichier et `PLAN_SPONSORS_PARTENAIRES.md` en entier.
2. Recreer le schema, les contraintes, les index, les triggers et la migration
   PostgreSQL.
3. Sortir `partners:view`, `partners:manage` et `partners:delete` de
   `ROADMAP_PERMISSIONS` et les remettre dans `PERMISSIONS` avec leur categorie,
   leurs presets et leurs tests.
4. Recreer les services serveur (organisations, canaux, liaisons, notes,
   actions, fil, readiness, erreurs, normalisation, concurrence, audit).
5. Recreer les routes API avec leurs gardes et leurs codes d'erreur.
6. Recreer les pages (liste, creation, fiche) et les composants de l'onglet
   Suivi.
7. Passer l'entree de registre et la navigation en `live`, et retirer la carte
   planifiee correspondante de `/feuille-de-route`.
8. Reinscrire les tables dans le manifeste de sauvegarde et incrementer le
   format signe.
9. Restaurer les tests : fondation/contrats, permissions, normalisation,
   transitions de statut, dates civiles, canaux, liaisons, concurrence du fil,
   correction de note, integration avec la suppression d'une fiche du
   Repertoire, contrats UX desktop et mobile, accessibilite, et restauration
   sur une base isolee.
10. Verifier la readiness, le journal d'audit, la recherche globale et la
    visibilite avec plusieurs profils de permissions.

---

## 18. Pieges a ne pas oublier

- Ne jamais recopier une coordonnee personnelle dans les coordonnees generales
  de l'organisation.
- Ne jamais copier la valeur d'un email ou d'un telephone dans la liaison : la
  liaison ne contient que des identifiants.
- Ne jamais ecraser l'etat courant pour simuler l'historique : les periodes,
  les notes et les evenements sont des faits dates.
- Ne jamais deduire un statut, un contrat ou un montant d'une autre donnee.
- Ne jamais laisser un contact non autorise apparaitre dans la liste, le fil ou
  une recherche sans `persons:view`.
- Ne jamais supprimer une note qui porte une action.
- Ne jamais faire confiance au client pour un statut, une categorie ou une
  relation.
