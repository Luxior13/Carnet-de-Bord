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
  Infobulles de recherche, notifications et menu après 300 ms. Recherche ouverte
  depuis son bouton, sans raccourci global ni indication de raccourci dans la barre.
  Échap ferme la recherche et rend le focus au bouton.
- Recherche rapide : fenêtre centrale de 672 px maximum, plein écran sous 640 px,
  fond bleu ardoise, rayons de 8 px desktop, sans ombre ni animation. Focus intérieur,
  noms pouvant revenir à la ligne, contexte textuel « Page actuelle » ou « Section
  actuelle ». Effacement et fermeture de 44 px, action de pied de 40/44 px.
- Catalogue commun aux deux recherches : titre, description propre et rubrique,
  sans résumé générique de rubrique. Saisie bornée à 160 caractères ; huit suggestions
  et dix résultats rapides. Pied explicite selon saisie et résultats ; aucun groupe
  vide. Fermeture sur changement de chemin, infobulle masquée pendant l’ouverture.
  Les boutons n’activent pas le résultat sélectionné par propagation d’Entrée.
- Notifications : panneau de 400 px maximum sur fond ardoise, rayon de 8 px,
  sans ombre ni animation d’ouverture. Liste compacte, focus intérieur de 3 px,
  fermeture 40/44 px. Point non lu aligné ; gravité indiquée par icône et texte
  colorés sans badge de fond. Temps relatif récent et date/heure complètes accessibles.
- Compteur partagé avec la boîte personnelle, isolé par compte et révision
  d’autorisation. Rafraîchissement toutes les 30 secondes quand l’onglet est
  visible et connecté, sans chevauchement périodique ; aucun transport temps réel.
  Échec de lecture signalé par un toast avec reprise. La lecture n’est confirmée
  qu’après succès serveur ; pas de toast de succès à chaque ouverture.

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

Les contrôles ci-dessous précèdent le retrait du raccourci demandé ensuite.

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

## Retrait du raccourci — 27 septembre 2026

Décision finale de l’utilisateur : aucun raccourci dans la barre de recherche.
Écouteur global Ctrl/⌘ + K, indication, annonce ARIA et gestion du focus propre
au raccourci supprimés. Ouverture par le bouton et retour du focus natif conservés.
Cette décision remplace les passages précédents concernant le raccourci.

Niveau léger. À examiner : Q01–Q04, Q16, Q27, Q30. Hors impact : Q05–Q15, Q17,
Q19, Q20, Q22, Q24, Q25, Q28, Q29 : mêmes recherche, accès, données, architecture
et exploitation. Non applicable : Q18, Q21, Q23, Q26, aucun cache, import/export,
automatisme ou finance. Contrat existant actualisé ; 21 tests ciblés de recherche,
header et shell réussis, TypeScript et lint réussis. Le banc visuel précédent
n’a pas été rejoué pour ce retrait.

## Analyse du panneau de notifications — 27 septembre 2026

Demande : examiner le popover et proposer les améliorations adaptées à un aperçu
rapide. **État initial avant les corrections autorisées et décrites ci-dessous.**
Sources : [NotificationCenter](../../../apps/web/src/components/layout/NotificationCenter.tsx),
[popover partagé](../../../apps/web/src/components/ui/popover.tsx),
[lecture API](../../../apps/web/src/app/api/notifications/route.ts) et
[action individuelle](../../../apps/web/src/app/api/notifications/[id]/route.ts).

Sélection fonctionnelle :

- À examiner : Q01–Q09, Q14, Q17, Q22, Q27, Q30 : aperçu, présentation,
  clavier, collection, lecture, échecs, notifications, visibilité, requêtes,
  fraîcheur, dates et trace de revue.
- Hors impact : Q10–Q13, Q15, Q16, Q19, Q20, Q24, Q25, Q28, Q29 : aucune
  modification des données, règles de sécurité, schéma, architecture ou exploitation.
  Ce classement ne constitue pas un audit de confidentialité ou de sécurité.
- Non applicable : Q18, Q21, Q23, Q26 : aucun cache supplémentaire, transfert
  de masse, canal externe ou engagement financier dans cette revue du popover.

**À conserver.** Ancrage à droite, fond uni bleu ardoise `#202c3e`, titres de
14 px et métadonnées de 12 px, compteur plafonné à `99+`, aperçu borné aux dix
dernières notifications, accès à la boîte complète. Chargement, vide confirmé,
erreur initiale avec nouvelle tentative et erreur d’actualisation conservant les
dernières données sont distincts. La seule ouverture ne marque pas tout comme lu.
Le lien futur « Tout gérer » est actuellement filtré par les routes disponibles ;
ne pas le décrire comme une action visible aujourd’hui.

