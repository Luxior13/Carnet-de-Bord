# Audit du design — 22 septembre 2026

> Rapport historique : résultats valables pour la passe décrite, non rejoués par
> la correction documentaire. Voir [l’index](README.md) et les [suivis courants](../qualite/pages/README.md).
> Les chemins indiqués comme historiques peuvent désigner des fichiers retirés.

## Ajustement d'après la référence utilisateur

La capture du tableau « Comptes utilisateurs » a été retenue comme direction
visuelle pour les compositions partagées. Après retour utilisateur, l'en-tête de
page devient un titre ouvert sur le fond, sans panneau ni repère coloré. La
navigation utilise les mêmes surfaces neutres que les sections. L'alternance des
lignes, la sélection et le survol ont leurs jetons communs. Les fiches de profil
en lecture reprennent cette alternance ; les grilles de formulaires gardent leur
propre disposition. Les icônes génériques et badges descriptifs sont neutres,
tandis que les statuts, pôles, actions et contenus à remarquer gardent leur couleur.

Contrôle Chromium de l'alternance,
du survol et de la sélection sur les lignes paires et impaires, puis des composants
partagés de 320 à 2560px. Les limites de recette authentifiée décrites ci-dessous
restent applicables.

## Consolidation shadcn et navigation

- Migration de la recherche rapide vers `Command`/cmdk : clavier et ARIA
  délégués à la primitive, catalogue et permissions conservés.
- Avatars via `Avatar`, états de contenu via `Alert`/`Empty`, panneaux dépliants
  via `Collapsible` et composition commune `Disclosure`.
- Boutons et labels visibles des journaux, autorisations et aides de champ
  ramenés aux primitives UI. Contrôle AST ajouté sur l'ensemble des TSX.
- Sidebar sans marqueur lime ni dégradé de compte ; mêmes états neutres dans
  les onglets et rails. Les couleurs de pôle restent dans le sélecteur de pôle.
- Cartes d'annonces, notifications et résultats de recherche fondées sur `Card`.
  Alerte d'expiration de session fondée sur `Alert`, bornée sur petit écran.
- Filtres utilisateurs alignés selon la largeur réelle de leur conteneur.
- Configuration shadcn corrigée : alias `ui` vers `$ui`, alias `lib` vers
  `$shared` ; l'ancien `$lib` n'existait pas dans la configuration TypeScript.
- Suppression de la propriété de thème `hero`, devenue inutilisée.

L'inventaire détaillé des fichiers est dans [AUDIT_SHADCN.md](AUDIT_SHADCN.md).

## Conclusion

L'identité existante est adaptée à un outil de gestion : graphite, accent lime,
couleurs de pôles, Geist, panneaux compacts. Les couleurs étaient déjà bien
centralisées. Les écarts venaient surtout de compositions concurrentes, de
surcharges locales et de comportements aux limites de largeur et de hauteur.
L'intervention consolide cette identité et corrige ces écarts.

Le périmètre inventorié comprend 129 fichiers TSX, 17 fichiers de route `page.tsx`,
les constantes visuelles et l'unique feuille CSS. Certaines routes sont des
redirections ; le catch-all système expose plusieurs écrans. Les fonctionnalités
annoncées mais non implémentées ne sont pas des écrans visuellement validables.

## Constats et corrections

