# Suivi — Navigation générale, sidebar et header

## Décisions courantes

Décisions actualisées le 27 septembre 2026. Composants partagés par les pages privées. Besoin :
changer souvent de rubrique, prévoir huit rubriques et conserver des pages lisibles.
Le rail latéral a été abandonné à la demande de l’utilisateur au profit d’une
**grille en haut de la sidebar**. Les décisions ci-dessous remplacent ce rail.

Sources : [Sidebar](../../../apps/web/src/components/Sidebar.tsx),
[PoleNavigation](../../../apps/web/src/components/layout/PoleNavigation.tsx),
[primitives](../../../apps/web/src/components/ui/sidebar.tsx),
[Header](../../../apps/web/src/components/layout/Header.tsx),
[fil d’Ariane](../../../apps/web/src/components/ui/breadcrumb.tsx),
[navigation canonique](../../NAVIGATION.md).

- Sidebar ancrée à gauche, toujours ouverte à 264 px sur ordinateur.
  Réduction et bouton desktop retirés à la demande de l’utilisateur le 27 septembre.
  Fond bleu conservé, sans nouvelle texture ni dégradé.
- Identité Noctambule : zone fixe de 56 px, séparateur aligné sur le header,
  logo de 36 px centré dans son emplacement fixe de 28 px, nom de 15 px semi-gras et
  espacement de 12 px après cet emplacement. Lien vers l’accueil de 44 px de haut, survol sémantique
  et focus intérieur ; nom accessible « Noctambule — Accueil ».
  Fermeture mobile contenue dans la hauteur de l’identité.
- Rubriques sous le logo : quatre icônes par ligne, une ligne avec les quatre
  rubriques livrées, deux lignes avec huit. Aucun bouton de pagination. Catalogue
  filtré par les droits et la disponibilité ; aucun module futur activé pour le décor.
- Pages en dessous sur toute la largeur, avec le nom de la rubrique puis les
  groupes. La deuxième ligne d’icônes consomme de la hauteur, en contrepartie de
  l’accès direct aux huit rubriques et de la largeur récupérée pour les pages.
- Bloc d’icônes limité à `min(35svh, 8rem)`, défilement indépendant si nécessaire.
  Le nom de rubrique défile avec les pages pour garder les liens accessibles
  sur les écrans bas ; le profil reste au pied de la sidebar.
- Icônes de rubrique de 20 px, cibles de 44 × 44 px, couleur sémantique stable,
  sans pastille colorée. Sélection : fond bleu discret, trait inférieur et
  `aria-current="location"`. Infobulle après 250 ms, sous la grille, nom accessible.
- Pages : icônes neutres de 16 px, texte de 14 px, hauteur de 40 px sur ordinateur
  et 44 px sur mobile. Page courante bleue et texte renforcé, également sur ses
  fiches. Rayons de 8 px, focus intérieur. Branche active plus discrète.
- Mobile : grille de quatre icônes au-dessus des pages, volet de 288 px limité
  au viewport. Changer de rubrique garde le volet ouvert ; choisir une page le
  ferme. L’ouverture du volet reste indépendante de la sidebar fixe desktop.
- Groupes imbriqués : lien parent distinct du dépliage. La sous-page courante
  reste visible lorsqu’elle est montée après l’ouverture de son groupe. La zone
  des pages révèle aussi la destination active lorsqu’elle change de taille.
  Ouvrir un groupe sans lien courant ne déclenche pas ce repositionnement.
- Profil : fond transparent au repos, hauteur 56 px.
  Nom complet dans le menu, bleu à l’ouverture ou sur Mon compte, déconnexion
  protégée en cas de saisie non enregistrée.
- Header de 56 px sur fond `surface-panel` : contexte à gauche, recherche et notifications à droite.
  Zone centrale souple pour les chemins longs ; outils supplémentaires à justifier
  par un usage global et à regrouper sur petit écran si nécessaire.
- Contrôles principaux du header de 40 px de haut sur ordinateur et 44 px sous
  1024 px. Recherche de 224/256 px sur ordinateur, icône en dessous. Sous 640 px,
  menu « … » pour les ancêtres et page courante à côté. Fermeture du menu lors
  du changement de présentation. Page courante semi-grasse, focus intérieur.
