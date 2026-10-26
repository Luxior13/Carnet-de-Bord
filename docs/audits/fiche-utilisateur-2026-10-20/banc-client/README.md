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

## Reprise du 25 octobre 2026

Scénario `temporary-password-in-card` ajouté à 390 et 1 440 px, avec capture : le
mot de passe temporaire s’affiche dans la carte « Mot de passe » à la place de
son action. Passe complète : 50/50 ; non archivée, détail dans la
[fiche Sécurité](../../../pages/systeme/utilisateurs/fiche-securite.md#décisions-retenues).

## Reprise du 26 octobre 2026

Nouvel éditeur d’autorisations. Le scénario
`permissions-configured-blocked-and-scopes` suit le parcours téléphone : liste
des pages, ouverture du Répertoire (focus sur son titre), interrupteurs, action
estompée sans l’accès à sa page puis rétablie, retour « Toutes les pages » (focus
sur la page), compteur « 2 sur 7 utilisables », recherche « supprimer » et filtre
« Accordées ». Captures `access-*.png` remplacées à cinq largeurs, ajout de
[permissions-search-390.png](permissions-search-390.png). Scénario
`permissions-navigation-stays-in-view` (1 440 px) : après défilement jusqu’à la
dernière autorisation de la page Utilisateurs, la navigation et sa recherche
restent visibles ([capture](permissions-sticky-navigation-1440.png)) ; un clic
sur une autre page l’affiche depuis son début, le focus restant dans la liste.
Volets repris le même jour : bascule dans l’en-tête de la carte, captures
`access-*` et `account-*` remplacées à cinq largeurs. Puis carte en pleine
hauteur sur ordinateur : `permissions-workspace-columns-scroll` (1 440 × 1 000 :
page sans défilement, navigation immobile pendant le défilement de la page,
barre ancrée, ligne actionnée visible, [capture](permissions-workspace-1440.png))
et `permissions-low-screen-keeps-page-scroll` (1 440 × 650 : repli, navigation
collante). Finitions du même jour : en-tête sur une ligne (compteur attendu
seul, « X sur Y utilisables »), menu « Pôle » dans les scénarios (choix du pôle
Système, retour à Membres, recherche « utilisateur » depuis un autre pôle).
Puis, après le signalement du propriétaire (défilement sur portable) :
cadre simulé aligné sur le vrai (en-tête de 56 px, `#main-content` qui défile
dans une fenêtre de hauteur fixe) et scénario `permissions-workspace-laptop-screen`
à 1 366 × 650 ([capture](permissions-workspace-1366x650.png)) ; le repli est
joué à 480 px de haut. Scénario `permissions-granted-filter` : avec « Accordées », menu « Pôle »
limité à Membres et Système, pages et autorisations accordées seulement
([capture](permissions-granted-filter-1440.png)) ; une recherche affiche le
sommaire « Pages concernées » et y saute. Passe complète : 54/54.