| Sujet                            | Constat avant intervention                                                                                           | Correction                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Thème sombre                     | Palette sombre mais absence de classe `dark` à la racine                                                             | Activation cohérente des variantes, notamment le curseur des switches                                |
| Menus et notifications flottants | Texte secondaire sur `#383f5a` : contraste de 4,09:1                                                                 | Surface graphite `#292f3d` : 5,28:1, supérieure au seuil de 4,5:1                                    |
| Métadonnées                      | Opacité supplémentaire sur du texte déjà atténué dans les journaux et notifications                                  | Réutilisation du jeton secondaire sans atténuation additionnelle                                     |
| Contraste renforcé               | Plusieurs bordures reprenaient exactement les valeurs normales                                                       | Bordures, séparateurs et texte secondaire renforcés réellement                                       |
| Titres                           | Connexion sans titre HTML ; `CardTitle` rendait une `div` ; sections commençant en `h3`                              | `CardTitle` sémantique, `h1` de connexion, `h2` de section et `h3` de carte dans la feuille de route |
| En-tête de page                  | Deux implémentations, dont `PageHeader` inutilisée                                                                   | Un seul `PageHero`, titres 20/24px, retour à la ligne des identifiants longs                         |
| Sections                         | Styles distincts de `SectionPanel` et `AccountPanel`                                                                 | Composition commune fondée sur les primitives `Card`                                                 |
| Cartes                           | Surfaces et arrondis surchargés dans le dashboard, les tables, la sécurité et la feuille de route                    | Réutilisation des valeurs des primitives sur ces compositions                                        |
| Contrôles                        | Boutons plus arrondis que les champs ; anneau de focus divergent entre champs                                        | Arrondi commun des boutons et champs, harmonisation du halo des champs                               |
| Switch                           | Bordure transparente, état désactivé visuellement difficile à distinguer                                             | Bordure de contrôle explicite et état de survol                                                      |
| Rail des fiches                  | Seuil basé sur l'écran, ignorant la largeur occupée par la sidebar                                                   | Requête de conteneur ; repli horizontal tant que la place manque                                     |
| Fenêtres                         | Limites de hauteur dispersées ou absentes, `overflow-hidden` sur certains formulaires                                | Limite commune, défilement, nettoyage des surcharges bloquantes                                      |
| Menus contextuels                | Taille maximale non bornée dans la primitive Popover                                                                 | Bornes de largeur et hauteur disponible, défilement vertical                                         |
| Mouvement                        | Translation au survol sur une annonce non entièrement cliquable ; `transition-all` sur la robustesse du mot de passe | Transitions limitées aux propriétés utiles                                                           |
| États système                    | Erreur/404 dimensionnées comme une page publique dans le shell privé                                                 | Hauteur adaptée au conteneur et suppression de la colonne décorative publique dans ce contexte       |
| Chargement                       | Squelettes globaux sans annonce dédiée                                                                               | État de chargement nommé pour les technologies d'assistance                                          |

## Revue par zone

Cette matrice décrit la revue des sources et l'effet des composants partagés.
Elle ne prétend pas que toutes les pages privées ont été ouvertes avec leurs données.

| Zone / routes                                    | Résultat de la revue                                                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `/login`                                         | Identité conservée, titre sémantique, contrôles communs ; rendu vérifié à quatre largeurs                             |
| `/`                                              | Héros partagé ; cartes d'activité et d'attention ramenées aux mêmes surfaces et arrondis                              |
| `/tableau-de-bord/[[...slug]]`                   | Route de compatibilité ; pas de design autonome à dupliquer                                                           |
| `/mes-notifications`                             | Héros et structure communs ; texte secondaire rendu plus lisible                                                      |
| `/tableau-de-bord/mes-notifications`             | Redirection vers la boîte de réception ; pas de seconde interface                                                     |
| `/recherche`                                     | Héros, filtres et états de résultats déjà mutualisés ; bénéficie des contrôles et surfaces corrigés                   |
| `/vie-interne/actualite-interne`                 | Cartes éditoriales conservées ; contenus longs cassables, survol sans déplacement, action d'épinglage mobile agrandie |
| `/vie-interne/repertoire`                        | Liste/tableau et états partagés ; corrections héritées de `DataTableSection`, des champs et menus                     |
| `/vie-interne/repertoire/nouveau`                | Formulaire partagé ; suppression de la double bordure entre en-tête et contenu                                        |
| `/vie-interne/repertoire/[id]`                   | Héros et rail partagés ; formulaires plein écran conservés avec leur corps défilable                                  |
| `/administration`                                | Entrée de navigation, pas de variante visuelle supplémentaire                                                         |
| `/administration/utilisateurs`                   | Table/liste et filtres partagés ; corrections des primitives propagées                                                |
| `/administration/utilisateurs/nouveau`           | Panneaux de création unifiés via `SectionPanel` ; titres de cartes sémantiques                                        |
| `/administration/utilisateurs/[id]`              | Rail et fallback synchronisés ; confirmations défilables ; métadonnées du journal mieux contrastées                   |
| `/mon-compte`                                    | Panneaux de profil mutualisés ; cartes de sécurité harmonisées ; rail et fenêtres corrigés                            |
| `/systeme/parametres`                            | Cartes, contrôles et confirmations communs ; vrais titres `h2/h3` déjà présents                                       |
| `/systeme/journal-activite`                      | Hiérarchie des filtres et de la liste conservée ; texte secondaire sans opacité additionnelle                         |
| `/feuille-de-route`                              | Groupes `h2`, cartes `h3`, surfaces et arrondis communs                                                               |
| Chargement, erreur et 404                        | États adaptés au shell, sans ajouter une hauteur d'écran au-dessus du contenu privé                                   |
| Sidebar, recherche rapide, notifications, toasts | Palette et menus flottants partagés ; navigation persistante conservée                                                |
| MFA, mots de passe, confirmation administrative  | Même primitive de dialogue avec hauteur centralisée et actions accessibles par défilement                             |

