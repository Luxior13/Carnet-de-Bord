# Design system — conception de référence

Ce document décrit l'identité visuelle du site, de la couleur jusqu'à la
hiérarchie des pages. C'est la référence à suivre pour toute nouvelle page,
nouveau composant ou retouche de style.

La [revue générale](qualite/REVUE_GENERALE.md) et la
[fiche Interface visuelle](qualite/fiches/interface-visuelle.md) organisent les
contrôles. Les valeurs de cette référence décrivent le socle partagé ; les
adaptations locales justifiées restent dans le suivi de la page. Elles ne deviennent
pas automatiquement une nouvelle règle pour tous les écrans.

Le parti pris : un outil de gestion privé, dense, calme et lisible, où
l'information passe avant la décoration.

### Référence visuelle choisie

Le tableau « Comptes utilisateurs » est la référence approuvée : surfaces gris
bleuté, bandeau de colonnes plus clair, alternance de lignes sombres, bordures
fines et badges de statut lisibles. Cette hiérarchie se décline selon l'usage :

- En-têtes de page : `PageIdentityHero` (dégradé `--surface-hero-start →
  --surface-hero-end`, bordure `--border-hero`, rayon 10 px), identique sur
  les pages de référence. Ne plus introduire de variante de bandeau locale.
- En-têtes de section : fond uni `surface-panel-header`, comme les colonnes du
  tableau de référence. Ils restent distincts du titre de page.
- Corps de cartes et fenêtres : `surface-panel`, sans grande ombre décorative.
- Listes et fiches en lecture : `surface-row-alternate` pour distinguer les
  entrées répétées ; même alternance dans la version mobile des tableaux.
- Formulaires : champs en retrait, espacement plus généreux que les lignes de
  tableau. Aucun zébrage ajouté à une grille de champs éditables.
- Autocomplétion : **désactivée partout** (règle utilisateur du 2026-10-10).
  La primitive `Input` l'applique par défaut (`autoComplete="off"` + drapeaux
  d'ignorance Bitwarden/1Password/LastPass). Aucun `allowPasswordManager` ni
  `autoComplete` explicite sans justification ; les champs invisibles
  `autoComplete="username"` de l'association compte/mot de passe et les champs
  d'authentification personnelle restent les seules exceptions à réexaminer.
- Interaction : `surface-tile-hover` pour le survol des lignes et menus,
  `surface-selected` pour la sélection ou un contenu à remarquer. Une ligne
  sélectionnée conserve sa couleur quelle que soit sa parité.
- Navigation : `surface-navigation-active` et `surface-navigation-hover`,
  bleu ardoise, partagés entre sidebar, rail de fiche, onglets et pagination.
- Icônes génériques et badges descriptifs : neutres. Les couleurs restent utiles
  pour les statuts, les pôles, les actions principales, l'épinglage et le non-lu.

### Règle de réutilisation (2026-10-10)

Toute page nouvelle ou modifiée réutilise les composants de référence au lieu
de variantes anciennes ou locales : `PageIdentityHero`, `DataTableSection` +
`directory.module.css`, `PageAsideLayout`, `TooltipContent` partagé, et les
primitives `Input`, `Select`, `Button`, `Badge`, `Card`. `globals.css` reste la
source unique des tokens ; aucune couleur en dur dans les composants.

À migrer quand les pages concernées sont retouchées : `PageHero` avec `tone`
(dashboard, actualités, compte, `EntityDetailLayout`, création de fiche) et les
modules CSS de page locaux. `UsersAdminHero` a été retiré (fiche utilisateur
passée sur `PageIdentityHero`).
Les routes canoniques sont `/membres/repertoire` et `/systeme/utilisateurs` ;
ne plus créer de lien vers les anciens alias (`/personnes`,
`/vie-interne/*`, `/administration/*`).

Les mêmes jetons produisent une famille visuelle commune ; la densité et la
structure restent adaptées au contenu de chaque écran.

---

## 1. Les principes

- **Sombre par défaut**, avec des surfaces qui montent progressivement au lieu
  de s'éclaircir brutalement.
- **Une hiérarchie par la surface et l'espacement**, pas par des couleurs
  criardes.
- **Des états explicites** : survol, focus, désactivé, erreur, chargement,
  vide, refus. Aucun composant sans ses états.
