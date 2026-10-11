# Banc client du Répertoire — 11 octobre 2026

Depuis la racine du dépôt :

```powershell
node docs/audits/repertoire-2026-10-11/banc-client/run.cjs
```

Le script compile les vrais composants de `/membres/repertoire` et leur CSS,
ouvre un serveur local éphémère, puis lance Chromium avec un contexte neuf par
scénario. Il écrit les observations et captures dans un dossier temporaire dont
le chemin est affiché. `AUDIT_ONLY` permet de filtrer les noms de scénarios.

La passe conservée a été exécutée sur `main`, à partir du commit
`f967c3c143528b98489562378debb2a430febe94`, avec les corrections locales de cet
audit. Elle ne décrit pas ce commit seul.

## Environnement et périmètre

`PersonsPageClient`, `PersonsList`, `PersonsListToolbar`, `PersonListCells`,
`PersonOverview`, leurs avatars, badges, états, menus, skeletons et primitives
partagées proviennent du code produit. Le banc charge le CSS global et les CSS
modules, avec une police de repli Arial, le fuseau Europe/Paris et le mouvement
réduit. La version de Chromium figure dans les observations.

Le routeur, la session, la disponibilité du module et l'API sont **simulés**.
Le shell réserve seulement 240 px à la navigation desktop : la sidebar réelle
est hors de ce banc. Toutes les personnes, coordonnées et identités des captures
sont fictives. Le filtrage du jeu simulé ne valide pas la recherche SQL.

## Résultats conservés

Les [observations](observations.json) comptent **41 scénarios réussis** :

- À 320, 390, 768, 1 440 et 1 920 px : affichage, liens de fiches, focus visible,
  types de coordonnées dans l'arbre d'accessibilité, compteurs nommés, noms
  absents ou longs, compteurs à neuf chiffres, recherche, effacement, statut,
  tri, réinitialisation et filtre Sans coordonnées. Aucun débordement horizontal
  de document n'a été constaté dans ces scénarios.
- En desktop : date du 11 octobre 2026 à 10 h 30 UTC rendue à 12 h 30 à Paris,
  provenance accessible au clavier et fermeture de l'infobulle par Échap.
- Chargement initial, répertoire vide, recherche sans résultat, disponibilité
  absente, refus de lecture côté client et rôle avec lecture seule.
- Liens avec Ctrl, Cmd, Maj ou Alt non interceptés par le gestionnaire de liste.
  Le banc annule ensuite lui-même l'action native pour garder son contexte ;
  il ne démontre pas l'ouverture d'un véritable nouvel onglet Next.
- Données initiales utilisées sans requête superflue, puis rechargées après
  recherche et retour aux critères initiaux ; purge des fiches et compteurs
  après réponses 401 et 403 ; erreur de pagination puis filtre sans vol du focus.
- Réponse A arrivant après B et navigation A retardée pendant une nouvelle
  saisie B : le texte et les résultats récents sont conservés. Les scénarios
  correspondants comptent exactement trois requêtes, initiale + A + B.
- Réessayer après erreur initiale ou actualisation en échec : retour du focus
  aux résultats après succès, au bouton Réessayer après un nouvel échec.
- Menus au clavier et Échap à 320 et 1 440 px ; contour de focus visible en
  couleurs forcées aux mêmes largeurs ; motif de correspondance par coordonnée.

Les journaux de requêtes, noms accessibles et quelques styles calculés sont
conservés avec les assertions. Les captures suivantes complètent ces preuves :
[390 px](directory-390.png), [1 440 px](directory-1440.png),
[1 920 px](directory-1920.png), [valeurs longues à 320 px](directory-long-320.png),
[chargement à 320 px](directory-loading-320.png) et
[couleurs forcées à 320 px](directory-forced-colors-320.png).

## Défauts de présentation corrigés

- La réinitialisation des filtres et le retrait du filtre Sans coordonnées
  faisaient disparaître le bouton actif et laissaient le focus sur `body`.
  Le champ de recherche reçoit maintenant le focus.
- Les types des coordonnées étaient portés par un `aria-label` sur des spans
  génériques, ignoré dans l'arbre d'accessibilité observé. Ils utilisent un texte
  masqué visuellement, avec pluriels lisibles ; le tiret vide est accompagné de
  « Aucune coordonnée ».
- Le nom accessible des liens de synthèse masquait leur nombre. Il inclut
  maintenant la catégorie et le nombre de fiches, ou l'état de chargement.

Les défauts de reprise, synchronisation et focus propres à `PersonsList` ont
été transmis à son propriétaire pendant l'audit, corrigés, puis rejoués ici.
Leur suivi et les décisions courantes appartiennent au rapport de page.

Vérifications complémentaires : lint des trois composants de présentation
modifiés réussi ; `person-search-ux.test.ts`, 18 tests réussis. Les premières
tentatives esbuild sous sandbox Windows n'avaient pas accès au répertoire parent ;
les commandes ont ensuite été exécutées avec l'autorisation locale appropriée.
Deux échecs intermédiaires venaient du banc : sélection Radix envoyée avant le
focus effectif, et épaisseur de contour système attendue trop précisément.

## Limites

Ce banc ne valide ni session réelle, ni contrôle serveur des permissions, ni
requête PostgreSQL, ni hydratation Next, ni restauration après visite réelle
d'une fiche. Il ne réalise aucune mutation et n'emploie aucune base de données.
Ces preuves doivent être complétées par l'intégration de l'audit parent.

Les attributs d'autocomplétion sont vérifiés sur la recherche ; aucune extension
Bitwarden ou navigateur avec coffre n'est utilisée. Aucun lecteur d'écran réel,
Safari/iOS, Firefox, zoom natif ou appareil tactile physique n'a été exercé.
Les snapshots d'accessibilité et les couleurs forcées Chromium ne constituent
pas une déclaration de conformité de toute la page.
