# Schéma Prisma — audit technique des audits et tables transverses

Date : **13 octobre 2026**. Lecture du schéma sur le socle `c54e5d8`,
avec les corrections de clôture présentes dans l’arbre de travail.
Cette pièce est une partie de la revue exhaustive du schéma ; elle ne constitue
pas un nouvel audit des interfaces.

## Périmètre et méthode

Les **15 blocs** confiés sont examinés sans échantillonnage : huit enums
`Audit*` et sept modèles (`AuditLog`, `AuditEncryptionKeyVersion`,
`AuditFieldChange`, `ArchivedStaffProfile`, `RateLimit`,
`InternalAnnouncement`, `SystemSetting`). Les tableaux comptent
**193 déclarations** : chaque valeur d’enum, champ, relation et directive
d’index/unicité reçoit une justification. Le numéro de ligne indique l’état
lu de [schema.prisma][S00] ; la déclaration reproduite reste le repère en cas
d’ajout de commentaires dans le schéma.

Contrôles : nullabilité, type PostgreSQL, défaut, unicité, relation/cascade,
contraintes non représentées par Prisma, consommateurs actifs/dormants,
confidentialité, rétention, sauvegarde et coût des index. Le catalogue de
sources en fin de pièce permet de retrouver les preuves de lecture.

Les fiches appliquées sont [schéma](../../qualite/fiches/schema-prisma.md),
[migrations](../../qualite/fiches/migrations.md),
[audit](../../qualite/fiches/audit-historique.md),
[suppression](../../qualite/fiches/suppression-archivage.md) et
[sauvegarde](../../qualite/fiches/sauvegarde-restauration.md), selon la
[revue générale](../../qualite/REVUE_GENERALE.md) et la
[méthode d’audit](../../qualite/AUDITS.md).
Sécurité/confidentialité/concurrence/performance/exploitation sont examinées
par leurs effets sur ces données. Interface, responsive, notifications à créer,
documents métier, finances, juridique, équipes et planification de nouvelles
fonctions sont hors impact ; aucune table n’est ajoutée pour ces sujets.

### Règles communes de lecture des déclarations

- Un champ sans `?` est obligatoire ; `?` correspond à SQL NULL.
  Les relations Prisma ne créent pas une seconde colonne à côté de leur FK.
- `String` sans type natif est TEXT ; `Int` INTEGER ; `Json` JSONB ;
  `Bytes` BYTEA. Les `@db.VarChar(n)` et `@db.Char(n)` sont examinés
  avec leurs CHECK, pas comme une validation métier complète.
- `@default(cuid())` est un défaut du client Prisma, pas une fonction SQL ;
  les écrivains SQL fournissent donc l’identifiant. `@updatedAt` est aussi
  géré par Prisma ; les UPSERT SQL du limiteur affectent explicitement cette
  colonne. `@default(now())` a un défaut PostgreSQL CURRENT_TIMESTAMP.
- Les DateTime de ce périmètre sont TIMESTAMP(3), sans fuseau stocké ;
  les dates applicatives et les procédures de purge utilisent la convention
  UTC. Il ne s’agit pas de dates civiles comme Person.birthDate.
- Les `onDelete` indiqués correspondent aux migrations ; leurs FK ont
  `ON UPDATE CASCADE`. Cela ne rend pas modifiables les identifiants
  protégés par ailleurs ni les événements append-only.
- Les CHECK, triggers, procédures et index partiels ne peuvent pas être déduits
  du seul fichier Prisma. Prisma installé : **6.19.3**. Context7 a été consulté,
  mais son résultat versionné n’était pas exploitable et le résultat général
  mélangeait des générations ; les références officielles
  [fonctionnalités SQL complémentaires v6][P01] et
  [référence du schéma v6][P02] ont donc été lues directement. Aucune commande
  d’une version majeure ultérieure n’a été appliquée.

## Inventaire par déclaration

« Historique » signifie nécessaire à la conservation/lecture de données
anciennes, pas producteur courant. « Dormant » signifie code ou table encore
présent mais écran/fonction non publié. « Dette » ne signifie pas incident :
aucun gain d’un retrait d’index n’est déclaré sans mesure.

### `enum AuditFieldChangeType` — ligne 30

Ensemble SQL fermé ; chaque membre est examiné ci-dessous.

| Ligne | Déclaration | Justification et contrôle |
| --- | --- | --- |
| 31 | `CREATE` | Ajout d’un champ ou d’un élément de collection ; absence précédente représentée par null. Enum SQL fermé. [S04][S07] |
| 32 | `UPDATE` | Changement de valeur existante ; le service calcule le différentiel réellement modifié. [S04][S07] |
| 33 | `DELETE` | Retrait d’une coordonnée ; conserve sa valeur historique jusqu’à la purge autorisée. [S04][S07] |

### `enum AuditValueStorageMode` — ligne 36

Ensemble SQL fermé ; chaque membre est examiné ci-dessous.

| Ligne | Déclaration | Justification et contrôle |
| --- | --- | --- |
| 37 | `PLAIN` | Valeurs non sensibles en texte JSON, bornées à 512 caractères ; CHECK impose au moins une valeur et interdit l’enveloppe chiffrée. [S04][S07] |
| 38 | `ENCRYPTED` | Identité et coordonnées : AES-256-GCM, IV 12 octets, tag 16, ciphertext 1–8192, clé référencée ; aucun hash parallèle autorisé. [S04][S07] |
| 39 | `NONE` | Contrat SQL sans valeur ni enveloppe ; hashes facultatifs. Aucun producteur actuel trouvé : réserve de format, pas un comportement livré. [S04][S07] |

### `enum AuditAction` — ligne 209

Ensemble SQL fermé ; chaque membre est examiné ci-dessous.

