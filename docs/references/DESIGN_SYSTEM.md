# Design system — conception de référence

Ce document décrit l'identité visuelle du site, de la couleur jusqu'à la
hiérarchie des pages. C'est la référence à suivre pour toute nouvelle page,
nouveau composant ou retouche de style.

La [revue générale](../qualite/REVUE_GENERALE.md) et la
[fiche Interface visuelle](../qualite/fiches/interface-visuelle.md) organisent les
contrôles. Les valeurs de cette référence décrivent le socle partagé ; les
adaptations locales justifiées restent dans le suivi de la page. Elles ne deviennent
pas automatiquement une nouvelle règle pour tous les écrans.

Le parti pris : un outil de gestion privé, dense, calme et lisible, où
l'information passe avant la décoration.

### Référence visuelle choisie

Le [Répertoire](../qualite/pages/membres-repertoire.md), route
`/membres/repertoire`, est la référence visuelle et UX de l'application.
La [liste Utilisateurs](../qualite/pages/systeme-utilisateurs.md), route
`/systeme/utilisateurs`, la complète pour les composants partagés de gestion.
Leurs décisions courantes précisent les variantes et les limites vérifiées ;
les anciennes captures et les audits restent des preuves datées.

Le 17 octobre 2026, l'utilisateur confirme que `/systeme/utilisateurs` lui
convient visuellement : couleurs aux bons endroits, informations claires et
densité satisfaisante. Reprendre ce ressenti dans les autres compositions,
sans reproduire systématiquement son tableau. L'onglet Autorisations l'adapte
en lignes de réglage compactes, avec descriptions dépliables et conséquences
critiques visibles ; voir le [suivi Utilisateurs](../qualite/pages/systeme-utilisateurs.md#autorisations--présentation-allégée--17-octobre-2026).

Le socle commun comprend les surfaces gris bleuté, la typographie dense, les
bordures fines, les contrôles et leurs états. Les listes reprennent aussi le
bandeau de colonnes, l'alternance des lignes et les badges. Cette hiérarchie se
décline selon l'usage :

- En-têtes de page : `PageIdentityHero` (dégradé `--surface-hero-start →
  --surface-hero-end`, bordure `--border-hero`, rayon 10 px), identique sur
  les pages de référence. Ne plus introduire de variante de bandeau locale.
- En-têtes de section : `surface-panel-header` ; barre de filtres des listes :
  `surface-content-header` ; colonnes : `surface-table-head`. Ces niveaux
  distinguent titre, commandes et résultats.
- Corps de cartes et fenêtres : `surface-panel`, sans grande ombre décorative.
- Listes et fiches en lecture : `surface-row-alternate` pour distinguer les
  entrées répétées ; même alternance dans la version mobile des tableaux.
- Formulaires : champs en retrait, espacement plus généreux que les lignes de
  tableau. Aucun zébrage ajouté à une grille de champs éditables.
- Autocomplétion du navigateur et des gestionnaires de mots de passe :
  **désactivée partout, sans exception**, y compris connexion, mots de passe et
  MFA (règle utilisateur du 2026-10-10, réaffirmée le 2026-10-11).
  `Input`, `Textarea` et `CommandInput` imposent `autoComplete="off"` et les
  attributs d'exclusion Bitwarden/1Password/LastPass après les props du parent.
  Les formulaires portent également `autoComplete="off"`. Aucun opt-in
  `allowPasswordManager`, jeton d'autocomplétion positif ou champ invisible
  d'association compte/mot de passe. Les listes de choix métier restent utiles.
  Ces attributs expriment la politique du site ; une extension peut les ignorer
  selon sa version et ses réglages. Ne pas annoncer un blocage garanti sans
  essai de l'extension concernée. [Contrôle et limites](../audits/AUDIT_AUTOCOMPLETION_2026-10-11.md).
- Interaction : `surface-tile-hover` pour le survol des lignes et menus,
  `surface-selected` pour la sélection ou un contenu à remarquer. Une ligne
  sélectionnée conserve sa couleur quelle que soit sa parité.
- Navigation : `surface-navigation-active` et `surface-navigation-hover`,
  bleu ardoise, partagés entre sidebar, rail de fiche, onglets et pagination.
- Icônes génériques et badges descriptifs : neutres. Les couleurs restent utiles
  pour les statuts, les pôles, les actions principales, l'épinglage et le non-lu.

### Règle de réutilisation (2026-10-10)

Toute page nouvelle ou modifiée choisit les composants de référence utiles à
sa tâche : `PageIdentityHero`, `DataTableSection` + `directory.module.css` pour
les listes, `PageAsideLayout` si une synthèse secondaire est utile,
`TooltipContent` et les primitives `Input`, `Select`, `Button`, `Badge`, `Card`.
[globals.css](../../apps/web/src/app/globals.css) reste la source unique des
tokens ; aucune palette copiée dans un composant.

Le [catalogue des composants](COMPOSANTS.md) précise les choix par usage,
les comportements partagés et les responsabilités qui restent aux pages.

| Besoin | Source à réutiliser |
| --- | --- |
| Cadre, largeur et marges | [PageShell et PageCanvas](../../apps/web/src/components/ui/page-shell.tsx) |
| Bandeau d'identité, variante compacte | [PageIdentityHero](../../apps/web/src/components/layout/PageIdentityHero.tsx) et [son module](../../apps/web/src/components/layout/PageIdentityHero.module.css) |
| Tableau, cartes mobiles, outils et pagination | [DataTableSection](../../apps/web/src/components/ui/data-table-section.tsx) et [directory.module.css](../../apps/web/src/components/ui/directory.module.css) |
| Recherche de liste et effacement avec retour du focus | [ListSearchField](../../apps/web/src/components/ui/list-search-field.tsx) |
| Précédent/suivant d’une liste, avec total lorsqu’il est connu | [ListPagination](../../apps/web/src/components/ui/pagination.tsx) |
| Actions d’enregistrement et d’annulation | [SectionActionBar](../../apps/web/src/components/layout/SectionActionBar.tsx) et [son module](../../apps/web/src/components/layout/SectionActionBar.module.css) |
| Synthèse latérale ou empilée | [PageAsideLayout](../../apps/web/src/components/layout/PageAsideLayout.tsx) et [ses seuils](../../apps/web/src/components/layout/PageAsideLayout.module.css) |
| Navigation entre les sections d'une fiche | [PageSectionNavigation](../../apps/web/src/components/layout/PageSectionNavigation.tsx) |
| Infobulle, survol et focus | [TooltipContent](../../apps/web/src/components/ui/tooltip.tsx) |
| Vide, erreur et accès refusé | [ContentState](../../apps/web/src/components/layout/ContentState.tsx) et [PageState](../../apps/web/src/components/layout/PageState.tsx) |

Une fiche conserve une identité compacte et des sections de lecture ; un
formulaire groupe ses champs et ses validations ; un tableau de bord organise
ses synthèses selon les décisions à prendre. Tous partagent ce langage visuel.
Les filtres « statut de structure » et « sans coordonnées », les requêtes et les
permissions du répertoire restent des règles de son module. Les comportements
de recherche, de compteur et de retour de fiche se qualifient pour chaque besoin.

À migrer quand les pages concernées sont retouchées : `PageHero` avec `tone`
(actualités) et les
styles locaux qui dupliquent les composants partagés. Un module CSS de
composition métier, utilisant les tokens communs, reste légitime. L'accueil, Mon compte,
la fiche utilisateur, la création de compte et la création de fiche personne
utilisent déjà `PageIdentityHero`. La fiche personne le compose en variante
compacte via `EntityDetailLayout` depuis la revue du 12 octobre 2026 ;
`UsersAdminHero` a été retiré.
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

La palette courante est portée par les tokens de `globals.css`. Les valeurs
des captures de septembre sont historiques ; elles ne doivent pas être
recopiées pour créer une nouvelle page.

Le fond utilise `surface-canvas`, les panneaux `surface-panel`, les listes
`surface-content`. Leurs commandes utilisent `surface-content-header`, leurs
colonnes `surface-table-head`, leurs lignes alternées `surface-row-alternate`
et leur survol `surface-row-hover`. Les champs utilisent `surface-inset`.
Le bandeau d'identité compose `surface-hero-start` et `surface-hero-end` avec
`border-hero`. La sidebar réutilise `surface-content` et `border-content`.

Les éléments de navigation sélectionnés utilisent un bleu ardoise proche des
panneaux, avec une bordure fine `border-strong/60` pour délimiter le pôle et la
page actifs. Contrôler le contraste sur les fonds réellement rendus.

Les actions principales utilisent `primary` avec `primary-foreground` ; les
liens et accents textuels utilisent `primary-emphasis`. Les statuts et les
icônes des pôles gardent leurs repères fonctionnels.

Les surfaces flottantes de navigation utilisent le jeton `popover`, relié à
`surface-panel-raised`, avec leurs variantes dans les primitives partagées.
Les infobulles utilisent `surface-floating`, `border-control`, un rayon de 7 px
et `--shadow-panel-strong` via `TooltipContent`. Les filtres de liste utilisent
la variante `compact` des sélecteurs partagés ; `directory` porte leur largeur.
Les séparateurs restent en retrait ; les
sélections utilisent `surface-navigation-active`.

Le focus clavier utilise un bleu acier `#92acd0` via `--ring`.
Les boutons partagent cet indicateur quelle que soit leur variante ;
la couleur de leur fond conserve le sens de l’action. La sidebar et les
contrôles compacts utilisent le même jeton de focus. Les champs de formulaire
ont leur propre focus (`--primary` et `--ring-form`, voir §4).

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
Ne pas diminuer l'opacité d'un texte secondaire informatif. Vérifier son
contraste sur les surfaces et états utilisés, y compris `surface-floating` ;
un résultat d'audit ancien ne valide pas une combinaison nouvellement créée.
La racine HTML porte `dark`, en complément de `color-scheme: dark`, afin que
les variantes `dark:` des primitives soient effectivement actives.

---

## 3. Typographie

Police : Geist pour le texte, Geist Mono pour les identifiants techniques.
Échelle courante de `globals.css`, en pixels équivalents avec une racine de
16 px ; les tokens sont exprimés en `rem` :

| Échelle                  | Valeur          | Usage                                           |
| ------------------------ | --------------- | ----------------------------------------------- |
| `text-caption`           | 12px            | métadonnées, compteurs et groupes de navigation |
| `text-label`             | 13px            | étiquettes de navigation secondaire             |
| `text-xs`                | 11px            | aide courte, badges, infobulles                  |
| `text-sm`                | 13px            | corps de table et de liste, titres de panneaux   |
| `text-base`              | 14px            | contenu de fiche                                |
| `text-lg`                | 16px            | titre de dialogue ou de groupe                   |
| `text-xl`, `text-2xl`    | 18px, 22px      | titres et valeurs selon le composant             |

`PageIdentityHero` définit son titre à 23 px (18 px en variante compacte), sa
description à 11 px. Le module `directory` définit les en-têtes de tableau à
11 px, les identités à 13 px et la recherche à 12 px. Réutiliser ces compositions
pour retrouver leur densité, sans remplacer les tokens globaux d'une page à l'autre.

La hiérarchie HTML reste indépendante de la taille : un `h1` par
page, puis `h2` et `h3`. `CardTitle` rend un `h2` par défaut et accepte `as`.
`SectionPanel` accepte `titleAs="h3"` lorsqu'il est imbriqué dans une section.
Les titres de page restent neutres ; une zone dangereuse peut porter un statut.
Les titres et descriptions essentiels reviennent à la ligne. Un libellé tronqué
reste complet dans le DOM et dispose, si utile, d'un attribut `title`.

Les interlignages sont portés par les composants : titre de `PageIdentityHero`
à 1,3, description à 1,5 ; `CardTitle` utilise `leading-5`. Graisses : 400 pour
le texte, 500 pour les badges, 600 pour les labels, titres et actions ; le
bandeau d'identité utilise 650. Les compositions partagées possèdent quelques
dimensions explicites en pixels : les réutiliser plutôt que les recopier.

Les champs de formulaire (`Input`, `Textarea`, `SelectTrigger` par défaut)
utilisent la police système `--font-form-controls`, via `font-form` : valeurs
à 16 px sous 1024 px, puis 13 px au-delà. Sous 16 px, Safari iOS zoome sur le
champ au focus ; ce seuil couvre aussi tablettes et téléphones en paysage.
Les labels utilisent cette même police à 14 px, semi-gras. Les panneaux des
sélecteurs reprennent explicitement cette police dans leur portail, en
utilitaires Tailwind : le `className` d'un appelant garde donc la priorité.
Les formulaires de fiche réutilisent ces primitives sans remettre des labels
réduits et atténués ou une police monospace sur une saisie ordinaire, comme un
identifiant de connexion. Les sous-titres de groupe de champs (Identité,
Connexion et contact) restent des repères en petites capitales atténuées,
distincts des labels. La recherche de liste conserve Geist (`font-sans` dans
`ListSearchField`) et sa taille spécifique ci-dessus, comme les notifications.
Vérifier lisibilité, zoom et confort sur les appareils visés ; ces valeurs
ne prouvent pas à elles seules l'accessibilité. Les contrôles spécialisés
peuvent garder une adaptation utile, comme la police monospace des codes MFA
ou un champ numérique joint à ses boutons. Le grand « 404 » est un repère
décoratif ; « Page introuvable » est le `h1`.

Voir [AUDIT_TYPOGRAPHIE.md](../audits/AUDIT_TYPOGRAPHIE.md) pour les constats
historiques ; cette ancienne échelle ne remplace pas les règles courantes.

---

## 4. Espacements et arrondis

- Espacement : échelle Tailwind par défaut, ancrée sur 0.25rem.
- Arrondis : `--radius` vaut 0,625rem par défaut et 0,5rem dans la portée
  `data-surface-tone="indigo"` ; `sm`, `md`, `lg`, `xl`, `2xl` en dérivent
  par `calc()` (6, 8, 10, 14 et 18 px hors indigo avec une racine de 16 px).
- Décision du 17 octobre 2026 : reprendre pour les champs le rendu adouci
  validé sur les fiches Tournois du site Noctambule. `Input`, `Textarea` et
  `SelectTrigger` par défaut ont un rayon de **8 px** dans les différentes
  portées. Les champs sur une ligne mesurent **40 px**, puis **44 px sous
  640 px** ; les zones de texte conservent leur hauteur multiligne. Cette
  décision remplace le rayon de 6 px retenu le 10 octobre pour les formulaires.
  Le fond reste opaque (`--input`). Le contour de formulaire utilise
  `--border-form`, alias de `--border-list` (**1 px, #435978** au repos),
  puis `--border-strong` (**#5b7699**) au survol. Au focus ou à l’ouverture
  d’une liste, la bordure prend `--primary` (**#698cdd**) avec un anneau
  de **2 px**, `--ring-form` (accent à **13 %**). Cette précision demandée
  le 17 octobre reprend le contour adouci validé sur Informations de
  Noctambule, au lieu du précédent contour plus clair #6f86a5.
  Les erreurs conservent leur contour dédié, y compris au survol et au focus.
  Les dates natives suivent les mêmes règles ; leur calendrier reste natif.
  `prefers-contrast: more` renforce le contour et l’anneau ; les couleurs
  forcées gardent le focus système. Ces vérifications ne certifient pas
  l’accessibilité globale. `--border-control` reste distinct pour les autres
  contrôles, notamment les filtres compacts et les cases à cocher.
- `Button` et `Card` utilisent `rounded-lg` par défaut. Les variantes de
  menus et de fenêtres restent définies dans leurs primitives respectives.
- Le panneau `SelectContent` par défaut reprend le rayon de **8 px** des
  champs, avec des options de 34 px minimum espacées de 2 px. Les panneaux
  `SelectContent` compacts, `DropdownMenuContent` et sous-menus gardent leur
  rayon de **7 px**, leurs options de **4 px**. Les variantes de listes et de
  navigation reprennent ces primitives ; elles adaptent seulement leur densité,
  largeur et, pour les menus de sidebar, leur surface de navigation.
- Les filtres des listes Répertoire/Utilisateurs conservent la variante
  **`compact`** sur `SelectTrigger` et `SelectContent` : déclencheur de 38 px,
  rayon de 6 px, texte de 11 px, flèche de 15 px ; options de 34 px minimum
  et texte de 12 px, espacées de 2 px. Le style reste dans
  [select.module.css](../../apps/web/src/components/ui/select.module.css).
  Les fiches, créations et dialogues de coordonnées du Répertoire utilisent
  désormais la variante par défaut, alignée sur les autres champs. Adapter
  seulement la largeur à la composition (220 px dans les filtres desktop,
  largeur du champ dans la fiche), sans recopier la présentation des primitives.
- Dans l'onglet Autorisations des Utilisateurs, le rôle utilise la variante
  de formulaire par défaut. Les filtres pôle et page/fonction conservent la
  variante compacte. Ses rubriques présentent des lignes alternées,
  avec actions alignées lorsque la largeur du composant le permet, puis empilées.
  Les libellés Autoriser/Refuser restent visibles sur mobile. Une autorisation
  refusée n'impose pas un fond rouge à toute sa ligne ; la couleur signale le
  choix, le risque ou un prérequis manquant.
- Les compositions de référence définissent aussi des dimensions ciblées :
  bandeau et carte de liste à 10 px, contrôles du module `directory` à 6 px,
  infobulle à 7 px, case à cocher à 4 px et flèche d'infobulle à 2 px.
  Les pastilles restent circulaires.
- Dans les listes, reprendre les contrôles de 38 px et leurs adaptations
  mobiles du module partagé. Les flèches de pagination passent à 44 px sous
  640 px. Les nouveaux contrôles gardent une cible utilisable au clavier et au
  tactile, à vérifier dans leur contexte.
- Les variantes de taille d'un bouton gardent le même arrondi.

---

## 5. Élévation et ombres

Les ombres montent avec l'élévation et restent très douces :

- `--shadow-panel` : carte posée.
- `--shadow-navigation-stuck` : séparation inférieure discrète de la barre de
  sections, uniquement lorsqu'elle est accrochée en haut du conteneur défilant.
- `--shadow-panel-strong` : panneau survolé ou ouvert.
- `--shadow-account-popover` : menu de compte.

---

## 6. Focus et états

- L'épaisseur du focus est un jeton : `--ring-width`, appliqué avec
  `ring-[length:var(--ring-width)]`. Préciser `length:` pour que Tailwind
  interprète la variable comme une épaisseur et non comme une couleur ;
  la couleur reste fournie par `ring-ring` ou le token sémantique adapté.
  Exception : `Input`, `Textarea` et `SelectTrigger` par défaut utilisent un
  anneau de 2 px `ring-ring-form` avec une bordure `--primary` (§4).
- Un élément interactif a toujours : `hover`, `focus-visible`, `disabled` et,
  si pertinent, `aria-invalid`.
- Le focus est visible au clavier et masqué à la souris quand le navigateur le
  permet, sans jamais être supprimé.
- Un contour global de secours couvre les liens natifs. Les primitives peuvent
  le remplacer par leur anneau ; `forced-colors` rétablit un contour système.
- Les champs en édition directe utilisent les primitives sans surcharge :
  l'ancienne classe `SectionForm.quietField` a été retirée le 17 octobre 2026,
  car elle ne faisait plus que recopier leurs états.
- `SelectTrigger` conserve l'anneau partagé pendant l'ouverture du menu, même
  quand le focus passe aux options. L'état invalide garde sa teinte d'erreur.
  Les variantes discrètes et les filtres de listes ne doivent pas masquer cet
  état ouvert. Les options utilisent le survol/focus et la sélection des primitives.

---

## 7. Hiérarchie d'une page

De haut en bas :

1. **En-tête** : fil d'Ariane, recherche ; bouton de menu sur mobile.
   Reprendre le header partagé, sa hauteur, ses surfaces et son focus intérieur.
   La sidebar reste ouverte à 264 px sur ordinateur.
2. **Héro de page** : titre, description, éventuellement une action principale.
3. **Toile de page** : `PageShell` puis `PageCanvas`, largeur bornée.
4. **Sections** : `SectionPanel`, chacune avec un titre et une action locale.
   Il compose `Card`, `CardHeader` et `CardContent`. `AccountPanel` est uniquement
   un adaptateur qui lui fournit un identifiant accessible.
5. **Listes** : `DataTableSection` avec recherche, filtres, tri et pagination.
6. **Fiche** : identité compacte, navigation par sections, contenu de la section
   active et synthèse secondaire si utile.

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

`PageIdentityHero` est la référence d'en-tête pour les listes Répertoire et
Utilisateurs, conformément à la règle du début de ce document et au
[suivi du répertoire](../qualite/pages/membres-repertoire.md). `PageHero` reste
utilisé par des pages anciennes ; pour une nouvelle composition, choisir
`PageIdentityHero` ou sa variante compacte selon l'usage.
L'ancien `PageHeader`, inutilisé, a été supprimé. Les bordures des cartes
appartiennent à `CardHeader` et `CardFooter` : ne pas les redoubler sur le contenu
adjacent.

Le nom `PageHero` est conservé pour les consommateurs, mais son rendu est un
en-tête compact (`data-slot="page-heading"`). Les icônes de titre sont neutres ;
le sélecteur de pôle conserve ses repères de couleur.

---

## 8. Onglets et rails

- **Navigation entre sections** : toute barre horizontale de navigation entre
  sections disposant de leur propre URL utilise `PageSectionNavigation`,
  directement ou via `EntityDetailLayout`, sur les pages actuelles et futures
  du site. Les pages fournissent leurs libellés, icônes, destinations, état actif
  et gardes de navigation ; le style, le défilement et les interactions communs
  restent dans ce composant. Ne pas recopier la barre ou ses styles dans une page.
  Toute adaptation nécessaire se compose avec le composant partagé ; un besoin
  incompatible est expliqué dans le suivi de la page.
  La barre regroupe de vrais liens, chacun avec son URL, et reste accessible quand elle
  déborde ; la section active est rendue visible sans déplacer le formulaire.
  La section active associe fond `surface-navigation-active`, soulignement
  `primary` et icône `primary-emphasis`. Les liens gardent une hauteur minimale
  de 48 px et des angles supérieurs de 6 px, y compris au survol.
  Quand la barre s'accroche en haut du conteneur défilant, son fond reste opaque
  et une ombre inférieure discrète la sépare du contenu. Hauteur et espacement
  restent stables ; aucune bordure haute n'est ajoutée sous le header. L'ombre
  disparaît au retour à sa position normale ; sa transition respecte le mouvement réduit.
  Les deux flèches apparaissent seulement si les libellés dépassent la largeur
  de la barre ; elles deviennent inactives à leur extrémité sans perdre le focus.
  Le défilement horizontal natif reste disponible. Le focus révèle le lien visé,
  le mouvement réduit désactive l'animation, et la disparition des flèches au
  redimensionnement rend le focus à la section active si nécessaire.
  Le point de brouillon conserve son texte accessible et affiche l'infobulle
  « Modifications non enregistrées » au survol ou au focus, refermable par Échap.
  Lors d'un changement explicite vers une autre section, la garde est consultée
  une seule fois. Après acceptation, le début du nouveau contenu est remis en
  vue sous la barre s'il était masqué et le focus reste au lien activé. Cette
  commande du composant ne remonte pas systématiquement au bandeau d'identité ;
  elle ne promet pas d'annuler toute restauration de scroll native du routeur.
  « Rester » conserve URL, saisie et défilement. Le montage, Back/Forward,
  l'activation de la section courante, les clics modifiés et la simple révélation
  horizontale d'un lien ne déclenchent pas cette commande verticale.
  La confirmation conserve le mode de navigation choisi par la page, notamment
  le remplacement d'URL des trois consommateurs actuels.
  Consommateurs actuels : Mon compte et les fiches Utilisateur/Répertoire.
- **Onglets de contenu** : `Tabs`, pour des panneaux locaux alternatifs d'un
  même objet, avec le comportement clavier et les rôles ARIA correspondants.
  Les filtres, la pagination, le fil d'Ariane et les menus de navigation
  conservent leurs composants adaptés à leur fonction.
- Les onglets ne remplacent pas les filtres : un onglet est un lieu, un filtre
  est une requête.
- **Rail de synthèse** : `PageAsideLayout` apparaît à partir de 118rem de viewport, avec
  une largeur de 16rem. En dessous, il se place entre le bandeau et la liste.
  La synthèse du Répertoire devient alors compacte. Reprendre le seuil du layout
  consommé, adapter le contenu à sa position et vérifier aussi une largeur
  intermédiaire.

L'ancien seuil de 104rem et les classes `private-rail-*` ont été retirés du
code. Les indications correspondantes des anciens audits restent historiques.

---

## 9. Les états d'interface

Chaque écran couvre les états pertinents pour ses capacités, avec les composants dédiés :

- chargement initial : `Skeleton` ;
- actualisation : non bloquante ;
- résultat : le contenu ;
- vide : `ContentState` avec l'action qui permet de le remplir ;
- erreur : `ContentState` avec nouvelle tentative ;
- accès refusé : `AccessDeniedState` avec retour ;
- conflit de version : message et rechargement ;
- changement non enregistré : `UnsavedNavigationDialog`.

### Barre d’enregistrement commune

`SectionActionBar` est la référence partagée, issue de la fiche
`/systeme/utilisateurs/[id]`, pour les pages actuelles et futures demandant
Enregistrer/Annuler. Les créations, profils, autorisations et réglages composent
cette barre ; les pieds de modale conservent leur composition adaptée.

- États distincts : formulaire inchangé, brouillon, enregistrement, conflit et
  actualisation de version. Une raison d’indisponibilité reste visible et liée
  au bouton ; actualiser ne signifie pas enregistrer.
- Choisir `onSave` pour un callback ou `saveType="submit"` pour une soumission
  native. `saveForm` associe un formulaire extérieur, par exemple avec un portail.
  L’API exclut le cumul des deux déclenchements.
- Le formulaire garde validation, brouillon, version, permissions et verrou
  synchrone des opérations. Une erreur conserve la saisie ; une actualisation
  de conflit demande une nouvelle confirmation avant écriture. Les réponses
  d’une ancienne cible ne doivent pas remplacer la fiche courante.
- La barre est collante uniquement avec un brouillon et une place suffisante :
  au moins 768 px de largeur et plus de 600 px de hauteur. Sur écran plus étroit
  ou moins haut, elle reste dans le flux pour ne pas masquer les champs.
  `placement="inline"` sert aux réglages locaux ; un formulaire inchangé reste
  également dans le flux. `cancelDisabled={false}` permet de refermer un éditeur
  de réglage ouvert sans modification.
- Les actions supplémentaires restent contrôlées par leur propriétaire, y
  compris leurs permissions et leur indisponibilité pendant une requête.

`Button loading` fournit l’indicateur d’attente, `aria-busy` et la désactivation
du bouton ordinaire tout en conservant son libellé. Le formulaire fournit le
texte d’attente et protège la requête des doubles appels. Pour une navigation,
`Button asChild` conserve un vrai lien ; `loading` et `disabled` ne sont pas des
props disponibles dans ce mode.

Une attente doit avoir une issue. Les requêtes interactives bornent aussi la
lecture du corps de réponse ; les actions sensibles actuelles utilisent une
borne de 30 secondes. Un délai dépassé ou une réponse perdue ne prouve pas que
l'écriture a été annulée : afficher un résultat incertain et une vérification
explicite, conserver le brouillon utile, puis libérer les commandes de reprise.
Ne pas relancer automatiquement une mutation. Un avertissement de résultat
incertain reste disponible après changement d'onglet jusqu'à sa résolution.

---

## 10. L'inventaire des composants

Le [catalogue des composants partagés](COMPOSANTS.md) est la référence de choix
et de comportement, reliée aux sources et au suivi transverse. Cet inventaire
résume leur organisation.

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
liste : Entrée sur Effacer ou Fermer ne doit pas
ouvrir aussi le résultat sélectionné. Le style sobre de la recherche reste local ;
`DialogContent.overlayClassName` permet d’adapter son voile sans modifier les
autres fenêtres.

La navigation entre sections utilise `PageSectionNavigation`. Une action de
navigation présentée comme un bouton utilise `Button asChild` avec un lien.
Ces liens ne sont pas transformés en onglets ARIA : chaque section possède une URL.

`components/layout` : en-tête, héro, état de contenu, état de page, panneau de
section, retour contextuel, mise en page de fiche, zone de danger, recherche
globale.

`components/users` : fiche utilisateur et éditeur d'autorisations ;
`features/users` : liste des comptes et ses composants métier.

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

Depuis la revue transverse du 11 octobre 2026, `DialogContent` et
`AlertDialogContent` utilisent `surface-panel`, `border-content` et un rayon de
10 px. Les actions longues s’empilent sur mobile. La restitution commune du
focus couvre aussi les ouvertures sans `DialogTrigger`, tout en respectant une
restitution spécifique et le passage vers une autre fenêtre. Les variantes plein
écran du Répertoire et de recherche, ainsi que le volet de navigation, conservent
leur composition dédiée. Décisions, contrôles et questions à reprendre :
[suivi des modales](../qualite/pages/modales.md).

---

## 12. Règles pour ajouter une page ou un composant

1. Partir de la revue générale : définir la tâche, le type de page et les sujets
   utiles, puis lire les décisions courantes du Répertoire et du suivi travaillé.
2. Reprendre les tokens et les compositions utiles de la table de réutilisation.
   Une disposition métier peut compléter ce socle ; consigner la raison d'un écart.
3. Suivre [NAVIGATION.md](NAVIGATION.md) pour l'emplacement et
   [FEEDBACK.md](FEEDBACK.md) pour les retours à l'utilisateur.
4. Vérifier les éléments modifiés au repos, au survol, au clavier, en attente,
   vide ou erreur selon leur usage, avec textes longs et valeurs absentes.
5. Comparer le rendu aux composants de référence sur petit, intermédiaire et
   grand écran. Vérifier les consommateurs si un composant partagé change.
6. Mettre à jour le suivi avec composants réutilisés, adaptations, contrôles
   réellement exécutés et limites ; terminer les changements documentaires
   par `bun run docs:check`.

---

## 13. Liens

- [NAVIGATION.md](NAVIGATION.md) — les lieux et leur hiérarchie.
- [FEEDBACK.md](FEEDBACK.md) — toasts, notifications, alertes et rappels.
- [AUDIT_DESIGN.md](../audits/AUDIT_DESIGN.md) — périmètre examiné, corrections et validation.

## 14. Où ranger un style

| Besoin                                                   | Emplacement                            |
| -------------------------------------------------------- | -------------------------------------- |
| Palette, aliases Tailwind, typo, rayons, largeur commune | `src/app/globals.css`, sections 1 et 2 |
| Document, focus de secours                               | `globals.css`, section 3               |
| Colonne, rail, scrollbar partagés                        | `globals.css`, section 4               |
| Contraste, mouvement réduit, couleurs forcées            | `globals.css`, section 5               |
| Aspect et états d'un bouton, champ, menu ou dialogue     | Primitive dans `components/ui`         |
| Composition commune des listes de gestion                | `components/ui/directory.module.css` et `DataTableSection` |
| Composition réutilisable d'une page ou section           | `components/layout`                    |
| Disposition spécifique au métier                         | Composant dans `features/<module>`     |

Un seul fichier CSS global suffit actuellement : il ne contient aucune règle
de page métier. Les classes utilitaires locales composent les primitives ;
elles n'ont pas à être déplacées dans un énorme catalogue de classes globales.
La séparation en plusieurs feuilles deviendra utile avec plusieurs thèmes ou
des styles globaux réellement indépendants, pas pour déplacer la duplication.

Le test `shadcn-boundaries.test.ts` analyse les TSX et interdit les contrôles
HTML hors de `components/ui`, sans exception pour un champ invisible
d'autocomplétion. `autofill-contracts.test.ts` contrôle les attributs rendus par
les primitives, l'absence d'opt-in dans les pages et la protection des formulaires.
Les éléments de structure (`main`, `nav`, `form`, listes, titres) restent du HTML
sémantique : shadcn ne remplace pas la structure d'une page.
