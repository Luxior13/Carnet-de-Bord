# Fiche utilisateur et mutations serveur

Contrôle du **11 octobre 2026**, depuis le commit `96143d7`, de
`/api/users/[id]` et de ses actions de mot de passe, MFA et sessions. La base
PostgreSQL locale jetable `user_detail_service_test` reçoit les **52 migrations
du projet**. Aucune base applicative distante, nouvelle migration ou nouvelle
permission n'intervient dans cette passe.

## Défauts reproduits et corrections

1. **Effacement du nom facultatif** : les deux cas `''` et espaces obtenaient
   auparavant 200 avec l'ancien nom `Dupont`, sans écriture. Le service traite
   désormais explicitement une valeur fournie vide ; le prénom reste intact,
   et l'audit contient l'ancienne valeur et la nouvelle chaîne vide.
2. **Version de fiche facultative** : prénom, nom et état pouvaient être envoyés
   sans `expectedUpdatedAt`. Le filtre transactionnel couvrait une concurrence
   pendant la requête, sans exiger la version chargée par le formulaire. Le
   schéma impose maintenant cette version pour tous les champs. Trois cas SQL
   et sept cas HTTP de version absente sont refusés ; deux éditions concurrentes
   depuis la même version donnent exactement un succès, un conflit et un audit.
3. **Session invalide présentée comme active** : une session non expirée dont
   `securityVersion` était antérieure à celle du compte apparaissait dans le
   GET. La reproduction SQL retournait deux sessions au lieu d'une. Le nettoyage
   et la lecture excluent maintenant aussi les versions de sécurité différentes.

[Observations structurées](observations.json).

## Responsabilités et garanties conservées

- [user-update.schema.ts](../../../../apps/web/src/features/users/user-update.schema.ts)
  porte la validation stricte et les helpers de scopes. La syntaxe du message
  de champ requis a été vérifiée dans la
  [documentation Zod 4](https://github.com/colinhacks/zod/blob/v4.3.6/packages/docs/content/error-customization.mdx)
  via Context7 ; Zod 4.4.3 est installé.
- [user-update.service.ts](../../../../apps/web/src/features/users/server/user-update.service.ts)
  prépare les différences et exécute la transaction compte, réservation,
  révocation et audit obligatoire. La
  [route](../../../../apps/web/src/app/api/users/[id]/route.ts) conserve les
  permissions effectives, les règles racine/ADMIN/soi, les preuves récentes et
  les erreurs HTTP. Des gardes inatteignables, déjà couvertes par les refus en
  amont, ont été retirées ; aucune capacité n'a été élargie.
- [user-detail.service.ts](../../../../apps/web/src/features/users/server/user-detail.service.ts)
  partage une sélection explicite avec le PATCH. Le hash de mot de passe et
  les secrets MFA ne sont plus chargés pour ces lectures. La projection finale
  reste appliquée avant toute réponse.
- `criticalAccessReady` reste réservé à la racine ou à un délégataire disposant
  effectivement de `users:grant_access`. Il ne révèle pas les champs MFA et
  disparaît pour une racine tierce ; un lecteur simple ne le reçoit pas.
- Réinitialisation du mot de passe, suppression inactive et révocations
  conservent leurs transactions et preuves existantes. La lecture du reset MFA
  et ses tests existants ont été revérifiés ; son parcours avec véritables
  mot de passe et TOTP relève du banc d'intégration de cet audit.

## Preuves exécutées

**230 tests réussis sur sept fichiers**, dont 20 nouveaux cas HTTP et 15 cas
PostgreSQL. TypeScript et lint ciblé des neuf fichiers serveur/tests passent.

| Preuve | Résultat vérifié |
| --- | --- |
| [HTTP et projection](../../../../apps/web/src/__tests__/user-detail-api.test.ts) | Anonyme ; dépendances des permissions ; révocation ; version obligatoire ; quatre combinaisons contact/sécurité ; readiness ; identité racine masquée ; absence de hash, secret MFA et version de sécurité dans le DTO |
| [PostgreSQL](../../../../apps/web/src/__tests__/user-detail-postgres.test.ts) | Nom vide ; version requise ; conflit concurrent ; réservation historique ; contact dévérifié ; distinction politique personnelle/accès ; reset réel avec bcrypt ; session ancienne ; révocation individuelle et globale ; suppression après désactivation |
| Pannes SQL injectées | Échec d'audit lors d'un changement de login, d'un reset de mot de passe et d'une révocation globale : compte, réservation, hash, sessions et version restent cohérents ; renommage rejoué avec succès après retrait du trigger |
| Régressions existantes | Permissions/scopes/preuves ; racine et ADMIN ; protection contre les mutations personnelles par l'administration ; reset MFA ; autres transactions d'authentification |

Les triggers de panne sont temporaires et retirés dans le nettoyage. Les fixtures,
audits et réservations restent dans cette seule base jetable. Les preuves
conservées ne contiennent ni mot de passe temporaire, ni hash, ni secret MFA.

## Rejouer

Préparer une base locale vide nommée exactement `user_detail_service_test`,
puis appliquer les migrations existantes avec le wrapper du dépôt et son URL
locale explicite. Le test vérifie l'hôte (`localhost` ou `127.0.0.1`), le nom de
base et la présence des migrations. Aucun repli vers `DATABASE_URL`.

Depuis `apps/web` :

```powershell
$env:USER_DETAIL_TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:54595/user_detail_service_test?schema=public'
bun run test -- src/__tests__/user-detail-api.test.ts src/__tests__/user-detail-postgres.test.ts src/__tests__/users-access-hardening.test.ts src/__tests__/user-permission-mutation-proof.test.ts src/__tests__/account-security-routes.test.ts src/__tests__/admin-mfa-reset-route.test.ts src/__tests__/auth-transactions.test.ts
```

Sans cette variable, les quinze cas PostgreSQL sont **ignorés**, pas réussis.
Les noms fictifs aléatoires permettent plusieurs exécutions sans purge des
audits et réservations. Le propriétaire du banc gère ensuite le cluster jetable.

## Portée des conclusions

Les routes, règles métier, Prisma, bcrypt et transactions sont réels dans les
cas PostgreSQL ; la source de session, les en-têtes et la limite de requêtes
sont simulés. Le compte acteur en base sert aux snapshots d'audit ; ses
capacités sont fournies par cette session simulée. Les tests HTTP seuls
simulent aussi le stockage, en conservant permissions et projections réelles.

Cette passe ne mesure pas le débit HTTP, les appareils ou la latence distante.
Les lectures de fiche utilisent la clé primaire existante ; aucun besoin
d'index, cache ou traitement asynchrone supplémentaire n'a été démontré. Les
parcours navigateur, sessions authentifiées et remise de secrets sont validés
séparément par le banc d'intégration.