| Ligne | Déclaration | Justification et contrôle |
| --- | --- | --- |
| 210 | `LOGIN_SUCCESS` | Producteur actuel : connexion après preuve MFA. Classé CONNECTION/AUTHENTICATION/SUCCESS/INFO. [S01][S02] |
| 211 | `LOGIN_FAILED` | Tentative refusée, avec acteur nullable ; CONNECTION/AUTHENTICATION/FAILURE/WARNING. [S01][S02] |
| 212 | `LOGOUT` | Déconnexion tracée ; résultat NEUTRAL exprime la fin de session. [S01][S02] |
| 213 | `PASSWORD_CHANGE` | Changement personnel tracé dans le flux de sécurité. [S01][S02] |
| 214 | `PASSWORD_RESET` | Réinitialisation administrative ; SECURITY/WARNING. [S01][S02] |
| 215 | `ACCOUNT_LOCKED` | Verrouillage lié aux tentatives ; CONNECTION/FAILURE/WARNING. [S01][S02] |
| 216 | `SESSION_INVALIDATE` | Révocation personnelle ou administrative ; SECURITY/WARNING, détails de portée en metadata. [S01][S02] |
| 217 | `MFA_ENABLED` | Activation/remplacement validé du facteur ; SECURITY/INFO. [S01][S02] |
| 218 | `MFA_DISABLED` | Valeur encore classifiée et lisible ; ne crée pas une faculté générale de désactiver la MFA obligatoire. [S01][S02] |
| 219 | `MFA_RECOVERY_CODE_USED` | Usage d’un code consommable ; SECURITY/WARNING, sans enregistrer le code. [S01][S02] |
| 220 | `MFA_RECOVERY_CODES_REGENERATED` | Renouvellement du lot ; SECURITY/WARNING, aucun secret dans l’événement. [S01][S02] |
| 221 | `MFA_RESET` | Réinitialisation administrative ou récupération opérateur ; SECURITY/CRITICAL. [S01][S02] |
| 222 | `STEP_UP_SUCCESS` | Preuve récente d’action sensible acceptée ; SECURITY/INFO. [S01][S02] |
| 223 | `STEP_UP_FAILED` | Preuve refusée ; ACTIVITY/SECURITY/FAILURE/WARNING. [S01][S02] |
| 224 | `USER_CREATE` | Création d’un compte ; IDENTITY/INFO. Mutation et audit requis sont transactionnels. [S01][S02] |
| 225 | `USER_UPDATE` | Modification d’identité/contact/compte ; IDENTITY/INFO, différentiel utile dans metadata. [S01][S02] |
| 226 | `USER_DELETE` | Anonymisation irréversible du compte ; IDENTITY/CRITICAL, snapshot capturé avant mutation. [S01][S12] |
| 227 | `USER_ACTIVATE` | Activation d’un compte ; IDENTITY/INFO. [S01][S02] |
| 228 | `USER_DEACTIVATE` | Désactivation ; IDENTITY/WARNING. [S01][S02] |
| 229 | `PERMISSION_UPDATE` | Droits/rôle modifiés ; AUTHORIZATION/CRITICAL. [S01][S02] |
| 230 | `AUDIT_EXPORT` | Export CSV encore implémenté dans l’API d’audit d’un compte ; phases started/completed en metadata. UI Activité dormante. [S01][S03] |
| 231 | `NOTIFICATION_SEND` | Historique uniquement : module Notification retiré par migration du 9 octobre ; garder la lecture des événements existants. [S01][S22] [S30] |
| 232 | `INTERNAL_ANNOUNCEMENT_PUBLISH` | Producteur dormant d’Actualité interne ; SYSTEM/INFO. Enum nécessaire aux données sauvegardées, aucune page active déduite. [S01][S15] |
| 233 | `INTERNAL_ANNOUNCEMENT_PIN_UPDATE` | Épinglage du même domaine dormant ; SYSTEM/INFO. [S01][S15] |
| 234 | `SYSTEM_SETTING_UPDATE` | Paramètre de conservation modifié/réparé ; SYSTEM/CRITICAL ; trace atomique avec la version. [S01][S13] |
| 235 | `BACKGROUND_JOB_UPDATE` | Historique uniquement : worker/table retirés en juillet ; préserver le sens des traces, sans recréer de file. [S01][S22] |
| 236 | `PERSON_CREATE` | Création d’identité ; catégorie PERSON, stream IDENTITY et sujet PERSON obligatoires par CHECK SQL. [S04][S07] |
| 237 | `PERSON_UPDATE` | Identité/coordonnée modifiée ; même cohérence SQL ; détails enfants selon le différentiel. [S04][S07] |
| 238 | `PERSON_DELETE` | Suppression ; IDENTITY/CRITICAL, événement minimal conservé, anciennes valeurs purgées séparément. [S04][S08] |
| 242 | `PARTNER_CREATE` | Historique : création partenaire ; module retiré, aucune nouvelle émission. [S01][S22] |
| 243 | `PARTNER_UPDATE` | Historique : modification partenaire ; aucune nouvelle émission. [S01][S22] |
| 244 | `PARTNER_STATUS_UPDATE` | Historique : statut partenaire ; aucune nouvelle émission. [S01][S22] |
| 245 | `PARTNER_PERIOD_CREATE` | Historique : période créée ; aucune nouvelle émission. [S01][S22] |
| 246 | `PARTNER_PERIOD_UPDATE` | Historique : période modifiée ; aucune nouvelle émission. [S01][S22] |
| 247 | `PARTNER_CONTACTS_UPDATE` | Historique : coordonnées partenaire ; aucune nouvelle émission. [S01][S22] |
| 248 | `PARTNER_FOLLOW_UP_CREATE` | Historique : suivi créé ; aucune nouvelle émission. [S01][S22] |
| 249 | `PARTNER_FOLLOW_UP_UPDATE` | Historique : suivi modifié ; aucune nouvelle émission. [S01][S22] |
| 250 | `PARTNER_FOLLOW_UP_DELETE` | Historique : suivi retiré ; aucune nouvelle émission. [S01][S22] |
| 251 | `PARTNER_FOLLOW_UP_COMPLETE` | Historique : suivi terminé ; aucune nouvelle émission. [S01][S22] |
| 252 | `PARTNER_MERGE` | Historique : fusion partenaire ; aucune nouvelle émission. [S01][S22] |
| 253 | `PARTNER_DELETE` | Historique : suppression partenaire ; aucune nouvelle émission. [S01][S22] |

### `enum AuditCategory` — ligne 256

Ensemble SQL fermé ; chaque membre est examiné ci-dessous.

| Ligne | Déclaration | Justification et contrôle |
| --- | --- | --- |
| 257 | `AUTH` | Authentification et sécurité : regroupement historique encore écrit. Ne constitue pas une classe de conservation. [S01][S02][S21] |
| 258 | `USER` | Administration des comptes ; distinct de l’acteur et de la cible relationnelle. [S02][S12] |
| 259 | `PERMISSION` | Actions d’autorisation ; catégorie conservée dans l’enum et les lecteurs. [S01][S02] |
| 260 | `SYSTEM` | Configuration, exports, publications et anciennes tâches ; catégorie transverse, pas une politique de purge. [S01][S13][S15] |
| 261 | `PERSON` | Historique du Répertoire ; cohérence action/stream/sujet garantie par CHECK. [S04][S07] |
| 263 | `PARTNER` | Historique uniquement, nécessaire aux anciens événements du domaine retiré. [S22] |

### `enum AuditEventKind` — ligne 266

Ensemble SQL fermé ; chaque membre est examiné ci-dessous.

| Ligne | Déclaration | Justification et contrôle |
| --- | --- | --- |
| 267 | `ACTIVITY` | Actions applicatives, y compris sécurité hors connexion ; classification exhaustive par action. [S01] |
| 268 | `CONNECTION` | Connexion, échec, verrouillage et déconnexion ; filtre disponible dans les classifications historiques. [S01] |

### `enum AuditStream` — ligne 271

Ensemble SQL fermé ; chaque membre est examiné ci-dessous.

