# Schéma Prisma — personnes et coordonnées

Revue du 13 octobre 2026, sur le schéma du dépôt et les correctifs de clôture du
socle présents dans l'arbre de travail. Référence de départ : `c54e5d8`, complétée
par les modifications de la clôture des 12–13 octobre. Cette fiche examine
chaque déclaration des cinq modèles Personnes et de `PersonStructureStatus`.
Elle ne constitue pas un nouvel audit des pages du Répertoire.

**Conclusion de lecture : aucun nouveau défaut confirmé dans ces déclarations.**
Les tailles, nullabilités, valeurs par défaut, relations et index correspondent
aux consommateurs actuels et aux garanties SQL recensées. Aucune migration,
nouvelle table ou correction produit n'est proposée dans ce lot. Le catalogue
PostgreSQL capturé par la campagne centrale a ensuite été confronté à cet
inventaire : les 47 colonnes, 32 index, 24 contraintes et quatre triggers attendus
des cinq tables sont présents et cohérents, ainsi que les deux valeurs de l'enum.

## Méthode et couverture

La [revue générale](../../REFERENCE_GENERALE.md) et la
[méthode d'audit](../../methode/audit.md) ont guidé la sélection :

- Q01, Q12 et Q25 : sens métier, propriétaire, cardinalités et distinction
  Personne/Compte ; Q13 : lecture des migrations déjà appliquées, sans les modifier.
- Q05 et Q17 : usages des index dans les tris, curseurs et recherches réels ;
  aucun nouveau résultat de charge n'est déduit de leur seule présence.
- Q06, Q09–Q11 et Q14–Q16 : validation, contrôle d'accès, données personnelles,
  concurrence, audit et suppression ; examen limité aux effets sur ces modèles.
- Q22, Q27 et Q29 : dates civiles, preuves proportionnées et sauvegarde/restauration.
- Q19, Q28 et Q30 : cohérence des responsabilités, disponibilité du schéma et
  version Prisma ; aucun nouveau service, paquet ou réglage.
- Q02–Q04, Q07–Q08, Q18, Q20, Q23–Q24 et Q26 : hors impact de cette lecture,
  sans interface, notification, cache, pièce, automatisation ou engagement livré.
  Q21 : aucun import/export métier ; le transfert de restauration est traité en Q29.

Inventaire : **47 colonnes**, **6 champs de relation**, **2 valeurs d'enum**,
**23 directives `@@index`/`@@unique`**, plus les cinq clés primaires, l'unicité
inline de l'opération de suppression et trois index uniques partiels SQL.
Cela représente 32 index physiques attendus pour ces cinq tables, sans compter
les index des journaux examinés dans un autre lot.

Les numéros indiqués sont ceux du [schéma lu][S] ; les liens de source restent
utilisables si une autre partie de ce fichier déplace les déclarations.

## Sources confrontées

| Repère | Source et responsabilité |
| --- | --- |
| S | [Schéma Prisma][S], enum lignes 25–28 et modèles lignes 383–487. |
| M1 | [Fondation Personnes][M1] : tables, types, CHECK, FK, index et tombstone. |
| M2 | [Noms des index][M2] : noms explicites des deux uniques sociaux, compatibles avec la limite des identifiants PostgreSQL. |
| M3 | [Tri du Répertoire][M3] : ajout/remplissage de `sortName`, obligation et index de tri. |
| M4 | [Propriété email/téléphone][M4] : fonction et deux triggers interdisant le déplacement. |
| M5 | [Retrait Partenaires][M5] : conservation explicite de ces protections Personnes. |
| M6 | [Propriété des profils sociaux][M6] : troisième trigger de propriété. |
| V | [Schémas d'entrée][V] et [catalogue métier][K] : valeurs, tailles, transformations, limites et versions exigées. |
| N | [Normalisation serveur][N] et [normalisation commune][U] : identité, recherche, email, téléphone et URL. |
| C | [Service identité/création][C], [coordonnées][E] et [profils sociaux][R] : seules mutations applicatives de ces agrégats. |
| L | [Liste][L], [recherche][Q] et [détection de doublons][DUP] : usages des index. |
| D | [Suppression][D], [route de fiche][API] et [audit][A] : effacement, rejeu et trace atomique. |
| B | [Manifeste de sauvegarde][B], [export de sauvegarde][BE] et [restauration][BR] : couverture des cinq tables et ordre de réinsertion. |
| G | [Contrat des colonnes][GC], [objets SQL][GO] et [vérification du catalogue][G] : inventaire indépendant des contraintes que Prisma ne représente pas entièrement. |

Le [guide de base][DB] fixe déjà la séparation entre garanties SQL et services.
La consultation centrale utilise Prisma **6.19.3** installé. Le résultat Context7
versionné sur les fonctionnalités SQL complémentaires était peu pertinent ; la
[documentation officielle Prisma v6](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/unsupported-database-features)
a donc été utilisée par le coordinateur. Ne pas supprimer un CHECK, un trigger
ou un index partiel parce qu'il n'est pas intégralement décrit dans Prisma 6.

## Sens métier et commentaires

| Déclaration | Sens vérifié et décision |
| --- | --- |
| `PersonStructureStatus` | Enum fermé à deux situations actuelles du Répertoire, également fermé dans V et K. Il ne confère aucun accès applicatif. |
| `IN_STRUCTURE` | Libellé actuel « Dans la structure ». État courant modifiable, sans dates de début/fin ni effet sur un compte. |
| `OUTSIDE_STRUCTURE` | Libellé « Hors structure », valeur par défaut d'une nouvelle fiche sans statut fourni. L'absence d'information ne crée pas automatiquement une adhésion. |
| Commentaire de `Person` | Décrit explicitement une identité durable indépendante d'un compte et un statut qui n'est ni adhésion datée, ni contrat, ni affectation à une équipe. Conforme à l'absence de relation `User`. |
| Commentaires `PersonEmail` / `PersonPhone` | Coordonnées possédées par une fiche. La mention de principale renvoie au SQL ; précisément, SQL garantit **au plus une**, les services garantissent une principale lorsque la collection n'est pas vide. |
| Commentaire `PersonSocialProfile` | Profil possédé, unicité locale au réseau, identifiant ou URL obligatoire, principale par personne/réseau. Conforme aux contraintes et mutations. |
| Absence de commentaire sur `PersonDeletionTombstone` | Le nom et le contrat détaillé dans DB/D identifient sa responsabilité. Pas de défaut fonctionnel ni ajout de champ justifié. Sa durée de conservation n'est pas déduite de l'absence d'une colonne d'expiration. |

Les homonymes et coordonnées partagées entre personnes restent autorisés. Un
email identique à celui d'un compte ne crée aucun lien, accès ou synchronisation.
Une future adhésion, affectation, relation à une entité juridique ou à une saison
devra porter ses propres dates et règles ; le statut actuel ne doit pas être
réinterprété rétroactivement comme cet historique. Aucune table future n'est créée.

## `Person` — chaque champ

Les textes d'identité sont des données personnelles courantes, stockées en clair
pour l'affichage/recherche. Les colonnes normalisées sont tout aussi personnelles :
elles ne sont ni anonymisées ni des empreintes. Les anciennes valeurs sensibles
passent séparément par le journal chiffré A.

| Ligne / déclaration | Contrat confronté et conclusion |
| --- | --- |
| 387 — `id String @id @default(cuid())` | PK SQL `text`, non nullable. Identifiant généré par Prisma, aucun défaut SQL `cuid` attendu. Sert aux FK, routes, curseurs et cible d'audit. Aucun lien automatique avec `User.id`, aucun identifiant d'identité fourni à la création API. |
| 388 — `nickname String? @db.VarChar(80)` | Pseudo facultatif, trim et vide converti en `null` par V ; borne 80. M1 exige la paire avec `normalizedNickname` et au moins un pseudo ou le couple prénom/nom. Aucun `@unique`, conformément aux homonymes permis. |
| 389 — `normalizedNickname String? @db.VarChar(160)` | Dérivé N/U, absent exactement lorsque le pseudo est absent. V refuse le résultat vide ou supérieur à 160 ; M1 vérifie la paire renseignée et non vide. Recherche et clé de tri, pas une seconde valeur éditable. |
| 390 — `firstName String? @db.VarChar(100)` | Prénom facultatif si un pseudo identifie déjà la fiche ; borne 100, trim/null par V. Sans pseudo, prénom et nom sont tous deux exigés. M1 protège le minimum et la paire normalisée. |
| 391 — `normalizedFirstName String? @db.VarChar(200)` | Dérivé du prénom par N/U ; borne normalisée 200 vérifiée avant SQL. M1 protège nullabilité couplée, trim et non-vide ; pas l'algorithme Unicode lui-même. |
| 392 — `lastName String? @db.VarChar(100)` | Même contrat que le prénom pour le nom ; sa nullabilité permet une fiche au seul pseudo. Ce n'est pas la règle distincte du nom de compte `User`. |
| 393 — `normalizedLastName String? @db.VarChar(200)` | Dérivé N/U et limite normalisée 200 ; paire SQL avec le nom. Pas d'unicité de nom civil. |
| 394 — `sortName String @db.VarChar(401)` | Obligatoire, sans défaut arbitraire. N choisit le pseudo normalisé, sinon prénom normalisé + espace + nom normalisé : maximum 200 + 1 + 200. M3 remplit les anciennes lignes puis impose `NOT NULL`. L utilise cette valeur avec `id` pour départager les homonymes. |
| 395 — `birthDate DateTime? @db.Date` | SQL `date`, date civile facultative et sans heure. V valide le calendrier, refuse le futur et les dates au-delà de la borne métier existante ; U sérialise `YYYY-MM-DD`. Âge et majorité sont calculés, jamais persistés comme une vérité périmée. |
| 396 — `structureStatus PersonStructureStatus @default(OUTSIDE_STRUCTURE)` | Non nullable, même défaut dans M1/V. Filtre, synthèse et affichage L/K ; transitions dans les deux sens auditées par C/A. Aucune cascade sur les droits, comptes ou coordonnées. |
| 397 — `version Int @default(1)` | SQL integer positif par CHECK, commence à 1. C incrémente sur identité et mutation enfant ; CAS sur la version fournie, y compris vérification avant no-op. Version technique de concurrence, distincte d'un historique métier. |
| 398 — `createdAt DateTime @default(now())` | Non nullable, SQL `timestamp(3) without time zone` avec défaut `CURRENT_TIMESTAMP`. Date de création utilisée par liste/audit/tri ; représentation UTC du contrat applicatif, distincte de la naissance. Restauration de la valeur d'origine. |
| 399 — `updatedAt DateTime @updatedAt` | Non nullable, même précision SQL ; mise à jour par Prisma, sans trigger ni défaut SQL inventé. Les `updateMany` de C/E/R touchent le parent et rendent visible une modification de coordonnées dans le tri. Les écritures SQL hors services doivent respecter ce contrat. |
| 401 — `emails PersonEmail[]` | Relation inverse 0..n, aucune colonne/table de jointure. Chargée pour la fiche ; limite 10 et principale par E/C, suppression possédée via FK enfant. Aucun partage de ligne entre deux personnes. |
| 402 — `phones PersonPhone[]` | Même cardinalité 0..n, limite 10 par services ; pas de dépendance à la présence d'un email. |
| 403 — `socialProfiles PersonSocialProfile[]` | Relation inverse 0..n, limite globale 20 et principale par réseau par C/R. Une personne peut n'avoir aucun profil. |

### Tous les index déclarés sur `Person`

| Ligne / déclaration | Requête et garantie correspondantes |
| --- | --- |
| 405 — `@@index([createdAt, id])` | Tri `created`, curseur décroissant et départage par identifiant L. Le B-tree ascendant peut être parcouru en sens inverse ; pas d'index descendant supplémentaire justifié. |
| 406 — `@@index([structureStatus, createdAt, id])` | Même parcours avec filtre d'égalité sur le statut. |
| 407 — `@@index([updatedAt, id])` | Tri `updated`, curseur et limite temporelle L. |
| 408 — `@@index([structureStatus, updatedAt, id])` | Même tri avec statut fixé. |
| 409 — `@@index([sortName, id])` | Tri par nom ascendant, départage stable L. |
| 410 — `@@index([structureStatus, sortName, id])` | Tri par nom dans un statut donné. |
| 411 — `normalizedNickname`, GIN `gin_trgm_ops`, nom `Person_normalizedNickname_trgm_idx` | Recherche de sous-chaîne pour termes d'au moins trois caractères Q, dépendance à l'extension `pg_trgm` de M1/G. |
| 412 — `normalizedFirstName`, GIN `gin_trgm_ops`, nom `Person_normalizedFirstName_trgm_idx` | Même recherche sur le prénom, y compris les mots de la recherche composée. |
| 413 — `normalizedLastName`, GIN `gin_trgm_ops`, nom `Person_normalizedLastName_trgm_idx` | Même recherche sur le nom. |
| 414 — `normalizedNickname`, B-tree `varchar_pattern_ops`, nom `Person_normalizedNickname_prefix_idx` | Recherche exacte/préfixe, notamment termes courts ; complément du GIN, pas un doublon automatique. |
| 415 — `normalizedFirstName`, B-tree `varchar_pattern_ops`, nom `Person_normalizedFirstName_prefix_idx` | Même usage sur le prénom. |
| 416 — `normalizedLastName`, B-tree `varchar_pattern_ops`, nom `Person_normalizedLastName_prefix_idx` | Même usage sur le nom. |

Les paramètres temporels de L sont convertis en UTC sans transformer les colonnes
indexées. L'éligibilité d'un index ne prouve pas sa sélection par le planificateur
pour tous les volumes. Le signal historique de diff des six `varchar_pattern_ops`
est expliqué dans DB. La [capture SQL de cette campagne][CAT] confirme ces six
opérateurs et des index valides. Le [diff Prisma courant][DIFF] propose néanmoins
trois suppressions et six créations de préfixe : les trois index d'identité sont
recréés, tandis que les trois index email/téléphone/identifiant social ne sont pas
distingués de leur index simple par l'introspection. Ce signal ne justifie pas
leur suppression/recréation automatique ; la comparaison du rejeu des migrations
à la base migrée ne contient [aucune différence][MDIFF].

## `PersonEmail` — chaque déclaration

| Ligne / déclaration | Contrat confronté et conclusion |
| --- | --- |
| 421 — `id String @id @default(cuid())` | PK `text` générée par Prisma, non nullable ; identifie la ligne dans modification/suppression et historique, indépendamment de l'adresse qui peut changer. |
| 422 — `personId String` | Propriétaire obligatoire. FK M1, filtrage explicite de la ligne par `personId` dans E ; trigger M4 interdit sa réaffectation. |
| 423 — `email String @db.VarChar(320)` | Adresse courante affichée, personnelle ; V trim + validation d'email + borne 320. CHECK M1 trim/non-vide ; aucune valeur par défaut factice. |
| 424 — `normalizedEmail String @db.VarChar(320)` | Adresse trim/minuscule en-US, calculée par N/U ; recherche et doublons. Borne compatible avec le format d'email accepté par V. SQL impose trim/non-vide, la transformation appartient au service. |
| 425 — `label String @db.VarChar(40)` | Libellé utilisateur obligatoire, trim/non-vide/maximum 40 par V/M1. Suggestions K, sans enum rigide. Valeur sensible dans l'historique A/E. |
| 426 — `isPrimary Boolean @default(false)` | Défaut prudent pour insertion brute ; C/E promeuvent le premier élément et contrôlent les changements. Unique partiel SQL par personne, sans interdire une collection vide. |
| 427 — `version Int @default(1)` | Positif SQL ; CAS enfant et parent dans E. Changement de principale incrémente aussi la version de la ligne démise/promue. |
| 428 — `createdAt DateTime @default(now())` | Date de création non nullable, SQL `timestamp(3)`, défaut SQL présent. Utilisée pour l'ordre secondaire de fiche ; préservée lors d'une modification et d'une restauration. |
| 429 — `updatedAt DateTime @updatedAt` | Date technique Prisma, non nullable, SQL `timestamp(3)` sans défaut SQL. Réponse de fiche et suivi de ligne, restauration exacte. |
| 431 — `person Person @relation(fields: [personId], references: [id], onDelete: Cascade)` | Enfant possédé : suppression de fiche retire ses emails. SQL `ON DELETE CASCADE`, `ON UPDATE CASCADE`. Le trigger de propriété refuse un déplacement de la coordonnée ; aucun parcours ne renomme la PK de la personne. |
| 433 — `@@unique([personId, normalizedEmail])` | Interdit la même adresse normalisée deux fois dans une fiche. Le préfixe `personId` sert aussi aux lectures/compteurs de ses emails. La même adresse sur deux personnes reste possible avec avertissement non bloquant. |
| 434 — `@@index([normalizedEmail])` | Recherche d'égalité et détection de doublons entre fiches Q/DUP. |
| 435 — index `normalizedEmail` avec `varchar_pattern_ops`, nom `PersonEmail_normalizedEmail_prefix_idx` | Recherche de préfixe Q ; distinct de l'unicité locale. |

## `PersonPhone` — chaque déclaration

| Ligne / déclaration | Contrat confronté et conclusion |
| --- | --- |
| 440 — `id String @id @default(cuid())` | PK `text` générée par Prisma, identifiant de ligne/historique stable malgré la modification du numéro. |
| 441 — `personId String` | Propriétaire obligatoire, FK et trigger M4 ; E exige la même fiche pour la lecture, le CAS et le remplacement de principale. |
| 442 — `phone String @db.VarChar(40)` | Numéro saisi conservé pour affichage, trim/non-vide/maximum 40. V utilise le pays choisi et `libphonenumber-js` pour refuser un numéro invalide. Valeur personnelle, sans défaut. |
| 443 — `normalizedPhone String @db.VarChar(16)` | Numéro E.164 : `+` et au plus 15 chiffres, CHECK SQL `^\+[1-9][0-9]{1,14}$`. Résultat de validation V, utilisé pour recherche/doublons ; la capacité 16 est adaptée. Le pays de saisie n'est pas une colonne redondante : C dérive le pays depuis ce numéro pour le DTO. |
| 444 — `label String @db.VarChar(40)` | Libellé obligatoire et libre, suggestions K ; limites V et trim/non-vide SQL. Historique sensible. |
| 445 — `isPrimary Boolean @default(false)` | Première ligne promue par C/E ; au plus une par personne en SQL, remplacement nécessaire avant retrait d'une principale lorsque d'autres lignes demeurent. |
| 446 — `version Int @default(1)` | CHECK positif ; version enfant + version parent comparées, versions des principales touchées incrémentées. |
| 447 — `createdAt DateTime @default(now())` | Non nullable, SQL `timestamp(3)` avec défaut SQL ; ordre secondaire et DTO, valeur conservée. |
| 448 — `updatedAt DateTime @updatedAt` | Non nullable, SQL `timestamp(3)` sans défaut SQL, gérée par Prisma lors des mutations. |
| 450 — relation `person`, FK `personId` → `Person.id`, `onDelete: Cascade` | Suppression des coordonnées possédées avec la fiche ; `ON UPDATE CASCADE` SQL et trigger d'immobilité comme pour les emails. Aucun propriétaire facultatif/orphelin admis. |
| 452 — `@@unique([personId, normalizedPhone])` | Unicité locale E.164 et accès par propriétaire ; aucun rapprochement global avec une personne ou un compte. |
| 453 — `@@index([normalizedPhone])` | Recherche exacte et doublons entre fiches Q/DUP. |
| 454 — index `normalizedPhone` avec `varchar_pattern_ops`, nom `PersonPhone_normalizedPhone_prefix_idx` | Recherche de préfixe numérique Q. |

## `PersonSocialProfile` — chaque déclaration

| Ligne / déclaration | Contrat confronté et conclusion |
| --- | --- |
| 460 — `id String @id @default(cuid())` | PK `text` stable, générée par Prisma ; historique attaché à la ligne, pas à un identifiant social mutable. |
| 461 — `personId String` | Propriétaire obligatoire. FK M1 et trigger M6, même garde de propriété et versions que les autres coordonnées. |
| 462 — `networkKey String @db.VarChar(40)` | Clé stable, trim/minuscule, regex SQL alphanumérique avec `_`/`-` ; V exige le catalogue K. Une chaîne plutôt qu'un enum permet de garder une ancienne clé lisible (`twitter`) sans l'offrir aux nouvelles créations ; R contrôle aussi les changements de réseau. |
| 463 — `identifier String? @db.VarChar(100)` | Identifiant courant facultatif si URL fournie, trim/null et borne 100. M1 impose sa paire normalisée et au moins un identifiant ou une URL. |
| 464 — `normalizedIdentifier String? @db.VarChar(100)` | Trim/minuscule en-US pour recherche/unicité. V borne aussi le résultat normalisé à 100 : un allongement Unicode n'est pas laissé à un dépassement SQL. Paire nulle/renseignée imposée par M1. |
| 465 — `profileUrl String? @db.VarChar(2048)` | URL HTTP(S) facultative si identifiant, sans utilisateur/mot de passe ; borne brute 2048 par V. Valeur personnelle affichée, pas un lien de connexion ni une URL arbitraire d'exécution. |
| 466 — `normalizedProfileUrl String? @db.VarChar(2048)` | URL canonique U : fragment retiré, hôte/protocole et ports normalisés, tri des paramètres. V vérifie aussi sa longueur résultante ; M1 exige le triplet URL/normalisée/hash complet. |
| 467 — `normalizedProfileUrlHash String? @db.Char(64)` | SHA-256 hexadécimal minuscule produit par N, exactement 64 caractères vérifiés en SQL. Indexe la valeur longue sans utiliser l'URL entière comme clé B-tree. Ce hash n'anonymise pas une URL prévisible. Q/DUP comparent aussi l'URL normalisée pour le rapprochement. |
| 468 — `label String @db.VarChar(40)` | Libellé courant libre, obligatoire et borné, sans enum de suggestions. Historique sensible. |
| 469 — `isPrimary Boolean @default(false)` | Au plus une principale par `(personId, networkKey)` en SQL. C/R assurent une principale quand le réseau a des profils, y compris déplacement vers un autre réseau et remplacement côté réseau quitté. |
| 470 — `version Int @default(1)` | CHECK positif ; CAS enfant + parent, versions des profils promus/démis également augmentées. |
| 471 — `createdAt DateTime @default(now())` | Non nullable, SQL `timestamp(3)` avec défaut SQL ; ordre de fiche après réseau et principale. |
| 472 — `updatedAt DateTime @updatedAt` | Non nullable, SQL `timestamp(3)` sans défaut SQL, mutation Prisma et réponse de fiche. |
| 474 — relation `person`, FK `personId` → `Person.id`, `onDelete: Cascade` | Appartenance obligatoire, suppression avec la fiche, pas de partage de ligne. Le trigger M6 protège l'immobilité de propriétaire. |
| 476 — `@@unique([personId, networkKey, normalizedIdentifier])`, nom `PersonSocialProfile_person_network_identifier_key` | Unicité d'un identifiant dans une fiche et un réseau. Les `NULL` multiples permettent des profils fournis seulement par URL ; leur existence est contrôlée par le CHECK alternatif. Nom corrigé dans M2, sans tronquage ambigu. |
| 477 — `@@unique([personId, networkKey, normalizedProfileUrlHash])`, nom `PersonSocialProfile_person_network_url_hash_key` | Même portée pour l'URL canonique. Les profils fournis seulement par identifiant n'entrent pas en collision sur `NULL`. Le choix SHA-256 n'est pas une promesse mathématique d'absence de collision ; aucun cas réel n'est constaté. |
| 478 — `@@index([normalizedIdentifier])` | Recherche exacte et détection inter-fiches, avec réseau lorsque le besoin est un doublon social Q/DUP. |
| 479 — index `normalizedIdentifier` avec `varchar_pattern_ops`, nom `PersonSocialProfile_normalizedIdentifier_prefix_idx` | Recherche de préfixe Q. |
| 480 — `@@index([normalizedProfileUrlHash])` | Recherche d'URL exacte et détection de doublons Q/DUP ; pas de recherche de sous-chaîne d'URL promise. |

## `PersonDeletionTombstone` — chaque déclaration

| Ligne / déclaration | Contrat confronté et conclusion |
| --- | --- |
| 484 — `personId String @id @db.VarChar(128)` | Clé obligatoire de la fiche supprimée, capacité supérieure aux CUID produits. Aucun FK vers `Person` : la trace doit survivre à son effacement. CHECK trim/non-vide ; D recherche d'abord cette clé pour reconnaître un rejeu. Aucun nom, email ou naissance conservé ici. |
| 485 — `deletionOperationId String @unique @db.VarChar(191)` | Clé de suppression fournie par l'API, bornée à 8–191 caractères autorisés dans API, trim/non-vide SQL. L'unicité empêche de réutiliser la même opération pour une autre cible ; collision = rollback de toute la transaction. La reconnaissance d'une fiche déjà supprimée passe par `personId`, elle n'exige pas une nouvelle suppression. |
| 486 — `deletedAt DateTime @default(now())` | Instant technique obligatoire, SQL `timestamp(3)` et défaut SQL. Retenu pour expliquer l'effacement, non utilisé comme expiration automatique. Restauration de la valeur originale. |

M1 ajoute `PersonDeletionTombstone_prevent_mutation`, qui refuse `UPDATE` et
`DELETE`. Un `INSERT` de restauration sur base vide reste possible. La transaction D
réunit contrôle d'autorisation, version, purge de l'historique de valeurs,
suppression avec cascades, création du tombstone et audit minimal. Aucun compte
`User` n'est supprimé avec la fiche.

## Garanties SQL complémentaires, hors syntaxe Prisma

| Objet | Source et contrôle de cohérence |
| --- | --- |
| Minimum d'identité et trois paires originales/normalisées | M1 et G ; complètent les champs nullable de S. L'API refuse aussi les accents isolés qui deviennent vides à la normalisation. |
| Quatre versions positives | M1 : `Person` et les trois tables enfants ; alignées avec V et les CAS des services. |
| Email, téléphone, labels et valeurs du tombstone non vides/trim | M1, types et CHECK de G ; aucun défaut de colonne masqué par les seuls formulaires. |
| Téléphone E.164 | M1 et V ; format SQL borné, validité téléphonique du ressort du validateur. |
| Réseau, paire d'identifiant, triplet d'URL, identifiant ou URL | M1/G avec N/V/R. Le hash doit être hexadécimal ; la correspondance SHA-256 avec l'URL est calculée par le service, pas par un trigger. |
| `PersonEmail_one_primary_per_person_idx` | Unique partiel sur `personId WHERE isPrimary = true`. |
| `PersonPhone_one_primary_per_person_idx` | Même protection indépendante pour les téléphones. |
| `PersonSocialProfile_one_primary_per_network_idx` | Unique partiel sur `personId, networkKey WHERE isPrimary = true`. |
| Trois `*_prevent_person_reassignment` | M4/M6, fonction partagée `prevent_person_coordinate_reassignment` ; M5 ne les retire pas avec le module Partenaires. |
| `PersonDeletionTombstone_prevent_mutation` | M1 : mémoire de suppression immuable dans l'état courant de la base. |
| Purge ciblée de l'historique | M1/D : voie contrôlée `purge_person_audit_field_changes`, verrou sur la fiche et suppression des valeurs seulement ; journal minimal conservé. Les modèles du journal sont analysés dans le lot audit. |

Les services imposent en plus les plafonds 10/10/20, la présence d'une principale
dans chaque collection/réseau non vide, le résultat normalisé, les dates plausibles
et les réseaux autorisés. Ce partage est une décision existante de DB, pas une
nouvelle dispense. Les mutations verrouillent la fiche, vérifient l'acteur/source
dans la même transaction, puis comparent les versions parent/enfant. Une écriture
SQL manuelle peut contourner ces règles applicatives : cette fiche ne qualifie
pas un futur import brut comme compatible.

Les contrôles du catalogue G vérifient types, nullabilités, défauts, enum,
contraintes, opérateurs d'index, fonctions et triggers attendus. Ils ne prouvent
pas que toutes les données anciennes respectent un algorithme de normalisation
qui n'est pas un CHECK SQL ; aucun nouveau changement de cet algorithme n'est fait.

## Sauvegarde, restauration et confidentialité

Les cinq modèles figurent dans B. La sauvegarde BE lit les lignes complètes dans
un snapshot `RepeatableRead`, avec curseurs par `id`, ou `personId` pour le
tombstone. Il n'existe pas une seconde liste manuelle des 47 colonnes qui omettrait
un champ de ces modèles.

Ordre pertinent : tombstones, personnes, emails, téléphones et profils sociaux,
puis historique de champs. Le tombstone indépendant peut précéder la personne ;
les trois FK enfants voient toujours leur parent restauré. BR utilise les types
réels de la table par `jsonb_populate_recordset`, garde les contraintes actives,
verrouille les tables d'une cible vide et restaure dans une transaction
`Serializable`. Les identifiants, dates, versions, formes normalisées et principales
sont réinsérés explicitement : pas de nouveaux CUID, dates du jour ou renommage.

Les clés nécessaires à l'historique chiffré font partie de la vérification de
restauration. La signature et le checksum de sauvegarde ne rendent pas les
identités/coordonnées courantes anonymes ou chiffrées : le fichier reste à protéger
selon [Exploitation](../../exploitation/operations.md).

Un fichier antérieur à une suppression ne possède pas son futur tombstone et
peut réintroduire la personne. Ce cas reste une limite d'exploitation à réconcilier
avant remise en service, déjà documentée dans DB ; ajouter une FK de tombstone ou
une colonne d'archivage ne le résoudrait pas. Aucune qualification juridique des
durées ni nouvelle procédure opérationnelle n'est affirmée ici.

## Preuves et limites de cette lecture

- Les 53 déclarations de champ/relation et 23 directives d'index sont recensées
  une à une ci-dessus, avec les deux valeurs de l'enum et les commentaires métier.
  Sources examinées : schéma, migrations, validateurs, mutations, recherche,
  disponibilité du schéma, sauvegarde et restauration.
- Le [catalogue SQL courant][CAT], produit sur la base PostgreSQL isolée de la
  campagne centrale, a été relu pour ces cinq tables : 47 colonnes conformes,
  32 index tous valides, 16 CHECK validés, cinq PK, trois FK et quatre triggers
  actifs. Les deux valeurs de `PersonStructureStatus` sont celles du schéma.
  Cette lecture vérifie les objets effectifs ; elle ne simule pas chaque écriture.
- La [preuve Personnes de clôture][PC] a réellement exécuté 78 cas SQL et 150
  contrôles unitaires/API simulées les 12–13 octobre. Ces résultats sont antérieurs
  à cette fiche documentaire ; ils ne sont ni recomptés ni présentés comme une
  nouvelle exécution de la revue du schéma.
- La [preuve de restauration de clôture][REST] décrit un exercice isolé réussi
  sur 19 tables, dont les cinq présentes ici. Elle ne prouve ni la reprise de
  toutes les anciennes sauvegardes, ni un déploiement en production.
- Aucun accès à la base habituelle, aucune modification produit/migration et
  aucune nouvelle campagne navigateur dans ce lot. Le catalogue SQL de la
  campagne de schéma est centralisé par le coordinateur.
- Pas de nouvel essai de charge, de mesure de cardinalité en exploitation, de
  scénario de collision SHA-256 ou d'import de données hors services. Ces limites
  ne sont pas transformées en défauts supposés ou en tables à créer.

**Défauts nouveaux établis : aucun.** Les choix à conserver sont la séparation
Personne/Compte, les homonymes autorisés, le statut courant explicite, la propriété
des coordonnées, la double version parent/enfant et les garanties SQL complémentaires.

[S]: ../../../packages/database/prisma/schema.prisma
[DB]: ../../../packages/database/prisma/README.md
[M1]: ../../../packages/database/prisma/migrations/20260721120000_person_identity_foundation/migration.sql
[M2]: ../../../packages/database/prisma/migrations/20260722144500_normalize_person_index_names/migration.sql
[M3]: ../../../packages/database/prisma/migrations/20260722190000_person_directory_sorting/migration.sql
[M4]: ../../../packages/database/prisma/migrations/20260725120000_partner_contact_coordinates/migration.sql
[M5]: ../../../packages/database/prisma/migrations/20260921120000_remove_partner_module/migration.sql
[M6]: ../../../packages/database/prisma/migrations/20261011180000_person_coordinate_ownership/migration.sql
[V]: ../../../apps/web/src/features/persons/schemas/person.schemas.ts
[K]: ../../../apps/web/src/features/persons/person.constants.ts
[N]: ../../../apps/web/src/features/persons/server/person-normalization.ts
[U]: ../../../apps/web/src/features/persons/person.utils.ts
[C]: ../../../apps/web/src/features/persons/server/person-core.service.ts
[E]: ../../../apps/web/src/features/persons/server/person-contact.service.ts
[R]: ../../../apps/web/src/features/persons/server/person-social.service.ts
[L]: ../../../apps/web/src/features/persons/server/person-list.service.ts
[Q]: ../../../apps/web/src/features/persons/server/person-search.ts
[DUP]: ../../../apps/web/src/features/persons/server/person-duplicate-detection.ts
[D]: ../../../apps/web/src/features/persons/server/person-deletion.ts
[API]: ../../../apps/web/src/app/api/personnes/[id]/route.ts
[A]: ../../../apps/web/src/features/persons/server/person-audit.ts
[B]: ../../../packages/database/scripts/database-backup-format.ts
[BE]: ../../../packages/database/scripts/database-backup.ts
[BR]: ../../../packages/database/scripts/restore-database.ts
[GC]: ../../../apps/web/src/features/persons/server/person-schema-column-contract.ts
[GO]: ../../../apps/web/src/features/persons/server/person-schema-object-contract.ts
[G]: ../../../apps/web/src/features/persons/server/person-schema-readiness.ts
[PC]: ../cloture-socle-2026-10-12/personnes/README.md
[REST]: ../cloture-socle-2026-10-12/integration/README.md
[CAT]: preuves/catalogue-apres.json
[DIFF]: preuves/diff-prisma.sql
[MDIFF]: preuves/diff-migrations.sql
