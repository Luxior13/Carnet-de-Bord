# Banc client Utilisateurs — 20 octobre 2026

[Liste des utilisateurs](../../../pages/systeme/utilisateurs/liste.md) · [Banc du 11 octobre](../../utilisateurs-2026-10-11/banc-client/README.md)

Depuis la racine du dépôt :

```powershell
node docs/audits/utilisateurs-2026-10-20/banc-client/run.cjs
```

Même fonctionnement que le [banc du 11 octobre](../../utilisateurs-2026-10-11/banc-client/README.md) :
vraie page `/systeme/utilisateurs`, ses composants et son CSS, serveur local
éphémère, Chromium avec un contexte neuf par scénario, observations et
captures écrites dans un dossier temporaire affiché. `AUDIT_ONLY` filtre les
scénarios.

Passe exécutée le 20 octobre 2026 sur `main` à partir du commit `2ddb3d8`, avec
les modifications de la [reprise du jour](../../../pages/systeme/utilisateurs/liste.md#reprise-en-profondeur--20-octobre-2026)
non commitées. Elle ne décrit pas ce commit seul.

## Changements par rapport au banc du 11 octobre

- La carte « Vue d’ensemble » n’existe plus : le banc vérifie son absence, les
  deux groupes « Filtrer par état » et « Filtrer par rôle », leurs compteurs et
  noms accessibles (« Tous, 3 comptes », « Administrateurs, 1 compte »), un
  seul menu (le tri) et l’absence de « par page ».
- `filters-and-reset-focus` : effacement par le bouton du champ, état
  « Désactivés » puis « Tous », rôle « Administrateurs » activé puis retiré par
  un second appui ; le focus reste sur le bouton actionné.
- `overview-exact-subset` devient `quick-filters-combine` : les filtres lus
  dans l’URL sont enfoncés, aucun compteur pendant une recherche, retirer le
  rôle garde la recherche et l’état.
- Focus : un seul anneau, celui de la ligne en tableau ou de la carte en mobile.
- `keyboard-select-and-escape` passe des filtres rapides au clavier puis au
  menu de tri.
- Colonnes : le champ s’intitule « Rechercher par nom ou identifiant » sans
  droit sur les contacts ; « Mot de passe à changer » n’existe qu’avec le droit
  sécurité.
- Chargement : filtres sans compteur et lignes en attente au lieu d’un bloc.

## Résultats

Les [observations](observations.json) comptent **42 scénarios réussis sur 42**
(320, 390, 768, 1 100, 1 440 et 1 920 px ; colonnes selon les droits, erreurs,
reprises, réponses tardives, 401 et 403, lecture seule, accès refusé, couleurs
forcées). Aucun débordement horizontal de document.

Observations et captures viennent d’une passe complète après l’ajout des
libellés de groupes (« État », « Rôle ») et de l’état enfoncé renforcé.
Captures après la reprise : [390 px](users-390.png), [1 440 px](users-1440.png),
[1 920 px](users-1920.png), [valeurs longues à 320 px](users-long-320.png),
[couleurs forcées à 320 px](users-forced-colors-320.png) et
[chargement à 320 px](users-loading-320.png). Avant la reprise, sur le
banc du 11 octobre : [390 px](avant-users-390.png) et
[1 440 px](avant-users-1440.png).

## Limites

Identiques au banc du 11 octobre : routeur, session, disponibilité et API
simulés ; police de repli ; sidebar réelle absente ; aucun lecteur d’écran réel,
Safari, Firefox ni appareil tactile. La reprise ne change aucun contrat serveur ;
session, hydratation Next et PostgreSQL n’ont pas été rejoués.
