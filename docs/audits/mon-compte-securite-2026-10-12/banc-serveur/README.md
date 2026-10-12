# Révocation personnelle et autorisation concurrente

Preuves du 12 octobre 2026 pour `DELETE /api/auth/sessions`. Une demande
authentifiée pouvait continuer après rotation de sécurité ou disparition de
sa session source. Les quatre régressions initiales retournaient **200** au
lieu de **401**, en révocation globale comme individuelle.

[L’état SQL initial](baseline-state.json) confirme la conséquence : les quatre
fixtures originales n’ont plus aucune session et ont chacune un audit de
révocation. La [lecture dédiée](read-baseline.cjs) est spécifique à cette base
fraîche, dont les quatre premiers comptes étaient les fixtures avant correction.

## Correction et contrôles

La transaction verrouille le compte par `FOR NO KEY UPDATE`, avec compte actif,
non supprimé et version de sécurité inchangée. Elle relit ensuite la session
source : propriétaire, token, version et deux échéances. L’horloge est lue
**après l’attente du verrou**. La suppression et son audit requis restent dans
la même transaction ; aucune écriture n’est autorisée depuis l’ancien état.

Le verrou sérialise les modifications du compte sans bloquer les contrôles de
clé étrangère des audits. Le choix a été vérifié via Context7 dans la
[documentation PostgreSQL 17 sur les verrous de ligne](https://www.postgresql.org/docs/17/explicit-locking.html).
Il ne change ni permission, ni durée de session, ni schéma.

[Résultats structurés](resultats.json) : **9 scénarios SQL ciblés réussis**,
dont les quatre régressions, compte désactivé, expiration après attente réelle
observée dans `pg_stat_activity`, propriété des sessions, révocation concurrente
du même objet et rollback sur échec de l’audit. Les **39 tests API voisins**
passent également ; les fichiers modifiés sont formatés et leur lint réussit.

## Reproduction et limites

PostgreSQL 17, `127.0.0.1:54660/account_service_test`, **52 migrations**. La
variable `ACCOUNT_TEST_DATABASE_URL` est explicitement fournie au test, qui
refuse une base non locale ou portant un autre nom. Cette base est distincte
de celle du [banc HTTP](../banc-integration/README.md).

Depuis `apps/web` :

```powershell
bun run test src/__tests__/account-postgres.test.ts -t 'session revocation|source deadline|revokes owned sessions|session is revoked concurrently'
bun run test src/__tests__/account-security-routes.test.ts
```

La source d’authentification, les cookies, les en-têtes et les quotas sont
simulés dans le test SQL. Les requêtes, verrous, transactions et audits sont
réels. La rotation est préparée par fixture SQL après capture du snapshot
authentifié ; ce n’est pas un parcours HTTP de remplacement MFA ou de mot de
passe. Le test d’expiration constate réellement l’attente du verrou avant
libération. Les vingt autres tests du fichier sont ignorés par le filtre de
cette campagne, sans être comptés comme réussis.

Le cluster et les deux bases fictives ont été arrêtés puis supprimés après les
trois parcours HTTP réussis ; les ports sont libres et les secrets temporaires
supprimés. [Preuve de nettoyage](../banc-integration/preuves/cleanup.json).
