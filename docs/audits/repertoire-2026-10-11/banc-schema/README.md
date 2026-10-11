# Répertoire — schéma et invariants des coordonnées

Contrôle du **11 octobre 2026**, sur une base PostgreSQL 17.10 jetable entièrement
migrée, avec Prisma 6.19.3. Ce banc complète le schéma minimal du
[contrôle de la liste](../banc-serveur/README.md) : il vérifie des contraintes et
des comportements d'écriture, sans prendre ce contrôle ciblé pour une
certification de tout le schéma applicatif.

## Rejouer

[Le script](run.cjs) exige `PERSONS_SCHEMA_TEST_DATABASE_URL` vers `localhost`
ou `127.0.0.1` et la base nommée exactement `repertoire_schema_test`. Cette base
doit être jetable et avoir reçu toutes les migrations du dépôt. Le script ne
lit jamais `DATABASE_URL`, ne migre pas la base et ne gère pas le cluster.
Chaque scénario crée des données fictives dans une transaction annulée après
les assertions, y compris celles qui provoquent volontairement une erreur SQL.

Depuis la racine, une fois la variable dédiée définie :

```powershell
node docs/audits/repertoire-2026-10-11/banc-schema/run.cjs
```

Le banc compile en mémoire le vrai contrôle `isPersonSchemaCatalogReady`, avec
seulement son marqueur `server-only` retiré. Il interroge le catalogue réel et
exige un schéma reconnu prêt avant de lancer les scénarios. Les observations
sont écrites dans `observations.json` ; conserver séparément une preuve datée
avant de la remplacer par une nouvelle exécution.

## Résultats conservés

- [Avant correction](before-ownership-guard.json) : 51 migrations appliquées,
  28 scénarios réussis et une lacune reproduite. Une mise à jour SQL directe
  pouvait déplacer un profil social vers une autre personne ; les emails et
  téléphones refusaient déjà la même opération.
- [Après correction](observations.json) : 52 migrations appliquées, catalogue
  reconnu prêt, **29 scénarios sur 29 réussis**. La migration additive
  `20261011180000_person_coordinate_ownership` réutilise la fonction existante
  pour interdire aussi la réaffectation des profils sociaux. Aucune donnée
  existante n'est réécrite. Le contrat applicatif attend les trois triggers.
- [Contrôles Prisma](prisma-checks.json) : validation et formatage réussis ;
  `migrate diff` sort avec le code 2 et propose des opérations sur six index de
  préfixe. Le catalogue SQL confirme pourtant leurs définitions
  `varchar_pattern_ops`. L'introspection de Prisma 6.19.3 perd cette information
  pour ces index B-tree. Le diff n'a pas été appliqué ; aucune autre différence
  représentable dans le schéma n'a été signalée par cette comparaison.
- [Application sur la base de développement configurée](development-migration.json) :
  après vérification de la cible et de l'unique migration en attente, le wrapper
  a appliqué seulement cette migration additive. Le catalogue confirme ensuite
  52 migrations et les trois triggers actifs, sans réécriture de données. Les
  scénarios fictifs ci-dessus restent exécutés uniquement sur la base jetable.

Les 29 scénarios couvrent l'identité minimale, une date civile bissextile,
les paires normalisées, les versions positives, les clés étrangères, les
doublons par fiche, les principales uniques, l'interdiction de réaffectation,
la forme téléphonique internationale, les ensembles de valeurs sociales,
la cascade ciblée et l'absence de clé étrangère entre `Person` et `User`.
Le dernier scénario vérifie que deux prises successives de la même version
renvoient respectivement un puis zéro enregistrement modifié.

## Régression dans les services

Une reproduction sur le vrai service `addPersonEmail`, avec Prisma et audit
simulés, a montré le cas suivant : lecture d'une fiche en version 5 avec neuf
emails, requête annonçant à tort la version 6, puis insertion concurrente
simulée portant la fiche à dix emails en version 6. L'ancien contrôle final
acceptait la version annoncée et ajoutait un onzième email.

Les ajouts et suppressions des trois collections comparent maintenant la
version annoncée à la version effectivement lue, avant de déduire les limites
ou les principales. La mise à jour conditionnelle finale conserve son rôle
contre une écriture survenue ensuite. Les modifications de coordonnées avaient
déjà les deux contrôles.

**82 tests ciblés réussis**, dont six cas paramétrés vérifiant des versions
anciennes et futures sur les trois collections, sans écriture ni audit après
un conflit. Les tests du catalogue refusent aussi chacun des trois triggers
de propriété lorsqu'il manque ou est désactivé.

```powershell
bun run --filter web test -- src/__tests__/person-schema-readiness.test.ts src/__tests__/person-contact-concurrency.test.ts src/__tests__/persons-schemas-normalization.test.ts src/__tests__/person-deletion.test.ts src/__tests__/person-user-isolation.test.ts
```

## Limites et responsabilités

- Les scénarios SQL utilisent le schéma complet mais restent ciblés. Ils ne
  rejouent pas chaque fonction d'audit, chaque procédure de suppression ou les
  autres domaines de l'application.
- La prise de version SQL est séquentielle dans une transaction. Le scénario
  de collision du service utilise des réponses simulées ; aucun des deux ne
  constitue une mesure de plusieurs écrivains PostgreSQL simultanés.
- SQL impose **au plus une** principale dans son périmètre. Les services
  assurent une principale quand la collection est non vide, la normalisation,
  les limites de 10 emails / 10 téléphones / 20 profils et les incréments de
  version. Ces règles ne sont pas toutes des `CHECK` SQL.
- La lacune de réaffectation sociale concernait une écriture directe : les API
  existantes ne proposent pas de changer le propriétaire d'une coordonnée.
  Le trigger rend néanmoins le contrat SQL cohérent avec ses deux collections
  voisines et avec l'historique par personne.
- Les jeux de performance volumineux et le comportement de l'interface ne
  sont pas mesurés par ce banc.

Règles durables : [guide Prisma](../../../../packages/database/prisma/README.md).