- **Des couleurs et dimensions communes centralisées.** Les couleurs vivent
  dans `globals.css`. Les tailles utilisent l'échelle Tailwind ou les variables
  communes ; les calculs de viewport, les dimensions Radix et les grilles métier
  peuvent utiliser une valeur arbitraire justifiée.
- **Une densité de gestion**, pas de marketing : titres sobres, tableaux
  compacts, actions proches de leur contexte.

---

## 2. La hiérarchie de couleurs

La palette retenue le 23 septembre 2026 reprend les surfaces de la capture de
résultats esport fournie par l’utilisateur : fond charbon bleuté `#0d111c`,
panneaux `#182434`, en-têtes de tableaux `#202c3e`, lignes alternées `#1e2c3e`
et sélection `#2c425e`. Les contrôles en retrait utilisent `#111925`.

La sidebar reprend `#202c3e`, avec une bordure `#455b78`, pour se détacher du
fond général sans devenir un grand aplat bleu clair. Le header général utilise
`surface-page` (`#111925`). La teinte `surface-floating` (`#2a3c58`) reste
disponible pour les surfaces accentuées ; les menus utilisent le jeton
`popover` décrit ci-dessous. Le bleu le plus marqué reste localisé aux
sélections et aux états actifs.

Les éléments de navigation sélectionnés utilisent un bleu ardoise proche des
panneaux, avec une bordure fine `border-strong/60` pour délimiter le pôle et la
page actifs. Le texte clair garde un contraste supérieur à 5:1 sur cette sélection.

Le rose décoratif de la capture n’est pas repris. Les actions principales
utilisent un bleu lumineux `#70b5fa`, avec un texte sombre `#0c1a2b` ; les liens
et accents textuels utilisent `#b9dafe`. Les statuts et les icônes des pôles
gardent leurs repères fonctionnels. Les valeurs sont centralisées dans
`globals.css` pour les futurs modules.

Les surfaces flottantes de navigation utilisent le jeton `popover`, relié à
`surface-panel-raised` (`#202c3e`) : menus, filtres, recherche rapide,
infobulles et toasts. Elles partagent une bordure `border-default`,
des angles `rounded-xl` et une ombre discrète. Les séparateurs restent en
retrait ; les icônes de navigation n’ont pas de fond décoratif. Le champ, les
résultats et le pied de la recherche conservent le même fond. Les sélections
utilisent `surface-navigation-active`.

Le focus clavier utilise un bleu acier `#92acd0` via `--ring`.
Les boutons partagent cet indicateur quelle que soit leur variante ;
la couleur de leur fond conserve le sens de l’action. La sidebar et les champs
utilisent le même jeton de focus.

| Rôle                  | Jetons                                                                                                  | Usage                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Fond d'application    | `surface-canvas`                                                                                        | derrière tout, visible dans les marges |
| Fond de page          | `surface-page`                                                                                          | colonne de lecture                     |
| Panneau               | `surface-panel`                                                                                         | cartes et sections                     |
| Panneau élevé         | `surface-panel-raised`, `surface-floating`                                                              | survol, popovers                       |
| Panneau creusé        | `surface-inset`                                                                                         | champs, zones en retrait               |
| Bordure               | `border-subtle`, `border-default`, `border-strong`, `border-divider`                                    | du moins au plus visible               |
| Texte (variables CSS) | `--text-primary`, `--text-secondary`, `--text-muted`, `--text-disabled`                                 | hiérarchie de lecture                  |
| Accent                | `primary`, `primary-emphasis`                                                                           | action principale et point focal       |
| Statut                | `success`, `warning`, `info`, `destructive`                                                             | état d'un objet, jamais du décor       |
| Pôle                  | `nav-dashboard`, `nav-internal`, `nav-activity`, `nav-legal`, `nav-sport`, `nav-system`, `nav-treasury` | identifier le pôle actif               |

Règles : une couleur de statut n'est jamais utilisée pour décorer ; un texte
secondaire ne descend jamais sous le contraste minimal ; le fond et le texte ne
vivent jamais en dur dans un composant.

Les classes de texte courantes sont `text-foreground` et `text-muted-foreground`.
`text-primary-emphasis` désigne l'accent de marque, pas le texte courant.
Ne pas diminuer l'opacité d'un texte secondaire informatif : son contraste est
testé sur les sept surfaces, y compris `surface-floating` (plus de 5:1).
La racine HTML porte `dark`, en complément de `color-scheme: dark`, afin que
les variantes `dark:` des primitives soient effectivement actives.

