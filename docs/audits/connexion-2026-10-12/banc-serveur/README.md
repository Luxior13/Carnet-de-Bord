# Connexion et MFA — banc serveur du 12 octobre 2026

Ce banc vérifie les routes de connexion, configuration MFA, vérification et
annulation avec leurs services et une vraie base PostgreSQL isolée. Départ
`0fd674a`, arbre propre avant la revue. Les résultats structurés sont dans
[observations.json](observations.json).

## Défaut reproduit et correction

`createSession` enregistrait l'heure de contrôle avant sa transaction. L'écriture
conditionnelle de la ligne User pouvait ensuite attendre un autre verrou SQL.
La précondition MFA utilisait encore cette ancienne heure : un challenge expiré
pendant l'attente pouvait être consommé et créer une session.

Deux scénarios réels, LOGIN et SETUP, ont répondu **200 au lieu de 401 avant
correction**. Ils raccourcissent uniquement l'échéance d'une fixture, bloquent
la ligne User, observent la requête en attente dans `pg_locks`, puis libèrent
le verrou après cette échéance. La requête n'est pas simulée et aucune horloge
globale n'est remplacée.

Le service prend maintenant un instant de revalidation après l'acquisition du
verrou User. Cet instant contrôle la session source éventuelle et la
précondition MFA. Les deux scénarios répondent **401** ; aucune session ni
réussite d'audit n'est persistée et la consommation du défi est annulée.
Deux cas complémentaires vérifient une session source dont l'expiration absolue
ou d'inactivité survient pendant cette même attente : le remplacement est refusé
et l'ancienne session/version ne sont pas modifiées.

La correction n'augmente aucune durée ni aucun quota. Les durées de session
restent calculées depuis le début de l'opération. Aucun schéma ni migration
supplémentaire n'est nécessaire.

## Environnement et reproduction

- PostgreSQL 17 local, port `54599`, base exclusivement réservée
  `login_service_test` ; **52 migrations existantes appliquées** via
  `packages/database/scripts/safe-migrate-deploy.ts`, avec `DATABASE_URL`
  explicitement dirigée vers cette cible. Aucune base habituelle utilisée.
- Le [test SQL](../../../../apps/web/src/__tests__/login-postgres.test.ts)
  exige `LOGIN_TEST_DATABASE_URL`, un hôte loopback, le port et le nom ci-dessus.
  Sans variable, il est ignoré. Il ne démarre ni ne migre PostgreSQL.
- Comptes, identifiants et secrets uniquement fictifs. Le test emploie une clé
  de chiffrement locale constante et un hash bcrypt de coût 4 pour ses fixtures ;
  ce n'est pas une mesure du coût bcrypt de production.
- La table `RateLimit` de cette seule base est vidée entre scénarios. Les audits
  ne sont pas supprimés par contournement ; leurs fixtures restent dans la base
  jetable jusqu'au nettoyage de l'environnement.
- Les triggers SQL temporaires injectant une panne d'audit sont limités au
  compte fictif du scénario et retirés dans un `finally`.

Depuis la racine, après préparation du cluster isolé et des migrations :

```powershell
$env:LOGIN_TEST_DATABASE_URL = 'postgresql://postgres@127.0.0.1:54599/login_service_test?schema=public'
Push-Location apps/web
bun run test src/__tests__/login-postgres.test.ts src/__tests__/login-route.test.ts src/__tests__/mfa-verify-route.test.ts src/__tests__/mfa-setup-route.test.ts src/__tests__/mfa-server.test.ts src/__tests__/auth-transactions.test.ts
Pop-Location
Remove-Item Env:LOGIN_TEST_DATABASE_URL
```

## Résultats vérifiés

**17 scénarios PostgreSQL réussis** :

| Groupe | Cas réellement exercés |
| --- | --- |
| Refus et limites de mot de passe | Réponse publique identique pour compte inconnu, désactivé, verrouillé ou mauvais mot de passe ; cinquième échec verrouillé/audité, sixième requête refusée 429 avec `Retry-After` |
| Sessions courtes et mémorisées | Identifiant canonique, mot de passe seul limité au défi, token hashé en base, session retrouvée par `getAuthSession`, bornes 1 jour/30 minutes ou 30 jours/7 jours |
| Limites MFA | Cinq codes incorrects puis refus ; un nouveau challenge ne contourne pas le quota du compte |
| Concurrence et rejeu | Deux vérifications concurrentes TOTP puis récupération : un seul succès, une seule session et un seul audit ; ancien code refusé avec un nouveau challenge |
| Configuration obligatoire | Activation, version de sécurité avancée, dix codes stockés sous forme de hashes, session MFA et confirmation déjà consommée refusée |
| Audit requis | Échec SQL d'audit à la connexion et à la confirmation de configuration : rollback des sessions, preuves, credentials, codes et version concernés ; reprise ensuite réussie |
| État du compte | Changement de version ou désactivation après mot de passe : défi refusé, aucune session |
| Annulation | Retrait du challenge et de son enrôlement exact, sans activer MFA ni créer une session |
| Échéances pendant verrou | LOGIN, SETUP, expiration absolue de session source et inactivité : attentes réellement observées dans PostgreSQL puis refus après échéance |

**69 tests existants ciblés** réussissent dans les cinq autres fichiers de la
commande, soit **86 réussites au total**. TypeScript et lint ciblé sont passés.
Les tests existants couvrent notamment le compte racine sans appareil mémorisé,
les cookies et l'atomicité du service dans un environnement simulé ; leur
réussite ne les transforme pas en essais PostgreSQL.

## Portée et limites

Les handlers, validations, bcrypt, TOTP, chiffrement, hashes de récupération,
limiteurs SQL, transactions, contraintes et audits sont réels. Les cookies
Next sont représentés par une Map et les en-têtes par un contexte vide ; ce
banc ne valide pas le transport des cookies, CSRF, middleware, navigateur,
redirection `next`, QR scanné sur téléphone ni perte de réponse HTTP.

Les échéances des quatre cas de verrou sont rapprochées dans les fixtures.
Cela prouve la revalidation après attente, sans attendre les durées naturelles
de cinq/dix minutes ou plusieurs jours. La validité des codes TOTP utilise
l'horloge réelle. Les courses ciblent deux requêtes ; aucun test de charge
multi-processus ni mesure de vitesse n'est revendiqué.

Le démarrage d'un enrôlement conserve son comportement de dix minutes après
revalidation. Aucun contrat courant imposant une borne absolue depuis le
premier mot de passe n'a été trouvé ; cette revue ne change pas cette politique
ni ne présente sa reconduction comme un défaut prouvé.