- Menu de sidebar réservé au mobile ; séparateur visible de 640 à 1023 px.
  Infobulles de recherche, notifications et menu après 300 ms. Recherche accessible
  par Ctrl + K ou ⌘ + K, indication à partir de 1280 px, retour au focus d’origine.
  Le raccourci respecte les autres fenêtres ouvertes et les compositions de saisie.

Le défilement des pages par rubrique reste mémorisé. Le shell contrôle la sidebar
ouverte ; l’ancienne préférence `team-control:sidebar:desktop-open` et la clé
`team-control:sidebar:poles-open:<compte>` sont ignorées. Aucun effacement de stockage nécessaire. Routes, permissions, API,
schéma et dépendances inchangés. Les couleurs de pôles des autres composants
restent celles du thème existant.

## Sélection des sujets pour la grille

Niveau fonctionnel, selon [le guide général](../REVUE_GENERALE.md).

| Classement | Sujets | Justification |
| --- | --- | --- |
| À examiner | Q01, Q02, Q03, Q04, Q09, Q17, Q19, Q27, Q30 | Usage fréquent, disposition, sélection, clavier, mobile, entrées autorisées, volume visuel, composant partagé, vérifications et documentation |
| Hors impact | Q05, Q06, Q07, Q08, Q10, Q11, Q12, Q13, Q14, Q15, Q16, Q20, Q22, Q24, Q25, Q28, Q29 | Aucune modification des collections métier, actions, retours, notifications, données, sécurité, schéma, cycle de vie ou exploitation ; session et profil réutilisés |
| Non applicable | Q18, Q21, Q23, Q26 | Aucun besoin de cache, import/export, intégration externe ou engagement financier |

Q17 porte sur la capacité du menu, pas sur un gain réseau ou SQL : aucun
benchmark de charge annoncé. Le bloc de rubriques utilise un `ResizeObserver`.
La zone des pages observe sa taille et l’insertion d’un lien courant ; les
observateurs sont nettoyés et ne déclenchent pas de requête supplémentaire.
Q09 vérifie les règles existantes de visibilité, sans remplacer un audit serveur.

## Vérifications de la grille — 26 septembre 2026

Le 26 septembre 2026, depuis `apps/web` :

```text
bunx vitest run src/__tests__/sidebar-ux-contracts.test.ts src/__tests__/navigation.constants.test.ts src/__tests__/authenticated-shell-ux-contracts.test.ts src/__tests__/design-system-contracts.test.ts
bunx tsc --noEmit
bunx eslint src/components/Sidebar.tsx src/components/layout/PoleNavigation.tsx src/components/ui/sidebar.tsx src/__tests__/sidebar-ux-contracts.test.ts
```

**68 tests réussis, TypeScript et lint réussis.** Contrats de présentation
existants actualisés pour la grille. Les tests de source ne prouvent pas le rendu.

Banc Chromium avec Sidebar, SidebarProvider, menus, avatars, CSS et Geist réels ;
profil, navigation Next et disponibilité simulés. Données fictives : quatre puis
huit rubriques, 26 pages principales plus un groupe avec une sous-page.

- À 1440 × 900 : sidebar à x = 0, largeur 264 px ; pages sur 263 px intérieurs
  au lieu de partager cette largeur avec un rail. Quatre icônes sur une ligne,
  huit sur deux lignes alignées ; cibles de 44 × 44 px contenues horizontalement.
- Couleurs et sélection inspectées ; infobulle, Échap, focus intérieur et
  changement de rubrique par Entrée vérifiés.
- Mode réduit de 56 px : une colonne d’icônes, déploiement de la rubrique active
  conservant une URL de fiche et ses filtres ; sélection de la collection conservée.
- Sous-page active après ouverture automatique d’un groupe : défaut de
  visibilité constaté puis corrigé et vérifié.
- Mobile à 390 × 844 : grille au-dessus des pages de 287 px intérieurs ;
  changement de rubrique gardant le volet ouvert, choix d’une page le fermant.
- Réduction à 390 × 320 : destination active révélée, profil visible, aucun
  débordement horizontal. Huit rubriques et cibles de 44 px conservées.
