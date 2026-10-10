# Proposition UX/UI — géométrie et navigation des pages

> Document de conception. Son statut et sa source courante sont précisés dans
> [l’index des plans](README.md). Confronter ces propositions aux décisions actuelles.

Date : 23 septembre 2026. Statut : proposition approuvée et appliquée aux pages existantes.

## Mise en œuvre

La colonne reste centrée hors sidebar. Les gabarits partagés utilisent 76rem par défaut, 52rem pour les créations et 56rem pour les pages de lecture. Le header et les préférences de sidebar sont conservés.

`PageSectionNavigation` remplace le rail extérieur sur Personne, Utilisateur et Mon compte : liens de section soulignés, barre collante, noms complets, indicateur de saisie non enregistrée et maintien de la section active dans la partie visible. Les contrôles de navigation et de sauvegarde existants restent en place. Le composant `Tabs` propose aussi une variante soulignée pour les vrais panneaux d’onglets. `PageDetailSkeleton` harmonise le chargement des fiches.

Les listes partagent un basculement tableau/mobile selon leur largeur réelle. Le répertoire propose une réinitialisation des filtres même lorsque des résultats existent. Actualité, notifications et recherche utilisent le gabarit de lecture ; les notifications et les résultats de recherche adoptent des lignes moins encadrées. Le fil d’Ariane de Personne affiche l’identité autorisée une fois chargée.

L’accueil comporte un état calme explicite après résolution des données accessibles. Les avertissements des paramètres de conservation se placent dans leur section. Le journal garde ses filtres avancés repliables et adapte sa grille au contenu. La recherche est nommée « Rechercher une page ». Les explications de la feuille de route sont repliées, avec les filtres de pôle et d’étape directement accessibles.

Validation visuelle : 28 combinaisons de quatre gabarits et de largeurs 360, 390, 768, 1024, 1280, 1440 et 1920px dans Chromium, avec les composants réels et le CSS de production dans un montage isolé. Vérifications supplémentaires : sidebar réduite, onglets collants, activation au clavier, conservation du champ du montage lors d’un changement de section, section active visible sur mobile, clavier des Tabs Radix et texte agrandi à 200 %. Aucun débordement horizontal global détecté dans ces cas. Ce montage utilise des données fictives et une coque de démonstration ; il ne remplace pas un parcours authentifié complet.

Le contrôle global `bun run check` réussit : lint, TypeScript, budget d’architecture, 963 tests web, 21 tests du package base de données, compilation de production et budgets de taille des pages. Trois tests de rendu couvrent les liens partageables, l’annonce des modifications et l’absence de navigation vide.

Les tests E2E avec base de données n’ont pas été exécutés : `E2E_DATABASE_URL` n’est pas configurée. Les paragraphes suivants conservent les constats de l’audit initial et les décisions qui ont guidé la réalisation.

## Périmètre et méthode

Analyse du code de la coque authentifiée, de la sidebar, du header, des composants de page et des familles d’écrans livrées : accueil, répertoire et création/fiche, utilisateurs et création/fiche, compte, notifications, actualité, journal, paramètres, recherche, feuille de route et connexion. Les états partagés et les règles responsive ont également été examinés.

La navigation de référence est `docs/NAVIGATION.md`, révisée le 22 septembre 2026. `features/organisation-ux.md` est explicitement historique. Les modules futurs ne sont pas considérés comme des écrans déjà disponibles.

L’audit initial portait sur le code et la conception UX, sans parcours visuel dans une session authentifiée ni tests utilisateurs. Les constats structurels décrivent l’état avant réalisation. La section de suivi ci-dessus précise les changements et vérifications intervenus après approbation.

## Décision proposée

Conserver une sidebar globale et centrer la colonne de page dans l’espace restant. Utiliser un en-tête de page compact, puis une navigation horizontale stable pour les fiches. Définir les largeurs selon la tâche et simplifier les encadrements visuels.

Le centrage concerne le conteneur. Les titres, descriptions, onglets, filtres et données restent alignés à gauche.

## Constats dans le code

