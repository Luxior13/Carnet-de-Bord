# Utilisateurs — lecture serveur et coût SQL

Contrôle du **11 octobre 2026**, à partir du commit `310e845`, consacré au GET
de `/api/users` consommé par `/systeme/utilisateurs`. PostgreSQL 17.10 local,
Prisma 6.19.3, Node 24.14.0, Windows x64, Intel i7-13700K. Données fictives sur
une base jetable ; aucune base applicative distante utilisée par ces scripts.

## Rejouer

Les deux scripts exigent `USERS_LIST_TEST_DATABASE_URL` vers `localhost` ou
`127.0.0.1`, et la base nommée exactement `users_list_test`. Ils ne lisent jamais
`DATABASE_URL`. Chaque exécution crée un schéma portant un identifiant aléatoire,
puis supprime seulement ce schéma dans son nettoyage. Le script de mesure active
`pg_trgm` dans cette base de test si nécessaire. Le cluster est géré séparément.

Depuis la racine, avec la variable dédiée définie :

```powershell
node docs/audits/utilisateurs-2026-10-11/banc-serveur/reproduce-search-bound.cjs
node docs/audits/utilisateurs-2026-10-11/banc-serveur/run.cjs
bun run --filter web test -- src/__tests__/users-list-api.test.ts src/__tests__/users-list-postgres.test.ts src/__tests__/users-access-hardening.test.ts
```

Sans cette variable, les tests PostgreSQL sont **ignorés**, pas réussis.
Les scripts remplacent leurs fichiers de résultat lors d'une nouvelle exécution ;
préserver une preuve datée avant de la remplacer.

## Défaut reproduit et correction

L'ancien GET récupérait tous les identifiants correspondant à la recherche,
puis les réinjectait dans un filtre Prisma `id IN (...)` avant la pagination.
[La reproduction](reproduce-search-bound.cjs) confirme qu'avec 33 000 résultats,
la première page de 25 comptes échouait avec `P2035` : dépassement du nombre de
paramètres SQL. Les 33 000 identifiants avaient déjà traversé la connexion.
[Preuve avant correction](before-search-bound.json).

La lecture est maintenant isolée dans
[users-list.service.ts](../../../../apps/web/src/features/users/server/users-list.service.ts).
Recherche, filtres, total et pagination restent dans PostgreSQL. Le total
filtré et les lignes de la page partagent une seule instruction SQL, y compris
sur une page devenue vide. Une seconde instruction calcule tous les compteurs
globaux. Le GET conserve validation, permissions et projection finale des
champs autorisés ; le POST de création est inchangé.

Les valeurs saisies utilisent `Prisma.sql` et ses paramètres ; les ordres de tri
proviennent de branches fermées. Les noms des champs de recherche sont une liste
interne. La composition a été confrontée à la
[documentation officielle Prisma v6](https://www.prisma.io/docs/orm/v6/prisma-client/using-raw-sql/raw-queries),
obtenue par Context7.

## Mesures conservées

[Le protocole](run.cjs) compile le vrai nouveau service avec la seule connexion
Prisma substituée et le marqueur `server-only` retiré. L'ancien chemin de lecture
est reproduit dans le banc depuis le GET audité : recherche éventuelle de tous
les identifiants, puis sept lectures ORM avec les droits de sécurité activés.
Le résultat avant/après est comparé avant chaque scénario.

Une connexion, cache chaud, deux appels de chauffe puis vingt mesures par
version et scénario. Durée de la lecture complète, de ses agrégations et de la
sérialisation du DTO ; aucune durée d'authentification, HTTP ou navigateur.
Pas de build ni de trafic navigateur pendant les mesures. Le p95 utilise le
19e échantillon trié sur 20.

Jeux de 25, 1 000 et 10 000 comptes, dont un compte protégé, des comptes supprimés,
des accès ADMIN et USER, des comptes inactifs, des contacts facultatifs et des
connexions absentes. Schéma réduit aux colonnes lues et aux index réels de `User` :
ce protocole ne reconstitue pas ses contraintes d'authentification et de suppression.

| Comptes | Scénarios | Médianes avant | Médianes après | Plus grand p95 après |
| ------- | --------- | -------------- | -------------- | -------------------- |
| 25      | 11        | 2,73–3,91 ms   | 0,44–0,80 ms   | 1,47 ms              |
| 1 000   | 11        | 3,42–11,81 ms  | 0,88–4,17 ms   | 4,56 ms              |
| 10 000  | 11        | 9,10–91,69 ms  | 3,87–33,34 ms  | 37,02 ms             |

Scénarios : trois tris, recherche large, nom complet accentué, contact, état
inactif, catégorie administrateur, mot de passe à modifier, aucun résultat et
deuxième page. **Deux requêtes par appel** dans les 33 scénarios, contre sept sans
recherche et huit avec recherche dans ce profil de droits auparavant.

À 10 000 comptes, le nom passe de 14,42 à 8,28 ms et la recherche large de 91,69
à 17,37 ms en médiane. La recherche de contact atteint 33,34 ms, plus haute
médiane du jeu après correction. [Observations détaillées](observations.json).

Les plans confirment un tri borné `top-N` pour la page et au plus 25 accès par
clé primaire pour récupérer ses champs. Une numérotation intermédiaire par
`row_number` a été écartée après mesure : elle imposait un tri complet inutile.
Plans à 10 000 comptes : [nom](10000-name-plan.json),
[recherche large](10000-broad-search-plan.json),
[nom complet](10000-multiword-name-plan.json),
[administrateurs](10000-admin-plan.json).

## Régressions et limites

**157 tests ciblés réussis** : 26 tests de frontière HTTP, 23 tests PostgreSQL et
108 tests existants de protection des utilisateurs. Les quinze anciens blocs
GET ont été déplacés du grand fichier de protection vers un fichier API dédié ;
les assertions SQL sont maintenant exercées sur PostgreSQL.

Les cas couvrent notamment refus anonyme/interdit avant lecture, paramètres
bornés, identifiant exact protégé, droits de contact/sécurité, identité publique
du compte racine, recherche multi-mots et littérale, combinaisons de filtres,
catégories exclusives, valeurs nulles, départage et pages vides. Le nouveau
service retourne bien 25 lignes et le total 33 000 avec seulement deux requêtes,
sans fabriquer une liste de paramètres proportionnelle aux résultats.

- L'authentification des tests HTTP est simulée. L'intégration session/serveur
  réel et les contraintes complètes de `User` font l'objet des autres preuves
  de cet audit ; ce banc ne les certifie pas.
- Le total et les lignes partagent leur instantané d'instruction. La synthèse
  globale est indépendante et lue par une deuxième requête ; aucun instantané
  transactionnel commun de ces deux lectures n'est promis.
- La recherche applique `lower(translate(...))`. Les index trigrammes sur les
  valeurs brutes ne prennent pas en charge cette expression ; les plans montrent
  un parcours de `User`. Le filtre ADMIN convertit aussi le rôle en texte.
  Aucun nouvel index ou changement de stockage n'a été ajouté sur ces seules
  mesures. Revoir les plans si les volumes ou latences le justifient.
- Pagination numérotée bornée, aucune stabilité figée entre deux requêtes avec
  des écritures concurrentes. Aucun test de charge simultanée ni budget distant
  ou à 100 000 comptes n'est déduit des mesures locales.

[Rapport propriétaire](../../AUDIT_UTILISATEURS_2026-10-11.md).
