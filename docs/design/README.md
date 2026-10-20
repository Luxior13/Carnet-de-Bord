# Système de design

[Guide général](../REFERENCE_GENERALE.md) · [Index de la documentation](../README.md) ·
[Préférences](preferences.md) · [Harmonisation](harmonisation.md)

Point d’entrée unique pour l’apparence, les composants et les comportements
d’interface. Tout nouveau composant, toute nouvelle page et toute refonte
partent d’ici, après le [guide général](../REFERENCE_GENERALE.md) et la
[fiche Interface visuelle](../references/interface-visuelle.md) (Q03).

Le parti pris : un outil de gestion privé, dense, calme et lisible, où
l’information passe avant la décoration. Les valeurs décrivent le socle
partagé ; une adaptation locale justifiée reste dans la fiche de la page et ne
devient pas automatiquement une règle pour tous les écrans.

## Fichiers et rôle

| Fichier | Contenu | Quand l’ouvrir |
| --- | --- | --- |
| [Principes](principes.md) | Intention, partir des tâches, règles fondatrices, couleur, anti-patterns | Toute création ou refonte visuelle |
| [Fondations](fondations.md) | Tokens réels de `globals.css`, variantes autorisées, couleurs, typographie, dimensions, ombres, mouvement, rangement des styles | Choisir une couleur, une taille, un rayon ; écrire du CSS |
| [Composants](composants.md) | Catalogue des composants à réutiliser, leurs contrats, la barre de sections et les questions avant un nouveau composant | Avant de créer un contrôle, une liste, une fenêtre ou une section |
| [Comportements](comportements.md) | Focus, listes, saisie et brouillon, navigation protégée, états, fenêtres, lecture seule, mobile, autocomplétion | Tout changement d’interaction ou d’état |
| [Gabarits de page](gabarits.md) | Compositions validées : liste, fiche à sections, création, réglages, lecture, accueil, écran hors cadre | Créer ou recomposer une page entière |
| [Préférences du propriétaire](preferences.md) | Journal daté des « j’aime / je n’aime pas » et décisions visuelles | Avant toute refonte ; **à compléter après chaque retour** |
| [Harmonisation](harmonisation.md) | Écarts mesurés entre le code et les règles, état de chaque page | Planifier une reprise, vérifier une page |

Documents complémentaires, à lire seulement pour un détail précis : les audits
historiques du [design](../audits/2026-09-22-design.md), des
[primitives shadcn](../audits/2026-09-22-shadcn.md) et de la
[typographie](../audits/2026-09-22-typographie.md), ainsi que la
[proposition UX/UI du 23 septembre 2026](../propositions/interface-proposition-ux-ui.md).
En cas de conflit, les fichiers ci-dessus gagnent.

## Pages de référence

Désignées par le propriétaire. Toute nouvelle page reprend leurs choix, adaptés
à sa tâche ; la référence de liste n’impose ni ses colonnes ni ses règles
métier. Le détail de chaque référence est dans sa fiche de page.

