# Cohérence des droits par profil — 25 octobre 2026

[Index des audits](README.md) · [Méthode d’audit](../methode/audit.md) ·
[Domaine Permissions](../domaines/permissions.md) · [Revue complète du 23 octobre](2026-10-23-revue-complete.md)

## Question, périmètre et état examiné

- **Demande du propriétaire (25 octobre 2026)** : se mettre à la place d’un
  utilisateur normal avec chaque permission, seule ou combinée, puis d’un
  administrateur et du superadmin, et vérifier en profondeur que tout est
  logique et cohérent partout.
- **Type** : audit transverse des droits. Périmètre : les 26 autorisations
  délégables, les 2 liées au rôle, les 7 capacités personnelles, les
  11 pages, les 32 routes d’API et les cibles d’une fiche utilisateur
  (compte standard, administrateur, superadmin, soi-même).
- **État examiné** : branche `main`, commit `fc654e5` avec les changements
  locaux du 23 au 25 octobre (non commités). Mode développement.
- **Données** : aucune donnée réelle ; profils et cibles fictifs.

### Méthode et preuves

| Preuve | Ce qu’elle établit | Limite |
| --- | --- | --- |
| Matrice calculée par le code réel (sonde Vitest temporaire, supprimée ensuite) | Pour chaque profil : droits effectifs, menu, capacités du Répertoire, de la liste et de la création d’utilisateurs, des Paramètres, et capacités de la fiche utilisateur sur quatre cibles | Calcul des capacités, pas un rendu navigateur par profil |
| Lecture des 32 routes d’API et des services | Contrôle serveur de chaque action, règles de cible (soi, administrateur, superadmin) | Aucun parcours HTTP nouveau |
| Lecture des pages et composants | Concordance entre ce que l’interface propose et ce que le serveur accepte | — |
| Suites existantes | 1 240 tests web et 227 tests PostgreSQL réussis le même jour | Couvrent les règles serveur, pas chaque combinaison d’interface |

Profils calculés : utilisateur sans droit ; utilisateur avec chacune des
26 autorisations délégables, prérequis compris, comme l’éditeur les active ;
utilisateur privé de chacune des capacités personnelles ; administrateur ;
superadmin.

## Ce qui est cohérent

- **Un droit ouvre exactement sa page ou sa section, rien de plus.**
  - Sans ses prérequis, un droit est inactif ; l’éditeur les active avec lui.
  - Exemple : `users:revoke_sessions` seul donne la liste des utilisateurs,
    la rubrique Sécurité et la révocation des sessions d’un compte standard,
    sans autre action.
- **Interface et serveur appliquent la même règle.** Les 32 routes vérifient le
  droit de l’action, puis les règles de cible : jamais soi-même depuis
  l’administration, jamais le superadmin, un administrateur seulement par le
  superadmin. Toute action que l’interface masque est aussi refusée par le
  serveur.
- **Coordonnées et sécurité.**
  - Sans `persons:view_contact`, les coordonnées du Répertoire disparaissent
    partout, côté interface et côté serveur : liste, recherche, filtre « Sans
    coordonnées », fiche et provenance.
  - Sans `users:view_security`, l’état du mot de passe et de la double
    authentification disparaît de la liste, du bandeau et de la fiche, et le
    filtre « Mot de passe à changer » est absent et refusé.
- **Sa propre fiche** : en lecture seule, avec un renvoi vers Mon compte.
  L’interrupteur d’état est désactivé, même pour un détenteur de
  `users:update_status`.
- **Superadmin vu par les autres** : identité masquée (« Superadministrateur »),
  seule la rubrique Profil est visible et aucune action n’est possible.
- **Attribution des droits.**
  - On n’accorde que des droits que l’on possède.
  - Seul le superadmin modifie le droit de délégation.
  - Un accès critique exige la double authentification complète de la cible.
  - Les raisons affichées dans l’éditeur reprennent celles du serveur.
  - La disponibilité de la double authentification de la cible n’est envoyée
    qu’à un détenteur de `users:grant_access`.
- **Suppression d’un compte encore actif** : le message s’adapte, selon que
  l’acteur peut ou non le désactiver lui-même.
