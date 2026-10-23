# Banc client de la création de fiche personne — 23 octobre 2026

[Nouvelle fiche](../../../pages/membres/repertoire/creation.md#reprise--23-octobre-2026) · [Banc du 12 octobre](../../creation-personne-2026-10-12/banc-client/README.md)

Depuis la racine du dépôt :

```powershell
node docs/audits/creation-personne-2026-10-23/banc-client/run.cjs
```

Même fonctionnement que le [banc du 12 octobre](../../creation-personne-2026-10-12/banc-client/README.md),
avec la vraie page `/membres/repertoire/nouveau`, ses composants et son CSS, et
une API simulée. Passe du 23 octobre 2026 sur `main` (commit `47a8193`) avec
les modifications non commitées de la reprise.

## Changements

Le scénario de composition vérifie en plus, à chaque largeur : plus d’en-tête
« Informations essentielles », plus de « Un pseudo suffit » répété, la règle
présente une fois sous le pseudo, et aucun « Modifications non enregistrées »
dans la barre.

## Résultats

Les [observations](observations.json) comptent **28 scénarios réussis sur 28**.
Captures : [320 px](creation-320.png), [1 440 px](creation-1440.png),
[résultat incertain à 320 px](incertitude-320.png) ; avant la reprise :
[320 px](avant-creation-320.png) et [1 440 px](avant-creation-1440.png). Le
menu Statut apparaît entouré sur les captures parce que le scénario lui donne
le focus clavier juste avant.

## Limites

Routeur, session et API simulés ; police de repli ; aucun lecteur d’écran réel.
