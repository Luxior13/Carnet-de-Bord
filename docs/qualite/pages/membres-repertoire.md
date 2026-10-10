# Suivi — Répertoire des membres (`/membres/repertoire`)

## Identité et état

- Route(s) : `/membres/repertoire` (liste), `/membres/repertoire/nouveau`
  (création), `/membres/repertoire/[id]` (fiche). Alias historiques :
  `/personnes` et `/vie-interne/repertoire`.
- Module propriétaire : `apps/web/src/features/persons`. Rendu de la liste :
  `app/membres/repertoire/page.tsx` (serveur) →
  `features/persons/components/PersonsPageClient.tsx` →
  `PersonsList.tsx`, styles partagés `components/ui/directory.module.css`.
- Statut : composants et alignement visuel livrés, référence de liste avec
  `/systeme/utilisateurs` ; six défauts d'audit corrigés, ainsi qu'un défaut de
  fuseau découvert sur PostgreSQL. Parcours authentifié complet encore à vérifier.
- Dernière revue : 2026-10-10 — corrections puis quatre améliorations UX
  autorisées ; 112 tests du périmètre réussis dans la suite globale, PostgreSQL
  17 isolé, navigateur isolé, types/lint et build réussis.
  Voir le [rapport et ses preuves](../../audits/AUDIT_REPERTOIRE_2026-10-10.md).
- Références : intentions historiques `features/pages/vie-interne/membres*.md`,
  `features/pages/bureau-juridique/personnes-contacts.md` ; règles courantes
  `docs/references/NAVIGATION.md`, `docs/references/STRUCTURE.md`, `docs/references/ROLES_ET_PERMISSIONS.md`,
  `docs/references/PERMISSIONS.md` ; tokens `apps/web/src/app/globals.css`.

## Rôle de référence (décision du 2026-10-09)

Décision utilisateur : `/membres/repertoire` est la **page de référence
visuelle et UX** de l'application, complétée par `/systeme/utilisateurs`
(2026-10-10) : les deux pages de liste définissent ensemble le standard des
composants partagés. Toute nouvelle page ou variante réutilise ces styles,
tokens, rythmes et primitives (tooltip, badge, tableau, contrôles, états
vides) au lieu d'inventer un style local ou de repartir du style générique.

Référence à réutiliser :

- Bandeau de page : `PageIdentityHero` (dégradé `--surface-hero-start/end`,
  bordure `--border-hero`, titre 23 px, description 11 px, action à droite).
- Liste : `DataTableSection` + module partagé `directory.module.css`
  (`--border-list`, `--surface-content`, rayon 10 px, en-tête
  `--surface-content-header`).
- Tableau : primitives `Table*` + surcouche du module (en-têtes 11 px, lignes
  zébrées `--surface-row-alternate`, survol `--surface-row-hover`).
- Badges : pastille + teinte sémantique (voir `PersonStatusBadge`) ; sinon la
  primitive `Badge`.
- Infobulle : primitive `TooltipContent` partagée, style flottant aligné sur
  les deux pages (fond `--surface-floating`, bordure `--border-control`, rayon
  7 px, texte 12 px, ombre portée forte).
- Contrôles : `Input`, `Select`, `Button` ; champs 38 px, sélecteurs 220 px sur
  grand écran dans l'état actuel, rayons 6 px. Flèches de pagination hautes de
  30 px sur grand écran, cibles de 44 px sous 640 px via le module partagé.
- Retours : `ContentState` / `Empty` pour vide et erreur.
- Squelette : `PersonsDirectorySkeleton` (bandeau dégradé + os visibles
  `--surface-table-head`).
- Typographie : échelle dense 11/13/14 px (`--text-*`) ; sections espacées de
  18 px, paddings 16/20 px, rayons 10 px.
- Tokens : toutes les couleurs passent par `globals.css` ; aucun hex en dur
  dans les composants.

## Fonction et décisions courantes

- Tâche principale : retrouver une fiche personne, qu'elle soit **dans** ou
  **hors** de la structure (`IN_STRUCTURE` / `OUTSIDE_STRUCTURE`), comprendre
  son rattachement, accéder à sa fiche, en créer une.
- Périmètre long terme : la liste reste l'entrée ; la fiche détail devient le
  point central de toutes les informations liées à la personne, de près ou de
  loin (identité, coordonnées, rattachement, puis sanctions, bans, éligibilité
  aux tournois, rôles, adhésions…). Ces futures capacités sont des **relations
  datées** rattachées à la personne, pas des champs empilés sur `Person` — voir
  `SUJETS_FUTURS.md`.
- Type de page : liste de gestion (retrouver, comparer, agir). Volume attendu :
  petit aujourd'hui, potentiellement plusieurs centaines/milliers en société.
