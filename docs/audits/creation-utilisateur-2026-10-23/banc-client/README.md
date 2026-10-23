# Banc client de la création d’utilisateur — 23 octobre 2026

[Nouvel utilisateur](../../../pages/systeme/utilisateurs/creation.md#reprise--23-octobre-2026) · [Banc du 11 octobre](../../creation-utilisateur-2026-10-11/banc-client/README.md)

Depuis la racine du dépôt :

```powershell
node docs/audits/creation-utilisateur-2026-10-23/banc-client/run.cjs
```

Même fonctionnement que le [banc du 11 octobre](../../creation-utilisateur-2026-10-11/banc-client/README.md),
avec la vraie page `/systeme/utilisateurs/nouveau`, ses composants et son CSS,
et une API simulée. Passe du 23 octobre 2026 sur `main` (commit `47a8193`) avec
les modifications non commitées de la reprise.

## Changements

Le scénario `responsive-form-success` vérifie en plus, à chaque largeur : plus
d’en-tête « Création du compte », plus de message de barre, plus de « pour vous
connecter », l’aide grise sur le mot de passe temporaire ; il capture le
formulaire, que l’ancien banc ne capturait pas.

## Résultats

Les [observations](observations.json) comptent **28 scénarios réussis sur 28**.
Formulaire : [320 px](form-320.png), [390 px](form-390.png),
[768 px](form-768.png), [1 440 px](form-1440.png), [1 920 px](form-1920.png) ;
confirmation : [390 px](success-390.png), [1 440 px](success-1440.png).

## Limites

Routeur, session et API simulés ; police de repli ; aucun lecteur d’écran réel.
Pas de capture « avant » du formulaire.