| Constat | Amélioration proposée / point ouvert |
| --- | --- |
| Panneau de 352 px ; lignes d’environ 106 px avec les exemples courants, zone de liste de 320 px : environ trois éléments visibles | Essayer une largeur desktop de 380–400 px et alléger les espacements ; conserver les titres utiles et une hauteur naturelle pour les textes longs |
| Rayon extérieur de 16 px, lignes de 12 px, ombre et animation d’entrée héritées du popover | Pour ce panneau, rapprocher les rayons du header et atténuer les effets selon la préférence exprimée ; ne pas changer toutes les fenêtres implicitement |
| État non lu porté par un petit point après le titre et une différence de graisse | Garder ces deux signes, réserver une place stable au point ; aucune grande pastille de fond coloré nécessaire |
| Toutes les données API utilisent la même cloche neutre ; `severity` et `type` ne sont pas exploités | Donner un repère discret aux alertes importantes, avec une icône ou un libellé en plus de la couleur ; ne pas confondre gravité et non-lecture |
| Date numérique sans heure : deux arrivées du même jour sont indifférenciées | Temps relatif pour le récent, date et heure complètes accessibles ; date explicite pour l’ancien |
| Focus des liens en bleu à 50 %, fermeture de 36 px desktop / 40 px mobile | Harmoniser le focus avec les commandes du header et prévoir une cible mobile de 44 px ; ce sont des écarts de cohérence, pas une déclaration de non-conformité complète |
| L’échec de la commande « lu » est absorbé sans retour ; confirmé avec une panne simulée | Prévoir un retour compréhensible et une reprise sans empêcher l’ouverture de la destination |
| Actualisation à l’ouverture, au retour sur l’onglet et aux événements locaux ; aucune réception continue | Définir la fraîcheur attendue avant de choisir une actualisation périodique ou un mécanisme serveur ; aucune promesse de notification instantanée actuellement |
| Sur arrivée directe dans `/mes-notifications`, la lecture du header est différée et le compteur reste absent avant ouverture | Partager ou synchroniser le compteur avec la boîte sans réintroduire une lecture de collection inutile |

**Contrôles exécutés.** Banc Chromium temporaire avec le vrai NotificationCenter,
ses primitives, son chargeur et le CSS du projet ; cadre de header simplifié,
session, autorisations, navigation et API simulées, sans écriture réelle.
Rendu inspecté à 1440 × 900, 390 × 844 et 320 × 320. Dans ces cas, panneau contenu
dans le viewport, liste défilante, titre et pied accessibles. À 320 × 320, la
zone de liste tombe à environ 119 px et ne montre plus une notification longue
entière : point de confort à améliorer, pas un débordement hors écran.
Tabulation, focus puis Échap et retour à la cloche vérifiés. Cas liste, vide,
chargement, erreurs initiale/d’actualisation, échec de lecture, arrivée directe
dans la boîte et `99+` contrôlés ; aucune erreur JavaScript observée.

Contrastes calculés sur les couleurs du panneau au repos : titre 11,97:1,
texte secondaire 6,93:1. Ces mesures ne valident pas tous les états ni un lecteur
d’écran. Les garde-fous API de session, permission et destinataire ont été lus,
pas testés sur une base réelle. Révocation d’accès, parcours de formulaire non
enregistré, arrivée depuis un autre utilisateur, Safari, appareil physique,
zoom et lecteur d’écran restent non vérifiés. Aucun benchmark réseau/SQL.
Captures et banc temporaires supprimés après inspection.

## Corrections du panneau de notifications — 27 septembre 2026

Les propositions précédentes ont été autorisées. Mise en œuvre : panneau de
400 px maximum, coins de 8 px, sans ombre ni animation. `animate-none!` neutralise
les animations héritées uniquement ici, sans modifier la primitive partagée.
Lignes de hauteur naturelle, texte descriptif plus compact, liste de 384 px
maximum qui se réduit avec le viewport ; titre et pied restent accessibles.
Repères de gravité distincts de la non-lecture. Dates relatives jusqu’à sept
jours, puis date explicite, date/heure complètes dans le nom accessible et le
titre du `<time>`. Source en dehors de la valeur temporelle.

La boîte et la cloche utilisent un compteur commun en mémoire via
`useSyncExternalStore` : état serveur initial neutre, abonnements nettoyés,
isolation compte/révision d’autorisation, rejet des publications plus anciennes,
libération après le dernier abonné. Aucun localStorage ni cache serveur ajouté.
La boîte publie son résultat initial ; son action d’ouverture confirme maintenant
la lecture après la réponse serveur et propose aussi une reprise en cas d’échec.
Le popover se réinitialise lors d’un changement de compte ou d’autorisation.

