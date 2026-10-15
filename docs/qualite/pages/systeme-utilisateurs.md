# Suivi — Utilisateurs : liste, création et fiche

## Corrections des autorisations actuelles — 15 octobre 2026

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
et preuve récente restent celles de [Permissions](../../references/PERMISSIONS.md).

Migration appliquée à la base de travail après sauvegarde signée : accès
préservés pour quatre comptes concernés, comptes protégés/supprimés inchangés,
54 migrations appliquées et aucune en attente. Preuves : 1 335 tests web
réussis (142 intégrations facultatives non exécutées), 33 tests database,
82 tests PostgreSQL Répertoire/migration inclus dans la suite et cinq parcours
Chromium/Next de production/PostgreSQL isolés, à 1440 px. Sessions préparées,
sans rejouer connexion/MFA ni toutes les combinaisons de cibles.
Le [complément du rapport](../../audits/AUDIT_AUTORISATIONS_SITE_2026-10-15.md#corrections-après-accord--15-octobre-2026)
remplace les états ouverts de la passe initiale conservée ci-dessous.

## Audit transverse des autorisations actuelles — 15 octobre 2026

L'utilisateur demande une analyse en profondeur des droits des **pages utilisables
aujourd'hui uniquement**. Les fonctions prévues et les écrans absents ne justifient
pas de permissions dans la présentation actuelle. Le
[rapport droit par droit](../../audits/AUDIT_AUTORISATIONS_SITE_2026-10-15.md)
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

## Styles intermittents dans Autorisations — 15 octobre 2026

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

## Compteur d'autorisations dans la synthèse — 15 octobre 2026

À la demande de l'utilisateur, la Vue d'ensemble de la fiche administrative
affiche « Autorisations : X / Y ». Le calcul est partagé avec l'éditeur :
autorisations administratives utilisables après résolution des dépendances,
sur le catalogue actuellement présenté dans cet onglet (pages disponibles et
droits transversaux d'historique). Les réglages de compte personnel sont exclus.
Un compte racine possède implicitement toutes ces autorisations.

Le compteur utilise la fiche enregistrée : modifier le brouillon ne le change
pas ; il évolue après confirmation de l'enregistrement. Sans
`canViewTargetAccess`, la case indique « Masquées » et aucun total n'est calculé.
Aucune nouvelle requête ni règle serveur. Le composant est aussi utilisé dans
Compte personnel : l'absence de la propriété optionnelle `canViewAccess` y
conserve la synthèse existante, sans ajouter ce compteur administratif.

La fiche affiche désormais six cases, sept pour le compte racine. Deux colonnes
sur mobile ; six dès 48 rem pour un compte ordinaire. Pour le compte racine,
quatre colonnes sur deux lignes dès 48 rem (état sur deux colonnes), puis sept
colonnes dès 80 rem. Le rail vertical à 118 rem est conservé. Le nombre possède
une formulation complète pour les lecteurs d'écran, sans dépendre d'une couleur.

**14 cas Chromium réussis** avec API/session et shell simulés : comparaison
avec l'éditeur et absence de débordement à 320, 390, 768, 1024, 1440 et 1920 px
pour un USER et le compte racine ; masquage pour un acteur sans lecture des
droits ; passage de 0/28 à 2/28 après enregistrement seulement, y compris avec
une réponse retardée. Captures inspectées en mobile, tablette et rail.
**20 tests existants réussis** (`permission-editor-view` et
`permission-editor-policy`), TypeScript, lint et format vérifiés. Pas de nouvelle
preuve serveur/base : leurs règles sont inchangées. Sélection légère Q01–Q05,
Q09, Q19, Q27 et Q30 ; autres sujets hors impact de cet ajout en lecture seule.

## Vérification des droits dans Autorisations — 15 octobre 2026

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

## Vérification des droits de suppression — 15 octobre 2026

Question ciblée de l'utilisateur : bouton disponible pour le superadmin et
pour un admin sur un compte standard, mais absent entre administrateurs.
Examen du commit `a3641a6`, arbre propre au départ ; aucune correction de code
nécessaire sur ce périmètre.

- Le superadmin peut demander la suppression d'un utilisateur ou d'un admin.
- Un admin peut supprimer un utilisateur standard avec `users:delete_account`
  (accordée par défaut, révocable), jamais un autre admin.
- Aucun acteur ne peut supprimer son propre compte ni le compte racine protégé.
- Le bouton reste visible pour une cible autorisée active, mais désactivé
  jusqu'à sa désactivation enregistrée, y compris pour le superadmin.
- Nuance de la politique existante : un compte USER explicitement doté du droit
  et de ses dépendances peut aussi supprimer un autre USER. Ce n'est pas une
  capacité strictement réservée au rôle ADMIN.

Concordance examinée entre `useUserDetailCapabilities`, `UserDeletionCard`,
la route DELETE et `user-deletion` : garde de rôle, permission, cible protégée,
soi-même, état enregistré et preuve récente de mot de passe. La transaction
relit l'autorité et conditionne l'écriture à l'état/version de la cible.
[Règle canonique](../../references/PERMISSIONS.md).

**12 cas Chromium réussis**, avec acteurs/cibles fictifs, présence/absence et
désactivation du bouton ; aucun appel de mutation. **13 tests ciblés réussis**
dans `users-access-hardening.test.ts` (filtre `delet|inactive|irreversibly|recent
password even`, 91 autres tests non exécutés). Ces tests de route simulent la
session et Prisma ; aucune suppression réelle ni nouvelle preuve PostgreSQL.
Sélection : Q01–Q02, Q06, Q09–Q10, Q16, Q27 et Q30 ; les autres sujets sont
hors impact de cette vérification sans modification fonctionnelle.

## Double authentification dans la synthèse — 14 octobre 2026

À la demande de l'utilisateur, `UserOverviewCard` affiche la double
authentification à côté du mot de passe : « Activée » (vert), « À configurer »
(jaune) ou « Masquée » si `securityDetailsVisible` vaut `false`. L'état vient
de `mfaEnabledAt`, déjà fourni et filtré par le service de lecture ; aucune
permission, donnée ou requête supplémentaire. La synthèse suit la fiche courante.

La grille conserve deux colonnes sur mobile, avec la dernière case seule sur
toute la largeur ; elle passe à cinq colonnes dès 48 rem, six avec la protection
du compte racine. Le rail reste vertical à partir de 118 rem.

Contrôles ciblés : cinq formats Chromium existants réussis de 320 à 1920 px,
inspection des trois états et des six cases du compte racine (768/1920 px,
depuis Profil), aucun débordement mesuré des cases. TypeScript, lint et format
réussis. Données/API et shell simulés ; règles serveur examinées dans le code,
sans nouvelle validation serveur/base. Sélection légère Q01–Q04, Q09, Q27 et
Q30 ; autres sujets hors impact de cet ajout en lecture seule.

## Allègement visuel de l'onglet Sécurité — 14 octobre 2026

L'utilisateur apprécie la présentation actuelle, puis valide les allègements
proposés après une lecture visuelle. Les cinq rubriques sont conservées : état
du compte, mot de passe/verrouillage, double authentification, sessions et
suppression. L'objectif est de réduire les répétitions et les niveaux visuels.

Décisions appliquées dans `UserSecurityTab` :

- L'impact du reset de mot de passe est une aide près du bouton, reliée par
  `aria-describedby` ; la confirmation détaillée reste en place.
- La récupération superadmin devient une aide près de l'action, également
  reliée au bouton. La restriction au compte racine et les conditions de perte
  restent explicites. Sans MFA configurée, l'état obligatoire suffit ; sans
  droit de récupération, aucun bouton n'est ajouté.
- Le verrouillage regroupe son état, son échéance éventuelle et le compteur
  de tentatives non nul, affiché une seule fois. Le texte « Aucun verrouillage
  en cours » ne répète plus le badge « Aucun ».
- Les informations ordinaires utilisent une liste de descriptions, sans
  sous-carte ni icône encadrée. Les badges d'état et les en-têtes de section
  gardent leurs repères. L'interrupteur du compte n'a plus de cadre imbriqué ;
  sa conséquence reste explicite et accentuée en cas de désactivation.
- À la demande de l'utilisateur, le badge partagé `UserStatusBadge` apparaît
  juste à gauche de l'interrupteur : « Actif » en vert ou « Désactivé » en jaune.
  Il suit la valeur du brouillon comme l'interrupteur ; la vue d'ensemble
  conserve l'état enregistré jusqu'au succès. Libellé et commandes partagent
  une ligne, avec la conséquence dessous sur toute la largeur, même à 320 px.
- Appareil, dernière activité, IP et révocation des sessions restent visibles.
  La date d'ouverture rejoint les échéances dans « Détails de la session »,
  avec le format de date français déjà utilisé pour ces échéances.

Contrôles après modification : **quinze scénarios Chromium existants réussis**
(`AUDIT_ONLY=security`, `mfa-reset`, `session`, `secret-copy`, `status-actionbar`),
dont cinq largeurs de 320 à 1920 px ; inspection des captures à 390 et 1440 px.
Inspection ponctuelle supplémentaire à 320 px : verrouillage et MFA à configurer
visibles, compteur présent une fois, date d'ouverture accessible avec Entrée,
repli avec Espace et focus conservé. **Quinze tests de contrats**, TypeScript
et lint ciblé réussis. La passe complète du banc n'a pas été rejouée.

Complément après ajout du badge : dix scénarios existants réussis
(`responsive-security` et `status-actionbar`), TypeScript et lint ciblé réussis.
Rendu actif inspecté à 320 px ; annulation, sauvegarde et focus revérifiés par
les parcours existants. Même périmètre simulé et mêmes limites que ci-dessus.

Sélection légère : Q01–Q04, Q06, Q22 et Q27 examinés ; Q30 pour le suivi.
Les autres sujets sont hors impact de cette composition : aucune modification
des permissions, requêtes, confirmations, données, composants partagés ni
dépendances. `Card`, `Button`, `Disclosure`, les jetons et la barre commune
restent réutilisés. API, acteur et shell simulés ; aucun nouveau contrôle
serveur/base, lecteur d'écran ou appareil physique. La correction de barre
ci-dessous conserve sa trace et ses preuves antérieures.

## Barre de l'onglet Sécurité — 14 octobre 2026

Correction ciblée de `/systeme/utilisateurs/[id]?section=security`, demandée
après constat d'une barre d'enregistrement permanente. `UserSecurityTab`
affiche désormais `SectionActionBar` seulement lorsque l'état « Compte actif »
diffère de la valeur enregistrée, avec les droits existants. Revenir à la valeur
initiale, annuler ou enregistrer avec succès masque la barre. Pendant une
écriture ou un conflit, le brouillon conserve ses actions et leurs verrous.
Après enregistrement, le focus revient à l'interrupteur s'il a été perdu ; un
autre contrôle focalisé ou une modale ouverte garde son focus.

Contrôles du 14 octobre : **six scénarios Chromium réussis** (trois formats
de défilement, deux parcours repos/modification/retour/écriture lente/succès,
une reprise après conflit), **onze tests de contrats**, TypeScript et lint
ciblé réussis. [Preuves client](../../audits/fiche-utilisateur-2026-10-11/banc-client/preuves/barre-conditionnelle-2026-10-14.json).
API, acteur, navigation et shell simulés ; aucun statut réel modifié et aucune
nouvelle validation serveur/base ou lecteur d'écran. Les anciennes preuves
de barre toujours présente restent historiques.

Sélection proportionnée : Q01–Q04, Q06 et Q27 examinés ; Q30 pour le suivi.
Autres sujets hors impact de cette condition d'affichage et du retour de focus :
pas de nouvelle action, règle d'accès, mutation, donnée ou composant partagé.

## État courant — clôture du socle du 13 octobre 2026

La [revue finale du socle](../../audits/AUDIT_CLOTURE_SOCLE_2026-10-12.md) est
terminée au périmètre livré, pour poursuivre le développement métier. Ses
preuves et limites ne constituent pas une qualification de déploiement.

Liste, création et fiche ont été revérifiées. L’autorité de l’acteur et les
preuves sensibles sont relues dans la transaction ; les sauvegardes, reprises
MFA et suppressions conservent une attente bornée et une explication durable du
résultat incertain, sans rejeu automatique de suppression. Les mesures de listes
restent locales, sans qualification de charge concurrente.

Les décisions et preuves datées ci-dessous restent conservées. Une nouvelle
revue répond à un changement, un défaut constaté ou une règle nouvelle.

## Revue approfondie — 11 octobre 2026

Nouvelle passe demandée après celle du Répertoire, en contexte développement.
Périmètre : liste, GET, schéma utile à sa lecture, navigation, comportements,
droits, coût serveur et refactorisation. Le [rapport du jour](../../audits/AUDIT_UTILISATEURS_2026-10-11.md)
distingue les corrections, preuves et limites ; il ne remplace pas les audits
propres aux mutations de création et de fiche.

Décisions courantes complémentaires :

- Recherche et pagination restent dans PostgreSQL : aucune collecte de tous
  les identifiants correspondants dans l'application. Le service de lecture
  réalise deux requêtes, une pour page/total filtré, une pour synthèse globale.
  Les droits et projections HTTP restent contrôlés dans la route.
  Les alias publics du compte protégé acceptent aussi mots inversés et espaces
  multiples ; ils ne sont jamais mélangés à son identité privée pour un tiers.
- Pendant une pagination, conserver les dernières lignes, leur numéro et leur
  total tant que les critères sont identiques ; une réponse pour d'autres
  critères n'est pas réaffichée sous le nouveau filtre. Une erreur est explicite.
- La pagination ajoute une entrée d'historique. Les critères sont normalisés,
  les filtres consomment la saisie courante et les paramètres inutiles disparaissent.
- Reset et retrait d'un filtre rendent le focus à la recherche. Réessayer mène
  aux résultats après réussite ; un nouvel échec permet de réessayer au clavier.
  Une saisie différente annule une ancienne intention de repositionnement.
- Retour de fiche et rechargement peuvent restaurer le lien actuellement
  focalisé ; il doit appartenir à la liste, être visible et interne. L'instantané
  reste unique, limité à 30 minutes et lié au compte, aux droits et aux critères.
- Les noms accessibles des compteurs incluent leur valeur ; « Identité protégée »
  reste lisible au clavier et au tactile. Une donnée masquée est distinguée
  d'une donnée absente. Les cartes conditionnent explicitement l'email aux droits,
  comme le tableau, et réutilisent le jeton de focus commun.
- Aucun nouveau modèle, index, migration, cache ni dépendance n'est nécessaire.
  Le schéma User est valide et ses 19 contrôles SQL ciblés passent dans la base
  isolée migrée. Les données habituelles du projet n'ont pas été modifiées.

**Liste conforme sur le périmètre vérifié ; USR-18 à USR-25 clos.**
1 145 tests web réussis (18 tests SQL Personnes ignorés), 42 scénarios client
simulés puis reprise ciblée du retour de fiche, dix parcours réels sur
Next/MFA/PostgreSQL et 33 mesures de scénarios serveur jusqu'à 10 000 comptes.
Build, types, lint, budgets et documentation vérifiés. Les limites d'appareils,
de charge et de mutations hors périmètre restent explicites dans le rapport.

## Composants communs — 11 octobre 2026

Recherche et pagination utilisent `ListSearchField` et `ListPagination`.
Les onglets Profil, Accès et Mon compte de la fiche, ainsi que la création,
composent la même `SectionActionBar` : résumé métier conservé, état propre/saisie,
attente, annulation et explication d'un blocage. L'actualisation est distinguée
de l'enregistrement. Le profil et la création utilisent la soumission native.

La barre reste dans le flux sur petit écran ; l'annulation doit rendre le focus
au champ ou à la section. [Catalogue](../../references/COMPOSANTS.md) et
[preuves de cette passe](../../audits/AUDIT_COMPOSANTS_2026-10-11.md).
Les API simulées du banc ne rejouent pas l'intégration PostgreSQL des audits précédents.

## Identité et périmètre

- Route : `/systeme/utilisateurs`.
- Fonction livrée : rechercher et consulter les comptes, leurs accès, leur état
  et leur dernière connexion ; accès à la création selon les droits.
- Type principal : liste de gestion privée ; les passes de création et de fiche
  sont consignées dans leurs sections dédiées, avec leur périmètre propre.
- Sources : [page](../../../apps/web/src/app/systeme/utilisateurs/page.tsx),
  [liste](../../../apps/web/src/features/users/UsersListPage.tsx),
  [disposition](../../../apps/web/src/components/ui/directory.module.css).
- Ce suivi est amorcé le 26 septembre 2026 depuis les décisions et contrôles déjà
  consignés. La création du référentiel n’a pas rejoué ces contrôles.
- Passe de clôture du 26 septembre 2026 : classement des 30 sujets, lecture des
  fiches applicables, revue du code et corrections ciblées. Le niveau est
  **sensible** pour la conservation des données après révocation de droits.
  Les vérifications exécutées pendant cette passe sont distinguées ci-dessous.
- Passe du 10 octobre 2026 : **alignement visuel de la liste terminé**, alignée sur la page
  de référence `/membres/repertoire` (voir la section dédiée plus bas).
- Analyse puis corrections du 10 octobre 2026 : **USR-09 à USR-17 corrigés et
  vérifiés**, avec serveur Next et PostgreSQL isolés. Les limites de validation
  restantes sont distinguées dans les points ouverts.
  [Rapport et preuves avant/après](../../audits/AUDIT_UTILISATEURS_2026-10-10.md).
- Audit puis corrections du formulaire `/systeme/utilisateurs/nouveau` :
  **USR-N01 à USR-N07 corrigés et vérifiés**, sur Next/PostgreSQL isolés. Voir
  [le rapport de création](../../audits/AUDIT_CREATION_UTILISATEUR_2026-10-10.md).
- Audit puis corrections de `/systeme/utilisateurs/[id]` du 10 octobre 2026 :
  **USR-D01 à USR-D08 corrigés et vérifiés**, synthèse USR-D09 compactée.
  Essais sur Next/PostgreSQL isolés, dont défi mot de passe/TOTP réel ;
  1 036 tests web réussis et 25 ignorés.
  [Rapport, preuves et limites](../../audits/AUDIT_FICHE_UTILISATEUR_2026-10-10.md).

## Décisions courantes

- Les flèches de pagination ont une cible de 44 px sous 640 px, mesurée aussi
  sur Utilisateurs à 320 et 390 px pendant la correction du 10 octobre.
- Titre compact, description « Gérez les comptes et leurs accès. » en texte secondaire.
- Création dans le hero de la page, adaptée aux droits.
- Sidebar ancrée à gauche ; rail indépendant à droite lorsque la place le permet.
- Largeur de travail privilégiée aux tailles intermédiaires ; centrage écran sur
  grand écran ; adaptation en cartes selon la largeur réelle.
- Seuils de tableau propres à cette liste, selon les colonnes autorisées :
  48 rem sans contact/sécurité, 52 rem avec sécurité, 56 rem avec contact,
  64 rem avec les deux. La colonne Compte conserve au moins 260 px au seuil ;
  les primitives partagées de tableau/cartes et leurs alternances restent utilisées.
- Synthèse globale compacte en grille lorsqu'elle est empilée, rail vertical
  à partir de 118 rem. Ses liens ouvrent un sous-ensemble exact en effaçant
  les autres filtres et la page, tout en conservant le tri.
- Trois ensembles d'accès exclusifs : Superadmin (`isProtected`),
  Administrateur (ADMIN non protégé), Utilisateur (USER non protégé).
  Le filtre `role=SUPERADMIN` est une catégorie de liste, pas un nouveau rôle
  persistant ni une nouvelle permission.
- Filtres actifs de recherche, état et rôle effaçables individuellement.
  Après pagination, défilement et focus reviennent au début des résultats.
  Le retour d'une fiche ou de Mon compte retrouve critères, page, position et
  lien focalisé. Un seul instantané de navigation par onglet, valide 30 minutes,
  est lié au compte, aux droits et aux critères, puis effacé après restauration.
  Il contient l'URL de recherche (donc les termes saisis), la portée technique,
  la position et le lien cible ; aucune copie des lignes de réponse.
- Palette bleue proche de la sidebar, badges discrets sans fond coloré dominant.
- Fond des avatars de compte selon l'accès (demande du 10 octobre 2026) :
  Superadmin rouge clair (`destructive`), Administrateur ambre (`warning`),
  Utilisateur bleu clair (`info`). Seul le fond change ; dessin DiceBear et
  graine d'identité sont conservés. Le libellé d'accès reste explicite dans son
  badge. Règle portée par `UserAvatar`, également utilisée dans la fiche,
  la confirmation de création, Mon compte et la sidebar ; avatars Personnes distincts.
- Recherche, filtres, tri et pagination serveur ; la liste n’affiche pas tous les
  comptes à la fois. Permissions effectives décrites dans [PERMISSIONS](../../references/PERMISSIONS.md).
- Aucun nouveau toast ou événement durable n’est nécessaire pour simplement lire
  la liste ou changer un filtre. Les événements de sécurité des autres parcours
  conservent leurs règles propres.
- Les comptes ne sont pas les fiches Personnes du Répertoire.

## Conclusion de la passe de clôture — 26 septembre 2026

Les corrections identifiées dans cette passe sont vérifiées localement. Le rendu
retenu est conservé ; cette revue n’impose pas une nouvelle refonte visuelle.
La page n’est pas certifiée « parfaite » : l’intégration avec des sessions et une
base réelles, la capacité SQL et l’accessibilité complète restent à vérifier.
Le détail et le formulaire de création nécessitent leur propre revue.

### Défauts corrigés

| Constat | Correction | Vérification de cette passe |
| --- | --- | --- |
| Les comptes à égalité de nom/date n’avaient pas de départage unique entre pages | Identifiant ajouté comme dernier critère aux trois tris serveur | Tests des requêtes de liste pour chaque tri ; exécution SQL réelle non rejouée |
| Un refus 401/403 pouvait conserver les résultats précédents | Suppression locale des lignes, statistiques, pagination et date de fraîcheur, avant même de lire le corps d’erreur | Chromium : 403 JSON et 401 non JSON après un succès |
| Des coordonnées ou signaux de sécurité chargés avant une modification de droits pouvaient subsister | Nouvelle instance de liste lorsque l’identité ou les droits de lecture des champs changent ; requête précédente annulée | Chromium : droits retirés puis serveur indisponible ; aucune ancienne donnée affichée. Droits inchangés : aucune requête supplémentaire |
| Un échec de changement de page associait les anciennes lignes au nouveau numéro | Pagination attachée à la dernière réponse réussie ; nouvelle tentative sur la page demandée | Chromium : échec de page 2, maintien de « 1–20 sur 43 », puis succès « 21–40 sur 43 » |
| Le total trouvé était présenté comme entièrement « affiché », y compris après une erreur | Libellé « trouvé », état « Résultats non actualisés » et date de dernière réussite | Chromium : succès, erreur, nouvelle tentative, aucun résultat |
| Une URL ou un grand total pouvait proposer des pages dépassant la borne serveur | Client borné à 1 000 pages ; invitation explicite à affiner la recherche au-delà | Chromium : URL page 999999 et total simulé de 30 001 comptes ; page 1000 maximale, bouton Suivant désactivé |
| Une connexion masquée était annoncée « Jamais » ; une ancienne date ne précisait pas l’année | « Masquée » distinct de « Jamais » et « Indisponible » ; année sur les dates anciennes ou d’une autre année | Tests de présentation et lecture du rendu Chromium |
| La recherche promettait l’email sans droit de consultation ; l’email autorisé manquait en cartes | Aide de recherche adaptée aux droits et adresse visible en présentation mobile | Tests de permissions de présentation ; Chromium avec et sans droit de contact |

Ces corrections restent dans la liste, ses aides de présentation et son GET.
Aucune mutation de compte, migration, dépendance ou nouvelle permission.

## Sélection des 30 sujets

« À examiner » désigne le classement de sélection ; la colonne suivante indique
le résultat de cette passe. Les validations par simulation ne valent pas une
validation de l’intégration réelle.

| ID | Classement | Résultat et décision adaptée à cette page |
| --- | --- | --- |
| Q01 | À examiner | **Examiné dans le code** : retrouver et consulter les comptes ; accès à la création selon les droits. Périmètre limité à la liste. |
| Q02 | À examiner | **Examiné dans le code** : liens natifs, contexte dans l’URL et `returnTo` contrôlé sur la collection ; compte courant vers Mon compte. Parcours réel vers les destinations encore à vérifier. |
| Q03 | À examiner | **Validé partiellement** : cinq largeurs sans débordement dans le banc Chromium. Palette, badges, contours, survols et densité héritent des contrôles visuels datés ; aucune nouvelle validation complète de police/couleur revendiquée. |
| Q04 | À examiner | **Validé partiellement** : ouverture des filtres et sélection au clavier, Échap et retour du focus dans Chromium. Lecteur d’écran, zoom natif et appareils réels restent ouverts. |
| Q05 | À examiner | **Corrigé et vérifié** : tris départagés, pages bornées, états vide/erreur, réponse tardive, pagination cohérente avec les lignes et email mobile. Voir le contrat ci-dessous. |
| Q06 | Non applicable | Aucune mutation ni formulaire métier dans la liste. Recherche et filtres couverts par Q05 ; le lien de création ne transfère pas ici la responsabilité du formulaire. |
| Q07 | À examiner | **Corrigé et vérifié** : erreur locale persistante avec Réessayer, fraîcheur de la dernière réponse et annonce de résultats adaptée. Aucun toast ajouté aux lectures/filtres. |
| Q08 | Non applicable | Consulter et filtrer ne produit aucun événement durable à adresser à un tiers. L’avertissement de mot de passe est un état existant, pas une nouvelle notification. |
| Q09 | À examiner | **Corrigé et vérifié par simulation** : purge du résultat sur refus et changement du périmètre de lecture. Tests serveur des permissions et projections rejoués ; intégration session/base encore à vérifier. |
| Q10 | À examiner | **Examiné dans le code et tests ciblés** : authentification et permission serveur, bornes des paramètres, refus du filtre de sécurité non autorisé, protections de cache et limitation de requêtes existantes. Aucun test d’intrusion global. |
| Q11 | À examiner | **Examiné dans le code** : identité protégée, adresse selon les droits, recherche limitée aux champs autorisés, données fictives pour les essais. Qualification du traitement et conservation : point organisationnel ouvert, aucune durée inventée. |
| Q12 | À examiner | **Examiné dans le code** : modèle User, identifiant unique, sélection explicite sans hash de mot de passe, exclusion des comptes supprimés et index existants. Aucune modification du schéma ; plans SQL non mesurés. |
| Q13 | Hors impact | Aucun changement de schéma, de format persistant ou de migration. |
| Q14 | À examiner | **Corrigé et vérifié par simulation** : GET borné, abandon de la requête précédente, réponse tardive ignorée et reprise après erreur. Pas de nouvelle transaction ou commande à rendre idempotente. |
| Q15 | Hors impact | Cette lecture ne modifie pas l’historique métier. Audit des actions sensibles conservé dans les parcours concernés ; erreurs techniques via le mécanisme existant. |
| Q16 | Hors impact | Aucune suppression de compte ou de capacité ; filtre `deletedAt: null` relu. Vider un résultat local devenu interdit n’est pas effacer une donnée persistante. |
| Q17 | À examiner | **Examiné dans le code / à vérifier sur base réelle** : rendu paginé, recherche différée, agrégations et index identifiés. Aucun résultat de benchmark SQL déduit des fixtures. |
| Q18 | Non applicable | Aucun goulot mesuré justifiant un cache, une virtualisation ou un nouvel index. Les agrégations supplémentaires sont un candidat de mesure pour Q17. |
| Q19 | À examiner | **Validé pour les contrôles exécutés** : helpers limités à la présentation de cette liste, composants partagés conservés, TypeScript/lint et budget d’architecture réussis. |
| Q20 | Hors impact | Avatars générés localement déjà existants ; aucun ajout de téléversement, document, stockage ou fournisseur externe. |
| Q21 | Non applicable | Aucun import/export de comptes dans cette liste. |
| Q22 | À examiner | **Corrigé et vérifié** : dates masquées/absentes/invalides distinguées, année visible dans l’historique ancien. Format français et fuseau du navigateur, sans nouvelle règle de calendrier. |
| Q23 | Non applicable | Aucun traitement différé, webhook ou intégration externe ajouté par la consultation. |
| Q24 | Hors impact | Les accès sont techniques ; aucun mandat, pouvoir de signature ou rattachement juridique modifié. Ne pas assimiler ADMIN à un dirigeant. |
| Q25 | Hors impact | Aucun joueur, roster, adhésion ou relation datée modifié. Personne et compte restent séparés. |
| Q26 | Non applicable | Aucun montant, contrat ou engagement financier. |
| Q27 | À examiner | **Validé pour les contrôles exécutés** : 215 tests ciblés, TypeScript, lint, architecture et scénarios Chromium décrits ci-dessous. E2E réel non exécuté. |
| Q28 | À examiner | **Examiné dans le code** : erreur serveur contextualisée, absence de cache HTTP des API privées, reprise locale et architecture d’exploitation inchangée. Aucun déploiement ni essai de panne d’infrastructure. |
| Q29 | Hors impact | Aucun format de sauvegarde, fichier, clé, rétention ou donnée persistante modifié. La restauration du site relève du suivi opérationnel. |
| Q30 | À examiner | **Validé pour le suivi** : documentation actualisée, liens locaux contrôlés, aucune modification de manifeste ou lockfile. Pas de nouvelle règle de framework à introduire. |

## Contrat de liste relu

- `users:view` requis côté serveur. Création via `users:create` ; contact via
  `users:view_contact` ou `users:update_contact` ; sécurité via `users:view_security`.
  Les exceptions du compte protégé restent celles de la politique centrale.
- Recherche de 100 caractères maximum : chaque mot doit correspondre à
  l'identifiant, au prénom ou au nom, indépendamment de l'ordre des mots.
  L'email est une alternative sur la saisie complète, seulement si autorisé.
  Casse et accents français normalisés, caractères LIKE échappés ; aucune
  recherche approximative. L'identité privée du compte protégé reste exclue
  pour les tiers, qui peuvent rechercher son nom public.
- Recherche différée de 400 ms. Filtre ou tri changé : page 1. Rechargement et
  retour depuis une fiche reprennent le contexte URL. La pagination ne constitue
  pas un instantané immuable si un autre administrateur modifie des comptes.
- Taille de page par défaut : `PAGINATION.DEFAULT_LIMIT` (25), plafonnée à 100 par
  le GET. Les limites explicites restent prises en compte ; aucun réglage global
  administrateur ne pilote plus cette préférence d'affichage.
  La taille effective est conservée pour les pages suivantes. Borne partagée de
  1 000 pages : filtrer au-delà ; réexaminer la stratégie si ce plafond devient réel.
- Tri par nom, dernière connexion décroissante (absences en fin), ou création
  décroissante ; identifiant unique en dernier départage. Le compte protégé est
  placé en premier pour les autres comptes afin de ne pas révéler son identité par le tri.
- Les chiffres de la Vue d’ensemble sont **globaux**, indépendants des
  filtres. Ils excluent les comptes supprimés ; le compteur de changement de mot
  de passe respecte le périmètre de sécurité et masque le compte protégé aux tiers.
  Le total des résultats près des filtres et dans la pagination est **filtré**.
- Une panne réseau/serveur conserve les lignes seulement si leur contexte
  correspond aux critères et à la page courants, en signalant leur ancienneté.
  Sinon elles sont masquées, ainsi que leur pagination et leur date de fraîcheur.
  Les compteurs globaux peuvent rester visibles après une panne ordinaire.
  Un refus d'accès efface toute la réponse. Une modification connue des droits de
  lecture recharge la liste sans afficher les anciennes données pendant l’attente.
  Cela ne remplace pas la vérification de session côté serveur.

## Vérifications exécutées pendant la clôture

Dans `apps/web`, le 26 septembre 2026 :

```text
bunx vitest run src/__tests__/users-list-presentation.test.ts src/__tests__/users-access-hardening.test.ts src/__tests__/admin-users-list-a11y-contracts.test.ts src/__tests__/api-auth.test.ts src/__tests__/api-response.test.ts src/__tests__/design-system-contracts.test.ts src/__tests__/authenticated-shell-ux-contracts.test.ts
bunx tsc --noEmit
bunx eslint src/features/users/users-list.utils.ts src/features/users/UsersListPage.tsx src/app/systeme/utilisateurs/page.tsx src/app/api/users/route.ts src/__tests__/users-list-presentation.test.ts src/__tests__/users-access-hardening.test.ts src/__tests__/admin-users-list-a11y-contracts.test.ts
bun run check:architecture
```

Résultats : **215 tests réussis sur 7 fichiers**, TypeScript/lint/architecture
réussis. Les tests de routes simulent les dépendances : ils ne prouvent pas
l’exécution réelle de Prisma, des sessions ou de la base. Les contrats de source
ne remplacent pas les essais d’interaction.

Banc Chromium temporaire : composants réels de page/liste/contrôles et CSS du
projet, API et contexte utilisateur simulés, navigation Next remplacée par un
adaptateur local, enveloppe de sidebar reproduite. Scénarios :

- succès, connexion masquée et ancienne année ; erreur de page puis nouvelle tentative ;
- refus 403 JSON et 401 non JSON après succès, sans lignes ni statistiques résiduelles ;
- retrait des droits de contact/sécurité suivi d’une panne ; actualisation de session
  à droits identiques sans rechargement inutile ;
- recherche lente Louise suivie de Camille, sans écrasement par la réponse tardive ;
- total simulé de 30 001 comptes et URL extrême ; borne de pagination explicite ;
- zéro résultat avec accès à la création ;
- largeurs 320, 390, 1024, 1440 et 1920 px sans débordement horizontal,
  contact visible en mobile, filtres au clavier et Échap avec retour du focus.

Aucune erreur JavaScript observée dans ces scénarios. Ce banc utilise une police
de repli et ne revalide pas le rendu Geist ni le shell réel. Aucune capture créée ;
serveur et fichiers temporaires retirés après les contrôles. `git diff --check`
et les liens locaux du suivi sont contrôlés en fin de passe.

## Utilisation du guide pour le prochain changement

Une retouche de description concerne surtout Q01, Q02, Q03, Q04 et Q27 ; le reste
peut être regroupé hors impact si aucun effet indirect n’est identifié.

Une nouvelle commande sur un compte réactive au minimum les questions Q06, Q07,
Q09, Q10, Q14 et Q15. Q08 se décide selon l’événement, pas automatiquement.
Un changement de stockage ou de suppression impose de reconsidérer Q11 à Q16 et Q29.

Ces exemples ne remplacent pas le passage de toutes les questions de sélection.

## Contrôles historiques et limites

Le [rapport daté](../../audits/AUDIT_UI_UTILISATEURS_2026-09-26.md) conserve le détail des
mesures, décisions et limites. Les captures, relevés et scripts temporaires ont
été supprimés à la demande de l’utilisateur.

Les essais antérieurs incluent disposition, clavier, pagination simulée, erreurs
réseau et réponses tardives. Ils ne constituent pas un benchmark de la base réelle.
Une modification future doit choisir ses propres vérifications pertinentes.

## Alignement sur la page de référence — 10 octobre 2026

`/membres/repertoire` est devenue la page de référence visuelle et UX. Cette
passe aligne la liste des comptes sans changer le métier :

- Squelette structuré aligné sur la référence : nouveau `loading.tsx` de route
  et `UsersDirectorySkeleton` (bandeau dégradé + lignes avec avatar et badges),
  remplaçant le pavé unique.
- Bouton « valider » de recherche (chevron) retiré : la recherche se déclenche
  à la frappe et avec Entrée, comme le répertoire.
- Pagination affiche désormais « Page N sur M ».
- Légende masquée ajoutée au tableau pour l'accessibilité.
- Avatars des comptes passés en style DiceBear `voxel-bot`, carrés (7 px),
  alignés sur le répertoire.
- Vue d'ensemble : comptage par rôle (Superadmin, Administrateur, Utilisateur)
  avec les badges d'accès correspondants pour relier la statistique au badge.
- Recherche insensible aux accents (et à la casse) via `translate`/`lower` en
  SQL, avec normalisation du terme côté serveur.
- Survol d'une ligne : le nom du compte se souligne (et passe en teinte
  primaire) comme sur le répertoire, pour renforcer le lien cliquable.
- Lignes du tableau et cartes mobiles compactées comme sur le répertoire :
  identifiant sous le nom en deux lignes serrées (16 px chacune) tenant dans la
  hauteur de l'avatar 36 px, suppression de la hauteur minimale forcée de
  64 px. L'indicateur « Identité protégée » est une icône (bouclier) avec
  infobulle au survol. L'identifiant masqué n'est plus affiché : un compte
  protégé montre uniquement son nom public et l'icône.
- Colonne « Email » dédiée (220 px, texte 12 px tronqué), affichée seulement
  aux acteurs autorisés à consulter le contact ; l'email n'est plus collé au
  nom dans le tableau. En cartes mobiles, il reste sur la ligne du nom.
- Colonne « Dernière connexion » en 11 px atténué, comme « Dernière
  modification » du répertoire ; flèche de fin de ligne retirée (le nom et la
  ligne restent cliquables, sans colonne d'action redondante).

Rectification documentaire lors de l'analyse suivante du 10 octobre : la
normalisation des accents via `translate`/`lower` est bien implémentée dans le GET.
L'ancien paragraphe « Non appliqué » contredisait le code et la liste ci-dessus.

Vérifications : TypeScript, lint, build réussis ; 133 tests ciblés réussis
(contrats d'accessibilité, taille de page, présentation, durcissement des accès).

## Formulaire de création — revue du 10 octobre 2026

- URL vérifiée : `/systeme/utilisateurs/nouveau` (canonique ; l'ancien
  `/administration/utilisateurs/nouveau` est redirigé). `returnTo` reste borné
  à la collection utilisateurs.
- Champs conservés : prénom (obligatoire), nom (facultatif, décision du
  2026-10-10 pour le contexte esport où le nom complet n'est pas toujours connu),
  identifiant de connexion (obligatoire), email de contact (facultatif), rôle
  (`USER`, `ADMIN` seulement pour un compte protégé). Aucun champ ajouté : le
  compte est distinct de la fiche Personne ; l'identité complète et les
  relations se renseignent sur la fiche. Le schéma reflète ce choix :
  `User.lastName` est nullable (migration `20261010150000`), et la lecture
  normalise `null` en chaîne vide pour l'affichage.
- Interface recentrée sur la tâche : hero `PageIdentityHero` compact (dégradé
  des pages de référence, avatar DiceBear du compte créé, badges d'accès
  partagés `UserAccessBadge`), formulaire en une seule carte alignée sur le
  formulaire de création du répertoire (en-tête avec `ServiceIcon`, sections
  « Identité », « Connexion » et « Accès » en libellés majuscules discrets).
  Le rôle est choisi par cartes radio (Utilisateur / Administrateur) avec
  description, au lieu d'un menu déroulant.
- Écran de succès aplati sur le même gabarit : remise du mot de passe
  temporaire puis synthèse des accès, sans cartes imbriquées.
- Aligné sur le répertoire : champs en style `Input` partagé, dernier fil
  d'Ariane sans lien vers lui-même, focus placé sur le premier champ invalide
  après validation. Autocomplétion désactivée (règle globale du 2026-10-10) :
  `autoComplete="off"` sur le formulaire, champs sans `name` ni `autoComplete`
  explicite, et champ email en `type="text"` avec `inputMode="email"`.
- Vérifié : TypeScript et lint au vert. Le parcours réel (création, mot de
  passe temporaire, relance d'authentification pour ADMIN) reste à valider en
  base réelle.

### Audit ciblé du formulaire — 10 octobre 2026

Lecture du formulaire, POST, validation, transaction et droits ; Chromium avec
composants/CSS réels mais API, acteur, shell et navigation Next simulés, sept
largeurs. **185 tests ciblés, types, lint et architecture réussis.** Aucun code
produit changé par cet audit. [Rapport et preuves](../../audits/AUDIT_CREATION_UTILISATEUR_2026-10-10.md).

La protection du brouillon, la conservation des valeurs après erreur, le focus
sur une erreur locale et l'ouverture du dialogue ADMIN fonctionnent dans ce banc.
Le nom vide est accepté par la validation métier. Les défauts portent sur les
dimensions des radios masquées, la sémantique du nom facultatif, les erreurs
serveur et le focus après transition. La remise et la reprise du secret demandent
également un cadrage explicite ; aucun envoi automatique ajouté.

USR-10 reste clos pour la réutilisation des primitives et le clavier contrôlés
précédemment. Sa vérification ne couvrait pas le débordement des radios, désormais
isolé en USR-N01. Les preuves de liste sur base réelle ne valident pas la création.

### Corrections du formulaire — 10 octobre 2026

Le « go » suivant l'audit autorise les corrections et le repère de conservation
du secret. Composition visuelle conservée ; contrôleur, validation, retours de
reprise et confirmation séparés dans `features/users` pour garder une page
lisible. Q05 devient pertinent pour la recherche exacte de reprise ; les autres
sujets gardent le périmètre de l'audit. Aucune migration, dépendance ou permission
supplémentaire.

Décisions courantes :

- Un même schéma valide la saisie et le POST. Erreurs de champ persistantes,
  erreur générale locale et focus adapté ; nom toujours facultatif.
- Radios masquées limitées à 1 × 1 px ; cartes et sélection au clavier conservées.
- Champs verrouillés pendant l'envoi et la vérification ; verrou synchrone contre
  le double envoi. Quitter pendant le POST n'annule pas la mutation serveur.
- Une panne réseau, une réponse inexploitable, une erreur 5xx ou un délai de
  30 secondes dépassé signifie « résultat à vérifier », jamais « écriture annulée ».
  La vérification attend au maximum 15 secondes ; une indisponibilité conserve
  ce parcours, sans nouvelle création automatique.
- Reprise via `GET /api/users?loginName=…&limit=1` : identifiant exact normalisé,
  droit existant `users:view`, projections existantes et exclusion de l'identité
  protégée pour un acteur non protégé, y compris avec d'autres filtres. Aucun
  secret relisible dans ce GET. Un compte trouvé peut préexister à la tentative :
  le message ne prétend pas prouver qui l'a créé.
- Aucun compte trouvé : relance explicite avec le même identifiant, toujours
  soumis à l'unicité. Compte trouvé : fiche puis réinitialisation avec les droits
  et preuves existants ; aucune réinitialisation automatique. Sans droit de
  vérification ou de réinitialisation, recours indiqué à un administrateur habilité.
- Mot de passe temporaire conservé uniquement dans l'état de la page. Message de
  copie et case « J’ai conservé ce mot de passe pour le transmettre » ; copier
  ne coche pas la case. Avant conservation déclarée, quitter ou créer un autre
  demande une confirmation ciblée. Ce repère ne prouve pas la remise effective.
  Aucun email, stockage persistant ou journal contenant ce secret ajouté.
- L'état de création est remonté à neuf si le compte, le rôle, la protection ou
  le droit de création change ; les réponses d'une instance démontée sont ignorées.

| Point | État et preuve du correctif | Déclencheur de réexamen |
| --- | --- | --- |
| USR-N01 — P2, radios et débordement | **Corrigé et vérifié** : 0 px de débordement principal/document de 320 à 1 920 px, sept largeurs ; radio 1 px et flèches clavier | Changement de primitive ou composition |
| USR-N02 — P2, nom facultatif | **Corrigé et vérifié** : attribut retiré, création réelle avec nom vide | Changement du contrat d'identité |
| USR-N03 — P2, erreurs serveur | **Corrigé et vérifié** : email refusé avant POST, doublon persistant et focus du champ ; pannes expliquées dans la page | Changement de validation ou retour API |
| USR-N04 — P2, focus des transitions | **Corrigé et vérifié** : titre de succès puis prénom après remise à zéro ; panneau de reprise focalisé | Changement des transitions |
| USR-N05 — P2, départ pendant le POST | **Corrigé et vérifié** : double soumission dans le même événement produit un seul POST, champs désactivés et avertissement exact | Changement du contrôleur ou de la navigation |
| USR-N06 — P2, réponse perdue après commit | **Corrigé et vérifié** : écriture réelle puis réponse coupée, recherche exacte, fiche et nouveau secret émis avec droit existant ; un seul compte et audit | Changement du contrat de reprise, d'unicité ou de réinitialisation |
| USR-N07 — remise du mot de passe | **Implémenté et vérifié** : copie réelle, repère de conservation, confirmation avant départ/remise à zéro ; pas de secret dans les stockages navigateur ni l'audit contrôlés | Changement de transmission des accès |

**Preuves actuelles :** Next production + Chromium + PostgreSQL 17 jetable,
51 migrations appliquées. Créations USER/ADMIN, mot de passe et TOTP réels pour
ADMIN, annulation du défi, droits délégués, CSRF, collision de deux POST et
rollback d'un échec d'audit contrôlés. Le mot de passe affiché correspond au hash
persisté ; changement obligatoire conservé. Pannes réseau/503 injectées ; les
lectures, créations, réservations et audits correspondants utilisent la vraie base.

Suite web : **1 028 tests réussis, 25 ignorés** (deux suites PostgreSQL dont les
variables dédiées ne sont pas fournies à Vitest). TypeScript, lint, build,
architecture et budget de performance réussis. Une régression Playwright durable
est intégrée au smoke et exécutée seule sur ce banc ; le smoke complet n'est pas
rejoué. [Rapport et preuves détaillées](../../audits/AUDIT_CREATION_UTILISATEUR_2026-10-10.md#validation-des-corrections).

Limites : première connexion du nouveau compte et activation MFA, lecteur d'écran,
Safari et appareils physiques non rejoués. Le changement de compte/droits pendant
un POST et les délais de 30/15 secondes sont examinés dans le code, sans scénario
navigateur dédié. Les anciennes preuves ci-dessus restent historiques.

### Revue approfondie de la création — 11 octobre 2026

Passe suivante après la liste, demandée en contexte développement. Le
[rapport du 11 octobre](../../audits/AUDIT_CREATION_UTILISATEUR_2026-10-11.md)
sépare les nouveaux contrôles des preuves du 10 octobre ci-dessus.

Décisions courantes complémentaires :

- Une copie de mot de passe ne peut annoncer son résultat que pour la dernière
  opération encore pertinente. Reset, nouveau succès et changement d'instance
  invalident les anciens résultats de copie.
- Annuler la confirmation administrateur rend le focus au bouton « Créer le
  compte » ; une confirmation réussie conserve le focus sur le titre du succès.
  La garde de navigation utilise son contrat partagé de restitution du focus.
- Le contact est facultatif et ne sert jamais d'identifiant de connexion.
  L'aide ne promet plus de récupération de compte par email.
- La création atomique appartient au service de la feature Utilisateurs. Son
  audit est obligatoire et le contrôle préalable du doublon ne lit que `id`.
- Le générateur partagé création/réinitialisation est testé directement et
  utilise les tirages `crypto.randomInt`. Longueur 14, catégories de caractères,
  hash bcrypt coût 12 et changement obligatoire restent inchangés.
- Schéma et réservations existants suffisants : aucune migration, dépendance,
  permission, notification ou nouvelle capacité de stockage ajoutée.

**Création conforme sur le périmètre vérifié ; USR-N08 à USR-N12 clos.**
28 scénarios Chromium simulés, neuf parcours réels Next/PostgreSQL/MFA et cinq
tests SQL transactionnels réussis. La première connexion du compte créé,
l'inscription MFA, le changement obligatoire puis une nouvelle connexion sont
désormais exécutés, avec une vraie copie dans le presse-papiers. Les délais
30/15 s et changements d'acteur/droits en vol sont vérifiés au banc simulé.

Suite web : 1 161 tests réussis, 41 tests SQL Personnes/liste Utilisateurs
ignorés faute de leurs variables dédiées ; les cinq SQL de création sont
exécutés. Build, lint via build, types et budgets réussis. Aucune donnée habituelle
touchée. Lecteur d'écran, Safari, appareils physiques, extensions et charge
massive restent hors des preuves, comme détaillé dans le rapport.
Documentation et index vérifiés (`docs:check` : 210 fichiers, 1 340 liens ;
six tests du contrôleur documentaire réussis). Les environnements temporaires
de cette passe ont été arrêtés et supprimés après les vérifications.

### Création : autorisation à l'exécution et reprise — complément du 12 octobre 2026

**Corrigé et vérifié dans le périmètre décrit.** Départ `31091b3`, arbre propre.
Reprise ciblée du POST de création
et de son défi administrateur partagé : vérifier l'autorisation après le calcul
du hash et les attentes éventuelles, puis le retour et la reprise dans le
formulaire. Les délais POST/GET de 30/15 secondes, l'unicité/réservation,
la remise manuelle du secret et les règles USER/ADMIN restent inchangés.
Les premières connexions, pertes de réponse et changements d'acteur déjà
éprouvés le 11 octobre ne sont pas déclarés manquants dans cette nouvelle passe.

Sélection de la [revue générale](../REVUE_GENERALE.md) : Q01–Q07, Q09–Q11,
Q14–Q15, Q17, Q19, Q22, Q27–Q28 et Q30 examinés pour la preuve sensible,
l'autorisation concurrente, la reprise exacte et le focus. Q12–Q13, Q16, Q18 et
Q29 hors impact : modèle, migrations, retrait, cache et sauvegardes inchangés.
Q08, Q20–Q21 et Q23–Q26 non applicables : aucune notification, pièce,
import/export, automatisation, règle de structure, relation esport ou finance.

| Point | Constat et portée | Correction et clôture du 12 octobre |
| --- | --- | --- |
| USR-N13 — P1, autorisation après attente | Six reproductions SQL renvoyaient 200 après capture de l'autorisation puis suppression de la source, rotation de version, retrait du droit, désactivation de l'acteur, expiration de source ou expiration de preuve ADMIN pendant une attente réelle de verrou. | **Clos au périmètre SQL testé** : acteur, source, droit et preuve relus à l'exécution ; les six refus 401/403 ne créent ni compte, ni réservation, ni audit et ne renvoient aucun secret. Snapshot d'authentification, en-têtes et quotas simulés ; POST, service, bcrypt et transactions SQL réels. |
| USR-N14 — P2, focus de vérification tardive | Pendant le GET de vérification, Tab place le focus sur un lien de navigation ; la réponse « compte trouvé » le reprend sur le bloc de reprise. Reproduit dans le navigateur avec API simulée, un POST puis un GET. | **Clos au périmètre testé** : une interaction avant la réponse ou avant le rendu annule l'intention de focus. Sans nouveau geste, le panneau le reçoit ; succès et erreur respectent le focus choisi. Cinq nouvelles régressions parmi seize tests du contrôleur, parcours client et vérification HTTP retardée réussis. |

Le défi partagé a reçu une borne de requête lors de la passe Sessions ; son
annulation, son succès et son délai dans la création sont des contrôles de
non-régression, pas de nouveaux défauts déclarés. Les preuves client simulées,
SQL et HTTP sont distinguées ci-dessous, sans nouveau rapport complet.

[Banc client : six parcours réussis](../../audits/creation-utilisateur-reprise-2026-10-12/banc-client/README.md) :
trois vérifications du focus de reprise et trois non-régressions du défi ADMIN
(annulation, succès, délai contrôlé à 31 secondes), réparties entre 390 et
1 440 px. API, contexte, routeur et horloge simulés ; polices Next non chargées.
Les anciens délais de création 30 s et de vérification 15 s ne sont pas
revendiqués comme entièrement rejoués.

[Banc serveur](../../audits/creation-utilisateur-reprise-2026-10-12/banc-serveur/README.md) :
110 tests ciblés réussis, dont onze SQL de création (six nouvelles régressions,
cinq contrats d'intégrité), puis treize SQL de sessions réussis et douze ignorés
par filtre pour vérifier l'adaptateur partagé. PostgreSQL 17, 52 migrations ;
snapshots d'authentification simulés. La preuve ADMIN est datée artificiellement,
mais l'attente de verrou est observée dans PostgreSQL. Unicité, réservations,
hash et rollback de l'audit restent contrôlés ; ce n'est pas une preuve de
toutes les courses possibles ni un essai de charge.

[Banc HTTP : trois parcours réussis](../../audits/creation-utilisateur-reprise-2026-10-12/banc-integration/README.md) :
USER, ADMIN après annulation puis vraie preuve mot de passe/TOTP, réponse
perdue après commit et recherche exacte réelle. Compte, réservation et audit
uniques ; secret affiché vérifié contre le hash, changement obligatoire conservé.
Le GET retardé conserve le focus déplacé dans la recherche rapide : un POST,
un GET de vérification, aucun rejeu. Il ne récupère pas le secret et ne prouve
pas à lui seul l'origine d'un compte trouvé. La première connexion du nouveau
compte n'est pas rejouée ; sa preuve demeure celle du 11 octobre.

Suite générale : 1 257 tests réussis, 185 ignorés, dans 103 fichiers réussis et
dix ignorés. Les SQL exécutés séparément ne sont pas additionnés à ce total.
Types, lint global, architecture, build Next 15.5.23 et budgets réussis ; création
à 281 466 octets gzip, sans hausse du plafond ni mesure de charge. Safari/iOS,
appareils physiques, lecteurs d'écran et autres mutations restent hors passe.
Nettoyage confirmé : Next et PostgreSQL arrêtés, ports 3131 et 54662 libres,
trois bases isolées et dossier temporaire supprimés avec le marker,
l'environnement et les secrets de test. Le scan des treize fichiers texte
archivés n'a trouvé aucune valeur privée.

Le [garde transactionnel](../../../apps/web/src/shared/server/user-action-authorization.ts)
est partagé seulement par la création et les sessions administratives, deux
consommateurs réels. Il relit acteur, source et permissions après les verrous ;
la preuve ADMIN reste une règle du service de création, et l'adaptateur sessions
conserve son contrat HTTP. Le calcul bcrypt reste hors de la transaction ;
compte, réservation et audit restent atomiques. Cette extraction évite deux
copies du contrôle sans généraliser toutes les actions administratives.

Question durable : l'autorisation, la session et la preuve sensible sont-elles
encore valides lorsque le compte va réellement être créé, après un calcul
coûteux ou une attente de verrou ? Une ancienne réponse de vérification peut-elle
reprendre le focus après une nouvelle action de l'utilisateur ?

## Sessions administratives — complément ciblé du 12 octobre 2026

**Corrections vérifiées dans le périmètre décrit.** Départ `2ecb215`, arbre propre.
Périmètre : lectures et révocations
individuelle/globale dans Sécurité de `/systeme/utilisateurs/[id]`, autorisation
à l'exécution, confirmation, résultat incertain et retour du focus. Le profil,
les autorisations, l'état du compte, la suppression et les resets mot de passe/MFA
ne sont pas réaudités. Les limites du 10 octobre déjà levées le 11 ne sont pas
rouvertes sans nouveau constat.

Sélection de la [revue générale](../REVUE_GENERALE.md) : Q01–Q07, Q09–Q11,
Q14–Q17, Q19, Q22, Q27–Q28 et Q30 examinés pour les sessions, les actions
sensibles et leurs reprises. Q12–Q13, Q18 et Q29 hors impact : schéma, migrations,
cache et sauvegardes inchangés. Q08, Q20–Q21 et Q23–Q26 non applicables : aucun
message différé, fichier, transfert de masse, automatisation, règle de structure,
vie esport ou engagement financier ajouté.

Décisions de cette reprise, en continuité avec les
[sessions personnelles](mon-compte.md#sécurité--attente-et-reprise-des-sessions--complément-ciblé-du-12-octobre-2026) :

- Borner lectures et révocations, corps de réponse compris. L'annulation côté
  client ou un délai dépassé ne prouve pas l'annulation de l'opération serveur.
- Distinguer refus, réussite et résultat incertain. Une réponse perdue demande
  un avertissement local persistant et une relecture bornée, sans second DELETE
  automatique. Un GET suivant ne doit pas faire annoncer l'échec d'un succès
  déjà confirmé ni bloquer indéfiniment l'interface.
- Garder les contrôles de portée et de preuve administrateur existants ;
  vérifier l'autorisation au moment de la mutation, y compris après une attente.
- Après reprise ou disparition de la ligne, rendre le focus à un élément encore
  présent et visible sous les onglets. Une interaction plus récente conserve
  la priorité sur une réponse retardée.

Le helper de Mon compte est déplacé vers `shared/utils/security-request.utils.ts`
(`securityRequest`), sans modifier sa borne de 30 secondes ni sa sémantique.
Il sert maintenant les sessions administratives et `AdminStepUpDialog`, dont
la requête de preuve est aussi bornée. Le dialogue est également consommé par
la création d'utilisateur et les paramètres : ces parcours ne sont pas
réaudités par la seule vérification de la révocation administrative. Les huit
parcours du banc Mon compte ont été rejoués avec succès après ce déplacement.

| Point | Constat reproduit avant correction | Correction et clôture du 12 octobre |
| --- | --- | --- |
| USR-D20 — P1 | GET sessions toujours en attente à 31 secondes, sans reprise ; DELETE global fermant immédiatement la confirmation mais laissant l'action désactivée indéfiniment. Un 500 JSON ou une réponse perdue ne relisait pas les sessions ; après commit simulé, quatre lignes restaient affichées pour trois sessions restantes. | **Clos au périmètre testé** : délais de 30 secondes, message persistant dans la carte Sessions, relecture sans nouveau DELETE et purge après 403 non JSON. Le POST du défi est borné ; Annuler redevient accessible après délai. Le parcours HTTP confirme la reprise après commit réel sans rejouer la révocation. |
| USR-D21 — P1 | GET et DELETE individuel/global répondaient 200 après suppression de la session source, rotation de version de l'acteur ou retrait de permission ; un DELETE répondait aussi 200 après expiration de la preuve MFA pendant l'attente réelle du verrou cible. Dix reproductions SQL avant correction, avec snapshot d'authentification simulé. | **Clos au périmètre SQL testé** : comptes verrouillés dans l'ordre de leurs identifiants, présence de la source stabilisée par verrou partagé, droits et échéances relus après l'attente. Refus 401/403, session cible préservée et aucun audit ajouté ; treize SQL ciblés réussis, sans changement des permissions ou durées. |
| USR-D22 — P2 | Le titre Sessions recevait le focus vers 80 px derrière la barre située entre 56 et 105 px, à 390 et 1 440 px. Le parcours du défi rendait aussi le focus à BODY après annulation ou succès, constat relevé pendant la correction des délais. | **Clos au périmètre testé** : titre visible vers 120 px et retour après défi vérifiés côté client ; une interaction plus récente conserve son focus malgré une réponse retardée. Focus visible aussi dans les parcours HTTP, dont la réponse perdue à 390 px. |

Ces sept reproductions utilisent les composants réels avec API, acteur et
horloge simulés ; elles ne prouvent pas un commit ou un refus serveur réel.
Le [banc client final](../../audits/utilisateur-sessions-2026-10-12/banc-client/README.md)
réussit onze parcours et archive aussi les huit contrôles Mon compte rejoués.
Les deux cas 500/réponse perdue sont rejoués après placement du message dans
la carte Sessions : deux succès inclus dans les onze parcours distincts.
Polices Next absentes, police calculée non mesurée ; aucun commit réel ni règle
de preuve validé par ces simulations. Les autres largeurs, changements d'acteur,
lecteurs d'écran et resets ne sont pas rejoués.

Le [banc serveur](../../audits/utilisateur-sessions-2026-10-12/banc-serveur/README.md)
réussit treize SQL ciblés sur 25 tests, douze ignorés par le filtre, ainsi que
39 tests API simulés distincts. PostgreSQL 17 et 52 migrations existantes ;
comptes, sessions, droits, transactions et audits réels, mais snapshot
d'authentification injecté. Dix régressions nouvelles couvrent l'autorisation
périmée ; les trois autres vérifient projection, appartenance/révocation et
rollback de la révocation globale si l'audit échoue. La preuve MFA est datée
artificiellement, son expiration intervient pendant un vrai verrou observé.

Le [banc HTTP](../../audits/utilisateur-sessions-2026-10-12/banc-integration/README.md)
réussit quatre parcours sur Next 15.5.23 et PostgreSQL isolés : annulation de
confirmation et de preuve, révocation individuelle après mot de passe/TOTP,
révocation globale et réponse perdue après commit réel. Les demandes refusées
avant la preuve sont distinctes de la reprise autorisée ; une seule mutation
et un audit par révocation réussie. La session cible révoquée reçoit 401,
l'acteur conserve sa session (200). Après perte de réponse : un DELETE, un GET,
aucune session cible restante, message persistant et titre focalisé visible.

La suite générale compte 1 252 tests réussis et 179 ignorés, dans 103 fichiers
réussis et neuf ignorés ; les 23 tests ciblés helper/UX sont inclus dans ce
total, les treize SQL sont une exécution distincte. Types, lint global,
architecture et build final Next 15.5.23 réussis. Budget de la fiche :
314 521 octets gzip, plafonds inchangés ; aucune mesure de charge déduite.
Le complément HTTP sur ce dernier build confirme le message dans la carte
Sessions et le titre focalisé à 178,30 px sous la barre finissant à 105 px
(390 × 700). Il rejoue seulement la réponse perdue : un DELETE, un GET, un audit,
cible refusée et acteur conservé ; il n'ajoute pas un cinquième parcours distinct.
Nettoyage confirmé dans le banc HTTP : Next/PostgreSQL arrêtés, ports libres,
dossier privé, cluster de deux bases, variables et secrets temporaires supprimés.
Le contrôle des artefacts conservés ne retrouve aucune valeur secrète ; aucune
base habituelle du projet n'a été utilisée.

Limites : les courses SQL ne sont pas des retraits de droits joués dans un vrai
parcours de connexion ; le banc HTTP ne rejoue pas tous les délais simulés ni
tous les consommateurs du défi. Aucun nouveau contrôle de Safari/iOS, lecteur
d'écran, appareil physique, charge ou reset mot de passe/MFA. Aucun changement
de schéma, permission, durée de session ou contrat de réponse.

Questions à conserver après un changement de ces actions : la session de
l'administrateur et la cible sont-elles encore autorisées après l'attente ? La
révocation a-t-elle pu réussir malgré l'absence de réponse ? Une relecture lente
empêche-t-elle une reprise ou déplace-t-elle le focus après une nouvelle action ?

## Fiche utilisateur — revue complète du 11 octobre 2026

Le [rapport courant](../../audits/AUDIT_FICHE_UTILISATEUR_2026-10-11.md)
distingue les preuves HTTP simulées, PostgreSQL, composants et Next authentifié.
USR-D10, repéré lors de la création, est reproduit et corrigé : le nom facultatif
vide est désormais écrit et audité sans modifier le prénom.

Décisions complétant la composition ci-dessous :

- Toute modification PATCH exige `expectedUpdatedAt`. La version enregistrée ne
  recule pas à la réception d'une ancienne lecture ; le conflit conserve le
  brouillon et demande une actualisation explicite avant une nouvelle sauvegarde.
- Le snapshot SSR, les brouillons et les secrets appartiennent à la cible et à
  l'acteur avec ses droits. Un changement de portée remonte la fiche et retire
  définitivement l'ancien snapshot SSR, même si les droits initiaux reviennent.
  Un refus 401/403/404 efface les données avant de parser son éventuel corps.
- Le verrou synchrone est commun aux sauvegardes, révocations, suppression et
  reset du mot de passe. Une réponse après départ ou changement de portée ne
  met plus à jour la fiche ni le contexte d'utilisateur.
- La section Sécurité utilise `SectionActionBar`, avec action explicite selon
  l'état demandé et retour du focus au contrôle après Annuler. Une reprise de
  conflit verrouille les champs et restaure un focus utile à sa section.
  Après le retour utilisateur du 11 octobre, la barre d'état est placée après
  toutes les cartes de Sécurité, hors de la carte « État du compte », sans
  `placement="inline"`. Elle doit rester collante au bas de la zone de page
  pendant le défilement avec un brouillon, selon les seuils du composant partagé.
  Sans modification, sur mobile ou avec une faible hauteur, elle reste dans le
  flux. La portée de sauvegarde demeure uniquement l'état du compte.
- Une session d'ancienne `securityVersion` est exclue et nettoyée au même titre
  qu'une session expirée. L'API administrative demeure bornée aux sessions de
  la cible autorisée ; les dates affichées ne suffisent pas à prouver sa validité.
- Une réponse MFA perdue ou invalide laisse un résultat incertain : vérifier
  l'état avant toute nouvelle tentative manuelle. La fermeture n'annule pas une
  opération déjà exécutée par le serveur. Aucun reset n'est rejoué automatiquement.
- Une copie de mot de passe terminée après remplacement du secret ne peut pas
  annoncer le succès sur le nouveau secret. Celui-ci reste en mémoire seulement.
- Le schéma et la transaction de mise à jour sont séparés de la route ; les
  contrôles d'acteur/cible, permissions et preuves restent dans cette dernière.
  GET/PATCH chargent une projection explicite sans hash ni secret MFA. L'exception
  de taille de la route est supprimée ; aucun seuil relevé, aucun schéma ajouté.
- Le profil administratif en lecture seule accepte les noms longs sans couper
  leur texte, y compris à 320 px.
- Dans Autorisations administratives, la barre d'enregistrement apparaît
  uniquement avec un brouillon modifié, comme dans Profil. Le message inactif
  « Aucune modification en attente » n'apporte pas d'action utile à cet endroit.
  Après succès, le focus revient au rôle ou à une permission modifiable, avec
  repli sur le titre ; le bouton d'enregistrement disparu ne le laisse pas perdu.
  Le sous-onglet Compte personnel conserve son action « Réinitialiser au rôle »
  lorsqu'une exception enregistrée existe ; cette action a une utilité même
  sans nouveau brouillon.
  Retouche locale du 11 octobre : Q01–Q04, Q06 et Q27 examinés, autres sujets
  hors impact car seules les conditions d'affichage changent. Types, lint
  ciblé et documentation vérifiés ; parcours navigateur non rejoué pour ce point.

**USR-D10 à USR-D19 clos sur le périmètre vérifié.** Suite web : 1 199 tests
réussis et 46 SQL d'autres pages ignorés ; les quinze SQL de cette fiche passent.
43 parcours client simulés distincts et treize scénarios Next/PostgreSQL réels
réussis. Connexion/MFA, révocations individuelles/globales, changements de
contact/login, secrets et réponses perdues, réenrôlement MFA, droits retirés
pendant la consultation et suppression après désactivation sont désormais
exercés. Build, lint, types et budgets passent. Les limites restantes, notamment
lecteur d'écran, Safari, appareils physiques et charge, figurent au rapport.

## Fiche utilisateur (`/systeme/utilisateurs/[id]`) — 10 octobre 2026

État après correction autorisée par « ok go corriger » : **USR-D01 à USR-D08
corrigés et vérifiés ; USR-D09 livré**. Le
[rapport de fiche](../../audits/AUDIT_FICHE_UTILISATEUR_2026-10-10.md#validation-des-corrections)
porte les reproductions, la clôture, les preuves et les limites ; ne pas dupliquer
ce registre. Les observations initiales restent historiques.

Validation du 10 octobre : **1 036 tests web réussis, 25 ignorés**, types, lint, build
et budgets réussis. Onze scénarios Chromium sur Next/PostgreSQL isolés ; trois
sections à sept largeurs sans débordement global. Sauvegarde lente, conflit,
navigation clavier/Précédent, remise, réponse perdue, expiration accélérée,
politique personnelle et suppression fictive exercés. Défi administrateur avec
mot de passe/TOTP réels ; parcours de création rejoué après adaptation de la
garde partagée. Les helpers sont intégrés au smoke, exécutés séparément ici ;
le smoke complet n'est pas rejoué.

Limites : connexion complète, reset MFA, révocation individuelle, changement
d'identifiant/contact et combinaisons exhaustives de droits non rejoués ;
révocation de droits pendant une fiche ouverte et erreurs de relecture des sessions
à éprouver. Lecteur d'écran, Safari, appareils physiques et charge SQL non validés.
La révocation globale était exécutée à l'analyse initiale. Les succès de création
et de liste ne valent pas validation de ces autres parcours.

Les décisions de composition ci-dessous restent applicables ; l'audit ne
réactive pas Activité et n'étend pas les capacités de gestion du compte.

- Onglet « Activité » retiré de la navigation (`USER_DETAIL_SECTIONS`) ; le
  code de l'historique est conservé dormant pour une restauration ultérieure.
  Les anciens liens `?section=history` retombent sur « Profil ».
- Hero passé de l'ancien `UsersAdminHero` à `PageIdentityHero` compact (dégradé
  de référence), avec l'avatar DiceBear du compte et l'identifiant en
  description. Le rôle est affiché à droite du hero, centré verticalement.
  `UsersAdminHero` a été supprimé.
- Une carte « Vue d'ensemble » (même gabarit que `/systeme/utilisateurs`)
  est placée dans le rail droit (`PageAsideLayout`) comme sur la liste, et
  regroupe état, protection, mot de passe, double authentification (ajout du
  14 octobre) et dates. Empilée, elle utilise deux colonnes puis cinq dès
  48 rem, six avec protection ; le rail vertical commence à 118 rem.
  La mesure historique de 149 px à 390 px précédait l'ajout de la MFA.
  Un état de sécurité non visible s'affiche « Masqué », sans conclure « À jour ».
- Contrat de source `admin-user-detail-subcomponents-ux-contracts.test.ts`
  actualisé.
- Onglets harmonisés : Profil aplati (plus de cartes imbriquées, sections
  « Identité » / « Connexion et contact »), statuts de sécurité en pastilles
  partagées, chips de capacité des Autorisations en pastilles (`CapabilityChip`).
- L'onglet Profil est désormais modifiable directement (plus de bouton
  « Modifier » ni de vue en lecture) avec la barre d'enregistrement partagée
  `SectionActionBar` (récupérée de `/membres/repertoire/[id]`).
- L'état enregistré et le brouillon sont distincts. Une réponse fusionne les
  champs inchangés et conserve les saisies d'autres sections ; une soumission
  utilise son instantané. Les champs concernés sont verrouillés pendant l'envoi,
  avec verrou synchrone empêchant la double soumission.
- Validation du profil partagée avec la création ; erreurs de champs serveur
  persistantes et focus utile. Un conflit impose une actualisation explicite
  conservant le brouillon avant une nouvelle soumission ; aucun écrasement forcé.
- Garde partagée pour liens, sections et historique navigateur ; l'annulation
  rend le focus au déclencheur. Le départ confirmé abandonne les brouillons et
  masque le secret ; la confirmation attend la fin d'une mutation en cours.
- Le secret de reset reste en mémoire, affiché deux minutes avec délai annoncé.
  Son masquage volontaire demande de confirmer sa conservation pour transmission.
  Le départ avant ce repère demande confirmation ; l'expiration indique comment
  réémettre un secret. Ce délai concerne l'affichage, pas sa validité serveur.
- Après réponse de reset perdue ou invalide, expliquer l'issue incertaine,
  vérifier le compte puis demander une nouvelle émission explicite. Aucun
  rejeu automatique ni récupération d'un ancien secret depuis son hash.

### Champs moins arrondis — 10 octobre 2026

À la demande d'angles plus carrés mais légèrement arrondis, le rayon par défaut
de `Input`, `Textarea` et `SelectTrigger` passe à 6 px (8 px auparavant dans
la portée indigo de cette fiche, 10 px hors de cette portée). Règle portée par
les primitives et le [design system](../../references/DESIGN_SYSTEM.md#4-espacements-et-arrondis),
applicable aussi aux formulaires de création, aux dialogues et aux autres
consommateurs sans surcharge locale. Les contrôles du Répertoire sont déjà à
6 px dans leur module. Pas de changement des hauteurs, états ou comportements.

Revue légère : Q01/Q03/Q04/Q19/Q27/Q30 examinés ; autres sujets hors impact
pour cette retouche d'arrondi. Chromium avec le vrai profil rendu en HTML,
les primitives partagées et le CSS recompilé : huit contrôles à 320, 390 et
1 440 px, avec et sans portée indigo. Rayon calculé de 6 px partout, hauteurs
des saisies conservées, aucun débordement global et focus visible contrôlé.
Ce banc isolé ne rejoue pas les interactions serveur ni les parcours complets.

## Analyse de la liste après alignement — 10 octobre 2026

### Complément : menus partagés

Le [contrôle transverse du 10 octobre](../../audits/AUDIT_MENUS_2026-10-10.md)
vérifie les filtres de liste, le rôle et les sélecteurs pôle/page de permissions
dans les vrais composants avec contexte simulé. Les surcharges de focus et
d'arrondi sont retirées : déclencheur 6 px, panneau 7 px, option 4 px, anneau
partagé au focus et pendant l'ouverture. Les classes des sélecteurs d'Activité
dormants sont alignées, sans réactiver ni valider cet onglet. Les 1 036 tests web
réussissent (25 ignorés) ; les anciennes preuves de mutations restent distinctes.

Complément du même jour : les trois filtres de liste utilisent désormais
`variant="compact"` sur le déclencheur et le contenu du sélecteur. Leur style
est extrait de `directory.module.css` pour être partagé avec les fiches du
Répertoire. Rendu calculé et ouverture/fermeture vérifiés à 320, 390, 768 et
1 440 px dans le banc du [complément Répertoire](../../audits/AUDIT_MENUS_2026-10-10.md#complément--présentation-des-sélecteurs-du-répertoire).

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
[rapport dédié](../../audits/AUDIT_AUTORISATIONS_UTILISATEUR_2026-10-10.md).

### Analyse initiale

Voir le [rapport daté](../../audits/AUDIT_UTILISATEURS_2026-10-10.md) pour la
sélection des 30 sujets, les reproductions et les captures. Passe d'analyse :
**aucun code produit modifié**.

- 225 tests dans 8 fichiers, TypeScript et lint ciblé réussis. Architecture
  échouée sur la sidebar partagée : 925 lignes pour 900, dépassement préexistant.
- Chromium isolé, vrais composants/CSS et 60 comptes fictifs, neuf largeurs de
  320 à 1 920 px. Aucun débordement horizontal global ; noms pourtant invisibles
  à 1 120 px lorsque contact et sécurité sont affichés. Voir USR-11.
- Synthèse empilée de 424 px environ, recherche repoussée vers 699 px sur mobile ;
  besoin de compacter (USR-13). Flèches mobiles 44 × 44 px cette fois mesurées
  directement sur Utilisateurs, complétant le contrôle précédent du Répertoire.
- Filtres/URL, rechargement, page hors limites, résultat vide, réponse dépassée,
  réessai et purge sur 403 non JSON exercés. Défauts de contexte après erreur et
  de défilement lors de la pagination suivis en USR-14/USR-15.
- Les scénarios navigateur simulent session/API/routage. `E2E_DATABASE_URL`
  absente ; aucune validation du parcours Next avec session/base réelles,
  de la charge SQL, d'un lecteur d'écran ou de Safari réel dans cette passe.
- Documents réconciliés avec le code : emplacement de création, accents,
  statistiques et coût apparent du GET. Les résultats de septembre et des
  passes antérieures ci-dessus restent historiques.

## Corrections après audit — 10 octobre 2026

La demande « corrige tout » autorise la correction des défauts et les améliorations
de liste retenues. Q06 est réactivé pour les primitives radio de création ; Q02
couvre aussi le retour de Mon compte et celui du squelette de fiche. Les autres
sujets sélectionnés dans l'audit restent applicables. Aucune migration produit,
nouvelle dépendance, permission ou mutation métier ajoutée.

- USR-09/USR-16 : filtres effaçables, synthèse explicitement globale et compteurs
  cliquables correspondant aux ensembles du GET.
- USR-10 : cartes radio de création composées avec `Label` et `Input` partagés ;
  choix au clavier et repère de focus vérifiés.
- USR-11/USR-13 : seuils selon les colonnes et synthèse compacte. À 390 px,
  synthèse de 235 px et recherche vers 511 px dans le vrai shell ; à 1 120 px,
  cartes lisibles avec contact et sécurité, sans débordement.
- USR-12 : recherche multi-mots réellement exécutée dans PostgreSQL, avec
  noms composés, ordre inverse, accents, caractères spéciaux et droits de contact.
- USR-14 : contexte attaché à la réponse ; une erreur de nouveau filtre ne
  réaffiche plus les anciennes lignes. Purge sur refus 401/403 conservée.
- USR-15 : reprise de position/focus et `returnTo` sécurisé jusque dans Mon compte
  et le chargement de fiche ; changement de page repositionné sur les résultats.
- USR-17 : contrôleur de chargement, filtres, résultats et navigation séparés ;
  page ramenée à environ 220 lignes. Exception de budget de 1 100 lignes retirée.
  Extraction du contexte et du suivi de viewport de la sidebar partagée : son
  dépassement de budget préexistant est également corrigé, sans relever le seuil.

**Preuves.** Build Next de production, types, lint, architecture et budget de build
réussis. Suite web : **1 018 tests réussis, 15 ignorés** (répertoire PostgreSQL sans
sa variable dédiée), dont 10 nouveaux tests SQL Utilisateurs et 10 de navigation.
Chromium avec Next, authentification serveur et PostgreSQL réels : neuf largeurs,
quatre combinaisons de droits de champs, pagination, retour fiche/Mon compte,
rechargement, recherche, erreurs injectées et reprise, réponse dépassée, refus
réels pour visiteur et profil sans droit. Aucune erreur JavaScript capturée.
[Mesures et captures](../../audits/AUDIT_UTILISATEURS_2026-10-10.md#validation-des-corrections).

Base jetable locale : 51 migrations appliquées, 61 comptes fictifs et sessions
de test insérées. Le formulaire de connexion et le défi MFA n'ont pas été joués ;
les mutations de profil/création ne sont pas couvertes par cette passe. Le petit
jeu de données ne mesure pas la charge de production. Les anciennes preuves
de septembre et de l'analyse initiale ci-dessus restent datées.

## Fond des avatars par accès — 10 octobre 2026

Retouche visuelle légère : Q01/Q03/Q04/Q19/Q27/Q30 examinés pour la couleur,
le composant partagé et sa vérification ; autres sujets hors impact, sans
modification des données, droits, parcours ou interactions. Fond SVG transparent
et couleurs sémantiques du conteneur ; initiales de secours lisibles sur ce fond.

TypeScript et lint ciblé réussis. Chromium isolé avec le vrai composant et le CSS
du projet : trois accès contrôlés à 36 et 64 px, même dessin pour une même graine.
Comparaison SVG sur 40 graines : seule la couleur de fond change. Documentation
DiceBear 10 consultée via Context7 et comparée à la version installée 10.7.0.
Les parcours complets des pages consommatrices n'ont pas été rejoués pour cette
retouche ; les essais de liste précédents restent datés.

## Registre des points et déclencheurs

Les correctifs clos et les validations restantes sont distingués ci-dessous.
Les responsables opérationnels des points ouverts restent à attribuer.

| Point | Suite concrète | Déclencheur |
| --- | --- | --- |
| USR-01 — Parcours réels avec permissions/session/base | **Clos pour la liste le 11 octobre** : dix parcours Next/PostgreSQL avec connexion mot de passe/MFA, droits, révocation, fiche/retour/rechargement ; mutations de création et de fiche suivies dans leurs audits propres | Changement d'authentification, permissions ou navigation ; aucune certification globale des autres mutations |
| USR-02 — Volumes et coûts serveur | **Mesuré et clos au périmètre actuel le 11 octobre** : 33 scénarios sur 25/1k/10k comptes, 20 échantillons chacun ; recherche large et page de 25 vérifiées à 33k en test SQL | Croissance significative, pages profondes fréquentes ou latence distante excessive ; aucune charge concurrente déduite |
| USR-03 — Coût du GET et de la recherche | **Corrigé et mesuré le 11 octobre** : plus de collecte de tous les IDs ; deux requêtes pour page/total et synthèse, médiane de recherche large 91,69 → 17,37 ms à 10k dans le banc local | Maintenir les droits et l'égalité des résultats ; mesurer avant tout cache/index supplémentaire |
| USR-04 — Plafond de pagination | Réexaminer curseur, stratégie de recherche ou taille de page si 1 000 pages deviennent nécessaires ; l’interface borne et explique désormais la limite | Volume réellement proche du plafond, selon la taille configurée |
| USR-05 — Lecteur d’écran, appareils réels, zoom natif | Exécuter les parcours importants dans ces environnements | Revue d’accessibilité complète |
| USR-06 — Graisses visuelles dans WebKit Windows | Comparer dans Safari réel avant toute correction globale de police | Revue de compatibilité |
| USR-07 — Finalité, responsable et conservation du traitement des comptes | Faire qualifier et consigner la politique applicable ; aucune validation organisationnelle ou juridique déduite de la revue du code | Cadrage de l’exploitation avec données réelles ou nouvelle entité |
| USR-08 — Responsables et fréquence de suivi | Désigner selon l’exploitation réelle | Mise en place du suivi opérationnel |
| USR-09 — Chips de filtres actifs | **Corrigé et vérifié** : recherche, état et rôle effaçables ; scénario navigateur de recherche et filtre | Clos le 10 octobre ; maintenir avec la barre de filtres |
| USR-10 — Primitives des cartes radio de création | **Corrigé et vérifié** : primitives partagées, contrat réussi, sélection et focus clavier Chromium | Clos le 10 octobre ; mutations de création non rejouées |
| USR-11 — P1, identité invisible dans le tableau | **Corrigé et vérifié** : seuils adaptés aux quatre profils de colonnes ; identité mesurée de 303 à 369 px dans les profils proches du seuil | Clos le 10 octobre ; refaire les mesures à tout ajout de colonne |
| USR-12 — P2, recherche par nom complet | **Corrigé et vérifié** : mots répartis entre les champs, 10 tests PostgreSQL réels et recherche navigateur | Clos le 10 octobre ; conserver les régressions de visibilité |
| USR-13 — P2, synthèse empilée | **Corrigé et vérifié** : grille compacte, neuf largeurs ; 235 px à 390 px | Clos le 10 octobre ; contrôler les vrais nouveaux compteurs |
| USR-14 — P2, anciennes lignes sous de nouveaux critères | **Corrigé et vérifié** : anciennes lignes masquées sous un autre contexte ; erreur après page 2, filtre ADMIN et réessai exécutés | Clos le 10 octobre ; préserver lors des changements de chargement |
| USR-15 — P2, pagination et reprise de position | **Corrigé et vérifié** : résultats remis à portée au changement de page ; retours fiche/Mon compte avec page, défilement et focus dans Next réel | Clos le 10 octobre ; conserver la portée compte/droits de l'instantané |
| USR-16 — P2, compteurs globaux utilisables | **Corrigé et vérifié** : libellé global, liens natifs et catégories exclusives ; compteur Administrateurs et résultat tous deux à 20 dans le jeu de test | Clos le 10 octobre ; ne pas confondre rôle stocké et catégorie de liste |
| USR-17 — P2, découpage de la liste | **Corrigé et vérifié** : responsabilités séparées, exception de budget retirée, suite web et build réussis | Clos le 10 octobre ; maintenir les responsabilités par module |
| USR-18 — P2, plafond SQL caché de recherche | **Clos le 11 octobre** : erreur P2035 reproduite à 33k puis supprimée ; page bornée, deux requêtes, SQL réel et intégration vérifiés | Conserver la régression de recherche large |
| USR-19 — P2, contexte de pagination | **Clos le 11 octobre** : lignes, numéro, total et retour de fiche correspondent à la réponse affichée pendant attente/erreur | Changement du contrôleur ou des liens de liste |
| USR-20 — P2, historique et recherche en attente | **Clos le 11 octobre** : Back entre pages, filtre utilisant la saisie courante, normalisation immédiate des URL | Changement du routeur, de la recherche ou des filtres |
| USR-21 — P2, reprise de navigation | **Clos le 11 octobre** : focus différé annulable, instantané consommé avec contrôle, retour de fiche puis rechargement avec focus vérifiés | Changement de critères, de portée ou de disposition |
| USR-22 — P2, focus après action | **Clos le 11 octobre** : effacement/reset vers recherche ; reprise réussie vers résultats, nouvel échec vers Réessayer | Changement des commandes ou états d'erreur |
| USR-23 — P2, sémantique et focus visuel | **Clos le 11 octobre** : valeurs des compteurs annoncées, identité protégée lisible, avatars décoratifs et jeton de focus commun | Nouvelle colonne, compteur ou variante de carte |
| USR-24 — P2, garde locale du contact mobile | **Clos le 11 octobre** : même condition de permission sur tableau et cartes, serveur réel et donnée excessive simulée contrôlés | Changement des projections ou données de carte |
| USR-25 — P2, alias publics recherchables | **Clos le 11 octobre** : mots inversés/espaces multiples acceptés, mots privés exclus, SQL réel | Changement des alias ou de la recherche |

Les preuves avant/après figurent dans les
[rapports du 10 octobre](../../audits/AUDIT_UTILISATEURS_2026-10-10.md) et
[du 11 octobre](../../audits/AUDIT_UTILISATEURS_2026-10-11.md).
La correction a utilisé sa propre base locale jetable et des sessions fictives,
sans utiliser la base applicative ni les identifiants E2E de l'exploitant.

## Modales — revue transverse du 11 octobre 2026

Confirmations d’identifiant, contact, mot de passe, sessions et suppression,
ainsi que les preuves d’identité/MFA : surfaces et arrondis partagés, retour du
focus et actions mobiles vérifiés. La réinitialisation MFA bloque immédiatement
les doubles soumissions et ignore une réponse visant une ancienne cible. Les
preuves navigateur de cette passe utilisent des comptes et API fictifs.

[Décisions et questions communes](modales.md) ·
[Preuves et limites de l’audit](../../audits/AUDIT_MODALES_2026-10-11.md).
Cette passe ne clôt pas les contrôles d’intégration encore ouverts de la page.

## Autocomplétion — correction du 11 octobre 2026

Création, fiche et confirmations administrateur suivent la règle sans autocomplétion, y compris mot de passe et MFA. Les champs invisibles username des confirmations ont été retirés ; les clés de remontage par acteur et cible sont conservées.

[Règle propriétaire](../../references/DESIGN_SYSTEM.md) ·
[Contrôles et limites des extensions](../../audits/AUDIT_AUTOCOMPLETION_2026-10-11.md).
La présence des attributs d’exclusion ne garantit pas le comportement d’une
extension installée chez l’utilisateur.

## Barre de sections de la fiche — 11 octobre 2026

Profil, Autorisations et Sécurité reprennent l'état actif et les angles de 6 px
du composant partagé. Des flèches apparaissent seulement si les sections
débordent ; le lien ciblé au clavier est rendu visible. Contrôle de la fiche
à 320, 390, 768 et 1 440 px dans Chromium isolé, avec données et routeur simulés.
[Règles communes](navigation-generale.md#barres-de-sections--décision-du-11-octobre-2026) ;
[preuves et limites](../../audits/AUDIT_NAVIGATION_SECTIONS_2026-10-11.md).
Cette passe ne rejoue pas les mutations ni les permissions serveur.

## Changement de section après défilement — 12 octobre 2026

La [passe ciblée commune](navigation-generale.md#changement-de-section-après-long-défilement--revue-ciblée-du-12-octobre-2026)
vérifie la fiche dans Next réel : le début du contenu reste visible, le focus
revient au lien activé et la confirmation d'abandon conserve le remplacement
d'URL. « Rester » garde URL, brouillon et scroll. Le callback de la page
effectue une navigation déjà acceptée par le composant partagé, sans deuxième
garde. NAV-08/NAV-09 et les limites sont suivis dans la note commune ; les
mutations, secrets et autorisations de la fiche ne sont pas réaudités ici.