| Ligne | Déclaration | Justification et contrôle |
| --- | --- | --- |
| 272 | `AUTHENTICATION` | Connexions et leur résultat. Aucune durée propre implémentée. [S01][S21] |
| 273 | `SECURITY` | Mot de passe, MFA, révocations, preuve sensible. [S01] |
| 274 | `IDENTITY` | Comptes et Personnes ; ce regroupement ne remplace pas leurs domaines séparés. [S01][S04] |
| 275 | `AUTHORIZATION` | Permissions et délégation d’accès. [S01] |
| 276 | `SYSTEM` | Paramètres, exports et événements historiques généraux. [S01] |

### `enum AuditOutcome` — ligne 279

Ensemble SQL fermé ; chaque membre est examiné ci-dessous.

| Ligne | Déclaration | Justification et contrôle |
| --- | --- | --- |
| 280 | `SUCCESS` | Action réussie/classification normale ; défaut SQL ancien, producteurs actuels classifient explicitement. [S01][S02] |
| 281 | `FAILURE` | Refus de connexion/preuve ; Personnes peuvent écrire un résultat refusé explicitement. [S01][S07] |
| 282 | `NEUTRAL` | Déconnexion et fait sans notion de réussite métier ; valeur lue sans conversion destructive. [S01] |

### `enum AuditSeverity` — ligne 285

Ensemble SQL fermé ; chaque membre est examiné ci-dessous.

| Ligne | Déclaration | Justification et contrôle |
| --- | --- | --- |
| 286 | `INFO` | Niveau usuel, défaut SQL ; indépendant des permissions de lecture. [S01][S03] |
| 287 | `WARNING` | Échec/authentification, révocation et opérations de sécurité définies dans le catalogue. [S01] |
| 288 | `CRITICAL` | Suppression, permission, réglage, export ; niveau informatif, pas une autorisation implicite. [S01] |

### `model AuditLog` — ligne 291

Modèle relationnel ; nullabilité et défauts sont reproduits exactement.

| Ligne | Déclaration | Justification et contrôle |
| --- | --- | --- |
| 292 | `id String @id @default(cuid())` | Identifiant technique immuable et curseur secondaire stable ; génération applicative. [S02][S03] |
| 293 | `userId String?` | Acteur facultatif : tentative anonyme/système possible ; ne pas imposer une FK vers une personne métier. [S02] |
| 294 | `user User? @relation("AuditActor", fields: [userId], references: [id], onDelete: Restrict)` | FK AuditActor vers User, RESTRICT : conserve la référence au tombstone, aucun effacement en cascade des preuves. [S04][S12] |
| 295 | `actorDisplayNameSnapshot String?` | Nom à l’instant de l’événement ; nullable pour anciens événements/système ; immuable et conservé selon rétention. [S02][S05] |
| 296 | `actorLoginNameSnapshot String?` | Identifiant historique, distinct du login actuel ; nullable justifié, pas un secret. [S02][S05] |
| 297 | `actorRoleSnapshot UserRole?` | Rôle UserRole historique facultatif ; évite de relire le rôle actuel comme fait passé. [S02][S05] |
| 298 | `targetUserId String?` | Compte ciblé facultatif ; les événements Personne utilisent entityId, sans confusion User/Person. [S02][S07] |
| 299 | `targetUser User? @relation("AuditTarget", fields: [targetUserId], references: [id], onDelete: Restrict)` | FK AuditTarget RESTRICT ; même stratégie de tombstone que l’acteur. [S04][S12] |
| 300 | `targetDisplayNameSnapshot String?` | Nom de la cible figé avant suppression ; nullable si aucune cible ou ancien événement. [S02][S12] |
| 301 | `targetLoginNameSnapshot String?` | Login historique de la cible ; nullable, immuable. [S02][S05] |
| 302 | `targetRoleSnapshot UserRole?` | Rôle de la cible au moment du fait ; nullable, enum fermé. [S02][S05] |
| 303 | `action AuditAction` | Enum métier obligatoire ; tous ses membres ont une classification et un rendu de secours. [S01][S02][S23] |
| 304 | `category AuditCategory` | Catégorie obligatoire ; cohérence PERSON protégée SQL, autres combinaisons contrôlées par les producteurs. [S01][S04] |
| 305 | `eventKind AuditEventKind @default(ACTIVITY)` | Défaut ACTIVITY pour compatibilité de données ; producteurs actuels calculent la classification. [S01][S05] |
| 306 | `stream AuditStream @default(SYSTEM)` | Défaut SYSTEM ; valeur explicitement calculée lors des écritures courantes, sans signification de rétention. [S01][S21] |
| 307 | `outcome AuditOutcome @default(SUCCESS)` | Défaut SUCCESS ; échecs connus classifiés FAILURE, déconnexion NEUTRAL. Ne remplace pas les phases de metadata. [S01] |
| 308 | `severity AuditSeverity @default(INFO)` | Défaut INFO ; gravité dérivée de l’action, sans effet automatique sur les droits. [S01] |
| 309 | `eventVersion Int @default(1)` | Version de format, pas verrou optimiste ; CHECK≥1 en SQL, constante applicative1 actuelle. [S01][S05] |
| 310 | `description String` | Texte obligatoire ; producteur commun borne4Kio. Non indexé plein texte, rendu sensible expurgé selon lecteur. [S02][S23] |
| 311 | `metadata Json?` | JSONB facultatif pour détails propres à l’action ; borne64Kio dans l’écrivain commun, contrat métier/version d’événement et filtrage de lecture. [S02][S23] |
| 312 | `poleKey String?` | Localisation facultative pour filtres/facettes ; valeur canonique validée ou constante de domaine. [S02][S03] |
| 313 | `pageKey String?` | Localisation de page facultative ; doublon volontaire des métadonnées pour requêtes indexables. [S02][S03] |
| 314 | `tabKey String?` | Onglet facultatif utile au contexte ; pas d’index autonome sans filtre actuel correspondant. [S02][S03] |
| 315 | `entityType String? @db.VarChar(40)` | Sujet polymorphe facultatif borné40 ; CHECK impose présence conjointe d’entityId. PERSON contraint ; pas de FK universelle artificielle. [S04] |
| 316 | `entityId String? @db.VarChar(128)` | Sujet borné128, conservé après suppression ; pairé au type et repris dans la FK des détails. [S04][S08] |
| 317 | `requestId String?` | Corrélation HTTP facultative ; borne191 au producteur, utile à l’exploitation. [S02][S21] |
| 318 | `ipAddress String?` | Source réseau facultative, borne64 au producteur ; pas une relation ni une donnée à exposer à tous. [S02][S23] |
| 319 | `userAgent String?` | Navigateur facultatif, borne1024 au producteur ; données sensibles filtrées à la lecture. [S02][S23] |
| 320 | `createdAt DateTime @default(now())` | Instant immuable, défaut SQL maintenant ; sert à tri, curseur et purge. Précision milliseconde partagée avec les détails. [S03][S04] |
| 322 | `fieldChanges AuditFieldChange[]` | Relation inverse sans colonne supplémentaire ; chargement explicite et borné dans l’historique, suppression contrôlée du parent cascade. [S04][S09] |
| 324 | `@@unique([id, entityType, entityId])` | Unicité du triplet imposée par la FK composite des détails : id seul unique ne suffit pas comme cible de cette FK. Conserver. [S04] |
| 325 | `@@index([userId, action])` | Acteur+action : statistiques/sécurité du journal d’un compte. Pas redondant avec le tri temporel. [S03] |
| 326 | `@@index([userId, createdAt, id])` | Journal par acteur ordonné createdAt/id ; pagination et export. Conserver. [S03] |
| 327 | `@@index([targetUserId, action])` | Cible+action : statistiques des événements subis par compte. [S03] |
| 328 | `@@index([targetUserId, createdAt, id])` | Journal par cible ordonné createdAt/id ; pagination et export. [S03] |
| 329 | `@@index([poleKey, createdAt, id])` | Pôle+temps : filtres/facettes de l’API d’audit compte. [S03] |
| 330 | `@@index([poleKey, pageKey, createdAt, id])` | Pôle+page+temps : combinaison de filtres de localisation. L’ordre ne remplace pas les requêtes sans pôle. [S03] |
| 331 | `@@index([pageKey, createdAt, id])` | Page+temps : filtre page seul ; non couvert en tête par l’index précédent. [S03] |
| 332 | `@@index([eventKind, createdAt, id])` | Classement eventKind+temps : aucun lecteur filtrant courant trouvé ; dette d’indexation du journal global dormant, pas index unique d’intégrité. [S01][S16] |
| 333 | `@@index([stream, createdAt, id])` | Classement stream+temps : aucun filtre consommateur courant trouvé ; même dette, coût non mesuré dans cette passe. [S01][S16] |
| 334 | `@@index([outcome, createdAt, id])` | Classement outcome+temps : filtre global dormant ; conserver ou retirer après décision explicite, aucun gain chiffré ici. [S01][S16] |
| 335 | `@@index([severity, createdAt, id])` | Classement severity+temps : même absence de requête actuelle identifiée. [S01][S16] |
| 336 | `@@index([requestId])` | Corrélation requestId : utile au diagnostic SQL éventuel, aucun lecteur applicatif identifié ; justification d’exploitation, pas preuve de performance. [S02][S21] |
| 337 | `@@index([action, createdAt, id])` | Action+temps : catalogue/filtrage historique et statistiques par action ; utilité globale à requalifier lors du journal, pas redondance exacte. [S03][S06] |
| 338 | `@@index([category, createdAt, id])` | Catégorie+temps : ancien journal global ; aucun filtre catégorie courant identifié dans l’API compte. Dette distincte d’un défaut fonctionnel. [S03][S06] |
| 339 | `@@index([entityType, entityId, createdAt, id])` | Sujet+temps : dernier changement de fiche, historique Personne ; index consommé actuellement. [S04][S28] |
| 340 | `@@index([createdAt, id])` | Temps+id : rétention du parent, pagination/export et départage stable. Conserver. [S03][S04] |
| 341 | `@@index([actorDisplayNameSnapshot(ops: raw("gin_trgm_ops"))], type: Gin, map: "AuditLog_actorDisplayNameSnapshot_trgm_idx")` | GIN trigram nom acteur : recherche de journal global dormante ; aucun contains actuel trouvé. Coût d’écriture réel mais gain d’un retrait non mesuré. [S06][S16] |
| 342 | `@@index([actorLoginNameSnapshot(ops: raw("gin_trgm_ops"))], type: Gin, map: "AuditLog_actorLoginNameSnapshot_trgm_idx")` | GIN trigram login acteur : même constat d’usage dormant. Ne pas supprimer les snapshots eux-mêmes. [S06][S16] |
| 343 | `@@index([targetDisplayNameSnapshot(ops: raw("gin_trgm_ops"))], type: Gin, map: "AuditLog_targetDisplayNameSnapshot_trgm_idx")` | GIN trigram nom cible : même constat d’usage dormant. [S06][S16] |
| 344 | `@@index([targetLoginNameSnapshot(ops: raw("gin_trgm_ops"))], type: Gin, map: "AuditLog_targetLoginNameSnapshot_trgm_idx")` | GIN trigram login cible : même constat d’usage dormant. [S06][S16] |

