# Audit des menus déroulants — 10 octobre 2026

## Conclusion et périmètre

**Conforme sur le périmètre visuel et les interactions vérifiés.** Les sélecteurs
partagent désormais leur contour au focus et pendant l'ouverture ; les panneaux
et options reprennent les arrondis compacts de la référence Répertoire. Les
différences de densité et les boutons de navigation gardaient leur composition
utile lors de cette première passe. L'identité complète du rendu entre filtre
et fiche n'était pas vérifiée ; la correction demandée ensuite est suivie dans
le [complément](#complément--présentation-des-sélecteurs-du-répertoire).

Demande : « vérifie tous les menus déroulants aussi », après harmonisation des
champs de fiche. Audit transverse du code et des composants actifs ; aucune
modification des permissions, données, routes ou actions métier. Départ : branche
`main`, commit `f25e47bf42c8a7e4e2ad6b8586692fb7ac882c9a`, avec la correction
précédente du focus du Répertoire et ses documents encore présents dans l'arbre.

## Inventaire et couverture

Inventaire syntaxique de tous les fichiers TSX sous `apps/web/src` : **19 sites
de déclaration `SelectTrigger`, dont 6 dans l'historique dormant, et 3 menus
`DropdownMenuTrigger`**. Les déclarations réutilisées peuvent rendre plusieurs
contrôles. Onze composants consommateurs actifs sont couverts ci-dessous.

| Consommateur | Contrôle exécuté |
| --- | --- |
| `PersonsListToolbar` | Filtres statut et tri, composition de liste réelle |
| `UsersListToolbar` | État, rôle et tri ; données du contrôleur simulées |
| `PersonIdentityFields` | Statut, variantes création et fiche discrète |
| `PersonCollectionFields` | Pays téléphonique et réseau social, listes réelles |
| `PersonCollectionsSection` | Nouveau contact principal dans le vrai dialogue ; aucune suppression confirmée |
| `UserAccessTab` | Rôle de base d'un compte fictif ; capacité MFA simulée |
| `PermissionsEditor` | Pôle et page, imbriqués dans le véritable onglet Autorisations |
| `RoadmapPage` | Pôle et phase, page réelle avec contexte de navigation simulé |
| `Sidebar` | Menu compte réel, dans le volet mobile et la sidebar desktop |
| `PoleNavigation` | Menu Rubriques réel dans la sidebar |
| `BreadcrumbTrail` | Ancêtres repliés du fil d'Ariane, y compris mobile |

Compléments sur les primitives : option désactivée, erreur, 70 libellés longs,
case cochable, radio et sous-menu. La primitive `Popover` n'a aucun consommateur
actif dans cet inventaire et reste inchangée. `Command` sert à la recherche en
dialogue, hors périmètre de ce contrôle de menus. Aucun `<select>` natif visible
n'est déclaré directement dans les sources ; un `datalist` de suggestions de
libellés de coordonnées reste rendu par le navigateur, sans personnalisation.

Les six sélecteurs de `UserHistoryTab` sont dormants : leurs classes locales sont
nettoyées pour suivre la primitive, mais le parcours n'est ni réactivé ni testé.

## Constats et corrections

| ID | Constat | Correction et état |
| --- | --- | --- |
| MENU-01 — P2 | Les filtres de listes et l'éditeur de permissions remplacent bordure, anneau et/ou arrondi du sélecteur partagé. La variante discrète reprend sa bordure de repos lorsque le focus passe dans le menu ouvert. | **Corrigé et vérifié** : surcharges limitées à la composition et au repos ; les variantes respectent aussi `data-state="open"` et l'état invalide. |
| MENU-02 — P2 | Le sélecteur standard ne conserve pas un repère d'ouverture commun une fois le focus transféré aux options. | **Corrigé et vérifié** : `SelectTrigger` porte le même anneau pendant le focus clavier et l'ouverture, en conservant la bordure/teinte d'erreur. Fermeture par Échap et retour du focus vérifiés. |
| MENU-03 — composition | Les panneaux/options combinent plusieurs rayons locaux, avec des options radio et cochables plus arrondies que leurs voisines. | **Harmonisation livrée et vérifiée** : déclencheur de champ 6 px, panneau et sous-menu 7 px, option 4 px ; styles communs aux primitives, repris par listes et navigation. |

La densité particulière des filtres et des permissions reste dans leur
composition. Le menu compte conserve sa surface de navigation et son ombre
dédiée. Les boutons de navigation gardent leur focus intérieur ; ils ne sont pas
des champs de formulaire. Le focus système en couleurs forcées reste présent.

Sources principales : [sélecteurs](../../apps/web/src/components/ui/select.tsx),
[menus d'actions](../../apps/web/src/components/ui/dropdown-menu.tsx),
[composition de liste](../../apps/web/src/components/ui/directory.module.css),
[champs discrets](../../apps/web/src/components/layout/SectionForm.module.css),
[permissions](../../apps/web/src/components/users/PermissionsEditor.tsx).
Les décisions durables sont portées par le [design system](../references/DESIGN_SYSTEM.md).

## Vérifications exécutées

Banc local jetable : React 19.1.8 réellement monté dans Chromium, Playwright
1.61.1, esbuild 0.27.2, CSS du projet recompilé. Radix Select 2.3.3 et Dropdown
Menu 2.1.20 installés. Navigation Next, compte et contexte de disponibilités
simulés ; aucune API métier ni base utilisée. Les interactions Radix, portails,
volets et composants consommateurs sont exécutés, pas simulés.

La documentation officielle [Select](https://www.radix-ui.com/primitives/docs/components/select)
et [Dropdown Menu](https://www.radix-ui.com/primitives/docs/components/dropdown-menu)
a été consultée via Context7 pour les états d'ouverture, les contraintes de
positionnement et les interactions clavier, puis comparée aux versions installées.

- **60 combinaisons composant/largeur réussies**, à 320, 390, 768 et 1 440 px.
  88 ouvertures au clic et 88 au clavier dans cette matrice ; rayons calculés,
  bordures des déclencheurs, anneaux et panneaux contenus dans le viewport.
- Flèche bas, fin de liste, options désactivées, sélection par Entrée, Échap et
  restitution du focus. Le pays couvre une longue liste réelle ; les libellés
  artificiellement longs complètent le contrôle des limites de panneau.
- Cases cochables, radios et sous-menu exercés ; clic extérieur ferme le menu.
- Sélection tactile émulée sur le filtre Utilisateurs à 390 px ; aucun appareil
  tactile physique. Contour clavier vérifié en couleurs forcées.
- Aucune erreur JavaScript non interceptée dans les 60 combinaisons.
- Suite web : **85 fichiers / 1 036 tests réussis ; 2 fichiers / 25 tests ignorés**,
  suites PostgreSQL sans leurs variables dédiées à cette commande.
- TypeScript, lint web et budget d'architecture réussis. Compilation du banc
  React/CSS réussie ; **build Next de production non rejoué** pour ce changement.

La première passe a révélé un défaut réel restant sur le sélecteur discret ouvert,
corrigé avant recompilation. Le banc a aussi corrigé une attente de focus après
ouverture au clavier et son seuil mobile (1 024 px). La matrice entière a ensuite
été rejouée avec succès ; les essais ratés ne sont pas comptés comme validation.
L'ancien test de sidebar ne fige plus un rayon porté désormais par la primitive.

[Inventaire et résultats consolidés](menus-2026-10-10/observations.json) ·
[Filtres Utilisateurs à 390 px](menus-2026-10-10/filtres-utilisateurs-390.png).
La capture montre le composant réel dans le banc isolé, pas une session du site.
Les serveurs locaux et navigateurs ont été fermés ; le banc temporaire a été
supprimé après consolidation des preuves.

## Sélection et limites

Q01–Q04, Q06, Q19, Q27 et Q30 examinés pour le besoin, les compositions partagées,
le clavier, les sélections et les preuves. Q05 est contrôlé pour les longues
listes d'options, sans changer la recherche métier. Q07–Q18 et Q20–Q29, sauf
Q27, sont hors impact sur cette correction de présentation : pas de stockage,
droit, mutation, notification, intégration ou exploitation modifié.

L'inventaire couvre tous les consommateurs déclarés ; le banc vérifie les menus
de ces composants, **pas tous les parcours authentifiés des pages**. Aucune
validation de permissions serveur, de mutation réelle, de lecteur d'écran, de
Safari ou d'appareil physique n'est déduite de cet audit. Les limites de chaque
page dans son suivi restent applicables.

Déclencheur de reprise : nouveau consommateur, surcharge visuelle de menu,
nouvelle option longue, changement de primitive, de portail ou de composition
mobile. Les trois points ci-dessus sont clos après vérification ; aucun défaut
supplémentaire ouvert dans le périmètre exécuté.

## Complément — présentation des sélecteurs du Répertoire

Même date, après retour utilisateur sur l'écart entre la fiche et les filtres.
**MENU-04 — P2, corrigé et vérifié** : le contrôle initial portait sur contours,
rayons et interactions ; il avait conservé des densités différentes. Le statut
de fiche avait encore son fond discret, un texte de 13 px, une flèche atténuée
de 16 px et des espacements différents du filtre de référence.

La variante `compact` de `SelectTrigger`/`SelectContent` extrait la présentation
des filtres dans [select.module.css](../../apps/web/src/components/ui/select.module.css).
Fiche, création, pays, réseau et remplacement du principal la réutilisent ;
`directory.module.css` conserve seulement la largeur des sélecteurs de liste.
Les filtres Utilisateurs sont migrés vers cette même variante. Les autres usages
du sélecteur standard conservent leur densité.

Vérifications nouvelles, distinctes de la matrice initiale :

- Quatre largeurs Chromium : 320, 390, 768 et 1 440 px. React et CSS réels,
  contexte compte simulé, police de repli du navigateur, aucune API/base.
- Sept déclencheurs comparés au filtre de statut par largeur : statut de fiche,
  statut de création, pays, réseau et les trois filtres Utilisateurs. Égalité
  des hauteurs, typographie, couleurs, bordures, arrondis, espacements et flèches.
  Les largeurs et les minima automatiques propres aux conteneurs ne sont pas
  assimilés à des styles identiques.
- Statut liste/fiche : égalité du survol, focus clavier, état ouvert, styles du
  panneau, viewport et option sélectionnée. Sélection de « Hors structure » par
  flèche/Entrée, fermeture et retour du focus vérifiés. Pays, réseau et filtres
  Utilisateurs ouverts/fermés ; options de 38 px minimum et texte de 12 px mesurés.
- Contour d'erreur et lien vers son message, état désactivé, panneaux contenus
  horizontalement dans le viewport et aucun débordement de document ; aucune
  erreur JavaScript non interceptée.
- TypeScript, lint web, architecture et suite web : 85 fichiers / 1 036 tests
  réussis, 2 fichiers / 25 tests ignorés. Les ajustements de la fixture et des
  attentes de focus ont précédé la passe complète réussie.

[Mesures calculées](menus-2026-10-10/comparaison-repertoire.json) ·
[Comparaison à 1 440 px](menus-2026-10-10/comparaison-repertoire-1440.png) ·
[Comparaison à 390 px](menus-2026-10-10/comparaison-repertoire-390.png).
Captures du banc isolé, pas d'une session du site. Le remplacement du principal
est examiné dans le code ; son dialogue n'est pas rejoué ici. Ni API métier,
base, parcours authentifié, build Next, lecteur d'écran ni appareil physique
validés par ce complément. Les limites de la première passe restent applicables.