- À 320 × 640 : cibles contenues, menu de profil, Échap et retour du focus.
- Focus avec contour intérieur en couleurs forcées ; parcours avec mouvement
  réduit. Aucune erreur JavaScript observée.

Captures et banc temporaires supprimés après vérification. Liens documentaires
locaux et `git diff --check` contrôlés avant clôture.

## Retouche de l’identité — 26 septembre 2026

Niveau léger : améliorer les proportions et alignements du haut de la sidebar.
À examiner : Q01, Q02, Q03, Q04, Q27, Q30. Hors impact : Q05–Q17, Q19, Q20,
Q22, Q24, Q25, Q28, Q29, car la retouche conserve les données, accès, parcours
métier, image source, architecture et exploitation. Non applicable : Q18, Q21,
Q23, Q26, aucun cache, import/export, automatisme ni engagement financier requis.

13 tests existants réussis (`sidebar-ux-contracts`, `authenticated-shell-ux-contracts`),
TypeScript et lint des deux composants modifiés réussis. Aucun test décoratif ajouté.
Banc Chromium avec Sidebar, primitives, CSS et Geist réels ; contexte utilisateur,
navigation Next et header adjacent de 56 px simulés. Vérifiés : dimensions du logo
et du texte, bordure alignée, survol sans déplacement, focus au clavier, centrage
à 56 px en mode réduit, mobiles de 390 et 320 px, nom non tronqué et fermeture
de 44 px sans chevauchement. Lien d’accueil, fermeture du volet par ce lien et
focus en couleurs forcées contrôlés ; aucune erreur JavaScript. Captures inspectées.
Cette passe ne rejoue pas l’audit fonctionnel complet de la grille ni une session réelle.
Banc et captures temporaires supprimés après vérification.

Complément : logo agrandi de 28 à 36 px dans le même emplacement de 28 px.
Contrôle géométrique Chromium sur le balisage d’identité isolé et le CSS réel :
positions du texte, du lien, du header et du bloc suivant identiques avant/après,
logo contenu dans le lien en modes ouvert, réduit et mobile. Ce contrôle ciblé
ne rejoue pas les parcours ci-dessus. Script temporaire supprimé.

## Nom Noctambule — 27 septembre 2026

L’identité affichée remplace Team Control par Noctambule, nom de la structure.
Source commune : `SITE_CONFIG`, consommée par la sidebar, les métadonnées,
la connexion (« Espace de gestion »), les nouveaux QR de configuration MFA
et l’en-tête des fichiers de secours. Titres spécifiques : « Utilisateurs ·
Noctambule », « Mon compte · Noctambule » et « Connexion · Noctambule ».
Le logo de 36 px, son emplacement et la typographie restent ceux validés plus haut.

Niveau léger, changement de libellés. À examiner : Q01–Q04, Q10, Q19–Q21,
Q27, Q30. Hors impact : Q05–Q09, Q11–Q17, Q22, Q24, Q25, Q28, Q29 : aucun
changement de règles métier, données, accès, sessions, rétention ou déploiement.
Non applicable : Q18, Q23, Q26, aucun besoin de cache, automatisme ou finance.

La nouvelle désignation MFA concerne les prochains enrôlements. Les entrées déjà
enregistrées dans les applications d’authentification ne sont pas renommées à distance.
Les préfixes cryptographiques, noms de cookies, clés de stockage et anciennes routes
restent stables : un renommage visuel ne doit pas invalider les secrets, codes ou
préférences existants. Le fichier de secours conserve son contenu utile et porte
désormais le nom `codes-secours-noctambule-AAAA-MM-JJ.txt`.

Vérifications : 43 tests existants réussis (navigation, sidebar, shell, serveur MFA,
configuration MFA et contrats de présentation MFA), TypeScript et lint des fichiers
modifiés réussis. Relecture des consommateurs et recherche de l’ancien nom visible
dans le code applicatif. Aucun nouveau test décoratif ni nouvelle capture.
Ces contrôles ne rejouent pas une connexion réelle, le téléchargement dans un
navigateur ou un enrôlement sur téléphone ; les contrôles visuels précédents
restent datés. Références canoniques et contexte d’AGENTS.md actualisés.

## Header et sidebar fixe — 27 septembre 2026