### `model AuditEncryptionKeyVersion` — ligne 347

Modèle relationnel ; nullabilité et défauts sont reproduits exactement.

| Ligne | Déclaration | Justification et contrôle |
| --- | --- | --- |
| 348 | `version Int @id` | Clé primaire entière fournie par configuration, CHECK≥1 ; numéro public, jamais le matériel secret. [S04][S07] |
| 349 | `algorithm String @default("AES-256-GCM") @db.VarChar(32)` | VARCHAR32 fixé à AES-256-GCM par défaut ET CHECK ; pas une sélection libre d’algorithme par client. [S04] |
| 350 | `firstUsedAt DateTime @default(now())` | Première insertion de la version, défaut SQL maintenant ; upsert sans update préserve cette date. [S04][S07] |
| 352 | `fieldChanges AuditFieldChange[]` | Relation inverse des valeurs chiffrées ; inventaire append-only, même après disparition des dernières références. [S04][S07][S17] |

### `model AuditFieldChange` — ligne 355

Modèle relationnel ; nullabilité et défauts sont reproduits exactement.

| Ligne | Déclaration | Justification et contrôle |
| --- | --- | --- |
| 356 | `id String @id @default(cuid())` | Identifiant du détail et départage du tri ; génération applicative, immuable après insertion. [S04][S07] |
| 357 | `auditLogId String` | Parent obligatoire ; participe à une FK composite qui empêche d’attribuer un détail au mauvais sujet. [S04] |
| 358 | `entityType String @db.VarChar(40)` | Type requis, VARCHAR40 et format majuscule SQL ; sert à l’isolation du sujet, pas à une relation métier directe. [S04] |
| 359 | `entityId String @db.VarChar(128)` | Identifiant requis, VARCHAR128 non vide/trim ; sujet identique à celui de l’événement parent. [S04] |
| 360 | `sectionKey String @db.VarChar(64)` | Section stable VARCHAR64, caractères autorisés par CHECK ; validée à la lecture par catalogue de champs. [S04][S09] |
| 361 | `fieldKey String @db.VarChar(100)` | Champ stable VARCHAR100, format SQL ; aucune colonne dynamique SQL construite depuis cette valeur. [S04][S09] |
| 362 | `recordId String? @db.VarChar(128)` | Identifiant de coordonnée facultatif ; null pour champ de fiche. Pas de FK : doit survivre au retrait de la coordonnée. [S04][S09] |
| 363 | `changeType AuditFieldChangeType` | CREATE/UPDATE/DELETE obligatoire ; décrit le différentiel, sans confondre la suppression de l’événement. [S04][S07] |
| 364 | `valueMode AuditValueStorageMode` | Mode de stockage obligatoire, sans défaut implicite ; CHECK d’exclusivité de l’enveloppe. [S04][S07] |
| 365 | `beforeValue String? @db.VarChar(512)` | Ancienne valeur en JSON texte VARCHAR512, nullable si création ; seulement PLAIN. Champs actuels non sensibles sous cette borne. [S04][S07] |
| 366 | `afterValue String? @db.VarChar(512)` | Nouvelle valeur en JSON texte VARCHAR512, nullable si retrait ; seulement PLAIN. [S04][S07] |
| 367 | `valuesCiphertext Bytes?` | BYTEA nullable hors ENCRYPTED ; CHECK taille1–8192, contenu authentifié avec sujet/champ/action/parent en AAD. [S04][S07] |
| 368 | `valuesIv Bytes?` | BYTEA nullable hors ENCRYPTED ; IV aléatoire12octets imposé SQL et chiffrement. [S04][S07] |
| 369 | `valuesAuthTag Bytes?` | BYTEA nullable hors ENCRYPTED ; tag16octets imposé SQL, vérifié au déchiffrement. [S04][S07] |
| 370 | `valueKeyVersion Int?` | Clé facultative hors ENCRYPTED ; obligatoire dans ce mode, FK vers l’inventaire non supprimable. [S04][S07] |
| 371 | `beforeHash String? @db.Char(64)` | CHAR64 hexadécimal facultatif, seulement NONE ; aucun producteur courant trouvé. Ne pas ajouter de hash d’identité faible au chiffrement. [S04][S07] |
| 372 | `afterHash String? @db.Char(64)` | Même contrat que beforeHash ; réserve de format, pas justification d’un nouveau traitement. [S04][S07] |
| 373 | `createdAt DateTime` | Aucun défaut volontaire : doit égaler exactement la date du parent ; trigger BEFORE INSERT le vérifie. [S04][S07] |
| 375 | `auditLog AuditLog @relation(fields: [auditLogId, entityType, entityId], references: [id, entityType, entityId], onDelete: Cascade)` | FK composite CASCADE pour rétention contrôlée ; append-only interdit les cascades ordinaires non autorisées. [S04] |
| 376 | `encryptionKeyVersion AuditEncryptionKeyVersion? @relation(fields: [valueKeyVersion], references: [version], onDelete: Restrict)` | FK facultative RESTRICT, jamais CASCADE ; empêche de retirer une version encore référencée. [S04] |
| 378 | `@@index([auditLogId])` | Parent : jointure des détails et cascade de purge ; l’index histoire n’a pas auditLogId en tête. [S04] |
| 379 | `@@index([entityType, entityId, sectionKey, fieldKey, recordId, createdAt, id], map: "AuditFieldChange_history_lookup_idx")` | Historique : égalité sur sujet/section/champ/record puis tri createdAt/id ; correspond à la lecture bornée de provenance. Nom explicite préserve la limite PostgreSQL. [S09][S25] |
| 380 | `@@index([valueKeyVersion])` | Version de clé : FK et recherche de références pour gestion des clés ; non couvert par l’index de champ. [S04] |

