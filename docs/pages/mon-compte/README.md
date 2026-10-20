# Mon compte

[Index des pages](../../pages/README.md) · [Design](../../design/README.md) · [Guide général](../../REFERENCE_GENERALE.md)

Espace personnel de chaque compte : profil et sécurité de connexion. Même
gabarit que la fiche utilisateur, sans les actions d’administration.

## Pages et sections

| Route | Section | Fiche | Gabarit | Harmonisation |
| --- | --- | --- | --- | --- |
| `/mon-compte` | Profil (défaut) | [Mon compte — Profil](profil.md) | [B. Fiche à sections](../../design/gabarits.md#b-fiche-à-sections) | Aligné |
| `/mon-compte` | `?section=security` | [Mon compte — Sécurité](securite.md) | [B. Fiche à sections](../../design/gabarits.md#b-fiche-à-sections) | Aligné |

Les anciens paramètres `activity` et `history` affichent Profil.

## Règles communes du module

- **Accès** : session authentifiée ; capacités personnelles du socle
  (profil, contact, mot de passe, double authentification, sessions) décrites
  dans [Socle et autonomie personnelle](../../domaines/permissions.md#socle-et-autonomie-personnelle).
- **Cadre** : [AccountPageContent](../../../apps/web/src/features/account/AccountPageContent.tsx) compose le
  bandeau compact porteur des états du compte (`UserIdentityStatus`) et
  `PageSectionNavigation` ;
  les sections sont chargées à la première visite.

## Revues communes

Les sections ci-dessous concernent tout l’espace. Celles qui ne concernent
qu’une section ont rejoint sa fiche le 19 octobre 2026, sans modification de contenu.

## Reprise — 20 octobre 2026

Suite de la reprise de la fiche utilisateur, validée par le propriétaire
(« ok go ») : ses règles s’appliquent à Mon compte, même gabarit.

| ID | Nature / priorité | État | Point et traitement |
| --- | --- | --- | --- |
| COMPTE-13 | Composition, P2 | Clos | Carte « Vue d’ensemble » remplacée par les états dans le bandeau (avec la fiche utilisateur) |
| COMPTE-14 | Composition, P2 | Clos | Titres qui répétaient l’onglet (« Profil · Votre identité… », « Sécurité · Protégez votre accès… ») réservés aux lecteurs d’écran ([HARMO-07](../../design/harmonisation.md#constats)) |
| COMPTE-15 | Composition, P2 | Clos | Cadres imbriqués retirés : identifiant et email en liste de descriptions sous « Connexion et contact », valeurs de Mot de passe et Double authentification sans cadre, note de protection en aide ; seul le blocage reste encadré |
| COMPTE-16 | Libellés, P3 | Clos | « Application d’authentification » devient « Double authentification » ; « À activer » devient « À configurer », comme sur la fiche utilisateur |

- **Livré** : `ProfileSection` (carte sans en-tête, rubriques Identité et
  Connexion et contact), `SecuritySection` ; `AccountPanel` et
  `SectionPanel`, devenus sans consommateur, supprimés.
- **Vérifié** : types, lint, Vitest complet ;
  [banc client du 11 octobre](../../audits/mon-compte-2026-10-11/banc-client/README.md)
  rejoué sans modification, 23 sur 23, captures relues à 320 et 1 440 px.
- **Non vérifié** : session et serveur réels, rendu sur le serveur de dev.

## Catalogue personnel corrigé — 15 octobre 2026

Après accord utilisateur, AUT-S02 est corrigé : `account:view_activity` n'est
plus actif ni garanti par le socle et l'ancien endpoint d'activité est fermé
(410). Le volet Compte personnel présente sept capacités utilisées : six
garanties et l'option prénom/nom configurable. Aucune nouvelle fonction n'est
créée. Tests du catalogue et de fermeture API réussis dans la suite web
(1 335 réussis, 142 intégrations facultatives non exécutées).
Les parcours MFA personnels n'ont pas été rejoués par navigateur pour ce lot.
Le [rapport transverse](../../audits/2026-10-15-autorisations-site.md#corrections-après-accord--15-octobre-2026)
porte les preuves communes. Les constats initiaux ci-dessous restent datés.

## Autorisations personnelles actuelles — 15 octobre 2026

L'[audit transverse des autorisations](../../audits/2026-10-15-autorisations-site.md)
conserve les garanties de profil, contact, sécurité, mot de passe, MFA et sessions,
avec la seule option configurable actuelle pour modifier prénom/nom.
AUT-S02 signale la capacité `account:view_activity` encore présentée dans
l'éditeur de compte personnel sans journal utilisable dans Mon compte. Son retrait
de la présentation est recommandé ; l'API encore joignable doit être traitée
avant de supprimer une garde. Suivi propriétaire Utilisateurs, responsable à
attribuer. Aucune politique personnelle modifiée ; tests simulés uniquement pour
cette passe, sans réutiliser les anciennes preuves réelles comme validation nouvelle.

## État courant — clôture du socle du 13 octobre 2026

La [revue finale du socle](../../audits/2026-10-12-cloture-socle.md) est
terminée au périmètre livré, pour poursuivre le développement métier. Ses
preuves et limites ne constituent pas une qualification de déploiement.

Le profil personnel et la navigation vers le compte sont rejoués sur serveur
réel. Profil, contact, mot de passe et opérations MFA bénéficient de la
relecture transactionnelle de l’acteur, de la source et des preuves applicables.
Le remplacement MFA combiné à une perte de réponse n’a pas été joué de bout en
bout HTTP. L’incident Bitwarden déclaré résolu par l’utilisateur reste clos.

Les décisions et preuves datées ci-dessous restent conservées. Une nouvelle
revue répond à un changement, un défaut constaté ou une règle nouvelle.

## Identité et état

**Sessions obsolètes — corrigé et vérifié le 11 octobre 2026 :** le défaut
signalé par la revue de fiche a été reproduit sur `GET /api/auth/sessions` avec
une fixture PostgreSQL. La lecture et le nettoyage filtrent maintenant la
version de sécurité, en plus des dates. Le nettoyage reste lié à la version
du compte authentifié pour ne pas supprimer une session plus récente si le
compte change entre-temps. Voir [l'audit de cette page](../../audits/2026-10-11-mon-compte.md).

**Premier enregistrement après connexion — corrigé et vérifié le 12 octobre :**
la réponse de vérification MFA contenait une version du profil antérieure à
l'écriture de dernière connexion, provoquant un conflit 409 sans autre
modification. La création de session retourne maintenant sa projection
utilisateur à jour. Le parcours connexion TOTP → Mon compte → premier
enregistrement → retour à l'accueil réussit sans rechargement ni relecture du
contexte. [Preuves et limites — ACC-06](../../audits/2026-10-12-accueil.md).
La protection contre les véritables conflits de profil reste inchangée.

- Route : `/mon-compte`. Page personnelle du compte connecté.
- Statut : alignée sur la fiche `/systeme/utilisateurs/[id]` ; formulaires,
  conflits et navigation corrigés le 2026-10-11.
- Vérification finale du 11 octobre : 23 parcours Chromium sur composants/API
  simulées, douze parcours Next avec connexion/MFA et PostgreSQL réels, 23
  scénarios SQL et suite web réussis. Voir les
  [preuves et limites](../../audits/2026-10-11-mon-compte.md).

## Décisions courantes

- Même gabarit que la fiche utilisateur : hero `PageIdentityHero` compact
  (avatar DiceBear, identifiant et dates, états en pastilles, rôle à droite)
  et navigation de sections. La carte « Vue d’ensemble » est retirée depuis
  le 20 octobre 2026, avec celle de la fiche utilisateur.
- Onglets conservés : « Profil » et « Sécurité », chargés à la première visite.
  Les anciens paramètres `activity` et `history` affichent Profil. Le branchement
  dormant de l’activité dans cette page a été retiré le 11 octobre ; les composants
  d’historique des autres consommateurs et les traces persistées sont conservés.
- Composants partagés réutilisés : `UserIdentityStatus`, `UserAccessBadge`,
  `UserStatusBadge`, `SectionActionBar`.
- Avatar de compte : fond selon l'accès via `UserAvatar` partagé (rouge clair,
  ambre ou bleu clair), dessin conservé ; [décision et contrôle](../systeme/utilisateurs/liste.md#fond-des-avatars-par-accès--10-octobre-2026).
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

[Audit, scénarios et captures](../../audits/2026-10-11-pages-restantes.md) :
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
réussis. [Preuves et limites](../../audits/2026-10-10-utilisateurs.md#validation-des-corrections).
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
  dans Next réel. Le [complément ciblé du 12 octobre](securite.md#sécurité--attente-et-reprise-des-sessions--complément-ciblé-du-12-octobre-2026)
  vérifie désormais la révocation globale et la réponse perdue après commit ;
  il ne reprend pas le remplacement MFA. Safari/iOS, lecteurs d'écran,
  extensions et charge restent hors validation. Appliquer les
  [contrôles](../../systeme/tests.md) proportionnés au prochain changement.

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

[Décisions et questions communes](../transverse/modales.md) ·
[Preuves et limites de l’audit](../../audits/2026-10-11-modales.md).
Cette passe ne clôt pas les contrôles d’intégration encore ouverts de la page.

## Autocomplétion — correction du 11 octobre 2026

Profil, changement de mot de passe, adresse de contact et MFA suivent la règle commune sans exception. Les champs invisibles d’association au compte ont été retirés.

[Règle propriétaire](../../design/README.md) ·
[Contrôles et limites des extensions](../../audits/2026-10-11-autocompletion.md).
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
le profil saisi. [Règles et questions communes](../transverse/navigation-generale.md#barres-de-sections--décision-du-11-octobre-2026) ;
[preuves et limites](../../audits/2026-10-11-navigation-sections.md).
Les validations de mutations et de session réelle restent distinctes.

## Changement de section après défilement — 12 octobre 2026

La [passe ciblée commune](../transverse/navigation-generale.md#changement-de-section-après-long-défilement--revue-ciblée-du-12-octobre-2026)
corrige le retour depuis le bas de Profil vers Sécurité déjà visitée : en Next
réel à 390 × 600 px, le titre auparavant masqué à 37,58 px arrive à 120,58 px,
sous la barre finissant à 105 px. Le focus du lien et le remplacement d'URL
sont conservés après changement accepté ; « Rester » conserve le brouillon,
l'URL et la position. NAV-08/NAV-09, les contrôles des autres consommateurs et
les limites sont détaillés dans le suivi commun. Cette passe ne reprend pas
l'audit des mutations de profil ou de sécurité.
