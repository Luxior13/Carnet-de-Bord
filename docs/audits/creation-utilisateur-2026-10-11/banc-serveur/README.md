# Création de compte et intégrité serveur

Contrôle du **11 octobre 2026**, depuis le commit `d1d61ee`, du POST
`/api/users` et de la création consommée par `/systeme/utilisateurs/nouveau`.
Les tests PostgreSQL utilisent une base locale jetable avec les **52 migrations
du projet**, sans modification de la base applicative distante. Le schéma produit
ne change pas.

## Corrections et responsabilités

- [user-create.service.ts](../../../../apps/web/src/features/users/server/user-create.service.ts)
  porte maintenant la création métier, auparavant dans le module partagé
  d'authentification. Compte, réservation permanente de l'identifiant et audit
  restent dans une transaction ; la fabrique d'audit devient obligatoire dans
  son contrat. Le POST transmettait déjà cet audit avant l'extraction.
- Le [POST](../../../../apps/web/src/app/api/users/route.ts) conserve validation,
  permissions, réauthentification, projection de réponse et traduction des
  collisions. Sa prélecture d'identifiant ne demande désormais que `id`.
- [temporary-password.ts](../../../../apps/web/src/shared/server/temporary-password.ts)
  partage le générateur entre création et réinitialisation. Les 14 caractères,
  quatre catégories et bcrypt à 12 tours sont conservés. Les tirages de
  caractères et le mélange utilisent `crypto.randomInt`, dont la
  [documentation Node 24](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptorandomintmin-max-callback)
  précise l'absence de biais modulo. La documentation a été consultée via
  Context7. Cela retire le biais de l'ancien calcul par reste, sans conclure à
  une compromission antérieure ni à une distribution uniforme de tous les
  mots de passe respectant ces catégories.
- [auth.test.ts](../../../../apps/web/src/__tests__/auth.test.ts) teste le vrai
  générateur au lieu d'une copie locale. Les autres helpers historiques de ce
  fichier ne sont pas concernés par cette correction.

## Résultats

[Observations structurées](observations.json). **246 tests ciblés réussis**
sur sept fichiers, puis **5 tests PostgreSQL réussis**. Après les derniers
ajustements de typage et de formatage, les 23 tests POST et les 5 tests SQL ont
été rejoués ensemble : **28 réussis**, aucune omission.

| Couche | Contrôles exercés | Limite du contrôle |
| --- | --- | --- |
| [POST, 23 cas](../../../../apps/web/src/__tests__/user-create-api.test.ts) | Anonyme ; dépendance `users:create` à `users:view` ; entrées strictes ; normalisation ; ADMIN réservé au compte racine avec preuves mot de passe et MFA récentes ; collision ; réponse et audit sans secret persistant | Source de session et stockage simulés ; fonctions de permissions, preuve récente et projection réelles |
| [PostgreSQL, 5 cas](../../../../apps/web/src/__tests__/user-create-postgres.test.ts) | Création USER et ADMIN avec vrai hash bcrypt et vérification ; réservation et audit uniques ; absence de session ; deux créations concurrentes du même identifiant ; ancien identifiant réservé après renommage ; échec réel d'insertion audit puis reprise | Service réel, Prisma et SQL réels ; adaptateurs de requête et acteur fictifs, sans serveur HTTP |
| [Transactions existantes](../../../../apps/web/src/__tests__/auth-transactions.test.ts) | Contrat transactionnel de création et réinitialisation consommatrice du générateur partagé | Persistance simulée dans ce fichier |

La collision concurrente laisse exactement un compte, une réservation et un
audit. Une réservation historique empêche une nouvelle attribution. Un trigger
temporaire provoque une panne d'insertion d'audit : le compte et sa réservation
sont annulés ; après retrait du trigger, la même tentative aboutit. Aucun mot de
passe temporaire ni hash n'est enregistré dans les preuves du banc.

## Rejouer

Le test SQL exige `USER_CREATION_TEST_DATABASE_URL`, un hôte `localhost` ou
`127.0.0.1` et la base nommée exactement `creation_service_test`. Il ne se replie
jamais sur `DATABASE_URL`. Préparer une base jetable vide et lui appliquer les
migrations par le wrapper du dépôt, avec son URL locale explicite ; le test ne
crée ni cluster ni migrations. La base utilisée ici est sur le port 54594.

Depuis `apps/web`, après préparation de cette base :

```powershell
$env:USER_CREATION_TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:54594/creation_service_test?schema=public'
bun run test -- src/__tests__/user-create-api.test.ts src/__tests__/user-create-postgres.test.ts
```

Sans cette variable, les cinq cas PostgreSQL sont **ignorés**, pas réussis.
Les données fictives, leurs audits et réservations sont conservés dans cette
seule base jetable ; les triggers de panne sont retirés dans le nettoyage du
test. Une nouvelle exécution utilise des identifiants aléatoires distincts.
La destruction du cluster relève du propriétaire du banc d'intégration.

Sélection de régression exécutée depuis `apps/web` :

```powershell
bun run test -- src/__tests__/user-create-api.test.ts src/__tests__/auth.test.ts src/__tests__/auth-transactions.test.ts src/__tests__/users-access-hardening.test.ts src/__tests__/users-list-api.test.ts src/__tests__/create-user.schema.test.ts src/__tests__/password.utils.test.ts
```

Le lint des dix fichiers serveur/tests touchés et le contrôle TypeScript ont
réussi. Les durées de Vitest décrivent l'exécution de tests, pas un budget de
latence HTTP ni une mesure de capacité. Aucune optimisation du coût bcrypt
n'est justifiée par cette passe. L'intégration session, navigateur, formulaire
et reprise après réponse perdue est suivie dans le
[banc d'intégration](../banc-integration/run.cjs).
