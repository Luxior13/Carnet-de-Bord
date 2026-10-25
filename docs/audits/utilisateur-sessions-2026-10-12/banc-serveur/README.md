# Autorisation des sessions administratives à l’exécution

Complément ciblé du **12 octobre 2026**, départ `2ecb215`. Les
[résultats structurés](resultats.json) distinguent les dix régressions avant
correction, les treize scénarios SQL après correction et les 39 tests API simulés.

## Défaut reproduit et correction

GET et DELETE `/api/users/[id]/sessions` vérifiaient l’acteur avant la
transaction. Les filtres de cible et l’audit transactionnel existaient déjà,
mais une source révoquée, une version de sécurité tournée ou une permission
retirée après le snapshot d’authentification restaient acceptées. Les neuf cas
GET / suppression individuelle / suppression globale répondaient **200** au
lieu de **401/403**. Un dixième cas recevait également 200 après expiration
de la preuve MFA durant l’attente d’un verrou sur la cible.

La route utilise désormais
authorizeManagedSessions (retiré le 25 octobre 2026, logique reprise dans [user-sessions.service.ts](../../../../apps/web/src/features/users/server/user-sessions.service.ts))
dans sa transaction. Le verrou des deux comptes suit l’ordre de leurs
identifiants ; les contrôles de permission existants utilisent l’état relu.
Un verrou partagé sur la session source stabilise aussi sa présence face à une
déconnexion. Les échéances et la preuve sont évaluées après ces attentes.
Les contrôles de cible, les durées, les permissions et le contrat de réponse
restent les mêmes. Aucune migration ni autre action administrative modifiée.

## Vérifications SQL

PostgreSQL 17, 52 migrations existantes, base **`user_detail_service_test`**
sur **`127.0.0.1:54661`**. La variable dédiée
`USER_DETAIL_TEST_DATABASE_URL` et le garde-fou du fichier de test interdisent
une autre base ou un hôte distant. Aucune base habituelle utilisée.

Depuis `apps/web`, avec cette URL de test explicite :

```powershell
bun run test src/__tests__/user-detail-postgres.test.ts -t 'managed sessions|only unexpired|owned session|global session revocation'
bun run test src/__tests__/account-security-routes.test.ts
```

- **13 SQL réussis, 12 ignorés par sélection**, dans un fichier de 25 cas.
  Dix nouveaux cas refusent l’ancienne autorisation, préservent la session cible
  et n’ajoutent aucun audit. Les trois autres vérifient filtrage/projection,
  appartenance et révocation normale, puis rollback de la révocation globale
  et de sa version si l’audit obligatoire échoue.
- La preuve MFA est datée pour expirer pendant une attente réelle : une
  transaction retient le verrou cible et `pg_stat_activity` constate une attente
  de verrou avant sa libération. Le refus final est 403
  `REAUTHENTICATION_REQUIRED`.
- **39 API simulés réussis**, types et lint ciblé réussis. Les mocks ont été
  adaptés pour représenter la relecture de l’acteur et de la source.

La sémantique des verrous correspond à la
[documentation PostgreSQL 17](https://www.postgresql.org/docs/17/explicit-locking.html)
consultée via Context7 lors de la correction précédente des sessions personnelles.
`NO KEY UPDATE` conserve notamment la compatibilité avec les contrôles de clés
étrangères des insertions d’audit. Aucun nouveau mécanisme Prisma n’est utilisé.

## Limites

Le snapshot d’authentification, les en-têtes et quotas sont simulés ; les
comptes, sessions, permissions, requêtes, transactions et audits sont réels.
La fixture de retrait de permission conserve volontairement la version pour
tester le droit indépendamment de sa rotation. La date de preuve est fabriquée ;
ce test ne valide pas une saisie TOTP réelle. Les interleavings listés ne
prouvent pas toutes les combinaisons d’actions administratives ni la capacité
sous charge. Les parcours réels sont consignés dans le
[banc d’intégration](../banc-integration/README.md).

Une première relance a rencontré la contrainte du compte protégé unique dans
les fixtures conservées. Le test réutilise maintenant le compte protégé de sa
base isolée ; cet échec intermédiaire n’était pas un défaut produit.
