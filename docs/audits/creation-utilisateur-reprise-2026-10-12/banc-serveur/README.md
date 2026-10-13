# Création : autorisation encore valable avant l’écriture

Complément ciblé du **12 octobre 2026**, départ `31091b3`. Les
[résultats](resultats.json) séparent six régressions reproduites avant correction,
la création après correction et la non-régression des sessions administratives.

## Défaut et correction

POST `/api/users` contrôlait les droits et la preuve ADMIN avant le calcul
bcrypt. Le service créait ensuite le compte sans relire l’autorité de l’acteur.
Les six cas SQL recevaient **200** : source retirée ou expirée, version tournée,
permission retirée, acteur désactivé après le hash ; puis preuve ADMIN expirant
durant une attente réelle de verrou. Ces cas renvoient désormais **401/403**,
sans compte, réservation, audit ni secret de réponse.

[createUser](../../../../apps/web/src/features/users/server/user-create.service.ts)
exige le contexte d’acteur/source. Après bcrypt, dans la transaction et avant
la première écriture, il utilise
[authorizeUserAction](../../../../apps/web/src/shared/server/user-action-authorization.ts).
Cette garde relit compte, session, droits et échéances sous les verrous déjà
éprouvés pour les sessions administratives. Le service contrôle ensuite le droit
du compte racine et la preuve récente pour ADMIN. Une erreur métier typée porte
le refus ; le POST la traduit en réponse sans données.

La garde possède deux consommateurs actuels. L’adaptateur HTTP
[des sessions](../../../../apps/web/src/features/users/server/user-session-authorization.ts)
conserve ses refus et filtres de cible. Pas de catalogue de politiques, migration,
nouveau rôle, changement de durée ou table d’idempotence. Compte, réservation et
audit restent atomiques ; générateur du secret et coût bcrypt inchangés.

## Vérifications exécutées

PG17, **52 migrations**, bases locales jetables `creation_service_test` et
`user_detail_service_test` sur `127.0.0.1:54662`. Les fichiers SQL exigent leurs
variables dédiées et ces noms de bases sur un hôte local ; aucun repli vers
`DATABASE_URL`. Depuis `apps/web` :

```powershell
bun run test src/__tests__/user-create-api.test.ts src/__tests__/user-create-postgres.test.ts src/__tests__/user-create-authorization-postgres.test.ts src/__tests__/auth-transactions.test.ts src/__tests__/account-security-routes.test.ts
bun run test src/__tests__/user-detail-postgres.test.ts -t 'managed sessions|only unexpired|owned session|global session revocation'
```

- **110 réussis** dans les cinq premiers fichiers : **11 SQL création**
  (six régressions d’autorisation et cinq contrats d’intégrité existants),
  plus **99 tests simulés**. Les cinq contrats gardent création USER/ADMIN,
  hash réel, unicité des demandes concurrentes, réservation historique et
  rollback sur échec d’audit.
- **13 SQL sessions réussis, 12 ignorés par filtre** après extraction : source,
  version, droit retiré, preuve périmée sous verrou, filtrage des sessions,
  appartenance, révocation normale et rollback d’audit.
- TypeScript et lint ciblé réussis sans avertissement. Les adaptations de mocks
  transmettent désormais le contexte obligatoire au service.

## Portée des preuves

Le POST, le service, bcrypt et PostgreSQL sont réels ; le snapshot de session,
les en-têtes et quotas sont simulés. Cinq changements d’autorité sont injectés
juste après le vrai hash et avant la transaction. Pour ADMIN, un verrou `User`
est réellement tenu ; `pg_stat_activity` constate l’attente, puis la preuve
expire avant libération. Avant correction l’attente pouvait survenir plus tard,
au contrôle de clé étrangère de l’audit ; après correction elle survient avant
la création, dans la garde. L’horodatage de preuve reste une fixture.

Un essai intermédiaire a omis deux champs MFA obligatoires de la fixture Session,
puis a été corrigé ; aucune défaillance produit n’en a été déduite. Ces scénarios
ne couvrent pas toutes les courses possibles ni la charge. Ils ne sont pas
additionnés à la suite globale standard lorsque celle-ci ignore les SQL faute
de variables dédiées. Les [parcours navigateur réels](../banc-integration/README.md)
et leur nettoyage sont documentés séparément.