| Sujet | Existant vérifié | Conséquence et proposition |
| --- | --- | --- |
| Centrage | `AuthenticatedLayout.tsx` place le contenu dans un `SidebarInset` flexible ; `page-shell.tsx` utilise `mx-auto`. | Le centrage hors sidebar est déjà en place. Le conserver et l’appliquer aux différentes familles de pages. |
| Largeurs | `globals.css` définit 76rem par défaut et 92rem pour la variante large ; `PageShell` propose aussi une variante étroite de 64rem. | Les variantes doivent exprimer des usages précis. Les pages courantes emploient largement la largeur par défaut. |
| Créations | Nouvelle personne : `max-w-3xl`, soit 48rem. Nouvel utilisateur : conteneur imbriqué `max-w-4xl`, soit 56rem. | Deux mécanismes distincts pour une même famille d’écran. Les unifier dans le composant de page. |
| Header | Hauteur de 56px, fil d’Ariane et outils globaux ; le contenu principal défile séparément. | Bonne séparation entre repérage global et travail dans la page. |
| Navigation de fiche | Rail extérieur de 11rem et gouttière de 2,5rem, affichés à partir de 104rem d’espace principal. | Avec la sidebar de 16,5rem, le seuil représente environ 1928px de fenêtre à 16px/rem. Une fenêtre de 1920px utilise donc encore la barre horizontale lorsque la sidebar est ouverte. |
| Libellés de cette barre | La variante nommée `mobile` limite le texte à 4,25rem et l’applique également aux ordinateurs sous ce seuil. | Risque de libellés tronqués comme « Autorisations » alors que la page dispose de place. |
| Hero | `PageHero` est déjà un titre sobre avec description, métadonnées, actions et bordure inférieure. | Garder ce socle. Réduire les métadonnées décoratives et uniformiser les espacements. |
| Breadcrumb | Les fiches utilisateurs affichent le nom ; les fiches du répertoire indiquent « Fiche ». | Harmoniser l’identification de la destination, avec le nom autorisé après chargement. |
| Surfaces | `Card` ajoute systématiquement bordure, arrondi et ombre ; `CardHeader` ajoute un fond et une séparation. | Réserver ce traitement aux groupes qui en ont besoin, éviter l’accumulation avec des panneaux internes. |
| Responsive | Certaines barres utilisent déjà des container queries ; plusieurs grilles et le passage tableau/liste utilisent la largeur de fenêtre. | Étendre les décisions basées sur l’espace réellement disponible dans le contenu. |
| Accueil | Quand il n’y a ni attention de sécurité ni activité récente, seul le hero reste affiché après chargement réussi. | Prévoir un état calme explicite, utile aussi aux comptes ayant peu de droits. |
| Notifications | Les filtres sont des boutons avec des rôles d’onglets définis manuellement. | Clarifier leur nature de filtres ; utiliser des boutons à état pressé ou une primitive complète si de vrais panneaux sont retenus. |

## Géométrie commune

### Centrage

La zone principale commence après la sidebar. La colonne se centre dans cette zone, avec des marges gauche et droite égales. Si la sidebar est réduite, le contenu se recentre naturellement. Sur mobile, le menu se superpose et la colonne occupe l’écran avec ses marges.

Exemple géométrique, hors détails de bordures et scrollbars : une fenêtre de 1440px avec une sidebar de 264px laisse 1176px. Le centre du travail est à 852px depuis le bord gauche. Centrer au milieu de la fenêtre, à 720px, décale la colonne de 132px vers la sidebar et déséquilibre les marges disponibles.

Les limites proposées ci-dessous sont celles du conteneur extérieur, marges internes comprises, sur une base de 16px/rem. Elles sont des valeurs de conception, pas des prescriptions de shadcn/ui.

| Gabarit | Maximum proposé | Usage |
| --- | --- | --- |
| Lecture | 56rem / 896px | Actualité, notifications, résultats textuels. Texte long limité davantage, autour de 65–75 caractères par ligne. |
| Formulaire | 48–56rem / 768–896px | Création, saisie linéaire. Champs organisés selon leur nature. |
| Standard | 76rem / 1216px | Accueil, fiches, compte, listes courantes, paramètres. |
| Large | 92rem / 1472px | Tableaux réellement denses, matrices de permissions si nécessaire, certaines vues futures. |
| Disponible | Toute la zone principale | Futurs calendriers, plannings ou tableaux de travail qui nécessitent cet espace. |

