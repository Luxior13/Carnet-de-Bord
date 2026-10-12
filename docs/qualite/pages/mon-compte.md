# Suivi — Mon compte (`/mon-compte`)

## Sécurité : attente et reprise des sessions — complément ciblé du 12 octobre 2026

**Corrigé et vérifié dans le périmètre décrit.** Départ `c61ed03`, arbre propre.
Cette reprise porte sur les lectures
de sécurité et les révocations individuelle/globale de sessions, leurs
confirmations, le retour de focus et l'autorisation au moment de la mutation.
Elle ne reprend pas l'audit complet du profil, du contact ou de la configuration
MFA. Les preuves du 11 octobre restent datées et ne couvrent pas ces nouveaux cas.

Sélection de la [revue générale](../REVUE_GENERALE.md) : Q01–Q07, Q09–Q11,
Q14–Q17, Q19, Q22, Q27–Q28 et Q30 examinés pour l'action sensible, les données de
session, la concurrence et la reprise. Q12–Q13, Q18 et Q29 hors impact : aucun
changement de schéma, migration, cache ou format de sauvegarde. Q08, Q20–Q21 et
Q23–Q26 non applicables : ni notification différée, fichier, transfert de masse,
automatisation, gouvernance, donnée esport ou engagement financier ajouté.

Décisions de cette reprise :

- Borner chaque lecture et révocation à 30 secondes, corps de réponse compris,
  et conserver l'annulation au démontage. Un délai dépassé ou une annulation
  côté navigateur ne prouve jamais l'annulation de l'opération serveur.
- Séparer le résultat de la mutation de la relecture des sessions : un GET lent
  après succès ne doit pas maintenir la confirmation de révocation verrouillée.
  Les chargements et échecs de relecture restent visibles dans la section.
- Après résultat incertain, effectuer une relecture bornée et permettre une
  reprise explicite, sans rejouer automatiquement le DELETE. Une notification
  fugitive ne suffit pas à expliquer durablement cette situation.
- Rendre le focus à un élément présent et visible sous la barre de sections ;
  ne pas prendre un titre focalisé mais masqué pour un retour accessible.
  Si l'utilisateur a interagi ailleurs pendant la relecture, sa nouvelle action
  conserve le focus : la réponse tardive ne doit pas le reprendre.
- Vérifier l'autorisation de la session source dans la transaction avant la
  révocation ; une authentification initiale ne suffit pas si elle est devenue
  invalide pendant l'attente. Aucun nouveau droit ou mode de révocation ajouté.

| Point | Constat et portée | Correction et clôture du 12 octobre |
| --- | --- | --- |
| COMPTE-10 — P1 | Un DELETE sans réponse, ou un DELETE réussi suivi d'un GET bloqué, maintenait la confirmation verrouillée après 31 secondes. Un 500 JSON ne déclenchait pas de relecture et ne laissait pas d'avertissement local persistant. Reproduit avec API/horloge simulées. | **Clos au périmètre testé** : délai par requête, confirmation libérée avant le GET et reprise locale explicite. Le transport perdu après commit réel produit un DELETE, un GET de vérification et un avertissement persistant, sans rejeu. |
| COMPTE-11 — P1 | Après authentification en version S0, une rotation vers S1 ou la disparition de la session source n'empêchait pas le DELETE individuel/global de supprimer les sessions et de répondre 200. Quatre reproductions serveur avant correction, état SQL et audits contrôlés. | **Clos au périmètre SQL testé** : verrou du compte, contrôle de son état/version et relecture des échéances de la session source après l'attente. Refus 401 sans suppression ni audit de réussite ; suppression autorisée et audit restent dans la même transaction. |
| COMPTE-12 — P2 | Après révocation, le titre Sessions recevait le focus vers 80 px, derrière la barre située entre 56 et 105 px, à 390 et 1 440 px. Reproduit dans le banc client simulé. | **Clos au périmètre testé** : titre visible vers 120 px aux deux largeurs simulées et focus visible après perte de réponse dans Next réel. Une nouvelle interaction pendant la relecture conserve son focus. |

