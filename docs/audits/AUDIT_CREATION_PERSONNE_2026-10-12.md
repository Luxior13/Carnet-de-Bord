# Création d'une personne — revue complète du 12 octobre 2026

## Périmètre et départ

Route `/membres/repertoire/nouveau`, formulaire d'identité essentielle,
validation, navigation, reprise après échec, permissions et création avec
audit via `/api/personnes`. Départ propre au commit `5706bba`, projet en
développement. Le [suivi du Répertoire](../qualite/pages/membres-repertoire.md)
conserve les décisions courantes ; la revue de liste du 11 octobre et ses
preuves restent distinctes.

Sources principales : [page](../../apps/web/src/app/membres/repertoire/nouveau/page.tsx),
[formulaire](../../apps/web/src/features/persons/components/PersonCreateForm.tsx),
[API](../../apps/web/src/app/api/personnes/route.ts) et
[service de création](../../apps/web/src/features/persons/server/person-core.service.ts).

Le résultat attendu est une fiche personne, sans création de compte utilisateur,
adhésion, équipe ou engagement. Un pseudo suffit ; à défaut, prénom et nom
sont nécessaires. Le statut initial peut être « Dans la structure » ou
« Hors structure », ce dernier étant proposé par défaut. Coordonnées et date
de naissance se complètent dans la fiche ; aucun champ supplémentaire n'est
nécessaire au parcours actuel.

## Sélection de la revue générale

| Sujets | Classement et justification |
| --- | --- |
| Q01–Q04 | À examiner : identité minimale, arrivée depuis la liste, sortie vers la fiche, composition, clavier, erreurs et focus |
| Q05 | Hors impact sur la liste : seul le contexte de retour et une recherche de vérification après résultat incertain utilisent le Répertoire ; aucun filtre ou tri de liste à modifier |
| Q06–Q07 | À examiner : vrai formulaire, validations, brouillon, verrou, attente, refus, succès et résultat inconnu |
| Q08 | Non applicable : aucun destinataire ou événement différé à notifier ; la trace de création est un audit |
| Q09–Q11 | À examiner : création autorisée, retrait de droit ou changement de compte, identité personnelle et absence de conservation inutile dans le navigateur |
| Q12 | À examiner : identité minimale, normalisation et statut conservés dans Person ; personne distincte du compte et des relations métier futures |
| Q13 | Hors impact : aucune migration ou modification du schéma pour la reprise du formulaire ; migrations existantes appliquées aux bases de preuve |
| Q14–Q15 | À examiner : répétition du POST, résultat ambigu, transaction de création et audit obligatoire |
| Q16 | Non applicable au cycle de vie métier : aucune fiche supprimée ; seul le traitement local d'alerte de doublon sans scénario réel est retiré |
| Q17–Q18 | Hors impact sur les agrégations et la charge de liste ; délai de requête et absence de rejeu automatique examinés, aucun cache ou index ajouté sans besoin |
| Q19 | À examiner : responsabilités de la page, du formulaire, de l'API et des composants partagés ; simplification locale plutôt qu'un moteur de formulaire |
| Q20–Q24 | Non applicables : pas de pièce, import, export, date saisie, traitement différé, engagement ou gouvernance dans cette création minimale |
| Q25 | À examiner : fiche personne indépendante d'un compte, pseudo et identité civile facultatifs selon la règle minimale, homonymes permis |
| Q26 | Non applicable : aucun montant, contrat ou paiement |
| Q27 | À examiner : reproductions, composants réels avec simulation, transaction SQL et parcours HTTP distingués |
| Q28–Q29 | Hors impact sur exploitation, sauvegarde et conservation ; disponibilité du module examinée pour éviter une perte de brouillon |
| Q30 | À examiner : décisions, suivis et limites des preuves ; aucune dépendance ajoutée |

## Éléments et choix retenus

