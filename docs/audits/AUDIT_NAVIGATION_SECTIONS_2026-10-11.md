# Barres de sections — 11 octobre 2026

## Périmètre et décision

Améliorations proposées puis approuvées par l'utilisateur : état actif plus
lisible, angles de 6 px, accès aux sections hors écran et explication du point de
brouillon. Départ sur `main`, commit `22cd268`, avec la proposition documentaire
locale déjà présente. Un seul composant de production modifié :
[PageSectionNavigation](../../apps/web/src/components/layout/PageSectionNavigation.tsx).

Consommateurs identifiés : `/mon-compte`, `/systeme/utilisateurs/[id]` et
`/membres/repertoire/[id]` via `EntityDetailLayout`. Leurs barres sont des liens
vers des URL, sans rôle ARIA tab. Aucune dépendance ajoutée, aucune mutation ni
règle de permissions modifiée.

Sélection Q01–Q30 : Q01–Q04, Q06 (brouillon), Q17 (coût du composant), Q19,
Q27 et Q30 examinés. Q07, Q09–Q16, Q18, Q22, Q24–Q26, Q28–Q29 hors impact :
retours métier, accès, données, cache, temps et exploitation inchangés.
Q05, Q08, Q20–Q21 et Q23 non applicables à cette navigation : pas de liste
métier, notification, pièce, import ou automatisation.

## Résultat livré

- Fond `surface-navigation-active`, icône `primary-emphasis`, soulignement
  conservé ; angles supérieurs de 6 px et liens d'au moins 48 px de haut.
- Deux flèches seulement si les sections dépassent la largeur disponible.
  Contrôles inactifs aux extrémités, maintien du focus, révélation horizontale
  du lien actif ou ciblé au clavier, réévaluation au redimensionnement.
- Infobulle Radix au survol/focus des sections modifiées, fermée par Échap ;
  conservation du texte accessible et des gardes de départ des formulaires.

Les flèches ne changent pas de section. Leur disparition rend le focus au lien
actif si une flèche le détenait. Le défilement animé respecte le mouvement réduit.
Règle courante : [design system](../references/DESIGN_SYSTEM.md#8-onglets-et-rails).

## Vérifications exécutées

Chromium Playwright, React 19.1.8 et styles réels, rendu de développement isolé ;
comptes et API fictifs, shell et navigation Next simulés. Pas de base utilisée.
[Banc reproductible](navigation-sections-2026-10-11/banc/README.md) et
[résultats structurés](navigation-sections-2026-10-11/observations.json).

| Contrôle | Résultat observé |
| --- | --- |
| Trois pages × 320, 390, 768 et 1 440 px | 12 scénarios réussis : liens, état actif unique, focus, changement de destination, absence de débordement horizontal de page |
| Navigation témoin à ces quatre largeurs | 4 scénarios réussis : flèches conditionnelles, défilement dans les deux sens, limites, focus, agrandissement/réduction et réduction du nombre de sections |
| Infobulle et liens | Survol, Tab, Échap et activation au clavier réussis ; Ctrl/Meta/Maj/Alt non interceptés par le composant dans le banc |
| Brouillon Mon compte | Point et infobulle visibles ; confirmation de départ puis annulation ; saisie et section Profil conservées |
| Barre collante et couleurs forcées | Barre à y=0 lors du défilement ; flèche sans déplacement vertical ; contour visible après Shift+Tab en couleurs forcées |
| Tactile émulé à 320 px | Appui sur flèche sans navigation, puis activation du dernier lien réussis |
| `bun run --filter web test` | 1 055 tests réussis, 25 ignorés ; 87 fichiers réussis et 2 ignorés |
| `bun run --filter web typecheck` et `lint` | Réussis |
| `bun run --filter web build` | Réussi avec valeurs d'environnement fictives pour la base et les clés ; aucune intégration authentifiée démontrée |
| `check:architecture` et `check:performance` du package web | Budgets respectés après build |
| `bun run docs:check` | Réussi : 188 fichiers et 1 110 liens locaux/index contrôlés |

Les essais intermédiaires ont relevé des défauts du banc : attente de l'état
après défilement, ordre de Tab autour de ses boutons témoins, navigation native
des événements synthétiques, hauteur témoin hors scan CSS et distinction
focus/focus clavier. Le banc corrigé a été rejoué intégralement : **20/20 réussis**.
Ces échecs de montage ne sont pas présentés comme des défauts du site.

Captures relues : [Mon compte, 390 px](navigation-sections-2026-10-11/account-390.png),
[Utilisateur, 1 440 px](navigation-sections-2026-10-11/user-1440.png),
[Répertoire, 390 px](navigation-sections-2026-10-11/person-390.png),
[débordement, 320 px](navigation-sections-2026-10-11/overflow-320.png) et
[brouillon](navigation-sections-2026-10-11/account-dirty-tooltip-390.png).
Toutes les identités et coordonnées des captures sont fictives.

## Portée de la conclusion

Conforme sur le périmètre vérifié. Session/API réelles, routeur et préchargement
Next, ouverture native d'un nouvel onglet, Safari/iOS, appareil physique,
lecteur d'écran et zoom natif non exécutés. Animation sans préférence de
mouvement réduit non mesurée. La garde complète de départ a été rejouée pour
Mon compte ; les mutations des fiches Utilisateur et Répertoire restent hors
de cette passe. Les contrôles d'intégration existants restent ouverts dans les
suivis, notamment NAV-02.

Suivis : [navigation](../qualite/pages/navigation-generale.md),
[Mon compte](../qualite/pages/mon-compte.md),
[Utilisateurs](../qualite/pages/systeme-utilisateurs.md),
[Répertoire](../qualite/pages/membres-repertoire.md).
