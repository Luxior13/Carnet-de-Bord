# Audit du répertoire — 10 octobre 2026

Ce document conserve l'audit initial ci-dessous, puis la
[passe de correction](#passe-de-correction-du-10-octobre-2026) demandée ensuite.
Les états courants sont dans le suivi de page ; les échecs initiaux restent des
preuves historiques et ne décrivent pas tous le code corrigé.

## Verdict et périmètre

**Corrections nécessaires ; validation en conditions réelles incomplète.** Six
défauts sont localisés, dont deux prioritaires : le total après pagination et
l'initialisation du numéro de page. Les composants partagés et les contrôles
d'accès constituent une base réutilisable ; ils ne suffisent pas à valider les
parcours de pagination, de reprise et les identités longues.

- Demande : analyser maintenant `/membres/repertoire`, qui reste une référence
  visuelle et UX avec `/systeme/utilisateurs` selon la décision utilisateur.
- État : branche `main`, commit `1175ffd`, dépôt initialement propre. Aucun
  changement de code applicatif ni de données pendant cette passe.
- Propriétaire : [suivi du répertoire](../qualite/pages/membres-repertoire.md).
- Chaîne examinée : page serveur, `PersonsPageClient`, `PersonsList`,
  `PersonOverview`, styles et primitives partagés, `GET /api/personnes`, schémas,
  recherche, curseurs, service de liste et index déclarés en base.
- Création et fiche détail : permissions, liens et contrat de retour lus ; leurs
  formulaires et mutations ne font pas l'objet d'un nouvel audit complet ici.

## Environnement et nature des preuves

Le serveur local répond sur `localhost:3001`. Sans session, la page redirige en
307 vers `/login?next=%2Fmembres%2Frepertoire` et l'API répond 401. La connexion
directe de lecture à la base échoue avec `PrismaClientInitializationError`.
Les parcours authentifiés réels, les requêtes SQL sur PostgreSQL et les E2E
complets n'ont donc pas été exécutés. Aucune session artificielle ni donnée en
base n'a été créée.

Un banc temporaire Chromium a monté **les composants réels de la page**, avec les
CSS globaux servis par l'application locale et les modules CSS du dépôt. Seuls
l'authentification, la disponibilité du module, la navigation et l'API ont été
simulés ; le cadre de page était simplifié, sans le contenu de la barre latérale.
Il contenait 60 fiches fictives, 25 par page, avec un profil autorisé à lire et
créer. Ce banc démontre les comportements du client décrits ci-dessous, pas le
rendu serveur, les transitions Next complètes ou les droits d'une vraie session.

Preuves conservées, sans donnée personnelle réelle :

- [Mesures et scénarios du banc isolé](repertoire-2026-10-10/report.json).
- [Capture à 1920 px](repertoire-2026-10-10/page-1920.png), identité longue
  superposée aux colonnes voisines.
- [Capture à 390 px](repertoire-2026-10-10/page-390.png), vue d'ensemble avant la
  recherche et identité correctement renvoyée à la ligne.

Les captures montrent le haut du contenu défilant dans un viewport de 1000 px de
haut ; elles ne montrent pas toute la liste. Le banc temporaire a été supprimé
après conservation des résultats. Les scénarios ci-dessous permettent de
préparer les tests permanents utiles lors des corrections.

## Sélection des sujets et couverture

À examiner : Q01–Q05 (besoin, parcours, présentation, accessibilité, liste), Q07
(retours), Q09–Q12 (accès, entrées non fiables, personnes et données), Q14–Q15
(contrat API, auteur de modification), Q17 (volume), Q19 (architecture), Q22
(dates et instantané), Q25 (personnes), Q27 (preuves), Q30 (suivi documentaire).
La lecture seule n'exclut pas l'analyse des droits ou de la confidentialité.

Hors impact : Q06 (mutation de création hors périmètre), Q13 (aucune migration),
Q16 (aucun retrait), Q18 (pas d'optimisation à implémenter sans mesure), Q24
(aucune évolution juridique), Q28–Q29 (pas de changement d'exploitation ou de
restauration). Non applicables à cette liste : Q08 (notifications différées),
Q20 (gestion documentaire ; l'avatar est généré localement), Q21 (import/export),
Q23 (automatisation/intégration), Q26 (finance et contrats).

| Élément / scénario | Résultat réellement observé | Portée |
| --- | --- | --- |
| Accès anonyme | Redirection de la page vers la connexion ; API 401 | Serveur local réel, sans session |
| Droits de lecture/création | Gardes serveur et client présentes ; tests ciblés de liste/API réussis | Code et contextes de tests simulés ; pas de matrice de rôles en base |
| Recherche sans résultat | `q=zzzz-no-match`, « 0 membres trouvés », état vide ; effacement ramène les 60 fiches | Navigateur isolé ; ne valide pas la sémantique SQL de recherche |
| Statut et réinitialisation | « Hors structure » inscrit dans l'URL, 20 résultats fictifs ; réinitialisation à 60 | Navigateur isolé |
| Tri au clavier | Focus du sélecteur, Entrée, Fin, Entrée : URL `sort=created` | Sélection et URL vérifiées ; ordre SQL et retour du focus non validés |
| Pagination depuis la première page | Avec un total simulé constant, « Page 2 sur 3 » et curseur suivant dans l'URL | Navigateur isolé ; ne valide pas le total fourni par le service |
| Total du contrat actuel | Simulation de 60 → 35 → 10 résultats : « Page 2 sur 2 », puis « Page 3 » | Défaut SQL lu et conséquence client reproduite, REP-04 |
| Lien direct en page 3 | Précédent désactivé, aucune remise à la première page ; Suivant désactivé sur la dernière page | Navigateur isolé, REP-09 |
| Curseur invalide | Erreur seule ; Réessayer renvoie le même curseur, recherche absente | Navigateur isolé, REP-08 |
| Paramètre `page` excessif | `Invalid array length` pendant le montage | Navigateur isolé, REP-06 |
| Identité longue autorisée | Nom débordant sur le statut et les coordonnées en tableau | Navigateur isolé, REP-07 |
| Auteur de modification | Le pointeur rencontre le lien de ligne ; aucune infobulle ; déclencheur non focalisable | Navigateur isolé et code, REP-10 |
| Responsive | Pas de débordement horizontal global à 1920, 1440, 1024, 768, 390 et 320 px | Cadre simplifié ; cela n'exclut pas le chevauchement dans une cellule |
| Erreur après succès, requêtes obsolètes | Conservation des données, avertissement et annulation prévus dans le code | Non rejoués sous réseau lent ; aucune validation navigateur revendiquée |
| Retour de fiche, création, lecteur d'écran, fuseaux, charge | Pas de parcours complet ni de mesure | À vérifier dans une prochaine passe ciblée |

## Constats à corriger

Les identifiants restent ceux du suivi propriétaire. Tous les défauts ci-dessous
sont **ouverts**, responsables **à attribuer**, à reprendre lors de la correction
de la pagination ou des composants concernés. Aucun correctif applicatif n'est
livré par cet audit.

### REP-04 — P1 : total calculé après le curseur

Dans [le service de liste](../../apps/web/src/features/persons/server/person-core.service.ts),
`COUNT(*) OVER()` (ligne 318) est évalué sur les lignes retenues par le `WHERE`,
qui inclut `cursorClause` (ligne 353). `pagination.total` est donc le nombre de
résultats restants après le curseur. Le client l'utilise comme total général
et calcule `Math.ceil(total / 25)`.

Sur un jeu fixe de 60 fiches, le contrat produit 60, puis 35, puis 10, au lieu de
conserver 60. Cette conséquence a été reproduite dans le navigateur avec les
réponses simulées correspondantes : « Page 2 sur 2 » alors qu'une troisième
page reste accessible. Le calcul SQL n'a pas été exécuté sur la base.

**Correction attendue :** définir et fournir le total du jeu filtré avec la même
borne d'instantané, avant application du curseur. Vérifier trois pages et un
filtre sur une base isolée. Ne pas utiliser les statistiques globales de la vue
d'ensemble comme total filtré, ni compenser uniquement l'affichage du client.

### REP-06 — P1 : numéro de page non borné et erreur de rendu

Dans [PersonsList](../../apps/web/src/features/persons/components/PersonsList.tsx),
`normalizePageIndex` (ligne 129) accepte tout entier fini supérieur à 1, puis
l'initialisation de `cursorStack` (ligne 348) alloue et déplie un tableau dont la
longueur dépend de cet entier. Le paramètre `page` n'est pas validé par le schéma
de la requête serveur.

Ouvrir `?page=4294967297&cursor=invalid` dans le banc isolé provoque immédiatement
`Invalid array length`, avant le traitement normal de l'erreur de curseur. Le
curseur n'a même pas besoin d'être valide. Des tailles inférieures peuvent aussi
demander une allocation inutilement importante ; ce coût n'a pas été mesuré.

**Correction attendue :** valider strictement et borner le numéro, et surtout
éviter toute allocation proportionnelle à une valeur d'URL non fiable. Tester
les valeurs normales, invalides, énormes et le retour à la première page.
Le défaut confirmé est un échec de rendu client ; aucun déni de service serveur
n'est démontré par cette passe.

### REP-07 — P2 : une identité valide recouvre les autres colonnes

`PersonIdentity` place un `span.truncate` inline dans un lien dont la largeur
n'est pas contrainte dans la ligne flex (lignes 268–281). Le texte ne se tronque
pas comme prévu.

Reproduction : pseudo `'NomTrèsLongSansEspace'.repeat(4).slice(0, 80)`, prénom
`PrénomLong`, nom `NomDeFamilleComposéSansEspace`. Ces longueurs respectent le
[schéma d'identité](../../apps/web/src/features/persons/schemas/person.schemas.ts).
À 1440 px, le lien termine à x = 1238 px tandis que la cellule de statut commence
à x = 895 px. Le recouvrement est également visible sur la capture à 1920 px.
En carte mobile, le retour à la ligne fonctionne.

**Correction attendue :** contraindre la largeur du lien et de son contenu,
rendre la troncature effective tout en gardant le nom complet accessible.
Recontrôler nom long, résultat trouvé par coordonnée et focus de ligne, aux
largeurs où le tableau et les cartes se relaient.

### REP-08 — P2 : aucune reprise adaptée après un curseur invalide

Quand `error && !data` (ligne 571), la liste retourne seulement l'état d'erreur
et « Réessayer ». La barre de recherche et les filtres disparaissent. Le bouton
relance `load()` sans retirer le curseur : les deux requêtes du scénario portent
exactement `invalid`.

**Correction attendue :** proposer un retour explicite à la première page en
conservant les critères utiles, ou réinitialiser un curseur reconnu invalide.
Conserver la nouvelle tentative ordinaire pour une panne transitoire. Vérifier
la reprise après lien altéré, curseur incompatible avec les critères et erreur
réseau. La navigation générale de l'application reste une autre voie de sortie ;
c'est la reprise locale de la liste qui manque.

### REP-09 — P2 : retour précédent perdu lors d'une ouverture directe

Les curseurs précédents ne vivent que dans l'état React. `canGoPrevious`
(ligne 534) interdit le retour au-delà de la page 2 si le curseur précédent est
absent. Ouvrir directement la troisième page avec son curseur valide simulé
affiche « Page 3 sur 3 », mais les deux flèches sont désactivées ; sans filtre,
aucun bouton Réinitialiser n'est proposé.

Le lien de fiche transporte bien `returnTo`. Un retour qui remonte une nouvelle
instance de la liste risque donc la même perte d'historique : c'est une déduction
du code et de l'ouverture directe, pas un parcours fiche → liste réellement joué.

**Correction attendue :** garantir au minimum un retour à la première page.
Définir ensuite le comportement précédent attendu après rechargement/partage,
sans prétendre reconstituer un curseur inconnu à partir du seul numéro de page.
Tester lien partagé, actualisation, retour navigateur et retour de fiche.

### REP-10 — P2 : auteur de modification inaccessible par l'infobulle

Le lien d'identité est étendu sur toute la ligne avec `after:absolute
after:inset-0`. Il intercepte le pointeur au-dessus de la date : le test de la
deuxième ligne rencontre un élément `A` et n'affiche aucune infobulle. Le
`TooltipTrigger` de `PersonLastModified` (ligne 249) est un `span` sans arrêt de
tabulation ; l'auteur ne peut pas être demandé au clavier. La carte mobile ne
présente que la date, sans auteur.

**Correction attendue :** rendre cette information consultable au survol et au
clavier sans multiplier inutilement les liens de fiche. Prévoir son équivalent
tactile si l'auteur doit être disponible depuis la liste. Vérifier la coexistence
avec le lien étendu, la fermeture de l'infobulle et le nom accessible.

## Qualités à conserver et questions de conception

- Lecture protégée côté serveur par `PERSONS.VIEW`, création distincte avec
  `PERSONS.CREATE`, schémas de requête et réponses privées sans cache. Les tests
  ciblés de la liste et de l'API passent ; les rôles réels restent à exercer.
- SQL paramétré, valeurs de recherche normalisées, curseurs signés liés aux
  critères et à une borne temporelle, ordre départagé par l'identifiant. Cette
  borne ne constitue pas une copie historique de toutes les fiches : les effets
  de modifications concurrentes restent à vérifier.
- Projection courte : compteurs de coordonnées dans la liste, sans exposer les
  valeurs complètes. La provenance utilise les métadonnées de l'audit, pas son
  contenu détaillé. La visibilité de l'auteur se réexamine si les droits de
  lecture du répertoire changent.
- Composants partagés, distinction vide/erreur/chargement, libellés accessibles,
  annonce du nombre de résultats, critères dans l'URL, annulation des requêtes
  obsolètes. L'accessibilité globale n'est pas certifiée par ces seuls points.

Améliorations à cadrer, distinctes des six défauts :

1. **Place de la vue d'ensemble.** En dessous du seuil de rail, elle précède la
   liste et prend environ 267 px. À 390 px, la recherche commence vers y = 558 px
   dans ce banc. Faut-il une synthèse compacte ou repliable pour rendre la
   recherche plus immédiate ? Préserver la décision d'avoir une vue d'ensemble.
2. **Sens des chiffres et du vocabulaire.** La vue d'ensemble est globale même
   quand la liste est filtrée. Le libellé « fiches/personnes trouvées » serait-il
   plus juste que « membres trouvés » pour les personnes hors structure ?
   Ne pas confondre présence dans le répertoire et qualité de membre associatif.
3. **Confort tactile.** La pagination mesure 30 px de haut dans le banc, les
   champs 38 px, l'action principale mobile 44 px. Revoir les petites cibles
   selon les usages ; ces mesures seules ne démontrent pas une non-conformité
   à une norme d'accessibilité.
4. **Recherche et volume.** Les index trigrammes et préfixes sont déjà déclarés
   dans [le schéma](../../packages/database/prisma/schema.prisma) et la migration
   `20260721120000_person_identity_foundation`. L'ancienne mention « sans index
   dédié » du suivi est dépassée. Mesurer recherche, comptages et jointure de
   dernier auteur avant d'ajouter index ou cache. Leur présence effective dans
   la base n'a pas été vérifiée.
5. **Retrouver une identité complète.** La requête recherche dans les champs
   d'identité séparément. Préciser l'attendu pour une saisie « prénom nom » et
   vérifier ce cas sur la vraie recherche ; le filtre simplifié du banc ne
   permet pas de le conclure. Le titre d'onglet propre au répertoire reste aussi
   une amélioration de navigation à traiter avec le suivi correspondant.

## Contrôles techniques exécutés

Depuis `apps/web` :

```text
bun run test src/__tests__/person-search-ux.test.ts src/__tests__/person-pages-permissions.test.ts src/__tests__/persons-routes-permissions.test.ts src/__tests__/persons-schemas-normalization.test.ts src/__tests__/person-api-errors.test.ts
```

Résultat : **70 tests réussis, 2 échoués sur 72**, quatre fichiers réussis et un
en échec. Les deux échecs se situent dans `person-pages-permissions.test.ts`,
lignes 146 et 160, sur la page **de création**. Le rendu statique reste sur le
squelette Suspense au lieu d'atteindre l'état attendu, dans un montage qui ne
reproduit pas complètement la navigation. Ils ne prouvent pas un contournement
de permission, mais empêchent de valider ces deux scénarios. La première
tentative avait échoué avant les tests à cause des restrictions de lecture
d'esbuild ; les nombres ci-dessus viennent de l'exécution suivante autorisée.

`bun run check:architecture` échoue : `PersonsList.tsx` compte **894 lignes pour
un budget de 800** (REP-05). Le contrôle signale aussi `sidebar.tsx`, 925/900,
hors composant de répertoire. Découper les responsabilités utiles ; ne pas relever
les seuils pour masquer le résultat. Aucun build ou lint global n'a été rejoué
pour cette passe sans changement applicatif.

Documentation de cette passe : `bun run docs:check` réussi (174 fichiers,
821 liens locaux et index contrôlés), `git diff --check` réussi. Seuls les
documents et les pièces fictives de cet audit sont ajoutés ou modifiés.

Reprise : corriger REP-04 et REP-06, puis les quatre défauts P2 ; intégrer les
scénarios aux contrôles adaptés et rejouer une session réelle sur une base
isolée. Les états courants et décisions restent dans le
[suivi propriétaire](../qualite/pages/membres-repertoire.md).

## Passe de correction du 10 octobre 2026

Demande suivante : « corrige tous ». Les six défauts de la liste sont corrigés,
ainsi que REP-05 (découpage et tests de création) et un défaut supplémentaire
REP-11 découvert en exécutant la requête sur PostgreSQL. Pas de migration ni de
changement de permission ; aucune donnée du site modifiée.

| Point | Changement livré | Preuve de correction |
| --- | --- | --- |
| REP-04 | Total du jeu filtré avant curseur, même requête SQL ; jointure conservant le total si la page est vide | PostgreSQL 17 : 60 fiches, pages de 25/25/10, total toujours 60 ; filtres à 20 et 3 ; zéro résultat ; page devenue vide avec total 25 |
| REP-06 | Entier d'URL strictement borné, historique en Map, URL incohérente ramenée à la première page | Tests de valeurs limites ; navigateur sur `page=4294967297&cursor=invalid`, liste chargée sans erreur et paramètres retirés |
| REP-07 | Largeur du lien contrainte, troncature effective, texte complet dans le lien et son titre | Même pseudo de 80 caractères : bord droit à 883 px avant le statut à 895 px ; cartes mobiles sans débordement |
| REP-08 | Action Première page conservant recherche/statut/tri, à côté de Réessayer ; pagination désactivée sur résultats périmés | Erreur de curseur puis reprise réussie avec critères conservés ; panne après succès puis reprise par recherche |
| REP-09 | Retour explicite en première page après un lien profond | Ouverture directe en page 3 puis reprise, tri conservé ; navigation normale suivante/précédente réussie |
| REP-10 | Déclencheur d'infobulle focalisable et au-dessus du lien étendu ; auteur visible dans les cartes | Survol, clavier et fermeture par Échap réussis ; nom/login fictifs lisibles en mobile |
| REP-05 | Extraction de `PersonListCells` et `PersonsListSkeleton` ; contexte de navigation simulé dans les tests de création | Liste à 781/800 lignes ; anciens 72 tests ciblés tous réussis |
| REP-11 | Comparaison des paramètres Date en UTC avec les colonnes `timestamp` | Défaut reproduit en Europe/Paris avant correction ; tris par date, égalités et exclusion d'un enregistrement futur vérifiés après correction |

**REP-11 : cause et portée.** Prisma transmet ici les paramètres JavaScript Date
comme `timestamp with time zone`, tandis que les colonnes Person sont des
`timestamp` représentant l'UTC. En Europe/Paris, la comparaison implicite faisait
réapparaître des lignes après le curseur. Le total était déjà corrigé, mais la
troisième page retournait encore 25 lignes au lieu de 10 pour les tris de date.
`AT TIME ZONE 'UTC'` sur les paramètres de curseur et d'instantané rend la
comparaison indépendante du fuseau de connexion. La reproduction utilise une
connexion dédiée en Europe/Paris, même si le serveur de test a un autre défaut.

Améliorations associées : vue d'ensemble compacte sous 640 px (117 px de haut à
390 px, contre 267 avant), statistiques identifiées comme globales, légende
« fiches trouvées », colonne « Personne », titre d'onglet propre et flèches de
pagination de 44 px sur mobile. Cette dernière règle vit dans le module partagé
et bénéficie aussi à Utilisateurs ; ce consommateur n'a pas été rejoué dans une
session navigateur complète. La recherche multi-mots et le benchmark à gros
volume restent des sujets à cadrer, pas des corrections revendiquées ici.

### Vérifications après correction

- **96/96 tests ciblés réussis**, sept fichiers : les cinq fichiers de la commande
  initiale, `persons-list-pagination.test.ts` (15 scénarios) et
  `persons-list-postgres.test.ts` (9 scénarios).
- PostgreSQL 17 temporaire sur la boucle locale, base `repertoire_pagination_test`,
  schéma unique créé puis supprimé par la suite. Le schéma est minimal pour
  exercer la vraie requête de liste et les comptages ; il ne valide pas les
  migrations, les contraintes de mutation ou les permissions réelles.
- `bun run typecheck`, lint des fichiers modifiés et `bun run build` réussis.
  Build Next 15.5.23 de production, sans publication.
- Documentation : `bun run docs:check` réussi après mise à jour (174 fichiers,
  825 liens locaux et index), `git diff --check` réussi. Les fichiers temporaires
  et le PostgreSQL isolé ont été retirés après conservation des preuves fictives.
- Suite web globale exécutée avant l'ajout des trois derniers scénarios SQL :
  990 réussis, un échec dans `shadcn-boundaries.test.ts`. Les éléments natifs
  `label`/`input` signalés sont dans `/systeme/utilisateurs/nouveau`, fichier non
  modifié par cette passe. Les trois scénarios SQL ajoutés ensuite sont inclus
  dans les 96 tests ciblés réussis ; aucune réussite globale n'est revendiquée.
- Budget du répertoire respecté. Le contrôle global d'architecture reste en
  échec sur `components/ui/sidebar.tsx` (925/900), également inchangé.
- Chromium, composants réels avec API/authentification/navigation simulées :
  aucun débordement global à 1920, 1440, 1024, 768, 390 et 320 px ; scénarios
  d'erreur/reprise ci-dessus, réponse de recherche tardive ignorée, aucune erreur
  JavaScript capturée. La comparaison visuelle des captures a été effectuée.

Preuves corrigées : [résultats navigateur](repertoire-2026-10-10/corrected-report.json),
[capture grand écran](repertoire-2026-10-10/corrected-1920.png) et
[capture mobile](repertoire-2026-10-10/corrected-390.png). Le serveur de test, la
base temporaire et les fichiers du banc sont arrêtés/supprimés après validation.
Les tests permanents restent dans le dépôt.

Pour rejouer le SQL, préparer une base PostgreSQL **locale et jetable**, nommée
exactement `repertoire_pagination_test`, puis renseigner
`PERSONS_LIST_TEST_DATABASE_URL` et exécuter depuis `apps/web` :

```text
bun run test src/__tests__/persons-list-postgres.test.ts
```

La suite refuse une cible distante ou un autre nom de base, crée son propre
schéma isolé et le supprime à la fin. Elle ignore ce groupe si la variable est
absente et ne lit jamais `DATABASE_URL`. Lancer directement cette commande pour
obtenir une exécution réelle, sans réutiliser un résultat de cache Turbo.

Limites restantes : pas de parcours authentifié complet avec serveur Next et
base du site, pas de test manuel avec lecteur d'écran, pas de mesure à volume
représentatif. Le retour Précédent ne reconstruit pas un curseur inconnu après
rechargement ; Première page fournit désormais la reprise explicite. Ces limites
restent suivies dans REP-01 et REP-03.

## Passe d'amélioration autorisée — 10 octobre 2026

Cette passe suit le « ok go » donné aux quatre propositions. Les constats et
limites des passes précédentes restent historiques ; l'état courant est dans
le suivi de page.

| Amélioration | Résultat livré et vérification |
| --- | --- |
| Synthèse compacte | Présentation horizontale tant que le rail ne tient pas, sous 118rem ; environ 127 px à 1440 px, 146 px à 390 px ; quatre liens de 44 px minimum |
| Recherche multi-mots | Tous les mots doivent correspondre à l'identité de la même personne ; prénom/nom inversés, pseudo indépendant, accents/casse, préfixes et caractères LIKE littéraux vérifiés sur PostgreSQL |
| Compteurs filtrants | Total, statuts et Sans coordonnées ouvrent leur sous-ensemble global en première page ; recherche/autres filtres remplacés, tri conservé ; filtre visible et retirable, puis combinable avec recherche/statut |
| Retour de fiche | Historique de curseurs, page, défilement et focus du lien restaurés ; retour explicite, retour navigateur et rechargement vérifiés dans le banc isolé ; lien partagé inconnu repris par Première page |

Le nouveau filtre `contacts=missing` traverse URL, instantané serveur, API,
validation et signature des curseurs. Le SQL exige l'absence d'email, téléphone
**et** profil social avant le comptage et la pagination. Les statistiques restent
globales. Un curseur ne peut pas être réutilisé avec un autre filtre de coordonnées.
Aucune migration ou permission nouvelle. Les recherches de coordonnées restent
entières ; seule la branche identité découpe les mots.

La reprise utilise une seule entrée de `sessionStorage` liée au compte et à
l'URL canonique : 30 minutes, 64 curseurs au plus, validation de forme et de
cohérence avant lecture. Elle ne stocke pas les fiches, mais ses URL/curseurs
peuvent contenir des termes de recherche et d'identité. Le stockage refusé ou
corrompu n'empêche pas la navigation ; le curseur reste contrôlé par le serveur.
Les contrôles ont été extraits dans `PersonsListToolbar` et la reprise dans
`usePersonsListNavigation`, en conservant le budget de 800 lignes de la liste.

### Résultats de cette passe

- Suite web complète avec PostgreSQL isolé : **1 009 réussites, un échec** dans
  83 fichiers. Cet échec reste celui des `label`/`input` natifs dans
  `/systeme/utilisateurs/nouveau`, fichier inchangé. Les huit fichiers ciblant
  ce périmètre représentent **112 tests réussis**, dont 15 scénarios PostgreSQL
  et 10 scénarios de reprise/validation du nouveau filtre.
- `bun run typecheck`, lint des fichiers modifiés et `bun run build` réussis.
  Les deux avertissements de lint liés à la lecture de sources dans un test ont
  ensuite été corrigés localement ; le lint a été rejoué.
- Le budget du répertoire est respecté. Le contrôle global d'architecture
  reste bloqué par `components/ui/sidebar.tsx`, inchangé, à 925/900 lignes.
- Chromium avec composants réels et CSS du build, API/authentification/routeur
  et fiche de destination simulés : six largeurs (1920, 1440, 1024, 768, 390,
  320 px), aucun débordement de page ou de zone principale, compteurs au clavier,
  suppression du filtre, recherche multi-mots, retours et rechargement réussis,
  aucune erreur JavaScript. Retour explicite en page 3 : défilement **442 → 442 px**,
  lien d'origine focalisé et Page précédente actif.
- Documentation : `bun run docs:check` réussi (174 fichiers, 829 liens locaux
  et index), `git diff --check` réussi. Le PostgreSQL temporaire a été arrêté,
  puis les fichiers du banc et sa base isolée supprimés après conservation des
  captures et résultats. Aucun déploiement effectué.

Preuves de cette passe : [résultats navigateur](repertoire-2026-10-10/ameliorations-browser.json),
[grand écran](repertoire-2026-10-10/ameliorations-1920.png),
[ordinateur portable](repertoire-2026-10-10/ameliorations-1440.png),
[mobile](repertoire-2026-10-10/ameliorations-390.png).

Limites : pas de session authentifiée complète sur le serveur Next réel, pas de
lecteur d'écran ni de benchmark à volume représentatif. Les seuils et captures
proviennent du cadre isolé décrit ci-dessus, pas d'une validation du site entier.