| Élément | Choix et raison |
| --- | --- |
| Cadre et titre | `AuthenticatedLayout`, `PageShell` de largeur formulaire, `PageCanvas` et `PageIdentityHero` compact ; pas de variante visuelle locale |
| Identité | `PersonIdentityFields`, `Input` et `Label` partagés : pseudo 80 caractères, prénom et nom 100 chacun, aides et erreurs associées ; autocomplétion désactivée selon la règle commune |
| Statut | `Select` compact, deux valeurs nommées ; ce choix décrit une position dans le Répertoire, pas une adhésion ni un droit d'accès |
| Validation | Schéma partagé strict, espaces extérieurs normalisés, règle pseudo ou prénom + nom ; validation serveur indépendante du navigateur |
| Commandes | `SectionActionBar` après la carte dans le formulaire, avec soumission native et verrou synchrone ; ne pas enfermer la barre portée par la page dans la carte |
| Départ avec saisie | `useUnsavedNavigationGuard` et `UnsavedNavigationDialog` ; retour sûr limité au Répertoire, focus restitué si le départ est annulé |
| Création confirmée | Conserver l'identifiant retourné et le verrou, ouvrir la fiche avec remplacement de l'entrée de création dans l'historique ; proposer un lien si la navigation n'aboutit pas |
| Réponse perdue | Expliquer l'incertitude, conserver la saisie, proposer la vérification du Répertoire dans un autre onglet, puis demander confirmation avant une nouvelle création |

Les homonymes sont autorisés. Le service ne recherche les doublons que dans
les coordonnées email, téléphone et profil social, avec avertissement non
bloquant. Le formulaire actuel n'envoie aucune coordonnée : son ancien
traitement de cette alerte et son stockage local n'avaient pas de scénario
réel. Leur retrait local ne supprime pas le contrat de l'API pour les
coordonnées, et ne crée pas une unicité du pseudo ou du nom.

La reprise d'un résultat incertain ne devient pas une garantie d'idempotence.
Décision du 12 octobre : aucune nouvelle table ou clé d'idempotence pour ce
formulaire ; aucun rejeu automatique. La personne qui utilise le formulaire
vérifie le Répertoire avant de confirmer une nouvelle création, qui reste
susceptible d'ajouter un homonyme si la première demande avait abouti.

## Constats et état des corrections

| ID | Nature et scénario | Traitement retenu | État |
| --- | --- | --- | --- |
| REP-N01 · P2 | Le POST n'avait pas de délai ni signal d'annulation ; une perte de réponse réactivait le bouton comme après un refus certain. Le banc réel confirme deux fiches créées après perte de la première réponse, puis deuxième soumission. | Délai de 30 secondes, annulation à la sortie, résultat inconnu distinct, saisie conservée, vérification manuelle puis confirmation explicite avant nouvelle tentative. Après correction, perte après commit : une fiche, aucun second POST involontaire ; panne avant envoi : une fiche après reprise confirmée. Une annulation réseau ne promet pas l'annulation d'un commit serveur. | Clos après vérification client et HTTP |
| REP-N02 · P2 | La navigation après succès était dans le même bloc d'erreur que le POST : une erreur d'ouverture pouvait être présentée comme un échec de création et libérer le verrou. | Séparer résultat confirmé et navigation, conserver un lien vers la fiche, remplacer l'entrée de création dans l'historique ; aucune seconde création depuis le succès confirmé. Erreur de navigation et stockage bloqué exercés dans Chromium. | Clos après vérification client |
| REP-N03 · P2 | La barre de page était enfermée dans la carte. Après erreur 500, le focus revenait au document plutôt qu'à un retour permettant de reprendre. | Barre après la carte, retours locaux et généraux focalisables, validation réévaluée lors de la correction des champs. Six largeurs, clavier et faible hauteur vérifiés. | Clos après vérification client |
| REP-N04 · P2 | Une indisponibilité explicite du module, confirmée après ouverture du formulaire, remplaçait celui-ci par un état de page. Son retour disponible remontait un formulaire neuf ; le pseudo saisi disparaît dans le banc avant correction. | Formulaire conservé avec alerte de disponibilité et envoi désactivé ; le retrait de droit ou changement de compte continue de retirer l'ancien formulaire. Saisie, focus et réponses tardives vérifiés avec contexte simulé. | Clos après vérification client |
| REP-N05 · P2 | Dans l'API de création avec coordonnées initiales, des réseaux sociaux intercalés étaient regroupés lors du choix des principaux. Un avertissement pouvait désigner l'indice d'un autre élément : `socialProfiles.2.identifier` au lieu de `.1.identifier`. Le formulaire minimal ne collecte pas ces réseaux. | `normalizeInitialSocialPrimaries` conserve l'ordre d'entrée tout en choisissant le principal par réseau. Échec SQL avant correction, puis même scénario réussi ; correspondances par identifiant déjà correctes, aucune fuite d'une autre identité constatée. | Clos après vérification SQL |
| REP-N06 · P2 | Pendant le chargement de la fiche après création, le fil d'Ariane proposait un lien statique vers la racine du Répertoire. Le suivre pendant cette transition perdait le contexte filtré de retour. | Le squelette conserve le libellé Répertoire sans lien ; la fiche chargée rétablit le vrai lien contextuel sécurisé. Régression de rendu serveur avant/après, puis transition Next réellement ralentie par verrou PostgreSQL : aucun lien statique pendant l'attente, bon retour filtré après libération. | Clos après vérification du rendu et HTTP |

