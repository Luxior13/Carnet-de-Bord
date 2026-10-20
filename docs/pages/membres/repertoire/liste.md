# Liste du répertoire

[Index des pages](../../../pages/README.md) · [Répertoire](README.md) · [Design](../../../design/README.md) · [Guide général](../../../REFERENCE_GENERALE.md)

## Identité

| Élément | Valeur |
| --- | --- |
| Route | `/membres/repertoire` |
| Espace | Membres |
| Gabarit visé | [A. Liste de gestion](../../../design/gabarits.md#a-liste-de-gestion) |
| État d’harmonisation | **Page de référence visuelle et UX** de l’application (décisions du 9 et 10 octobre 2026) — voir [Harmonisation](../../../design/harmonisation.md#état-par-page) |
| Point d’entrée | [page.tsx](../../../../apps/web/src/app/membres/repertoire/page.tsx) → [PersonsPageClient](../../../../apps/web/src/features/persons/components/PersonsPageClient.tsx) |
| Contrôle d’accès | `persons:view` (page, `assertPersonFeatureReady`, `GET /api/personnes`) ; création `persons:create` |
| Chargement / erreur dédiés | oui, `PersonsDirectorySkeleton` / commune à l’application |

## Rôle et tâches principales

Retrouver une fiche personne, dans ou hors de la structure, comprendre son
rattachement et ses coordonnées disponibles, ouvrir sa fiche ou en créer une.
Critère de réussite : la bonne fiche est trouvée rapidement, avec un compteur et
un retour de fiche qui conservent le contexte.

## Composition actuelle

- Bandeau `PageIdentityHero` (dégradé, icône, titre, description, action de création).
- Synthèse `PersonOverview` : rail à partir de 118 rem, compacte au-dessus sinon ;
  ses compteurs ouvrent leur sous-ensemble global.
- `DataTableSection` et `directory.module.css` : recherche `ListSearchField`,
  filtres statut et sans coordonnées (variante compacte), tri, filtres actifs
  retirables, tableau puis cartes sous 740 px, `ListPagination` par curseur de 25 lignes.
- États : squelette, vide, erreur avec « Première page » et « Réessayer », accès refusé.

## Décisions retenues

- Page de référence visuelle et UX ; ses compositions (bandeau, liste, tableau,
  badges, infobulles, contrôles) sont décrites dans [Rôle de référence](#rôle-de-référence-décision-du-2026-10-09)
  et reprises par le [système de design](../../../design/README.md#pages-de-référence).
- Recherche des mots d’identité dans n’importe quel ordre, accents et casse
  normalisés ; liste sans coordonnées complètes, seulement leurs compteurs.
- Retour de fiche : page, historique de curseurs, position et lien d’origine
  conservés en stockage de session (30 minutes, 64 curseurs au plus).

## Points ouverts

Aucun point ouvert propre à la liste : REP-01 et REP-03 à REP-20 sont clos
(voir le [registre du module](README.md#points-ouverts)).

## Références

- [Page Répertoire](../../../domaines/permissions.md#page-répertoire), fiche [Listes et recherche](../../../references/listes-recherche.md)
- Audits : [10 octobre 2026](../../../audits/2026-10-10-repertoire.md), [11 octobre 2026](../../../audits/2026-10-11-repertoire.md)

## Historique

- 9 octobre 2026 : inventaire, refactorisation et désignation comme référence.
- 10 et 11 octobre 2026 : audits, corrections, améliorations autorisées.
- 19 octobre 2026 : fiche propre à la liste, créée par découpage du suivi du module.

## Revues datées

Sections déplacées le 19 octobre 2026 depuis l’ancien suivi du module, sans
modification de leur contenu. Elles conservent leur date, leur portée et leurs
preuves ; la synthèse ci-dessus porte l’état courant.

### Rôle de référence (décision du 2026-10-09)

#### Complément courant — composants du 11 octobre 2026

- Recherche via `ListSearchField` : effacement avec retour du focus au champ.
  Les filtres utilisent les primitives partagées ; leur logique reste locale.
- `ListPagination` affiche la page des dernières lignes reçues, avec le total de
  pages disponible côté serveur. Attente ou erreur ne font pas avancer ce numéro.
  Le focus revient au début des résultats après une pagination réussie.
- Création et identité utilisent `SectionActionBar` avec soumission native.
  L'identité distingue brouillon et version serveur : relecture d'un conflit sans
  perdre les champs modifiés, erreur persistante, annulation vers la dernière
  version connue. Les gardes de réponses tardives avaient été vérifiées dans
  les scénarios isolés de cette passe ; la revue de fiche du 12 octobre
  réexamine leur composition avec le préchargement et le changement de compte
  dans REP-D01, après reproduction d'une ancienne réponse encore appliquée.
- Preuves et limites : [audit transverse](../../../audits/2026-10-11-composants.md).
  API simulées ; ces corrections n'ont pas rejoué la session/base des anciens audits.

La description technique de la passe du 10 octobre ci-dessous est historique :
son champ de recherche local et sa mention « Page N sans total » ne définissent
plus le contrat courant. Le [catalogue](../../../design/composants.md) porte
les composants à réutiliser.

#### Référence visuelle

Décision utilisateur : `/membres/repertoire` est la **page de référence
visuelle et UX** de l'application, complétée par `/systeme/utilisateurs`
(2026-10-10) : les deux pages de liste définissent ensemble le standard des
composants partagés. Toute nouvelle page ou variante réutilise ces styles,
tokens, rythmes et primitives (tooltip, badge, tableau, contrôles, états
vides). Le [système de design](../../../design/README.md) porte les règles
transverses et les sources à réutiliser ; les fiches, formulaires et tableaux
de bord adaptent leur composition à leur tâche. Les règles métier et filtres
du répertoire restent propres à ce module. Une disposition locale justifiée
compose les tokens et primitives communs.

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
  7 px, texte `text-xs` (11 px dans l'échelle actuelle), ombre portée forte).
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

#### Revue documentaire du 10 octobre 2026

Rôle de référence relié depuis AGENTS, l'index, la revue générale, les fiches
Q03/Q05 et le modèle de suivi.
Palette, typographie, rayons et distinction des rails ont été confrontés aux
composants actuels ; les consignes anciennes du design system ont été corrigées.
Portée légère : Q01, Q03, Q05, Q27 et Q30 examinés pour cette mise à jour documentaire ;
les autres sujets Q02, Q04, Q06–Q26 et Q28–Q29 sont hors impact sur le produit, dont
le code, les données et les permissions restent inchangés. Aucun nouveau test
fonctionnel ou visuel n'est revendiqué par cette revue des documents.
Contrôles réussis : relecture ciblée des règles et de leurs sources,
`bun run docs:check` (174 fichiers, 854 liens locaux et index) et
`git diff --check`. Les anciens rapports conservent leur portée historique.

### Fiabilité de la liste — 11 octobre 2026

- Le préchargement serveur appartient au compte et aux critères courants ; un
  snapshot n’est pas réinjecté quand on revient à une ancienne recherche.
  Un changement de compte ou de révision des droits reconstruit le contenu.
- Les réponses 401/403 retirent les lignes et la synthèse. Une panne ordinaire
  peut conserver les résultats précédents, signalés comme tels, avec reprise.
- Le numéro de page et ses actions correspondent aux dernières lignes reçues.
  Les réponses obsolètes et les anciennes URL ne remplacent pas une saisie plus
  récente ; une pagination invalide propose Première page sans perdre les filtres.
- URL nettoyée et critères bornés ; mémoire de 64 curseurs maximum, restauration
  valable 30 minutes pour le même compte et consommée après exécution. Le stockage
  reste facultatif. Changer les filtres annule un ancien focus de pagination.
- Réinitialiser, retirer Sans coordonnées et effacer rendent le focus à la
  recherche. Réessayer vise les résultats en cas de succès, son bouton en cas
  de nouvel échec. La barre de recherche reste utilisable après erreur initiale.
- Le curseur est lié au texte recherché trimé : les normalisations d’identité
  ne décrivent pas toutes les recherches de coordonnées. Après modification de
  ce contrat, certains anciens curseurs nécessitent Première page.
- Les liens de synthèse annoncent le nombre ; les types de coordonnées et leur
  absence sont explicités pour les technologies d’assistance. Le style, les
  avatars, badges, skeletons et primitives restent ceux de la référence.
- Mesures locales bonnes jusqu’à 10 000 fiches : aucun cache/index supplémentaire
  ajouté. La synthèse est globale et lue séparément ; elle ne promet pas un
  instantané transactionnel commun avec la liste lors d’une écriture simultanée.

[Audit, scénarios et limites](../../../audits/2026-10-11-repertoire.md).

### Améliorations autorisées le 2026-10-10

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

### Synthèse courante — audit du 2026-10-10

Le [rapport daté](../../../audits/2026-10-10-repertoire.md) conserve l'audit
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

### Inventaire A à Z (état constaté le 2026-10-09)

**Historique avant refactorisation.** Les dimensions, classes, limitations et
propositions de cet inventaire ne décrivent pas toutes l'état actuel. Utiliser
la synthèse ci-dessus et les points ouverts pour préparer une correction.

Statut de chaque constat : « Examiné dans le code » (aucun banc visuel ni
parcours réel rejoué pour cette trace). Un point marqué « à vérifier » attend
un contrôle navigateur, lecteur d'écran ou base réelle.

#### Chaîne de rendu

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

#### Bandeau d'identité (hero)

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

#### Vue d'ensemble

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

#### Barre d'outils (recherche, filtres, tri)

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

#### Tableau

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

#### Pagination

- « Page N » + boutons précédent/suivant seulement. Pas de total ni de « sur M ».
  Précédent/suivant désactivés selon `hasMore`/`nextCursor` et l'état de
  chargement.
- URL : `?q`, `?structureStatus`, `?sort`, `?page` (1-based) et `?cursor`.
  Le changement de filtre utilise `router.replace`, la pagination `router.push`
  (retour navigateur possible entre pages, pas entre états de filtre).

#### États

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

#### Responsive

- `container-type: inline-size` sur la liste, requêtes à 740 px et 450 px :
  recherche pleine largeur, tableau transformé en grille (identité pleine
  largeur, statut + coordonnées sur une ligne avec retrait de 46 px, dernière
  modification pleine largeur), en-têtes de tableau masquées visuellement.
- Sélecteurs pleine largeur sous 450 px, padding resserré.
- `prefers-reduced-motion` : transitions du champ et du bouton icône
  neutralisées ; le reste est couvert par la règle globale.

#### Textes exacts

Voir la liste ci-dessus. Points de formulation à surveiller : « email(s) »,
« téléphone(s) », « profil(s) social(aux) » sont des pluriels lourds ;
« coordonnée(s) » idem.

#### Typographie exacte (valeurs en dur)

11 px (description, bouton hero, en-têtes, légende, dernière modification,
pagination), 12 px (champ, options), 13 px (nom), 10 px (sous-ligne, compteurs,
chips), 14 px (titre d'état vide), 23 px (titre hero). La balance des 11/13/14 px
correspond à l'échelle `--text-xs/sm/base` de `globals.css`, mais les valeurs
sont répétées en dur et 10/23 px sortent de l'échelle.

#### Couleurs et tokens

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

#### Dimensions et placement

Répertoriées dans l'inventaire ci-dessus. Les rayons 5–10 px locaux coexistent
avec l'échelle `--radius` globale ; le module ne consomme pas `--radius`.

### Ce qui est bon (à conserver)

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

### Améliorations proposées

Propositions historiques du 2026-10-09, en partie appliquées ensuite. Cette
section n'est pas la liste actuelle des travaux à faire. En particulier, la
mention d'index absents au point 14 est contredite par le schéma actuel ; la
navigation profonde du point 15 demande une voie de reprise (REP-09).

#### Priorité haute : réutiliser les composants et les tokens déjà en place

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

#### Priorité moyenne

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

#### Priorité basse / à surveiller

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

### Refactorisation appliquée (2026-10-09)

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
