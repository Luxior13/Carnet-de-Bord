# Navigation collée sous le header — 11 octobre 2026

Depuis la racine du dépôt :

```powershell
node docs/audits/navigation-sections-2026-10-11/banc-collant/run.cjs
```

Le filtre facultatif `AUDIT_ONLY` sélectionne un nom de scénario. Le script
annonce son dossier temporaire `noctambule-sticky-sections-*`, avec observations
JSON et captures. Il réutilise les contextes et la navigation simulés du
[banc des sections](../banc/README.md).

## Résultat

[10 scénarios réussis](observations.json), sur Chromium 149.0.7827.55 :

- Mon compte, fiche Utilisateur et fiche Personne à 390 et 1 440 px.
- Défilement horizontal et focus dans une barre débordante à 320 px.
- Fiche Utilisateur en paysage 900 × 480 px.
- Saut direct d'une barre sous la fenêtre vers son état collé, à 390 × 480 px.
- Apparition des sections après une liste initialement vide, à 390 px.

À chaque passage : ombre absente au repos, présente en position collée puis
retirée au retour en haut ; état `data-stuck` concordant ; fond opaque inchangé.
La navigation rejoint exactement le bord inférieur du vrai `Header`, à 56 px
dans ce banc. Sa hauteur extérieure reste **49 px**, comprenant les contrôles
de **48 px** et la bordure de 1 px déjà présente avant le changement.

Le repère de contenu, la hauteur défilable et la hauteur de la barre restent
constants. Focaliser un lien ou faire défiler horizontalement la barre ne déplace
pas le défilement principal. Aucune erreur JavaScript ni débordement horizontal
global n'a été observé.

Captures collées : [390 px](user-sticky-390.png) et
[1 440 px](user-sticky-1440.png). Les mesures numériques avant, pendant et après
le défilement sont conservées avec les verdicts.

## Montage et limites

Composants `Header`, `SidebarProvider`, `PageSectionNavigation` et trois
consommateurs réels, styles globaux et modules CSS recompilés. Le montage
reproduit un header hors du `main` défilant, comme le shell privé. La sidebar
complète n'est pas montée. Un espace fictif en fin de contenu permet de provoquer
le défilement lorsque le formulaire tient naturellement dans la fenêtre.

Les formulaires chargés de manière différée doivent être visibles avant les
mesures : mesurer uniquement l'apparition de la navigation donne une hauteur
de contenu provisoire qui ne représente pas la page prête.

Contextes, navigation et API simulés ; données fictives et police de repli.
Aucune session authentifiée, base réelle, mutation ou validation avec lecteur
d'écran n'est couverte. Les preuves du banc initial restent inchangées.