- Recherche par pseudo, prénom, nom, email, téléphone, identifiant ou URL de
  réseau social ; mots d'identité dans n'importe quel ordre, accents/casse
  normalisés ; filtres de statut et absence de coordonnées ; tri nom / création / modification ;
  pagination par curseur de 25 lignes.
- Accès : lecture `PERSONS.VIEW`, création `PERSONS.CREATE`. Contrôle serveur
  via `/api/personnes`. Le composant client refait ses propres garde-fous
  d'affichage (`canView`, `canCreate`) sans remplacer le contrôle serveur.
- La liste ne charge pas les coordonnées complètes, seulement leurs compteurs ;
  les données sensibles restent sur la fiche.

## Améliorations autorisées le 2026-10-10

Après les corrections, « ok go » valide quatre améliorations : synthèse compacte
jusqu'au seuil du rail (118rem), recherche des mots d'identité dans les deux
ordres, compteurs qui ouvrent leur sous-ensemble global et retour de fiche avec
page, historique de curseurs et défilement conservés.

Les compteurs repartent en première page et remplacent recherche/filtres pour
que leur total corresponde aux résultats ; le tri est conservé. Le filtre
`contacts=missing` signifie aucun email, téléphone ni profil social. Il reste
visible et retirable dans la liste, et se combine ensuite avec recherche/statut.
La mémoire de navigation (`sessionStorage`) est limitée à un retour dans
l'onglet, liée au compte, ignorée après 30 minutes et bornée à 64 curseurs proches
de la page courante. Elle contient l'URL, les curseurs, la position et le lien
d'origine, sans copie des fiches ; ces URL/curseurs peuvent contenir des termes
d'identité ou de recherche et ne sont pas envoyés à un tiers. Le focus revient
au lien d'origine s'il est encore visible. Stockage bloqué, invalide ou expiré :
la navigation par URL et « Première page » restent utilisables. Un lien partagé
sans historique n'invente pas de curseur précédent.

## Synthèse courante — audit du 2026-10-10

Le [rapport daté](../../audits/AUDIT_REPERTOIRE_2026-10-10.md) conserve l'audit
initial puis la passe de correction autorisée par « corrige tous ». Les défauts
REP-04, REP-06 à REP-10 et le nouveau REP-11 sont corrigés et revérifiés sur leurs
scénarios. REP-05 est résolu pour ce module. Le navigateur utilise des données
fictives et les requêtes tournent sur un PostgreSQL temporaire distinct de la
base du site ; cela ne valide pas une session authentifiée complète ni la charge.

État actuel à distinguer de l'inventaire historique :

- `PageIdentityHero`, primitives de liste et styles partagés sont en place.
  Le tableau cède la place aux cartes sous 48rem de largeur de conteneur.
- La vue d'ensemble affiche des statistiques globales, indépendantes des
  critères de la liste. Elle se place avant la recherche quand le rail ne tient
  pas ; sa version compacte s'étend désormais jusqu'à 118rem. Mesures du banc
  isolé : environ 127 px à 1440 px et 146 px à 390 px, avec des liens d'au moins
  44 px. Les quatre compteurs sont des liens accessibles au clavier.
- La légende parle de « fiches trouvées », la colonne d'identité de « Personne ».
  Le total filtré est compté avant curseur dans la même requête, y compris quand
  la page devient vide. Les comparaisons temporelles sont explicitement en UTC.
- Le retour depuis une fiche et le rechargement récupèrent l'historique connu
  et la position lorsque le compte, l'URL et le curseur correspondent. « Première page »
  reste accessible pour un lien partagé ou un curseur invalide et conserve
  recherche, statut, coordonnées et tri. Les flèches sont inactives après une erreur de
  rafraîchissement ; les anciennes données restent signalées comme non actualisées.
- Le numéro d'URL accepte strictement les entiers de 1 à 1 000 000 ; au-delà,
  reprise en première page. L'historique est une Map des pages visitées, sans
  allocation proportionnelle à ce numéro. Les entrées incohérentes sont retirées
  de l'URL. Ce plafond de navigation n'est pas une limite du nombre de personnes.
- Les index de recherche existent dans le schéma et les migrations. REP-03
  porte sur leur mesure à volume et leur état déployé, pas sur l'ajout aveugle
  d'index supposés absents.
- Les captures corrigées ont été relues : pas de débordement global aux six
  largeurs testées, identité longue tronquée dans sa cellule, nom complet dans
  le lien et son titre, auteur accessible au survol/clavier et visible en mobile.
