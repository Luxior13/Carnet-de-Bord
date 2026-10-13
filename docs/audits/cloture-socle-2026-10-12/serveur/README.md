# Clôture du socle — comptes, autorisations et paramètres

Revue commencée le **12 octobre 2026**, départ propre `c54e5d8` ; derniers
contrôles de ce lot exécutés le **13 octobre**. Cette preuve couvre le serveur
des comptes et paramètres et contribue à la revue globale. Les constats anciens
ne sont pas présentés comme de nouveaux essais.

## Périmètre et résultat

Lecture des routes et services de connexion, profil/contact, mot de passe,
MFA, sessions, liste/création/fiche utilisateur, autorisations et conservation
du journal. Les compléments [Personnes](../personnes/README.md) et
[authentification personnelle](../personnel/README.md) documentent leurs propres
reproductions et contrôles.

Les **121 tests SQL existants** des sept fichiers comptes/auth/paramètres ont
réussi sur les bases neuves. Cette réussite ne couvrait pas toutes les courses :
des régressions supplémentaires ont démontré les défauts suivants.

| Opération | Reproduction avant correction | Correction et vérification |
| --- | --- | --- |
| PATCH utilisateur, reset du mot de passe et suppression | Snapshot d'authentification conservé, puis suppression SQL de la source ou retrait du droit de l'acteur : six réponses 200 au lieu de 401/403. | Compte et session source relus et verrouillés avant mutation ; six refus sans changement de cible, révocation de ses sessions ni audit de réussite. |
| Reset MFA administratif | Vrai mot de passe/TOTP ; verrou de la cible réellement tenu, source expirant pendant l'attente : réponse 200. | Ordre de verrouillage User puis Session ; échéance relue après attente, refus 401 sans retrait du MFA cible ni audit. |
| Conservation du journal | Source supprimée après snapshot : le PUT écrit et répond 200. | Autorité relue après le verrou de conservation, refus 401 sans réglage ni audit. Une réduction dont la preuve expire pendant l'attente est également refusée. |

La [garde commune](../../../../apps/web/src/shared/server/user-action-authorization.ts)
est déplacée du module Utilisateurs vers le serveur partagé, avec plusieurs
consommateurs réellement livrés. Elle conserve une erreur typée 401/403,
contrôle état, version de sécurité, source, échéances et droit effectif, puis
garde ces lignes stables jusqu'à la fin de la transaction.

Pour le PATCH administratif, la route conserve ses règles de champs et de
délégation. Le service compare sous verrou le rôle, la protection et les
surcharges de permissions du snapshot ayant autorisé ces règles. Une variation
refuse l'écriture ; l'ordre des clés n'intervient pas. La preuve de mot de passe
ou MFA exigée par l'action est recalculée avec la date obtenue après les verrous.
Les transactions existantes conservent version cible, réservation permanente,
révocation nécessaire et audit atomique.

Aucune migration, durée, permission ou capacité métier ajoutée. Les contraintes
de compte racine, identité réservée et séparation Personne/Compte sont conservées.
Une lecture sans mutation et les refus stables ne sont pas transformés en
transactions générales. Annulation de challenge, logout et retrait d'une preuve
restent des opérations de réduction d'accès.

## Vérifications rejouées

[Résultats structurés](resultats.json), depuis `apps/web` avec uniquement les
variables dédiées du cluster jetable :

```text
bun run test src/__tests__/users-list-postgres.test.ts src/__tests__/user-create-postgres.test.ts src/__tests__/user-create-authorization-postgres.test.ts src/__tests__/user-detail-postgres.test.ts src/__tests__/system-settings-postgres.test.ts
```

**88 SQL réussis, aucun ignoré** : liste 23, création 5 + 6, fiche 36,
paramètres 18. Les onze tests supplémentaires de fiche et les deux tests
supplémentaires de paramètres couvrent les nouvelles courses, les preuves
périmées sous verrou et l'égalité des permissions malgré un ordre différent.
Les contrats précédents d'intégrité, unicité, audit/rollback, confidentialité,
versions et purge sont rejoués dans ces fichiers.

Les tests API voisins de fiche, reset MFA, paramètres et sécurité personnelle
réussissent également. Leurs bases, sessions ou preuves sont simulées ; les
fixtures ont été adaptées aux nouvelles lectures transactionnelles. Ils ne
remplacent pas les SQL. La suite globale, le build et les parcours HTTP sont
rapportés séparément par la revue racine, sans additionner plusieurs fois les
mêmes tests.

Les trois bancs serveur totalisent **218 tests SQL distincts réussis** : les 88
ci-dessus, 78 Personnes, 35 du compte personnel et 17 de connexion. Les dix
fichiers PostgreSQL du dépôt sont ainsi rejoués sur neuf bases dédiées ; les
deux fichiers de création utilisateur partagent leur base de service.

## Environnement, reproduction et limites

PostgreSQL 17 local sur `127.0.0.1:54663`. Onze bases explicitement nommées,
**[52 migrations appliquées à chacune](migrations.json)** : neuf bases dédiées aux suites SQL,
`socle_e2e_test` et `socle_restore_test`. Les deux listes créent en plus leur
propre schéma minimal unique ; elles éprouvent les requêtes de liste et ne
valident pas à elles seules toutes les contraintes du schéma applicatif.

Le marqueur privé `%TEMP%/noctambule-cloture-socle-current.txt` indique le dossier
`noctambule-cloture-socle-*` contenant `env.json`. Aucune URL de la base habituelle
n'est utilisée. Le script E2E est exécuté avec **Bun**, moteur attendu par son
appel interne de migration ; un premier lancement avec Node a été corrigé avant
les tests. Les gardes SQL exigent toujours URL dédiée, hôte local et nom exact ;
les anciens ports d'audits inscrits dans trois tests ont été retirés.

Dans les tests comptes/paramètres, le snapshot auth et les en-têtes sont simulés ;
Prisma, requêtes, verrous, mutations et audits sont réels. La course du reset MFA
utilise bcrypt/TOTP réels, mais ne passe pas par une connexion HTTP. Les attentes
sont observées dans PostgreSQL, sans prétendre couvrir tous les ordonnancements
ou la charge. Les mutations personnelles/MFA et Personnes possèdent leurs propres
preuves ; les parcours HTTP globaux restent distincts.

Ordre retenu : les comptes acteur/cible sont verrouillés dans l'ordre des IDs,
puis la source Session. Personnes verrouille d'abord sa fiche, puis l'acteur et
la source ; aucune mutation Compte ne verrouille ensuite une Personne. Le réglage
prend son verrou de conservation avant l'autorité. Aucun cycle inverse de ces
domaines n'a été identifié dans les consommateurs livrés.

Le nettoyage final a été effectué le **13 octobre**, après les contrôles globaux
et la restauration. Next a été arrêté par le parent, puis le PID, le répertoire
de données, les onze bases et l'absence de jonction ont été revalidés avant
l'arrêt de PostgreSQL et la suppression du seul dossier temporaire autorisé.
Les ports 3132/54663 sont absents ; le cluster, `env.json`, les clés, logs,
artefacts navigateur privés et marqueur sont supprimés. Aucune base habituelle
touchée. La [preuve d'environnement](../integration/preuves/nettoyage-environnement.json)
distingue ces ressources des sauvegardes et temporaires de performance nettoyés
par le parent dans sa [preuve séparée](../integration/preuves/nettoyage-root.json).
