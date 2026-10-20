# Clôture du socle — autorisation du compte personnel et MFA

Revue commencée le 12 octobre 2026 depuis `c54e5d8`, contrôles finaux le
13 octobre à 00:02, heure de Paris. Ce complément serveur appartient à la
clôture générale ; il ne constitue pas un nouvel audit complet de Mon compte.

## Défauts confirmés et correction

| Cas | Reproduction sur les sources initiales | Résultat corrigé |
| --- | --- | --- |
| Profil, contact, mot de passe et démarrage MFA | L'authentification capture une session valide ; cette source expire ensuite en SQL. Chacune des quatre mutations renvoie 200. | Relecture transactionnelle de l'acteur et de sa source avant écriture : 401, sans changement ni audit de succès. |
| Preuve MFA sensible | Après le snapshot d'authentification, la preuve de mot de passe est retirée de la session en SQL. Le défi TOTP sensible renvoie 200. | La preuve de mot de passe courante est relue sous verrou : 403, TOTP non consommé et aucun nouvel audit. |
| Rotation des codes de secours | Une transaction maintient un verrou sur la session source. La rotation attend réellement, puis la session expire avant libération. Le serveur renvoie 200. | Contrôle de l'échéance après l'attente du verrou : 401, version, session, preuve TOTP et audit inchangés. |

Les [six échecs avant correction](avant.json) ont été rejoués sur les sept
fichiers de production originaux, puis les sources corrigées ont été restaurées
dans un bloc `finally`. Vingt-neuf autres cas étaient exclus par ce filtre.
Les [résultats finaux](resultats.json) proviennent ensuite des sources corrigées.

La garde commune `shared/server/user-action-authorization.ts` est réutilisée :
acteur `User`, puis source `Session`, puis date effective après les attentes.
Les versions optimistes, consommations de preuve, modifications et audits restent
dans leur transaction. Une demande sans changement de profil ou de contact
passe aussi par cette relecture ; elle ne produit ni mutation ni audit.

`createSession` applique cette garde aux remplacements de session depuis une
source existante, avant de tourner sa version. L'inscription MFA obligatoire
depuis un défi de connexion sans session conserve son contrat distinct.
Le changement initial obligatoire du mot de passe conserve son exception
explicite. Aucune permission, durée, table, migration ou politique de quota
n'est ajoutée. Les permissions personnelles toujours actives restent conformes
au [contrat des permissions](../../../domaines/permissions.md).

## Couverture et commandes

Depuis `apps/web`, avec `ACCOUNT_TEST_DATABASE_URL` et
`LOGIN_TEST_DATABASE_URL` renseignées vers les bases locales dédiées :

```text
bun run test src/__tests__/account-postgres.test.ts src/__tests__/login-postgres.test.ts
```

**52 SQL réussis, aucun ignoré** : 35 du compte personnel, dont les six nouvelles
régressions, et 17 de la connexion/MFA. Deux attentes historiques du service
`createSession` ont été adaptées au refus désormais typé
`UserActionAuthorizationError`, code `UNAUTHORIZED`, statut 401 ; les contrôles
de rollback et de session inchangée ont été conservés.

La couverture rejouée inclut profil/contact et conflits, mot de passe et
révocation des autres sessions, sessions personnelles, activation/remplacement
MFA, rotation des secours, quotas de connexion, consommation unique des preuves,
rollback d'audit et échéances après verrous. Les cas existants de connexion
TOTP/secours et de démarrage obligatoire restent réussis.

```text
bun run test src/__tests__/auth-transactions.test.ts src/__tests__/contact-email-route.test.ts src/__tests__/step-up-route.test.ts src/__tests__/mfa-setup-route.test.ts src/__tests__/mfa-management-route.test.ts
```

**77 tests unitaires/routes simulées réussis, cinq fichiers.** Leurs mocks ont été
adaptés à la relecture transactionnelle ; le test du contact inchangé exige
désormais une transaction, tout en interdisant écriture et audit. Ces 77 cas
font partie de la suite générale : ils ne s'ajoutent pas une seconde fois à son
total. Les 39 tests voisins des routes de sécurité ont été rejoués séparément
par l'agent responsable de ces routes.

Lint ciblé et contrôle de types réussis. La construction et l'intégration HTTP
de la clôture sont consignées par le rapport racine, sans être déduites de ce
banc SQL.

## Environnement et limites

PostgreSQL 17 temporaire, port 54663, bases `account_service_test` et
`login_service_test`, après les 52 migrations existantes. Les suites exigent
leur variable dédiée, une adresse locale et le nom exact ; aucune base habituelle
n'est utilisée. Le port historique du banc de connexion a été retiré de sa garde,
sans retirer les autres protections.

Dans le banc personnel, le snapshot d'authentification, les quotas, les cookies
et les en-têtes sont simulés ; les routes, services, mots de passe, TOTP,
chiffrement, transactions et données sont réels. Le retrait et l'expiration
interviennent en SQL après ce snapshot. L'attente de verrou est observée via
`pg_stat_activity`, pas déduite d'un simple délai. Dans le banc de connexion,
l'authentification, les sessions et quotas sont réels ; seuls les adaptateurs
d'en-têtes/cookies et l'environnement de test sont simulés. Les mots de passe
de préparation utilisent un coût bcrypt réduit : ce n'est pas une mesure de charge.

Ce banc n'éprouve ni HTTP navigateur, ni middleware/CSRF, ni application mobile
TOTP, ni transport perdu. Il ne qualifie pas une restauration, une disponibilité
en production ou une conformité juridique. Il n'apporte aucune nouvelle
promesse de révocation instantanée des données déjà affichées. Le nettoyage du
cluster commun reste sous la responsabilité du banc racine.

Sélection proportionnée : besoins et invariants Q01, données/validation,
permissions, erreurs, concurrence, sécurité, architecture et tests examinés ;
composition et navigation inchangées dans ce lot serveur, vérifiées par le lot
client. Aucun sujet de notification, fichier, finance ou relation future n'est
créé pour cette correction.
