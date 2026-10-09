# Suivi — Répertoire des membres (`/membres/repertoire`)

## Identité et état

- Route(s) : `/membres/repertoire` (liste), `/membres/repertoire/nouveau`
  (création), `/membres/repertoire/[id]` (fiche). Alias historiques :
  `/personnes` et `/vie-interne/repertoire`.
- Module propriétaire : `apps/web/src/features/persons`. Rendu de la liste :
  `app/membres/repertoire/page.tsx` (serveur) →
  `features/persons/components/PersonsPageClient.tsx` →
  `PersonsList.tsx`, styles `PersonsDirectory.module.css`.
- Statut : livré, en développement actif.
- Dernière revue : 2026-10-09 — analyse complète A à Z puis refactorisation
  sur les primitives partagées (voir « Refactorisation appliquée » ci-dessous).
- Références : intentions historiques `features/pages/vie-interne/membres*.md`,
  `features/pages/bureau-juridique/personnes-contacts.md` ; règles courantes
  `docs/NAVIGATION.md`, `docs/STRUCTURE.md`, `docs/ROLES_ET_PERMISSIONS.md`,
  `docs/PERMISSIONS.md` ; tokens `apps/web/src/app/globals.css`.

## Fonction et décisions courantes

- Tâche principale : retrouver une fiche membre, comprendre son statut dans la
  structure, accéder à sa fiche, en créer une.
- Type de page : liste de gestion (retrouver, comparer, agir). Volume attendu :
  petit aujourd'hui, potentiellement plusieurs centaines/milliers en société.
- Recherche par pseudo, prénom, nom, email, téléphone, identifiant ou URL de
  réseau social ; filtre de statut ; tri nom / création / modification ;
  pagination par curseur de 25 lignes.
- Accès : lecture `PERSONS.VIEW`, création `PERSONS.CREATE`. Contrôle serveur
  via `/api/personnes`. Le composant client refait ses propres garde-fous
  d'affichage (`canView`, `canCreate`) sans remplacer le contrôle serveur.
- La liste ne charge pas les coordonnées complètes, seulement leurs compteurs ;
  les données sensibles restent sur la fiche.

## Inventaire A à Z (état constaté le 2026-10-09)

Statut de chaque constat : « Examiné dans le code » (aucun banc visuel ni
parcours réel rejoué pour cette trace). Un point marqué « à vérifier » attend
un contrôle navigateur, lecteur d'écran ou base réelle.

### Chaîne de rendu

1. `page.tsx` lit `searchParams` (Next 15), la session, parse
   `personsListQuerySchema`, calcule `getPersonCapabilities`, vérifie
   `assertPersonFeatureReady`, charge un instantané serveur via `listPersons`
   et le passe au client. Les erreurs serveur sont absorbées : le client
   conserve ses états indisponibles/nouvel essai.
2. `PersonsPageClient` gère refus d'accès, indisponibilité, squelette, puis le
   contenu. Le tout dans `AuthenticatedLayout` avec fil d'Ariane « Membres /
   Répertoire ».
3. `PersonsList` porte la recherche, les filtres, l'état de pagination, les
   états vide/erreur et le tableau. Le style est entièrement dans le module CSS
   local, pas dans les primitives partagées.

### Bandeau d'identité (hero)

- Conteneur `header.hero` : dégradé 110° `#2b3c57 → #1d2a3f` (75 %), bordure
  `#4b6285`, rayon 10 px, padding 19/20 px, `flex-wrap`.
- Icône `Users` dans un carré 40 × 40 px, icône 27 × 27 px, couleur
  `var(--primary-emphasis)`.
- Titre `h1` : 23 px, line-height 1.3, graisse 650, letter-spacing −0.025em.
- Description `p` : « Profils, coordonnées et statut dans la structure. »,
  11 px, `#9cacc6`.
- Action « Ajouter une fiche » : `Link` brute stylée par le module (fond
  `--primary`, texte `#091321`, 11 px, graisse 600, min-height 36 px), pas la
  primitive `Button`.