| Gabarit | Page de référence | Ce qui fait référence | Fiche |
| --- | --- | --- | --- |
| Liste de gestion | `/membres/repertoire` (décisions des 9 et 10 octobre 2026) | Bandeau `PageIdentityHero`, `DataTableSection` et `directory.module.css`, recherche et filtres compacts de 38 px, lignes alternées, badges à pastille, `ListPagination`, synthèse en rail de 16 rem dès 118 rem | [Liste du répertoire](../pages/membres/repertoire/liste.md) |
| Liste de gestion, complément | `/systeme/utilisateurs` (validée le 17 octobre 2026) | Couleurs aux bons endroits, informations claires, densité satisfaisante ; seuils de colonnes ; fond d’avatar par accès | [Liste des utilisateurs](../pages/systeme/utilisateurs/liste.md) |
| Fiche à sections et barre d’enregistrement | `/systeme/utilisateurs/[id]` | Bandeau compact, synthèse `UserOverviewCard`, `PageSectionNavigation`, `SectionActionBar` de référence pour toutes les pages qui enregistrent | [Utilisateurs](../pages/systeme/utilisateurs/README.md) |
| Réglages en lignes compactes | Section Autorisations de `/systeme/utilisateurs/[id]` (17 et 18 octobre 2026) | Une carte par réglage, rubriques en petites capitales, aide en popover, conséquences critiques visibles | [Utilisateur — Autorisations](../pages/systeme/utilisateurs/fiche-autorisations.md) |
| Champs de formulaire | Rendu adouci de l’onglet Informations du site Noctambule (17 octobre 2026) | Police système, rayon 8 px, 40/44 px, contour `#435978`, survol `#5b7699`, focus `#698cdd` avec anneau de 2 px à 13 % | [Fondations](fondations.md#espacements-et-arrondis) |

Le 17 octobre 2026, le propriétaire confirme que `/systeme/utilisateurs` lui
convient visuellement. Reprendre ce ressenti dans les autres compositions, sans
reproduire systématiquement son tableau : l’onglet Autorisations l’adapte en
lignes de réglage compactes.

Le socle commun comprend les surfaces gris bleuté, la typographie dense, les
bordures fines, les contrôles et leurs états. Les listes reprennent aussi le
bandeau de colonnes, l’alternance des lignes et les badges :

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
- Interaction : `surface-tile-hover` pour le survol des lignes et menus,
  `surface-selected` pour la sélection ou un contenu à remarquer. Une ligne
  sélectionnée conserve sa couleur quelle que soit sa parité.
- Navigation : `surface-navigation-active` et `surface-navigation-hover`,
  bleu ardoise, partagés entre sidebar, barre de sections et pagination.
- Icônes génériques et badges descriptifs : neutres. Les couleurs restent utiles
  pour les statuts, les pôles, les accès, les actions principales, l’épinglage
  et le non-lu.
- Autocomplétion **désactivée partout, sans exception** : voir
  [Comportements](comportements.md#autocomplétion).

## Ordre de priorité

1. Les décisions du propriétaire consignées dans les [préférences](preferences.md)
   et les fiches de page.
2. Les fichiers de ce dossier : principes, fondations, composants,
   comportements, gabarits.
3. Le code des pages de référence ci-dessus.
4. Les audits et propositions historiques cités plus haut.

Le code décrit l’implémentation ; il ne fixe pas la règle. Une divergence entre
code et règle est signalée dans [Harmonisation](harmonisation.md) puis corrigée
dans son périmètre.

## Appliquer le système à une page

1. Partir du [guide général](../REFERENCE_GENERALE.md) : définir la tâche, le
   type de page et les points utiles, puis lire la [fiche de la page](../pages/README.md)
   et ses décisions déjà prises.
2. Choisir le [gabarit](gabarits.md) adapté à la tâche principale.
3. Réutiliser les [composants](composants.md) existants avant d’en créer ;
   une disposition métier peut compléter ce socle avec sa raison écrite.
4. Utiliser uniquement les [tokens](fondations.md) et la
   [variante autorisée](fondations.md#variantes-autorisées) de chaque rôle ;
   aucune couleur codée en dur.
5. Suivre la [navigation](../domaines/navigation.md) pour l’emplacement et la
   [politique des retours](../references/feedback.md) pour les messages.
6. Vérifier tous les états selon [Comportements](comportements.md) : repos,
   survol, focus, actif, désactivé, erreur, vide, chargement, lecture seule,
   avec textes longs et valeurs absentes.
7. Comparer le rendu aux pages de référence sur petit, intermédiaire et grand
   écran, au clavier et en faible hauteur. Vérifier les consommateurs si un
   composant partagé change.
8. Reporter dans la fiche de page ce qui a changé et, si la règle est commune,
   dans le fichier propriétaire de ce dossier ; terminer par `bun run docs:check`.

## Boucle des préférences

Quand le propriétaire dit « je préfère ça », « j’aime », « je n’aime pas » ou
valide un rendu :

1. Ajouter une entrée datée dans le [journal des préférences](preferences.md) :
   contexte, retour exact reformulé, décision, portée (page, gabarit ou tout le
   site), puis actualiser son tableau « Règles en vigueur ».
2. Mettre à jour le fichier propriétaire de la règle : [fondations](fondations.md)
   pour une valeur, [composants](composants.md) pour un composant,
   [comportements](comportements.md) pour une interaction,
   [gabarits](gabarits.md) pour une composition, la fiche de page pour une
   adaptation locale.
3. Ajouter les pages concernées mais non encore alignées dans
   [Harmonisation](harmonisation.md), pour que les prochaines reprises les
   corrigent.

Une préférence exprimée sur une page s’applique par défaut aux pages du même
gabarit. Si sa portée est ambiguë, l’indiquer comme « à confirmer » dans le
journal sans bloquer le travail en cours.

## Historique

- 26 septembre 2026 : `docs/references/DESIGN_SYSTEM.md` devient la référence
  visuelle commune, avec le catalogue `COMPOSANTS.md`.
- 9 et 10 octobre 2026 : le Répertoire devient la page de référence, complété
  par Utilisateurs.
- 17 et 18 octobre 2026 : champs adoucis du site Noctambule ; Autorisations en
  lignes compactes puis en cartes.
- 19 octobre 2026 : réorganisation en dossier de design. Le contenu de
  `DESIGN_SYSTEM.md` est réparti sans perte dans ces fichiers (correspondance
  dans le [rapport de réorganisation](../audits/2026-10-19-organisation-complete.md)) ;
  `COMPOSANTS.md` devient [composants](composants.md). Journal des préférences
  et harmonisation créés.
