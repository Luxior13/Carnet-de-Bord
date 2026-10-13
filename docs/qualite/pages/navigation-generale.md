# Suivi — Navigation générale, sidebar et header

## État courant — clôture du socle du 13 octobre 2026

La [revue finale du socle](../../audits/AUDIT_CLOTURE_SOCLE_2026-10-12.md) est
terminée au périmètre livré, pour poursuivre le développement métier. Ses
preuves et limites ne constituent pas une qualification de déploiement.

Le menu Rubriques confirmé par l’utilisateur reste la règle courante. Le focus
du fil d’Ariane est conservé lorsqu’un changement de largeur remplace le lien
par son contrôle compact. Les preuves de navigation, garde de brouillon et
déconnexion sont réparties entre banc client et parcours réels ; la limite de
défilement natif Next déjà décrite reste valable.

Les décisions et preuves datées ci-dessous restent conservées. Une nouvelle
revue répond à un changement, un défaut constaté ou une règle nouvelle.

## État courant — revue du 12 octobre 2026

Le [rapport courant](../../audits/AUDIT_NAVIGATION_GENERALE_2026-10-12.md)
reprend les parcours du cadre partagé : destinations, droits, disponibilité,
recherche rapide, garde de brouillon, focus et déconnexion. NAV-02 à NAV-07
sont clos ou réconciliés dans la portée vérifiée ; les anciennes réussites
visuelles ne sont pas assimilées à cette nouvelle intégration.

L'utilisateur a confirmé le 12 octobre 2026 qu'il souhaite conserver le menu
déroulant « Rubriques » actuel. Il avait été maintenu par continuité pendant
la revue, puis ce choix est devenu explicite. L'ancienne grille décrite
ci-dessous est historique ; elle ne doit plus être lue comme le rendu courant.

- Sidebar fixe de 264 px sur ordinateur, seuil mobile de 1 024 px, volet de
  288 px limité au viewport. Aucun mode réduit réintroduit.
- Rubriques sous le logo dans un menu commun : libellés, icônes et sélection
  courante, seulement pour les destinations autorisées et disponibles. Les
  pages de la rubrique restent en dessous sur toute la largeur.
- Changer de rubrique doit permettre de choisir ensuite une page dans le
  volet mobile ; fermer un menu ne doit pas perdre le focus d'une confirmation
  de départ refusée. Cette interaction est vérifiée dans NAV-05.
- Header de 56 px ; recherche à 40 px sur ordinateur et 44 px sur mobile.
  NAV-03 corrige l'ancien rendu de 36 px et vérifie la mesure finale.
- Navigation rapide locale, borne de 160 caractères, huit suggestions et dix
  résultats, sans raccourci global ni page de recherche complète. Ancêtres du
  fil d'Ariane disponibles dans le menu compact.
- Les descriptions de Mon compte présentent le profil, la sécurité et ses
  sessions de connexion ; elles n'annoncent plus d'activité personnelle absente.
- Les barres de sections partagent `PageSectionNavigation`. Leur style récent
  reste conservé ; un effet réel de navigation doit justifier toute retouche.
- Déconnexion : identité masquée dès demande, attente bornée à quinze secondes,
  résultat non confirmé visible et nouvelle tentative explicite. Aucun faux
  succès après refus HTTP, aucune restauration silencieuse du compte pendant
  cette intention. Une nouvelle connexion explicite peut la remplacer.

Les 17 parcours du banc client passent : six largeurs de 320 à 1 920 px,
menus et palettes conservés après « Rester », focus lors des changements de
présentation, clavier et états de déconnexion sans identité. Ce banc emploie
les composants réels avec contexte et navigation simulés ; il ne prouve pas
la révocation serveur. Les 37 tests ciblés du contexte et de la déconnexion
passent aussi. Dix parcours Next/PostgreSQL avec connexion MFA réelle et trois
parcours de déconnexion réussissent : destinations, garde de brouillon,
historique, compte limité, refus CSRF, 500 injecté et réponse perdue après commit.
Le compte ne réapparaît pas silencieusement pendant l'intention de sortie ;
ce verrou reste local au contexte monté, sans promesse après rechargement.
Un prénom sans nom était déjà correctement affiché.

