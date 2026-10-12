# Suivi — Répertoire des membres (`/membres/repertoire`)

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
  Voir le [rapport courant et ses limites](../../audits/AUDIT_REPERTOIRE_2026-10-11.md).
- Création et ouverture de fiche puis retour exercés avec persistance et audit
  réels le 11 octobre. Cette preuve ne réaudite pas tous les dialogues ni la
  suppression de la fiche. [Passe précédente](../../audits/AUDIT_REPERTOIRE_2026-10-10.md).
- Revue propre à la création du 12 octobre : reprises après résultat
  incertain, succès et navigation, disponibilité et composition du formulaire.
  **28 parcours client simulés, onze parcours Next/session/PostgreSQL et seize
  contrôles SQL réussis** ; REP-N01 à REP-N06 clos dans leur portée.
  Le retour filtré est aussi protégé pendant le chargement de la fiche,
  vérifié par régression de rendu serveur et transition HTTP ralentie réelle.
  [Rapport de création et limites](../../audits/AUDIT_CREATION_PERSONNE_2026-10-12.md).
  Les validations de la liste restent distinctes de ces preuves.
- Revue propre à la fiche du 12 octobre : identité, coordonnées, provenance,
  droits, versions et suppression. **Trente parcours client simulés, treize
  parcours HTTP avec connexion/MFA/PostgreSQL et trente scénarios SQL réussis**.
  REP-D01 à REP-D10 clos ou amélioration vérifiée dans leur portée ; compilation,
  types, lint et budgets finaux réussis. Cette passe reste distincte des succès
  précédents de la liste et de la création.
  [Rapport de fiche et limites](../../audits/AUDIT_FICHE_PERSONNE_2026-10-12.md).
- Références : intentions historiques `features/pages/vie-interne/membres*.md`,
  `features/pages/bureau-juridique/personnes-contacts.md` ; règles courantes
  `docs/references/NAVIGATION.md`, `docs/references/STRUCTURE.md`, `docs/references/ROLES_ET_PERMISSIONS.md`,
  `docs/references/PERMISSIONS.md` ; tokens `apps/web/src/app/globals.css`.

## Rôle de référence (décision du 2026-10-09)

### Complément courant — composants du 11 octobre 2026

- Recherche via `ListSearchField` : effacement avec retour du focus au champ.
  Les filtres utilisent les primitives partagées ; leur logique reste locale.
- `ListPagination` affiche la page des dernières lignes reçues, avec le total de
  pages disponible côté serveur. Attente ou erreur ne font pas avancer ce numéro.
  Le focus revient au début des résultats après une pagination réussie.
- Création et identité utilisent `SectionActionBar` avec soumission native.
  L'identité distingue brouillon et version serveur : relecture d'un conflit sans
  perdre les champs modifiés, erreur persistante, annulation vers la dernière
  version connue. Les gardes de réponses tardives avaient été vérifiées dans
  les scénarios isolés de cette passe ; la revue de fiche du 12 octobre
  réexamine leur composition avec le préchargement et le changement de compte
  dans REP-D01, après reproduction d'une ancienne réponse encore appliquée.
- Preuves et limites : [audit transverse](../../audits/AUDIT_COMPOSANTS_2026-10-11.md).
  API simulées ; ces corrections n'ont pas rejoué la session/base des anciens audits.

La description technique de la passe du 10 octobre ci-dessous est historique :
son champ de recherche local et sa mention « Page N sans total » ne définissent
plus le contrat courant. Le [catalogue](../../references/COMPOSANTS.md) porte
les composants à réutiliser.

### Référence visuelle

Décision utilisateur : `/membres/repertoire` est la **page de référence
visuelle et UX** de l'application, complétée par `/systeme/utilisateurs`
(2026-10-10) : les deux pages de liste définissent ensemble le standard des
composants partagés. Toute nouvelle page ou variante réutilise ces styles,
tokens, rythmes et primitives (tooltip, badge, tableau, contrôles, états
vides). Le [design system](../../references/DESIGN_SYSTEM.md) porte les règles
transverses et les sources à réutiliser ; les fiches, formulaires et tableaux
de bord adaptent leur composition à leur tâche. Les règles métier et filtres
du répertoire restent propres à ce module. Une disposition locale justifiée
compose les tokens et primitives communs.

Référence à réutiliser :

- Bandeau de page : `PageIdentityHero` (dégradé `--surface-hero-start/end`,
  bordure `--border-hero`, titre 23 px, description 11 px, action à droite).
- Liste : `DataTableSection` + module partagé `directory.module.css`
  (`--border-list`, `--surface-content`, rayon 10 px, en-tête
  `--surface-content-header`).
- Tableau : primitives `Table*` + surcouche du module (en-têtes 11 px, lignes
  zébrées `--surface-row-alternate`, survol `--surface-row-hover`).
- Badges : pastille + teinte sémantique (voir `PersonStatusBadge`) ; sinon la
  primitive `Badge`.
