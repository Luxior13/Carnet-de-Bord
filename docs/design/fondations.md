# Fondations : tokens, typographie et dimensions

[Système de design](README.md) · [Principes](principes.md) · [Harmonisation](harmonisation.md)

Valeurs relevées le 19 octobre 2026 dans
[globals.css](../../apps/web/src/app/globals.css) (468 lignes), seul fichier CSS
global, et dans les neuf modules CSS partagés ou métier. Le CSS reste la source
exécutable : changer une valeur ici sans changer le CSS, ou l’inverse, crée une
divergence à corriger dans le même travail.

## Règle de choix des tokens

`globals.css` est le **seul propriétaire** des couleurs et de la géométrie
commune. Il les expose en trois couches :

| Couche | Exemples | Usage |
| --- | --- | --- |
| Valeurs de thème (`:root`) | `--surface-*`, `--border-*`, `--text-*`, `--primary`, `--success`… | Définies une seule fois, sombres uniquement (`color-scheme: dark`) |
| Alias sémantiques shadcn | `--background`, `--card`, `--popover`, `--muted`, `--accent`, `--input`, `--ring` | Ponts pour les primitives ; ne pas en créer de nouveaux usages directs dans un composant métier |
| Utilitaires Tailwind (`@theme inline`) | `bg-surface-panel`, `border-border-content`, `text-muted-foreground`, `ring-ring-form` | Ce que consomment les composants |

- Un composant consomme les utilitaires ou les variables, jamais une valeur
  hexadécimale. Relevé du 19 octobre 2026 : **aucune couleur codée** dans les
  modules CSS ni dans les classes arbitraires des TSX ([harmonisation](harmonisation.md)).
- La portée `data-surface-tone="indigo"` est une **variante opt-in** de surfaces
  bleues proches de la sidebar ; elle se pose aussi sur les portails des
  contenus concernés. Navigation, actions et focus gardent la palette commune.
- Les préférences système (`prefers-contrast: more`, `prefers-reduced-motion`,
  `forced-colors`) redéfinissent tokens et mouvement en fin de `globals.css` ;
  un composant ne les contourne pas.

## Variantes autorisées