La passe de navigation générale ci-dessus n'avait pas rejoué le changement de
section après long défilement. La clôture des parcours privés NAV-02 ne vaut
pas validation de cette piste, reprise séparément dans la section suivante.

La suite générale compte 1 248 tests réussis et 163 ignorés ; build, types,
lint et budgets d'architecture/performance passent. Les plafonds existants
restent inchangés : le focus responsive est extrait dans
[sidebar-focus.ts](../../../apps/web/src/components/ui/sidebar-focus.ts).
Les limites de profils, propagation des droits après navigation complète,
lecteurs d'écran et navigateurs non exercés sont précisées dans le rapport.

## Changement de section après long défilement — revue ciblée du 12 octobre 2026

Reprise de la piste laissée ouverte après la finition collante du 11 octobre,
depuis le HEAD `34fccaa`. Périmètre : fiche du Répertoire via
`EntityDetailLayout`, fiche Utilisateur et Mon compte. Cette passe ne reprend
ni les mutations métier ni tout l'audit de ces pages. Rubriques et le menu du
compte sont hors impact.

Sélection proportionnée : Q01–Q04, Q06, Q19, Q27 et Q30 pour le parcours, la
composition partagée, le focus, le brouillon et la preuve. Le coût du
repositionnement relève de Q17 si le correctif en ajoute un. Les autres sujets
sont hors impact ou non applicables : aucune donnée persistante, permission,
mutation, notification, migration, intégration ou dépendance nouvelle prévue.

Les références actuelles décrivent des liens de section avec leur URL, pas
des onglets ARIA de panneaux locaux. La lecture du code confirme que les trois
consommateurs remplacent l'entrée courante : `replace` de Link pour la fiche
Personne, `history.replaceState` pour les deux autres. La correction du
défilement ne demande pas d'ajouter un historique de section.

Attendu à éprouver : après un changement accepté vers une section différente,
son début doit être visible sous la barre et le focus rester sur le lien
activé. « Rester » conserve URL, brouillon et position. Un clic modifié, le
focus horizontal, le redimensionnement ou une simple actualisation ne doivent
pas devenir une commande de remise à zéro verticale. Le clamp naturel d'un
contenu court est distingué d'un retour volontaire au haut du bandeau.
Liens directs, rechargement et Back/Forward gardent leurs contrats propres.

Les [trois observations initiales du banc client](../../audits/navigation-sections-2026-10-12/banc-client/preuves/avant-3.json)
reproduisent un titre de nouvelle section à −616 px dans
le viewport après un défilement interne de 900 px, alors que la barre reste
visible entre 56 et 105 px. Il reproduit aussi une entrée d'historique
supplémentaire après confirmation de départ (longueur 2 → 3 au lieu de 2 → 2).
« Rester » conserve déjà le brouillon et le défilement : c'est une
non-régression à préserver. Ces constats sont simulés : Link et navigation
sont remplacés dans le montage, donc ils ne prouvent pas le scroll de Next.
Le focus mesuré immédiatement après confirmation dans cette baseline précède
la fermeture complète du dialogue ; aucun défaut de focus n'en est déduit.
Les [neuf observations Next initiales](../../audits/navigation-sections-2026-10-12/banc-integration/preuves/baseline-resultats.json)
précisent l'effet sur les vrais consommateurs. À 390 × 600 px, Mon compte passe
du bas de Profil à Sécurité déjà visitée en conservant un scroll de 478 px :
le titre Sécurité se situe entre 37,58 et 61,58 px, derrière le header et la
barre de 56 à 105 px. D'autres transitions de Mon compte et Utilisateur
laissent le focus sur `body`. Sur la fiche Personne, le titre est déjà visible,
mais le scroll revient à zéro et réaffiche le bandeau : c'est une amélioration
de position, pas une preuve de contenu masqué.

Les trois confirmations de départ ajoutent une entrée d'historique ; les
trois annulations conservent exactement le scroll, l'URL et la saisie. Les
mesures HTTP initiales ambiguës sont gardées séparément : la visibilité du
contenu et le maintien de la barre collée sont désormais deux observations,
sans qualifier de masqué un titre réellement visible.

