# Rôles métier et périmètres d’accès

Conception cible révisée le 22 septembre 2026. Le moteur actuellement livré est décrit dans [Permissions](permissions.md). Les portées et modèles de rôles proposés ici ne sont pas encore des fonctions actives.

## Décision du 25 octobre 2026 — modèle d’autorisation retenu (REV-15)

Décision prise sur délégation du propriétaire (« fait ce que tu recommande »,
[revue complète](../audits/2026-10-23-revue-complete.md#suivi--lot-5-mots-de-passe-25-octobre-2026)).
Le modèle actuel (deux rôles, surcharges JSON dans `User.permissions`) reste
en place pour les pages livrées ; la cible ci-dessous est **retenue** et se
construit avec le chantier « Accès & responsabilités métier » (étape 1 de la
[feuille de route](../propositions/feuille-de-route.md)), **au plus tard avec le
premier module dont les droits dépendent d’une équipe ou d’une entité**. Aucune
table n’est créée avant ce consommateur.

- **Liaison compte ↔ personne** : une ligne datée par compte (compte, fiche
  Personne, auteur, date, fin éventuelle), créée par une action explicite et
  auditée, jamais par rapprochement d’email ou de nom. Elle porte la portée
  « soi ».
- **Affectations datées** : compte, capacité ou modèle de rôle, type de portée
  (`structure`, `entité`, `équipe`, `soi`), identifiant de portée, début, fin,
  auteur, motif, révocation. Un modèle de rôle propose des capacités au moment de
  l’attribution ; le faire évoluer n’étend pas les affectations existantes.
- **Politique par module** : `features/<module>/server/policy.ts` expose
  `can(acteur, action, ressource)`, évaluée sur les affectations actives à la
  date de l’action, dans la transaction de la mutation, comme le garde
  `authorizeUserAction` aujourd’hui. Listes, totaux, recherches et exports
  filtrent par la même politique.
- **Reprise de l’existant** : les surcharges de `User.permissions` deviennent
  des affectations de portée `structure` ; l’éditeur actuel devient l’éditeur
  de cette portée. Le compte racine et la règle « un ADMIN possède toutes les
  autorisations administratives » sont conservés.

## Séparer fonction métier et administration technique

Les rôles techniques actuels restent `USER` et `ADMIN`, avec le régime particulier du compte protégé. « Bureau », « président », « trésorier » ou « coach » décrivent des responsabilités métier ; ils ne doivent pas accorder automatiquement l’administration des comptes et de la sécurité.

Un modèle de rôle métier propose un ensemble de capacités et de périmètres. Il doit être revu lors de l’attribution, journalisé et ajustable. Une évolution du modèle ne doit pas étendre silencieusement les accès déjà accordés.

| Profil cible | Accès métier de départ à définir | Limites essentielles |
| --- | --- | --- |
| Joueur ou membre | Convocations, documents attendus, tâches et demandes personnelles | Pas d’accès implicite à tout le répertoire ou aux dossiers sensibles |
| Coach ou manager | Effectifs, planning, préparation, candidatures utiles à ses équipes | Équipes et périodes attribuées ; pas de finance ou RH globale |
| Secrétariat | Adhésions, documents et gouvernance confiés | Pièces sensibles selon mission |
| Trésorerie | Factures, comptes, règlements et contrôles autorisés | Entités concernées et séparation des validations |
| Communication | Publications et éléments partenaires nécessaires | Pas de dossiers disciplinaires ou financiers complets |
| Direction ou bureau | Pilotage et décisions relevant du mandat | Les accès sensibles et techniques restent explicitement attribués |
| Administration technique | Comptes, configuration et sécurité nécessaires | La fonction technique ne constitue pas à elle seule une mission métier |

Ce tableau exprime une cible de conception ; il ne décrit pas une restriction déjà appliquée au compte protégé par le code actuel. Toute évolution de ce régime nécessitera un chantier explicite et ses tests.

## Décision serveur par ressource

Une autorisation cible combine :

- la capacité demandée : lire, créer, modifier, valider, exporter… ;
- l’entité juridique concernée ;
- le périmètre : soi-même, équipes attribuées, dossiers confiés ou ensemble autorisé ;
- la période d’affectation et l’état du dossier ;
- sa confidentialité et les éventuelles règles de séparation des responsabilités.

« Toutes mes équipes » ne signifie pas toutes les saisons ni toutes les données de leurs membres. Un coach ayant quitté une équipe ne conserve pas automatiquement l’accès aux nouveaux dossiers.

Les valeurs `self`, `team` et `all` sont des intentions de portée, pas des permissions suffisantes. La politique serveur tranche à chaque lecture, mutation et export. Elle s’applique aussi aux totaux, recherche, notifications, fichiers et vues agrégées.

## Personne et utilisateur

Les comptes et les personnes restent deux objets distincts. Toute attribution personnelle future nécessite une liaison explicite contrôlée ; aucune association automatique par email ni déduction à partir d’un nom identique.

Une personne sans compte reste possible. Une arrivée, un départ ou un changement d’équipe ne doit ni dupliquer son identité ni supprimer les traces de ses anciennes actions.

## Validations et délégations

La file globale rassemble les demandes accessibles, mais le module propriétaire contrôle la décision, le montant, les pièces et l’état. Un simple droit d’ouvrir la file ne permet pas de tout approuver.

Définir selon le risque les règles d’auto-approbation, les seuils, le second regard, les délégations temporaires, leur révocation et leur audit. Les droits de délégation eux-mêmes sont vérifiés par le serveur ; un modèle de rôle ne contourne pas les règles existantes.

**Délégation de la gestion des accès — orientation proposée le 26 octobre 2026, non décidée.**
Aujourd’hui, `users:grant_access` / `users:revoke_access`, attribués par le seul
superadmin (`users:delegate_access`), permettent à un utilisateur de donner,
sur toute la structure, les autorisations qu’il détient lui-même. À terme, la
délégation devient **par portée** : un responsable attribue des **modèles de
rôle** à l’intérieur de son équipe ou de son entité, pour une période, jamais
au-delà de ce qu’il détient ; certains droits ne se délèguent pas
(administrateurs, délégation elle-même, finances validées, données de
mineurs) ; chaque délégation est datée, auditée, révocable et revue
périodiquement. Le mécanisme global actuel reste en place, inactif tant que
personne ne le reçoit, et se transforme avec les affectations datées (REV-15).

Les sorties de structure prévoient le retrait des accès, les tâches de restitution et la conservation des traces nécessaires. Les dossiers sensibles ne deviennent pas visibles par une notification trop détaillée.

## Ouverture progressive

Les permissions futures restent réservées et inactives jusqu’à la livraison du module, de ses politiques, de son audit et de ses tests. Aucun rôle prédéfini ne les rend effectives à l’avance.

L’espace personnel s’enrichit avec les modules livrés. Le menu reflète les accès actifs, mais sa visibilité ne remplace jamais le contrôle serveur. Les huit pôles de la cible produit ne modifient pas à eux seuls les groupes actuels de l’éditeur de permissions.

Cas à vérifier lors de chaque ouverture : refus hors entité/équipe, révocation, changement de période, dossiers sensibles, accès aux pièces, exports et notifications. Les besoins de MFA et les règles du compte protégé restent régis par le moteur actif.