Rafraîchissement périodique après 30 secondes, lorsque l’onglet est visible et
connecté ; minuteur relancé après la requête et protégé contre le chevauchement.
Retour visible et retour en ligne réactivent la lecture. Les événements locaux
restent regroupés sur 200 ms. Sur la boîte non activée, seule une lecture bornée
à un élément renouvelle le compteur ; l’ouverture charge les dix éléments.
Les réponses anciennes ne remplacent pas un compteur confirmé plus récemment.
Les erreurs de rafraîchissement conservent les données disponibles ; une erreur
du compteur seul sur la boîte laisse à celle-ci ses messages de chargement.
Un échec de marquage lu produit un toast de dix secondes, identifié par notification,
avec « Réessayer » ; aucune confirmation de lecture optimiste. Une reprise liée
à un ancien compte sans abonné actif ne lance pas de commande.

Sélection mise à jour : à examiner Q01–Q11, Q14, Q16–Q19, Q22, Q27, Q28, Q30.
Compteurs partagés, échec de mutation, fraîcheur, isolation et coûts de lecture
s’ajoutent au visuel. Q16 concerne uniquement le retrait du lien futur « Tout gérer »,
déjà masqué. Hors impact Q12, Q13, Q15, Q20, Q24, Q25, Q29 : schéma, audit,
fichiers, gouvernance, métier esport et sauvegardes inchangés. Non applicable
Q21, Q23, Q26 : pas d’import/export, canal externe, tâche durable ou finance.

**Validations.** 31 tests ciblés réussis : compteur, dates, contrats header/boîte
et route de boîte avec dépendances simulées. TypeScript et lint ciblé réussis.
Banc Chromium avec NotificationCenter, NotificationInboxPage, hooks, primitives,
CSS et Geist réels ; cadre de header simplifié, session, navigation et API simulées.
Le compteur initial de la boîte apparaît dans la cloche sans GET supplémentaire.
Horloge contrôlée : renouvellement à 30 secondes, pause masquée, reprise visible,
lecture bornée sur la boîte et arrêt après retrait simulé de permission vérifiés.
Lecture échouée sans baisse du compteur, toast puis reprise réussie ; navigation
annulée sans mutation ; vide, erreur initiale et erreur après succès contrôlés.
Survol, Tab, focus et Échap avec retour à la cloche vérifiés ; aucune erreur JS.
Documentation Context7 consultée pour le store React, le popover Radix et la
priorité des utilitaires Tailwind v4 ; comportement comparé aux versions installées.

Rendu inspecté à 1440 × 900, 390 × 844 et 320 × 320 : panneau contenu, largeur
400 px desktop, lignes courantes d’environ 94 px, environ quatre éléments visibles
sur l’exemple desktop, focus calculé plein à 3 px, animation calculée `none`.
À faible hauteur, le défilement reste nécessaire ; les textes longs ne sont pas
forcés dans une hauteur fixe. Captures et banc supprimés après vérification.

Le contrôle global d’architecture échoue sur un dépassement **préexistant** :
`components/ui/sidebar.tsx`, 925 lignes pour un plafond de 900, identique dans HEAD
et hors de cette modification. Aucun seuil relevé pour masquer ce résultat.
Pas de test de base réelle, de charge, de session réelle, de lecteur d’écran ni
de Safari/appareil physique. La stratégie de 30 secondes devra être reconsidérée
si le nombre de sessions actives, le coût des compteurs ou le besoin de réception
instantanée le justifie. Aucune conformité ni performance globale revendiquée.

## Analyse de la recherche rapide — 27 septembre 2026

Demande : analyser le panneau ouvert depuis le header. **État initial avant les
corrections autorisées et décrites ci-dessous.** Il s’agit d’une fenêtre modale
centrale sur ordinateur, plein écran sur mobile, qui recherche des pages autorisées,
pas des personnes ou des dossiers métier. Conserver cette portée explicite.
Sources : [QuickNavigation](../../../apps/web/src/components/layout/GlobalSearch.tsx),
[classement](../../../apps/web/src/components/layout/global-search.utils.ts),
[catalogue](../../../apps/web/src/features/search/search-catalog.ts) et
[recherche complète](../../../apps/web/src/features/search/SearchPage.tsx).