**La cohérence d’abord** ([principes](principes.md#adapter-par-page-jamais-au-hasard)) :
la variante par défaut s’applique partout ; les exceptions admises sont listées
avec leur rôle. Une valeur absente de ce tableau est un écart à corriger
([harmonisation](harmonisation.md)). Une nouvelle exception demande une raison
fonctionnelle, une ligne ici et une mention dans la fiche de la page, avant le code.

| Sujet | Par défaut | Exceptions admises et leur rôle |
| --- | --- | --- |
| Police | Geist (`--font-sans`) pour le texte | Police système `--font-form-controls` (`font-form`) pour les champs, labels et menus de formulaire ; Geist Mono pour identifiants techniques et codes MFA ; la recherche de liste reste en Geist |
| Hauteur de contrôle | Champ de formulaire 40 px, 44 px sous 640 px | 38 px pour la recherche et les filtres compacts d’une liste ; 30 px pour un filtre rapide d’une liste, 44 px sous 640 px ; 48 px minimum pour un lien de barre de sections ; recherche du header 40 px (44 px sur mobile) ; flèches de pagination 30 px sur grand écran, 44 px sous 640 px |
| Rayon | 8 px (`rounded-control`) pour un champ, un panneau de sélecteur ou une carte de réglage ; 10 px (`rounded-lg`, ou `rounded-panel` fixe) pour un bouton, une carte, une section, un bandeau, une liste ou une fenêtre | 5 px (`rounded-badge`) pour un badge de statut et un bouton de page de la pagination ; 6 px (`rounded-compact`) pour un contrôle compact de liste et les angles supérieurs d’un lien de section ; 7 px (`rounded-tile`) pour un avatar, une infobulle, un menu ou un panneau de sélecteur compact ; 4 px (`rounded-option`) pour une option de menu ou une case à cocher ; 8 px pour `rounded-lg` dans la portée indigo ; pastille circulaire ; flèche d’infobulle 2 px |
| Badge | Badge de statut à point coloré `StatusBadge` (`$ui/status-badge`) : bordure et fond teintés, rayon 5 px, texte 11 px (`text-xs`), graisse 500 ; tons `success`, `info`, `warning`, `danger` et `muted` pour une catégorie neutre. `PersonStatusBadge`, `UserStatusBadge` et `UserAccessBadge` le composent ; primitive `Badge` sinon | Badge neutre pour une métadonnée descriptive ; aucun badge qui répète l’état déjà exprimé par une commande |
| Tons d’état | `success`, `info`, `warning`, `destructive` | Tons d’accès `access-privileged`, `access-admin`, `access-member` pour un niveau de droit ; couleurs `nav-*` pour les pôles |
| Taille de texte | Échelle de [Typographie](#typographie) | Champs à 16 px sous 1024 px puis 13 px ; titre de bandeau 23 px (18 px compact) ; rien sous 10 px |
| Graisse | 400 pour le texte, 600 pour labels, titres et actions | 500 pour les badges ; 650 pour le titre du bandeau |
| Bandeau de page | `PageIdentityHero` | Variante `compact` pour une fiche, un formulaire ou une création |
| Fond de page | `surface-canvas` | Portée indigo opt-in pour une composition qui la justifie |
| Barre d’enregistrement | `SectionActionBar` collante avec un brouillon | Dans le flux sous 768 px de large ou 600 px de haut, sans brouillon, ou en `placement="inline"` pour un réglage local |

Devant un élément, deux questions dans l’ordre : **la variante par défaut
convient-elle ?** Sinon, **quelle exception admise correspond à son rôle ?** Si
aucune, proposer une nouvelle exception avec sa raison.

## Palette

Valeurs de `:root` (portée par défaut).

| Rôle | Token | Valeur |
| --- | --- | --- |
| Fond d’application | `--surface-canvas` | `#060a11` |
| Fond de page, colonne | `--surface-page` | `#0b111b` |
| Champ, zone en retrait | `--surface-inset` | `#0e1622` |
| Panneau, section | `--surface-panel` | `#15202f` |
| Panneau élevé | `--surface-panel-raised` | `#18243a` |
| En-tête de section | `--surface-panel-header` | `#1d2c48` |
| Élément flottant, infobulle | `--surface-floating` | `#1b2942` |
| Contrôle survolé / focalisé | `--surface-control-hover` / `--surface-control-focus` | `#182433` / `#1e2c40` |
| Survol de tuile, menu | `--surface-tile-hover` | `#22304a` |
| Liste, sidebar | `--surface-content` | `#172333` |
| Barre de filtres | `--surface-content-header` | `#24334a` |
| En-tête de tableau | `--surface-table-head` | `#2c3e59` |
| Ligne alternée, carte de réglage | `--surface-row-alternate` | `#202f44` |
| Ligne survolée, navigation active, sélection | `--surface-row-hover` (alias `--surface-navigation-active`, `--surface-selected`) | `#2b4060` |
| Bandeau (dégradé) | `--surface-hero-start` → `--surface-hero-end` | `#2b3c57` → `#1d2a3f` |
| Bordure du bandeau | `--border-hero` | `#4b6285` |
| Texte discret du bandeau | `--text-hero-muted` | `#9cacc6` |
| Bordure de liste et de formulaire | `--border-list` (alias `--border-form`) | `#435978` |
| Bordure de liste et de sidebar | `--border-content` | `#3a4d69` |
| Bordures (discrète, par défaut, forte, séparateur) | `--border-subtle` / `-default` / `-strong` / `-divider` | `#26344b` / `#354863` / `#5b7699` / `#2a3a52` |
| Bordure de contrôle compact, case à cocher | `--border-control` | `#6f86a5` |
| Texte principal / secondaire / discret / désactivé | `--text-primary` / `-secondary` / `-muted` / `-disabled` | `#f3f6fb` / `#c4cedc` / `#8e9baf` / `#6d7a90` |
| Accent d’action | `--primary` / `--primary-foreground` | `#698cdd` / `#091321` |
| Accent textuel | `--primary-emphasis` | `#b9dafe` |
| Focus général / des champs | `--ring` / `--ring-form` | `#92acd0` / accent à 13 % |
| Personne externe | `--surface-external` / `--border-external` / `--text-external` | `#263f68` / `#4a70a8` / `#aecfff` |
| Voile de fenêtre | `--overlay` | `#05080e` |

### États

| Ton | Texte ou trait | Fond d’une action pleine |
| --- | --- | --- |
| Succès | `--success` `#86efac` | `--success-foreground` `#052e16` |
| Attention | `--warning` `#fcd34d` | `--warning-foreground` `#451a03` |
| Information | `--info` `#bae6fd` | `--info-foreground` `#082f49` |
| Danger | `--destructive` `#fca5a5` | `--destructive-fill` `#b91c1c`, texte `--destructive-foreground` `#fff1f2` |

### Accès et pôles

| Rôle | Tokens et valeurs |
| --- | --- |
| Accès (badges, fond d’avatar) | `--access-privileged` `#c2b8e7`, `--access-admin` `#acc6e8`, `--access-member` `#a3c9d8` |
| Pôle Aujourd’hui | `--nav-dashboard` `#2dd4bf` (icône `#5eead4`) |
| Pôle Membres | `--nav-internal` `#38bdf8` (icône `#7dd3fc`) |
| Pôle Activité | `--nav-activity` `#a78bfa` (icône `#c4b5fd`) |
| Pôle Structure (thème `legal`) | `--nav-legal` `#facc15` (icône `#fde047`) |
| Pôle Esport (thème `sport`) | `--nav-sport` `#f472b6` (icône `#f9a8d4`) |
| Pôle Système | `--nav-system` `#94a3b8` (icône `#cbd5e1`) |
| Pôle Finances (thème `treasury`) | `--nav-treasury` `#4ade80` (icône `#86efac`) |

### Portée indigo

`[data-surface-tone='indigo']` : `--radius` 0,5 rem, panneau = sidebar
(`#172333`), panneau élevé et en-tête `#27364b`, retrait `#10182a`, survols
`#293d59` / `#2b4262` / `#2d415c`, ligne alternée `#233145`, bordures
`#3b516d` (défaut), `#344761` (séparateur), `#7891b5` (contrôle), `#a4c5f5` (forte).

### Largeurs de page

`PageShell` borne la colonne : `default` 76 rem (`--private-content-width`),
`form` 52 rem (créations), `reading` 56 rem, `narrow` 64 rem, `wide` 92 rem,
`full`. Marge latérale `clamp(1rem, 2vw, 2rem)`.

### Points de rupture utilisés

| Seuil | Effet |
| --- | --- |
| 450 et 740 px de conteneur | Liste `directory` : recherche pleine largeur, puis tableau en cartes |
| 640 px | Boutons, champs, menus compacts, recherche, dépliants et flèches de pagination à 44 px en dessous ; filtres rapides en rangées défilantes ; actions de carte pleine largeur |
| 768 px de large et 600 px de haut | Barre d’enregistrement collante autorisée |
| 1024 px | Sidebar en volet mobile ; champs à 13 px au-delà |
| 48, 52, 56, 64 rem | Seuils du tableau Utilisateurs selon les colonnes autorisées |

## Hiérarchie de couleurs

La palette courante est portée par les tokens de `globals.css`. Les valeurs
des captures de septembre sont historiques ; elles ne doivent pas être
recopiées pour créer une nouvelle page.

Le fond utilise `surface-canvas`, les panneaux `surface-panel`, les listes
`surface-content`. Leurs commandes utilisent `surface-content-header`, leurs
colonnes `surface-table-head`, leurs lignes alternées `surface-row-alternate`
et leur survol `surface-row-hover`. Les champs utilisent `surface-inset`.
Le bandeau d'identité compose `surface-hero-start` et `surface-hero-end` avec
`border-hero`. La sidebar réutilise `surface-content` et `border-content`.

Une ligne dépliée d’une liste et son détail forment un seul bloc en
`surface-row-alternate` : un cran au-dessus de la liste, sous sa barre de
filtres, avec un filet `border-strong` de 2 px à gauche. `surface-row-hover`,
la teinte la plus claire d’une liste, reste le survol et la sélection d’une
ligne ; elle ne colore jamais un bloc de contenu, qui dominerait sinon la page
(préférence du 31 octobre 2026, [journal d’activité](../pages/systeme/journal-activite.md)).

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
ont leur propre focus (`--primary` et `--ring-form`, voir [Espacements et arrondis](#espacements-et-arrondis)).

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

## Typographie

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
Le titre d’une section de fiche est un `h2` réservé aux lecteurs d’écran ; ses
rubriques sont des `h3` en tête de leur carte, avec une tuile d’icône teintée
(`RubricTitle`, 27 octobre 2026).
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
identifiant de connexion. Dans une fiche, les groupes de champs (Identité,
Connexion et contact) sont des cartes titrées (`RubricCard`) ; dans un
formulaire de création, ils restent des repères en petites capitales
atténuées, distincts des labels. La recherche de liste conserve Geist (`font-sans` dans
`ListSearchField`) et sa taille spécifique ci-dessus, comme les notifications.
Vérifier lisibilité, zoom et confort sur les appareils visés ; ces valeurs
ne prouvent pas à elles seules l'accessibilité. Les contrôles spécialisés
peuvent garder une adaptation utile, comme la police monospace des codes MFA
ou un champ numérique joint à ses boutons. Le grand « 404 » est un repère
décoratif ; « Page introuvable » est le `h1`.

Voir [AUDIT_TYPOGRAPHIE.md](../audits/2026-09-22-typographie.md) pour les constats
historiques ; cette ancienne échelle ne remplace pas les règles courantes.

## Espacements et arrondis

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
- **Rayons nommés (25 octobre 2026, HARMO-02)** : chaque rôle a son jeton,
  défini une fois dans `globals.css` (`--shape-*`) et exposé en utilitaire
  `rounded-*` ; les modules CSS lisent `var(--shape-*)`. Valeurs fixes, identiques
  dans toutes les portées. `cn()` connaît ces noms, donc un `rounded-*` passé
  par l’appelant remplace bien celui de la primitive.

  | Jeton | Valeur | Rôle |
  | --- | --- | --- |
  | `panel` | 10 px | Carte, fenêtre, bandeau, barre d’enregistrement |
  | `control` | 8 px | Champ, bouton d’action d’un réglage, encart d’avertissement |
  | `tile` | 7 px | Avatar, menu, panneau de sélecteur compact, infobulle |
  | `compact` | 6 px | Filtre compact, pas-à-pas, onglet, tuile imbriquée |
  | `badge` | 5 px | Badge de statut, bouton de page |
  | `option` | 4 px | Option de liste ou de menu, case à cocher |

  `rounded-lg` (`--radius`) reste le rayon des primitives qui suivent la
  portée indigo. Aucune valeur arbitraire `rounded-[Npx]` ne subsiste, hors
  la flèche d’infobulle (2 px). Une nouvelle valeur demande une ligne ici.
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
- Dans l'onglet Autorisations des Utilisateurs, le rôle a sa propre ligne en
  variante **compacte** et le pôle et la page se choisissent dans la navigation
  de l'éditeur (26 octobre 2026, qui remplace les menus du 18 octobre). Chaque
  autorisation est une carte autonome sur une ligne (`surface-row-alternate`,
  `border-content`, rayon 8 px, 8 px d’écart), sans alternance, avec un
  interrupteur au bord droit. L'état non accordé est neutre ; le rouge est
  réservé à la pastille « Critique », l'ambre au prérequis manquant.
- Les compositions de référence définissent aussi des dimensions ciblées :
  bandeau et carte de liste à 10 px, contrôles du module `directory` à 6 px,
  infobulle à 7 px, case à cocher à 4 px et flèche d'infobulle à 2 px.
  Les pastilles restent circulaires.
- Dans les listes, reprendre les contrôles de 38 px et leurs adaptations
  mobiles du module partagé. Les flèches de pagination passent à 44 px sous
  640 px. Les nouveaux contrôles gardent une cible utilisable au clavier et au
  tactile, à vérifier dans leur contexte.
- Les variantes de taille d'un bouton gardent le même arrondi.

## Élévation et ombres

Les ombres montent avec l'élévation et restent très douces :

- `--shadow-panel` : carte posée.
- `--shadow-navigation-stuck` : séparation inférieure discrète de la barre de
  sections, uniquement lorsqu'elle est accrochée en haut du conteneur défilant.
- `--shadow-panel-strong` : panneau survolé ou ouvert.
- `--shadow-account-popover` : menu de compte.

## Mouvement et accessibilité

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

Toute zone qui défile à l’intérieur d’une page (barre latérale, colonnes de
l’éditeur d’autorisations) prend la classe commune `thin-scrollbar` de
`globals.css` : barre fine, pouce `--scrollbar-thumb` / `--scrollbar-thumb-hover`,
couleurs du système avec `prefers-contrast`. Le défilement reste natif (clavier,
molette, lecteurs d’écran) ; pas de barre simulée (décision du 26 octobre 2026).

Depuis la revue transverse du 11 octobre 2026, `DialogContent` et
`AlertDialogContent` utilisent `surface-panel`, `border-content` et un rayon de
10 px. Les actions longues s’empilent sur mobile. La restitution commune du
focus couvre aussi les ouvertures sans `DialogTrigger`, tout en respectant une
restitution spécifique et le passage vers une autre fenêtre. Les variantes plein
écran du Répertoire et de recherche, ainsi que le volet de navigation, conservent
leur composition dédiée. Décisions, contrôles et questions à reprendre :
[suivi des modales](../pages/transverse/modales.md).

## Où ranger un style

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
les primitives, la limitation des jetons aux fichiers d'authentification et la
protection des formulaires.
Les éléments de structure (`main`, `nav`, `form`, listes, titres) restent du HTML
sémantique : shadcn ne remplace pas la structure d'une page.
