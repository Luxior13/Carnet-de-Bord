# Vues mobiles de toutes les pages — 28 octobre 2026

[Index des audits](README.md) · [Comportements — Mobile](../design/comportements.md#mobile-et-petites-fenêtres) · [Méthode d’audit](../methode/audit.md)

## Demande et périmètre

Le propriétaire demande un tour des vues mobiles de chaque page, « point très
important à bien mettre en place maintenant avant qu’il y ait beaucoup de
pages ». Audit transverse : toutes les routes privées et publiques, chaque
onglet des trois fiches, le menu mobile.

- **Point de départ** : `main` à `6bafed9` avec les changements locaux de la
  session (onglets, Profil, Sécurité, Paramètres, fiche personne, retrait de
  la provenance).
- **Environnement** : build de production Next, base PostgreSQL locale
  jetable préparée par `e2e:setup`, Chromium de Playwright, superadmin de test.
- **Données** : une personne aux valeurs longues (pseudo, prénom composé,
  email de 58 caractères) et un second compte au nom composé.
- **Largeurs** : 320, 390 et 768 px, hauteur 780 px ; menu ouvert sous
  1 024 px.
- **Première visite** : profil « Desktop Chrome » redimensionné, 84 captures
  relues (haut et bas de page) à 390 px, et à 320 et 768 px pour les pages
  les plus denses.
- **Contrôle permanent** (après correction) : `apps/web/e2e/mobile-layout.checks.ts`,
  appelé par le parcours E2E, sur un téléphone émulé (« Pixel 7 » : tactile,
  barres de défilement superposées). Captures gardées seulement si
  `MOBILE_TOUR_DIR` est défini, hors du dépôt.

## Limites

- Sur la première visite, le profil de bureau réservait une barre de
  défilement classique de chaque côté (`scrollbar-gutter: stable both-edges`) :
  les marges d’environ 32 px des captures n’étaient pas réelles. Le contrôle
  permanent, sur téléphone émulé, montre la marge réelle de 16 px.
- La première visite excusait tout élément contenu par un ancêtre rogné ou
  défilant ; or `#main-content` défile verticalement, donc `overflow-x: auto` :
  un débordement réel y aurait été masqué. Son « aucun débordement » n’était
  pas une preuve. Le contrôle permanent mesure le défilement horizontal de la
  page et de `#main-content`, et n’excuse que les conteneurs défilants
  volontaires ; c’est sa passe qui fait foi.
- Safari iOS, Android réel et lecteur d’écran mobile ne sont pas couverts.

## Constats

| ID | Nature / priorité | Constat | Attendu | État |
| --- | --- | --- | --- | --- |
| MOB-01 | Défaut, P2 | Cibles tactiles sous 44 px à 390 px : boutons standards et « sm » à 40 px (`Button`), recherche et tri des listes à 38 px, boutons icône à 32 px (afficher le mot de passe, aide « i », « Détails de la session », dépliants de la feuille de route), interrupteur et case sous 44 px, liens des coordonnées à 19 px | Règle écrite : 44 px sous 640 px | Clos après vérification : 44 px sous 640 px dans `Button` (défaut, sm, icône), `Select` compact, recherche et icônes des listes (texte à 16 px, sans zoom iOS), `Disclosure`, zones `::after` de `Switch` et `Checkbox`, actions du bandeau, volet Autorisations, menu Rubriques, liens des coordonnées, champs de connexion |
| MOB-02 | Défaut, P2 | Fil d’Ariane : le nom courant coupé net à 320 et 390 px (« Stéphanie-Marie Dupont-I »), sans points de suspension | Troncature avec « … », nom complet accessible | Clos après vérification : libellés dans un `span` tronqué (« Version B 1793… ») |
| MOB-03 | Dette, P2 | Listes (Répertoire, Utilisateurs) : les filtres rapides passent sur quatre à six lignes et repoussent le premier résultat d’environ 250 px | Premier résultat proche du haut sur téléphone | Clos après vérification : une rangée par groupe, défilante horizontalement sous 640 px, jusqu’aux bords de la carte |
| MOB-04 | Défaut, P2 | Mon compte, Sécurité : « Nouveaux codes de secours » et « Changer d’application » alignés à droite à largeur naturelle | Actions de carte pleine largeur sous 640 px | Clos après vérification : pieds de carte en colonne pleine largeur (double authentification, sessions, création de compte) |
| MOB-05 | Défaut, P2 | Fiche utilisateur, Autorisations : environ 300 px de réglages avant la recherche ; page ouverte en bas de l’écran ; retour et nom de page perdus au défilement ; barre d’enregistrement hors de l’écran ; onglets qui basculent en menu dès qu’un point de modification apparaît | Écran utilisable sur téléphone | Clos après vérification : vue en deux écrans, titre collé, barre `docked`, point en pastille ([fiche](../pages/systeme/utilisateurs/fiche-autorisations.md#décisions-retenues)) ; banc 59/59 |
| MOB-06 | Dette, P2 | Aucun contrôle automatique : une nouvelle page pouvait déborder ou avoir de petites cibles sans qu’un test le signale | Contrôle mobile systématique de chaque page | Clos après vérification : contrôle permanent dans l’E2E, couverture du registre des fonctionnalités exigée ; E2E réussi en 2,0 min, 54 captures, échantillon relu |

## Suite

« Ok go » du propriétaire le 28 octobre 2026 sur toutes les corrections.
Règles regroupées dans [comportements](../design/comportements.md#mobile-et-petites-fenêtres).

## Revue de code du 29 octobre 2026

Revue du commit `567d9af` (lot mobile) : dix constats, tous retenus et
corrigés le jour même (« ok go » du propriétaire). Les quatre premiers étaient
des régressions de ce lot.

| Constat | Correction |
| --- | --- |
| Barre `docked` : actions forcées sur une ligne, « Réinitialiser au rôle » rogné à 320 px quand trois actions s’affichent (reproduit au banc) | Deux actions côte à côte, trois ou plus passent à la ligne |
| Autorisations, « Accordées » : retirer la dernière autorisation laissait une page vide sans retour ni filtres | Retour automatique à la liste |
| Autorisations : page ouverte depuis le bas de la liste décalée sous son début (défilement visant la ligne de titre collée) | Défilement vers la page elle-même, avec sa marge sous la barre |
| Répertoire : croix d’effacement de la recherche portée à 44 px par `Button`, hors du champ et sur le texte ; loupe décentrée | Croix de 44 px dans le champ, texte qui s’arrête avant, loupe recentrée |
| Filtres en rangée défilante : anneau de focus rogné en haut et en bas | 4 px de marge intérieure verticale |
| Filtre « Afficher » des Autorisations : la rangée défilante débordait sur le bouton « i » entre 560 et 639 px | Rangée défilante limitée aux barres de liste (`.quickFilterSets`) |
| Liste des pages sur téléphone : page en cours non marquée | `aria-current="page"` |
| Fil d’Ariane : niveau intermédiaire sans lien coupé net | Libellé tronqué avec « … » |
| Navigation des autorisations : catalogue recompté deux fois à chaque rendu | Un seul calcul par page et par rendu |
| Règle des 44 px dupliquée dans Sécurité et la connexion | Doublons retirés, la règle vit dans `Button` |

Le contrôle mobile de l’E2E signale désormais une cible rognée par un parent
qui coupe son contenu ; il ne voyait pas le premier constat. Bancs : scénarios
`permissions-mobile-revue` et `compte-mobile-trois-actions` (fiche
utilisateur), `recherche-mobile-effacer` (Répertoire) ; le scénario de la
barre échoue avec l’ancienne règle. E2E réussi en 2,3 min avec le contrôle élargi, sans violation.

## Seconde revue de code, 30 octobre 2026

Neuf constats sur les corrections du 29, tous retenus (« ok go »).

| Constat | Correction |
| --- | --- |
| « Accordées » vidé : retour à la liste sans focus, état corrigé pendant le rendu (et sur ordinateur), note de cascade et « Annuler » perdus | Une autorisation retirée reste affichée jusqu’à l’enregistrement ; vue déduite ; un changement de filtre ramène à la liste |
| Contrôle E2E « cible rognée » : axe horizontal et premier parent seulement | Deux axes, tous les parents jusqu’au premier qui défile ; seule une coupe partielle compte |
| Barre `docked` : une ou deux lignes selon le nombre d’actions | Selon la place : `flex: 1 1 0%` et largeur minimale du contenu ; marge intérieure de 8 px, qui garde « Annuler » et « Enregistrer » côte à côte à 320 px (il manquait 0,5 px) |
| Hauteur de la barre réduite recopiée à quatre endroits | Variables `--editor-bar` et `--editor-inset` ; le script lit la marge de défilement |
| Croix de recherche par-dessus la bordure et le coin du champ | Carré de 36 px dans la bordure, zone tactile de 44 px par `::after` |
| Connexion : hauteur encore redéclarée | Retirée |
| Compteurs : cache à la main recréé à chaque rendu | Table calculée une fois par brouillon (`useMemo`) |

Vérifié : bancs fiche utilisateur 61/61, Répertoire 42/42, Utilisateurs 42/42 et
les six autres bancs touchés ; E2E réussi en 2,3 min, contrôle mobile élargi
sans violation.

## Troisième revue de code, 30 octobre 2026

Huit constats sur la seconde passe, tous retenus (« ok go »).

| Constat | Correction |
| --- | --- |
| Compteur « Accordées » différent des lignes affichées pendant des retraits | Compteur masqué tant qu’il ne correspond pas |
| Vue détail cachée mais conservée : elle revenait après un changement de rôle | Retour à la liste au moment où la page ouverte sort du filtre, une seule fois |
| Page ouverte remplacée par une autre et marquée sans action de l’utilisateur | Même retour à la liste ; aucune page marquée |
| Contrôle E2E : `overflow-x: hidden` (axe vertical calculé `auto`) jamais vérifié | Chaque axe jugé seul |
| Contrôle E2E : axe non coupé comparé quand même (`clip` sur un seul axe) | Idem |
| Connexion : bouton à 36 px sur ordinateur sous des champs à 40 px | Bouton à 40 px ; doublons de hauteur des champs retirés |
| Nouveaux comportements couverts seulement par les bancs | Logique extraite (`buildGrantedFilterView`), 5 tests Vitest |
| Compteurs : cache partiel et branche morte | Cache paresseux unique dans l’éditeur, passé à la navigation |

Vérifié : Vitest 1 249, fiche utilisateur 62/62 et les autres bancs touchés
(Mon compte 27/28 en passe complète : scénario de contact instable connu,
3/3 relancé seul) ; E2E réussi en 2,3 min, contrôle mobile par axe sans
violation.

**À vérifier, hors mobile.**

- L’éditeur d’autorisations affichait « Double authentification non activée »
  pour un compte de test créé directement en base avec `mfaEnabledAt`, sans
  secret d’application, alors que le bandeau indiquait « activée ». **Qualifié
  le 30 octobre 2026 : pas un défaut.** Le bandeau lit la date, l’éditeur exige
  la date et le secret ; activation, réinitialisation (administrateur, racine
  hors ligne) et suppression écrivent les deux dans la même transaction, donc
  aucun parcours réel ne produit l’écart. Le message n’apparaît qu’à un acteur
  qui reçoit l’information (changer un rôle est réservé au superadmin,
  accorder demande la permission d’accorder).
- **Banc Mon compte instable, corrigé le 30 octobre 2026** : le scénario
  `contact-snapshot-conflict-explicit-retry` tapait le mot de passe avant que
  la fenêtre, une image après l’actualisation, remette le focus sur l’adresse ;
  le mot de passe partait dans l’adresse (2 échecs sur 6 sous charge). Le banc
  attend désormais ce focus : 10 réussites sur 10 sous charge. L’application
  n’est pas en cause.
- Le journal du navigateur de l’E2E montre des chargements de morceaux
  JavaScript refusés par la politique de sécurité du contenu (`script-src`),
  sans échec de parcours. **Qualifié et corrigé le 30 octobre 2026.** Un
  relevé dans l’E2E a compté 25 refus : 24 préchargements
  (`<link rel="preload">`) sans jeton ajoutés par React lors des navigations
  internes (fiche utilisateur, Mon compte, fiche personne), les scripts
  eux-mêmes chargés normalement ; 1 sonde `new Function` de Zod 4.
  Aucune page privée de ses scripts. Corrections : `'strict-dynamic'` retiré
  de `script-src` (`'self'` et le jeton restent ; justification dans
  l’[architecture](../systeme/architecture.md#flux-dune-requête)), Zod en
  `jitless` dans le navigateur, et contrôle permanent `e2e/csp.checks.ts`
  qui fait échouer l’E2E sur tout refus. E2E réussi ensuite en 2,3 min,
  aucun refus sur l’ordinateur ni sur les téléphones émulés.