---

## 3. Typographie

Police : Geist pour le texte, Geist Mono pour les identifiants techniques.

| Échelle                  | Valeur          | Usage                                           |
| ------------------------ | --------------- | ----------------------------------------------- |
| `text-caption`           | 12px            | métadonnées, compteurs et groupes de navigation |
| `text-label`             | 14px            | étiquettes de navigation secondaire             |
| `text-xs`                | 12px            | aide, badges                                    |
| `text-sm`                | 14px            | corps de table et de liste                      |
| `text-base`              | 16px            | contenu de fiche                                |
| `text-lg`                | 18px            | titre de dialogue ou de grand groupe            |
| `text-xl`, `sm:text-2xl` | 20px, puis 24px | titre de page                                   |

Les titres des panneaux de gestion utilisent 14px, ceux des cartes éditoriales
16px. La hiérarchie HTML reste indépendante de la taille : un `h1` par
page, puis `h2` et `h3`. `CardTitle` rend un `h2` par défaut et accepte `as`.
`SectionPanel` accepte `titleAs="h3"` lorsqu'il est imbriqué dans une section.
Les titres de page restent neutres ; une zone dangereuse peut porter un statut.
Les titres et descriptions essentiels reviennent à la ligne. Un libellé tronqué
reste complet dans le DOM et dispose, si utile, d'un attribut `title`.

Interlignages : titre de page 20/28px puis 24/32px ; titre de groupe 16/24px ;
titre de panneau et label 14/20px ; titre de fenêtre 18/24px ; description longue
14/24px ; métadonnées 12/16px. Graisses : 400 pour le texte, 500 pour les labels
et badges, 600 pour les titres et actions. Les tailles sont définies en `rem`.

Les champs de saisie restent à 16px sur mobile et passent à 14px sur grand écran.
Les codes MFA restent à 16px partout ; l'espacement renforcé est réservé aux six
chiffres TOTP, pas aux longs codes de secours. Les notifications Sonner utilisent
explicitement Geist et un texte de 14px ; leur style natif ne doit pas réintroduire
une police système différente. Le grand « 404 » est un repère décoratif, tandis
que « Page introuvable » est le titre `h1`.

Voir [AUDIT_TYPOGRAPHIE.md](AUDIT_TYPOGRAPHIE.md) pour les constats et mesures.

---

## 4. Espacements et arrondis

- Espacement : échelle Tailwind par défaut, ancrée sur 0.25rem.
- Arrondis : un seul curseur `--radius`, et `sm`, `md`, `lg`, `xl`, `2xl` en
  dérivent par `calc()`.
- Les composants primitifs gardent deux exceptions volontaires : `rounded-[4px]`
  pour la case à cocher et `rounded-[2px]` pour la flèche de tooltip.
- Primitives : contrôles `rounded-lg` (12px), fenêtres et menus `rounded-xl`
  (16px), cartes `rounded-2xl` (20px). L'en-tête de page n'est pas une carte.
  Les pastilles restent circulaires.
- Les variantes de taille d'un bouton gardent le même arrondi.

---

## 5. Élévation et ombres

Les ombres montent avec l'élévation et restent très douces :

- `--shadow-panel` : carte posée.
- `--shadow-panel-strong` : panneau survolé ou ouvert.
- `--shadow-account-popover` : menu de compte.

---

## 6. Focus et états

- L'épaisseur du focus est un jeton : `--ring-width`, appliqué avec
  `ring-[var(--ring-width)]`.
- Un élément interactif a toujours : `hover`, `focus-visible`, `disabled` et,
  si pertinent, `aria-invalid`.
- Le focus est visible au clavier et masqué à la souris quand le navigateur le
  permet, sans jamais être supprimé.
- Un contour global de secours couvre les liens natifs. Les primitives peuvent
  le remplacer par leur anneau ; `forced-colors` rétablit un contour système.

---

## 7. Hiérarchie d'une page

De haut en bas :

1. **En-tête** : fil d'Ariane, recherche ; bouton de menu sur mobile.
   Hauteur de 56 px, fond `surface-panel`, page courante semi-grasse et focus intérieur.
   La sidebar reste ouverte à 264 px sur ordinateur.
