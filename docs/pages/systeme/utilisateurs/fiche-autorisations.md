# Utilisateur — Autorisations

[Index des pages](../../../pages/README.md) · [Utilisateurs](README.md) · [Design](../../../design/README.md) · [Guide général](../../../REFERENCE_GENERALE.md)

## Identité

| Élément | Valeur |
| --- | --- |
| Route | `/systeme/utilisateurs/[id]` |
| Section | `?section=access` (alias `permissions`) ; volet Compte personnel inclus |
| Espace | Système |
| Gabarit visé | [B. Fiche à sections](../../../design/gabarits.md#b-fiche-à-sections) |
| État d’harmonisation | Aligné ; une carte par autorisation et popover d’aide depuis le 18 octobre 2026 — voir [Harmonisation](../../../design/harmonisation.md#état-par-page) |
| Point d’entrée | [UserAccessTab](../../../../apps/web/src/components/users/user-detail/UserAccessTab.tsx) → [PermissionsEditor](../../../../apps/web/src/components/users/PermissionsEditor.tsx) |
| Contrôle d’accès | Lecture `users:view_access` ou du compte personnel ; écriture selon le rôle et les droits `users:grant_access`, `users:revoke_access`, `users:delegate_access`, contrôlée par `PATCH /api/users/[id]` |
| Chargement / erreur dédiés | section chargée à la demande / commune à la fiche |

## Rôle et tâches principales

Comprendre ce qu’un compte peut faire, choisir son rôle et accorder ou refuser
les autorisations administratives d’un Utilisateur, avec leurs prérequis.
Critère de réussite : l’accès effectif de chaque ligne est lisible avant
l’enregistrement et aucune autorisation incohérente n’est enregistrée.

## Composition actuelle

Barre de filtres commune (Rôle, Pôle, Page ou fonction, variante compacte avec
icônes de navigation), ligne d’aide du rôle ; rubriques en petites capitales ;
une carte par autorisation (titre, choix Autoriser/Refuser, état hérité ou
personnalisé) ; bouton d’information ouvrant un `Popover` (description, origine,
valeur du rôle, accès effectif, prérequis) ; volet Compte personnel ; barre
commune avec récapitulatif avant enregistrement.

## Décisions retenues

- 18 octobre 2026 : une carte par ligne, détails en popover, retour au rôle par
  ligne retiré, haut de l’onglet allégé ; un Administrateur possède toujours les
  25 autorisations délégables, un Utilisateur seulement celles accordées.
- 17 octobre 2026 : rendu moins carré, lignes moins hautes, couleurs de la liste
  Utilisateurs ([préférences](../../../design/preferences.md)).
- 15 octobre 2026 : catalogue de 27 droits administratifs (7 Répertoire,
  18 Utilisateurs, 2 fixes de Paramètres).

## Points ouverts

Aucun défaut ouvert consigné. Limites de la passe du 18 octobre : pas de requête
HTTP avec session réelle, de suite PostgreSQL, de lecteur d’écran ni d’appareil
physique ; 320, 768 et 1920 px non recapturés.

## Références

- [Page Utilisateurs](../../../domaines/permissions.md#page-utilisateurs), fiche [Permissions](../../../references/permissions.md)
- Audits : [10 octobre 2026](../../../audits/2026-10-10-autorisations-utilisateur.md), [15 octobre 2026](../../../audits/2026-10-15-autorisations-site.md)

## Historique

- 10 au 18 octobre 2026 : revues successives de l’éditeur (détails ci-dessous).
- 19 octobre 2026 : fiche propre à la section, créée par découpage du suivi du module.

## Revues datées

Sections déplacées le 19 octobre 2026 depuis l’ancien suivi du module, sans
modification de leur contenu. Elles conservent leur date, leur portée et leurs
preuves ; la synthèse ci-dessus porte l’état courant.

### Autorisations : une carte par ligne, détails en popover — 18 octobre 2026

L'utilisateur juge que la hiérarchie ne fait pas assez ressortir chaque ligne
d'autorisation et demande que l'icône d'aide ouvre un popover plutôt qu'un
dépliage. Constat : les lignes (`surface-content`, #172333) se distinguaient à
peine du panneau (`surface-panel`, #15202f), l'alternance se confondait avec la
séparation, et les rubriques étaient du texte atténué de 12 px, au même niveau
visuel que les aides.

**Implémenté.** Chaque autorisation est une carte autonome : fond
`surface-row-alternate`, bordure `border-content`, rayon 8 px, 8 px d'écart,
sans alternance. L'accès de page garde une carte plus marquée
(`surface-content-header`, `border-list`). Les rubriques deviennent des repères
en petites capitales atténuées suivis d'un filet, comme les sous-titres de
groupes de champs. Titre de ligne en semi-gras. Une ligne à compléter garde son
liseré jaune, avec une bordure teintée à 25 % seulement.

Le bouton d'information ouvre un `Popover` partagé (Radix) : libellé,
description, puis origine, valeur du rôle, réglage choisi, accès effectif et
prérequis en deux colonnes. « Autorisations requises » devient « Prérequis »,
le terme de la ligne et de l'aide ; « les actions ci-dessous » devient « les
actions de cette page », plus juste hors du flux. Les descriptions critiques et
les blocages restent visibles sans ouvrir le popover. Aucune logique de choix,
de dépendance, de droit ou de sauvegarde modifiée.

Vérifications : 34 tests existants (contrats des sous-composants, politique,
projection, droits fixes), TypeScript et lint réussis. Banc temporaire sur le
vrai `PermissionsEditor` (page Utilisateurs, rôle Utilisateur, deux exceptions
bloquées par prérequis), Chromium à 1440 et 390 px tactile : aucun débordement,
`aria-expanded` à l'ouverture, fermeture par Échap avec retour du focus sur le
bouton, aucune erreur JavaScript. Banc retiré ensuite. Limites : pas de session
réelle, de lecteur d'écran ni d'appareil physique ; 320, 768 et 1920 px non
recapturés.

[Ordinateur](../../../audits/autorisations-cartes-2026-10-18/after-1440.png) ·
[Mobile](../../../audits/autorisations-cartes-2026-10-18/after-390.png) ·
[Popover ordinateur](../../../audits/autorisations-cartes-2026-10-18/popover-1440.png) ·
[Popover mobile](../../../audits/autorisations-cartes-2026-10-18/popover-390.png).

**Retour au rôle par ligne retiré** (« ok go » utilisateur, même jour). Le
bouton ↺ faisait doublon : choisir la valeur du rôle supprime déjà l'exception
(`setOverride`), en gérant prérequis et dépendants, alors que ↺ retirait une
seule clé et pouvait laisser un prérequis manquant. `PermissionStatePicker` ne
garde que Autoriser/Refuser, pleine largeur sur mobile ; `getDecision` n'accepte
plus de choix `reset`. « Réinitialiser cette page » et « Tout réinitialiser au
rôle » restent. Un rappel « rôle : Refusé » près de « Personnalisé » a été
écarté : les rôles sont tout-ou-rien (`ROLE_PERMISSIONS`), la valeur serait
toujours la même. Banc rejoué à 1440 et 390 px : plus aucun bouton ↺, refuser
une exception ramène la ligne à « Hérité du rôle », sans débordement ni erreur.

**Administrateur complet, utilisateur sur attribution** (décision utilisateur
« oui pour moi », même jour). Règle : un Administrateur possède toujours les
25 autorisations administratives délégables, aucune exception ne peut les
restreindre ; un Utilisateur n'a que celles qu'on lui accorde. Le compte racine
reste à part. Règle canonique : [Permissions](../../../domaines/permissions.md).

- **Résolution** : `hasCompleteAccessByRole` et
  `normalizeRolePermissionOverrides` font ignorer à `hasPermission` et
  `enforcePermissionDependencies` toute surcharge administrative d'un ADMIN.
  Tous les contrôles serveur passent par `hasPermission`.
- **API PATCH** : 400 pour une surcharge administrative visant un ADMIN ; un
  changement de rôle efface les surcharges administratives (un ADMIN rétrogradé
  ne garde aucun accès caché, un USER promu n'en a plus besoin). Les options du
  compte personnel restent conservées. Le brouillon client applique la même
  remise à zéro au changement de rôle et restaure l'état enregistré au retour.
- **Éditeur** : pour un ADMIN, chaque ligne affiche « Fourni par le rôle
  Administrateur », sans commande ni aide d'édition. « Hérité du rôle » /
  « Personnalisé », le compteur d'exceptions et les lignes origine/valeur du
  rôle/réglage/accès effectif du popover disparaissent (il garde description et
  prérequis). Boutons groupés renommés « Retirer cette page » et « Tout
  retirer » ; « Rôle de base » devient « Rôle ».
- **Données locales** : 2 ADMIN, aucune exception de refus ; l'un garde trois
  entrées `true` redondantes, ignorées et effacées au prochain enregistrement
  de son rôle ou de ses droits. Pas de migration nécessaire.

Vérifications : suite web complète **1 257 tests réussis** (224 PostgreSQL
ignorés faute de base de test), dont trois nouveaux tests de route (refus 400,
rétrogradation, promotion) et un test de résolution ; trois tests qui
supposaient un ADMIN restreignable sont réécrits. TypeScript, lint, contrôle
d'architecture réussis. Banc temporaire USER et ADMIN à 1440 et 390 px : aucun
débordement ni erreur, 0 commande pour l'ADMIN, aucun « Hérité du rôle ».
Limites : pas de requête HTTP réelle avec session, ni de suite PostgreSQL.

[USER](../../../audits/autorisations-cartes-2026-10-18/role-user-1440.png) ·
[USER mobile](../../../audits/autorisations-cartes-2026-10-18/role-user-390.png) ·
[ADMIN](../../../audits/autorisations-cartes-2026-10-18/role-admin-1440.png) ·
[ADMIN mobile](../../../audits/autorisations-cartes-2026-10-18/role-admin-390.png) ·
[Popover USER](../../../audits/autorisations-cartes-2026-10-18/role-user-popover.png) ·
[Popover ADMIN](../../../audits/autorisations-cartes-2026-10-18/role-admin-popover.png).

**Icônes dans les filtres Pôle et Page ou fonction** (demande utilisateur, même
jour). Chaque option et la valeur affichée portent l'icône de la navigation
latérale (`icon` des pôles et catégories, `getNavigationIcon`), décorative
(`aria-hidden`), via le `Select` partagé qui gère déjà taille et alignement.
Banc à 1440 et 390 px : quatre options avec icône, aucun débordement ni erreur.
[Page](../../../audits/autorisations-cartes-2026-10-18/select-page-1440.png) ·
[Pôle mobile](../../../audits/autorisations-cartes-2026-10-18/select-pole-390.png).

**Haut de l'onglet allégé** (« ok go » utilisateur, même jour). Constat : avant
les filtres, l'onglet empilait les droits de l'acteur, un avertissement de
double authentification, un titre identique au bouton de sous-section, une
phrase, des compteurs déjà présents dans la synthèse et le rôle seul à droite.

- Retirés : bandeau « Vos droits de gestion sur ce compte » (les commandes
  refusées expliquent déjà leur raison), titre « Autorisations
  administratives », compteurs globaux (synthèse, badge de page et récapitulatif
  avant enregistrement les couvrent). `UserAccessTab` ne reçoit plus
  `canDelegatePermissions`/`canRevokePermissions`, et le hook de capacités ne
  renvoie plus ces deux valeurs devenues inutilisées.
- Rôle, Pôle et Page ou fonction partagent la barre de filtres (`roleControl`),
  trois colonnes dès 48 rem de conteneur, rôle seul en tête de 36 à 48 rem,
  empilés sur mobile. Le sélecteur de rôle passe en variante compacte pour
  s'aligner sur les filtres ; ceci remplace le rôle à 40/44 px noté plus bas.
- Une ligne d'aide sous la barre : explication du rôle, puis selon le cas
  « Seul le super-administrateur peut changer le rôle. » ou, en jaune et reliée
  au sélecteur, « Double authentification non activée : rôle Administrateur et
  autorisations critiques indisponibles. » (fusion des deux anciens messages).
  Le badge « Lecture seule » rejoint cette ligne.

Banc sur le vrai `UserAccessTab` (acteur et cible fictifs), première autorisation
mesurée depuis le haut de la carte : **207 px** à 1440 px, 283 px à 768 px,
**395 px** à 390 et 320 px (439 px sans double authentification). Les captures du
17 octobre donnaient environ 361 px et 628 px : gain d'environ 150 px sur
ordinateur et 230 px sur mobile, comparaison approchée entre deux bancs. Aucun
débordement ni erreur ; suite web complète réussie (1 257 tests), TypeScript et
lint des fichiers modifiés réussis.
[Standard](../../../audits/autorisations-cartes-2026-10-18/haut-standard-1440.png) ·
[Mobile](../../../audits/autorisations-cartes-2026-10-18/haut-standard-390.png) ·
[Sans double authentification](../../../audits/autorisations-cartes-2026-10-18/haut-sans-mfa-1440.png) ·
[Rôle verrouillé](../../../audits/autorisations-cartes-2026-10-18/haut-verrouille-1440.png).
Sujet séparé à proposer : la carte de synthèse reste au-dessus du contenu sous
118 rem et pèse davantage sur la hauteur que cet en-tête.

Sélection : Q01–Q04, Q06, Q09, Q10, Q12–Q16, Q19, Q27 et Q30. Q12/Q13 : schéma
inchangé, données existantes compatibles sans migration ; Q15 : l'audit
`PERMISSION_UPDATE` existant trace les effacements. Autres sujets hors impact.
La section du 17 octobre ci-dessous reste datée ; son dépliage des détails est
remplacé par ce popover.

### Autorisations : présentation allégée — 17 octobre 2026

L'utilisateur conserve l'organisation, demande un rendu moins carré et des
lignes moins hautes, puis valide la proposition par « ok go ». Il précise que
la liste `/systeme/utilisateurs` est sa référence satisfaisante de couleurs,
clarté et ressenti, sans demander de reproduire son tableau dans cet onglet.

**Implémenté et vérifié sur les composants.** Pôles, pages et rubriques conservés.
Fonds alternés et couleurs issus des mêmes jetons que la liste Utilisateurs ;
séparations fines, contours imbriqués retirés et arrondis de 8 px. Les commandes
s'alignent à droite lorsque la place le permet et passent sous le libellé sur
petit écran. Les nouveaux styles restent locaux à l'éditeur.

Le bouton d'information près du titre déplie description complète, origine,
héritage, réglage choisi, accès effectif et dépendances. Il utilise la primitive
Collapsible et le Button partagés, avec nom accessible et état d'ouverture.
« Hérité du rôle »/« Personnalisé » reste visible discrètement. Le badge ordinaire
Autorisé/Refusé est omis quand la commande exprime déjà le même état ; il reste
présent en lecture seule. Pour un droit lié au rôle, le statut verrouillé
(« Fourni par le rôle… », « Réservé aux administrateurs ») suffit : le badge est
retiré depuis la revue de code du 17 octobre. L'accès de page conserve
son indicateur. Les descriptions critiques et les raisons de blocage restent
visibles sans ouvrir de détail ; la gravité sensible devient une métadonnée
neutre, tandis que critique et blocage conservent leurs couleurs d'alerte.

L'accès de page réutilise maintenant PermissionRow. Le statut fourni par le
rôle garde son explication et son cadenas, sans carte supplémentaire. Les
choix, dépendances automatiques, règles de cible, réinitialisations et sauvegarde
gardent leur logique. Aucune modification d'API, de données ou de droits réels.

Vérifications nouvelles sur UserAccessTab et les composants réels, avec acteur,
cible et callbacks de sauvegarde fictifs, cadre à marge latérale simulée :

- Cinq largeurs mesurées : 320, 390, 768, 1440 et 1920 px, sans débordement.
  Ligne ordinaire à 1440 px : environ **129 → 72 px** ; à 390 px : **203 → 126 px**.
  L'éditeur Répertoire complet passe d'environ 1495 à 1151 px à 1440 px et de
  2378 à 1861 px à 390 px. Hauteurs variables, pas de troncature imposée.
- **22 parcours Chromium réussis** : détails par Entrée/Espace sans changer
  le brouillon, annulation/sauvegarde simulée/retour au rôle aux cinq largeurs,
  lecture seule, Paramètres fixes USER/ADMIN, prérequis bloquants, raison d'une
  commande refusée au focus, tactile émulé et zoom CSS à 200 %.
- **34 tests existants réussis** : politique, projection, droits fixes et
  contrats des sous-composants ; TypeScript et lint des fichiers modifiés réussis.
  Les captures ordinateur, mobile et détail tactile ont été inspectées.
- Compilation de production et contrôle d'architecture réussis ; contrôle
  documentaire exécuté après mise à jour du suivi et de l'index.

Limites : pas de requête de sauvegarde HTTP, session réelle, test SQL, lecteur
d'écran ni appareil tactile physique dans cette passe de présentation. Le
zoom CSS ne constitue pas un essai du zoom natif du navigateur. Les preuves
des audits de sécurité précédents restent datées.

[Mesures avant](../../../audits/autorisations-visuel-2026-10-17/before.json) ·
[Mesures après](../../../audits/autorisations-visuel-2026-10-17/after.json) ·
[22 parcours](../../../audits/autorisations-visuel-2026-10-17/interactions.json) ·
[Ordinateur](../../../audits/autorisations-visuel-2026-10-17/after-1440.png) ·
[Mobile](../../../audits/autorisations-visuel-2026-10-17/after-390.png) ·
[Détail ouvert](../../../audits/autorisations-visuel-2026-10-17/touch-details-390.png).

Sélection : Q01–Q06, Q09, Q19, Q27 et Q30 pour besoin, composition, clavier,
listes, commandes, états d'accès et composants. Autres sujets hors impact
serveur/persistance ou non applicables à cette retouche locale.

### Corrections des autorisations actuelles — 15 octobre 2026

Après accord utilisateur « ok go », AUT-S02/S03 sont corrigés et vérifiés,
AUT-S05 appliqué. L'éditeur et la synthèse comptent **27 droits administratifs** :
sept pour Répertoire, dix-huit pour Utilisateurs et deux fixes de Paramètres.
Le volet personnel comporte sept capacités, dont seule l'édition prénom/nom est
configurable. La provenance dépend du Répertoire ; ses prérequis participent
aux ajouts/retraits automatiques et au calcul des droits utilisables.

Les quatre capacités d'activité sans écran actuel sont retirées des catalogues
et presets. L'ancienne API répond 410, sans SQL ni CSV ; ses anciens tests sont
remplacés par le contrat de fermeture. Les descriptions du compte personnel et
de l'état du mot de passe sont précisées. Les règles de cible, rôle, délégation
et preuve récente restent celles de [Permissions](../../../domaines/permissions.md).

Migration appliquée à la base de travail après sauvegarde signée : accès
préservés pour quatre comptes concernés, comptes protégés/supprimés inchangés,
54 migrations appliquées et aucune en attente. Preuves : 1 335 tests web
réussis (142 intégrations facultatives non exécutées), 33 tests database,
82 tests PostgreSQL Répertoire/migration inclus dans la suite et cinq parcours
Chromium/Next de production/PostgreSQL isolés, à 1440 px. Sessions préparées,
sans rejouer connexion/MFA ni toutes les combinaisons de cibles.
Le [complément du rapport](../../../audits/2026-10-15-autorisations-site.md#corrections-après-accord--15-octobre-2026)
remplace les états ouverts de la passe initiale conservée ci-dessous.

### Audit transverse des autorisations actuelles — 15 octobre 2026

L'utilisateur demande une analyse en profondeur des droits des **pages utilisables
aujourd'hui uniquement**. Les fonctions prévues et les écrans absents ne justifient
pas de permissions dans la présentation actuelle. Le
[rapport droit par droit](../../../audits/2026-10-15-autorisations-site.md)
porte les preuves, propositions et états de cette passe ; aucune règle applicative
n'a été modifiée.

Points ouverts de ce suivi : AUT-S02 (trois droits administratifs et une capacité
personnelle affichés sans écran actuel), AUT-S03 (provenance comptée utilisable
sans accès au Répertoire) et proposition AUT-S05 (descriptions des droits
personnels et des états de sécurité). Les contrôles d'attribution, retrait,
délégation, cibles administrateurs et compte racine restent pertinents dans les
tests exercés. Le défaut de confidentialité AUT-S01 appartient au Répertoire.

400 tests existants réussis et trois sondes simulées pour cette passe ; pas de
nouvelle preuve navigateur/session/PostgreSQL. La vérification ciblée antérieure
ne vaut pas clôture des nouveaux constats. Responsables des corrections à attribuer.

### Styles intermittents dans Autorisations — 15 octobre 2026

Signalement utilisateur : au changement d'onglet, parfois, l'éditeur perd sa
mise en page jusqu'à un rafraîchissement. La capture montre les styles communs
présents, mais pas les espacements, fonds et grilles de
`PermissionsEditor.module.css`. Son seul chemin de chargement passait par
`UserAccessTab`, importé à la demande.

Correction ciblée : `UserDetailLazySections` importe aussi cette feuille dès
le chargement de la fiche. Les composants restent différés et les classes,
couleurs, données et permissions sont inchangées. Le module CSS reste local ;
aucune nouvelle dépendance ni modification globale de Next.js.

Vérification avec un banc temporaire **Next.js 15.5.23 réel**, en développement
puis après compilation de production : feuille absente avant ouverture de
l'onglet dans l'état initial, présente avant ouverture avec le correctif.
Premier affichage, quatre fermetures/réouvertures et aller-retour par une autre
route sans rafraîchissement réussis ; espacement et disposition de l'en-tête
conservés, aucune erreur JavaScript. Données fictives, sans session ni base
réelle. Le chargement anticipé est vérifié ; **l'incident intermittent exact
n'a pas été reproduit spontanément**, sa disparition en session reste à confirmer.

Cinq formats du banc client existant rejoués pour Autorisations (320 à 1920 px),
TypeScript, lint et format réussis. Le build de production est celui du banc
isolé, pas une nouvelle validation complète de l'application. Sélection Q01–Q04,
Q17–Q19, Q27 et Q30 ; les autres sujets sont hors impact de cette correction de
chargement CSS. La reprise antérieure des droits et ses preuves restent datées.

### Vérification des droits dans Autorisations — 15 octobre 2026

Prolongement demandé de la vérification des suppressions, au commit `a3641a6`
(seul le suivi documentaire de la passe précédente était modifié). Les gardes
de consultation, d'édition et de rôle concordent sur le périmètre examiné :

- Superadmin sur USER/ADMIN : gestion des droits et du rôle ; les capacités
  fixes liées au rôle restent non modifiables individuellement.
- Admin sur USER : attribution/retrait selon ses capacités effectives ; sur
  un autre ADMIN ou soi-même, consultation autorisée mais aucune édition.
- Compte racine : droits implicites, aucune édition manuelle de ses accès.
- Lecture seule si les droits de gestion sont retirés ; délégation possible
  à un USER, sans lui permettre de modifier un ADMIN ni son propre compte.
- Accorder exige de posséder l'autorisation ; retirer, accorder et déléguer
  restent distincts. Seul le compte racine peut transmettre le droit de
  délégation lui-même ou changer un rôle. Promotion et gains critiques exigent
  une MFA complète de la cible ; les dépendances sont évaluées avec le lot.

Lecture des capacités client, de la politique de l'éditeur, de la projection
de lecture, du PATCH et de son autorisation des mutations. **123 tests réussis**
(104 dans `users-access-hardening`, 13 de politique d'éditeur et six de preuve).
**12 parcours Chromium réussis** : neuf combinaisons acteur/cible en lecture,
puis dépendances et séparation des portées, MFA avant promotion et conflit.
Aucun défaut constaté ni correction fonctionnelle nécessaire dans cette passe.

API/session/Prisma simulés dans les tests, API et shell simulés au navigateur ;
aucun droit réel modifié, pas de nouvelle preuve PostgreSQL ou de concurrence
réelle. Sélection Q01–Q02, Q06, Q09–Q10, Q27 et Q30 ; les autres sujets sont
hors impact de cette vérification. Les preuves antérieures restent datées.

### Autorisations — revue dédiée du 10 octobre 2026

L'onglet administratif et Compte personnel ont été analysés et harmonisés avec
la référence Répertoire. Éditeur en lignes alternées par rubrique, rôle et
sélecteurs partagés, largeur adaptée au composant, descriptions complètes,
libellés de choix visibles sur mobile. La lecture seule est descriptive.

Décisions courantes :

- Distinguer réglage configuré et accès réellement utilisable ; expliquer les
  dépendances qui bloquent un réglage autorisé et les exclure du compteur utilisable.
- Afficher uniquement les trois pages livrées et les pôles Membres/Système.
  Conserver les droits transverses dans « Historique et provenance », sans
  prétendre qu'ils donnent accès à une page Journal actuellement prévue.
- Présenter les cascades et changements de rôle dans un détail avant sauvegarde,
  avec la conséquence sur les sessions et la raison d'un lot interdit.
- Pendant l'enregistrement, verrouiller les réglages concernés. Annulation,
  scopes administratif/personnel, preuves récentes, version et contrôles serveur
  existants sont conservés. Aucun droit réel de compte n'a été modifié par l'audit.
- Compte personnel reprend le dépliage partagé des droits essentiels ; sa
  réinitialisation laisse les autorisations administratives intactes.

USR-A01 à USR-A05 corrigés et vérifiés sur les composants : **36 combinaisons
Chromium**, neuf situations à quatre largeurs. Mutation serveur réelle, lecteur
d'écran et appareils physiques non rejoués. Les constats, commandes, captures,
limites et la dette du catalogue historique sont dans le
[rapport dédié](../../../audits/2026-10-10-autorisations-utilisateur.md).
