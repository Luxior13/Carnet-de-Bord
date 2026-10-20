# Schéma Prisma — configuration, comptes et MFA

Revue du 13 octobre 2026, référence `c54e5d8` complétée par les changements locaux
de clôture des 12–13 octobre. Périmètre : configuration du client et de la source,
trois enums et sept modèles du [schéma][S]. Les déclarations ci-dessous ont été
confrontées aux consommateurs, aux migrations et au catalogue PostgreSQL capturé
par la campagne centrale. Cette pièce ne renouvelle pas tous les parcours des pages.

**Conclusion : aucun changement de ces sept modèles n'est nécessaire.** Un défaut
important de restauration a été reproduit et corrigé : une clé MFA absente ou
incorrecte, ou une clé d'audit incorrecte mais bien formée, était acceptée par le
préflight. La restauration pouvait donc réussir avec des secrets illisibles. Le
contrôle authentifie désormais chaque enveloppe avant toute connexion à la base.
Le format signé v9 reste inchangé ; les validations détaillées figurent en fin de fiche.

## Méthode et couverture

La [revue générale](../../REFERENCE_GENERALE.md), la
[méthode d'audit](../../methode/audit.md) et les fiches
[schéma](../../references/schema-prisma.md),
[migrations](../../references/migrations.md),
[sécurité](../../references/securite.md) et
[restauration](../../references/sauvegarde-restauration.md) ont été lues.
Q01, Q06, Q09–Q17, Q19, Q22, Q25 et Q27–Q30 concernent ici les responsabilités,
types, droits, secrets, concurrence, dates, traces, stockage et reprises. La
présentation, les pièces jointes, les notifications et les domaines futurs sont
hors impact ; aucun ajout d'interface ou de modèle futur n'en découle.

Inventaire exhaustif de ce lot : **74 colonnes**, **17 champs de relation**,
**25 directives de modèle** `@@index`/`@@unique`, **6 valeurs d'enum**,
les deux blocs de configuration et leurs trois propriétés. Cela correspond à
**37 index physiques**, **23 contraintes** et **2 triggers** dans le
[catalogue après migrations][PG]. Les clés primaires et uniques inline figurent
dans les lignes des champs, sans les compter deux fois comme directives.

### Sources et conventions des tableaux

| Repère | Source relue |
| --- | --- |
| S / PG | [Schéma][S] / [catalogue SQL final][PG], types, défauts, nullabilité, contraintes et index. |
| A | [Authentification et sessions][A] : projections, mot de passe, émission et validation des sessions. |
| G | [Autorité sous verrou][G] : acteur, droits, source de session, versions et preuves relus dans la transaction. |
| F | [MFA][F], [configuration][FS] et [vérification][FV] : chiffrement, défis, consommation et remplacement. |
| C / U / D | [Création de compte][C], [modification][U], [suppression irréversible][D]. |
| L / Q | [Liste Utilisateurs][L] et [recherche][Q] : filtres, tris et projection. |
| P / E | [Permissions][P] et [adresse de contact][E] : overrides connus et adresse indépendante du login. |
| T / H | [Sessions personnelles][T] et [maintenance][H] : listes, révocation et expiration. |
| B / R | [Contrat de sauvegarde][B] et [restauration][R], avec le nouveau [contrôle de chiffrement][RC]. |
| M0 | [Tables initiales][M0] : types SQL et premières clés de User/Session. |
| M1 | [Séparation login/contact][M1] : login normalisé, réservation durable, versions, contact. |
| M2 | [Compte racine][M2] : état protégé et unicité partielle. |
| M3 / M4 | [MFA][M3] puis [MFA obligatoire][M4] : enveloppes, enums, relations et sessions obligatoirement prouvées. |
| M5 / M6 | [Preuves d'administration][M5] puis [suppression irréversible][M6]. |
| M7 / M8 | [Expiration d'inactivité][M7] puis [nom facultatif][M8]. |
| M9 / M10 | [Index de liste][M9] et [index de verrouillage][M10]. |
| M11 / M12 | [Audit durable][M11] et [réconciliation du socle][M12]. |
| M13 / M14 | [Option de session persistante][M13] et [retrait de l'index de token redondant][M14]. |

Dans tous ces modèles, `String` est stocké en `text`, `Int` en `integer`,
`BigInt` en `bigint`, `Json` en `jsonb`, et `DateTime` en `timestamp(3)` sans
fuseau. Les producteurs utilisent des instants `Date` et une sérialisation ISO,
pas des dates civiles. `?` correspond à une colonne SQL nullable. Les IDs `cuid()`
et `@updatedAt` sont gérés par Prisma ; un INSERT SQL/restauration fournit ces
valeurs explicitement. `now()` a un défaut SQL `CURRENT_TIMESTAMP`. Aucun trigger
universel ne met `updatedAt` à jour lors d'un SQL manuel.
Un script SQL direct utilisant ces défauts doit fixer sa session en UTC ; le
[contrôle central du fuseau](preuves/fuseau.json) distingue cette précondition
des dates fournies explicitement par Prisma. Aucun défaut de date d'un écrivain
applicatif actuel n'a été reproduit dans cette passe.

La version installée est **Prisma 6.19.3**. Context7 a été consulté pour ces
annotations : la cible versionnée ne retournait aucun extrait utilisable et le
repli proposait Prisma Next. La
[référence officielle Prisma v6](https://www.prisma.io/docs/orm/v6/reference/prisma-schema-reference)
et les SQL du dépôt ont donc servi de référence ; aucune commande Prisma 7
n'a été transposée. Les index, CHECK et triggers additionnels ne doivent pas
être supprimés au motif qu'ils ne figurent pas entièrement dans le DSL Prisma.

## Configuration et enums

| Déclaration | Décision et preuve |
| --- | --- |
| `generator client` | Un client JavaScript unique pour les consommateurs TypeScript de `@repo/database`. [Paquet][PK] et S. |
| `provider = "prisma-client-js"` | Générateur effectivement installé en version 6.19.3, utilisé par `prisma generate`. Aucun besoin de changer de générateur ni d'ajouter une fonctionnalité expérimentale. PK. |
| `datasource db` | Une source relationnelle PostgreSQL pour les transactions, FK, verrous et fonctions SQL actuels. M0–M14. |
| `provider = "postgresql"` | Correspond au dialecte des migrations et au PostgreSQL 17 du banc ; JSONB, GIN, partial indexes et triggers sont intentionnels. PG. |
| `url = env("DATABASE_URL")` | L'URL reste externe au schéma. Bancs avec cible explicite isolée, aucune donnée de développement lue ou modifiée pour cette revue. PK, R. |
| `enum UserRole` | Deux rôles persistés ; le compte racine est `ADMIN` + `isProtected`, pas un troisième rôle. P, M0, M2. |
| `ADMIN` | Préréglage administratif auquel s'appliquent les overrides et la protection racine. P, G. |
| `USER` | Préréglage minimal et défaut des comptes ; les droits effectifs restent calculés. P, C. |
| `enum MfaChallengePurpose` | Sépare les deux intentions de défi, validées par la route consommatrice. F, M3. |
| `LOGIN` | Vérification d'une preuve sur le credential courant avant création de session. FV, A. |
| `SETUP` | Amorçage/configuration avant activation ; n'accorde pas seul une session applicative. FS, A. |
| `enum MfaAuthenticationMethod` | Preuve exigée sur chaque session SQL finale, distincte du déverrouillage administratif. M4, M5. |
| `TOTP` | Consommation atomique d'un pas de temps non déjà utilisé. F, A. |
| `RECOVERY_CODE` | Consommation atomique d'un code à usage unique ; n'est pas une preuve TOTP d'administration critique. F, G. |

## User

Le modèle décrit un **compte applicatif**, indépendamment de la personne du
Répertoire. Aucune FK Person n'est ajoutée. Les commentaires `isProtected` et
`deletedAt` reflètent les règles actuelles ; la suppression conserve un tombstone
anonyme immuable, les audits et la propriété des anciens identifiants.

| Déclaration | Décision et preuve |
| --- | --- |
| `id String @id @default(cuid())` | Identité technique stable, sans sens métier ; PK utilisée par toutes les FK. C, A, M0. |
| `loginName String @unique` | Obligatoire et unique ; login public de 3–32 caractères en minuscules, ou namespace technique `deleted:` pour un tombstone. M1/M6 imposent les formats SQL ; C/U réservent l'identifiant. |
| `contactEmail String?` | Facultatif, normalisé, **non unique**, jamais identifiant d'authentification. Plusieurs comptes peuvent partager une adresse de contact. E, C, M1. |
| `contactEmailVerifiedAt DateTime?` | Nullable et remis à null lors d'un changement ; CHECK exige null sans contact. Aucun parcours de vérification d'adresse n'est livré : ne pas présenter un champ rempli comme une capacité actuelle. E, U, M1. |
| `passwordHash String` | Hash bcrypt requis, jamais projeté dans les DTO ; le tombstone emploie une valeur inutilisable imposée par SQL. A, C, D, M6. |
| `firstName String` | Prénom requis côté formulaire et services ; tombstone fixé à « Compte ». C, U, D, M0/M6. |
| `lastName String?` | Nom facultatif depuis M8 ; consommateurs acceptent null ou chaîne vide normalisée, suppression d'une ancienne valeur explicitement traitée. C, U. Aucun passage forcé null/chaîne vide nécessaire. |
| `role UserRole @default(USER)` | Défaut le moins privilégié ; création ADMIN et modification des accès contrôlées sous verrou. C, U, G, M0. |
| `permissions Json?` | Overrides facultatifs, pas un catalogue de permissions en base. Clés/valeurs normalisées par P, règles de délégation contrôlées par les services ; null signifie préréglage de rôle. M6 conserve seulement les refus historiques compatibles. |
| `isActive Boolean @default(true)` | Statut de compte ; authentification refuse l'inactivité, changements sensibles révoquent les sources. La racine doit rester active. A, G, U, M2. |
| `isProtected Boolean @default(false)` | Compte racine protégé : CHECK + index unique partiel imposent **au plus un** compte ADMIN actif non supprimé. Seed/restauration exigent sa présence ; SQL seul n'impose pas qu'il existe. M2/M6, R. |
| `mustChangePassword Boolean @default(false)` | Faux par défaut général ; C le positionne vrai pour le secret temporaire. A limite alors les actions autorisées avant remplacement. |
| `failedLoginAttempts Int @default(0)` | Compteur technique incrémenté/réinitialisé par A, sans entrée client directe. Les quotas et seuils sont du métier serveur ; pas de nouveau CHECK spéculatif. M0. |
| `lockedUntil DateTime?` | Null signifie aucune échéance de verrouillage ; A compare à l'instant courant, L calcule l'état verrouillé. M0/M10. |
| `lastLoginAt DateTime?` | Inconnu avant première connexion ; A l'écrit à l'ouverture de session, sans fausse nouvelle connexion pour une rotation de source. L l'utilise en tri/présentation. |
| `passwordChangedAt DateTime?` | Instant du remplacement effectif, absent avant changement ; remis à null dans le tombstone. A, D, M0/M6. |
| `mfaEnabledAt DateTime?` | Absence avant activation ; les lecteurs vérifient aussi le credential, pas uniquement cette date. Activation/remplacement transactionnels ; désactivation par reset contrôlé. F, FS, A, M3. |
| `securityVersion Int @default(0)` | Génération d'autorité des sessions/défis ; incrémentée lors d'une invalidation et comparée sous verrou. A, G, U, M1. Aucun numéro reçu du client ne devient une nouvelle version arbitraire. |
| `deletedAt DateTime?` | Null pour un compte vivant, timestamp de suppression irréversible sinon. M6 impose anonymisation et trigger d'immuabilité ; ce champ n'est plus une archive réversible. D. |
| `createdAt DateTime @default(now())` | Date de création persistée pour liste/audit, défaut SQL et conservation à la restauration. L, M0, R. |
| `updatedAt DateTime @updatedAt` | Version temporelle de fiche utilisée en comparaison optimiste ; G complète cette protection par l'autorité actuelle. A renvoie la projection après création de session. U, A, M0. |
| `sessions Session[]` | Inverse un-à-plusieurs ; sessions séparées et révocables, FK portée par Session. A, T, M0. |
| `auditLogs AuditLog[] @relation("AuditActor")` | Inverse acteur, distinct de la cible ; FK audit finale Restrict préserve les références. D, M11. |
| `targetedAuditLogs AuditLog[] @relation("AuditTarget")` | Inverse cible de l'action ; nom distinct évite l'ambiguïté des deux relations User/AuditLog. M11, U. |
| `archivedStaffProfile ArchivedStaffProfile?` | Relation héritée facultative, unique côté archive, FK SetNull ; suppression applicative nettoie cette archive. Aucun nouveau module Staff n'est activé. D, M12. |
| `loginNameReservations LoginNameReservation[]` | Un compte conserve tous ses anciens identifiants ; pas de cascade de suppression. C, U, M1. |
| `totpCredential TotpCredential?` | Zéro ou un secret actif, absent avant activation ou après reset. La PK enfant porte la cardinalité. F, M3. |
| `totpEnrollment TotpEnrollment?` | Zéro ou un secret provisoire, distinct de l'actif afin de ne pas couper le second facteur pendant le remplacement. FS, M3. |
| `mfaRecoveryCodes MfaRecoveryCode[]` | Ensemble de codes salés à usage unique, renouvelé atomiquement. F, FS, M3. |
| `mfaLoginChallenge MfaLoginChallenge?` | Au plus un défi courant par compte ; un nouveau défi remplace le précédent. F, M3. |
| `internalAnnouncements InternalAnnouncement[] @relation("InternalAnnouncementAuthor")` | Inverse auteur ; FK nullable SetNull et snapshots sur l'annonce. Modèle conservé, sans réactiver une page future. S, B. |
| `updatedSystemSettings SystemSetting[] @relation("SystemSettingUpdater")` | Inverse du dernier modificateur ; FK nullable SetNull, l'audit reste séparé. S, B. |
| `@@index([contactEmail])` | B-tree exact hérité de M1 ; la recherche courante utilise aussi GIN. Aucun plan spécifique à ce seul index n'est revendiqué, retrait non justifié par cette revue. L, Q, PG. |
| `@@index([role])` | Index de rôle historique, distinct des filtres vivants composites. Présent et valide ; pas de suppression sans mesure de coût/utilité. M0, L, PG. |
| `@@index([deletedAt])` | Exclusion des tombstones, statistiques et recherches par état ; recouvrement partiel avec composites, pas preuve automatique d'inutilité. L, M0. |
| `@@index([deletedAt, createdAt])` | Liste vivante ordonnée par création ; index conforme à M9, départage par id dans le service. L. |
| `@@index([deletedAt, isActive])` | Filtre/statistiques vivant-actif/inactif. L, M9. |
| `@@index([deletedAt, lastLoginAt])` | Filtre vivant et activité/tri de connexion ; gestion explicite des nulls dans L. M9. |
| `@@index([deletedAt, lockedUntil])` | Statistiques/comptage de comptes actuellement verrouillés, malgré le nom historique de la migration Dashboard. L, M10. |
| `@@index([deletedAt, mustChangePassword])` | Compte vivant en attente de changement de mot de passe. L, M9. |
| `@@index([deletedAt, role])` | Segmentation des vivants par rôle ; ne prouve pas que tout cast SQL utilise cet index. L, M9. |
| `@@index([mfaEnabledAt])` | Index livré par M3 ; pas de requête temporelle autonome mesurée dans ce lot. Présence correcte, bénéfice spécifique non certifié, aucune optimisation hypothétique. PG, A. |
| `@@index([loginName(ops: raw("gin_trgm_ops"))], type: Gin, map: "User_loginName_trgm_idx")` | Recherche textuelle autorisée ; l'unique B-tree ne remplace pas le GIN trigramme. Extension pg_trgm présente. Q, M1, PG. |
| `@@index([contactEmail(ops: raw("gin_trgm_ops"))], type: Gin, map: "User_contactEmail_trgm_idx")` | Recherche de contact seulement lorsque l'acteur peut le consulter ; index technique sans effet sur cette permission. Q, M1. |
| `@@index([firstName(ops: raw("gin_trgm_ops"))], type: Gin, map: "User_firstName_trgm_idx")` | Recherche textuelle de prénom, conforme aux colonnes réellement recherchées. Q, M9. |
| `@@index([lastName(ops: raw("gin_trgm_ops"))], type: Gin, map: "User_lastName_trgm_idx")` | Recherche textuelle du nom facultatif ; null ne requiert pas une valeur artificielle. Q, M9. |

## LoginNameReservation

Le commentaire décrit la règle métier de propriété permanente. PK, format et
FK Restrict sont garantis par SQL ; l'absence de réaffectation repose aussi sur
C/U qui créent ou relisent une réservation, sans jamais la modifier ou l'effacer.
Un opérateur SQL privilégié pourrait modifier cette table : ce n'est pas un
défaut d'API reproduit, ni une raison d'ajouter un trigger dans cette passe.

| Déclaration | Décision et preuve |
| --- | --- |
| `loginName String @id` | Identifiant normalisé et unique parmi toutes les réservations, anciennes comprises ; CHECK de format 3–32 caractères. M1, C, U. |
| `userId String` | Propriétaire requis ; une collision chez un autre compte est refusée, le retour à son propre ancien login est permis. C, U, M1. |
| `createdAt DateTime @default(now())` | Instant de réservation, conservé lors d'un changement ultérieur du nom courant. M1, B. |
| `user User @relation(fields: [userId], references: [id], onDelete: Restrict)` | Compte parent requis ; Restrict empêche sa suppression physique avec une réservation. ON UPDATE CASCADE correspond au catalogue. M1, PG. |
| `@@index([userId])` | Accès à l'historique d'un propriétaire et support de la FK ; unicité globale portée séparément par la PK login. M1, U, PG. |

## Session

Les deux échéances ont des responsabilités distinctes : durée absolue et
inactivité. Leur cohérence et le refus d'une session persistante pour la racine
sont contrôlés par A/G, pas par un CHECK dépendant de l'heure. Une révocation
efface la session ; elle ne modifie pas l'historique des audits.

| Déclaration | Décision et preuve |
| --- | --- |
| `id String @id @default(cuid())` | Identifiant de gestion/révocation, distinct du secret de cookie. T, A, M0. |
| `userId String` | Propriétaire requis, contrôlé pour toute lecture/révocation. A, G, T, M0. |
| `securityVersion Int @default(0)` | Copie de la génération du compte lors de l'émission ; mismatch refuse une ancienne source. A, G, M1. |
| `token String @unique` | Contient le hash du token aléatoire courant ; cookie contient le token brut. A conserve une lecture de transition pour d'anciens tokens non hachés, sans en produire de nouveaux. Unicité B-tree suffisante ; doublon d'index retiré par M14. |
| `expiresAt DateTime` | Échéance absolue obligatoire calculée à l'émission, jamais prolongée par simple activité. A, M0. |
| `idleExpiresAt DateTime @default(dbgenerated("(CURRENT_TIMESTAMP + '00:30:00'::interval)"))` | Défaut SQL de 30 min pour insertions directes ; A fournit la valeur explicite bornée par expiresAt, avec durée adaptée à rememberMe. M7, PG. |
| `lastSeenAt DateTime @default(now())` | Dernière activité persistée avec mise à jour espacée, pas une écriture par requête. A, M7. |
| `rememberMe Boolean @default(false)` | Choix explicite modifiant les durées ; racine exclue par A et validation de session. M13, M4. |
| `passwordReauthenticatedAt DateTime?` | Preuve de mot de passe récente, nullable pour mode verrouillé ; revalidée après attente sous verrou. G, M5. |
| `criticalMfaVerifiedAt DateTime?` | Preuve TOTP critique distincte de la simple MFA de connexion ; échéance contrôlée au moment de l'action. G, M5. |
| `mfaVerifiedAt DateTime` | Obligatoire après M4 : aucune session applicative finale sans MFA. A renseigne la date de preuve. |
| `mfaMethod MfaAuthenticationMethod` | Méthode obligatoire permettant de distinguer TOTP et code de secours dans les règles de preuve. A, G, M4. |
| `userAgent String?` | Métadonnée facultative de session présentée après filtrage, pas une autorité ni une preuve. A, T, M0. |
| `ipAddress String?` | Métadonnée facultative, pas d'identifiant unique ou de condition d'accès. A, T, M0. |
| `user User @relation(fields: [userId], references: [id], onDelete: Cascade)` | Impossible d'avoir une session orpheline. Cascade physique cohérente ; la suppression logique D efface explicitement les sessions avant le tombstone. M0, PG. |
| `createdAt DateTime @default(now())` | Tri des sessions et instant d'émission conservé. A, T, M0. |
| `updatedAt DateTime @updatedAt` | Modifications de source/activité tracées ; ne remplace pas securityVersion et échéances. A, G, M0. |
| `@@index([userId])` | Listes et suppressions de toutes les sessions d'un compte. T, A, M0. |
| `@@index([userId, expiresAt])` | Requêtes de sessions encore valides pour un compte. T, M12. |
| `@@index([userId, idleExpiresAt])` | Second critère d'activité par propriétaire ; pas un index global de purge par date. T, H, M7. |
| `@@index([userId, createdAt])` | Tri des sessions du propriétaire ; présence conforme à M12. T, PG. |

## TotpCredential

Le secret actif est séparé de User et jamais inclus dans les projections
ordinaires. SQL impose une enveloppe non vide ; l'authenticité cryptographique
est vérifiée par F et, désormais, RC. Un `String` n'est pas une permission
d'exposer cette donnée dans un DTO.

| Déclaration | Décision et preuve |
| --- | --- |
| `userId String @id` | PK et FK : exactement zéro ou un credential actif par compte. FS, M3. |
| `secretCiphertext String` | Seed chiffrée AES-256-GCM, encodée Base64 ; aucun secret brut dans User. F, M3, RC. |
| `secretIv String` | IV aléatoire de 12 octets encodé Base64, requis pour le déchiffrement. F, RC. |
| `secretAuthTag String` | Tag GCM de 16 octets ; propriétaire inclus dans les données authentifiées. F, RC. |
| `secretKeyVersion Int @default(1)` | Version V1 actuelle, clé externe requise ; autres versions refusées par F/RC, pas une rotation future inventée. M3. |
| `lastUsedTimeStep BigInt?` | Pas TOTP consommé ; null avant première utilisation. Comparaison atomique stricte empêche le rejeu, BigInt conservé sans perte dans B/R. F, M3. |
| `lastUsedAt DateTime?` | Instant d'usage constaté, nul avant consommation ; distinct du pas cryptographique. F, M3. |
| `createdAt DateTime @default(now())` | Création du credential, persistée et restaurée. FS, M3, B. |
| `updatedAt DateTime @updatedAt` | Jeton de concurrence/replacement utilisé avec lastUsedTimeStep et le snapshot de défi. F, FV, M3. |
| `user User @relation(fields: [userId], references: [id], onDelete: Cascade)` | Secret sans existence autonome ; cascade physique, nettoyage explicite au reset/suppression logique. D, FS, M3. |
| `@@index([lastUsedAt])` | Index historique présent et valide ; aucune requête actuelle de balayage temporel identifiée dans ce lot. Ne pas prétendre à une optimisation mesurée ni le supprimer sans mesure. M3, PG. |

## TotpEnrollment

L'enrôlement provisoire peut coexister avec le credential actif jusqu'à la preuve
du nouveau secret ; cette séparation évite d'invalider prématurément l'accès.

| Déclaration | Décision et preuve |
| --- | --- |
| `userId String @id` | Un seul enrôlement courant par propriétaire ; upsert contrôlé dans FS. M3. |
| `secretCiphertext String` | Même chiffrement que le credential, sans secret brut dans la sauvegarde. F, FS, RC. |
| `secretIv String` | IV 12 octets Base64 distinct pour chaque chiffrement. F, M3, RC. |
| `secretAuthTag String` | Tag 16 octets et AAD lié au compte ; transplanter une enveloppe sur un autre userId échoue. F, RC. |
| `secretKeyVersion Int @default(1)` | V1 externalisée, vérifiée aussi pour les enrôlements lors d'une restauration. F, M3, RC. |
| `expiresAt DateTime` | Expiration obligatoire de la proposition, vérifiée après attente ; purge des propositions expirées. FS, H, M3. |
| `createdAt DateTime @default(now())` | Date de création de la ligne temporaire. FS, M3. |
| `updatedAt DateTime @updatedAt` | Version du remplacement de proposition, utilisée par la confirmation concurrente. FS, M3. |
| `user User @relation(fields: [userId], references: [id], onDelete: Cascade)` | Enrôlement sans compte interdit ; suppression/reset efface la proposition. FS, D, M3. |
| `@@index([expiresAt])` | Recherche de purge par échéance dans H ; conforme au SQL. M3. |

## MfaRecoveryCode

Le commentaire « high-entropy, single-use » est vérifié : codes aléatoires,
stockage salé du hash, restitution du clair une fois et consommation conditionnelle
sur usedAt nul. Ni un chiffrement réversible ni un flag sur User ne convient ici.

| Déclaration | Décision et preuve |
| --- | --- |
| `id String @id @default(cuid())` | Identité technique du code consommé, indépendante de sa valeur secrète. F, M3. |
| `userId String` | Propriétaire obligatoire, inclus dans le calcul de hash et le filtre de consommation. F, M3. |
| `codeHash String` | Hash SHA-256 hexadécimal de code aléatoire + sel + propriétaire ; absence de mot de passe à faible entropie dans cette famille. F, M3. |
| `salt String` | Sel aléatoire indépendant stocké avec le hash, pas un secret à remettre à l'utilisateur. F, M3. |
| `usedAt DateTime?` | Null avant usage ; update conditionnel atomique empêche deux consommations. F, M3. |
| `createdAt DateTime @default(now())` | Date de génération du lot, conservée dans B/R. F, M3. |
| `user User @relation(fields: [userId], references: [id], onDelete: Cascade)` | Codes attachés au seul compte ; purge au remplacement/reset et à la suppression. F, D, M3. |
| `@@unique([userId, codeHash])` | Unicité du hash dans le compte, pas unicité globale d'une donnée dérivée salée. F, M3. |
| `@@index([userId, usedAt])` | Sélection/comptage des codes encore disponibles pour ce compte. F, M3. |

## MfaLoginChallenge

Le défi est un état intermédiaire après mot de passe valide, pas une session
applicative. Le navigateur ne reçoit qu'un token aléatoire HttpOnly ; la table
n'en stocke que le hash. Une nouvelle demande remplace le défi antérieur du compte.

| Déclaration | Décision et preuve |
| --- | --- |
| `id String @id @default(cuid())` | Identité technique consommée/supprimée dans la transaction de connexion. F, FV, M3. |
| `userId String @unique` | Propriétaire et unicité d'un défi courant ; upsert remplace token, version, échéance et compteur. F, M3. |
| `tokenHash String @unique` | Lookup du cookie opaque sans conserver son secret brut ; collision impossible à accepter. F, M3. |
| `purpose MfaChallengePurpose` | Intention obligatoire ; LOGIN et SETUP non interchangeables dans les routes. FV, FS, M3. |
| `securityVersion Int` | Snapshot obligatoire, sans défaut opportuniste ; refuse un défi antérieur à une révocation de sécurité. A, F, M3. |
| `credentialUpdatedAt DateTime?` | Snapshot nullable : absence normale pour première activation, version attendue pour un credential existant. FV, FS, F. |
| `rememberMe Boolean @default(false)` | Choix conservé entre mot de passe et MFA puis appliqué à la session, sous règle racine. F, A, M3. |
| `attempts Int @default(0)` | Compteur SQL non négatif ; plafond et incrément relus/consommés par le serveur. Le CHECK ne remplace pas le contrôle concurrent de tentatives. F, FV, M3. |
| `expiresAt DateTime` | Deadline obligatoire, contrôlée après acquisition des verrous et avant consommation. F, A, H, M3. |
| `createdAt DateTime @default(now())` | Date de création de ligne ; l'upsert peut conserver cette date, la validité dépend d'expiresAt. F, M3. |
| `updatedAt DateTime @updatedAt` | Version de l'état de défi remplacé ou consommé, persistée sans donnée de preuve brute. F, M3. |
| `user User @relation(fields: [userId], references: [id], onDelete: Cascade)` | Défi orphelin impossible ; suppression compte/reset nettoie explicitement les défis. D, M3. |
| `@@index([expiresAt])` | Purge des défis expirés sans condition de propriétaire. H, M3. |
| `@@index([purpose, expiresAt])` | Index historique conforme ; purge courante utilise l'échéance seule. Aucun bénéfice supplémentaire mesuré dans cette revue, aucun retrait spéculatif. H, M3, PG. |

## Sauvegarde, défaut corrigé et preuves

Toutes les tables de ce lot figurent dans B après User et avant leurs autres
consommateurs. La sauvegarde encode sans perte le BigInt du pas TOTP ; les dates,
hashes, enveloppes chiffrées et champs nullable sont réinsérés dans la transaction
de restauration. Les clés de chiffrement sont externes et ne figurent pas dans
l'archive. La signature de l'archive ne prouve pas que les clés de la cible sont
les bonnes.

| Constat | Avant | Correction et résultat |
| --- | --- | --- |
| SCH-AUTH-01 — préflight de chiffrement, clos | `validateRestoreEnvironment` vérifiait seulement la présence et le format Base64/32 octets des clés d'audit. Aucun seed MFA ni ciphertext d'audit n'était authentifié. | RC effectue une seconde lecture bornée du même fichier déjà signé, avant Prisma. Chaque seed actif/provisoire et chaque valeur d'audit ENCRYPTED est déchiffré/authentifié avec son AAD exact. Refus si clé/version/enveloppe/payload illisible. Format v9 conservé. |
| Relecture du fichier | Une validation cryptographique ajoutée sans contrôle des octets pourrait porter sur un autre contenu. | Hash et taille de cette seconde lecture doivent correspondre à ceux signés. La passe d'insertion garde également ses propres vérifications et sa transaction. Test FileHandle avec modification entre passes réussi. |
| Exposition du clair | Messages de parse JSON pourraient révéler une valeur s'ils étaient propagés. | Message générique sans clair, ciphertext ni erreur native ; buffers de clé et de clair effacés dans finally. Aucune garantie d'effacement des chaînes JavaScript immuables n'est revendiquée. |

**Preuve avant :** huit tests avec les opérations effectives de l'ancien préflight
(lecture/digest complet, puis validation d'environnement) : deux cas valides
réussissent et **six refus attendus échouent**, car aucune erreur n'est levée.
Cela reproduit clé MFA absente, clé MFA fausse, propriétaire de seed changé,
clé d'audit fausse, contexte d'audit changé et clair d'audit non JSON. La signature
n'était pas simulée comme une garantie de déchiffrement : ces tests ciblent
l'étape qui suit sa validation, sans connexion SQL.

**Après :** le nouveau [fichier de tests][UT] contient **12 tests réussis**,
dont les six régressions précédentes, l'enveloppe invalide, la version inconnue,
la confidentialité des erreurs et la relecture du même FileHandle. La suite du
paquet passe à **33/33**, sans ignoré. Commandes exécutées dans `packages/database` :

```text
bun run test
bun run typecheck
bunx eslint scripts/database-restore-support.ts scripts/restore-database.ts test/database-restore-encryption.test.ts
```

Tests, types et lint ciblé réussis. Le
[résumé de preuve unitaire](preuves/comptes-verification.json) distingue
les observations avant et après. Le coordinateur a ensuite exécuté le
[banc CLI signé réel](restore.ts) : **7/7 scénarios réussis** dans
[resultats-restauration.json](preuves/resultats-restauration.json), sur des bases
PostgreSQL isolées avec une ligne dans chacune des **19 tables**. Clés MFA/audit
absentes ou fausses refusées sans écriture, bon dry-run sans écriture,
restauration avec égalité des hashes des 19 tables, puis cible non vide refusée.
Ce lot n'a jamais accédé à la base de développement habituelle.

### Limites explicites

- Les garanties de révocation, de consommation et d'autorité décrites ici reposent
  sur les services cités et les preuves récentes de clôture ; elles ne sont pas
  toutes devenues des CHECK ou triggers ni toutes rejouées dans cette revue du schéma.
- Le catalogue PG prouve présence et définitions après migrations. Il ne mesure
  pas l'usage ou le coût marginal de chaque index hérité ; pas de nouvel engagement
  de charge ni de suppression d'index sans mesure.
- Le banc de restauration contient des valeurs fictives représentatives, une ligne
  par table. Il ne certifie pas un volume maximal, une rotation MFA future ou une
  politique différente de conservation. Aucun format de sauvegarde nouveau n'est créé.
- La nouvelle migration de la campagne porte sur SystemSetting, examinée dans
  [le lot technique](audit-technique.md). Aucune migration compte/MFA n'est ajoutée.

[S]: ../../../packages/database/prisma/schema.prisma
[PG]: preuves/catalogue-apres.json
[PK]: ../../../packages/database/package.json
[A]: ../../../apps/web/src/shared/server/auth.ts
[G]: ../../../apps/web/src/shared/server/user-action-authorization.ts
[F]: ../../../apps/web/src/shared/server/mfa.ts
[FS]: ../../../apps/web/src/app/api/auth/mfa/setup/route.ts
[FV]: ../../../apps/web/src/app/api/auth/mfa/verify/route.ts
[C]: ../../../apps/web/src/features/users/server/user-create.service.ts
[U]: ../../../apps/web/src/features/users/server/user-update.service.ts
[D]: ../../../apps/web/src/shared/server/user-deletion.ts
[L]: ../../../apps/web/src/features/users/server/users-list.service.ts
[Q]: ../../../apps/web/src/features/users/server/users-list-search.ts
[P]: ../../../apps/web/src/shared/constants/permissions.constants.ts
[E]: ../../../apps/web/src/app/api/auth/contact-email/route.ts
[T]: ../../../apps/web/src/app/api/auth/sessions/route.ts
[H]: ../../../apps/web/scripts/run-maintenance.ts
[B]: ../../../packages/database/scripts/database-backup-format.ts
[R]: ../../../packages/database/scripts/restore-database.ts
[RC]: ../../../packages/database/scripts/database-restore-support.ts
[UT]: ../../../packages/database/test/database-restore-encryption.test.ts
[M0]: ../../../packages/database/prisma/migrations/20260127210816_add_sponsors/migration.sql
[M1]: ../../../packages/database/prisma/migrations/20260714120000_split_login_and_contact_email/migration.sql
[M2]: ../../../packages/database/prisma/migrations/20260714133000_single_root_account/migration.sql
[M3]: ../../../packages/database/prisma/migrations/20260714193000_totp_mfa/migration.sql
[M4]: ../../../packages/database/prisma/migrations/20260716160000_require_mfa_for_all_accounts/migration.sql
[M5]: ../../../packages/database/prisma/migrations/20260718200000_admin_mode_proof/migration.sql
[M6]: ../../../packages/database/prisma/migrations/20260719120000_irreversible_user_deletion/migration.sql
[M7]: ../../../packages/database/prisma/migrations/20260713123000_session_idle_expiration/migration.sql
[M8]: ../../../packages/database/prisma/migrations/20261010150000_make_user_last_name_optional/migration.sql
[M9]: ../../../packages/database/prisma/migrations/20260630123000_users_list_indexes/migration.sql
[M10]: ../../../packages/database/prisma/migrations/20260630133000_dashboard_locked_until_index/migration.sql
[M11]: ../../../packages/database/prisma/migrations/20260715120000_durable_audit_events/migration.sql
[M12]: ../../../packages/database/prisma/migrations/20260712120000_reconcile_migration_baseline/migration.sql
[M13]: ../../../packages/database/prisma/migrations/20260611213000_add_session_remember_me/migration.sql
[M14]: ../../../packages/database/prisma/migrations/20260921180000_drop_redundant_unique_column_indexes/migration.sql