### `model ArchivedStaffProfile` — ligne 492

Modèle relationnel ; nullabilité et défauts sont reproduits exactement.

| Ligne | Déclaration | Justification et contrôle |
| --- | --- | --- |
| 493 | `id String @id` | Ancien identifiant conservé sans générateur : migration/restauration seules créent ces lignes, aucun nouvel objet métier. [S10][S17] |
| 494 | `userId String? @unique` | Ancien rattachement facultatif et unique ; autorise plusieurs archives orphelines SQL, une seule par compte lié. [S10] |
| 495 | `displayName String?` | Ancienne donnée facultative conservée telle quelle ; aucun lecteur fonctionnel ni enrichissement automatique courant. [S10][S12] |
| 496 | `jobTitle String?` | Ancienne fonction facultative ; ne remplace ni rôle User ni engagement métier futur. [S10] |
| 497 | `department String?` | Ancien département facultatif, aucun propriétaire métier courant. Conservation de migration, pas hiérarchie active. [S10] |
| 498 | `discordId String?` | Ancienne coordonnée facultative ; pas normalisée/rapprochée automatiquement avec Personne. [S10] |
| 499 | `phone String?` | Ancien téléphone facultatif ; pas migré vers PersonPhone sans décision d’appartenance. [S10] |
| 500 | `timezone String?` | Ancien fuseau facultatif sous forme de texte ; archive, pas moteur de planification actif. [S10] |
| 501 | `joinedAt DateTime?` | Ancienne date d’entrée facultative, TIMESTAMP3 ; ne vaut pas engagement daté actuel. [S10] |
| 502 | `internalNote String?` | Ancienne note privée facultative ; aucune API d’exposition actuelle ; rétention des orphelins à qualifier. [S10][S21] |
| 503 | `createdAt DateTime @default(now())` | Date historique recopiée, défaut maintenant si insertion technique sans valeur ; sauvegardée sans transformation. [S10][S17] |
| 504 | `updatedAt DateTime` | Date historique obligatoire SANS @updatedAt : une restauration doit préserver l’état d’origine. [S10][S17] |
| 506 | `user User? @relation(fields: [userId], references: [id], onDelete: SetNull)` | FK SET NULL héritée ; pas de cascade accidentelle d’archive. La suppression applicative du compte purge explicitement la ligne liée. [S10][S12] |
| 508 | `@@index([department])` | Département : aucun lecteur applicatif actuel ; index historique de migration, dette mesurable avant retrait, pas raison de supprimer l’archive. [S10][S12] |
| 509 | `@@index([discordId])` | Discord : aucun lecteur actuel ni unicité à garantir ; dette d’indexation historique. [S10] |
| 510 | `@@index([jobTitle])` | Fonction : aucun lecteur actuel ; dette d’indexation historique. [S10] |
| 511 | `@@index([joinedAt])` | Date d’entrée : aucun lecteur actuel ; dette d’indexation historique. [S10] |

### `model RateLimit` — ligne 514

Modèle relationnel ; nullabilité et défauts sont reproduits exactement.