Preuves de la passe, exécutées le 12 octobre :

[Banc client : huit parcours réussis](../../audits/mon-compte-securite-2026-10-12/banc-client/README.md) :
confirmations, délai de 30 secondes contrôlé à 31 secondes, 500 JSON, 403 non
JSON, reprises des lectures sessions/MFA et focus à 390/1 440 px. Le vol de focus
par une relecture tardive a été relevé puis corrigé pendant cette passe, après
le premier correctif de délai ; il n'est pas présenté comme un constat de la
version initiale. API, acteur, horloge et routeur simulés, polices Next absentes
et police calculée non mesurée ; aucun commit SQL ni traitement serveur annulé
démontré par ce banc. Les dialogues
mot de passe et configuration MFA n'y sont pas exercés.

[Banc serveur : neuf scénarios PostgreSQL ciblés réussis](../../audits/mon-compte-securite-2026-10-12/banc-serveur/README.md),
sur 29 tests du fichier, vingt autres ignorés par le filtre ; 39 tests API voisins
réussis séparément. Six régressions SQL sont nouvelles : quatre cas de rotation
ou disparition de la source, compte inactif et expiration après attente du
verrou réellement observée. L'authentification est simulée dans ce banc ; les
requêtes, verrous, transactions et audits sont réels. Ce n'est pas une preuve
HTTP de changement de mot de passe ou de remplacement MFA concurrent.

[Banc Next/PostgreSQL : trois parcours HTTP réussis](../../audits/mon-compte-securite-2026-10-12/banc-integration/README.md) :
annulation sans DELETE ni audit, révocation globale confirmée et réponse perdue
après commit réel. La session de l'autre navigateur devient refusée (401), la
session courante reste valide (200), un seul audit est ajouté. Après perte de
réponse : un DELETE et un GET, une session restante, avertissement persistant et
titre focalisé visible. Ce banc vérifie la révocation globale, pas toutes les
combinaisons individuelles ni les courses SQL du banc précédent.

Contrôles généraux : **1 252 tests réussis, 169 ignorés**, dans 103 fichiers
réussis et neuf ignorés ; quatre nouveaux tests couvrent délai, corps de réponse,
annulation et refus HTTP. Les neuf SQL ciblés sont une exécution distincte,
sans les additionner à ce total. Types, lint globaux et build Next 15.5.23
réussis ; architecture et budgets réussis sans hausse des plafonds. Mon compte
mesure 259 200 octets gzip dans le contrôleur de budget du dépôt, sans mesure de
charge. Aucun schéma, migration, droit ni durée de session modifié.

Limites : Chromium et jeux de données isolés ; Safari/iOS, lecteur d'écran,
extensions, charge et tous les parcours mot de passe/MFA hors validation de ce
complément. Le délai client ne garantit pas l'arrêt d'un traitement serveur.
Nettoyage confirmé : cinq temporaires client supprimés ; Next/PostgreSQL arrêtés,
ports libres, cluster de deux bases fictives, dossier privé, secrets et marker
supprimés. Aucune base habituelle utilisée. Les preuves d'intégration détaillent
ces contrôles ; aucun secret n'est archivé.

## Barre du profil — 11 octobre 2026

Le profil utilise `SectionActionBar` et un vrai formulaire soumis par Entrée.
La relecture après conflit affiche Actualisation, avec les mêmes verrous que la
sauvegarde ; le brouillon reste disponible. Annuler restaure les valeurs et rend
le focus à la saisie ou à son titre si le droit a changé. La barre ne masque plus
les champs sur petit écran. Le dialogue de contact garde son pied contextuel.

[Composants communs](../../references/COMPOSANTS.md) et
[audit daté avec limites](../../audits/AUDIT_COMPOSANTS_2026-10-11.md).

## Identité et état