Sélection fonctionnelle : à examiner Q01–Q07, Q09, Q17, Q19, Q27, Q30 : besoin,
contenu, présentation, clavier, collection, saisie, absence de résultat, accès,
volume et composants partagés. Hors impact Q08, Q10–Q16, Q20, Q22, Q24, Q25,
Q28, Q29 : aucune modification des notifications, règles de sécurité, données,
API, cycle de vie ou exploitation. Non applicable Q18, Q21, Q23, Q26 : aucun
cache supplémentaire, import/export, automatisme ou engagement financier requis.

**À conserver.** Fenêtre centrale de 672 px maximum, fond bleu ardoise, titre de
page dominant et contexte secondaire, sélection bleue perceptible, effacement et
fermeture de 44 px. Recherche locale sans appel serveur par frappe ; suggestions
de la rubrique active, huit suggestions et dix résultats maximum. Le classement
privilégie le titre ; accents et casse sont normalisés. Aucun raccourci global à
réintroduire. Les indications flèches/Entrée/Échap expliquent le parcours dans la
fenêtre et ne constituent pas un raccourci global d’ouverture.

| Priorité | Constat initial | Proposition à l’issue de l’analyse |
| --- | --- | --- |
| Haute | « compte » place correctement Mon compte en premier, mais remonte aussi Journal d’activité, Paramètres système et Feuille de route : le résumé générique de Système contient « comptes » | Réduire le bruit lié au résumé de rubrique ; conserver les correspondances pertinentes dans le nom, la description propre et le nom de rubrique |
| Haute | Bas de fenêtre « Besoin de plus de filtres ? » / « Rechercher une page » ambigu ; action de 22 px de haut, y compris sur mobile | Nommer la destination : « Voir tous les résultats » après saisie, « Ouvrir la recherche » à vide ; agrandir la cible tactile |
| Haute | Sans résultat, un en-tête « Résultats » vide demeure sous le message ; le texte sur les filtres n’aide pas à comprendre cette absence | Masquer le groupe vide et proposer une nouvelle formulation de recherche ; ne pas suggérer que des filtres créeront des résultats |
| Moyenne | Rayons extérieurs de 16 px, lignes de 12 px, ombre et animation d’entrée héritées, contrairement au panneau de notifications | Harmoniser localement vers des rayons sobres d’environ 8 px et retirer les effets décoratifs ; préserver la sélection visible |
| Moyenne | La pastille « Actuelle » désigne aussi la liste Utilisateurs depuis une fiche utilisateur | Distinguer page exacte et section parente avec un libellé juste et discret, sans fond de badge dominant |
| Moyenne | Le champ focalisé ne dispose ni d’un contour visible ni d’une ombre de focus ; le curseur reste présent | Ajouter un repère local de focus cohérent avec le header ; ce constat seul ne constitue pas un audit de conformité |
| Moyenne | Un changement de chemin extérieur à la palette la laisse ouverte | Fermer la fenêtre lors d’une navigation effective, en respectant les navigations annulées |
| Basse | Pas de limite de saisie rapide ; la page complète tronque à 160 caractères | Aligner les limites pour ne pas modifier silencieusement la requête lors du passage à la recherche complète |
| À réexaminer | Noms sur une seule ligne tronquée ; descriptions masquées sur mobile ; certains textes décrivent la technique plutôt que l’usage | Vérifier les vrais futurs noms longs et autoriser deux lignes si nécessaire ; reformuler les descriptions sans promettre de fonctionnalités absentes |

**Vérifié dans Chromium.** Banc isolé avec vrais QuickNavigation, catalogue,
classement, composants UI, CSS et Geist ; session, disponibilité et navigation
simulées. Formats 1440 × 900, 768 × 700, 390 × 844 et 320 × 320 : panneau contenu,
liste défilante sur faible hauteur, boutons de fermeture accessibles. Bureau :
lignes de 64 px, hauteur initiale de 517 px ; état vide de 253 px, champ conservant
sa position. Captures des suggestions, résultats et état vide inspectées.

Focus initial, effacement sans perte de focus, flèches et Entrée, Échap avec retour
au déclencheur, absence d’ouverture par Ctrl + K contrôlés. « SYSTÈME » retrouve
les pages attendues ; « compte » sélectionne bien Mon compte, sans sélection
résiduelle erronée. Requête transmise à la page complète avec encodage, annulation
simulée de navigation respectée. Profil USER simulé : destinations administratives
non autorisées retirées. Changement de chemin simulé : fenêtre demeurant ouverte,
défaut reproduit. Aucune erreur JavaScript constatée.