| Ligne | Déclaration | Justification et contrôle |
| --- | --- | --- |
| 515 | `id String @id @default(cuid())` | Identifiant technique sans sens de compte ; Prisma cuid ou UUID explicite dans UPSERT SQL, tous deux acceptés par TEXT. [S11] |
| 516 | `key String @unique` | Clé unique du compteur ; support ON CONFLICT. Login/IP hachés ; certains budgets internes référencent l’ID technique, aucun mot de passe. [S11] |
| 517 | `count Int @default(0)` | Entier défaut0 ; réservation/incrément atomiques, décrément gardé count>0. Pas de CHECK SQL≥0 actuel ; aucun producteur négatif trouvé. [S11] |
| 518 | `firstAttempt DateTime @default(now())` | Début de fenêtre, défaut maintenant ; conservé jusqu’au renouvellement atomique, utilisé pour expiration. [S11] |
| 519 | `blockedUntil DateTime?` | Fin de blocage nullable hors blocage ; bornes calculées par politique, pas besoin d’une relation Session. [S11] |
| 520 | `createdAt DateTime @default(now())` | Création technique du compteur, défaut SQL ; conservée pendant ses renouvellements. [S11] |
| 521 | `updatedAt DateTime @updatedAt` | Dernière activité du compteur ; Prisma @updatedAt ou affectation explicite dans UPSERT SQL, purge des anciens non bloqués. [S11][S19] |
| 523 | `@@index([blockedUntil])` | Expiration de blocage : sert à la purge OR ; clé unique couvre les lectures/réservations. L’ancien index key doublonné a déjà été retiré. [S11][S19][S26] |

### `model InternalAnnouncement` — ligne 528

Modèle relationnel ; nullabilité et défauts sont reproduits exactement.

| Ligne | Déclaration | Justification et contrôle |
| --- | --- | --- |
| 529 | `id String @id @default(cuid())` | Identifiant technique généré ; domaine dormant explicitement conservé, pas une nouvelle page publiée. [S14][S15][S16] |
| 530 | `title String @db.VarChar(160)` | Titre requis VARCHAR160 ; validation trim/min1/max160 cohérente avec le stockage. [S14][S15] [S29] |
| 531 | `body String @db.VarChar(2000)` | Texte éditorial requis VARCHAR2000 ; validation trim/min1/max2000, sans JSON ni secret technique. [S14][S15] [S29] |
| 532 | `publishedAt DateTime @default(now())` | Date de publication obligatoire, défaut maintenant ; service la fixe à la création, curseur du flux. [S15] |
| 533 | `pinnedAt DateTime?` | Null signifie non épinglé ; date permet ordre des épingles, pas un booléen doublonné. [S15] |
| 534 | `createdById String?` | Auteur facultatif afin de préserver le contenu si une FK était détachée ; compte supprimé actuellement gardé en tombstone. [S12][S14] |
| 535 | `authorDisplayNameSnapshot String @db.VarChar(200)` | Nom auteur obligatoire borné200 ; snapshot éditorial conservé, non recalculé après renommage/suppression. [S14][S15] |
| 536 | `authorLoginNameSnapshot String @db.VarChar(64)` | Login auteur obligatoire borné64 ; source courante max32, borne de stockage suffisante. [S14][S15] |
| 537 | `createdAt DateTime @default(now())` | Date technique de création, défaut SQL ; borne snapshot de pagination indépendamment du tri de publication. [S15] |
| 538 | `updatedAt DateTime @updatedAt` | Date technique de dernière mutation, notamment épinglage ; pas un verrou de version métier. [S15] |
| 540 | `createdBy User? @relation("InternalAnnouncementAuthor", fields: [createdById], references: [id], onDelete: SetNull)` | FK auteur SET NULL ; ne supprime pas le texte publié. Aucune purge éditoriale automatique par rétention d’audit. [S14][S19] |
| 542 | `@@index([publishedAt, id])` | Publication+id : pagination du flux dormant ; cohérent avec les requêtes existantes, pas une preuve de trafic actuel. [S15] |
| 543 | `@@index([pinnedAt, publishedAt, id])` | Épingle+publication+id : lecture bornée des épingles et filtre pinnedAt=null ; cohérent, sans ajouter de nouvel index. [S15] |
| 544 | `@@index([createdById])` | Auteur : support FK SET NULL et recherche de références ; pas de cascade des annonces. [S14] |

### `model SystemSetting` — ligne 549

Modèle relationnel ; nullabilité et défauts sont reproduits exactement.

| Ligne | Déclaration | Justification et contrôle |
| --- | --- | --- |
| 550 | `key String @id` | Identifiant textuel primaire : catalogue fermé, seule audit.retentionDays active ; les autres clés stockées ne deviennent pas administrables. [S13][S20] |
| 551 | `value Json` | JSONB obligatoire ; entier365–3650 pour la clé actuelle, revalidé lecture/écriture. Stockage invalide bloque la purge, réparation explicite. [S13][S20][S21] |
| 552 | `description String?` | Description facultative conservée ; l’API affiche la définition du catalogue, pas une instruction arbitraire depuis la base. [S13][S20] |
| 553 | `version Int @default(1)` | Verrou optimiste, défaut1. SCH-TECH-01 : CHECK≥1 ajouté ; 0 est réservé à l’absence dans l’API. ALTER atomique refuse les préexistants invalides sans réécriture. [S13][S24] |
| 554 | `updatedById String?` | Auteur de dernière modification facultatif ; pas d’obligation pour ligne importée/technique, preuve durable portée par AuditLog. [S13] |
| 555 | `createdAt DateTime @default(now())` | Création de la surcharge, défaut SQL ; distinct de la valeur par défaut virtuelle tant qu’aucune ligne n’existe. [S13] |
| 556 | `updatedAt DateTime @updatedAt` | Dernière modification @updatedAt ; information affichée, la concurrence repose sur version. [S13] |
| 558 | `updatedBy User? @relation("SystemSettingUpdater", fields: [updatedById], references: [id], onDelete: SetNull)` | FK SET NULL ; conserve la configuration si auteur retiré. Tombstone User actuel et snapshot d’audit préservent l’explication. [S12][S13] |
| 560 | `@@index([updatedAt])` | Dernière mise à jour : aucun tri/filtre API courant (catalogue lit par clés), index historique sans bénéfice mesuré. [S13] |
| 561 | `@@index([updatedById])` | Auteur : FK SET NULL et recherche de références ; distinct de la clé métier. [S13] |

## Contraintes SQL et cycle de vie