**Sessions obsolètes — corrigé et vérifié le 11 octobre 2026 :** le défaut
signalé par la revue de fiche a été reproduit sur `GET /api/auth/sessions` avec
une fixture PostgreSQL. La lecture et le nettoyage filtrent maintenant la
version de sécurité, en plus des dates. Le nettoyage reste lié à la version
du compte authentifié pour ne pas supprimer une session plus récente si le
compte change entre-temps. Voir [l'audit de cette page](../../audits/AUDIT_MON_COMPTE_2026-10-11.md).

**Premier enregistrement après connexion — corrigé et vérifié le 12 octobre :**
la réponse de vérification MFA contenait une version du profil antérieure à
l'écriture de dernière connexion, provoquant un conflit 409 sans autre
modification. La création de session retourne maintenant sa projection
utilisateur à jour. Le parcours connexion TOTP → Mon compte → premier
enregistrement → retour à l'accueil réussit sans rechargement ni relecture du
contexte. [Preuves et limites — ACC-06](../../audits/AUDIT_ACCUEIL_2026-10-12.md).
La protection contre les véritables conflits de profil reste inchangée.

- Route : `/mon-compte`. Page personnelle du compte connecté.
- Statut : alignée sur la fiche `/systeme/utilisateurs/[id]` ; formulaires,
  conflits et navigation corrigés le 2026-10-11.
- Vérification finale du 11 octobre : 23 parcours Chromium sur composants/API
  simulées, douze parcours Next avec connexion/MFA et PostgreSQL réels, 23
  scénarios SQL et suite web réussis. Voir les
  [preuves et limites](../../audits/AUDIT_MON_COMPTE_2026-10-11.md).

## Décisions courantes

- Même gabarit que la fiche utilisateur : hero `PageIdentityHero` compact
  (avatar DiceBear, identifiant, rôle à droite), rail « Vue d'ensemble »
  (`PageAsideLayout` + `UserOverviewCard`) et navigation de sections.
- Onglets conservés : « Profil » et « Sécurité », chargés à la première visite.
  Les anciens paramètres `activity` et `history` affichent Profil. Le branchement
  dormant de l’activité dans cette page a été retiré le 11 octobre ; les composants
  d’historique des autres consommateurs et les traces persistées sont conservés.
- Composants partagés réutilisés : `UserOverviewCard`, `UserAccessBadge`,
  `UserStatusBadge`, `SectionActionBar`.
- Avatar de compte : fond selon l'accès via `UserAvatar` partagé (rouge clair,
  ambre ou bleu clair), dessin conservé ; [décision et contrôle](systeme-utilisateurs.md#fond-des-avatars-par-accès--10-octobre-2026).
- Onglet Profil modifiable directement (nom facultatif, aucune
  autocomplétion), avec `SectionActionBar`. Onglet Sécurité en pastilles de
  statut partagées.
- Depuis la liste Utilisateurs, `returnTo` conserve les critères et la page.
  Si l'acteur peut consulter cette liste, le hero propose « Retour aux utilisateurs »
  avec une destination limitée à cette collection. La protection existante des
  saisies non enregistrées reste applicable aux liens de navigation.

## Profil, navigation et sécurité — 11 octobre 2026

- Le garde partagé des saisies non enregistrées couvre les liens et les changements
  de section ; annuler une navigation rend le focus à son déclencheur.
- Un rafraîchissement des coordonnées ou du profil conserve le brouillon. Un
  changement de compte ou de ses droits remonte le contenu pour éliminer les
  anciens brouillons et dialogues ; les réponses tardives sont ignorées.
- Prénom requis, nom facultatif : l’API accepte désormais le nom vide, comme le
  formulaire et le modèle existants. L’enregistrement et sa trace d’audit restent
  dans la même transaction.
- `PATCH /api/auth/me` exige `expectedUpdatedAt` (instant ISO de la version lue).
  Une version périmée ou une écriture concurrente retourne 409. Le brouillon reste
  visible ; « Actualiser la version » relit le profil, montre l’identité serveur et
  permet une nouvelle sauvegarde explicitement déclenchée.
- Le client actif `ProfileSection` envoie ce champ. Aucune migration de base ;
  déployer client et API ensemble. Un ancien formulaire déjà ouvert doit être
  rechargé après déploiement, après copie de sa saisie : sa requête sans version
  est refusée avec 400. Ne pas rendre le contrôle de version facultatif.
- Les opérations coordonnées, mot de passe, MFA et révocation de sessions ont un
  verrou synchrone ; les requêtes de lecture/révocation de sessions sont annulées
  au démontage. Annuler une requête ne constitue pas une annulation serveur.
- La ligne de session et ses formats de date sont isolés dans `AccountSessionRow`
  pour maintenir une section Sécurité lisible. Aucun droit ni mode MFA ajouté.

[Audit, scénarios et captures](../../audits/AUDIT_PAGES_RESTANTES_2026-10-11.md) :
tests API de nom vide, version requise, conflit initial et concurrence pendant
l’écriture ; parcours navigateur de brouillon, conflit/reprise, changement de
compte, coordonnées, mot de passe, MFA et révocation. Réponses simulées : ce
contrôle ne démontre pas le rollback PostgreSQL, les cookies ni la révocation
réelle des sessions. Le dialogue de mot de passe est aussi consommé par le cadre
authentifié pour le changement obligatoire ; ce mode forcé n’a pas été rejoué
dans le navigateur pendant cette passe.

## Retour à la liste — 10 octobre 2026

Effet ciblé de la correction USR-15 : Q02/Q04 pour le lien et le focus, Q09/Q10
pour les droits et la validation de destination, Q19/Q27/Q30 pour les composants,
contrôles et suivi. Autres sujets hors impact : aucun changement des données,
mutations, états de sécurité ou règles du profil.

Parcours liste → propre compte → retour dans Next/PostgreSQL isolés avec session
préparée : critères, page et lien focalisé retrouvés. Build, lint et suite web
réussis. [Preuves et limites](../../audits/AUDIT_UTILISATEURS_2026-10-10.md#validation-des-corrections).
La navigation avec brouillon, les sauvegardes et le défi MFA n'ont pas été joués
pendant cette passe ; COMPTE-01 reste ouvert sur ces parcours.

## Concurrence et reprise — complément du 11 octobre 2026

- Le profil fusionne chaque champ à la relecture : conserver seulement les
  champs modifiés localement, reprendre les nouvelles valeurs des autres.
  Les snapshots plus anciens ne remplacent pas la version déjà connue.
- Le dialogue de contact fige sa version à l'ouverture. Un rafraîchissement du
  contexte ne réinitialise ni la saisie ni une requête en cours.
  `PATCH /api/auth/contact-email` exige aussi `expectedUpdatedAt`, y compris
  pour une adresse identique ; client et API doivent être déployés ensemble.
  Après 409 ou réponse incertaine, la relecture est explicite et garde la saisie.
- La barre du profil reste absente sans brouillon. Un conflit conserve toutefois
  « Actualiser la version », même si les valeurs visibles deviennent identiques.
- Les dialogues et relectures appartiennent au compte et à ses droits courants.
  Le contexte partagé ignore les réponses devenues obsolètes et les mutations
  d'un autre acteur. Une actualisation ne peut pas supplanter une déconnexion.
- Un refus de lecture 401/403 efface les informations de sécurité déjà affichées,
  même si le corps de réponse n'est pas du JSON. Les confirmations de révocation
  restent verrouillées pendant l'opération ; si la ligne disparaît, le focus
  revient au titre de la section.
- Une réponse perdue après changement de mot de passe ou validation MFA ne
  prouve pas un échec : l'interface explique l'incertitude et propose de recharger
  le compte. Les codes de secours non reçus ne peuvent pas être récupérés depuis
  leur hash ; après vérification de l'accès MFA, générer un nouveau lot.
- La remise des codes conserve son acquittement explicite et protège le départ
  avant sauvegarde. Un résultat de copie tardif ne produit pas de retour après
  fermeture ou remplacement des codes.
- La projection SQL de session inclut `updatedAt` : le snapshot SSR et
  `/api/auth/me` doivent fournir la version requise par les formulaires. Un
  test avec DTO simulé n'est pas une preuve de présence dans la vraie projection.
  Le manque de ce champ a été reproduit puis corrigé dans le parcours Next réel.

Questions à conserver : un champ non modifié peut-il écraser une correction
distante ? Une lecture retardée restaure-t-elle le compte après déconnexion ?
Le serveur a-t-il pu valider malgré la perte de réponse ? Le retour de focus
cible-t-il encore un élément présent après rafraîchissement ?

## Validation du 11 octobre et compléments

- COMPTE-01 — **clos le 11 octobre 2026 pour les parcours décrits** : profil,
  contact, conflit et réponse perdue après commit, connexion/MFA, révocation
  individuelle, mot de passe, codes de secours et droits à chaud ont été exercés
  dans Next/PostgreSQL isolés. Les anciens paragraphes ci-dessous décrivent
  uniquement les limites de leurs passes historiques.
- Au 11 octobre, révocation globale et remplacement MFA étaient couverts côté
  SQL et client simulé, sans leur combinaison complète avec perte de réponse
  dans Next réel. Le [complément ciblé du 12 octobre](#sécurité--attente-et-reprise-des-sessions--complément-ciblé-du-12-octobre-2026)
  vérifie désormais la révocation globale et la réponse perdue après commit ;
  il ne reprend pas le remplacement MFA. Safari/iOS, lecteurs d'écran,
  extensions et charge restent hors validation. Appliquer les
  [contrôles](../CONTROLES.md) proportionnés au prochain changement.

Avant de modifier un champ ou une action : le brouillon reste-t-il conservé
après un rafraîchissement de contexte ? Quelle version protège l’écriture et
comment l’utilisateur reprend-il un conflit ? Un changement de compte ou de
droits ferme-t-il les anciens dialogues ? Une réponse perdue peut-elle conduire
à rejouer une action sensible ? Vérifier aussi les consommateurs partagés du
dialogue modifié, notamment le changement obligatoire de mot de passe.

## Modales — revue transverse du 11 octobre 2026

Fenêtres de contact, mot de passe, MFA et sessions : surface commune, actions
empilées sur mobile et retour du focus. L’échec de finalisation des codes de
secours laisse les codes visibles ; l’annulation de configuration MFA attend sa
réponse, affiche son échec et permet de réessayer. Contrôles sur API simulées.

[Décisions et questions communes](modales.md) ·
[Preuves et limites de l’audit](../../audits/AUDIT_MODALES_2026-10-11.md).
Cette passe ne clôt pas les contrôles d’intégration encore ouverts de la page.

## Autocomplétion — correction du 11 octobre 2026

Profil, changement de mot de passe, adresse de contact et MFA suivent la règle commune sans exception. Les champs invisibles d’association au compte ont été retirés.

[Règle propriétaire](../../references/DESIGN_SYSTEM.md) ·
[Contrôles et limites des extensions](../../audits/AUDIT_AUTOCOMPLETION_2026-10-11.md).
La présence des attributs d’exclusion ne garantit pas le comportement d’une
extension installée chez l’utilisateur.

### Complément — proposition encore visible dans la modale de contact

Signalement utilisateur du 11 octobre après la première correction : une
proposition d'autocomplétion reste visible dans la modale d'adresse de contact.
La capture fournie ensuite identifie le menu intégré Bitwarden sur **Mot de
passe actuel**. Le navigateur, la version de l'extension et le DOM effectivement
servi ne sont pas déductibles de cette capture. Ne pas considérer le contrôle
des attributs comme une reproduction du défaut avec l'extension.

Le code conservait `name="email"`, `type="email"` et un mot de passe nommé
`current-password`. Le champ de contact est aligné sur la création de compte :
`type="text"`, `inputMode="email"`, sans `name`, correction automatique désactivée.
Le mot de passe reste masqué, sans `name` inutile : la requête utilise déjà les
valeurs de l'état du formulaire. Les exclusions des gestionnaires sont aussi
portées par le formulaire. Labels et identifiants accessibles restent stables.
Cette adaptation réduit les indications d'autocomplétion ; son effet sur
l'extension de l'utilisateur n'est pas démontré.

Q01/Q04/Q06/Q27/Q30 examinés ; autres sujets hors impact : composition, droits,
API, stockage et session inchangés. La validation applicative de l'adresse et
la validation serveur restent actives malgré le changement du type HTML.

Vérifications ciblées : **33 tests réussis**, TypeScript et lint réussis ;
**8 scénarios Chromium isolé réussis** (`AUDIT_ONLY=contact` dans le
[banc des modales](../../audits/modales-2026-10-11/banc/README.md)). Ouverture à
quatre largeurs, confirmation de suppression depuis la fiche utilisateur,
brouillon après annulation et nouveau scénario de saisie : attributs du champ
et du formulaire, adresse invalide refusée sans requête, adresse vide bloquée,
adresse valide avec espaces/majuscules normalisée puis soumise avec Entrée.
API fictive, aucune mutation réelle. Les
[observations](../../audits/autocompletion-2026-10-11/contact-observations.json)
complètent la première passe sans en remplacer les résultats.

COMPTE-AUTO-01 — **résolu, confirmé par l'utilisateur le 11 octobre 2026**
après les indications de réglage Bitwarden. Cette confirmation clôt le
signalement de la modale ; elle ne valide pas toutes les extensions ni tous les
navigateurs. Le réglage exact appliqué n'a pas été précisé. La documentation officielle
propose [Paramètres → Remplissage automatique → Domaines bloqués](https://bitwarden.com/help/blocking-uris/)
pour désactiver l'intervention sur le domaine concerné. Cette portée comprend
également les propositions de passkeys et d'enregistrement/modification des
identifiants ; elle ne correspond pas à une désactivation limitée à ce modal.
L'autre réglage, global, est l'affichage des
[suggestions dans les champs](https://bitwarden.com/help/auto-fill-browser/#inline-menu).
Réglages documentés le 11 octobre ; aucune modification du navigateur personnel
effectuée. Si le menu réapparaît, relever la version et inspecter les attributs
réellement servis. La clôture repose sur la confirmation utilisateur, pas sur
les succès du banc sans extension. La capture et ses
identifiants personnels ne sont pas recopiés dans le dépôt.

## Barre de sections — 11 octobre 2026

Profil et Sécurité héritent de la sélection, des angles de 6 px et du défilement
conditionnel du composant partagé. Le point de brouillon affiche désormais
« Modifications non enregistrées » au survol et au focus. Dans Chromium isolé,
le changement de section et l'annulation de la confirmation de départ conservent
le profil saisi. [Règles et questions communes](navigation-generale.md#barres-de-sections--décision-du-11-octobre-2026) ;
[preuves et limites](../../audits/AUDIT_NAVIGATION_SECTIONS_2026-10-11.md).
Les validations de mutations et de session réelle restent distinctes.

## Changement de section après défilement — 12 octobre 2026

La [passe ciblée commune](navigation-generale.md#changement-de-section-après-long-défilement--revue-ciblée-du-12-octobre-2026)
corrige le retour depuis le bas de Profil vers Sécurité déjà visitée : en Next
réel à 390 × 600 px, le titre auparavant masqué à 37,58 px arrive à 120,58 px,
sous la barre finissant à 105 px. Le focus du lien et le remplacement d'URL
sont conservés après changement accepté ; « Rester » conserve le brouillon,
l'URL et la position. NAV-08/NAV-09, les contrôles des autres consommateurs et
les limites sont détaillés dans le suivi commun. Cette passe ne reprend pas
l'audit des mutations de profil ou de sécurité.
