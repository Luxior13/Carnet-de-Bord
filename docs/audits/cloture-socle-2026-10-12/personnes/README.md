# Clôture du socle — serveur du Répertoire

Revue du 12 octobre 2026, départ `c54e5d8`, arbre propre. Périmètre : liste,
création et fiche Personne, routes `/api/personnes`, services, validation,
coordonnées, provenance, chiffrement et suppression. Cette preuve contribue à
la revue générale finale ; elle ne constitue pas un nouvel audit visuel.

## Résultat et corrections

Deux défauts confirmés et corrigés :

| Point | Avant | Après et preuve |
| --- | --- | --- |
| Autorisation d'une mutation après préparation de la requête | Après l'authentification réelle initiale, retrait SQL du droit ou suppression de la session source pendant la lecture du corps : création, identité, suppression et ajout des trois familles de coordonnées rendent 201/200/204. | Garde dans la transaction avant mutation, avec source obligatoire : douze variantes rendent 401/403 sans modification, nouvelle coordonnée, tombstone ni audit. |
| Identité vide après normalisation | Un accent combinant isolé passe la validation puis échoue sur le CHECK SQL : réponse 500. | Validation de chaque champ d'identité normalisé, erreur 400 avant SQL. Trois tests supplémentaires couvrent création et modification sur pseudo, prénom et nom. |

[Avant corrigé](avant.json) · [Résultats finaux](resultats.json).
Un premier essai interceptait `Request.json`, alors que le parseur lit le corps
par flux : son hook n'était jamais appelé. Ces échecs ne constituent aucune
preuve produit. La reproduction retenue intercepte `reader.read`, vérifie son
exécution, puis relance les services et le schéma originaux de `c54e5d8` avant
restauration garantie des sources corrigées. Les treize échecs sont alors
reproduits ; les services corrigés passent.

La mutation verrouille d'abord son unique fiche `Person`, puis le garde partagé
verrouille l'acteur `User` et la source `Session`. La date de validité est lue
après ces attentes. Un cas supplémentaire observe réellement l'attente dans
`pg_stat_activity`, laisse la source expirer, puis libère la fiche : réponse 401,
identité/version et audit inchangés. Les services utilisateurs ne verrouillent
pas de `Person` après `User` dans les chemins examinés. Les coordonnées ne sont
jamais déplacées vers une autre personne ; aucun verrou sur plusieurs fiches
n'est ajouté. Les versions optimistes et transactions d'audit restent actives.

Le garde d'autorisation est partagé avec les actions utilisateurs existantes,
dans `shared/server/user-action-authorization.ts`. L'adaptateur Personnes ne
crée ni politique de permissions parallèle, ni nouvelle preuve sensible :
`persons:delete` ne reçoit notamment aucune exigence MFA supplémentaire.

## Carte de couverture

| Domaine | Contrôles rejoués et conclusion |
| --- | --- |
| Liste | Dix-huit SQL : tris stables, curseurs, totals filtrés avant curseur, dernière page vide, accents/mots, coordonnées sans exposition des valeurs, horodatage et auteur. Schéma minimal dédié pour cette suite, pas preuve de toutes les migrations. |
| Création | Dix-sept SQL sur schéma migré : refus, dépendance de droits, identité minimale, naissance civile, normalisation, homonymes, principales, plafonds, doublons non bloquants, audit chiffré, rollback et clé absente. |
| Fiche et coordonnées | Quarante-trois SQL sur schéma migré : versions parent/enfant, concurrence, plafonds, appartenance, principale/remplacement, réseau changé, no-op, snapshot identité/provenance, refus après révocation et expiration pendant verrou. |
| Historique et suppression | Lecture par permission et champ exact, deux changements maximum, sections héritées rejetées, valeurs chiffrées, purge des valeurs, audit minimal et tombstone atomiques, rejeu et clé réutilisée sur autre cible refusée. Inclus dans les suites précédentes. |
| Validation et mécanismes locaux | Cent cinquante tests dans douze fichiers : schémas, routes simulées, chiffrement authentifié, clés et disponibilité, séparation Personne/Compte, doublons, concurrence et suppression. Les gardes sont simulées dans les tests métier unitaires ; leur effet est éprouvé séparément par SQL réel. |