| Ensemble | Garanties effectivement trouvées dans les migrations | Conséquence |
| --- | --- | --- |
| AuditLog | eventVersion≥1 ; entityType/entityId présents ensemble ; cohérence des événements PERSON ; snapshots immuables puis trigger général interdisant UPDATE/DELETE ordinaire. [S04][S05] | Les valeurs par défaut ne dispensent pas les producteurs de classifier l’événement. Les seules suppressions ordinaires autorisées passent par la procédure de rétention. |
| AuditFieldChange | Syntaxe des clés, hashes hexadécimaux ; enveloppes PLAIN/ENCRYPTED/NONE exclusives ; FK composite sujet-parent ; date identique au parent ; garde des mutations. [S04] | Un détail ne peut pas être rattaché à un audit d’une autre personne ni survivre comme orphelin. Le recordId n’est volontairement pas une FK vers une coordonnée supprimable. |
| AuditEncryptionKeyVersion | version≥1, algorithme AES-256-GCM, trigger interdisant UPDATE/DELETE. [S04] | L’inventaire contient des numéros publics, pas les clés. Son immutabilité est plus forte que la seule FK RESTRICT. |
| ArchivedStaffProfile | PK, FK nullable SET NULL et unicité du userId lié ; copie explicite depuis StaffProfile avant retrait de l’ancienne table. [S10] | « Lecture seule » désigne les usages applicatifs, pas un trigger SQL bloquant toute opération. La suppression du compte purge explicitement son archive. [S12] |
| RateLimit | PK et unicité de key ; UPSERT et réservations atomiques côté service. [S11] | Pas de CHECK count≥0 actuel ; le flux courant empêche les compteurs négatifs. Une écriture SQL arbitraire n’est pas certifiée par ce contrat applicatif. |
| InternalAnnouncement | Types bornés et FK auteur SET NULL ; validation des textes côté service. [S14][S29] | Aucun archivage, purge éditoriale ou contrôle de version n’est déduit de ce modèle dormant. Ne pas le réactiver sur cette seule revue. |
| SystemSetting | PK key, FK auteur, nouvelle contrainte version≥1. [S13][S24] | Le catalogue et la validation JSON restent nécessaires. Une valeur de conservation invalide bloque la purge ; la réparation exige la preuve prévue. [S20][S21] |

### Historique, suppression et conservation

La durée de `audit.retentionDays` s’applique aujourd’hui à **tous** les AuditLog,
y compris PERSON. Le CHECK du parent ne définit pas des classes de conservation.
La procédure `purge_expired_audit_logs(integer)` relit la valeur sous verrou
partagé et verrou consultatif de même nom que la mutation du réglage, refuse
une durée stockée invalide ou différente de celle préparée, puis supprime les
événements expirés. Les détails partent par cascade dans ce contexte contrôlé.
Les deux procédures SECURITY DEFINER ont `search_path` fixé et leur EXECUTE
révoqué à PUBLIC ; un rôle d’exécution distinct doit recevoir le droit prévu.
Il ne s’agit pas d’une défense contre un administrateur PostgreSQL capable de
modifier les triggers. [S04][S13][S19][S21]

La suppression d’une Personne purge les valeurs de ses champs par
`purge_person_audit_field_changes(text)`, dans la même transaction que
coordonnées, fiche et tombstone. Les AuditLog généraux demeurent, avec
l’identifiant technique et la description minimale. La suppression d’un compte
garde un User anonymisé : AuditActor/AuditTarget RESTRICT sont donc cohérents ;
ses snapshots historiques restent soumis à la rétention du journal.
ArchivedStaffProfile lié est explicitement supprimé. [S08][S12]

L’archive n’a pas de purge autonome des lignes déjà orphelines. La fonction
d’actualité interne n’a pas davantage de conservation éditoriale courante
qualifiée. Ces limites ne justifient pas d’effacer silencieusement des données
locales. Une future décision de retrait doit nommer les données concernées,
les sauvegardes et le sort des références historiques. La séparation future
des finalités du journal est déjà un point documenté ; cette passe ne modifie
aucune durée. [S10][S15][S21]

### Index : besoins actuels et dette identifiée

Les index de provenance `AuditFieldChange_history_lookup_idx`, du dernier
changement Personne, de rétention et du journal par acteur/cible correspondent
à des requêtes identifiées. Le triplet unique d’AuditLog est structurellement
requis pour la FK composite ; le supprimer parce que id est déjà unique
casserait cette relation. [S03][S04][S09][S28]

Les quatre index métier d’ArchivedStaffProfile n’ont aucun lecteur applicatif
actuel trouvé. Les index de classement eventKind/stream/outcome/severity et
les quatre GIN de snapshots appartiennent à une recherche globale dormante.
Le tableau identifie aussi les index de diagnostic ou de configuration dont
le bénéfice actuel n’est pas établi. Ils imposent stockage et entretien, mais
ni taux d’utilisation SQL ni coût marginal n’ont été mesurés dans cette pièce.
Leur retrait éventuel est une migration d’index séparée, sans suppression de
champs ni d’historique. Aucun index nouveau n’a été ajouté « au cas où ».
L’ancien doublon RateLimit.key a déjà été retiré en septembre. [S06][S10][S26]

### Sauvegarde et restauration

Les sept tables sont incluses dans le manifeste fermé v9. User précède les FK
d’acteur/auteur, AuditLog et AuditEncryptionKeyVersion précèdent AuditFieldChange.
ArchivedStaffProfile garde la propriété de format historique `staffProfiles`
et un alias source StaffProfile pour les bases anciennes, sans recréer ce
modèle dans le schéma courant. [S17]

Les colonnes sont exportées dans un snapshot RepeatableRead, par lots bornés ;
les BYTEA sont sérialisés au format hexadécimal PostgreSQL. La restauration
insère via les types de table et garde les contraintes/triggers actifs, dans
une cible vide verrouillée et une transaction Serializable. Les versions de
clé requises sont déclarées et vérifiées ; checksum et signature sont distincts
du chiffrement. L’archive contient encore des données personnelles et la
sauvegarde signée n’est pas à considérer comme dépourvue de secrets. [S17][S18][S31]

L’inventaire des clés est conservateur : même une version sans détail restant
reste déclarée et requise par les contrôles de disponibilité/sauvegarde.
Aucun processus de retraite de cette entrée n’est implémenté. Ne pas affirmer
qu’une ancienne clé peut déjà être retirée parce qu’une seule requête de
références est vide ; sauvegardes et inventaire restent à traiter. C’est une
limite de gestion de cycle de vie, pas un motif pour supprimer le registre.
La restauration d’une sauvegarde antérieure peut réintroduire des données
supprimées ; la procédure d’exploitation l’explicite. [S04][S17][S18][S21]

## Défaut et décisions de cette passe

| ID | Qualification | Preuve et correction | État |
| --- | --- | --- | --- |
| SCH-TECH-01 | P2 — version SystemSetting égale à zéro, acceptée en stockage | Avant : version0 ou négative autorisée SQL ; GET renvoie la version brute. PUT réserve expectedVersion0 à create, donc une ligne version0 mène à conflit d’unicité ; une version négative est rejetée par le contrat de requête. Aucun producteur courant n’écrit ces valeurs. Migration additive [S24] : CHECK(version≥1), validation des lignes existantes, refus sans réécriture. | **Clos après vérification SQL le 13 octobre** : [12 scénarios de la revue centrale](preuves/resultats-schema.json), dont préexistant invalide refusé, valeur0 inchangée, reprise explicite, données valides préservées, INSERT/UPDATE0/-1 refusés et concurrence positive conservée. |

