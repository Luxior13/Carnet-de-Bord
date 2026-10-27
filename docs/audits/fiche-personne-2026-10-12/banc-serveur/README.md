# Fiche personne — vérifications serveur du 12 octobre 2026

Périmètre : lecture et mutations de `/api/personnes/[id]`, trois collections
de coordonnées, provenance/historique et suppression. Départ `0027a78` ;
les changements de cette revue sont présents lors de la validation.

Le [relevé structuré](observations.json) distingue les deux défauts reproduits
des garanties déjà présentes. La liste et la création ne sont pas réauditées :
la création sert seulement à préparer les fiches fictives.

## Environnement et reproduction

- PostgreSQL 17, cluster éphémère sur `127.0.0.1:54620` ; base exclusive
  `person_detail_service_test`, distincte de la base du navigateur.
- Les 52 migrations existantes sont appliquées via
  `packages/database/scripts/safe-migrate-deploy.ts`, avec `DATABASE_URL`
  explicitement fixée à cette base locale neuve. Aucune nouvelle migration.
- Le test [person-detail-postgres.test.ts](../../../../apps/web/src/__tests__/person-detail-postgres.test.ts)
  exige `PERSON_DETAIL_TEST_DATABASE_URL` et refuse tout autre port, nom de
  base ou hôte hors boucle locale. Sans variable, la suite est ignorée.
- Chaque scénario crée ses utilisateurs, sessions et fiches fictives. Les
  audits et tombstones restent dans cette base jetable ; aucune purge globale
  de tables. Les triggers de panne injectée sont limités à l'acteur du scénario
  et retirés dans `finally`.
- Clés de chiffrement fictives et déterministes, propres aux tests. Aucun
  secret de l'application ou du banc navigateur n'est lu par la suite.

Depuis `apps/web`, après préparation du cluster et de la base :

```powershell
$env:PERSON_DETAIL_TEST_DATABASE_URL = 'postgresql://postgres@127.0.0.1:54620/person_detail_service_test?schema=public'
bun run test src/__tests__/person-detail-postgres.test.ts src/__tests__/person-field-history.test.ts src/__tests__/person-contact-concurrency.test.ts src/__tests__/person-deletion.test.ts src/__tests__/person-audit-deletion-guards.test.ts
Remove-Item Env:PERSON_DETAIL_TEST_DATABASE_URL
```

Résultat : **71 tests réussis dans cinq fichiers**, dont **30 scénarios
PostgreSQL**. Lint ciblé des quatre fichiers TypeScript modifiés réussi.
`bun run typecheck`, `git diff --check` et `bun run docs:check` réussis à
la fin de cette passe (238 documents et 1 568 liens locaux).
La compilation et les validations générales sont consignées dans le rapport
principal, séparément de ce banc.

## Défauts reproduits puis corrigés

### REP-D06 — sections d'historique héritées

La garde utilisait `sectionKey in PERSON_HISTORY_FIELDS`. Les noms
`constructor`, `__proto__`, `toString` et `hasOwnProperty` passaient cette garde,
puis provoquaient `TypeError: ...has is not a function`. Le paramètre invalide
aboutissait à une erreur serveur au lieu du refus métier prévu.

Les quatre nouvelles régressions de
`person-field-history.test.ts` (retiré le 27 octobre 2026)
échouent avant la correction, puis passent avec les quatre tests existants.
La garde `Object.hasOwn` refuse ces noms avant toute lecture de fiche ou
d'historique. Les scénarios SQL appellent aussi la vraie route et vérifient un
statut 400 pour trois de ces noms et un nom inconnu ordinaire.

### REP-D09 — lecture de fiche et provenance incohérente

`getPerson` lisait l'identité et ses coordonnées, puis le dernier audit, sans
snapshot commun. Un PATCH validé entre ces lectures pouvait produire une
réponse contenant encore l'identité/version 1, mais un dernier changement
`PERSON_UPDATE` de la version 2.

La régression SQL utilise une extension de requête Prisma uniquement pour
ordonner les opérations : avant le `auditLog.findFirst` du lecteur, elle
attend le commit d'un vrai PATCH concurrent. Elle ne fabrique aucune ligne,
réponse de requête ou valeur d'audit. Avant correction, l'assertion de snapshot
échoue sur l'action et la date de provenance ; après correction, la réponse
correspond entièrement à la version 1 et une nouvelle lecture retrouve la
version 2.

