# Banc client du Répertoire — 20 octobre 2026

[Liste du Répertoire](../../../pages/membres/repertoire/liste.md) · [Banc du 11 octobre](../../repertoire-2026-10-11/banc-client/README.md)

Depuis la racine du dépôt :

```powershell
node docs/audits/repertoire-2026-10-20/banc-client/run.cjs
```

Même fonctionnement que le [banc du 11 octobre](../../repertoire-2026-10-11/banc-client/README.md) :
vrais composants de `/membres/repertoire` et leur CSS, serveur local éphémère,
Chromium avec un contexte neuf par scénario, observations et captures écrites
dans un dossier temporaire affiché. `AUDIT_ONLY` filtre les scénarios.

Passe exécutée le 20 octobre 2026 sur `main` à partir du commit `f224f80`, avec
les modifications de la [reprise du jour](../../../pages/membres/repertoire/liste.md#reprise-en-profondeur--20-octobre-2026)
non commitées. Elle ne décrit pas ce commit seul.

## Changements par rapport au banc du 11 octobre

- La carte « Vue d’ensemble » n’existe plus : le banc vérifie son absence et
  interroge le groupe « Filtres rapides » (boutons `aria-pressed`, compteurs,
  noms accessibles « Tous, 3 fiches »).
- `filters-and-reset-focus` choisit « Hors structure » par son filtre rapide ;
  le focus reste sur le bouton actionné.
- `overview-filter-and-empty` devient `quick-filter-and-empty` : bascule
  « Sans coordonnées » aller et retour, disparition des compteurs qui ne
  correspondent plus au résultat (statuts combinés, recherche sans résultat).
- Focus : un seul anneau, celui de la ligne en tableau ou de la carte en mobile ;
  le lien n’a plus de contour propre.
- `filters-keyboard-and-escape` passe des filtres rapides au clavier puis au
  menu de tri (le menu de statut est retiré).
- Lecture seule : le champ s’intitule « Rechercher par pseudo ou nom » et le
  filtre Sans coordonnées est absent (attente périmée du 11 octobre, REP-28).
- Valeurs longues : compteur à neuf chiffres du filtre « Tous » sans
  débordement à 320 px.

## Résultats

Les [observations](observations.json) comptent **41 scénarios réussis sur 41**,
aux mêmes largeurs et parcours que le 11 octobre (320, 390, 768, 1 440 et
1 920 px ; chargement, vide, erreurs, reprises, accès refusé, lecture seule,
couleurs forcées). Aucun débordement horizontal de document.

Captures après la reprise : [390 px](directory-390.png),
[1 440 px](directory-1440.png), [1 920 px](directory-1920.png),
[valeurs longues à 320 px](directory-long-320.png),
[chargement à 320 px](directory-loading-320.png) et
[couleurs forcées à 320 px](directory-forced-colors-320.png).
Avant la reprise, sur le même banc : [390 px](avant-directory-390.png) et
[1 440 px](avant-directory-1440.png).

La capture de chargement vient d’une seconde passe limitée au scénario
`initial-loading` (réussi), après l’alignement mobile du squelette sur la barre
réelle (menu de tri pleine largeur, filtres rapides à 44 px).

## Limites

Identiques au banc du 11 octobre : routeur, session, disponibilité et API
simulés ; police de repli Arial ; sidebar réelle absente ; aucun lecteur d’écran
réel, Safari, Firefox ni appareil tactile. La reprise ne modifie aucun contrat
serveur ; session, hydratation Next et PostgreSQL n’ont pas été rejoués.