La migration est un seul `ALTER TABLE ... ADD CONSTRAINT ... CHECK`, atomique
côté PostgreSQL. Une première forme avec précondition DO et transaction explicite
a été simplifiée par la revue centrale après essai : Prisma 6.19.3 masquait
l’erreur initiale lors de sa journalisation dans une transaction déjà annulée.
Le refus natif 23514 nommé `SystemSetting_version_check` fournit un diagnostic
plus direct. Aucun ancien fichier de migration n’est réécrit.

Autres constats, **sans correction produit décidée dans cette pièce** :

- **Dette d’indexation historique** : lecteurs manquants ou dormants identifiés
  par déclaration, coût non mesuré ; aucun retrait automatique.
- **Conservation des résidus** : archive de migration et publications dormantes
  restent des données à qualifier avant retrait. Aucun droit, écran ni durée
  inventé pour les justifier.
- **Gestion des anciennes clés** : registre append-only conservateur ; pas de
  procédure de retraite revendiquée.
- **Bornes SQL complémentaires** : RateLimit.count≥0 et validation SQL de
  valeurs éditoriales ne sont pas des garanties actuelles. Aucun flux courant
  produisant un compteur négatif ou un texte invalide n’a été identifié ; ne
  pas présenter une corruption SQL hypothétique comme une régression du site.
- **Anciennes valeurs d’enum** : conserver les valeurs retirées et leur
  interprétation est une exigence des données historiques, pas une compatibilité
  hypothétique avec une production inconnue.

## Preuves et limites

- Lecture exhaustive des 15 blocs ; vérification mécanique de correspondance
  **193 déclarations présentes / 193 annotations, zéro déclaration sans note**.
  Ce contrôle prouve la couverture documentaire, pas l’exécution SQL.
- Comparaison indépendante du schéma au catalogue SQL reçu : **84 colonnes
  physiques** des sept modèles vérifiées (présence, type natif, longueur,
  nullabilité et défaut), zéro divergence. Les relations inverses et directives
  d’index ne sont pas comptées comme des colonnes.
- Lecture des migrations cumulées et des producteurs/lecteurs listés.
  Aucune base applicative habituelle ni fichier .env lu ou modifié ; seules les
  fixtures dédiées de l’environnement isolé sont utilisées pour les essais.
- La nouvelle contrainte a été testée par la revue centrale sur PostgreSQL 17.10
  isolé : [12 scénarios réussis](preuves/resultats-schema.json), 53 migrations.
  Le [catalogue après migration](preuves/catalogue-apres.json) compte 205 colonnes,
  70 contraintes, 112 index, 11 triggers, 11 fonctions et 74 valeurs d’enums pour le schéma
  entier. Le catalogue neuf égale celui de l’upgrade peuplé ; la seule différence
  introduite est le CHECK SystemSetting. Le diff Prisma garde seulement les six
  artefacts varchar_pattern_ops déjà documentés. Ces essais ont été exécutés
  par la revue centrale, pas par l’auteur de cette pièce.
- Régression durable ajoutée à
  [system-settings-postgres.test.ts](../../../apps/web/src/__tests__/system-settings-postgres.test.ts) :
  deux cas (0 et -1), chacun contrôle INSERT/UPDATE refusés par la contrainte
  nommée et préservation entière de la ligne valide. Les scénarios positifs et
  de conflit existants sont conservés. **20/20 tests réussis, zéro ignoré**, sur
  la base dédiée settings_service_test migrée53 ; PostgreSQL réel, session de
  test simulée, handlers appelés directement. Lint ciblé réussi.
  [Condensé daté](preuves/regression-parametres.json).
- Pas de nouvel essai navigateur : hors demande. Les preuves de clôture du socle
  sont des preuves antérieures distinctes, pas rejouées dans cette pièce.
- Pas de mesure nouvelle du coût de chaque index, pas d’estimation de rétention
  juridique, pas de test d’un rôle PostgreSQL d’exploitation différent du rôle
  de migration. Ces sujets restent des limites explicites.
- Le fichier schema.prisma n’est pas modifié par l’auteur de cette pièce.
  Le nouveau dossier de migration SystemSetting a été créé puis repris par la
  revue centrale pour sa simplification et ses essais ; le fichier de tests
  Paramètres porte les deux régressions durables.

## Sources examinées

Les références des tableaux pointent vers les propriétaires concrets.

[S00]: ../../../packages/database/prisma/schema.prisma
[S01]: ../../../apps/web/src/shared/server/audit-event.ts
[S02]: ../../../apps/web/src/shared/server/auth.ts
[S03]: ../../../apps/web/src/app/api/users/[id]/audit/route.ts
[S04]: ../../../packages/database/prisma/migrations/20260721120000_person_identity_foundation/migration.sql
[S05]: ../../../packages/database/prisma/migrations/20260715120000_durable_audit_events/migration.sql
[S06]: ../../../packages/database/prisma/migrations/20260716120000_scale_audit_journal/migration.sql
[S07]: ../../../apps/web/src/features/persons/server/person-audit.ts
[S08]: ../../../apps/web/src/features/persons/server/person-deletion.ts
[S09]: ../../../apps/web/src/features/persons/server/person-history.service.ts
[S10]: ../../../packages/database/prisma/migrations/20260708221000_remove_staff_profiles/migration.sql
[S11]: ../../../apps/web/src/shared/server/rate-limiter.ts
[S12]: ../../../apps/web/src/shared/server/user-deletion.ts
[S13]: ../../../apps/web/src/app/api/systeme/parametres/[key]/route.ts
[S14]: ../../../packages/database/prisma/migrations/20260726160000_internal_news/migration.sql
[S15]: ../../../apps/web/src/features/internal-news/server/internal-news.service.ts
[S16]: ../../../apps/web/src/shared/constants/feature-registry.constants.ts
[S17]: ../../../packages/database/scripts/database-backup-format.ts
[S18]: ../../../packages/database/scripts/restore-database.ts
[S19]: ../../../apps/web/scripts/run-maintenance.ts
[S20]: ../../../apps/web/src/shared/constants/system-settings.constants.ts
[S21]: ../../references/OPERATIONS.md
[S22]: ../../../packages/database/prisma/README.md
[S23]: ../../../apps/web/src/shared/server/audit-visibility.ts
[S24]: ../../../packages/database/prisma/migrations/20261013120000_system_setting_positive_version/migration.sql
[S25]: ../../../packages/database/prisma/migrations/20260722144500_normalize_person_index_names/migration.sql
[S26]: ../../../packages/database/prisma/migrations/20260921180000_drop_redundant_unique_column_indexes/migration.sql
[S28]: ../../../apps/web/src/features/persons/server/person-core.service.ts
[S29]: ../../../apps/web/src/features/internal-news/internal-news.schemas.ts
[S30]: ../../../packages/database/prisma/migrations/20261009120000_remove_notifications_module/migration.sql
[S31]: ../../../packages/database/scripts/database-backup.ts
[P01]: https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/unsupported-database-features
[P02]: https://www.prisma.io/docs/orm/v6/reference/prisma-schema-reference