Les branches ont d'abord été examinées au code, puis le banc client a
reproduit quatre observations : seconde requête après erreur réseau,
focus perdu après erreur 500, barre dans la carte,
et perte de saisie après indisponibilité puis retour du service. Ces
reproductions utilisent une API, une session et des disponibilités simulées ;
elles ne démontrent pas à elles seules un second commit réel en base. Les
[résultats avant correction](creation-personne-2026-10-12/banc-client/preuves/avant-4.json)
et le [protocole client](creation-personne-2026-10-12/banc-client/README.md)
précisent ces limites ; `pass` y signifie que le défaut attendu a été reproduit.

La mesure initiale `data-dirty=true` de la barre est conservée dans l'archive,
mais n'est pas qualifiée comme un défaut autonome. Une création vierge doit
pouvoir être soumise pour montrer sa validation ; la barre garde son contrat
de création et son comportement collant quand l'espace le permet. Le défaut
de composition était son parent carte, pas l'absence de saisie initiale.

Une [reproduction HTTP distincte](creation-personne-2026-10-12/banc-integration/avant-integration.json)
confirme ensuite REP-N01 sur Next et PostgreSQL isolé : le premier POST a
réellement créé sa fiche avant que le navigateur perde la réponse, puis le
second POST a créé une autre fiche de même pseudo. La panne de transport est
injectée ; les deux commits sont réels. Après correction, le même type de
panne conserve une seule fiche et bloque la reprise non confirmée ; le lien
de vérification retrouve la fiche dans un autre onglet sans perdre la saisie.

## Vérifications de cette passe

