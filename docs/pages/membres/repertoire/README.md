# Répertoire

[Index des pages](../../../pages/README.md) · [Espace Membres](../README.md) · [Design](../../../design/README.md) · [Guide général](../../../REFERENCE_GENERALE.md)

Fiches des personnes, dans ou hors de la structure : liste de **référence
visuelle et UX** de l’application, création et fiche à deux sections. Une fiche
personne n’est ni un compte utilisateur, ni une adhésion, ni un rôle.

## Pages et sections

| Route | Section | Fiche | Gabarit | Harmonisation |
| --- | --- | --- | --- | --- |
| `/membres/repertoire` | — | [Liste du répertoire](liste.md) | [A. Liste de gestion](../../../design/gabarits.md#a-liste-de-gestion) | **Page de référence** |
| `/membres/repertoire/nouveau` | — | [Nouvelle fiche](creation.md) | [C. Formulaire de création](../../../design/gabarits.md#c-formulaire-de-création) | Aligné |
| `/membres/repertoire/[id]` | Identité (défaut) | [Personne — Identité](fiche-identite.md) | [B. Fiche à sections](../../../design/gabarits.md#b-fiche-à-sections) | Aligné |
| `/membres/repertoire/[id]` | `?section=coordonnees` | [Personne — Coordonnées](fiche-coordonnees.md) | [B. Fiche à sections](../../../design/gabarits.md#b-fiche-à-sections) | Aligné |

Alias historiques `/personnes` et `/vie-interne/repertoire` : redirections
vers la liste (voir les [routes](../../../systeme/routes.md)).

## Règles communes du module

- **Accès** : lecture `persons:view`, création `persons:create`, identité
  `persons:update`, coordonnées `persons:update_contact`, suppression
  `persons:delete` ; contrôles serveur sous `/api/personnes`. Référence :
  [page Répertoire](../../../domaines/permissions.md#page-répertoire).
- **Cadre de la fiche** : [PersonDetailPage](../../../../apps/web/src/features/persons/components/PersonDetailPage.tsx)
  compose `EntityDetailLayout` (bandeau compact, `PageSectionNavigation`) et
  charge chaque section à la demande ; la synthèse `PersonOverview` suit le
  seuil du rail.
- **Règles métier** : statut `IN_STRUCTURE` / `OUTSIDE_STRUCTURE` ; futures
  relations datées rattachées à la personne, jamais empilées sur `Person`
  ([sujets futurs](../../../propositions/sujets-futurs.md)).
- **Points ouverts** : [registre REP](#points-ouverts) ; REP-02 (évolution du
  statut de structure) est différé au cadrage métier, les autres sont clos.

## Revues communes à la fiche

Les sections ci-dessous concernent tout le module ou toute la fiche. Celles qui
ne concernent qu’une page ou une section ont rejoint sa fiche le 19 octobre 2026,
sans modification de contenu.

## Champs — décision courante du 17 octobre 2026

Les champs des fiches et créations, y compris date de naissance et coordonnées,
reprennent le rendu adouci validé sur le site Noctambule : police système,
arrondis de 8 px, valeurs à 16 px sous 1024 px puis 13 px, hauteur de 40/44 px.
Les champs en édition directe gardent leur fond opaque et un contour visible.
Le statut et les sélecteurs de coordonnées utilisent la variante par défaut ;
la variante compacte reste celle des filtres de liste. La recherche et les
tableaux conservent leur densité et Geist. Cette décision remplace les anciennes
prescriptions de champs discrets et de sélecteurs compacts dans les formulaires.
Règle commune : [système de design](../../../design/fondations.md#espacements-et-arrondis).
Contrôles et limites : [composants partagés](../../transverse/composants-partages.md#champs--harmonisation-du-17-octobre-2026).

## Autorisations et provenance — constat du 15 octobre 2026

L'[audit des droits du site actuel](../../../audits/2026-10-15-autorisations-site.md)
ouvre AUT-S01 : la provenance d'une personne peut restituer le nom et l'identifiant
du compte racine, alors que sa fiche Utilisateur les masque aux autres lecteurs.
Deux sondes sur les fonctions réelles d'écriture/projection avec stockage simulé
le reproduisent. Liste, fiche, provenance et retours de mutation sont à traiter ;
les données d'audit stockées doivent être conservées. Responsable à attribuer,
**correction non effectuée** ; aucune fuite réelle en session n'est affirmée.

AUT-S04 relève aussi de cette page : l'infobulle utilise auteur/date/action,
mais sa réponse contient anciennes et nouvelles valeurs de deux changements.
Réduire cette réponse au besoin actuel est recommandé. AUT-S03, suivi dans
Utilisateurs, concerne le prérequis `persons:view` absent du catalogue de la
provenance, bien qu'il soit contrôlé par l'API.

Les quatre droits Personnes existants restent utiles. La séparation éventuelle
de la lecture/modification des coordonnées (AUT-S06) et une preuve de mot de
passe à la suppression (AUT-S07) sont des propositions, pas des règles adoptées.
Le rapport conserve les limites des 400 tests existants et trois sondes de la
passe transverse ; les preuves réelles antérieures restent datées.

## État courant — clôture du socle du 13 octobre 2026

La [revue finale du socle](../../../audits/2026-10-12-cloture-socle.md) est
terminée au périmètre livré, pour poursuivre le développement métier. Ses
preuves et limites ne constituent pas une qualification de déploiement.

Liste, création et fiche restent la référence de composition avec Utilisateurs.
Les mutations vérifient désormais la source et les droits courants dans leur
transaction ; une identité vide après normalisation est refusée en 400 avant
SQL. Les parcours réels et mesures locales jusqu’à 10 000 fiches complètent les
bancs client, sans qualifier une charge concurrente ni une exploitation à plus
grand volume.

Les décisions et preuves datées ci-dessous restent conservées. Une nouvelle
revue répond à un changement, un défaut constaté ou une règle nouvelle.

## Identité et état

- Route(s) : `/membres/repertoire` (liste), `/membres/repertoire/nouveau`
  (création), `/membres/repertoire/[id]` (fiche). Alias historiques :
  `/personnes` et `/vie-interne/repertoire`.
- Module propriétaire : `apps/web/src/features/persons`. Rendu de la liste :
  `app/membres/repertoire/page.tsx` (serveur) →
  `features/persons/components/PersonsPageClient.tsx` →
  `PersonsList.tsx`, styles partagés `components/ui/directory.module.css`.
- Statut : liste conforme sur le périmètre vérifié le 11 octobre, référence
  visuelle avec `/systeme/utilisateurs`. Fraîcheur, retrait d’accès, curseurs,
  courses de recherche, mémoire et focus corrigés ; aucun défaut confirmé
  restant ouvert sur la liste actuelle. Les évolutions métier restent distinctes.
- Revue de la liste : 2026-10-11 — 41 scénarios Chromium avec API simulées,
  neuf parcours sur Next de production/session/MFA/PostgreSQL réels, six largeurs
  dans le cadre complet, mesures jusqu’à 10 000 fiches et 100 000 audits.
  Voir le [rapport courant et ses limites](../../../audits/2026-10-11-repertoire.md).
- Création et ouverture de fiche puis retour exercés avec persistance et audit
  réels le 11 octobre. Cette preuve ne réaudite pas tous les dialogues ni la
  suppression de la fiche. [Passe précédente](../../../audits/2026-10-10-repertoire.md).
- Revue propre à la création du 12 octobre : reprises après résultat
  incertain, succès et navigation, disponibilité et composition du formulaire.
  **28 parcours client simulés, onze parcours Next/session/PostgreSQL et seize
  contrôles SQL réussis** ; REP-N01 à REP-N06 clos dans leur portée.
  Le retour filtré est aussi protégé pendant le chargement de la fiche,
  vérifié par régression de rendu serveur et transition HTTP ralentie réelle.
  [Rapport de création et limites](../../../audits/2026-10-12-creation-personne.md).
  Les validations de la liste restent distinctes de ces preuves.
- Revue propre à la fiche du 12 octobre : identité, coordonnées, provenance,
  droits, versions et suppression. **Trente parcours client simulés, treize
  parcours HTTP avec connexion/MFA/PostgreSQL et trente scénarios SQL réussis**.
  REP-D01 à REP-D10 clos ou amélioration vérifiée dans leur portée ; compilation,
  types, lint et budgets finaux réussis. Cette passe reste distincte des succès
  précédents de la liste et de la création.
  [Rapport de fiche et limites](../../../audits/2026-10-12-fiche-personne.md).
- Références : intentions historiques `docs/propositions/intentions/pages/vie-interne/membres*.md`,
  `docs/propositions/intentions/pages/bureau-juridique/personnes-contacts.md` ; règles courantes
  `docs/domaines/navigation.md`, `docs/domaines/structure-juridique.md`, `docs/domaines/roles-metier.md`,
  `docs/domaines/permissions.md` ; tokens `apps/web/src/app/globals.css`.

## Fonction et décisions courantes

### Schéma et architecture en développement — 11 octobre 2026

Le contexte développement est explicite dans AGENTS : simplifier les
responsabilités utiles maintenant, sans compatibilité hypothétique. Le service
de lecture `person-list.service.ts` possède recherche, pagination, SQL et
compteurs ; le service principal conserve création, détail et modification.
La façade publique reste la même, sans nouvelle abstraction de liste générique.

Le modèle Prisma conserve Person indépendante de User, coordonnées rattachées à
leur fiche, naissance civile et versions optimistes. Le schéma a été mis en
forme et ses règles SQL documentées ; pas de nouvelle table/colonne. La migration
additive `20261011180000_person_coordinate_ownership`, appliquée à la base de
développement, interdit aussi le déplacement SQL d’un profil social vers une
autre personne. Les trois protections sont requises par le contrôle de schéma.

Ajout et suppression de coordonnées vérifient la version de la fiche lue avant
leurs calculs, puis à l’écriture. Les plafonds et la désignation automatique du
principal restent des règles transactionnelles du service, pas des CHECK SQL.

Preuves : 29 contrôles sur le schéma complet, catalogue réel prêt, 18 scénarios
SQL de liste après extraction, 1 135 tests web et 21 tests database réussis,
build/types/lint et budgets réussis. Le faux écart d’introspection des index
Prisma 6 est documenté, sans recréation inutile.
[Complément du rapport](../../../audits/2026-10-11-repertoire.md#complément--schéma-et-refactorisation-pendant-le-développement) ·
[Contrat Prisma/SQL](../../../../packages/database/prisma/README.md).

### Fiche personne — revue du 12 octobre 2026

La fiche rassemble l'identité et les coordonnées utiles d'une personne ;
elle ne crée ni compte, ni adhésion, ni rôle. La date de naissance reste
facultative et civile. Les plafonds actuels sont dix emails, dix téléphones
et vingt profils sociaux ; le principal se choisit par ensemble, et par
réseau pour les profils sociaux.

La lecture, la modification, la suppression et la provenance sont des
capacités distinctes. Le snapshot serveur, les brouillons et les réponses
doivent appartenir à la même cible, au même compte et aux mêmes droits
effectifs. Un retrait d'accès purge l'ancien état ; une simple indisponibilité
du module conserve la saisie et explique les actions possibles.
La lecture serveur de la fiche et de sa provenance utilise un même instant
transactionnel, pour ne pas associer une identité ancienne à un audit concurrent
plus récent. Cette correction REP-D09 a été vérifiée sur PostgreSQL isolé.
L'infobulle présente la provenance de la dernière modification. L'API conserve
sa limite existante de deux changements par champ ; la mention de trois dans
la référence de permissions a été alignée, sans créer de journal complet.

Décisions de composition pour cette passe : conserver les deux sections et
leurs composants communs, harmoniser le bandeau avec `PageIdentityHero`,
garder la barre de l'identité portée par la page hors carte, utiliser une
soumission native dans les dialogues de coordonnées et préserver le contexte
de retour après suppression. Le mode compact du pseudo et de la naissance ne
référence plus une aide absente ; les identifiants sont vérifiés au rendu.
Les lignes de libellé conservent une hauteur commune avec ou sans bouton de
provenance, pour aligner les champs voisins. Les fonctions locales de brouillon
sont séparées du dialogue dans `person-child-draft.ts` ; pas de nouveau moteur
de formulaire ni de dépendance.

Les homonymes et coordonnées communes restent possibles, avec avertissement
non bloquant pour ces dernières. L'ancien stockage local d'alerte de création
n'a plus de producteur depuis la création minimale du 12 octobre : son retrait
sur la fiche ne retire pas les avertissements des mutations de coordonnées.
Une relecture de conflit doit conserver les champs réellement modifiés et
adopter les autres données courantes avant nouvelle confirmation.
Un résultat d'écriture non confirmé conserve la saisie et demande une relecture
avant reprise, sans rejeu automatique. L'ajout retrouvé après relecture peut
être terminé sans second POST. Une lecture remplacée ne doit pas publier une
fausse erreur ni terminer l'attente de celle qui lui succède.

La provenance restée ouverte relit sa donnée après changement de version ;
la fermeture ou le changement de portée annule l'ancienne requête. Attente
bornée à quinze secondes pour la provenance, trente secondes pour les autres
lectures et mutations de la fiche ; les gardes de réponse restent nécessaires
car interrompre le transport n'annule pas un commit serveur.

La suppression définitive reste distincte d'un archivage. Elle efface la fiche,
ses coordonnées et l'historique des valeurs, en conservant une trace minimale.
Aucune restauration depuis l'application, nouvelle preuve de mot de passe
ou extension d'un mécanisme d'archivage n'est ajoutée. La restauration et la
purge des sauvegardes restent des sujets d'exploitation à vérifier séparément.
Après réponse incertaine de suppression, conserver la même clé lors de la
fermeture et de la réouverture du dialogue. Le succès confirmé ne devient pas
un échec métier si la navigation échoue : un bouton de retour reste disponible.
Le retour filtré et la reprise du DELETE sont vérifiés sur serveur réel ; la
panne propre du routeur après succès n'a pas été injectée dans ce banc.

REP-D01 à REP-D10 sont clos ou vérifiés à la portée décrite dans le rapport.
Les archives avant correction démontrent six défauts client et un contrôle
Annuler déjà correct. Après correction : trente scénarios client, deux reprises
ciblées après extraction, 71 tests serveur dont trente SQL, puis treize parcours
HTTP réels. Les tests SQL préparent leurs sessions et simulent les en-têtes ;
le banc HTTP exerce la connexion et la MFA. La suite web réussit 1 240 tests
(163 ignorés) ; build, lint, types, architecture et budgets réussis après
les dernières retouches, fiche à 262 957 octets gzip. Les limites de
restauration, charge, extensions et accessibilité
humaine restent distinctes de ces succès et sont décrites dans le
[rapport dédié](../../../audits/2026-10-12-fiche-personne.md).

### Contour des champs de fiche — 10 octobre 2026

Écart signalé entre `/membres/repertoire/[id]` et la fiche Utilisateurs :
`PersonIdentityFields` utilise bien les primitives communes, mais sa variante
`quiet` remplaçait le focus par un halo de 3 px à 22 % d'opacité et un autre
fond. `SectionForm.module.css` limite désormais cette variante au repos et au
survol, en laissant les champs focalisés ou invalides aux primitives `Input` et
`SelectTrigger`. Les erreurs gardent ainsi leur contour rouge ; rayon de 6 px
conservé. Lors de cette passe, coordonnées et création utilisaient la variante
standard ; leur présentation évolue dans le complément ci-dessous.

Revue légère : Q01/Q03/Q04/Q19/Q27/Q30 examinés ; autres sujets hors impact
pour cette correction CSS sans changement des données ni du comportement métier.
Chromium isolé, composants réels des deux fiches rendus en HTML et CSS recompilé :
écart reproduit avant correction, puis égalité des bordures, anneaux, fonds et
rayons au clic et à Tab, avec et sans erreur, à 390 et 1 440 px. Sélecteurs
comparés au clavier ; contour système en couleurs forcées et absence de
débordement global vérifiés. Les mutations et les parcours authentifiés ne sont
pas rejoués par ce contrôle visuel. Les preuves fonctionnelles précédentes
restent datées.

### Présentation des sélecteurs alignée sur les filtres — 10 octobre 2026

Après le contrôle des contours, l'utilisateur a signalé l'écart encore visible
entre le statut de `/membres/repertoire/[id]` et les filtres de la liste : hauteur,
typographie, flèche, fond au repos et espacement des options différaient.
**Corrigé et vérifié** : variante `compact` commune de `SelectTrigger` et
`SelectContent`, extraite du style des filtres. Le statut de fiche ne reçoit plus
`quietField` ; les champs texte discrets conservent leur présentation.

Statut de création, pays, réseau social et remplacement du contact principal
reprennent cette variante. La largeur reste propre au contexte ; aucun changement
de valeur, validation, permission ou mutation. Les filtres Utilisateurs consomment
aussi la présentation extraite. Revue légère : Q01/Q03/Q04/Q19/Q27/Q30 examinés ;
autres sujets hors impact sur ce changement de CSS et de composition.

Comparaison Chromium avec vrais composants/CSS à 320, 390, 768 et 1 440 px :
styles calculés identiques entre déclencheurs, puis entre panneaux/options du
statut de liste et de fiche ; survol, ouverture, sélection clavier, retour du
focus, erreur, désactivation et absence de débordement horizontal contrôlés.
Les contrôles TypeScript, lint, architecture et les 1 036 tests web passent
(25 ignorés). [Preuves et limites du complément](../../../audits/2026-10-10-menus.md#complément--présentation-des-sélecteurs-du-répertoire).
Contexte compte simulé, police de repli ; aucune session authentifiée, mutation
réelle ni compilation Next de production rejouée. Le remplacement du principal
est examiné dans le code, son dialogue n'est pas réexécuté dans ce complément.

### Règles métier

Le [contrôle transverse des menus du 10 octobre](../../../audits/2026-10-10-menus.md)
complète la correction du focus : filtres de liste, statut de fiche/création,
pays, réseau social et remplacement du contact principal exécutés dans leurs
composants réels, avec contexte simulé. Contour partagé conservé pendant
l'ouverture ; panneau 7 px et options 4 px. Les parcours métier authentifiés
ne sont pas validés par ce banc visuel ; les limites ci-dessous restent datées.

- Tâche principale : retrouver une fiche personne, qu'elle soit **dans** ou
  **hors** de la structure (`IN_STRUCTURE` / `OUTSIDE_STRUCTURE`), comprendre
  son rattachement, accéder à sa fiche, en créer une.
- Périmètre long terme : la liste reste l'entrée ; la fiche détail devient le
  point central de toutes les informations liées à la personne, de près ou de
  loin (identité, coordonnées, rattachement, puis sanctions, bans, éligibilité
  aux tournois, rôles, adhésions…). Ces futures capacités sont des **relations
  datées** rattachées à la personne, pas des champs empilés sur `Person` — voir
  `docs/propositions/sujets-futurs.md`.
- Type de page : liste de gestion (retrouver, comparer, agir). Volume attendu :
  petit aujourd'hui, potentiellement plusieurs centaines/milliers en société.
- Recherche par pseudo, prénom, nom, email, téléphone, identifiant ou URL de
  réseau social ; mots d'identité dans n'importe quel ordre, accents/casse
  normalisés ; filtres de statut et absence de coordonnées ; tri nom / création / modification ;
  pagination par curseur de 25 lignes.
- Accès : lecture `PERSONS.VIEW`, création `PERSONS.CREATE`. Contrôle serveur
  via `/api/personnes`. Le composant client refait ses propres garde-fous
  d'affichage (`canView`, `canCreate`) sans remplacer le contrôle serveur.
- La liste ne charge pas les coordonnées complètes, seulement leurs compteurs ;
  les données sensibles restent sur la fiche.

## Sélection des sujets (Q01–Q30) — synthèse pour cette analyse

Sélection révisée pour l'audit du 2026-10-10 : Q01–Q05, Q07, Q09–Q12, Q14–Q15,
Q17, Q19, Q22, Q25, Q27 et Q30 examinés. Hors impact : Q06 (mutations hors
périmètre), Q13 et Q16 (aucune migration ni retrait), Q18 (pas d'optimisation
engagée), Q24 (aucun changement juridique), Q28–Q29 (exploitation et restauration
inchangées). Non applicables : Q08, Q20, Q21, Q23, Q26, capacités absentes de cette
liste. La lecture de données personnelles exige bien d'examiner sécurité et
confidentialité, même sans mutation. Couverture et limites dans le rapport.

## Points ouverts

État courant après l’audit du 11 octobre. REP-01 et REP-03 sont clos dans la portée
désormais mesurée ; leurs limites et déclencheurs restent ci-dessous. REP-02 est
différé au cadrage métier, responsable à attribuer. Les lignes closes restent
identifiables pour rouvrir leur scénario en cas de changement. Les rapports
conservent les preuves datées, cette table porte les états courants.

| Point | Nature / priorité et impact | Prochaine étape / déclencheur |
| --- | --- | --- |
| REP-01 — Validation visuelle réelle | Clos pour la liste après neuf parcours Next/session/MFA/PostgreSQL réels, six largeurs et captures relues ; clavier et cas limites complétés par 41 scénarios simulés | Rouvrir si cadre/navigation/composants changent ; appareils physiques, autres navigateurs et tous les dialogues restent hors de cette preuve |
| REP-02 — Évolution du statut de structure | Cadrage différé ; modèle et parcours long terme | Lire `docs/domaines/structure-juridique.md` avant tout nouveau statut ; conserver personnes et relations datées séparées |
| REP-03 — Recherche à volume | Clos à 10 000 fiches / 100 000 audits : 38 scénarios du service réel, quatre requêtes par appel, p95 maximal 22,47 ms ; migrations déployées sur la base d’intégration séparée | Rouvrir au dépassement de ce volume ou en cas de latence mesurée ; charge concurrente, budget 100k et coût de migration sur base de production non validés |
| REP-04 — Total après curseur | Clos après vérification SQL ; total stable sur trois pages, filtres et page devenue vide | Rouvrir si comptage, recherche, ordre ou périmètre de lecture change |
| REP-05 — Maintenabilité et tests | Clos sur le module ; liste sous 800 lignes, contrôles et reprise séparés, 112 tests du périmètre réussis | Conserver les régressions et le budget ; les échecs globaux hors module sont décrits dans le rapport |
| REP-06 — Numéro de page excessif | Clos après tests unitaires et navigateur ; normalisation bornée, Map, URL nettoyée | Rejouer les URL invalides et profondes lors d'un changement de navigation |
| REP-07 — Identité longue | Clos après contrôle navigateur ; pseudo de 80 caractères contenu dans sa cellule | Rejouer au changement de largeur, typo ou lien de ligne |
| REP-08 — Curseur invalide | Clos après contrôle navigateur ; Première page conserve les critères, Réessayer reste disponible | Rejouer les deux issues lors d'un changement d'erreur API |
| REP-09 — Ouverture directe profonde | Clos ; Première page sur curseur invalide, retour de fiche avec mêmes lignes/focus et rechargement en page 2 vérifiés sur Next/session réels le 11 octobre | Le précédent inconnu reste indisponible ; rouvrir lors d’un changement de routeur ou de stockage de navigation |
| REP-10 — Auteur de modification | Clos après contrôle navigateur ; survol, focus, Échap et auteur mobile vérifiés | Rouvrir si lien étendu, infobulle ou politique de visibilité évolue |
| REP-11 — Fuseau SQL et curseurs de date | Clos après reproduction puis correction sur PostgreSQL en Europe/Paris ; comparaisons explicites en UTC | Rejouer tris par date, égalités et exclusion d'une date future si schéma temporel ou requête change |
| REP-12 — Fraîcheur du préchargement | Clos ; snapshot consommé une fois et associé au compte/critères ; retour à la recherche après modification vérifié | Rouvrir si préchargement, rafraîchissement ou périmètre de session change |
| REP-13 — Données après retrait d’accès | Clos ; purge lignes/synthèse après 401/403, isolation du compte et de la révision des droits ; révocation réelle vérifiée | Rouvrir si gardes, UserContext ou cache évoluent ; pas de révocation instantanée par push revendiquée |
| REP-14 — Curseur et recherche de contact | Clos ; recherche trimée intégrée à la signature, deux reproductions SQL casse/accents corrigées | Rouvrir si normalisation/recherche change ; Première page reprend les anciens curseurs incompatibles |
| REP-15 — Courses et reprise de navigation | Clos ; saisie récente conservée, réponse obsolète ignorée, restauration consommée et focus annulé si filtre change | Rejouer réponses et URL retardées, retour fiche et rechargement après modification de navigation |
| REP-16 — Requêtes et mémoire évitables | Clos ; chargement lié au curseur actif, URL canonique, mémoire ≤ 64 même après 500 pages | Rejouer le budget mémoire et le nombre d’appels si pagination ou critères changent |
| REP-17 — Focus des actions disparues | Clos ; recherche après reset/retrait, résultats après retry réussi, bouton après nouvel échec ; Chromium vérifié | Rejouer au changement d’état vide, de chargement ou de commandes |
| REP-18 — Annonce des compteurs | Clos dans l’arbre Chromium ; types, absence et nombres annoncés | Rouvrir si cellules ou synthèse changent ; lecteur d’écran humain non exercé |
| REP-19 — Version lue des coordonnées | Clos ; refus d’une version périmée/future avant calcul métier et comparaison atomique conservée à l’écriture ; régressions des trois collections | Rejouer si plafonds, choix du principal ou protocole de version évoluent |
| REP-20 — Propriétaire du profil social | Clos ; migration additive appliquée et trois protections vérifiées, tests SQL et catalogue réel prêts | Rouvrir si un transfert de coordonnées devient un besoin métier ; ne pas contourner implicitement les triggers |

## Historique utile

| Date | Événement |
| --- | --- |
| 2026-10-12 | Audit propre à la création : REP-N01 à REP-N06 clos au périmètre vérifié ; 28 parcours simulés, onze parcours Next/session/PostgreSQL et seize SQL, reprise manuelle après réponse perdue sans garantie d'idempotence. |
| 2026-10-11 | Complément développement : service de liste extrait, schéma et règles SQL vérifiés, REP-19/REP-20 corrigés ; migration additive appliquée sans réécriture métier, 29 contrôles SQL et 1 135 tests web réussis. |
| 2026-10-11 | Audit complet de la liste : REP-12 à REP-18 corrigés et vérifiés ; 41 scénarios client simulés, neuf parcours réels, 38 mesures serveur jusqu’à 10k personnes ; REP-01/REP-03 clos dans cette portée, preuves liées au rapport du jour. |
| 2026-10-09 | Analyse complète A à Z de `/membres/repertoire`, création de ce suivi. |
| 2026-10-09 | Refactorisation : module CSS partagé unique, hero partagé, primitives de liste réutilisées, tokens globaux. |
| 2026-10-09 | Améliorations UX : total de résultats, pagination « sur N », suppression du lien dupliqué, recherche sans bouton redondant, cible mobile 44 px, libellé de correspondance explicite. |
| 2026-10-10 | Ajout de la Vue d'ensemble du répertoire, alignée sur `/systeme/utilisateurs` (composant `PersonOverview`, stats globales dans `listPersons`, rail `PageAsideLayout`). |
| 2026-10-10 | Alignement des comportements de liste : bouton Réinitialiser affiché aussi pour le tri, légende « N membre(s) trouvé(s) » avec séparateur de milliers. |
| 2026-10-10 | Focus clavier des lignes aligné sur les utilisateurs : couleur de l'anneau via le token `--ring` (`focus-within:ring-ring`). |
| 2026-10-10 | Audit ciblé : six défauts ouverts, 70/72 tests ciblés réussis, contrôle navigateur isolé à six largeurs ; preuves et limites conservées dans le rapport. Inventaire ancien explicitement marqué historique. |
| 2026-10-10 | Correction des six défauts et du décalage de fuseau SQL découvert sur base isolée ; 96 tests ciblés réussis, build réussi, contrôle navigateur corrigé ; vue d'ensemble mobile compactée et légende clarifiée. |
| 2026-10-10 | Quatre améliorations autorisées : synthèse compacte jusqu'au rail, recherche multi-mots, compteurs filtrants et reprise après fiche. Suite globale : 1 009 réussites, un échec préexistant hors module ; 15 scénarios PostgreSQL et navigateur isolé réussis, preuves ajoutées au rapport. |

## Modales — revue transverse du 11 octobre 2026

Coordonnées et suppression de fiche : brouillons et alertes de doublon conservés
après actualisation, verrous immédiats, erreurs persistantes et reprise avec les
versions de la personne et de sa coordonnée. Focus et confirmations imbriquées
vérifiés dans les composants réels avec API simulées.

[Décisions et questions communes](../../transverse/modales.md) ·
[Preuves et limites de l’audit](../../../audits/2026-10-11-modales.md).
Cette passe ne clôt pas les contrôles d’intégration encore ouverts de la page.

## Autocomplétion — correction du 11 octobre 2026

Recherche, création et coordonnées suivent la règle commune sans autocomplétion. Les indications email/téléphone contradictoires ont été retirées des champs partagés ; les zones de texte héritent aussi de la protection.

[Règle propriétaire](../../../design/README.md) ·
[Contrôles et limites des extensions](../../../audits/2026-10-11-autocompletion.md).
La présence des attributs d’exclusion ne garantit pas le comportement d’une
extension installée chez l’utilisateur.

## Barre de sections de la fiche — 11 octobre 2026

Identité et Coordonnées reprennent l'état actif et les angles de 6 px de
`PageSectionNavigation`, transmis par `EntityDetailLayout`. La barre conserve
ses vrais liens et gère le débordement dans le composant commun. Contrôle de
la fiche à 320, 390, 768 et 1 440 px dans Chromium isolé, avec données et
routeur simulés. [Règles communes](../../transverse/navigation-generale.md#barres-de-sections--décision-du-11-octobre-2026) ;
[preuves et limites](../../../audits/2026-10-11-navigation-sections.md).
Cette preuve de barre de fiche demeure simulée. REP-01 est depuis clos pour le
périmètre de liste et les parcours intégrés déclarés dans l’audit du 11 octobre ;
il ne certifie pas tous les comportements de la fiche.

## Changement de section après défilement — 12 octobre 2026

La [passe ciblée commune](../../transverse/navigation-generale.md#changement-de-section-après-long-défilement--revue-ciblée-du-12-octobre-2026)
vérifie Identité et Coordonnées dans Next réel. La confirmation d'abandon
conserve désormais le remplacement d'URL au lieu d'ajouter une entrée ;
« Rester » conserve brouillon, URL, position et focus. Le contenu cible reste
visible et le lien activé garde le focus. La fiche peut encore revenir au haut
du défilement pendant la transition Next : aucune garantie de barre toujours
collée n'est annoncée. NAV-08/NAV-09 et leurs preuves appartiennent au suivi
commun ; cette passe ne rejoue pas les mutations ni l'audit complet de la fiche.
