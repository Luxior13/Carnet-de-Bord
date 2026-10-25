# Banc client de la fiche personne — 22 octobre 2026

[Personne — Identité](../../../pages/membres/repertoire/fiche-identite.md#reprise--22-octobre-2026) · [Banc du 12 octobre](../../fiche-personne-2026-10-12/banc-client/README.md)

Depuis la racine du dépôt :

```powershell
node docs/audits/fiche-personne-2026-10-22/banc-client/run.cjs
```

Même fonctionnement que le [banc du 12 octobre](../../fiche-personne-2026-10-12/banc-client/README.md) :
vraie page `/membres/repertoire/[id]`, ses composants et son CSS, serveur local
éphémère, Chromium avec un contexte neuf par scénario. `AUDIT_ONLY` filtre les
scénarios.

Passe exécutée le 22 octobre 2026 sur `main` (commit `2ddb3d8`) avec les
modifications non commitées des reprises du 20 et du 22 octobre. Elle ne décrit
pas ce commit seul.

## Changements par rapport au banc du 12 octobre

- Le lecteur en lecture seule reçoit `persons:view_contact`, exigé depuis le
  15 octobre pour voir les coordonnées : le scénario de copie redevient
  significatif (il échouait sur le code de départ, 29 sur 30).
- À chaque largeur : plus de « Informations personnelles », titre « Identité »
  pour les lecteurs d’écran, « Créée le » et « Modifiée le » dans le bandeau,
  plus de pied « Dernière modification », « Zone dangereuse » visible.

## Résultats

Les [observations](observations.json) comptent **30 scénarios réussis sur 30**
(320, 390, 768, 1 024, 1 440 et 1 920 px ; identité, conflits, coordonnées,
dialogues, droits, lecture seule, provenance). Captures après la reprise :
[Identité 320 px](identite-320.png), [Identité 1 440 px](identite-1440.png),
[Coordonnées 320 px](coordonnees-320.png) et
[Coordonnées 1 440 px](coordonnees-1440.png). Avant :
[Identité 320 px](avant-identite-320.png), [Identité 1 440 px](avant-identite-1440.png)
et [Coordonnées 1 440 px](avant-coordonnees-1440.png).

## Limites

Identiques au banc du 12 octobre : routeur, session et API simulés ; police de
repli ; aucun lecteur d’écran réel, Safari, Firefox ni appareil tactile.

## Reprise du 25 octobre 2026

`run.cjs` simule `/api/auth/step-up` et accepte le mode `passwordProof`.
Nouveau scénario `suppression-fiche-mot-de-passe-puis-reprise` : sans preuve
récente, la suppression ouvre « Confirmer la suppression », puis reprend la
même demande. Libellés « superadmin » alignés. Passe complète : 31/31 ; non
archivée, détail dans l’[audit](../../2026-10-25-coherence-des-droits.md).