Correctif retenu : le composant consulte la garde une seule fois et conserve
une action différée avec son mode de navigation. Les liens concernés déclarent
qu'ils prennent en charge cette garde ; l'interception générique ne les
transforme plus en `router.push`. Les callbacks de Mon compte et Utilisateur
effectuent directement leur `replaceState` après accord. Le repositionnement
et le focus communs sont isolés dans
[useSectionNavigation](../../../apps/web/src/components/layout/useSectionNavigation.ts),
sans changement de géométrie.

Les [huit parcours client finaux](../../audits/navigation-sections-2026-10-12/banc-client/README.md)
passent. À 390 px, le titre arrive à 120,78 px sous la barre finissant à 105 px ;
à 1 440 px, à 121,39 px sous une barre finissant à 105,39 px. La géométrie au
repos est strictement identique : barre de 49 px, écart de 16 px avec le contenu
et même hauteur défilante dans la fixture. La confirmation conserve désormais
deux entrées d'historique au lieu d'en ajouter une. Clic actif avec brouillon et
URL non canonique, Ctrl-clic, contenu court, montage StrictMode, historique et
deux activations rapides sont contrôlés. Le resize ne commande aucun scroll
vertical ; l'ancrage natif peut cependant adapter la position quand le texte
change de hauteur. Un oracle intermédiaire trop strict sur ce point a été
corrigé, sans en faire un défaut produit.

Les [neuf parcours Next finaux](../../audits/navigation-sections-2026-10-12/banc-integration/preuves/final-resultats.json)
passent sur les trois consommateurs, avec session réelle et base PostgreSQL
isolée. Dans Mon compte à 390 × 600 px, le scroll passe de 478 à 395 px et le
titre Sécurité arrive à 120,58 px, sous la barre finissant à 105 px. Tous les
changements contrôlés rendent le focus au lien activé. Les trois confirmations
gardent la longueur d'historique ; les trois « Rester » gardent URL, brouillon
et scroll exacts. Les captures mobile de Mon compte et Utilisateur ont été
inspectées.

La fiche Personne revient encore à un scroll de zéro pendant certaines
transitions Next : le contenu est visible et le focus conservé, donc aucune
correction de contenu masqué n'est revendiquée pour ce cas déjà visible. La
passe ne garantit pas que toutes les fiches restent collées après chaque
transition native ; elle corrige le début masqué, le focus et le remplacement
de l'historique sans imposer de retour systématique au bandeau.