**Limites.** Pas de modification produit, de nouveau test permanent ni de nouvelle
exécution des suites unitaires pour cette analyse. Pas de session réelle, de test
des autorisations serveur, de benchmark, de lecteur d’écran ni d’appareil physique.
Le clavier virtuel mobile, l’historique natif du navigateur, les noms artificiellement
longs et Bitwarden ne sont pas validés par ce banc. `autoComplete="off"` existe,
mais cela ne prouve pas le comportement des extensions. Les fautes de frappe ne
sont pas corrigées ; des alias utiles pourront être envisagés selon les usages,
sans imposer une recherche approximative. Banc et captures temporaires supprimés
après inspection. Cette analyse ne vaut pas validation des corrections proposées.

## Corrections de la recherche rapide — 27 septembre 2026

Les décisions courantes ci-dessus sont implémentées dans QuickNavigation. Le
résumé commun de rubrique n’alimente plus les correspondances : « compte » rend
Mon compte puis Utilisateurs, et « SYSTÈME » conserve les quatre pages de cette
rubrique. Cette correction bénéficie aussi à la recherche complète via le même
catalogue ; sa disposition est conservée. Les deux saisies partagent la limite
de 160 caractères. Aucune nouvelle dépendance, permission, API ni donnée stockée.

Le pied distingue accès à la recherche, tous les résultats et parcours des pages
en cas d’absence de résultat. Titres longs lisibles par retour à la ligne, repère
de page/section courante sans fond de badge. La recherche se ferme au changement
de chemin. Les styles sans effet et le voile sans animation sont locaux : une
fenêtre témoin conserve ses styles par défaut. Les attributs d’exclusion des
gestionnaires de mots de passe complètent `autoComplete="off"`, sans garantie
sur toutes les extensions.

La vérification a révélé puis corrigé trois interactions supplémentaires : Entrée
sur un bouton déclenchait également le résultat sélectionné ; une taille héritée
réduisait fermeture/effacement sur ordinateur ; l’infobulle du déclencheur pouvait
recouvrir le panneau. En couleurs forcées, seul le résultat sélectionné reçoit
désormais un contour de sélection distinct. L’effacement conserve le focus au
clic et le restitue explicitement au clavier. Aucun toast ajouté.

Sélection Q inchangée par rapport à l’analyse : niveau fonctionnel, Q19/Q30 incluent
le point de personnalisation optionnel du voile, Q06/Q07 la saisie bornée et le
retour local, Q09 le catalogue filtré existant. Q17 vérifie le nombre de résultats
et l’absence de nouvelle requête par frappe, sans promesse de performance globale.

**Validations.** 61 tests réussis : recherche rapide, contrats de recherche complète,
design system et navigation protégée. Deux régressions de catalogue ajoutées
(pertinence et compte limité). TypeScript et lint ciblé réussis. Le scénario E2E
existant contient désormais les régressions Entrée sur Effacer, Fermer et Voir
tous les résultats ; la suite E2E avec base dédiée n’a pas été exécutée ici.

Banc Chromium avec composants, catalogue, CSS et Geist réels ; session, disponibilité
et navigation simulées. Contrôlés à 1440 × 900, 768 × 700, 390 × 844 et 320 × 320 :
dimensions, survol, focus, Tab, flèches, Entrée, Échap, effacement souris/clavier,
fermeture clavier sans navigation, action de pied avec requête encodée, état vide,
limite de saisie, absence de Ctrl + K, compte limité et annulation simulée de
navigation. Changement de chemin extérieur fermant le panneau vérifié. Quatorze
noms longs fictifs : huit suggestions, dix résultats, retour à la ligne et accès
au dernier résultat au clavier. Couleurs forcées et mouvement réduit inspectés.

CSS calculé : rayon desktop de 8 px, aucune animation de contenu/voile, focus de
3 px intérieur ; fermeture/effacement de 44 px, pied de 40/44 px. Aucun débordement
horizontal ni erreur JavaScript observé. Captures inspectées, banc et captures
supprimés après contrôle. Documentation Context7 Radix/cmdk consultée et comparée
aux versions installées. Le contrôle d’architecture global reste en échec sur
`components/ui/sidebar.tsx` (925 lignes / plafond 900), fichier inchangé de cette
passe, défaut préexistant déjà consigné.

**Limites et réexamen.** Ni session réelle, droits serveur, lecteur d’écran, clavier
virtuel physique, Safari/iOS ou Bitwarden vérifiés. Pas de benchmark ni audit
d’accessibilité complet. L’historique natif n’est pas couvert par le changement
de chemin simulé. Les descriptions communes restent celles du catalogue : revoir
leur vocabulaire lors du travail sur les pages propriétaires. Vérifier les vrais
futurs libellés/rubriques et n’ajouter des alias que si un usage les justifie.

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