- `PersonListCells` porte les cellules spécifiques ; `PersonsListSkeleton` porte
  le chargement, réutilisé par le squelette de page. `PersonsListToolbar` porte
  les contrôles ; `usePersonsListNavigation` et `person-list-navigation` portent
  la reprise. `PersonsList` reste sous son budget de 800 lignes. Le titre
  d'onglet identifie le répertoire.

Questions à reprendre lors d'une modification de cette liste : le total reste-t-il
celui du jeu filtré sur toutes les pages ? Un lien partagé, actualisé ou retourné
depuis une fiche permet-il de repartir ? Toute entrée d'URL a-t-elle un coût
borné ? Les noms autorisés restent-ils lisibles sans cacher les autres cellules ?
Le lien de ligne préserve-t-il les interactions internes au clavier et au
pointeur ? Les chiffres globaux sont-ils distinguables des résultats filtrés ?
Le clic sur un compteur remplace-t-il bien les critères pour ouvrir tout son
sous-ensemble ? Le filtre de coordonnées reste-t-il visible, combinable et
retirable ? Les mots d'identité inversés et les caractères `%`, `_`, `\` sont-ils
bien traités ? Un retour de fiche restaure-t-il page, précédent, défilement et
focus sans réutiliser l'état d'un autre compte ou d'un autre instantané ?

## Inventaire A à Z (état constaté le 2026-10-09)

**Historique avant refactorisation.** Les dimensions, classes, limitations et
propositions de cet inventaire ne décrivent pas toutes l'état actuel. Utiliser
la synthèse ci-dessus et les points ouverts pour préparer une correction.

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

### Vue d'ensemble

- Composant partagé `features/persons/components/PersonOverview.tsx`, construit
  sur `directory.module.css` (`overviewCard`, `overviewHeader`), comme
  `UsersOverview` de la page des utilisateurs. Rendu dans le rail droit de
  `PageAsideLayout` (largeur 16 rem, soit 256 px) ; sous ~118 rem, il se place
  entre le hero et la liste.
- Carte `aside` : en-tête « Vue d'ensemble », total « Total des fiches » en
  24 px, puis deux groupes à petites capitales — « Statut » et « Statistiques ».
- Lignes du groupe Statut : « Dans la structure » (pastille `success`, badge
  vert de la liste) et « Hors structure » (pastille `warning`, badge ambre).
- Ligne « Sans coordonnées » (pastille `info`) : fiches sans email, téléphone
  ni profil social.
- Les chiffres sont **globaux**, indépendants de la recherche, du filtre et du
  tri ; le total près des filtres reste **filtré**. Contrat : `overview` dans
  `PersonsListResponse`, calculé par `listPersons` (trois comptages Prisma).
- États : squelette pendant le premier chargement, valeurs conservées pendant
  une actualisation (comportement identique aux utilisateurs).

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
- Bouton « Réinitialiser les filtres » (icône seule, 38 × 38 px) visible dès
  qu'une recherche, un statut ou un tri non défaut est actif — même condition
  que la liste des utilisateurs. Il réinitialise aussi le tri. Recherche à
  gauche, filtres et bouton Réinitialiser regroupés à droite (l'espace vide
  reste entre la barre de recherche et les filtres).
- Légende : « N membre(s) trouvé(s) · Actualisation… » + « 25 par page », avec
  séparateur de milliers, alignée sur la liste des utilisateurs. Le « N » est
  le total filtré côté serveur.

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
« coordonnée(s) » idem.

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

Appréciation historique du 2026-10-09 ; l'audit du 2026-10-10 précise les limites
de pagination et d'accessibilité découvertes depuis.

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

Propositions historiques du 2026-10-09, en partie appliquées ensuite. Cette
section n'est pas la liste actuelle des travaux à faire. En particulier, la
mention d'index absents au point 14 est contredite par le schéma actuel ; la
navigation profonde du point 15 demande une voie de reprise (REP-09).

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

Sélection révisée pour l'audit du 2026-10-10 : Q01–Q05, Q07, Q09–Q12, Q14–Q15,
Q17, Q19, Q22, Q25, Q27 et Q30 examinés. Hors impact : Q06 (mutations hors
périmètre), Q13 et Q16 (aucune migration ni retrait), Q18 (pas d'optimisation
engagée), Q24 (aucun changement juridique), Q28–Q29 (exploitation et restauration
inchangées). Non applicables : Q08, Q20, Q21, Q23, Q26, capacités absentes de cette
liste. La lecture de données personnelles exige bien d'examiner sécurité et
confidentialité, même sans mutation. Couverture et limites dans le rapport.

## Points ouverts

