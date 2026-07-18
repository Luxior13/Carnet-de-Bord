# Exploitation du socle applicatif

Ce document complète le contrat de création des fonctionnalités. Il décrit les
processus qui doivent accompagner l'application en production.

## Processus obligatoires

- Le serveur web est déployé après `bun run db:migrate:deploy` puis validé par
  `GET /api/health/ready`.
- Un worker séparé exécute `bun run --filter web worker`. Un seul worker suffit
  au départ ; plusieurs instances peuvent ensuite partager la file grâce aux
  verrous PostgreSQL `SKIP LOCKED`.
- Pour un ordonnanceur sans processus permanent, exécuter
  `bun run --filter web worker --once` à intervalle court.
- Les secrets restent dans le gestionnaire de secrets du déploiement. La table
  `SystemSetting` n'accepte que les paramètres non secrets du catalogue fermé.

## Déploiement

1. Exécuter `bun install --frozen-lockfile` et `bun run check`.
2. Créer une sauvegarde et conserver le fichier JSON avec son fichier
   `.sha256` dans un stockage chiffré distinct du serveur.
3. Exécuter `bun run db:migrate:deploy`.
4. Démarrer le web et le worker.
5. Attendre une réponse HTTP 200 de `/api/health/ready` avant de recevoir du
   trafic. La readiness contrôle le schéma, les enums, les index critiques et
   l'unicité du compte racine protégé.

### Migration canonique des permissions du 18 juillet 2026

La migration `20260718120000_canonical_live_permissions` est une migration de
contrat : elle remplace les anciennes clés stockées et supprime les droits
obsolètes. Elle ne doit jamais coexister avec un ancien binaire qui ne connaît
que les anciennes clés.

- Drainer le trafic, puis arrêter toutes les instances web et tous les workers
  avant `db:migrate:deploy`.
- Vérifier qu'aucun ancien processus ne peut redémarrer automatiquement pendant
  la migration.
- Déployer uniquement le nouveau web et le nouveau worker après le succès de la
  migration, puis rouvrir le trafic après la readiness.
- Pour une infrastructure rolling sans fenêtre de maintenance, ne pas exécuter
  cette migration en l'état : livrer d'abord le code dual-read sur toutes les
  instances, migrer après leur drainage complet, puis retirer les alias dans
  une version ultérieure.

La sauvegarde de l'étape 2 est obligatoire pour ce changement de données.

## Sauvegarde et restauration

- Programmer une sauvegarde quotidienne et surveiller son code de sortie.
- Répliquer les sauvegardes hors machine avec chiffrement au repos et politique
  de rétention.
- Réaliser au minimum chaque trimestre un exercice de restauration dans une
  base vide et isolée avec `db:restore --dry-run`, puis avec la confirmation
  explicite documentée dans `packages/database/prisma/README.md`.
- Une sauvegarde n'est considérée valide qu'après vérification du checksum et
  démarrage réussi de l'application restaurée.

## Surveillance minimale

- Alerter sur la readiness, les réponses HTTP 5xx/429, les tâches `FAILED` et
  les tâches `RUNNING` dont le verrou expire fréquemment.
- Centraliser les logs JSON et conserver le `requestId` entre proxy, serveur et
  collecteur. Les champs sensibles sont masqués par le logger applicatif.
- Suivre la durée et le volume des requêtes principales ; utiliser les curseurs
  signés pour toute liste non bornée.
- Revoir les seuils de rétention et de limitation après mesure réelle, jamais
  en supprimant les garde-fous dans une route isolée.

## Évolution

Chaque nouvelle table doit être ajoutée à la migration, à la readiness, au
manifeste de sauvegarde/restauration et à une politique de rétention. Chaque
nouvelle tâche de fond doit avoir une clé d'idempotence, un nombre maximal de
tentatives et un handler enregistré dans le worker.
