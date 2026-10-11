# Banc client Utilisateurs — 11 octobre 2026

Depuis la racine du dépôt :

```powershell
node docs/audits/utilisateurs-2026-10-11/banc-client/run.cjs
```

Le script compile la vraie page `/systeme/utilisateurs`, ses composants et son
CSS, puis lance Chromium sur un serveur local éphémère. Chaque scénario utilise
un contexte neuf. Le dossier temporaire contenant les observations et captures
est annoncé à l'exécution ; `AUDIT_ONLY` filtre les noms de scénarios.

La passe conservée part de `main`, commit
`310e84514cf0f38802c042922873b9ee40fdc19b`, avec les corrections locales de cet
audit. Elle ne décrit pas le commit seul.

## Périmètre et environnement

La page, `UsersListPage`, `UsersListResults`, `UsersListToolbar`, `UsersOverview`,
leurs hooks, avatars, badges, menus, pagination et primitives sont les vrais
composants du projet. Le routeur, la session et l'API sont **simulés**. Toutes les
identités, adresses et données des captures sont fictives. Le filtre de fixtures
ne valide pas la recherche SQL ni la protection serveur.

Le banc charge le CSS global et les modules locaux, avec police de repli Arial,
fuseau Europe/Paris, mouvement réduit et date fixée au 11 octobre 2026 à 14 h UTC
pour les libellés relatifs. La version de Chromium est enregistrée. Le shell
réserve seulement 240 px à la navigation desktop : la vraie sidebar appartient
au banc d'intégration.

Une adaptation d'assemblage conserve le nom global `data-table` dans les requêtes
de conteneur : esbuild le renomme autrement dans les CSS modules, alors que le
conteneur Tailwind porte le nom global. Cette correction concerne le banc, pas
le CSS produit. Les seuils sont également à vérifier avec Next réel.

## Résultats

Les [observations finales](observations.json) comptent **42 scénarios réussis** :

- Présentation, recherche, effacement individuel des filtres, réinitialisation,
  valeurs longues et compteurs à neuf chiffres à 320, 390, 768, 1 440 et 1 920 px.
  Les grands compteurs sont un stress de présentation, pas un volume SQL mesuré.
- Noms accessibles des compteurs avec leur valeur ; identité protégée expliquée
  sans infobulle ; avatars décoratifs à côté du nom ; connexion récente, jamais
  effectuée ou masquée. Les tests de présentation existants couvrent également
  une date invalide et les années anciennes.
- Réinitialisation d'un résultat vide, sélection au clavier, Échap, retour du
  focus et contour visible en couleurs forcées à 320 et 1 440 px.
- Les quatre combinaisons de colonnes contact/sécurité à 1 100 puis 1 440 px :
  tableau/cartes et colonnes effectivement visibles selon les droits simulés.
  Recherche par email annoncée seulement avec le droit de contact.
- Compteur de synthèse ouvrant son sous-ensemble exact, en effaçant recherche,
  état et page tout en conservant le tri ; compte propre lié à Mon compte.
- Pagination lente conservant les 25 lignes et « Page 1 sur 2 », erreur,
  nouvelle tentative, 22 lignes de page 2, focus des résultats puis retour
  navigateur à la page 1.
- Nouvelle erreur après Réessayer avec focus rendu au bouton, puis succès avec
  focus des résultats ; changement de filtre ou nouvelle saisie pendant une
  reprise sans déplacement intempestif du focus.
- Réponse A après B sans remplacement des résultats récents ; retour navigateur
  pendant le délai de recherche ; filtre appliqué avant ce délai utilisant
  immédiatement la saisie courante, sans requête avec l'ancien texte.
- Purge des lignes et compteurs après 401/403, avec corps JSON ou non JSON ;
  filtre de sécurité interdit et page profonde normalisés avant la requête ;
  URL externe invalide revenant à la racine sans attente d'une autre interaction.
- Lecture seule, résultat vide, accès client refusé sans requête, annonces de
  chargement sans faux nombre et liens modifiés par Ctrl/Cmd/Maj/Alt.

Après cette passe, le scénario de pagination a été renforcé pour vérifier l'URL
de retour portée par les anciennes lignes. La
[reproduction avant correction](before-pagination-return.json) montre une ligne
de page 1 retournant à la page 2 encore en attente. Le
[rejeu après correction](pagination-return-observations.json) réussit : retour
à la page 1 pendant l'attente et après l'échec, puis à la page 2 après succès.
Ce dernier changement n'a pas entraîné un nouveau passage des 42 scénarios ;
le scénario concerné et le lint de `UsersListPage` ont été rejoués.

Les requêtes et quelques snapshots d'accessibilité sont conservés avec chaque
scénario. Les captures complètent les assertions : [390 px](users-390.png),
[1 440 px](users-1440.png), [1 920 px](users-1920.png),
[valeurs longues à 320 px](users-long-320.png),
[chargement à 320 px](users-loading-320.png) et
[couleurs forcées à 320 px](users-forced-colors-320.png).

## Constats de présentation corrigés

La [preuve initiale limitée au mobile](before-observations.json) conserve le
retrait d'un filtre laissant le focus sur `body`, ainsi que l'arbre accessible
sans nombres dans les noms des liens de synthèse ni explication de l'identité
protégée. Ce n'était pas une passe complète de l'ancien état.

- Les retraits et remises à zéro rendent le focus au champ de recherche.
- Réessayer rend le focus aux résultats en cas de succès, ou au bouton après
  un nouvel échec. Une nouvelle saisie annule cette intention de déplacement.
- Les compteurs annoncent leur catégorie et leur nombre, ou leur chargement.
- L'identité protégée est explicitée sous le nom ; l'icône et l'avatar de ligne
  sont décoratifs. Le tableau distingue donnée masquée et donnée absente.
- Les cartes respectent explicitement `canViewContact`, conservent l'email long
  lisible et utilisent le contour de focus commun. Leur survol possède le groupe
  nécessaire au style du nom.
- La pagination compose le contrat `displayedPage`/`changePage` des hooks pour
  présenter la page réellement reçue et créer l'historique approprié.
  Les liens de fiche et de Mon compte portent aussi cette page réellement
  affichée dans `returnTo`, même lorsqu'une autre page est demandée. Le contexte
  du lien de création reste celui de la navigation courante.

Les corrections de synchronisation et navigation des hooks ont été coordonnées
avec leur propriétaire puis vérifiées dans ce banc. Le CSS de composition et
les primitives partagées n'ont pas été modifiés dans cette passe de présentation.

Lint des composants et du test ajusté réussi ; les deux suites existantes
`users-list-presentation.test.ts` et `admin-users-list-a11y-contracts.test.ts`
comptent **11 tests réussis**. Les premières tentatives esbuild sous sandbox
Windows nécessitaient l'autorisation locale de lire le répertoire parent.

## Limites

Pas de session réelle, de PostgreSQL, de contrôle serveur des droits,
d'hydratation Next ou de parcours réel fiche → retour → rechargement dans ce
banc. Ces contrôles appartiennent au banc d'intégration de l'audit parent.
Les clics modifiés sont inspectés puis annulés par le banc pour ne pas ouvrir
de nouveau contexte : ils ne prouvent pas l'ouverture réelle d'un onglet Next.

L'autocomplétion est contrôlée par ses attributs, sans extension Bitwarden.
Aucun lecteur d'écran réel, zoom natif, Firefox, Safari/iOS ou appareil physique
n'a été exercé. L'absence de débordement du document et les snapshots Chromium
ne constituent pas une déclaration de conformité de toute la page.
