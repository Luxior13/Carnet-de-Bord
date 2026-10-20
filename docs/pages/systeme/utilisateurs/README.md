# Utilisateurs

[Index des pages](../../../pages/README.md) · [Espace Système](../README.md) · [Design](../../../design/README.md) · [Guide général](../../../REFERENCE_GENERALE.md)

Comptes de connexion, rôles et autorisations administratives : liste, création
et fiche à trois sections. Un compte n’est pas une fiche Personne du
[Répertoire](../../membres/repertoire/README.md).

## Pages et sections

| Route | Section | Fiche | Gabarit | Harmonisation |
| --- | --- | --- | --- | --- |
| `/systeme/utilisateurs` | — | [Liste des utilisateurs](liste.md) | [A. Liste de gestion](../../../design/gabarits.md#a-liste-de-gestion) | Page de référence, complément du Répertoire |
| `/systeme/utilisateurs/nouveau` | — | [Nouvel utilisateur](creation.md) | [C. Formulaire de création](../../../design/gabarits.md#c-formulaire-de-création) | Aligné |
| `/systeme/utilisateurs/[id]` | Profil (défaut) | [Utilisateur — Profil](fiche-profil.md) | [B. Fiche à sections](../../../design/gabarits.md#b-fiche-à-sections) | Référence de la barre d’enregistrement |
| `/systeme/utilisateurs/[id]` | `?section=access` | [Utilisateur — Autorisations](fiche-autorisations.md) | [B. Fiche à sections](../../../design/gabarits.md#b-fiche-à-sections) | Aligné, cartes du 18 octobre 2026 |
| `/systeme/utilisateurs/[id]` | `?section=security` | [Utilisateur — Sécurité](fiche-securite.md) | [B. Fiche à sections](../../../design/gabarits.md#b-fiche-à-sections) | Aligné |

L’alias `/administration` redirige vers la liste ; les anciennes adresses
`/administration/utilisateurs/*` sont des alias (voir les [routes](../../../systeme/routes.md)).

## Règles communes du module

- **Accès** : `users:view` pour la liste, la fiche et `GET /api/users` ;
  `users:create` pour la création. Chaque section de la fiche est filtrée par
  [useUserDetailCapabilities](../../../../apps/web/src/components/users/user-detail/useUserDetailCapabilities.ts) ;
  le serveur contrôle chaque route. Référence : [page Utilisateurs](../../../domaines/permissions.md#page-utilisateurs).
- **Liste** : filtres rapides d’état et de rôle, sans carte de synthèse depuis
  le 20 octobre 2026 ([fiche de la liste](liste.md)).
- **Cadre de la fiche** : [UserDetailPage](../../../../apps/web/src/components/users/UserDetailPage.tsx) compose
  `PageIdentityHero` compact porteur des états du compte
  (`UserIdentityStatus`), `PageSectionNavigation` et des sections chargées à
  la demande. Plus de carte de synthèse depuis le 20 octobre 2026. Sa `SectionActionBar` est la référence de tout le site.
- **Section retirée** : l’activité du compte est retirée depuis le 10 octobre 2026 ;
  `?section=history` affiche Profil. Son code dormant (`UserHistoryTab`,
  `useUserDetailAudit`) a été retiré le 20 octobre 2026 ([SYS-03](../../../systeme/constats.md)).
- **Points ouverts** : registre USR-01 à USR-25 dans la [liste](liste.md#registre-des-points-et-déclencheurs) ;
  USR-N01 à USR-N14 (création) et USR-D01 à USR-D22 (fiche) sont clos au périmètre vérifié.

## Revues communes à la fiche

Les sections ci-dessous concernent toute la fiche ou tout le module. Celles qui
ne concernent qu’une page ou une section ont rejoint sa fiche le 19 octobre 2026,
sans modification de contenu.

## Fiche : reprise en profondeur — 20 octobre 2026

Troisième page de la reprise générale, après les deux listes. La fiche est la
référence du gabarit B et de la barre d’enregistrement : les autres fiches
s’alignent sur elle.

- **Avant** : banc client du 11 octobre rejoué sur le code actuel, 46 scénarios
  sur 48. Les deux échecs sont des attentes périmées depuis la refonte des
  Autorisations du 18 octobre (texte « Autorisé » retiré des cartes, message
  de double authentification reformulé), pas des défauts.
- **Décision** : « ok go » du propriétaire sur les six points, le même jour.
- **Constats**, tous clos :

| ID | Nature / priorité | État | Point |
| --- | --- | --- | --- |
| USR-D23 | Composition, P2 | Clos | La carte « Vue d’ensemble » occupe environ 100 px au-dessus des sections sur grand écran et 210 px sur téléphone ; ses états (compte, mot de passe, double authentification) reviennent dans Sécurité ([PREF-Q1](../../../design/preferences.md#questions-ouvertes)) |
| USR-D24 | Composition, P2 | Clos | Profil garde un bandeau « Profil utilisateur » qui répète le lien de section, contrairement à Autorisations et Sécurité (règle du 18 octobre) ; l’avertissement « Modifier l’identifiant déconnectera… » est affiché en permanence, même sans modification |
| USR-D25 | Libellés, P2 | Clos | « Le membre peut se connecter » et « ce que ce membre peut modifier » : un compte n’est pas un membre du Répertoire. Double authentification « Activée » dans la synthèse, « Active » dans Sécurité ; « État MFA » en jargon |
| USR-D26 | Alignement, P3 | Clos | Compte personnel : l’interrupteur est au milieu de la carte au lieu d’être au bord droit |
| USR-D27 | Code, P3 | Partiel | \`UserDetailPage.tsx\` fait 1 752 lignes (exception plafonnée à 2 650, budget courant 800) |
| USR-D28 | Preuve, P3 | Clos | Banc du 11 octobre périmé sur deux attentes ; à rafraîchir dans un banc daté |

- **Livré** :
  - USR-D23 : `UserIdentityStatus` (pastilles d’état, ligne « Identifiant ·
    Créé le · Modifié le ») dans le `meta` du bandeau, sur la fiche et sur Mon
    compte ; `UserOverviewCard`, `PageAsideLayout` et les styles
    `overviewCard` / `overviewHeader` supprimés ; « X sur Y utilisables » dans
    la ligne d’aide de l’onglet Autorisations, calculé sur le brouillon comme
    les compteurs par page (le compteur de la synthèse suivait la fiche
    enregistrée).
  - USR-D24 : titre « Profil » réservé aux lecteurs d’écran, « Lecture seule »
    à droite de la rubrique Identité ; aide grise « Le modifier déconnectera… »,
    avertissement seulement quand l’identifiant change ; la vue de sa propre
    fiche devient une liste de descriptions sans sous-cartes ni titre visible.
  - USR-D25 : « utilisateur » dans la fiche, ses confirmations et la
    réinitialisation de double authentification ; « Activée » aussi dans
    Mon compte ; « État » au lieu d’« État MFA ».
  - USR-D26 : interrupteur du compte personnel au bord droit de sa carte.
  - USR-D27 (partiel) : `runUserDetailPatch` factorise les quatre
    enregistrements, `useUserDetailChanges` l’état dérivé du brouillon ;
    1 740 → 1 495 lignes, plafond resserré de 2 650 à 1 500. Reste au-dessus du
    budget de 800 : extraire le rendu des sections, qui dépend d’une
    quarantaine de valeurs, est un chantier à part entière.
  - USR-D28 : [banc client du 20 octobre](../../../audits/fiche-utilisateur-2026-10-20/banc-client/README.md),
    48 scénarios sur 48 ; banc de Mon compte rejoué, 23 sur 23.
- **Vérifié** : types, lint, budget d’architecture, Vitest complet (tests de
  contrat mis à jour), bancs ci-dessus.
- **Non vérifié** : session, hydratation Next et PostgreSQL réels, lecteur
  d’écran réel, rendu sur le serveur de dev.

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

## État courant — clôture du socle du 13 octobre 2026

La [revue finale du socle](../../../audits/2026-10-12-cloture-socle.md) est
terminée au périmètre livré, pour poursuivre le développement métier. Ses
preuves et limites ne constituent pas une qualification de déploiement.

Liste, création et fiche ont été revérifiées. L’autorité de l’acteur et les
preuves sensibles sont relues dans la transaction ; les sauvegardes, reprises
MFA et suppressions conservent une attente bornée et une explication durable du
résultat incertain, sans rejeu automatique de suppression. Les mesures de listes
restent locales, sans qualification de charge concurrente.

Les décisions et preuves datées ci-dessous restent conservées. Une nouvelle
revue répond à un changement, un défaut constaté ou une règle nouvelle.

## Composants communs — 11 octobre 2026

Recherche et pagination utilisent `ListSearchField` et `ListPagination`.
Les onglets Profil, Accès et Mon compte de la fiche, ainsi que la création,
composent la même `SectionActionBar` : résumé métier conservé, état propre/saisie,
attente, annulation et explication d'un blocage. L'actualisation est distinguée
de l'enregistrement. Le profil et la création utilisent la soumission native.

La barre reste dans le flux sur petit écran ; l'annulation doit rendre le focus
au champ ou à la section. [Catalogue](../../../design/composants.md) et
[preuves de cette passe](../../../audits/2026-10-11-composants.md).
Les API simulées du banc ne rejouent pas l'intégration PostgreSQL des audits précédents.

## Identité et périmètre

- Route : `/systeme/utilisateurs`.
- Fonction livrée : rechercher et consulter les comptes, leurs accès, leur état
  et leur dernière connexion ; accès à la création selon les droits.
- Type principal : liste de gestion privée ; les passes de création et de fiche
  sont consignées dans leurs sections dédiées, avec leur périmètre propre.
- Sources : [page](../../../../apps/web/src/app/systeme/utilisateurs/page.tsx),
  [liste](../../../../apps/web/src/features/users/UsersListPage.tsx),
  [disposition](../../../../apps/web/src/components/ui/directory.module.css).
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
  [Rapport et preuves avant/après](../../../audits/2026-10-10-utilisateurs.md).
- Audit puis corrections du formulaire `/systeme/utilisateurs/nouveau` :
  **USR-N01 à USR-N07 corrigés et vérifiés**, sur Next/PostgreSQL isolés. Voir
  [le rapport de création](../../../audits/2026-10-10-creation-utilisateur.md).
- Audit puis corrections de `/systeme/utilisateurs/[id]` du 10 octobre 2026 :
  **USR-D01 à USR-D08 corrigés et vérifiés**, synthèse USR-D09 compactée.
  Essais sur Next/PostgreSQL isolés, dont défi mot de passe/TOTP réel ;
  1 036 tests web réussis et 25 ignorés.
  [Rapport, preuves et limites](../../../audits/2026-10-10-fiche-utilisateur.md).

## Fiche : harmonisation des champs — 17 octobre 2026

Complément du même jour : les contours héritent désormais du rendu adouci
d’Informations de Noctambule (1 px, #435978 au repos, #5b7699 au survol,
accent #698cdd au focus). Le changement est commun aux formulaires, sans
surcharge propre à cette fiche. Ses dix cas client ont été rejoués après
correction : [mesures et limites](../../transverse/composants-partages.md#contours-précisés-le-17-octobre-2026).
Les captures ci-dessous précèdent ce complément ; les captures du lien précédent
montrent les contours courants.

Le propriétaire a signalé que les champs de la fiche semblaient inchangés après
l’harmonisation commune. La reproduction avec UserDetailPage confirme une reprise
partielle : les Input avaient déjà les nouvelles dimensions et arrondis, mais
quatre libellés imposaient encore un texte atténué à 11 px, l’identifiant de
connexion une police monospace et le sélecteur de rôle la variante compacte.

Les sections Profil et Autorisations réutilisent maintenant les présentations
communes de Label, Input et Select : libellés à 14 px semi-gras, identifiant avec
la police des autres saisies, rôle à 40/44 px de haut avec un rayon de 8 px.
Les sous-titres Identité et Connexion et contact étaient d'abord passés à 14 px
semi-gras ; la revue de code du même jour a relevé qu'ils devenaient identiques
aux labels. Ils reprennent donc le repère en petites capitales atténuées, comme
dans la création d'utilisateur. Les filtres pôle et page/fonction restent compacts.
La règle durable est dans le [système de design](../../../design/README.md).

Vérification Chromium sur les vrais composants de la fiche, avec données,
session, navigation, API et shell simulés : **10 cas réussis**. Profil et
Autorisations contrôlés à 320, 390, 768 et 1440 px, sans débordement horizontal ;
menu du rôle au clavier, Échap et retour du focus ; erreur de prénom, focus sur
le champ puis annulation avec restauration de la valeur. Aucune mutation émise
dans ces scénarios et aucune erreur JavaScript observée. Ce contrôle ne constitue
pas une recette HTTP authentifiée ni une vérification de sauvegarde réelle.

[Mesures avant](../../../audits/champs-2026-10-17/fiche-utilisateur-avant.json) ·
[Mesures après](../../../audits/champs-2026-10-17/fiche-utilisateur-apres.json) ·
[Profil ordinateur](../../../audits/champs-2026-10-17/fiche-utilisateur-profil-1440.png) ·
[Profil mobile](../../../audits/champs-2026-10-17/fiche-utilisateur-profil-390.png) ·
[Autorisations mobile](../../../audits/champs-2026-10-17/fiche-utilisateur-acces-390.png).

## Fiche utilisateur — revue complète du 11 octobre 2026

Le [rapport courant](../../../audits/2026-10-11-fiche-utilisateur.md)
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
[rapport de fiche](../../../audits/2026-10-10-fiche-utilisateur.md#validation-des-corrections)
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

### Champs moins arrondis — historique du 10 octobre 2026

Le rendu des formulaires évolue le 17 octobre : police système, rayon de 8 px,
champs plus lisibles et hauteur adaptée au mobile. La règle courante appartient
au [système de design](../../../design/fondations.md#espacements-et-arrondis),
avec [preuves et limites communes](../../transverse/composants-partages.md#champs--harmonisation-du-17-octobre-2026).
Les filtres et sélecteurs compacts des tableaux conservent leur variante.
Les mesures ci-dessous décrivent le rendu antérieur, pas le nouveau.

À la demande d'angles plus carrés mais légèrement arrondis, le rayon par défaut
de `Input`, `Textarea` et `SelectTrigger` passe à 6 px (8 px auparavant dans
la portée indigo de cette fiche, 10 px hors de cette portée). Règle portée par
les primitives et le [système de design](../../../design/fondations.md#espacements-et-arrondis),
applicable aussi aux formulaires de création, aux dialogues et aux autres
consommateurs sans surcharge locale. Les contrôles du Répertoire sont déjà à
6 px dans leur module. Pas de changement des hauteurs, états ou comportements.

Revue légère : Q01/Q03/Q04/Q19/Q27/Q30 examinés ; autres sujets hors impact
pour cette retouche d'arrondi. Chromium avec le vrai profil rendu en HTML,
les primitives partagées et le CSS recompilé : huit contrôles à 320, 390 et
1 440 px, avec et sans portée indigo. Rayon calculé de 6 px partout, hauteurs
des saisies conservées, aucun débordement global et focus visible contrôlé.
Ce banc isolé ne rejoue pas les interactions serveur ni les parcours complets.

## Modales — revue transverse du 11 octobre 2026

Confirmations d’identifiant, contact, mot de passe, sessions et suppression,
ainsi que les preuves d’identité/MFA : surfaces et arrondis partagés, retour du
focus et actions mobiles vérifiés. La réinitialisation MFA bloque immédiatement
les doubles soumissions et ignore une réponse visant une ancienne cible. Les
preuves navigateur de cette passe utilisent des comptes et API fictifs.

[Décisions et questions communes](../../transverse/modales.md) ·
[Preuves et limites de l’audit](../../../audits/2026-10-11-modales.md).
Cette passe ne clôt pas les contrôles d’intégration encore ouverts de la page.

## Autocomplétion — correction du 11 octobre 2026

Création, fiche et confirmations administrateur suivent la règle sans autocomplétion, y compris mot de passe et MFA. Les champs invisibles username des confirmations ont été retirés ; les clés de remontage par acteur et cible sont conservées.

[Règle propriétaire](../../../design/README.md) ·
[Contrôles et limites des extensions](../../../audits/2026-10-11-autocompletion.md).
La présence des attributs d’exclusion ne garantit pas le comportement d’une
extension installée chez l’utilisateur.

## Barre de sections de la fiche — 11 octobre 2026

Profil, Autorisations et Sécurité reprennent l'état actif et les angles de 6 px
du composant partagé. Des flèches apparaissent seulement si les sections
débordent ; le lien ciblé au clavier est rendu visible. Contrôle de la fiche
à 320, 390, 768 et 1 440 px dans Chromium isolé, avec données et routeur simulés.
[Règles communes](../../transverse/navigation-generale.md#barres-de-sections--décision-du-11-octobre-2026) ;
[preuves et limites](../../../audits/2026-10-11-navigation-sections.md).
Cette passe ne rejoue pas les mutations ni les permissions serveur.

## Changement de section après défilement — 12 octobre 2026

La [passe ciblée commune](../../transverse/navigation-generale.md#changement-de-section-après-long-défilement--revue-ciblée-du-12-octobre-2026)
vérifie la fiche dans Next réel : le début du contenu reste visible, le focus
revient au lien activé et la confirmation d'abandon conserve le remplacement
d'URL. « Rester » garde URL, brouillon et scroll. Le callback de la page
effectue une navigation déjà acceptée par le composant partagé, sans deuxième
garde. NAV-08/NAV-09 et les limites sont suivis dans la note commune ; les
mutations, secrets et autorisations de la fiche ne sont pas réaudités ici.