- Mobile ≤ 639 px : padding 16 px et `margin-left: 53px` sur le bouton
  (magic number destiné à l'aligner sous le titre, fragile).

### Barre d'outils (recherche, filtres, tri)

- Formulaire `role="search"`, libellé accessible « Rechercher et filtrer les
  membres ».
- Champ de recherche : `Input` locale, hauteur 38 px, icône `Search` absolue,
  placeholder « Pseudo, nom ou coordonnée… », `maxLength` 100, debounce 300 ms.
  Bouton d'effacement quand il y a du texte, sinon bouton d'envoi avec icône
  `ChevronRight` (sémantiquement « aller », pas « loupe »).
- Deux `Select` Radix via un wrapper local `DirectorySelect` : statut
  (« Tous les statuts », « Dans la structure », « Hors structure ») et tri
  (« Nom (A–Z) », « Ajoutées récemment », « Modifiées récemment »). Trigger
  170 × 38 px, 11 px.
- Bouton « Réinitialiser les filtres » (icône seule, 38 × 38 px) visible si
  filtre actif.
- Filtres actifs en « chips » : « Recherche : X », « Statut : X », avec
  libellés de retrait accessibles.
- Légende : « N membres affichés · Actualisation… » + « 25 par page ». Le « N »
  est le nombre de lignes de la page courante, pas le total.

### Tableau

- `table-layout: fixed`, colonnes 130 px (statut), 220 px (coordonnées),
  150 px (dernière modification), le reste en membre. `caption` masquée
  « Les fiches du répertoire, leur statut et leurs coordonnées ».
- En-têtes : « Membre », « Statut », « Coordonnées », « Dernière
  modification », 11 px, graisse 500, `#c7d5ea`.
- Cellule membre : avatar DiceBear carré 36 × 36 px (bordure `#3b4f6d`, fond
  `#0d1523`), nom 13 px graisse 600, sous-ligne « Trouvée grâce à une
  coordonnée » (verte `#80ddba`) quand la recherche a matché un contact.
- Le lien du nom étend sa zone de clic sur toute la ligne via un pseudo-élément
  `position: absolute; inset: 0`.
- Cellule statut : `PersonStatusBadge` (pastille + texte, tokens
  `success`/`warning`), partagée avec la fiche.
- Cellule coordonnées : badge « N coordonnée(s) » (fond `#263f68`, bordure
  `#4a70a8`, texte `#aecfff`) puis compteurs email/téléphone/profil avec icônes
  `Mail`, `Phone`, `Share2`. Zéro coordonnée : tiret « — ».
- Cellule dernière modification : date/heure formatées `fr-FR`, infobulle
  « Modifiée par X (login) » quand un acteur est connu. Lien séparé vers la
  fiche, au-dessus de la zone de clic de la ligne (`z-index: 2`).

### Pagination

- « Page N » + boutons précédent/suivant seulement. Pas de total ni de « sur M ».
  Précédent/suivant désactivés selon `hasMore`/`nextCursor` et l'état de
  chargement.
- URL : `?q`, `?structureStatus`, `?sort`, `?page` (1-based) et `?cursor`.
  Le changement de filtre utilise `router.replace`, la pagination `router.push`
  (retour navigateur possible entre pages, pas entre états de filtre).

### États

- Chargement initial : squelette « Chargement du répertoire ».
- Refus : « Accès refusé » / « Vous n'avez pas la permission de consulter le
  répertoire. » / « Retour à l'accueil ».
- Indisponible : « Répertoire temporairement indisponible » / « Revérifier ».
- Erreur initiale : « Chargement impossible » + message brut d'erreur +
  « Réessayer ».
- Erreur d'actualisation : « Actualisation impossible » + « Les résultats
  précédents restent affichés. » + « Réessayer » (les données restent visibles,
  opacité 55 % pendant le rechargement).
- Vide filtré : « Aucune fiche trouvée » / « Essayez une autre recherche ou
  retirez les filtres. » / « Réinitialiser les filtres ».
- Vide complet : « Répertoire vide » / « Créez la première fiche pour commencer
  le répertoire. » / « Ajouter une fiche » (si permission).

### Responsive

- `container-type: inline-size` sur la liste, requêtes à 740 px et 450 px :
  recherche pleine largeur, tableau transformé en grille (identité pleine
  largeur, statut + coordonnées sur une ligne avec retrait de 46 px, dernière
  modification pleine largeur), en-têtes de tableau masquées visuellement.
- Sélecteurs pleine largeur sous 450 px, padding resserré.
- `prefers-reduced-motion` : transitions du champ et du bouton icône
  neutralisées ; le reste est couvert par la règle globale.

### Textes exacts

Voir la liste ci-dessus. Points de formulation à surveiller : « email(s) »,
« téléphone(s) », « profil(s) social(aux) » sont des pluriels lourds ;
« coordonnée(s) » idem. « N membres affichés » prête à confusion avec un total.

### Typographie exacte (valeurs en dur)

11 px (description, bouton hero, en-têtes, légende, dernière modification,
pagination), 12 px (champ, options), 13 px (nom), 10 px (sous-ligne, compteurs,
chips), 14 px (titre d'état vide), 23 px (titre hero). La balance des 11/13/14 px
correspond à l'échelle `--text-xs/sm/base` de `globals.css`, mais les valeurs
sont répétées en dur et 10/23 px sortent de l'échelle.

### Couleurs et tokens

Le module déclare des tokens locaux `--m-*` reliés aux tokens globaux
(bonne intention), mais conserve de nombreux hex en dur :

| Usage | Valeur actuelle | Proposition |
| --- | --- | --- |
| Bordure de la liste | `#435978` | token de bordure de contenu |
| Bordure du hero | `#4b6285` | `--border-default` ou dédié |
| Dégradé du hero | `#2b3c57 → #1d2a3f` | token de surface de hero |
| Description du hero | `#9cacc6` | `--text-muted` |
| Texte accentué divers | `#b2c8ef`, `#bcd1fa`, `#a9bddc`, `#b5c7e5`, `#dce6f7`, `#e5ecfa` | `--text-secondary` / `--text-primary` |
| Fond menu select | `#121d2d`, survol `#273b5b` | `--surface-floating`, `--surface-navigation-hover` |
| Chips de filtre | `#1d2c43`, bord `#435777`, texte `#bdcef0` | `--surface-inset`, `--border-default`, `--text-secondary` |
| Badge coordonnées | fond `#263f68`, bord `#4a70a8`, texte `#aecfff` | token sémantique « externe » |
| Avatar | bord `#3b4f6d`, fond `#0d1523` | `--border-default`, `--surface-inset` |
| Focus local | `#8eaff2` | `--ring` (déjà global) |
| Points de statut | `#80ddba` (actif), `#aecfff` (externe) | tokens sémantiques nommés |

### Dimensions et placement

Répertoriées dans l'inventaire ci-dessus. Les rayons 5–10 px locaux coexistent
avec l'échelle `--radius` globale ; le module ne consomme pas `--radius`.

## Ce qui est bon (à conserver)

- Le parti pris visuel : fond ardoise nuit, panneaux bleu acier, dégradé du
  bandeau, densité compacte 11/13/14 px, accents bleus. C'est la référence
  validée, à préserver à l'identique lors de toute refonte.
- Préchargement serveur de la première page (pas de flash de chargement),
  validation Zod côté page et côté API, erreurs serveur non bloquantes.
- Recherche sans frappe serveur (debounce), filtre/tri portés par l'URL,
  pagination par curseur stable, annulation des requêtes obsolètes
  (`AbortController`).
- Accessibilité déjà soignée : `role="search"`, `aria-live` sur la légende,
  `aria-busy`, libellés accessibles sur les contrôles, `time` + infobulle sur
  la modification, état vide/erreur distincts.
- Avatar DiceBear déterministe et local (aucune dépendance réseau), badge de
  statut partagé avec la fiche.

## Améliorations proposées

### Priorité haute : réutiliser les composants et les tokens déjà en place

1. **Remplacer le hero local par `PageIdentityHero`** (`$components/layout/PageIdentityHero`),
   déjà utilisé par l'accueil, les paramètres, la feuille de route et la liste
   des utilisateurs. Il est l'extraction officielle du hero du Répertoire ;
   supprimer la copie locale `.hero` du module et le hack `margin-left: 53px`.
2. **Réutiliser la brique de table partagée** : `$ui/table`,
   `$ui/data-table-section` (tableau desktop + liste mobile + pagination + état
   vide), `$ui/pagination`, `$ui/empty`, `$ui/alert`/`ContentState`, comme le
   fait déjà `features/users/UsersListPage.tsx`. La liste du Répertoire
   réimplémente aujourd'hui tout cela dans un module CSS dédié.
3. **Décider la liste canonique** : le tableau du Répertoire (validé) et celui
   des Utilisateurs (partagé) ont des fonds, rayons et paddings légèrement
   différents (`surface-content` vs `surface`, rayons 10 vs 12 px, densité
   propre). Choisir une seule référence de liste, l'exprimer en tokens, puis
   l'appliquer aux deux. Ne pas garder deux « tableaux » parallèles.
4. **Supprimer les hex en dur du module** au profit des tokens globaux
   (table ci-dessus). Promouvoir au besoin trois ou quatre tokens sémantiques
   manquants (dégradé de hero, bordure de liste, teinte « externe »), au lieu
   de laisser des couleurs dispersées.
5. **Alignement de la primitive** : « Ajouter une fiche » et la pagination
   devraient consommer `Button` (variantes `default`/`ghost`/`outline`) au lieu
   de liens/boutons restylés à la main ; le focus doit repasser sur `--ring`.

### Priorité moyenne

6. **Typographie** : basculer 11/12/13/14 px vers `--text-*` (ou les utilitaires
   Tailwind correspondants) et normaliser les cas 10 px et 23 px (10 → échelle
   dédiée, 23 → `text-2xl` de l'échelle 22 px, ou ajouter une étape).
7. **Total de résultats** : la légende « N membres affichés » compte la page,
   pas le total. Soit ajouter un total au contrat de liste (`pagination.total`),
   soit reformuler (« 25 fiches sur cette page ») et laisser « Page N » parler
   seule. Un total est utile en gestion réelle.
8. **Statut de structure binaire** : `IN_STRUCTURE`/`OUTSIDE_STRUCTURE` et un
   badge à deux tons ne tiendront pas l'évolution association → société
   (salarié, bénévole, prestataire, joueur, staff, ancien…). À cadrer dans le
   modèle (relations datées et historique) plutôt que d'empiler des statuts.
9. **Libellés** : remplacer « email(s) », « téléphone(s) », « profil(s)
   social(aux) » par des pluriels propres ; icône du compteur social (`Share2`
   réutilisé deux fois) à distinguer du total des coordonnées.
10. **Titre d'onglet** : la page n'a pas de métadonnées propres (onglet générique
    « Noctambule · Dev »). Ajouter un `generateMetadata` (« Répertoire ·
    Noctambule »), comme le prévoit le suivi de navigation.

### Priorité basse / à surveiller

11. **Mobile** : la ligne masque les en-têtes du tableau sans reporter
    d'association de colonnes ; le contenu s'auto-décrit en partie, mais un
    `data-label` ou un libellé visible renforcerait la lecture. Cible tactile
    « Ajouter une fiche » à 36 px (< 44 px).
12. **Deux liens par ligne** (nom et dernière modification) vers la même fiche :
    acceptable, mais à annoncer clairement ou à fusionner pour les lecteurs
    d'écran.
13. **Message d'erreur brut** affiché à l'utilisateur : préférer un libellé
    stable + détail technique séparé.
14. **Performance** : la recherche utilise des `LIKE` préfixe/`%terme%` sans
    index dédié. Correct au volume actuel ; à mesurer avant une grosse base.
15. **Navigation directe profonde** : un lien direct vers une page > 1 sans les
    curseurs précédents empêche de remonter (comportement correct d'une
    pagination par curseur), à documenter si des partages d'URL deviennent
    fréquents.

## Refactorisation appliquée (2026-10-09)

Appliqué à la demande de l'utilisateur, sans changer la logique métier :

- Les deux modules CSS quasi identiques `PersonsDirectory.module.css` et
  `UsersDirectory.module.css` sont fusionnés en un seul module partagé
  `components/ui/directory.module.css`, consommé par la liste des membres et la
  liste des utilisateurs. Le « bandeau liste » est désormais une seule source.
- `PersonsPageClient` utilise `PageIdentityHero` (le hero local et son hack
  `margin-left: 53px` sont supprimés).
- `PersonsList` utilise les primitives partagées `DataTableSection`,
  `Table*`, `ContentState`, `Button`, `Input`, `Select` — comme la liste des
  utilisateurs. Les cellules spécifiques (identité, coordonnées, dernière
  modification) passent en utilitaires Tailwind adossés aux tokens.
- Tokens ajoutés dans `globals.css` : `--surface-hero-start/end`,
  `--border-hero`, `--text-hero-muted`, `--border-list`,
  `--surface-external`, `--border-external`, `--text-external`. Le focus local
  du module est retiré au profit de `--ring`. `PageIdentityHero.module.css`
  consomme désormais les tokens globaux.
- Contrat de source `person-search-ux.test.ts` actualisé (import et classes du
  module partagé).

**Vérifications** : `tsc --noEmit` réussi, ESLint des fichiers modifiés réussi,
`next build` réussi. Suite de tests : 968 réussis, 2 en échec — les deux se
situent dans `person-pages-permissions.test.ts` sur la page
`/membres/repertoire/nouveau`, fichiers non modifiés par cette passe (échec
préexistant lié au rendu `Suspense`/`useSearchParams` en markup statique).
Contrôle navigateur (Chromium headless, session jetable) : titre, bouton
« Ajouter une fiche », 2 lignes, recherche, filtres et légende présents ; aucun
débordement horizontal à 1440 px ni à 390 px. Styles calculés conformes :
hero en dégradé `#2b3c57 → #1d2a3f`, bordure `#4b6285`, rayon 10 px ; carte de
liste `#172333` en rayon 10 px ; en-têtes de tableau à 11 px. Captures
desktop/mobile conservées pour relecture à l'œil.

## Sélection des sujets (Q01–Q30) — synthèse pour cette analyse

Niveau : analyse (aucune mutation). À examiner : Q01, Q02, Q03, Q04, Q05, Q09,
Q12, Q17, Q19, Q22, Q25, Q27. Hors impact : Q06–Q08, Q10, Q11, Q13–Q16, Q20,
Q21, Q23, Q24, Q26, Q28–Q30 (aucun changement appliqué, les garde-fous serveur
existants sont lus sans être rejoués). Les points données/performance ci-dessus
restent des observations de code, pas des mesures.

## Points ouverts

| Point | Impact | Prochaine étape |
| --- | --- | --- |
| Confirmation à l'œil de la refactorisation | Cohérence de tout le produit | Relire les captures desktop/mobile (contrôle DOM/styles déjà passé) |
| Évolution du statut de structure | Modèle et parcours long terme | Cadrage avec STRUCTURE.md avant tout nouveau statut |
| Index de recherche | Coût à volume | Benchmark quand la base grossit |

## Historique utile

| Date | Événement |
| --- | --- |
| 2026-10-09 | Analyse complète A à Z de `/membres/repertoire`, création de ce suivi. |
| 2026-10-09 | Refactorisation : module CSS partagé unique, hero partagé, primitives de liste réutilisées, tokens globaux. |
| 2026-10-09 | Améliorations UX : total de résultats, pagination « sur N », suppression du lien dupliqué, recherche sans bouton redondant, cible mobile 44 px, libellé de correspondance explicite. |