État courant après correction du 10 octobre. REP-01 et REP-03 restent ouverts,
REP-02 est différé au cadrage métier ; responsables à attribuer. Les lignes closes
restent identifiables pour rouvrir leur scénario en cas de changement. Le rapport
conserve les preuves et limites, cette table porte les états courants.

| Point | Nature / priorité et impact | Prochaine étape / déclencheur |
| --- | --- | --- |
| REP-01 — Validation visuelle réelle | Vérification partielle ; captures fictives relues, composants testés dans un cadre simplifié | Lors de la prochaine passe authentifiée, vérifier le cadre complet, clavier, mobile, retour de fiche et corrections REP-07/REP-10 |
| REP-02 — Évolution du statut de structure | Cadrage différé ; modèle et parcours long terme | Lire STRUCTURE.md avant tout nouveau statut ; conserver personnes et relations datées séparées |
| REP-03 — Recherche à volume | Dette P2 ; index présents dans le code, coût et déploiement réel non vérifiés | Benchmark sur base accessible et volume représentatif avant optimisation ; mesurer aussi comptages et jointure d'audit |
| REP-04 — Total après curseur | Clos après vérification SQL ; total stable sur trois pages, filtres et page devenue vide | Rouvrir si comptage, recherche, ordre ou périmètre de lecture change |
| REP-05 — Maintenabilité et tests | Clos sur le module ; liste sous 800 lignes, contrôles et reprise séparés, 112 tests du périmètre réussis | Conserver les régressions et le budget ; les échecs globaux hors module sont décrits dans le rapport |
| REP-06 — Numéro de page excessif | Clos après tests unitaires et navigateur ; normalisation bornée, Map, URL nettoyée | Rejouer les URL invalides et profondes lors d'un changement de navigation |
| REP-07 — Identité longue | Clos après contrôle navigateur ; pseudo de 80 caractères contenu dans sa cellule | Rejouer au changement de largeur, typo ou lien de ligne |
| REP-08 — Curseur invalide | Clos après contrôle navigateur ; Première page conserve les critères, Réessayer reste disponible | Rejouer les deux issues lors d'un changement d'erreur API |
| REP-09 — Ouverture directe profonde | Clos pour la reprise ; Première page sur lien partagé, historique/position/focus restaurés après fiche et rechargement dans le banc isolé | Le précédent inconnu reste indisponible ; retour complet de fiche avec session réelle à rejouer dans REP-01 |
| REP-10 — Auteur de modification | Clos après contrôle navigateur ; survol, focus, Échap et auteur mobile vérifiés | Rouvrir si lien étendu, infobulle ou politique de visibilité évolue |
| REP-11 — Fuseau SQL et curseurs de date | Clos après reproduction puis correction sur PostgreSQL en Europe/Paris ; comparaisons explicites en UTC | Rejouer tris par date, égalités et exclusion d'une date future si schéma temporel ou requête change |

## Historique utile

| Date | Événement |
| --- | --- |
| 2026-10-09 | Analyse complète A à Z de `/membres/repertoire`, création de ce suivi. |
| 2026-10-09 | Refactorisation : module CSS partagé unique, hero partagé, primitives de liste réutilisées, tokens globaux. |
| 2026-10-09 | Améliorations UX : total de résultats, pagination « sur N », suppression du lien dupliqué, recherche sans bouton redondant, cible mobile 44 px, libellé de correspondance explicite. |
| 2026-10-10 | Ajout de la Vue d'ensemble du répertoire, alignée sur `/systeme/utilisateurs` (composant `PersonOverview`, stats globales dans `listPersons`, rail `PageAsideLayout`). |
| 2026-10-10 | Alignement des comportements de liste : bouton Réinitialiser affiché aussi pour le tri, légende « N membre(s) trouvé(s) » avec séparateur de milliers. |
| 2026-10-10 | Focus clavier des lignes aligné sur les utilisateurs : couleur de l'anneau via le token `--ring` (`focus-within:ring-ring`). |
| 2026-10-10 | Audit ciblé : six défauts ouverts, 70/72 tests ciblés réussis, contrôle navigateur isolé à six largeurs ; preuves et limites conservées dans le rapport. Inventaire ancien explicitement marqué historique. |
| 2026-10-10 | Correction des six défauts et du décalage de fuseau SQL découvert sur base isolée ; 96 tests ciblés réussis, build réussi, contrôle navigateur corrigé ; vue d'ensemble mobile compactée et légende clarifiée. |
| 2026-10-10 | Quatre améliorations autorisées : synthèse compacte jusqu'au rail, recherche multi-mots, compteurs filtrants et reprise après fiche. Suite globale : 1 009 réussites, un échec préexistant hors module ; 15 scénarios PostgreSQL et navigateur isolé réussis, preuves ajoutées au rapport. |