- **Paramètres système** : réservés au rôle Administrateur, jamais délégables à
  un utilisateur ; l’accès direct par adresse est refusé.
- **Mon compte** : les capacités personnelles sont toujours actives, sauf la
  modification du prénom et du nom (`account:update_profile`). Une saisie
  refusée est expliquée.
- **Administrateur** : tous les droits délégables. Il ne modifie, ne
  réinitialise ni ne supprime un autre administrateur ; il le voit en lecture
  seule.
- **Superadmin** : tous les droits. Il ne s’administre pas lui-même (Mon
  compte, procédure hors ligne pour sa double authentification) et n’a pas
  d’appareil de confiance.

## Constats

| ID | Nature, priorité | Constat | Recommandation |
| --- | --- | --- | --- |
| DRT-01 | Défaut, P2 | La fenêtre « Réinitialiser la double authentification » demandait « Votre mot de passe superadmin », alors que l’action est délégable depuis REV-11 | **Corrigé le 25 octobre** : « Votre mot de passe » |
| DRT-02 | Défaut, P3 | L’aide de l’identifiant citait « Modifier les identifiants de connexion », alors que le droit s’appelle « Modifier l’identifiant de connexion » | **Corrigé le 25 octobre** |
| DRT-03 | Incohérence, P2 | La création d’un compte propose et enregistre l’« Email de contact » pour tout détenteur de `users:create`, même sans droit de voir ni de modifier les adresses de contact. Le Répertoire crée une fiche sans coordonnées, qui s’ajoutent ensuite avec leur droit | **Corrigé le 25 octobre** : champ affiché seulement avec `users:update_contact` (ou au superadmin), adresse refusée par le serveur sinon ; test « refuses a contact address at creation without users:update_contact » |
| DRT-04 | Incohérence, P2 | Un membre sans aucun droit d’administration voit le pôle « Système », section « Administration », qui ne contient que « Feuille de route » | **Corrigé le 25 octobre** : section « Projet » dans le pôle Système, « Administration » limitée à Utilisateurs et Paramètres ; résumé « Comptes, configuration et projet » ; banc navigation 19/19 |
| DRT-05 | Incohérence, P2 | Le même compte porte cinq noms dans l’interface : « compte racine » (messages), « Superadmin » (badge et filtre), « Superadministrateur » (nom masqué), « super-administrateur » (onglet Autorisations), « superadmin » | **Corrigé le 25 octobre** : « Superadmin » comme étiquette et nom masqué, « superadmin » dans les phrases ; « compte racine » et « superadministrateur » restent des termes de recherche |
| DRT-06 | Incohérence, P2 | Supprimer une fiche du Répertoire (irréversible, données personnelles) ne demande aucune confirmation du mot de passe, alors que supprimer un compte en exige une datant de 30 minutes au plus | **Corrigé le 25 octobre** : mot de passe de 30 minutes au plus vérifié dans la transaction ; la zone dangereuse ouvre « Confirmer la suppression » puis reprend la même demande ; tests unitaires et SQL, banc fiche personne 31/31 |
| DRT-07 | Suggestion, P3 | Un utilisateur délégué ne voit nulle part la liste de ses propres autorisations : il les découvre par le menu | **Corrigé le 25 octobre** : section « Accès » de Mon compte, carte « Vos accès » ([fiche](../pages/mon-compte/acces.md)) ; banc Mon compte 28/28 |

## Verdict

Le modèle tient : chaque autorisation, seule ou combinée, ouvre ce qu’elle
annonce et rien d’autre, et le serveur applique partout les mêmes règles que
l’interface. Aucun accès indu n’a été trouvé (aucun P0 ni P1). Les écarts
relevés sont des incohérences de présentation ou de règles entre modules.
DRT-01 et DRT-02 sont corrigés ; DRT-03 à DRT-07 l’ont été le même jour
après accord du propriétaire (« ok go »).

Limites : capacités calculées par le code réel et règles serveur couvertes par
les suites existantes. Aucun parcours navigateur n’a été joué pour chaque
profil ; les bancs client existants couvrent l’administrateur et le
superadmin.