2. **Héro de page** : titre, description, éventuellement une action principale.
3. **Toile de page** : `PageShell` puis `PageCanvas`, largeur bornée.
4. **Sections** : `SectionPanel`, chacune avec un titre et une action locale.
   Il compose `Card`, `CardHeader` et `CardContent`. `AccountPanel` est uniquement
   un adaptateur qui lui fournit un identifiant accessible.
5. **Listes** : `DataTableSection` avec recherche, filtres, tri et pagination.
6. **Fiche** : héro compact, puis rail d'onglets, puis sections de l'onglet.

Pagination : partir de **25 éléments**, via `PAGINATION.DEFAULT_LIMIT` partagé
entre client et serveur. Une page peut définir une exception justifiée par sa
densité et son usage ; conserver ses plafonds de requête côté serveur. Le nombre
de lignes ne relève pas des paramètres système administrateur. Ajouter un choix
local et sa mémorisation par utilisateur/page seulement si le besoin est établi,
sans imposer ce contrôle à toutes les listes.

Pour des réglages globaux rarement modifiés, afficher d'abord la valeur appliquée
et une action **Modifier**. Ouvrir la saisie à la demande, avec Annuler et
Enregistrer ; refermer après succès, conserver le brouillon après erreur ou conflit.
Gérer le focus à l'ouverture et au retour en lecture. Adapter ce principe au
besoin réel : un formulaire de création reste directement en saisie.

Règles : une page n'a qu'un héro ; une action globale vit dans le héro, une
action locale dans sa section ; un retour contextuel ramène à la liste avec ses
filtres.

`PageHero` est l'unique composant d'en-tête de page ; l'ancien `PageHeader`,
inutilisé, a été supprimé. Les bordures des cartes appartiennent à `CardHeader`
et `CardFooter` : ne pas les redoubler sur le contenu adjacent.

Le nom `PageHero` est conservé pour les consommateurs, mais son rendu est un
en-tête compact (`data-slot="page-heading"`). Les icônes de titre sont neutres ;
le sélecteur de pôle conserve ses repères de couleur.

---

## 8. Onglets et rails

- **Rail de fiche** : navigation par onglets sur le côté, jamais plus de six
  onglets. Chaque onglet est une URL propre.
- **Onglets de contenu** : `Tabs`, pour des vues d'un même objet (filtres,
  sous-sections).
- Les onglets ne remplacent pas les filtres : un onglet est un lieu, un filtre
  est une requête.
- Le rail extérieur apparaît quand le conteneur `private-viewport` mesure au
  moins 104rem : 76rem de contenu, deux gouttières de 13,5rem et une réserve.
  Il dépend de l'espace restant après la sidebar, pas du viewport global.
  `private-rail-fallback` assure le retour et les onglets horizontaux en dessous
  de ce seuil, y compris sur un ordinateur avec la sidebar ouverte.

---

## 9. Les états d'interface

Chaque écran couvre les mêmes états, avec les composants dédiés :

- chargement initial : `Skeleton` ;
- actualisation : non bloquante ;
- résultat : le contenu ;
- vide : `ContentState` avec l'action qui permet de le remplir ;
- erreur : `ContentState` avec nouvelle tentative ;
- accès refusé : `AccessDeniedState` avec retour ;
- conflit de version : message et rechargement ;
- changement non enregistré : `UnsavedNavigationDialog`.

---

## 10. L'inventaire des composants

`components/ui` : bouton, badge, carte, champ, étiquette, case à cocher,
sélecteur, interrupteur, onglets, table, pagination, boîte de dialogue, popover,
tooltip, séparateur, squelette, sidebar, avatar, commande, alerte et état vide.

Les primitives shadcn sont du code source local, adapté aux jetons du site.
`Command` s'appuie sur cmdk ; `Avatar` et les contrôles interactifs concernés
s'appuient sur Radix. Les compositions métier utilisent ces primitives :
`ContentState` compose `Alert` ou `Empty`, `Disclosure` compose `Collapsible`
et `Button`, les avatars DiceBear composent `Avatar`. `Card` accepte `as` pour
conserver un article ou une section, et `asChild` pour une carte-lien.