- Infobulle : primitive `TooltipContent` partagée, style flottant aligné sur
  les deux pages (fond `--surface-floating`, bordure `--border-control`, rayon
  7 px, texte `text-xs` (11 px dans l'échelle actuelle), ombre portée forte).
- Contrôles : `Input`, `Select`, `Button` ; champs 38 px, sélecteurs 220 px sur
  grand écran dans l'état actuel, rayons 6 px. Flèches de pagination hautes de
  30 px sur grand écran, cibles de 44 px sous 640 px via le module partagé.
- Retours : `ContentState` / `Empty` pour vide et erreur.
- Squelette : `PersonsDirectorySkeleton` (bandeau dégradé + os visibles
  `--surface-table-head`).
- Typographie : échelle dense 11/13/14 px (`--text-*`) ; sections espacées de
  18 px, paddings 16/20 px, rayons 10 px.
- Tokens : toutes les couleurs passent par `globals.css` ; aucun hex en dur
  dans les composants.

### Revue documentaire du 10 octobre 2026

Rôle de référence relié depuis AGENTS, l'index, la revue générale, les fiches
Q03/Q05 et le modèle de suivi.
Palette, typographie, rayons et distinction des rails ont été confrontés aux
composants actuels ; les consignes anciennes du design system ont été corrigées.
Portée légère : Q01, Q03, Q05, Q27 et Q30 examinés pour cette mise à jour documentaire ;
les autres sujets Q02, Q04, Q06–Q26 et Q28–Q29 sont hors impact sur le produit, dont
le code, les données et les permissions restent inchangés. Aucun nouveau test
fonctionnel ou visuel n'est revendiqué par cette revue des documents.
Contrôles réussis : relecture ciblée des règles et de leurs sources,
`bun run docs:check` (174 fichiers, 854 liens locaux et index) et
`git diff --check`. Les anciens rapports conservent leur portée historique.

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
[Complément du rapport](../../audits/AUDIT_REPERTOIRE_2026-10-11.md#complément--schéma-et-refactorisation-pendant-le-développement) ·
[Contrat Prisma/SQL](../../../packages/database/prisma/README.md).

### Fiabilité de la liste — 11 octobre 2026

- Le préchargement serveur appartient au compte et aux critères courants ; un
  snapshot n’est pas réinjecté quand on revient à une ancienne recherche.
  Un changement de compte ou de révision des droits reconstruit le contenu.
- Les réponses 401/403 retirent les lignes et la synthèse. Une panne ordinaire
  peut conserver les résultats précédents, signalés comme tels, avec reprise.
- Le numéro de page et ses actions correspondent aux dernières lignes reçues.
  Les réponses obsolètes et les anciennes URL ne remplacent pas une saisie plus
  récente ; une pagination invalide propose Première page sans perdre les filtres.
- URL nettoyée et critères bornés ; mémoire de 64 curseurs maximum, restauration
  valable 30 minutes pour le même compte et consommée après exécution. Le stockage
  reste facultatif. Changer les filtres annule un ancien focus de pagination.
- Réinitialiser, retirer Sans coordonnées et effacer rendent le focus à la
  recherche. Réessayer vise les résultats en cas de succès, son bouton en cas
  de nouvel échec. La barre de recherche reste utilisable après erreur initiale.
- Le curseur est lié au texte recherché trimé : les normalisations d’identité
  ne décrivent pas toutes les recherches de coordonnées. Après modification de
  ce contrat, certains anciens curseurs nécessitent Première page.
- Les liens de synthèse annoncent le nombre ; les types de coordonnées et leur
  absence sont explicités pour les technologies d’assistance. Le style, les
  avatars, badges, skeletons et primitives restent ceux de la référence.
- Mesures locales bonnes jusqu’à 10 000 fiches : aucun cache/index supplémentaire
  ajouté. La synthèse est globale et lue séparément ; elle ne promet pas un
  instantané transactionnel commun avec la liste lors d’une écriture simultanée.

[Audit, scénarios et limites](../../audits/AUDIT_REPERTOIRE_2026-10-11.md).

### Création de fiche — décisions du 12 octobre 2026

La page conserve quatre champs : pseudo principal, prénom, nom et statut dans
la structure. Un pseudo suffit ; sans pseudo, prénom et nom sont nécessaires.
Une fiche personne n'est ni un compte utilisateur, ni une adhésion, ni un rôle
daté. La date de naissance et les coordonnées se complètent dans la fiche.
Le statut proposé reste « Hors structure ». Aucun nouvel assistant ou champ
métier n'est ajouté par la revue.

- Après succès confirmé, la fiche reste créée même si son ouverture échoue :
  conserver le résultat et son lien, empêcher un nouveau POST, remplacer
  l'entrée de création dans l'historique lors de l'ouverture de la fiche.
- Une réponse perdue ne signifie pas que la création a échoué. Délai de
  30 secondes, conservation du brouillon, vérification du Répertoire dans un
  autre onglet puis confirmation avant nouvelle création sont les reprises
  retenues. Aucun rejeu automatique ni nouvelle table d'idempotence ; cette
  reprise manuelle ne garantit pas l'absence de doublon si la première
  commande a abouti.
- Les homonymes restent autorisés. Les alertes de doublon du service concernent
  seulement les coordonnées, absentes de ce formulaire minimal. Le traitement
  local d'alerte et son stockage sont retirés ; l'API des coordonnées conserve
  son contrat, sans nouvelle unicité du pseudo ou du nom.
- La barre `SectionActionBar` appartient à la page, après la carte dans le
  formulaire. Conserver la validation native, les erreurs liées aux champs,
  le verrou immédiat et le retour du focus après annulation ou erreur. Une
  création vierge reste soumettable pour faire apparaître sa validation ;
  l'état initial de la barre n'est pas en soi une anomalie de brouillon.
- Une indisponibilité technique pendant saisie ne doit pas effacer le
  brouillon ; le retrait de droit ou le changement de compte doit en revanche
  empêcher sa réutilisation dans une autre portée. La perte du pseudo après
  indisponibilité puis retour du service est reproduite avec contexte simulé ;
  le correctif conserve désormais le formulaire, sa saisie et son focus.

Vérification finale : **28 parcours client simulés et onze parcours
Next/session/PostgreSQL réels réussis**. La reproduction HTTP avant correction
créait deux fiches après perte de réponse ; après correction, l'absence de
répétition involontaire et la reprise après vérification sont contrôlées avec
la personne et son audit en base. Le banc serveur compte **16 cas SQL réels
et 53 tests existants réussis**, dont REP-N05 avant/après. La suite web compte
**1 236 réussis, 133 ignorés**, après ajout de la régression du squelette
REP-N06 ; sa transition ralentie est vérifiée en HTTP réel. Build, types,
lint et budgets d'architecture/performance passent. Voir le
[rapport du 12 octobre](../../audits/AUDIT_CREATION_PERSONNE_2026-10-12.md).

| Point | État et prochaine vérification |
| --- | --- |
| REP-N01 — Résultat inconnu et répétition | Clos côté client et HTTP : attente bornée, réponse perdue après commit sans second POST involontaire, vérification du Répertoire et reprise confirmée après panne avant envoi ; une reprise volontaire reste susceptible de créer un homonyme |
| REP-N02 — Succès et ouverture de fiche | Clos côté client : erreur de navigation, lien de reprise et absence de nouvelle création vérifiés |
| REP-N03 — Barre et retours du formulaire | Clos côté client : barre hors carte, six largeurs/faible hauteur et retours d'erreur vérifiés ; soumission initiale volontairement conservée |
| REP-N04 — Indisponibilité pendant saisie | Clos côté client : saisie et focus conservés après rétablissement, ancien formulaire retiré après changement de compte ou de droit |
| REP-N05 — Indices des coordonnées initiales | Clos après échec puis réussite du même scénario SQL : choix du principal social sans réordonner les entrées ; impact API uniquement, formulaire minimal inchangé |
| REP-N06 — Retour pendant chargement de la fiche | Clos après régression de rendu serveur et transition HTTP ralentie : aucun lien statique dans le squelette, retour filtré correct dès que la fiche est chargée |

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
[rapport dédié](../../audits/AUDIT_FICHE_PERSONNE_2026-10-12.md).

### Création de fiche — contrôle historique du 11 octobre 2026

`/membres/repertoire/nouveau` utilise maintenant `PageIdentityHero` compact,
avec les champs et le sélecteur de statut partagés. Le formulaire conserve sa
composition propre ; pseudo seul ou prénom et nom restent les règles métier.

- Le brouillon est comparé aux valeurs initiales : saisir puis effacer ne demande
  plus une confirmation inutile. Une navigation annulée restitue le focus.
- Un verrou synchrone empêche deux créations simultanées. Après succès, il reste
  actif jusqu’au départ vers la fiche ; la confirmation de perte de saisie est
  désactivée. Les réponses après démontage sont ignorées, et un changement de
  compte remonte le formulaire.
- Un refus de `sessionStorage` pour transmettre l’alerte de doublon ne transforme
  plus une création réussie en erreur : avertissement visible puis ouverture de
  la fiche. Le stockage de cette alerte reste facultatif.
- Un échec de création conserve les champs avec un message persistant ; les
  erreurs de validation ciblent le premier champ invalide.

[Preuve du 11 octobre](../../audits/AUDIT_PAGES_RESTANTES_2026-10-11.md) : quatre
largeurs, création simulée avec double soumission et stockage bloqué, saisie
effacée, navigation annulée/focus, validation et réponse 500. La suite web passe.
Cette passe simulée ne réauditait pas la liste et la fiche. Complément ultérieur
du même jour : création et trace en base avec session réelle vérifiées dans
l’[intégration Répertoire](../../audits/repertoire-2026-10-11/banc-integration/README.md).

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
(25 ignorés). [Preuves et limites du complément](../../audits/AUDIT_MENUS_2026-10-10.md#complément--présentation-des-sélecteurs-du-répertoire).
Contexte compte simulé, police de repli ; aucune session authentifiée, mutation
réelle ni compilation Next de production rejouée. Le remplacement du principal
est examiné dans le code, son dialogue n'est pas réexécuté dans ce complément.

### Règles métier

Le [contrôle transverse des menus du 10 octobre](../../audits/AUDIT_MENUS_2026-10-10.md)
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
  `SUJETS_FUTURS.md`.
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

## Améliorations autorisées le 2026-10-10

Après les corrections, « ok go » valide quatre améliorations : synthèse compacte
jusqu'au seuil du rail (118rem), recherche des mots d'identité dans les deux
ordres, compteurs qui ouvrent leur sous-ensemble global et retour de fiche avec
page, historique de curseurs et défilement conservés.

Les compteurs repartent en première page et remplacent recherche/filtres pour
que leur total corresponde aux résultats ; le tri est conservé. Le filtre
`contacts=missing` signifie aucun email, téléphone ni profil social. Il reste
visible et retirable dans la liste, et se combine ensuite avec recherche/statut.
La mémoire de navigation (`sessionStorage`) est limitée à un retour dans
l'onglet, liée au compte, ignorée après 30 minutes et bornée à 64 curseurs proches
de la page courante. Elle contient l'URL, les curseurs, la position et le lien
d'origine, sans copie des fiches ; ces URL/curseurs peuvent contenir des termes
d'identité ou de recherche et ne sont pas envoyés à un tiers. Le focus revient
au lien d'origine s'il est encore visible. Stockage bloqué, invalide ou expiré :
la navigation par URL et « Première page » restent utilisables. Un lien partagé
sans historique n'invente pas de curseur précédent.

## Synthèse courante — audit du 2026-10-10

Le [rapport daté](../../audits/AUDIT_REPERTOIRE_2026-10-10.md) conserve l'audit
initial puis la passe de correction autorisée par « corrige tous ». Les défauts
REP-04, REP-06 à REP-10 et le nouveau REP-11 sont corrigés et revérifiés sur leurs
scénarios. REP-05 est résolu pour ce module. Le navigateur utilise des données
fictives et les requêtes tournent sur un PostgreSQL temporaire distinct de la
base du site ; cela ne valide pas une session authentifiée complète ni la charge.

État actuel à distinguer de l'inventaire historique :

- `PageIdentityHero`, primitives de liste et styles partagés sont en place.
  Le tableau cède la place aux cartes sous 48rem de largeur de conteneur.
- La vue d'ensemble affiche des statistiques globales, indépendantes des
  critères de la liste. Elle se place avant la recherche quand le rail ne tient
  pas ; sa version compacte s'étend désormais jusqu'à 118rem. Mesures du banc
  isolé : environ 127 px à 1440 px et 146 px à 390 px, avec des liens d'au moins
  44 px. Les quatre compteurs sont des liens accessibles au clavier.
- La légende parle de « fiches trouvées », la colonne d'identité de « Personne ».
  Le total filtré est compté avant curseur dans la même requête, y compris quand
  la page devient vide. Les comparaisons temporelles sont explicitement en UTC.
- Le retour depuis une fiche et le rechargement récupèrent l'historique connu
  et la position lorsque le compte, l'URL et le curseur correspondent. « Première page »
  reste accessible pour un lien partagé ou un curseur invalide et conserve
  recherche, statut, coordonnées et tri. Les flèches sont inactives après une erreur de
  rafraîchissement ; les anciennes données restent signalées comme non actualisées.
- Le numéro d'URL accepte strictement les entiers de 1 à 1 000 000 ; au-delà,
  reprise en première page. L'historique est une Map des pages visitées, sans
  allocation proportionnelle à ce numéro. Les entrées incohérentes sont retirées
  de l'URL. Ce plafond de navigation n'est pas une limite du nombre de personnes.
- Les index de recherche existent dans le schéma et les migrations. REP-03
  porte sur leur mesure à volume et leur état déployé, pas sur l'ajout aveugle
  d'index supposés absents.
- Les captures corrigées ont été relues : pas de débordement global aux six
  largeurs testées, identité longue tronquée dans sa cellule, nom complet dans
  le lien et son titre, auteur accessible au survol/clavier et visible en mobile.
- `PersonListCells` porte les cellules spécifiques ; `PersonsListSkeleton` porte
  le chargement, réutilisé par le squelette de page. `PersonsListToolbar` porte
  les contrôles ; `usePersonsListNavigation` et `person-list-navigation` portent
  la reprise. `PersonsList` reste sous son budget de 800 lignes. Le titre
  d'onglet identifie le répertoire.

Questions à reprendre lors d'une modification de cette liste : le total reste-t-il
celui du jeu filtré sur toutes les pages ? Un lien partagé, actualisé ou retourné
depuis une fiche permet-il de repartir ? Toute entrée d'URL a-t-elle un coût
borné ? Les noms autorisés restent-ils lisibles sans cacher les autres cellules ?
Le lien de ligne préserve-t-il les interactions internes au clavier et au
pointeur ? Les chiffres globaux sont-ils distinguables des résultats filtrés ?
Le clic sur un compteur remplace-t-il bien les critères pour ouvrir tout son
sous-ensemble ? Le filtre de coordonnées reste-t-il visible, combinable et
retirable ? Les mots d'identité inversés et les caractères `%`, `_`, `\` sont-ils
bien traités ? Un retour de fiche restaure-t-il page, précédent, défilement et
focus sans réutiliser l'état d'un autre compte ou d'un autre instantané ?

## Inventaire A à Z (état constaté le 2026-10-09)

**Historique avant refactorisation.** Les dimensions, classes, limitations et
propositions de cet inventaire ne décrivent pas toutes l'état actuel. Utiliser
la synthèse ci-dessus et les points ouverts pour préparer une correction.

Statut de chaque constat : « Examiné dans le code » (aucun banc visuel ni
parcours réel rejoué pour cette trace). Un point marqué « à vérifier » attend
un contrôle navigateur, lecteur d'écran ou base réelle.

### Chaîne de rendu

1. `page.tsx` lit `searchParams` (Next 15), la session, parse
   `personsListQuerySchema`, calcule `getPersonCapabilities`, vérifie
   `assertPersonFeatureReady`, charge un instantané serveur via `listPersons`
   et le passe au client. Les erreurs serveur sont absorbées : le client
   conserve ses états indisponibles/nouvel essai.
2. `PersonsPageClient` gère refus d'accès, indisponibilité, squelette, puis le
   contenu. Le tout dans `AuthenticatedLayout` avec fil d'Ariane « Membres /
   Répertoire ».
3. `PersonsList` porte la recherche, les filtres, l'état de pagination, les
   états vide/erreur et le tableau. Le style est entièrement dans le module CSS
   local, pas dans les primitives partagées.

### Bandeau d'identité (hero)

- Conteneur `header.hero` : dégradé 110° `#2b3c57 → #1d2a3f` (75 %), bordure
  `#4b6285`, rayon 10 px, padding 19/20 px, `flex-wrap`.
- Icône `Users` dans un carré 40 × 40 px, icône 27 × 27 px, couleur
  `var(--primary-emphasis)`.
- Titre `h1` : 23 px, line-height 1.3, graisse 650, letter-spacing −0.025em.
- Description `p` : « Profils, coordonnées et statut dans la structure. »,
  11 px, `#9cacc6`.
- Action « Ajouter une fiche » : `Link` brute stylée par le module (fond
  `--primary`, texte `#091321`, 11 px, graisse 600, min-height 36 px), pas la
  primitive `Button`.
- Mobile ≤ 639 px : padding 16 px et `margin-left: 53px` sur le bouton
  (magic number destiné à l'aligner sous le titre, fragile).

### Vue d'ensemble

- Composant partagé `features/persons/components/PersonOverview.tsx`, construit
  sur `directory.module.css` (`overviewCard`, `overviewHeader`), comme
  `UsersOverview` de la page des utilisateurs. Rendu dans le rail droit de
  `PageAsideLayout` (largeur 16 rem, soit 256 px) ; sous ~118 rem, il se place
  entre le hero et la liste.
- Carte `aside` : en-tête « Vue d'ensemble », total « Total des fiches » en
  24 px, puis deux groupes à petites capitales — « Statut » et « Statistiques ».
- Lignes du groupe Statut : « Dans la structure » (pastille `success`, badge
  vert de la liste) et « Hors structure » (pastille `warning`, badge ambre).
- Ligne « Sans coordonnées » (pastille `info`) : fiches sans email, téléphone
  ni profil social.
- Les chiffres sont **globaux**, indépendants de la recherche, du filtre et du
  tri ; le total près des filtres reste **filtré**. Contrat : `overview` dans
  `PersonsListResponse`, calculé par `listPersons` (trois comptages Prisma).
- États : squelette pendant le premier chargement, valeurs conservées pendant
  une actualisation (comportement identique aux utilisateurs).

### Barre d'outils (recherche, filtres, tri)

- Formulaire `role="search"`, libellé accessible « Rechercher et filtrer les
  membres ».
- Champ de recherche : `Input` locale, hauteur 38 px, icône `Search` absolue,
  placeholder « Pseudo, nom ou coordonnée… », `maxLength` 100, debounce 300 ms.
  Bouton d'effacement quand il y a du texte, sinon bouton d'envoi avec icône
  `ChevronRight` (sémantiquement « aller », pas « loupe »).
- Deux `Select` Radix via un wrapper local `DirectorySelect` : statut
  (« Tous les statuts », « Dans la structure », « Hors structure ») et tri
  (« Nom (A–Z) », « Ajoutées récemment », « Modifiées récemment »). Trigger
  170 × 38 px, 11 px.
- Bouton « Réinitialiser les filtres » (icône seule, 38 × 38 px) visible dès
  qu'une recherche, un statut ou un tri non défaut est actif — même condition
  que la liste des utilisateurs. Il réinitialise aussi le tri. Recherche à
  gauche, filtres et bouton Réinitialiser regroupés à droite (l'espace vide
  reste entre la barre de recherche et les filtres).
- Légende : « N membre(s) trouvé(s) · Actualisation… » + « 25 par page », avec
  séparateur de milliers, alignée sur la liste des utilisateurs. Le « N » est
  le total filtré côté serveur.

### Tableau

- `table-layout: fixed`, colonnes 130 px (statut), 220 px (coordonnées),
  150 px (dernière modification), le reste en membre. `caption` masquée
  « Les fiches du répertoire, leur statut et leurs coordonnées ».
- En-têtes : « Membre », « Statut », « Coordonnées », « Dernière
  modification », 11 px, graisse 500, `#c7d5ea`.
- Cellule membre : avatar DiceBear carré 36 × 36 px (bordure `#3b4f6d`, fond
  `#0d1523`), nom 13 px graisse 600, sous-ligne « Trouvée grâce à une
  coordonnée » (verte `#80ddba`) quand la recherche a matché un contact.
- Le lien du nom étend sa zone de clic sur toute la ligne via un pseudo-élément
  `position: absolute; inset: 0`.
- Cellule statut : `PersonStatusBadge` (pastille + texte, tokens
  `success`/`warning`), partagée avec la fiche.
- Cellule coordonnées : badge « N coordonnée(s) » (fond `#263f68`, bordure
  `#4a70a8`, texte `#aecfff`) puis compteurs email/téléphone/profil avec icônes
  `Mail`, `Phone`, `Share2`. Zéro coordonnée : tiret « — ».
- Cellule dernière modification : date/heure formatées `fr-FR`, infobulle
  « Modifiée par X (login) » quand un acteur est connu. Lien séparé vers la
  fiche, au-dessus de la zone de clic de la ligne (`z-index: 2`).

### Pagination

- « Page N » + boutons précédent/suivant seulement. Pas de total ni de « sur M ».
  Précédent/suivant désactivés selon `hasMore`/`nextCursor` et l'état de
  chargement.
- URL : `?q`, `?structureStatus`, `?sort`, `?page` (1-based) et `?cursor`.
  Le changement de filtre utilise `router.replace`, la pagination `router.push`
  (retour navigateur possible entre pages, pas entre états de filtre).

### États

- Chargement initial : squelette « Chargement du répertoire ».
- Refus : « Accès refusé » / « Vous n'avez pas la permission de consulter le
  répertoire. » / « Retour à l'accueil ».
- Indisponible : « Répertoire temporairement indisponible » / « Revérifier ».
- Erreur initiale : « Chargement impossible » + message brut d'erreur +
  « Réessayer ».
- Erreur d'actualisation : « Actualisation impossible » + « Les résultats
  précédents restent affichés. » + « Réessayer » (les données restent visibles,
  opacité 55 % pendant le rechargement).
- Vide filtré : « Aucune fiche trouvée » / « Essayez une autre recherche ou
  retirez les filtres. » / « Réinitialiser les filtres ».
- Vide complet : « Répertoire vide » / « Créez la première fiche pour commencer
  le répertoire. » / « Ajouter une fiche » (si permission).

### Responsive

- `container-type: inline-size` sur la liste, requêtes à 740 px et 450 px :
  recherche pleine largeur, tableau transformé en grille (identité pleine
  largeur, statut + coordonnées sur une ligne avec retrait de 46 px, dernière
  modification pleine largeur), en-têtes de tableau masquées visuellement.
- Sélecteurs pleine largeur sous 450 px, padding resserré.
- `prefers-reduced-motion` : transitions du champ et du bouton icône
  neutralisées ; le reste est couvert par la règle globale.

### Textes exacts

Voir la liste ci-dessus. Points de formulation à surveiller : « email(s) »,
« téléphone(s) », « profil(s) social(aux) » sont des pluriels lourds ;
« coordonnée(s) » idem.

### Typographie exacte (valeurs en dur)

11 px (description, bouton hero, en-têtes, légende, dernière modification,
pagination), 12 px (champ, options), 13 px (nom), 10 px (sous-ligne, compteurs,
chips), 14 px (titre d'état vide), 23 px (titre hero). La balance des 11/13/14 px
correspond à l'échelle `--text-xs/sm/base` de `globals.css`, mais les valeurs
sont répétées en dur et 10/23 px sortent de l'échelle.

### Couleurs et tokens

Le module déclare des tokens locaux `--m-*` reliés aux tokens globaux
(bonne intention), mais conserve de nombreux hex en dur :

| Usage | Valeur actuelle | Proposition |
| --- | --- | --- |
| Bordure de la liste | `#435978` | token de bordure de contenu |
| Bordure du hero | `#4b6285` | `--border-default` ou dédié |
| Dégradé du hero | `#2b3c57 → #1d2a3f` | token de surface de hero |
| Description du hero | `#9cacc6` | `--text-muted` |
| Texte accentué divers | `#b2c8ef`, `#bcd1fa`, `#a9bddc`, `#b5c7e5`, `#dce6f7`, `#e5ecfa` | `--text-secondary` / `--text-primary` |
| Fond menu select | `#121d2d`, survol `#273b5b` | `--surface-floating`, `--surface-navigation-hover` |
| Chips de filtre | `#1d2c43`, bord `#435777`, texte `#bdcef0` | `--surface-inset`, `--border-default`, `--text-secondary` |
| Badge coordonnées | fond `#263f68`, bord `#4a70a8`, texte `#aecfff` | token sémantique « externe » |
| Avatar | bord `#3b4f6d`, fond `#0d1523` | `--border-default`, `--surface-inset` |
| Focus local | `#8eaff2` | `--ring` (déjà global) |
| Points de statut | `#80ddba` (actif), `#aecfff` (externe) | tokens sémantiques nommés |

### Dimensions et placement

Répertoriées dans l'inventaire ci-dessus. Les rayons 5–10 px locaux coexistent
avec l'échelle `--radius` globale ; le module ne consomme pas `--radius`.

## Ce qui est bon (à conserver)

Appréciation historique du 2026-10-09 ; l'audit du 2026-10-10 précise les limites
de pagination et d'accessibilité découvertes depuis.

- Le parti pris visuel : fond ardoise nuit, panneaux bleu acier, dégradé du
  bandeau, densité compacte 11/13/14 px, accents bleus. C'est la référence
  validée, à préserver à l'identique lors de toute refonte.
- Préchargement serveur de la première page (pas de flash de chargement),
  validation Zod côté page et côté API, erreurs serveur non bloquantes.
- Recherche sans frappe serveur (debounce), filtre/tri portés par l'URL,
  pagination par curseur stable, annulation des requêtes obsolètes
  (`AbortController`).
- Accessibilité déjà soignée : `role="search"`, `aria-live` sur la légende,
  `aria-busy`, libellés accessibles sur les contrôles, `time` + infobulle sur
  la modification, état vide/erreur distincts.
- Avatar DiceBear déterministe et local (aucune dépendance réseau), badge de
  statut partagé avec la fiche.

## Améliorations proposées

Propositions historiques du 2026-10-09, en partie appliquées ensuite. Cette
section n'est pas la liste actuelle des travaux à faire. En particulier, la
mention d'index absents au point 14 est contredite par le schéma actuel ; la
navigation profonde du point 15 demande une voie de reprise (REP-09).

### Priorité haute : réutiliser les composants et les tokens déjà en place

1. **Remplacer le hero local par `PageIdentityHero`** (`$components/layout/PageIdentityHero`),
   déjà utilisé par l'accueil, les paramètres, la feuille de route et la liste
   des utilisateurs. Il est l'extraction officielle du hero du Répertoire ;
   supprimer la copie locale `.hero` du module et le hack `margin-left: 53px`.
2. **Réutiliser la brique de table partagée** : `$ui/table`,
   `$ui/data-table-section` (tableau desktop + liste mobile + pagination + état
   vide), `$ui/pagination`, `$ui/empty`, `$ui/alert`/`ContentState`, comme le
   fait déjà `features/users/UsersListPage.tsx`. La liste du Répertoire
   réimplémente aujourd'hui tout cela dans un module CSS dédié.
3. **Décider la liste canonique** : le tableau du Répertoire (validé) et celui
   des Utilisateurs (partagé) ont des fonds, rayons et paddings légèrement
   différents (`surface-content` vs `surface`, rayons 10 vs 12 px, densité
   propre). Choisir une seule référence de liste, l'exprimer en tokens, puis
   l'appliquer aux deux. Ne pas garder deux « tableaux » parallèles.
4. **Supprimer les hex en dur du module** au profit des tokens globaux
   (table ci-dessus). Promouvoir au besoin trois ou quatre tokens sémantiques
   manquants (dégradé de hero, bordure de liste, teinte « externe »), au lieu
   de laisser des couleurs dispersées.
5. **Alignement de la primitive** : « Ajouter une fiche » et la pagination
   devraient consommer `Button` (variantes `default`/`ghost`/`outline`) au lieu
   de liens/boutons restylés à la main ; le focus doit repasser sur `--ring`.

### Priorité moyenne

6. **Typographie** : basculer 11/12/13/14 px vers `--text-*` (ou les utilitaires
   Tailwind correspondants) et normaliser les cas 10 px et 23 px (10 → échelle
   dédiée, 23 → `text-2xl` de l'échelle 22 px, ou ajouter une étape).
7. **Total de résultats** : la légende « N membres affichés » compte la page,
   pas le total. Soit ajouter un total au contrat de liste (`pagination.total`),
   soit reformuler (« 25 fiches sur cette page ») et laisser « Page N » parler
   seule. Un total est utile en gestion réelle.
8. **Statut de structure binaire** : `IN_STRUCTURE`/`OUTSIDE_STRUCTURE` et un
   badge à deux tons ne tiendront pas l'évolution association → société
   (salarié, bénévole, prestataire, joueur, staff, ancien…). À cadrer dans le
   modèle (relations datées et historique) plutôt que d'empiler des statuts.
9. **Libellés** : remplacer « email(s) », « téléphone(s) », « profil(s)
   social(aux) » par des pluriels propres ; icône du compteur social (`Share2`
   réutilisé deux fois) à distinguer du total des coordonnées.
10. **Titre d'onglet** : la page n'a pas de métadonnées propres (onglet générique
    « Noctambule · Dev »). Ajouter un `generateMetadata` (« Répertoire ·
    Noctambule »), comme le prévoit le suivi de navigation.

### Priorité basse / à surveiller

11. **Mobile** : la ligne masque les en-têtes du tableau sans reporter
    d'association de colonnes ; le contenu s'auto-décrit en partie, mais un
    `data-label` ou un libellé visible renforcerait la lecture. Cible tactile
    « Ajouter une fiche » à 36 px (< 44 px).
12. **Deux liens par ligne** (nom et dernière modification) vers la même fiche :
    acceptable, mais à annoncer clairement ou à fusionner pour les lecteurs
    d'écran.
13. **Message d'erreur brut** affiché à l'utilisateur : préférer un libellé
    stable + détail technique séparé.
14. **Performance** : la recherche utilise des `LIKE` préfixe/`%terme%` sans
    index dédié. Correct au volume actuel ; à mesurer avant une grosse base.
15. **Navigation directe profonde** : un lien direct vers une page > 1 sans les
    curseurs précédents empêche de remonter (comportement correct d'une
    pagination par curseur), à documenter si des partages d'URL deviennent
    fréquents.

## Refactorisation appliquée (2026-10-09)

Appliqué à la demande de l'utilisateur, sans changer la logique métier :

- Les deux modules CSS quasi identiques `PersonsDirectory.module.css` et
  `UsersDirectory.module.css` sont fusionnés en un seul module partagé
  `components/ui/directory.module.css`, consommé par la liste des membres et la
  liste des utilisateurs. Le « bandeau liste » est désormais une seule source.
- `PersonsPageClient` utilise `PageIdentityHero` (le hero local et son hack
  `margin-left: 53px` sont supprimés).
- `PersonsList` utilise les primitives partagées `DataTableSection`,
  `Table*`, `ContentState`, `Button`, `Input`, `Select` — comme la liste des
  utilisateurs. Les cellules spécifiques (identité, coordonnées, dernière
  modification) passent en utilitaires Tailwind adossés aux tokens.
- Tokens ajoutés dans `globals.css` : `--surface-hero-start/end`,
  `--border-hero`, `--text-hero-muted`, `--border-list`,
  `--surface-external`, `--border-external`, `--text-external`. Le focus local
  du module est retiré au profit de `--ring`. `PageIdentityHero.module.css`
  consomme désormais les tokens globaux.
- Contrat de source `person-search-ux.test.ts` actualisé (import et classes du
  module partagé).

**Vérifications** : `tsc --noEmit` réussi, ESLint des fichiers modifiés réussi,
`next build` réussi. Suite de tests : 968 réussis, 2 en échec — les deux se
situent dans `person-pages-permissions.test.ts` sur la page
`/membres/repertoire/nouveau`, fichiers non modifiés par cette passe (échec
préexistant lié au rendu `Suspense`/`useSearchParams` en markup statique).
Contrôle navigateur (Chromium headless, session jetable) : titre, bouton
« Ajouter une fiche », 2 lignes, recherche, filtres et légende présents ; aucun
débordement horizontal à 1440 px ni à 390 px. Styles calculés conformes :
hero en dégradé `#2b3c57 → #1d2a3f`, bordure `#4b6285`, rayon 10 px ; carte de
liste `#172333` en rayon 10 px ; en-têtes de tableau à 11 px. Captures
desktop/mobile conservées pour relecture à l'œil.

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
| REP-02 — Évolution du statut de structure | Cadrage différé ; modèle et parcours long terme | Lire STRUCTURE.md avant tout nouveau statut ; conserver personnes et relations datées séparées |
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

[Décisions et questions communes](modales.md) ·
[Preuves et limites de l’audit](../../audits/AUDIT_MODALES_2026-10-11.md).
Cette passe ne clôt pas les contrôles d’intégration encore ouverts de la page.

## Autocomplétion — correction du 11 octobre 2026

Recherche, création et coordonnées suivent la règle commune sans autocomplétion. Les indications email/téléphone contradictoires ont été retirées des champs partagés ; les zones de texte héritent aussi de la protection.

[Règle propriétaire](../../references/DESIGN_SYSTEM.md) ·
[Contrôles et limites des extensions](../../audits/AUDIT_AUTOCOMPLETION_2026-10-11.md).
La présence des attributs d’exclusion ne garantit pas le comportement d’une
extension installée chez l’utilisateur.

## Barre de sections de la fiche — 11 octobre 2026

Identité et Coordonnées reprennent l'état actif et les angles de 6 px de
`PageSectionNavigation`, transmis par `EntityDetailLayout`. La barre conserve
ses vrais liens et gère le débordement dans le composant commun. Contrôle de
la fiche à 320, 390, 768 et 1 440 px dans Chromium isolé, avec données et
routeur simulés. [Règles communes](navigation-generale.md#barres-de-sections--décision-du-11-octobre-2026) ;
[preuves et limites](../../audits/AUDIT_NAVIGATION_SECTIONS_2026-10-11.md).
Cette preuve de barre de fiche demeure simulée. REP-01 est depuis clos pour le
périmètre de liste et les parcours intégrés déclarés dans l’audit du 11 octobre ;
il ne certifie pas tous les comportements de la fiche.