Les 56 tests ciblés et la suite générale depuis `apps/web` (`bun run test` :
1 248 réussis, 163 ignorés, 102 fichiers réussis et neuf ignorés) passent,
ainsi que build Next 15.5.23, lint, types et budgets d'architecture/performance,
sans augmentation des plafonds. NAV-08 et NAV-09 sont clos dans ces parcours.
Back/Forward, StrictMode, clic modifié et activations rapides sont exercés dans
le banc client simulé ; ils ne sont pas présentés comme une nouvelle campagne
HTTP. Lecteur d'écran, Firefox, Safari/iOS et appareils physiques restent non
vérifiés. Les quatre temporaires client sont supprimés. Le
[protocole d'intégration](../../audits/navigation-sections-2026-10-12/banc-integration/README.md)
confirme l'arrêt de Next 3128 et PostgreSQL 54650, les ports libres et la
suppression du dossier temporaire avec configuration privée, secrets TOTP et
marker. Le scan des sept fichiers texte du banc ne retrouve aucune valeur
privée. Aucun accès à la base habituelle ni modification de son `.env`.

## Actions et navigation pendant une requête — 11 octobre 2026

La garde de brouillon ignore les liens portant `aria-disabled="true"` : leur
composant propriétaire bloque déjà l'activation. Annuler une création pendant
sa requête n'ouvre donc pas une confirmation de navigation parasite. Après
disparition d'une barre d'édition, le consommateur rend le focus à sa section.
Le contrat de `PageSectionNavigation` reste la référence des sections de page ;
les actions d'enregistrement relèvent de `SectionActionBar`.

[Catalogue](../../references/COMPOSANTS.md) et
[audit transverse](../../audits/AUDIT_COMPOSANTS_2026-10-11.md).

## Menus partagés — 10 octobre 2026

[Audit transverse des menus](../../audits/AUDIT_MENUS_2026-10-10.md) : menus
compte, Rubriques et ancêtres du fil d'Ariane exécutés dans les composants réels,
avec compte/navigation simulés. Panneaux et options reprennent les rayons communs
de 7 et 4 px ; les boutons conservent le focus adapté à la navigation. Ouverture
au clic/clavier, Échap et retour du focus vérifiés à 320, 390, 768 et 1 440 px,
y compris dans le volet mobile. Ce contrôle ne valide pas les destinations,
la déconnexion ou les droits serveur ; la composition des rubriques n'est pas
modifiée par cette passe.

## Historique — synthèse de la grille conservée du 10 octobre 2026

La composition de grille de cette synthèse diverge du menu actuellement livré.
La section courante du 12 octobre ci-dessus précise le choix confirmé du menu ;
les dimensions et preuves historiques ci-dessous ne sont pas réattribuées au menu.

Synthèse actualisée le 10 octobre 2026 ; les vérifications de septembre restent
datées dans l’historique ci-dessous. Composants partagés par les pages privées. Besoin :
changer souvent de rubrique, prévoir huit rubriques et conserver des pages lisibles.
Le rail latéral a été abandonné à la demande de l’utilisateur au profit d’une
**grille en haut de la sidebar**. Les décisions ci-dessous remplacent ce rail.

Sources : [Sidebar](../../../apps/web/src/components/Sidebar.tsx),
[PoleNavigation](../../../apps/web/src/components/layout/PoleNavigation.tsx),
[primitives](../../../apps/web/src/components/ui/sidebar.tsx),
[Header](../../../apps/web/src/components/layout/Header.tsx),
[fil d’Ariane](../../../apps/web/src/components/ui/breadcrumb.tsx),
[navigation canonique](../../references/NAVIGATION.md).

- Sidebar ancrée à gauche, toujours ouverte à 264 px sur ordinateur.
  Réduction et bouton desktop retirés à la demande de l’utilisateur le 27 septembre.
  Fond bleu conservé, sans nouvelle texture ni dégradé.
- Identité Noctambule : zone fixe de 56 px, séparateur aligné sur le header,
  logo de 36 px centré dans son emplacement fixe de 28 px, nom de 15 px semi-gras et
  espacement de 12 px après cet emplacement. Lien vers l’accueil de 44 px de haut, survol sémantique
  et focus intérieur ; nom accessible « Noctambule — Accueil ».
  Fermeture mobile contenue dans la hauteur de l’identité.
- Rubriques sous le logo : quatre icônes par ligne, une ligne avec les trois
  rubriques actives, deux lignes avec huit. Aucun bouton de pagination. Catalogue
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
- Avatar du profil : fond selon le niveau d'accès via `UserAvatar` partagé,
  dessin conservé ; [décision et contrôle du 10 octobre](systeme-utilisateurs.md#fond-des-avatars-par-accès--10-octobre-2026).
- Header de 56 px sur fond `surface-panel` : contexte à gauche, navigation rapide à droite.
  Zone centrale souple pour les chemins longs ; outils supplémentaires à justifier
  par un usage global et à regrouper sur petit écran si nécessaire.
- Contrôles principaux du header de 40 px de haut sur ordinateur et 44 px sous
  1024 px. Recherche de 224/256 px sur ordinateur, icône en dessous. Sous 640 px,
  menu « … » pour les ancêtres et page courante à côté. Fermeture du menu lors
  du changement de présentation. Page courante semi-grasse, focus intérieur.
- Menu de sidebar réservé au mobile ; séparateur visible de 640 à 1023 px.
  Infobulles de recherche et menu après 300 ms. Recherche ouverte
  depuis son bouton, sans raccourci global ni indication de raccourci dans la barre.
  Échap ferme la recherche et rend le focus au bouton.
- Recherche rapide : fenêtre centrale de 672 px maximum, plein écran sous 640 px,
  fond bleu ardoise, rayons de 8 px desktop, sans ombre ni animation. Focus intérieur,
  noms pouvant revenir à la ligne, contexte textuel « Page actuelle » ou « Section
  actuelle ». Effacement et fermeture de 44 px ; aucune page de recherche complète.
- Catalogue de navigation rapide : titre, description propre et rubrique,
  sans résumé générique de rubrique. Saisie bornée à 160 caractères ; huit suggestions
  et dix résultats rapides. Nombre de résultats annoncé et état vide explicite. Fermeture sur changement de chemin, infobulle masquée pendant l’ouverture.
  Les boutons n’activent pas le résultat sélectionné par propagation d’Entrée.
- Notifications et boîte personnelle retirées le 9 octobre 2026 ; aucune cloche
  ni aucun compteur de notifications dans le header. Reconstruction planifiée.

Le défilement des pages par rubrique reste mémorisé. Le shell contrôle la sidebar
ouverte ; l’ancienne préférence `team-control:sidebar:desktop-open` et la clé
`team-control:sidebar:poles-open:<compte>` sont ignorées. Aucun effacement de stockage nécessaire. Routes, permissions, API,
schéma et dépendances inchangés. Les couleurs de pôles des autres composants
restent celles du thème existant.

## Lecture de l’historique

Les sections de septembre ci-dessous décrivent les versions examinées alors. Les
notifications et la recherche complète qui y figurent ont été retirées le 9 octobre.
Leurs contrôles ne valident pas le périmètre actuel. La section « État courant —
revue du 12 octobre 2026 » ci-dessus et
[NAVIGATION](../../references/NAVIGATION.md) portent les règles courantes.

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
Sources : [notifications du Header](../../../apps/web/src/components/layout/Header.tsx),
[popover partagé](../../../apps/web/src/components/ui/popover.tsx),
lecture API (retirée — notifications replanifiées) et
action individuelle (retirée).

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
recherche complète (retirée).

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

## Suivi des points — actualisé le 12 octobre 2026

Le 10 octobre, pendant les corrections Utilisateurs, le contexte React et le
suivi de viewport sont extraits des primitives dans
[sidebar-context.ts](../../../apps/web/src/components/ui/sidebar-context.ts).
L'export public `useSidebar` et le seuil mobile de 1 024 px sont conservés.
Contrôle proportionné Q19/Q27/Q30 : budget d'architecture, tests sidebar, lint,
types et build réussis ; shell réel observé aux neuf largeurs du
[banc Utilisateurs](../../audits/AUDIT_UTILISATEURS_2026-10-10.md#validation-des-corrections).
Cette extraction ne revalidait pas les autres parcours de navigation. Le
[rapport du 12 octobre](../../audits/AUDIT_NAVIGATION_GENERALE_2026-10-12.md)
décrit leur reprise distincte et ses limites.

| ID | Constat / preuve | Suite et déclencheur | Responsable / état |
| --- | --- | --- | --- |
| NAV-01 | `components/ui/sidebar.tsx` dépassait son budget (925/900) ; contexte et suivi de viewport extraits, aucun plafond relevé | Budget, contrats sidebar et build réussis après correction | Clos le 10 octobre 2026 |
| NAV-02 | Parcours privés, brouillon et droits non rejoués pendant l'ancienne cartographie | Dix parcours Next avec vrais comptes isolés et départ accepté/refusé ; piste de long défilement des sections distincte | Clos le 12 octobre au périmètre exercé |
| NAV-03 | Déclencheur de recherche mesuré à 36 px sur ordinateur contre la règle de 40 px | Hauteur corrigée et mesurée à 40 px dans Chromium ; 44 px sur mobile | Clos le 12 octobre, sur les tailles contrôlées |
| NAV-04 | Référence décrivant encore la grille historique et un menu compte de 18rem | Menu Rubriques confirmé par l'utilisateur le 12 octobre ; largeur actuelle de 16rem consignée, ancienne grille conservée comme historique | Références réconciliées le 12 octobre |
| NAV-05 | Après « Rester », contexte de navigation fermé et focus perdu depuis Sidebar/recherche | Menus maintenus jusqu'au départ accepté, focus rétabli ; bancs client et Next réussis | Clos le 12 octobre au périmètre exercé |
| NAV-06 | Refus HTTP annoncé comme déconnexion réussie ; transport non borné | Identité masquée, résultat non confirmé, délai de 15 s et reprise explicite ; 37 tests ciblés et trois parcours HTTP réussis | Clos le 12 octobre au périmètre exercé |
| NAV-07 | Contrôle focalisé masqué lors d'un changement de présentation du volet ou des ancêtres | Focus rétabli dans les deux sens des seuils, sans déplacer le focus du contenu | Clos le 12 octobre, banc client vérifié |
| NAV-08 · P2 | Après long défilement, début de nouvelle section masqué dans Mon compte mobile et pertes de focus dans certains changements | Début visible et focus du lien vérifiés dans huit parcours client et neuf Next ; Rester inchangé. La remontée native de Personne avec contenu déjà visible n'est pas supprimée | Clos le 12 octobre au périmètre exercé |
| NAV-09 · P2 | Confirmer une garde de brouillon ajoute une entrée d'historique alors que les trois barres remplacent l'URL courante | Garde unique et action différée conservant replace ; longueur d'historique inchangée après les trois confirmations réelles | Clos le 12 octobre au périmètre exercé |

## Limites de la passe historique et réexamen

- Le banc historique ne valide ni session/API réelle, ni préchargement Next, ni parcours
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

## Modales — revue transverse du 11 octobre 2026

Recherche rapide vérifiée à quatre largeurs et volet mobile à 390 px :
ouverture, clavier, Échap et retour du focus. Les adaptations visuelles propres
à la recherche et à la sidebar restent conservées. Les confirmations sans
Trigger utilisent maintenant la restitution commune du focus ; les parcours
impliquant une seconde modale sont couverts par le banc isolé.

[Décisions et questions communes](modales.md) ·
[Preuves et limites de l’audit](../../audits/AUDIT_MODALES_2026-10-11.md).
Cette passe ne clôt pas les contrôles d’intégration encore ouverts de la page.

## Autocomplétion — correction du 11 octobre 2026

CommandInput applique directement la protection sans autocomplétion à toute recherche, indépendamment des props de son appelant. Les suggestions métier de navigation restent disponibles.

[Règle propriétaire](../../references/DESIGN_SYSTEM.md) ·
[Contrôles et limites des extensions](../../audits/AUDIT_AUTOCOMPLETION_2026-10-11.md).
La présence des attributs d’exclusion ne garantit pas le comportement d’une
extension installée chez l’utilisateur.

## Barres de sections — décision du 11 octobre 2026

### Avis sur l'état collant — 11 octobre 2026

Question utilisateur : qualité visuelle de la barre lorsqu'elle reste en haut
pendant le défilement. Lecture de `PageSectionNavigation` et du shell : fond
opaque `surface-canvas`, bordure inférieure, hauteur minimale de 48 px ; aucun
style distinct selon l'accrochage. Le header précède le conteneur défilant et
la barre utilise `top-0` à l'intérieur de celui-ci.

Avis initial fondé sur le code et les captures au repos : conserver la sélection
et la hauteur, avec une ombre inférieure discrète seulement en position accrochée.
L'utilisateur a approuvé cette finition le même jour.

Implémentation : `PageSectionNavigation` observe sa position dans le conteneur
défilant et applique `--shadow-navigation-stuck` uniquement lorsqu'elle est
collée. Un repère absolu n'ajoute ni hauteur ni espacement. La barre est aussi
observée pour gérer un saut direct depuis une position sous l'écran. Le fond
reste opaque, la hauteur stable et aucune bordure haute n'est ajoutée contre
le header. Mouvement réduit respecté ; observateur déconnecté au démontage.

Périmètre de revue : Q01–Q04, Q17, Q19, Q27, Q30 pour la présentation partagée,
le défilement, la géométrie, le coût et la documentation. Autres sujets hors
impact : aucune action, donnée, permission, requête ou règle métier modifiée.
Vérifications de cette finition : 10 scénarios Chromium réussis sur les trois
pages à 390 et 1 440 px, avec stress à 320 px, paysage à 900 × 480 px, saut
depuis le dessous de l'écran et apparition après une liste de sections vide.
Le Header réel est monté dans un cadre à défilement interne reproduisant le
shell ; comptes, API et navigation sont simulés. Barre mesurée à 49 px bordure
comprise, contrôles de 48 px, position collée exactement sous le Header de
56 px. Hauteur du contenu et position de référence stables, ombre retirée au
retour en haut ; captures relues.
[Banc, résultats et limites](../../audits/navigation-sections-2026-10-11/banc-collant/README.md).

82 tests ciblés réussis (navigation, design system et contrats des trois
consommateurs), TypeScript, lint du composant et budget d'architecture réussis.
Le shell authentifié complet, Safari/iOS et le lecteur d'écran ne sont pas
rejoués. Les anciens 20 scénarios ci-dessous conservent leur portée.

### Pistes formulées après la finition collante — 11 octobre 2026

Cette note décrit l'état du 11 octobre. Le changement de section après long
défilement est depuis traité dans la revue ciblée du 12 octobre ci-dessus.
La visibilité de tous les champs recevant le focus après erreur ou annulation
reste une piste distincte, non validée par ce seul correctif de navigation.

Question utilisateur du 11 octobre : autres améliorations utiles. Lecture du
code : Mon compte et Utilisateurs changent de section par `history.replaceState`
sans repositionnement vertical explicite ; la fiche Personne passe par le routeur.
Suggestion prioritaire : après un changement de section accepté, rendre visible
le début du nouveau contenu sous la barre, en conservant le focus sur le lien
activé. Ne pas remonter systématiquement au bandeau d'identité, ni déplacer la
page si une garde de brouillon annule la navigation. Le scénario après long
défilement reste à reproduire ; aucun défaut navigateur supplémentaire déclaré.

Autre point à contrôler : visibilité d'un champ recevant le focus après une erreur
ou une annulation lorsque la barre est collée. Les essais précédents vérifient
les liens de la barre ; ils ne prouvent pas tous les placements des champs.
Le fil d'Ariane conserve déjà le nom de la fiche : aucune identité dupliquée dans
la barre n'est proposée. À cette date, ces pistes n'étaient pas implémentées.

### Contrat courant

Améliorations approuvées par l'utilisateur puis appliquées à
`PageSectionNavigation`, consommé par Mon compte, la fiche Utilisateur et la
fiche du Répertoire (via `EntityDetailLayout`). Fond de sélection, icône
accentuée, soulignement et angles supérieurs de 6 px suivent le
[design system](../../references/DESIGN_SYSTEM.md#8-onglets-et-rails).
Les flèches n'apparaissent qu'en cas de débordement ; l'infobulle explique le
point de brouillon au survol et au clavier. Les destinations restent des liens
avec `aria-current="page"`, hauteur minimale de 48 px et barre collante.
`Tabs` reste une primitive distincte sans consommateur direct trouvé dans les pages.

Précision utilisateur du même jour : le composant commun s'applique à tout le
site lorsque le besoin correspond à cette navigation, y compris aux futures
pages. La règle est portée par le design system et la fiche Q03 de revue visuelle.
Inventaire du code revérifié : les trois barres existantes passent déjà par
`PageSectionNavigation` ; aucune autre barre équivalente à migrer trouvée.
Les phases de la Feuille de route filtrent des cartes ; les compteurs du
Répertoire et des Utilisateurs filtrent leurs listes. Ces contrôles, la
pagination, le fil d'Ariane, la sidebar et le sélecteur de pôle gardent leur
composition propre. Cette précision est documentaire, sans nouvelle modification
du composant ni nouveau contrôle navigateur.

20 scénarios Chromium isolé réussis, dont les trois consommateurs à 320, 390,
768 et 1 440 px, défilement dans les deux sens, focus au redimensionnement,
infobulle, clics modifiés et annulation du départ d'un profil modifié.
[Preuves et limites](../../audits/AUDIT_NAVIGATION_SECTIONS_2026-10-11.md).
Cette passe n'est pas une validation de session, du routeur Next réel ni de
lecteur d'écran ; NAV-02 conserve sa portée d'intégration.

Lors d'une évolution de la barre, vérifier :

- La section possède-t-elle une URL ou s'agit-il d'un onglet de contenu ?
- Les libellés longs et les largeurs réduites restent-ils accessibles, avec
  disparition des flèches lorsque le défilement n'est plus nécessaire ?
- Tab, révélation horizontale et redimensionnement gardent-ils un focus visible
  sans commande de défilement vertical ? Après changement accepté, le début du
  nouveau contenu est-il visible sans perturber les navigations refusées ?
- Les clics modifiés, l'annonce du brouillon et les gardes de départ restent-ils
  compatibles avec les consommateurs existants ?