La recherche rapide délègue ses interactions clavier à `Command`. Le classement
et les permissions restent dans le catalogue applicatif, avec
`shouldFilter={false}` pour éviter un second filtrage divergent.
Les boutons inclus dans cette palette isolent leurs touches de celles de la
liste : Entrée sur Effacer, Fermer ou l’accès à la recherche complète ne doit pas
ouvrir aussi le résultat sélectionné. Le style sobre de la recherche reste local ;
`DialogContent.overlayClassName` permet d’adapter son voile sans modifier les
autres fenêtres.

Un lien de navigation de fiche utilise `Button asChild` et reste un vrai lien.
Il n'est pas transformé en onglet ARIA : chaque section possède une URL.

`components/layout` : en-tête, héro, état de contenu, état de page, panneau de
section, retour contextuel, mise en page de fiche, zone de danger, recherche
globale.

`components/users` : fiche utilisateur et son rail d'onglets, éditeur
d'autorisations, listes.

Tout nouveau composant part dans `components/ui` s'il est générique, sinon dans
le module qui l'utilise.

---

## 11. Motion et accessibilité

- Durée : 150 à 200ms, uniquement pour la couleur, la bordure et l'ombre.
- `prefers-reduced-motion` annule les animations.
- `prefers-contrast` renforce les bordures et les textes.
- `forced-colors` garantit un focus visible.
- Toute couleur de texte respecte le contraste 4.5:1, toute bordure de contrôle
  au moins 3:1 sur son fond.

Ces seuils sont des objectifs pour les éléments informatifs et interactifs ;
les séparateurs décoratifs et les contrôles désactivés ont un rôle différent.
Les tests vérifient les textes secondaires sur les sept surfaces et les textes
des actions pleines, au repos et au survol. Cela ne remplace pas une recette
d'accessibilité de chaque écran.

Les fenêtres standard plafonnent leur hauteur selon l'espace disponible et
défilent verticalement. Ne pas leur imposer `overflow-hidden`, sauf avec un
corps interne explicitement défilable, comme les formulaires de personne.
Les en-têtes de dialogue réservent la place du bouton de fermeture.

---

## 12. Règles pour ajouter une page ou un composant

1. Réutiliser l'existant avant d'en créer un nouveau.
2. Aucune valeur en dur : passer par un jeton.
3. Couvrir les états avant de livrer.
4. Respecter la hiérarchie de page ci-dessus.
5. Suivre [NAVIGATION.md](NAVIGATION.md) pour l'emplacement.
6. Suivre [FEEDBACK.md](FEEDBACK.md) pour les retours à l'utilisateur.

---

## 13. Liens

- [NAVIGATION.md](NAVIGATION.md) — les lieux et leur hiérarchie.
- [FEEDBACK.md](FEEDBACK.md) — toasts, notifications, alertes et rappels.
- [AUDIT_DESIGN.md](AUDIT_DESIGN.md) — périmètre examiné, corrections et validation.

## 14. Où ranger un style

| Besoin                                                   | Emplacement                            |
| -------------------------------------------------------- | -------------------------------------- |
| Palette, aliases Tailwind, typo, rayons, largeur commune | `src/app/globals.css`, sections 1 et 2 |
| Document, focus de secours                               | `globals.css`, section 3               |
| Colonne, rail, scrollbar partagés                        | `globals.css`, section 4               |
| Contraste, mouvement réduit, couleurs forcées            | `globals.css`, section 5               |
| Aspect et états d'un bouton, champ, menu ou dialogue     | Primitive dans `components/ui`         |
| Composition réutilisable d'une page ou section           | `components/layout`                    |
| Disposition spécifique au métier                         | Composant dans `features/<module>`     |

Un seul fichier CSS global suffit actuellement : il ne contient aucune règle
de page métier. Les classes utilitaires locales composent les primitives ;
elles n'ont pas à être déplacées dans un énorme catalogue de classes globales.
La séparation en plusieurs feuilles deviendra utile avec plusieurs thèmes ou
des styles globaux réellement indépendants, pas pour déplacer la duplication.

Le test `shadcn-boundaries.test.ts` analyse les TSX et interdit les contrôles
HTML visibles hors de `components/ui`. Les six champs natifs invisibles
`autoComplete="username"` sont conservés pour l'association compte/mot de passe.
Les éléments de structure (`main`, `nav`, `form`, listes, titres) restent du HTML
sémantique : shadcn ne remplace pas la structure d'une page.