`getPerson` effectue désormais ces lectures dans une transaction courte
`RepeatableRead`. Les DTO, permissions et CAS des mutations restent identiques.
Les lectures ne verrouillent pas la fiche contre les modifications ; une
réponse peut naturellement devenir ancienne après son snapshot.

La documentation Context7 consultée incluait des exemples de versions plus
récentes. Le contrat a donc été vérifié dans la
[documentation officielle Prisma v6 des transactions](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions#transaction-isolation-level),
puis exécuté avec le client 6.19.3 installé.

## Ce que vérifient les 30 scénarios SQL

| Domaine | Scénarios | Assertions principales |
| --- | ---: | --- |
| Accès | 3 | Anonyme refusé ; lecteur simple admis pour la projection complète mais refusé pour toutes les mutations/historique ; retrait de `persons:view` effectif à la requête suivante même avec d'autres surcharges |
| Identité | 3 | Effacement des noms facultatifs et audit exact ; no-op sans nouvelle version ; versions absentes/périmées/futures refusées ; une seule écriture concurrente acceptée |
| Snapshot | 1 | Fiche et provenance issues du même état validé, puis relecture de l'état suivant |
| Coordonnée principale | 3 | Ajout, promotion, refus de suppression sans remplacement, suppression avec remplacement ; versions du parent et des enfants concernés |
| Propriété et versions enfant | 3 | Enfant d'une autre fiche refusé ; versions parent/enfant futures refusées sans écriture |
| Plafonds concurrents | 3 | À 9 emails, 9 téléphones ou 19 profils : deux ajouts concurrents donnent un succès et un conflit ; plafond atteint et un seul principal conservé |
| Doublons entre personnes | 3 | Valeur partagée autorisée ; avertissement limité au booléen et aux noms de champs, sans identité de l'autre fiche |
| Changement de réseau | 1 | Promotion dans le réseau de destination et remplacement du principal dans le réseau source, avec versions cohérentes |
| Paramètres d'historique | 4 | Sections héritées ou inconnues refusées avec 400 |
| Valeurs d'historique | 1 | Dernières entrées du champ exact, limite existante de deux, valeurs chiffrées en SQL et déchiffrées dans la réponse autorisée |
| Échec d'audit de mutation | 2 | Panne AuditLog ou AuditFieldChange : identité, nouveau contact, primaire et versions entièrement annulés |
| Suppression | 3 | Version périmée refusée avant purge ; deux suppressions simultanées donnent 204 avec un seul audit ; cascade, purge des valeurs et tombstone ; rollback complet si l'audit échoue ; réutilisation de clé sur une autre fiche refusée sans perte |

La suppression réussit ici avec une session MFA valide **sans preuve récente
de mot de passe**, conformément à la décision actuelle. Ce banc ne crée pas
de nouvelle exigence de step-up.

## Limites

- Routes, autorisations, schémas, Prisma, transactions, contraintes, chiffrement
  et déchiffrement sont réels. `next/headers` fournit des cookies/en-têtes
  simulés ; utilisateurs, sessions et credentials MFA sont installés par SQL.
  Ce n'est pas une connexion avec mot de passe/TOTP ni une preuve HTTP/CSRF.
- L'interposition Prisma du scénario de snapshot impose un entrelacement
  précis ; elle ne prétend pas mesurer sa fréquence en charge réelle.
- Les courses portent sur deux appels, les capacités maximales courantes et
  les mutations vérifiées. Aucun benchmark de charge concurrente prolongée,
  audit d'exploitation ou nouvelle validation exhaustive du schéma n'est
  revendiqué. Les preuves SQL de schéma antérieures restent distinctes.
- La première exécution du nouveau banc avait trois attentes trop strictes
  sur le doublon : le contrat existant inclut aussi `fields`. Ces attentes ont
  été corrigées ; elles ne décrivent pas un défaut produit.
- Le contrôle TypeScript intermédiaire rencontrait uniquement les éditions
  d'interface simultanées. Son résultat final appartient à la validation
  générale, pas à la preuve des deux défauts serveur.