| Contrôle | Résultat et portée |
| --- | --- |
| Lecture indépendante | Route, formulaire, champs partagés, schéma, retour sûr, disponibilités et transaction examinés ; séparation personne/compte et absence de dédoublonnage par identité confirmées au code |
| Tests ciblés UI existants | **41 tests réussis**. L'assertion de structure figée sur la création a été retirée du test partagé, qui suit désormais la fiche identité ; les comportements de création sont exercés dans le navigateur |
| Navigation du squelette et contrats voisins | **26 tests ciblés réussis**, dont une nouvelle régression dans [person-loading-navigation](../../apps/web/src/__tests__/person-loading-navigation.test.ts), avec vrai squelette et vrai fil d'Ariane, cadre simulé ; avant/après vérifié |
| Navigateur client avant correction | Quatre observations reproduites le 12 octobre à 19 h 33, Europe/Paris, avec composants et CSS réels, API/session/navigation simulées |
| Navigateur client après correction | **28 scénarios réussis** à 19 h 40, Europe/Paris ; [protocole et limites](creation-personne-2026-10-12/banc-client/README.md), [résultats](creation-personne-2026-10-12/banc-client/preuves/apres-28.json) |
| Serveur et PostgreSQL isolé | **69 tests réussis : 16 PostgreSQL réels et 53 existants**, sur six fichiers. Permissions, validation, homonymes, coordonnées, mutation/audit et rollback ; [protocole](creation-personne-2026-10-12/banc-serveur/README.md) et [résultats](creation-personne-2026-10-12/banc-serveur/observations.json) |
| Next avec session et base réelles | **11 parcours réussis** après les dernières corrections, dont le chargement ralenti de la fiche ; [résultats](creation-personne-2026-10-12/banc-integration/resultats.json), [protocole](creation-personne-2026-10-12/banc-integration/README.md), [script](creation-personne-2026-10-12/banc-integration/run.cjs). Avant correction : doublon après réponse perdue reproduit |
| Suite web complète | **1 236 tests réussis**, 133 ignorés ; 102 fichiers réussis, 8 ignorés. Les 16 nouveaux cas SQL sont ignorés dans cette commande standard sans variable dédiée, mais ont été exécutés séparément dans le banc serveur |
| Types, lint et build | Réussis après les dernières corrections, y compris REP-N06 ; Next 15.5.23 en production |
| Budgets d'architecture et de performance | Réussis ; route de création à **317 721 octets gzip**. Ce budget ne mesure pas la latence ou la capacité SQL |
| Documentation | `bun run docs:check` réussi : **236 fichiers, 1 553 liens** ; les six tests du contrôleur documentaire réussissent également |

Le banc client exerce **320, 390, 768, 1 024, 1 440 et 1 920 px**, plus
390 × 500 px, les textes maximaux, le menu de statut au clavier et la
validation native par Entrée. Les scénarios couvrent double soumission,
changement de compte ou de droit pendant le POST, conservation du brouillon
après panne du service, retour sûr et garde de départ. Réseau coupé, 500 et
JSON invalide produisent une alerte focalisée, la saisie verrouillée et aucun
nouveau POST avant confirmation. Un refus 4xx de la reprise ne transforme
pas l'issue de la première demande en échec certain.

Le délai de 30 secondes est accéléré à 100 ms dans ce banc : la transition
vers l'incertitude est testée, pas trente secondes de trafic réel. Les
captures [320 px](creation-personne-2026-10-12/banc-client/preuves/creation-320.png),
[1 440 px](creation-personne-2026-10-12/banc-client/preuves/creation-1440.png)
et [incertitude à 320 px](creation-personne-2026-10-12/banc-client/preuves/incertitude-320.png)
ont été inspectées, sans débordement ni erreur JavaScript observés. Le cadre,
la session, les destinations et les réponses réseau restent simulés ; cela
ne prouve ni authentification, ni annulation d'un commit serveur.

L'intégration utilise Next de production, Chromium **149.0.7827.55** et
PostgreSQL 17 sur la base jetable `person_creation_test`. Les **52 migrations
existantes** sont appliquées. Les créations à pseudo seul et identité civile,
les deux statuts, la normalisation, la trace chiffrée, la soumission par
Entrée, l'annulation et le retour au Répertoire filtré sont vérifiés. La
double soumission pendant attente produit une personne et un seul audit.
Les largeurs **320, 360, 390, 768, 1 024, 1 440 et 1 920 px** sont exercées
avec le cadre complet, sans débordement ni erreur JavaScript observés ;
captures [320 px](creation-personne-2026-10-12/banc-integration/creation-320.png)
et [1 440 px](creation-personne-2026-10-12/banc-integration/creation-1440.png).