## Organisation retenue

`globals.css` reste la source unique des fondations, avec cinq sections explicites :
liaison Tailwind, valeurs du thème, document, géométrie commune, accessibilité.
Il ne contient pas de sélecteur propre à une fonctionnalité.

Les états de contrôle restent dans les primitives ; la disposition métier reste
dans les fonctionnalités. Le regroupement passe par la composition des composants,
notamment `SectionPanel` qui utilise désormais `Card`, et non par des sélecteurs
globaux ciblant le contenu des pages. `PageHeader` a été supprimé car sans utilisateur.
`AccountPanel` reste un adaptateur accessible, sans deuxième jeu de styles.

Les aliases historiques de surface sont conservés : ils pointent vers les mêmes
jetons canoniques et ne représentent pas des palettes concurrentes. Les dimensions
Radix, calculs de viewport et grilles métier sont des valeurs arbitraires légitimes.
Les couleurs hexadécimales et tailles de texte arbitraires ne sont pas dispersées
dans les composants applicatifs.

## Validation

- Suite Vitest : **957 tests réussis dans 80 fichiers**, dont 12 nouveaux cas
  de contraste des surfaces et actions. Les tests métier existants passent.
- TypeScript, lint, build Next.js et budgets d'architecture/performance vérifiés.
- Chromium, connexion réelle : 320, 375, 768 et 1440px, sans débordement horizontal.
- Banc temporaire utilisant les véritables composants et le CSS de l'application :
  320, 375, 768, 1280, 1536, 1920 et 2560px. Titres longs, contrôles, menus,
  confirmations et rail testés ; aucune erreur JavaScript dans ce banc.
- À 1536px avec une sidebar de 256px, le rail extérieur reste masqué et le repli
  visible. À 1920px, le rail tient dans la gouttière disponible.
- Dialogues longs testés à 375 × 568px, avec accès à l'action en fin de contenu.
- Émulation du contraste renforcé, du mouvement réduit et des couleurs forcées :
  valeurs effectivement appliquées et focus système visible.

## Limites de la validation et suite de la recette

La revue porte sur tout le périmètre de code listé ; la recette visuelle réelle
comprend la connexion et les composants montés dans le banc temporaire.
Un second banc monte les vraies pages utilisateurs, création d'utilisateur,
recherche et compte, ainsi que l'éditeur d'autorisations, avec données fictives
et adaptateurs de navigation. Sidebar, menus de compte/pôle, recherche rapide
et formulaires sont contrôlés dans leur composition réelle, de 320 à 1920px.
La recherche est testée au clavier, avec sélection, résultat vide, effacement,
navigation et restitution du focus. Les panneaux d'autorisations sont ouverts
et refermés. Aucun dépassement horizontal ni erreur JavaScript dans ces contrôles.
Les pages privées n'ont pas été parcourues avec une session authentifiée dans
le navigateur de contrôle. La suite E2E métier nécessitant une base dédiée n'a
pas été lancée. Aucun compte ni aucune donnée métier n'a été modifié pour cet audit.

Avant de considérer la recette produit terminée, parcourir les pages privées avec
plusieurs permissions et données réalistes : listes longues et vides, noms très
longs, erreurs de formulaire, MFA, tableaux, fenêtres empilées et zoom à 200 %.
Compléter sur Safari/iOS et Firefox : les contrôles visuels de cet audit utilisent
Chromium. Le banc partagé réduit les risques mais ne certifie pas tous les écrans.

La base est mieux unifiée ; cela ne constitue pas une certification WCAG ni une
promesse de perfection. Les fiches utilisateur et journaux restent volumineux en
code : leur découpage progressif pourra faciliter la maintenance sans changer le
design ni mélanger cette intervention avec une réécriture métier.

La référence à suivre pour les prochaines pages est [DESIGN_SYSTEM.md](../references/DESIGN_SYSTEM.md).