Une page conserve sa largeur extérieure en changeant d’onglet. Un formulaire interne peut être plus étroit et rester aligné sur le bord gauche du contenu. Le hero, la navigation et les sections gardent les mêmes lignes d’alignement.

Marges intérieures cibles : 16px sur téléphone, 24px sur ordinateur, jusqu’à 32px sur grand écran. Espacement courant entre sections : 24px ; entre éléments liés : 8–16px. Pas de colonne décorative bordée sur toute la hauteur dans l’application privée.

### Header et fil d’Ariane

Conserver le header de 56px sur toute la largeur de l’espace principal : ouverture de sidebar, fil d’Ariane, recherche, notifications. Son alignement relève de la coque globale ; il n’a pas à changer avec chaque largeur de formulaire ou de page.

Le fil d’Ariane décrit le chemin : `Personnes → Répertoire → Camille Dupont`. Le hero identifie la page et présente ses actions. Le fait de retrouver le nom dans les deux est acceptable : les rôles sont différents. Éviter de répéter en plus le pôle et la catégorie sous forme de badges sans utilité.

Conserver le repli des chemins longs, adapté au mobile et au zoom. Afficher la destination courante et rendre les parents masqués accessibles. Le bouton « Retour au répertoire » reste utile parce qu’il doit restaurer les filtres, la page et, si possible, la position de lecture ; un lien hiérarchique générique ne remplace pas ce comportement.

### Hero

Le hero devient un en-tête de travail commun : avatar ou icône si utile, titre, statut pertinent, une courte description facultative et les actions. Conserver une taille de titre de 24px sur ordinateur et de 20px sur mobile comme base.

Sur ordinateur, les actions se placent à droite. Sur écran étroit, elles passent sous le titre. Une action principale visible ; les actions secondaires fréquentes restent accessibles, les autres se regroupent dans un menu. Le bouton de retour est un lien discret avant le titre, toujours au même endroit.

Objectif : un en-tête courant d’environ 80–112px quand le contenu tient, avec hauteur libre si le nom est long ou le texte agrandi. Pas de hauteur forcée ni de texte essentiel coupé pour respecter ce chiffre. Le hero défile normalement.

## Navigation de page et onglets

### Fiches et compte

Utiliser une barre horizontale sous le hero, à l’intérieur de la colonne. Onglet actif souligné, texte de 14px, hauteur confortable de 44–48px, libellés complets et largeur naturelle. La ligne de séparation peut appartenir à cette barre pour éviter deux bordures rapprochées.

Ce modèle s’applique à la fiche Personne (`Identité`, `Coordonnées`), à la fiche Utilisateur (`Profil`, `Autorisations`, `Sécurité`, `Activité`) et à Mon compte (`Profil`, `Sécurité`, `Activité`), selon les droits.

Supprimer pour ces écrans le rail placé dans la marge à partir de 104rem. Deux à quatre destinations ne justifient pas une seconde colonne de navigation. Sur mobile, permettre le défilement horizontal et garder l’élément actif visible. Ne pas réduire tous les libellés à des icônes ou les tronquer systématiquement.

Sur les fiches longues, rendre uniquement la barre d’onglets collante, avec fond opaque. Le header étant déjà extérieur au conteneur qui défile, son positionnement collant doit se calculer dans ce conteneur. Ne pas cumuler hero, onglets et filtres tous collants.

### Trois usages à distinguer

| Usage | Présentation | Comportement |
| --- | --- | --- |
| Changer de section dans une fiche | Barre soulignée | Section partageable dans l’URL et restauration correcte de l’état. |
| Filtrer la même liste, par exemple Toutes / Non lues | Petits boutons segmentés | État sélectionné explicite, résultats et compteur mis à jour. |
| Aller à une autre page du module | Liens de navigation | Liens utilisables au clavier, ouvrables dans un nouvel onglet, destination courante annoncée. |

La présentation soulignée peut servir à des liens ou à de vrais onglets. Ne pas mélanger une navigation par liens et des panneaux ARIA sans relation complète. Pour de vrais onglets, utiliser les primitives avec sélection, contrôles et navigation clavier cohérents. Préserver les protections existantes contre la perte de modifications.

