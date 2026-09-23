# Rôles métier et périmètres d’accès

Conception cible révisée le 22 septembre 2026. Le moteur actuellement livré est décrit dans [PERMISSIONS.md](PERMISSIONS.md). Les portées et modèles de rôles proposés ici ne sont pas encore des fonctions actives.

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

Les sorties de structure prévoient le retrait des accès, les tâches de restitution et la conservation des traces nécessaires. Les dossiers sensibles ne deviennent pas visibles par une notification trop détaillée.

## Ouverture progressive

Les permissions futures restent réservées et inactives jusqu’à la livraison du module, de ses politiques, de son audit et de ses tests. Aucun rôle prédéfini ne les rend effectives à l’avance.

L’espace personnel s’enrichit avec les modules livrés. Le menu reflète les accès actifs, mais sa visibilité ne remplace jamais le contrôle serveur. Les huit pôles de la cible produit ne modifient pas à eux seuls les groupes actuels de l’éditeur de permissions.

Cas à vérifier lors de chaque ouverture : refus hors entité/équipe, révocation, changement de période, dossiers sensibles, accès aux pièces, exports et notifications. Les besoins de MFA et les règles du compte protégé restent régis par le moteur actif.