Sélection Q01–Q30 : Q01, Q05–Q06, Q09–Q17, Q19, Q22, Q25 et Q27–Q30
examinés selon les risques de données et d'accès. Q02–Q04 et Q07 sont couverts
par l'agent interface de la revue finale, sans changement de composition dans
ce lot serveur. Q18 hors impact : aucun cache ou nouvel index. Q08, Q20–Q21,
Q23–Q24 et Q26 non applicables : aucune notification, pièce, import, tâche,
transition juridique ou finance livrée par ce module.

## Schéma et préparation du produit

Lecture du schéma et du contrat SQL, puis application des 52 migrations existantes
dans les bases isolées. Aucune migration ni table nouvelle justifiée :

- `Person` est indépendante de `User`. Aucun rapprochement par email, aucune
  création de compte depuis une fiche ; les homonymes restent autorisés.
- `LoginNameReservation` protège les identifiants de connexion ; elle ne réserve
  aucun pseudo de personne. Le tombstone de suppression ne contient pas d'identité.
- `structureStatus` décrit une situation courante du Répertoire. Une adhésion,
  un mandat, un contrat ou une affectation future devront être des relations
  explicitement datées, sans réécrire les anciens engagements.
- Coordonnées possédées par leur fiche, contraintes et triggers d'appartenance,
  unicité locale et principales ; les limites de collections et l'existence
  d'une principale relèvent des services transactionnels.
- Naissance civile, versions et historique chiffré restent distincts. Les règles
  de conservation et de restauration des sauvegardes restent à qualifier pour
  l'exploitation réelle ; le test de suppression n'est pas une preuve juridique
  ni un exercice de restauration.

Ces décisions suivent [Structure](../../../references/STRUCTURE.md), le
[contrat SQL](../../../../packages/database/prisma/README.md) et le
[suivi du Répertoire](../../../qualite/pages/membres-repertoire.md).

## Exécution et limites

PostgreSQL 17 local isolé, port 54663 ; bases explicitement nommées
`person_creation_service_test`, `person_detail_service_test` et
`repertoire_pagination_test`. Les suites n'utilisent pas `DATABASE_URL` et
refusent un hôte distant ou un autre nom. Les ports historiques fixes de deux
gardes ont été retirés pour rendre le rejeu possible sur ce nouveau cluster.

Depuis `apps/web`, avec les trois variables dédiées renseignées :

```text
bun run test src/__tests__/person-creation-postgres.test.ts src/__tests__/person-detail-postgres.test.ts src/__tests__/persons-list-postgres.test.ts
```

Résultat : **78 SQL réussis, aucun ignoré**, dont quatorze nouvelles régressions.
Les 150 tests unitaires/API simulées sont distincts. Ils ne s'ajoutent pas de
nouveau au total de la suite générale du rapport racine. Lint ciblé réussi.
Le contrôle de types local ne signale aucune erreur Personnes ; la validation
globale finale appartient au rapport racine.

Les suites création/fiche utilisent routes, auth/session, permissions, services,
requêtes et audits réels. `next/headers`, cookies en mémoire, clés fictives et
environnement sont simulés ; elles ne rejouent pas la connexion mot de passe/TOTP
ni HTTP/CSRF. Les profils sont fictifs. Aucune charge, performance d'exploitation,
restauration ou totalité des ordonnancements concurrents n'est revendiquée.
Le cluster est partagé avec les autres preuves de clôture ; son nettoyage final
est pris en charge par l'agent d'intégration et sera consigné dans le rapport global.