Les deux pannes réseau ont des issues différentes contrôlées en base :
réponse perdue après commit avec recherche dans un nouvel onglet, puis panne
avant envoi avec reprise confirmée. Le test n'assimile pas la recherche à une
preuve d'unicité. Un compte limité à `persons:view` et `persons:create` crée
et consulte la fiche ; l'administration reste refusée. Le retrait de création
entraîne un refus API 403 et le retrait du formulaire. Anonyme et cookie forgé
ne peuvent accéder au formulaire privé ni créer. Un retour externe est
neutralisé.

Une première exécution du banc réel cliquait le fil d'Ariane pendant le
squelette de la fiche et perdait ainsi les filtres attendus. Attendre le titre
a d'abord permis de valider le retour de la fiche chargée dans les dix
parcours. La fenêtre intermédiaire a ensuite été examinée séparément : elle
révèle bien REP-N06. Le [squelette](../../apps/web/src/app/membres/repertoire/[id]/loading.tsx)
ne propose plus une destination statique avant de connaître le retour
contextuel. Le onzième scénario observe le vrai chargement Next en bloquant
la lecture de Person après le commit de création dans la base isolée : aucun
lien Répertoire pendant ce chargement, puis lien contextuel correct après
libération du verrou. Les onze parcours finaux ont été rejoués avec succès.

Un rejeu rapproché du banc a atteint le limiteur de disponibilité. Le runner
a respecté `Retry-After` puis utilisé « Revérifier » ; aucun quota produit
n'a été relâché pour obtenir les résultats.

Le banc serveur utilise PostgreSQL 17 sur une base jetable dédiée,
`person_creation_service_test`, distincte de `person_creation_test` pour
l'intégration navigateur ; les 52 migrations existantes y sont appliquées.
Authentification, permissions, limiteurs, validation, transaction et audit
chiffré sont réels. Cookies et en-têtes sont simulés, sessions MFA préparées
comme fixtures puis validées contre SQL : ce banc ne rejoue ni mot de passe,
ni TOTP, ni middleware HTTP/CSRF.

Deux pannes injectées, lors d'AuditLog puis d'AuditFieldChange, provoquent le
rollback de l'identité, des coordonnées et de leurs traces. Deux créations
homonymes concurrentes restent autorisées, avec identifiants et audits
distincts. Le correctif REP-N05 concerne le contrat API de coordonnées
initiales, pas un ajout de réseaux au formulaire. Aucun schéma ni migration
n'est modifié ; le test et sa variable dédiée rejoignent les outils du dépôt.

## Verdict et limites

**Conforme sur le périmètre vérifié le 12 octobre 2026.** REP-N01 à REP-N06
sont clos dans la portée de leurs preuves : navigateur simulé, SQL ou
parcours HTTP réel selon le point.
Le formulaire minimal sert le besoin actuel ;
ajouter un assistant à étapes,
des coordonnées obligatoires, une création de compte ou une détection d'homonymes
bloquante n'est pas justifié par cette revue.

Cette passe ne réaudite pas toute la liste, les dialogues de coordonnées ni la
suppression d'une personne. Le cas de création et audit du 11 octobre reste
une preuve datée de son propre scénario. Aucun lecteur d'écran, appareil
physique, test de charge ou blocage garanti des extensions d'autocomplétion
n'est qualifié ici. La reprise confirmée est une nouvelle création : si la
première demande avait abouti et n'a pas été identifiée lors de la vérification,
un doublon reste possible. Ni unicité par identité ni idempotence ne sont
revendiquées. Les futures relations métier restent dans le
cadrage du Répertoire et ne deviennent pas des colonnes de création par défaut.

Next et le cluster contenant les deux bases de preuve sont arrêtés. Les bases,
clés, secrets et autres données privées temporaires ont été supprimés à
19 h 50, Europe/Paris ; seules les preuves expurgées et les scripts utiles
restent archivés.