Le style souligné existe dans la documentation actuelle de [Tabs shadcn/ui](https://ui.shadcn.com/docs/components/radix/tabs). Le composant local ne possède pas encore cette variante : il faudra l’ajouter explicitement, en conservant la variante segmentée pour ses usages.

Une navigation locale verticale reste envisageable pour de futurs paramètres comprenant de nombreuses catégories. Elle sera alors placée dans une grille explicite au sein de la page ; les deux catégories actuelles ne la nécessitent pas.

## Proposition par écran

| Écran | Proposition concrète |
| --- | --- |
| Accueil | Gabarit standard. Message de bienvenue compact. Mettre les actions ou alertes utiles avant l’activité. Deux colonnes uniquement si les deux blocs existent et disposent d’assez de place. Après chargement réussi sans contenu, afficher « Rien à traiter pour le moment » et un accès pertinent selon les droits. |
| Répertoire | Gabarit standard. « Nouvelle fiche » dans le hero. Recherche, filtres, compteur et réinitialisation dans une barre commune. Tableau sur espace suffisant, liste résumée sur mobile. |
| Utilisateurs | Même composition que le répertoire. Les colonnes supplémentaires de sécurité peuvent justifier le gabarit large après vérification. Distinguer nettement identité, rôle, état et action. |
| Fiche Personne | Avatar, nom et statut dans le hero. Retour stable. Deux onglets sous le titre. Édition regroupée par section ; suppression à distance des actions courantes. |
| Fiche Utilisateur | Même structure que Personne. Quatre sections visibles selon les droits. Simplifier la densité des métadonnées du hero. Garder l’état modifié et les confirmations nécessaires aux actions sensibles. |
| Mon compte | Même navigation horizontale de fiche. Afficher « Mon compte » en repère discret et l’identité dans le titre. Largeur extérieure stable entre profil, sécurité et activité. |
| Créations | Gabarit formulaire commun de 48–56rem. Titre stable « Nouvelle personne » ou « Nouvel utilisateur » ; aperçu de l’identité séparé si utile. Validation et erreurs près des champs. Actions Annuler / Créer en fin de formulaire. |
| Actualité interne | Gabarit lecture. Alléger le hero en retirant les badges génériques sur les droits et la nature du contenu. Annonces épinglées avant le fil chronologique ; deux colonnes uniquement si leur contenu reste confortable. |
| Notifications | Gabarit lecture. Compteur non lu utile. Filtres segmentés compacts. Lignes avec titre, résumé et date ; « Tout marquer comme lu » reste une action secondaire. Distinguer explicitement « Aucune notification » de « Tout est lu ». |
| Journal d’activité | Gabarit standard. Recherche et période visibles ; filtres avancés repliables. Lignes d’événements compactes avec détails développables, conservation des résultats pendant actualisation et du chargement progressif déjà présents. |
| Paramètres | Gabarit standard avec sections clairement titrées. Conserver les deux catégories actuelles ; pas de menu local supplémentaire. Regrouper visuellement les réglages apparentés et placer l’avertissement de suppression au plus près des durées concernées. Préserver les sauvegardes et garanties métier existantes. |
| Recherche | Champ principal mis en avant, résultats plus faciles à parcourir en liste. Le moteur actuel recherche des destinations : le nom « Rechercher une page » serait plus précis que « Recherche avancée ». Une recherche de personnes ou documents demanderait un vrai élargissement fonctionnel. |
| Feuille de route | Gabarit standard. Recherche, filtres et résultats plus accessibles. Conserver le contexte sur les étapes, mais replier les explications longues et alléger les informations précédant le catalogue. |
| Connexion | Conserver une carte centrée dans la fenêtre, puisqu’il n’y a pas de sidebar. Vérifier clavier mobile, zoom et petits écrans sur toutes les étapes de connexion/MFA. |
| États transversaux | Chargement, vide, recherche sans résultat, erreur et accès refusé reprennent le gabarit de la page. Une action utile et un message précis. Les skeletons suivent la future géométrie pour réduire les déplacements. |

## Cohérence visuelle et composants

Conserver la palette sombre, la police Geist et les couleurs de navigation existantes. La hiérarchie doit surtout venir des titres, des espaces et des regroupements. Les couleurs de statut gardent une signification accompagnée de texte ; la couleur de pôle reste un accent discret.

Réduire les cartes imbriquées. Une zone de données peut avoir une bordure et des séparateurs internes sans que chaque sous-groupe ait un fond, une ombre et un arrondi différents. Les listes courantes gagnent à être composées de lignes ; les cartes conviennent davantage aux contenus autonomes et synthèses.

| Besoin | Composants ou base existante |
| --- | --- |
| Coque et mobile | Sidebar, SidebarProvider, SidebarInset, SidebarTrigger, Sheet. La [documentation Sidebar](https://ui.shadcn.com/docs/components/sidebar) fournit les variantes et la composition. |
| Repérage | Breadcrumb et DropdownMenu pour les niveaux repliés. La [documentation Breadcrumb](https://ui.shadcn.com/docs/components/radix/breadcrumb) présente cette composition. |
| Sections de fiche | Navigation par liens stylée ou Tabs complet selon le comportement choisi ; apparence soulignée commune. |
| Listes | Table, Input, Select, DropdownMenu et Pagination déjà disponibles. Le [guide Data Table](https://ui.shadcn.com/docs/components/radix/data-table) sert de référence de composition pour tri, filtres et pagination. |
| Détails secondaires | Collapsible ou Disclosure existant ; éviter un panneau supplémentaire pour une simple information. |
| Modifications courtes | Dialog ; Sheet seulement si le contexte de la page doit rester perceptible. |
| Actions sensibles | AlertDialog et protections métier existantes. |
| Retour d’action | Message local pour une erreur à corriger ; Sonner pour une confirmation brève ; Skeleton et Empty pour les états dédiés. |

La majorité des primitives est déjà présente. Le travail principal est leur composition cohérente. Ne pas réinstaller la bibliothèque ou migrer vers un autre moteur de composants pour cette refonte. La documentation actuelle présente plusieurs variantes ; les primitives locales reposent sur Radix.

## Responsive, clavier et défilement

Conserver un défilement principal de contenu et celui de la sidebar. Éviter les zones verticales imbriquées dans les formulaires ; limiter le défilement horizontal aux barres et tableaux qui en ont besoin.

Dimensionner les changements de grille à partir de l’espace principal lorsque pertinent. Le même écran de 1280px n’offre pas la même place avec une sidebar ouverte ou réduite. Préserver les préférences existantes d’ouverture de sidebar et de pôles.

Sur téléphone : marge de 16px, menu en panneau, actions essentielles lisibles, cibles tactiles d’environ 44px, retour accessible, barre de sections défilante et listes résumées. Un futur tableau financier peut garder un défilement horizontal contrôlé lorsque les colonnes doivent être comparées ensemble.

Vérifier l’ordre de tabulation, le focus au retour d’une boîte de dialogue, les libellés longs, les sélections annoncées, les contrastes et le zoom à 200 %. La présence de primitives accessibles ne dispense pas de tester leur composition finale.

## Ordre de réalisation proposé

1. Fixer les gabarits, les marges et l’en-tête commun dans `PageShell`, `PageCanvas` et `PageHero`.
2. Créer une navigation locale commune sous le hero. Migrer Personne, Utilisateur et Mon compte, puis retirer le rail extérieur devenu inutile et ses skeletons associés.
3. Unifier les listes Répertoire et Utilisateurs : recherche, filtres, compteurs, pagination, présentation mobile et retour depuis une fiche.
4. Appliquer les gabarits lecture et formulaire, alléger les badges et les cartes imbriquées.
5. Ajuster l’accueil vide, le journal, les paramètres, la recherche et la feuille de route.
6. Valider les parcours, la géométrie et l’accessibilité sur des données réalistes avant généralisation.

La migration doit tenir compte des tests de contrats UX existants : certains décrivent l’ancienne géométrie. Préserver les attentes métier et remplacer les assertions de présentation devenues obsolètes.

Critères de validation : 360/390, 768, 1024, 1280, 1440 et 1920px ; sidebar ouverte/réduite ; noms longs ; permissions minimales et administrateur ; liste vide/erreur/chargement ; données nombreuses ; navigation clavier ; zoom 200 %. Vérifier le retour avec filtres et pagination, le lien direct vers une section, l’absence de perte de saisie et l’absence de défilement horizontal global.

Cette matrice constituait le plan de validation de l’audit initial. Les vérifications effectivement réalisées et leurs limites sont indiquées dans le suivi de mise en œuvre en début de document.
