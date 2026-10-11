# Répertoire — requêtes et pagination sur PostgreSQL

Contrôle du **11 octobre 2026**, consacré au serveur de la liste. Les données
sont fictives ; aucune base applicative courante n’est utilisée.

## Rejouer

[Le banc](run.cjs) exige `PERSONS_LIST_TEST_DATABASE_URL` vers `localhost` ou
`127.0.0.1`, et la base nommée exactement `repertoire_pagination_test`. Cette base
doit être jetable. Il ne lit jamais `DATABASE_URL`, crée un schéma unique puis
supprime seulement ce schéma dans son bloc de nettoyage. Il active `pg_trgm`
dans cette base de test si nécessaire. Le cluster est géré séparément.

Depuis la racine, avec cette variable définie :

```powershell
node docs/audits/repertoire-2026-10-11/banc-serveur/run.cjs
```

Le banc affiche le dossier temporaire contenant les mesures. Pour les
régressions fonctionnelles, utiliser la même base isolée :

```powershell
bun run --filter web test -- src/__tests__/persons-list-postgres.test.ts src/__tests__/persons-list-server.test.ts src/__tests__/person-search-ux.test.ts src/__tests__/persons-routes-permissions.test.ts src/__tests__/persons-schemas-normalization.test.ts src/__tests__/person-pages-permissions.test.ts src/__tests__/cursor-pagination.test.ts
```

Sans cette variable, les tests PostgreSQL sont **ignorés**, pas réussis.

Le protocole exécutable suit désormais le service dédié
[`person-list.service.ts`](../../../../apps/web/src/features/persons/server/person-list.service.ts),
extrait de `person-core.service.ts` sans modifier la lecture. Il ne substitue
plus l'import d'audit de mutation, devenu absent des dépendances de la liste.
Les observations et mesures conservées ci-dessous précèdent ce déplacement ;
leurs résultats datés ne constituent pas une nouvelle mesure après extraction.

## Mesure conservée

PostgreSQL 17.10, Prisma 6.19.3, Node 24.14.0, Windows x64, Intel i7-13700K ;
fuseau SQL `Europe/Paris`. Une connexion Prisma, sans trafic concurrent ni build
pendant la mesure. Chaque scénario comprend une première mesure, deux appels de
chauffe puis vingt mesures ; p95 calculé par rang supérieur. Le cache est chaud :
la première mesure ne représente pas un démarrage à froid du disque.

Le vrai [listPersons](../../../../apps/web/src/features/persons/server/person-list.service.ts)
est compilé et exécuté avec Prisma connecté au schéma isolé. Seuls la connexion,
la clé de curseur fictive et l’import de mutation d’audit, inutilisé par la liste,
sont substitués. La mesure comprend sérialisation des résultats, curseur signé,
requête de liste avec total filtré/auteur/compteurs, et les trois comptes globaux.

Jeux : 25, 1 000 et 10 000 personnes, dix audits par personne, emails pour 60 %
des personnes (deux chacun), téléphones pour 40 %, profils sociaux pour 30 %.
Les index pertinents proviennent des migrations réelles ; le schéma est minimal,
sans les autres colonnes ni contraintes non sollicitées par cette lecture.

| Personnes / audits | Scénarios | Plage des médianes complètes | Plus grand p95 |
| --- | --- | --- | --- |
| 25 / 250 | 12 | 1,09–1,58 ms | 2,99 ms |
| 1 000 / 10 000 | 13 | 2,05–3,43 ms | 4,23 ms |
| 10 000 / 100 000 | 13 | 8,38–21,87 ms | 22,47 ms |

Scénarios : les trois tris, statut extérieur, aucune coordonnée, recherche
d’identité large et multi-mots, email, préfixe téléphonique, identifiant social,
URL sociale, résultat vide ; deuxième page dès que disponible. **Quatre requêtes
SQL par appel** dans chacun des 38 scénarios ; aucune requête par ligne côté
application. Les sous-requêtes de compteurs et d’auteur sont incluses dans le
plan SQL. Les durées individuelles des trois comptes incluent leur attente sur
la connexion commune : elles ne doivent pas être additionnées.

[Observations complètes](observations.json) : latences, plans résumés, index,
lectures et paramètres du protocole. Plans détaillés à 10 000 personnes :
[nom](10000-name-plan.json), [email](10000-email-plan.json),
[identité multi-mots](10000-multiword-identity-plan.json),
[absence de coordonnées](10000-missing-contacts-plan.json).

## Interprétation et limites

- Les index de tri, de dernier audit et de coordonnées par personne sont
  effectivement utilisés. Les recherches de contact utilisent notamment leurs
  index de préfixe ; le filtre global à plusieurs branches peut toutefois
  parcourir `Person` en entier. Les totaux et comptes globaux lisent aussi les
  ensembles entiers : un index présent ne supprime pas le coût d’un total exact.
- À 10 000 personnes, le tri alphabétique complet a une médiane de 8,64 ms ;
  la recherche d’URL sociale atteint 21,87 ms, plus haute médiane du jeu. La
  synthèse globale représente une partie sensible du coût, même sans recherche.
  Aucun cache, index supplémentaire ou changement de requête n’est justifié par
  ces seules mesures.
- Cette preuve porte sur le service et PostgreSQL locaux, sans session, HTTP,
  latence réseau distante, navigateur, concurrence d’écritures ou charge répartie.
  La journalisation des requêtes du banc ajoute son propre coût. Le budget du
  script général à 100 000 personnes / 1 million d’audits / 3 millions de
  changements n’a pas été exécuté ; ne pas le déclarer validé.
- Le total filtré et les lignes partagent une requête ; la synthèse globale est
  indépendante des filtres et lue par trois requêtes distinctes. Ce contrôle
  n’établit pas un instantané transactionnel commun de ces quatre lectures.

## Régressions vérifiées

**96 tests ciblés réussis**, dont 18 scénarios réels PostgreSQL et 9 scénarios de
préchargement serveur avec session/service simulés. Couverture utile : totaux
avant curseur, pages devenues vides, départage des dates égales, UTC, recherche
multi-mots/littérale, filtres, absence de valeurs de coordonnées dans la liste,
dernier auteur correct, bornes API et refus de préchargement sans droit.

Deux nouveaux tests SQL ont d’abord reproduit l’acceptation erronée d’un curseur
après changement d’URL `/Case` vers `/case`, ou d’identifiant `élan` vers `elan`.
Le curseur est maintenant lié au texte de recherche trimé, car la normalisation
sans accents/casse de l’identité ne décrit pas toutes les recherches de contact.
Les anciens curseurs concernés peuvent devenir invalides ; la reprise vers la
première page reste disponible. La page serveur transmet aussi l’identifiant du
compte propriétaire du préchargement ; sa consommation est vérifiée côté client
dans le contrôle séparé de la page.