Périmètre fonctionnel : présentation du header, raccourci de navigation et retrait
du repli desktop. À examiner : Q01–Q04, Q08, Q09, Q16, Q19, Q27, Q30.
Hors impact : Q05–Q07, Q10–Q15, Q17, Q20, Q22, Q24, Q25, Q28, Q29 : mêmes
recherche, mutations, données, autorisations, API et exploitation. Non applicable :
Q18, Q21, Q23, Q26, aucun cache, import/export, automatisme ou engagement financier.

75 tests existants réussis (recherche, header/notifications, sidebar, shell,
design system et navigation protégée), TypeScript et lint des fichiers modifiés
réussis. Les anciens contrats imposant l’absence de raccourci et le repli desktop
ont été actualisés. Les contrôles fonctionnels ci-dessous complètent ces contrats de source.

Banc Chromium avec vrais Header, Sidebar, primitives, recherche, CSS et Geist ;
session, navigation Next et API de notifications simulées. Largeurs 320, 390, 768,
1024, 1280, 1440 et 1920 px : sidebar de 264 px même avec ancienne préférence
fermée, bouton desktop absent, menu mobile fonctionnel, cibles 40/44 px, header
56 px, fil d’Ariane court/long lisible et aucun débordement horizontal.

Ctrl/⌘ + K ouvre et ferme la palette ; Échap rend le focus au champ initial sans
modifier son texte. Répétition, composition, Alt/Shift et événement déjà traité
ignorés ; autre dialogue et volet mobile respectés. Navigation par Entrée,
infobulles et Échap, notifications avec compteur 99+, menu des ancêtres, focus
en couleurs forcées et indication Mac contrôlés. Aucun défaut JavaScript observé.
Un conflit avec le Ctrl + K natif de cmdk a été constaté, corrigé via
`vimBindings={false}` dans cette palette et revérifié.

Contrastes calculés sur le fond du header : texte courant 13,32:1, texte secondaire
7,71:1, couleur de focus 6,74:1. Captures desktop/mobile inspectées, puis banc et
captures supprimés. Ces mesures ne constituent pas un audit d’accessibilité complet.
Documentation Context7 : composition Radix `asChild` et retour du focus, puis
gestion des raccourcis cmdk ; API comparées aux paquets installés. Les données
réelles, un lecteur d’écran, Safari/iOS et le zoom natif ne sont pas validés par ce banc.

## Historique utile

Le 26 septembre 2026, avant cette grille : le rail avait été contrôlé avec
76 tests, puis resserré à 240/48 px avec 68 tests. Cette présentation est remplacée ;
ces anciennes mesures ne constituent pas la validation de la grille actuelle.

Le header a été corrigé le même jour : à 320 px, « Utilisateurs » disposait de
0 px et disparaissait. Le menu compact des ancêtres conserve désormais le nom.
Contrôles à 320, 390, 768, 1024, 1280, 1440 et 1920 px, chemins courts/longs/vides,
accueil unique, menu au clavier, redimensionnement, recherche et notifications
simulées : réussis. 62 tests ciblés, TypeScript et lint réussis lors de cette passe.
Ces interactions du header n’ont pas été rejouées pour le déplacement de la grille.

## Limites et réexamen

- Le banc ne valide ni session/API réelle, ni préchargement Next, ni parcours
  complet d’un formulaire non enregistré ; les protections existantes sont conservées.
- Lecteur d’écran, Safari/iOS, appareils physiques et zoom natif non vérifiés ;
  aucune déclaration de conformité complète.
- À l’ouverture de nouveaux pôles, vérifier leurs vrais libellés, icônes, tons,
  droits et parcours. Les huit entrées fictives valident la disposition.
- Au-delà de huit rubriques ou sur une hauteur très réduite, vérifier la zone
  défilante du sélecteur et l’accès aux pages. Ne pas réintroduire une pagination
  ou un rail latéral par défaut, sans revoir le besoin.
- Les libellés longs et nouveaux groupes restent à vérifier dans la largeur
  disponible ; ne pas élargir implicitement la sidebar.
- Toute capacité conserve ses contrôles serveur ; masquer une entrée ne donne
  ni ne retire une permission.
