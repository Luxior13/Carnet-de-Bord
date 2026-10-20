# Banc client de la fiche utilisateur — 20 octobre 2026

[Fiche utilisateur](../../../pages/systeme/utilisateurs/README.md#fiche--reprise-en-profondeur--20-octobre-2026) · [Banc du 11 octobre](../../fiche-utilisateur-2026-10-11/banc-client/README.md)

Depuis la racine du dépôt :

```powershell
node docs/audits/fiche-utilisateur-2026-10-20/banc-client/run.cjs
```

Même fonctionnement que le [banc du 11 octobre](../../fiche-utilisateur-2026-10-11/banc-client/README.md) :
vraie page `/systeme/utilisateurs/[id]`, ses composants et son CSS, serveur
local éphémère, Chromium avec un contexte neuf par scénario, observations et
captures écrites dans un dossier temporaire affiché.

Passe exécutée le 20 octobre 2026 sur `main` (commit `2ddb3d8`) avec les
modifications non commitées de la reprise des deux listes et de la fiche. Elle
ne décrit pas ce commit seul.

## Avant la reprise

Le banc du 11 octobre, rejoué sur le code de départ, réussissait 46 scénarios
sur 48. Ses deux échecs étaient des attentes périmées depuis la refonte des
Autorisations du 18 octobre : texte « Autorisé » retiré des cartes et message
de double authentification reformulé. Captures « avant » :
[Profil 390 px](avant-profile-390.png), [Profil 1 440 px](avant-profile-1440.png),
[Autorisations 390 px](avant-access-390.png) et
[Sécurité 1 440 px](avant-security-1440.png).

## Changements par rapport au banc du 11 octobre

- Les deux attentes périmées suivent l’interface actuelle (bouton
  « Autoriser » enfoncé, message « Double authentification non activée… »).
- Dans chaque section et à chaque largeur : pas de carte « Vue d’ensemble » ;
  le bandeau porte « Actif », « Mot de passe à jour », « Double authentification
  activée », l’identifiant et la date de création ; plus de titre
  « Profil utilisateur ».
- Profil : aide grise sans modification, avertissement dès que l’identifiant
  change.
- Autorisations : total « X sur Y utilisables » dans la ligne d’aide.
- Compte personnel : interrupteur à moins de 20 px du bord droit de sa carte,
  plus de « ce membre ».
- Lecture seule de sa propre fiche : titre « Profil » pour les lecteurs
  d’écran, plus de « Profil administratif ».

## Résultats

Les [observations](observations.json) comptent **48 scénarios réussis sur 48**
(320, 390, 768, 1 440 et 1 920 px ; quatre sections, barre d’enregistrement,
conflits, sessions, double authentification, droits, changement de compte).
Captures après la reprise, par exemple [Profil 390 px](profile-390.png),
[Profil 1 440 px](profile-1440.png), [Autorisations 390 px](access-390.png),
[Compte personnel 1 440 px](account-1440.png) et
[Sécurité 1 440 px](security-1440.png).

Le banc de Mon compte du 11 octobre, rejoué sans modification, réussit 23
scénarios sur 23 avec le nouveau bandeau.

## Limites

Identiques au banc du 11 octobre : routeur, session et API simulés ; police de
repli ; aucun lecteur d’écran réel, Safari, Firefox ni appareil tactile. La
reprise ne change aucun contrat serveur.
