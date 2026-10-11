# Banc des composants de liste — 11 octobre 2026

Exécution depuis la racine :

```powershell
node docs/audits/composants-2026-10-11/banc-listes/run.cjs
```

Le script compile les vrais composants avec esbuild et le CSS du projet, ouvre
un serveur local éphémère et lance Chromium isolé. Les sorties sont créées dans
un dossier temporaire `noctambule-list-controls-*` affiché au démarrage.
Les données sont fictives. Aucun compte, secret ou accès à la base n'est utilisé.

## Résultat conservé

[18 scénarios réussis](observations.json), à 320, 390, 768 et 1 440 px :

- Vrais outils de recherche Utilisateurs et Répertoire : Tab vers Effacer,
  activation avec Entrée, retour du focus au champ après disparition du bouton,
  remise à zéro de la recherche appliquée et de la page, soumission par Entrée,
  limite de 100 caractères, autocomplétion désactivée.
- Pagination partagée : première/dernière page, attente, erreur, absence de
  total connu, curseur précédent inconnu, reprise par Première page ; cibles
  de 44 px sous 640 px, absence de navigation quand le bouton est désactivé.
- Vraie liste Répertoire : réponse différée puis erreur de la page suivante,
  maintien du numéro associé aux anciennes lignes, nouvelle tentative réussie,
  focus en tête des résultats après arrivée des nouvelles lignes et retour
  à la page précédente.
- Effacement tactile, focus en couleurs forcées, absence d'erreur JavaScript
  et de débordement horizontal global.

Captures de compositions isolées : [Utilisateurs, 390 px](users-390.png) et
[Répertoire, 1 440 px](persons-1440.png). Les boutons placés au-dessus des
composants et l'état JSON en dessous sont des commandes du banc uniquement.

## Changements et responsabilités

- `ListSearchField` possède les attributs du champ, la présentation commune et
  le retour du focus après effacement. Le consommateur garde la recherche
  différée, les permissions de recherche, les critères et l'URL.
- `ListPagination` possède les contrôles précédent/suivant et leur désactivation.
  La page fournit les capacités réellement disponibles, le total connu facultatif
  et l'action de reprise ; le composant n'invente ni curseur ni accès direct.
  Les deux composants s'utilisent dans la portée CSS `directory` existante.
- `Pagination` reste disponible pour les pages numérotées connues ; ses boutons
  ne soumettent pas le formulaire environnant et acceptent un blocage commun.
- Le Répertoire distingue désormais page demandée et page des résultats reçus.
  Son hook restitue le focus après une pagination réussie, comme Utilisateurs.
- Les primitives `Select` compact, `DataTableSection`, tableau/cartes et
  squelettes existants sont conservés : leurs responsabilités sont déjà utiles
  et leurs variations restent attachées aux données de chaque liste.

## Limites

Les contrôleurs des outils isolés sont simulés. La liste Répertoire utilise son
vrai composant, son hook et son client HTTP avec navigation et réponses API
simulées. Aucune intégration Next authentifiée, permission serveur, requête SQL,
charge réseau réelle ni utilisation avec lecteur d'écran n'est validée ici.
La police est une police de repli. Les vérifications des autres composants et
les contrôles globaux sont consignés séparément par la revue transverse.
