# Revue complète avant nouvelles fonctionnalités — 23 octobre 2026

[Index des audits](README.md) · [Méthode d’audit](../methode/audit.md) ·
[Guide général](../REFERENCE_GENERALE.md) · [Constats système](../systeme/constats.md)

## Question, périmètre et état examiné

- **Demande du propriétaire (23 octobre 2026)** : revue complète du code, des
  pages, des rôles et de la documentation avant tout nouveau module ; vérifier
  d’abord que la connexion est irréprochable et recommander les améliorations de
  long terme, même si elles remplacent un système entier.
- **Type** : transverse, statique (lecture du code et des documents, mesures
  scriptées). Aucune modification applicative dans cette passe.
- **État examiné** : branche `main`, commit `7436351`, arbre propre ; Bun 1.3.10,
  Next 15.5.23, React 19.1.8, Prisma 6.19.3. La dernière vérification complète
  (`bun run check`) a réussi le même jour après le découpage de la fiche
  utilisateur ; elle n’est pas rejouée ici, faute de changement de code.
- **Données** : aucune. La base de `DATABASE_URL` est un serveur distant partagé ;
  aucune base n’y a été lue, créée ou modifiée.
- **Contrôles empêchés** : les suites `*-postgres.test.ts`, les parcours HTTP
  réels et les lecteurs d’écran n’ont pas été exécutés : un PostgreSQL 17 local
  tourne sur le poste, mais aucune base de test n’y est configurée (REV-21). Les 308 documents n’ont pas tous été relus intégralement : la
  relecture a porté sur la référence générale, la cartographie du système, les
  domaines Permissions et Rôles métier, la fiche Connexion, l’harmonisation, les
  constats système, l’exploitation et l’architecture d’une fonctionnalité.

### Méthode de mesure

- Lecture intégrale : `shared/server/auth.ts`, `mfa.ts`, `rate-limiter.ts`,
  `api-rate-limiter.ts`, `api-auth.ts`, `sensitive-action.ts`, `middleware.ts`,
  `app/login/page.tsx`, routes `auth/login`, `auth/mfa/verify` ; lecture ciblée
  de `step-up`, `mfa/setup`, `reset-mfa`, `change-password`, `UserContext`,
  `permissions.constants.ts`, `feature-registry.constants.ts`, `schema.prisma`,
  `ci.yml`, `run-maintenance.ts`.
- Script d’exports sans appelant sur `apps/web/src` (fichiers de test, points
  d’entrée Next et `middleware.ts` exclus), puis vérification manuelle.
- Script de croisement de chaque clé de `PERMISSIONS` avec ses contrôles serveur
  et ses lectures client.
- Comptage des conventions de réponse des 34 routes API et des usages Prisma par
  modèle.

## Sélection

| Points | Classement |
| --- | --- |
| Q01, Q27 | Toujours examinés |
| Q09, Q10, Q14 | À examiner : connexion, sessions, MFA, CSRF, permissions, concurrence |
| Q12, Q13, Q16, Q29 | À examiner : tables orphelines, compatibilités, historique de migrations, clés |
| Q17, Q18, Q19 | À examiner : architecture des routes, couche de données client, code mort |
| Q28, Q30 | À examiner : CI, en-têtes, proxy, dépendances, documentation |
| Q33–Q36, Q02–Q07 | Examinés par l’état d’harmonisation : toutes les pages livrées ont été reprises du 20 au 23 octobre ; seuls les écarts transverses restants sont repris ici |
| Q24, Q25 | À examiner pour le long terme : modèle d’autorisation face aux rôles métier cibles |
| Q08, Q20, Q21, Q22, Q23, Q26 | Non applicables : aucune notification, pièce, import, échéance, intégration ni finance livrée |
| Q11, Q15 | Hors impact : audit et confidentialité des personnes inchangés depuis le 15 octobre |

## Ce qui est solide

La connexion repose sur de bonnes bases, à conserver :

- jeton de session de 256 bits, stocké haché (SHA-256), invalidé par
  `securityVersion`, durées absolue et d’inactivité vérifiées côté serveur,
  « se souvenir » interdit au compte racine ;
- MFA TOTP obligatoire pour tous, avec refus de rejeu par pas de temps, codes
  de secours de 120 bits salés et comparés en temps constant, secret TOTP
  chiffré en AES-256-GCM lié à l’utilisateur (AAD) ;
- défi MFA dans un cookie `strict` limité à `/api/auth/mfa`, haché en base,
  consommé dans la transaction qui crée la session ;
- limiteur de débit transactionnel en base (réservation atomique avant bcrypt),
  erreur publique générique, hachage factice contre l’énumération par le temps ;
- confirmations renforcées (mot de passe 30 min, MFA 15 min, action sensible
  5 min) recontrôlées sous verrou ; audit écrit dans la même transaction ;
- CSP avec nonce et `strict-dynamic`, `frame-ancestors 'none'`, HSTS, CSRF en
  double cookie comparé en temps constant, destination `next` filtrée.

## Constats et recommandations

Priorités : **P0** empêche d’affirmer que la connexion est vérifiée ; **P1** à
traiter avant tout nouveau module, car les modules suivants copieraient le
défaut ; **P2** long terme ou à décider.

### Connexion et sécurité

| ID | Nature / priorité | Constat | Recommandation |
| --- | --- | --- | --- |
| REV-01 | Défaut, P1 | Deux verrous superposés : `User.failedLoginAttempts`/`lockedUntil` (5 échecs → 30 min, vérifié avant le mot de passe) et le seau « compte » du limiteur (5 / 15 min → 30 min). Quiconque connaît ou devine un identifiant (`prenom.nom`) peut bloquer ce compte en continu, depuis n’importe quelle adresse. Le compteur du compte ne décroît jamais avec le temps : cinq fautes de frappe espacées de plusieurs semaines verrouillent | Retirer le verrou du compte (colonnes et états « Verrouillé ») et garder le limiteur : seaux IP et paire stricts, seau compte en ralentissement (délai progressif ou seuil plus haut) ; le MFA obligatoire rend un mot de passe deviné insuffisant. Effets : 10 fichiers lisent `lockedUntil` (liste, fiche, Mon compte, suppression) |
| REV-02 | Dette, P1 | Compatibilité avec d’anciens jetons de session en clair : `LEGACY_PLAINTEXT_SESSION_TOKEN_PATTERN`, seconde lecture dans `validateSessionToken`, `OR` dans `invalidateSession`, `notIn` double dans `invalidateOtherUserSessions` et `updateUserPassword`. Le motif correspond aussi aux jetons actuels : chaque cookie invalide coûte une seconde requête | Supprimer la branche et effacer toute session dont le jeton n’est pas un condensat (une instruction SQL, après sauvegarde) |
| REV-03 | Dette, P1 | Code d’authentification mort : `mapToClientResponse`, `getUserById`, `checkUserPermission`, `requireRecentElevatedMfaProof`, le paramètre `allowedRoles` de `requireAuth` et `Roles` ; `requireAnyPermission`, `invalidateAllUserSessions`, `checkRateLimit` (version base) utilisés par les seuls tests ; branche d’échec de `recordLoginAttempt`, toujours appelé avec `true` et mal nommé (il libère une réservation) ; colonne `MfaLoginChallenge.attempts` écrite mais jamais lue ; `reserveLoginRateLimits` et `reserveMfaRateLimits` dupliqués | Retirer, renommer en `releaseRateLimitReservation`, factoriser la réservation multi-seaux, supprimer la colonne |
| REV-04 | Dette structurelle, P1 | L’architecture documentée (route mince → `features/<module>/server`) n’est suivie que par Personnes. `auth.ts` (1 348 lignes) mêle sessions, mots de passe, comptes et audit ; les routes portent la logique et les transactions (`mfa/setup` 796 lignes, `users/[id]` 764, `step-up` 493, `sessions` 294–432, `reset-mfa` 415) ; environ 130 enveloppes `NextResponse.json` écrites à la main hors Personnes au lieu de `apiErrors` | Créer `features/auth/server/` (connexion, sessions, mots de passe, MFA, confirmation renforcée) et déplacer les mutations de comptes dans `features/users/server/` ; routes réduites à l’enchaînement documenté ; enveloppes d’erreur uniques |
| REV-05 | Suggestion, P2 | bcryptjs (JavaScript pur, coût 12, limite de 72 octets qui impose une règle visible dans les formulaires) | Passer à argon2id (paramètres OWASP), avec rehachage transparent à la connexion ; la limite de 72 octets disparaît. Vérifier la compatibilité de la bibliothèque native avec Bun et Next au moment de l’implémentation |
| REV-06 | Suggestion, P2 | Politique de mot de passe : 8 caractères, majuscule, minuscule et chiffre obligatoires, score naïf. Les recommandations NIST SP 800-63B déconseillent les règles de composition et demandent une liste de mots de passe interdits | Longueur minimale (12 conseillé), aucune règle de composition, refus des mots de passe courants et de ceux qui contiennent l’identifiant ou le nom de la structure |
| REV-07 | Décision à reconsidérer, P2 | L’autocomplétion et les gestionnaires de mots de passe sont désactivés partout, y compris à la connexion (décision AUTO-01 du 11 octobre). Les références de sécurité recommandent l’inverse : un gestionnaire favorise des mots de passe longs et uniques | Proposer `autocomplete="username"`, `current-password`, `new-password` et `one-time-code` sur les seuls champs d’authentification. À trancher par le propriétaire |
| REV-08 | Suggestion, P2 | Cookies `session` et `csrf-token` sans préfixe `__Host-` ; jeton CSRF non lié à la session ; en-tête `X-XSS-Protection: 1; mode=block` obsolète | En production, préfixe `__Host-` sur les deux cookies ; contrôle `Origin` / `Sec-Fetch-Site` sur les mutations dans le middleware ; retirer `X-XSS-Protection` |
| REV-09 | Suggestion, P2 | L’IP cliente est le dernier saut de `X-Forwarded-For` sans configuration de proxy de confiance. Exposé sans proxy, un client choisit son IP ; sans en-tête, toutes les requêtes partagent le seau `unknown` (100 requêtes/min en mémoire, 30 connexions / 15 min) | Variable d’environnement décrivant le proxy (nombre de sauts ou en-tête de la plateforme), refus de démarrer en production sans elle |
| REV-10 | Suggestion, P2 | Seule `MFA_ENCRYPTION_KEY_V1` est acceptée : aucune rotation possible, contrairement aux clés d’audit | Clés versionnées et script de rechiffrement, procédure dans l’[exploitation](../exploitation/operations.md) |
| REV-11 | Question, P2 | La réinitialisation MFA d’un membre est réservée à l’unique compte racine ; si la racine perd son accès, seul le script hors ligne reste | Choisir entre un second compte protégé et une autorisation critique délégable `users:reset_mfa` avec confirmation renforcée. À plus long terme, clés d’accès (WebAuthn) comme facteur résistant à l’hameçonnage |
| REV-12 | Dette, P2 | La page de connexion efface encore trois anciennes clés `localStorage` (`team-control:last-login-*`) | Retirer ce nettoyage |

### Rôles et permissions

| ID | Nature / priorité | Constat | Recommandation |
| --- | --- | --- | --- |
| REV-13 | Dette, P1 | Couche de compatibilité de déploiement sans production : `LEGACY_PERMISSION_ALIASES` (« one-release compatibility layer »), `RETIRING_PERMISSION_OVERRIDE_KEYS` (« rollout A … drained legacy instance »), script `db:permissions:retire-historical` (« rollout B »), `HISTORICAL_ONLY_PERMISSION_KEYS` | Après sauvegarde et accord explicite (base distante), exécuter le script de retrait puis supprimer alias, clés en retrait et script ; garder au besoin une simple table de libellés pour lire les anciens événements d’audit |
| REV-14 | Incohérence, P1 | `PERMISSIONS` contient encore `account:view_activity`, `users:view_activity`, `users:export_activity` et `audit:view`, utilisées nulle part, alors que le [domaine Permissions](../domaines/permissions.md) les dit retirées du catalogue actif. Les clés `internal_news:*` d’un module `planned` sont `active` et présentes dans les presets des deux rôles, contrairement à la règle « les capacités futures restent dans `ROADMAP_PERMISSIONS` » | Retirer les clés d’activité ; déplacer `internal_news:*` dans `ROADMAP_PERMISSIONS` et hors des presets |
| REV-15 | Système à remplacer, P1 (décision) | Le modèle actuel (deux rôles globaux, surcharges dans `User.permissions` en JSON, aucun lien compte ↔ personne) ne peut pas exprimer la cible des [rôles métier](../domaines/roles-metier.md) : capacité × entité juridique × périmètre (soi, équipes attribuées) × période. Pour les quatre pages livrées, chaque droit actif est bien contrôlé côté serveur ; les rôles métier (joueur, coach, trésorerie…) ne sont pas encore couverts, par conception | Avant le premier module métier : affectations relationnelles datées (utilisateur, capacité ou modèle de rôle, type et identifiant de portée, début, fin, auteur), liaison explicite compte ↔ personne, puis une politique serveur par module du type `can(acteur, action, ressource)`. L’éditeur actuel devient la portée « ensemble de la structure » |

### Code mort et données orphelines

| ID | Nature / priorité | Constat | Recommandation |
| --- | --- | --- | --- |
| REV-16 | Dette, P1 | Environ 980 lignes sans aucun appelant, oubliées par le nettoyage du 20 octobre : `features/audit/audit-display.ts` (568), `features/audit/system-activity.types.ts` (67), `features/persons/person-audit-display.ts` (56), `features/persons/server/person-journal.ts` (144), `shared/hooks/useAsyncResource.ts` (122), `shared/server/csv.ts` (26). S’y ajoutent des exports morts : `apiPaginatedSuccess`, `countCategoryPermissions`, `getRoleColor`, sept types de `auth.types.ts`, trois de `css.utils.ts`, `formatPersonBirthDate`, `getAgeDescription`, `formatPersonDisplayName`, `EMAIL_PATTERN`, `LOGIN_NAME_PATTERN`, `UserDetailPendingNavigation`, `AccountPendingNavigation` ; une vingtaine d’exports servent seulement aux tests et 115 sont exportés sans usage extérieur | Retirer ; ajouter un détecteur de code mort (par exemple knip) à `bun run check` pour empêcher la rechute |
| REV-17 | Décision à reconsidérer, P2 | `GET /api/users/[id]/audit` répond 410, conservé volontairement le 20 octobre (SYS-03) | **Corrigé le 25 octobre** : route supprimée |
| REV-18 | Données, P1 (accord requis) | Tables sans code : `InternalAnnouncement` (conservée volontairement, SYS-01) et `ArchivedStaffProfile` (archive en lecture seule d’une ancienne table, seulement effacée à la suppression d’un compte) ; le test `internal-news-storage` de `packages/database` porte sur une table inutilisée | Sauvegarder, exporter le contenu utile, puis supprimer les deux tables par migration. Opération destructive sur la base distante : uniquement sur accord explicite |
| REV-19 | Suggestion, P2 (décision) | 54 migrations retracent des modules créés puis retirés (sponsors, structure, transactions, tournois, notes de frais, partenaires, notifications, actualité interne) | Avant la première mise en production, consolider en une migration de base reflétant le schéma actuel (conserver `CHECK`, triggers et index partiels), puis réaligner la base de travail ; les scripts de rattrapage (`baseline-existing-database`, `migration-baseline`) deviennent inutiles |

### Architecture client

| ID | Nature / priorité | Constat | Recommandation |
| --- | --- | --- | --- |
| REV-20 | Système à remplacer, P2 (décision) | Chaque page réécrit sa couche de données : 32 fichiers gèrent un `AbortController`, 19 un `mountedRef`, avec délais, réponses périmées et reprises recodés à chaque fois. `useAsyncResource`, prévu comme primitive commune, n’a aucun consommateur | Adopter une seule couche (TanStack Query, ou une paire `useApiResource` / `useApiMutation` maison) avant les nouveaux modules ; les pages existantes migrent à leur prochaine reprise |

### Vérification et CI

| ID | Nature / priorité | Constat | Recommandation |
| --- | --- | --- | --- |
| REV-21 | Défaut de vérification, **P0** | Les 11 suites `*-postgres.test.ts` (connexion et MFA, comptes, création, fiche et liste des utilisateurs, liste, fiche et création des personnes, paramètres, migration des droits) ne tournent nulle part : le job `verify` de la CI n’a ni service PostgreSQL ni variable `*_TEST_DATABASE_URL`, et aucune base de test n’est configurée sur le PostgreSQL 17 local du poste. Les compteurs à facettes SQL du 20 octobre n’ont jamais été exécutés ; la dernière exécution SQL date du 15 octobre | Ajouter un service PostgreSQL au job `verify` et un script qui crée chaque base `*_test`, applique les migrations et lance les suites ; en local, une commande `test:postgres` qui prépare ces bases sur le PostgreSQL 17 déjà installé. Sans cela, la concurrence de la connexion et du limiteur n’est pas vérifiée |

### Documentation et design

| ID | Nature / priorité | Constat | Action |
| --- | --- | --- | --- |
| REV-22 | Doc, P2 | [Architecture d’une fonctionnalité](../references/architecture-fonctionnalite.md) recommandait `useAsyncResource` et `ResourceStateBoundary` (ce dernier retiré le 20 octobre) | **Corrigé le 23 octobre** : renvoi vers `apiFetchJson` et REV-20 |
| REV-23 | Doc, P2 | Le [domaine Permissions](../domaines/permissions.md) se contredit : clés d’activité « retirées du catalogue actif » dans une section, « y subsistent » dans une autre | **Corrigé le 24 octobre** avec REV-14 |
| REV-24 | Design, P2 | HARMO-02 (53 rayons arbitraires, dont 22 `rounded-[10px]`) et HARMO-03 (10 tailles de texte arbitraires) restent ouverts ; au-dessus du budget de 800 lignes restent `SecuritySection` (860), `permissions.constants.ts` (1 310, réduit par REV-13 et REV-14), `auth.ts` (1 348, voir REV-04) et la primitive shadcn `sidebar.tsx` (900, copie d’origine) | Décider des jetons de rayon nommés ; découper `SecuritySection` à sa prochaine reprise |
| SYS-06 | Exploitation | Planification de `bun run maintenance` non décrite | Inchangé : à décrire à la mise en exploitation |

## Ordre de travail proposé

1. **Lot connexion (P0 puis P1)** : REV-21 (exécuter enfin les tests SQL),
   puis REV-02, REV-03, REV-01, REV-12 ; REV-08 et REV-09 dans la foulée.
2. **Lot permissions (P1)** : REV-14, puis REV-13 après sauvegarde et accord.
3. **Lot code mort (P1)** : REV-16 avec son garde-fou, REV-17.
4. **Lot architecture (P1)** : REV-04, à faire avant tout nouveau module.
5. **Décisions du propriétaire** : REV-15 (modèle d’autorisation), REV-20
   (couche de données), REV-18 et REV-19 (base), REV-05 à REV-07 (mots de
   passe), REV-10 et REV-11 (clés et récupération).

## Suivi — lot 1 du 24 octobre 2026

Lot accepté par le propriétaire (« ok go ») le 24 octobre 2026.

| ID | État | Ce qui a changé |
| --- | --- | --- |
| REV-01 | Corrigé à vérifier | Migration `20261024120000_remove_account_lockout` : colonnes `failedLoginAttempts` et `lockedUntil` retirées, contrainte des comptes supprimés recréée à l’identique sans elles ; `authenticateUser` n’écrit plus jamais dans la ligne du compte ; seau « compte » à 20 échecs / 15 min bloquant 15 min (une seule source est arrêtée à 5 par la paire). Rubrique « Mot de passe » de la fiche utilisateur et ligne « Connexions refusées » de Mon compte retirées. Migration appliquée à la base de travail le 24 octobre (voir ci-dessous) ; suite SQL de connexion réécrite, non exécutée |
| REV-02 | Corrigé | Lecture par condensat uniquement ; branches de migration des jetons en clair retirées |
| REV-03 | Corrigé | Fonctions mortes retirées ; `clearRateLimit` remplace `recordLoginAttempt(clé, true)` ; une seule réservation multi-seaux. Découverts au passage et retirés : GET et DELETE de `/api/auth/step-up` (sans consommateur depuis le mode administrateur), la preuve « MFA seule » `critical-mfa` et son code d’erreur, jamais demandés par le serveur, et l’échéance « 15 minutes » annoncée par l’API alors que le serveur n’accepte la preuve sensible que 5 minutes ; la réponse indique désormais l’échéance réellement appliquée |
| REV-08 | Corrigé à vérifier | Cookies `__Host-session`, `__Host-csrf-token`, `__Secure-mfa-challenge` en production, suppression du cookie de session avec ses attributs ; mutation refusée si `Sec-Fetch-Site` n’est pas `same-origin` ; `X-XSS-Protection` retiré. Parcours E2E de production non rejoué |
| REV-09 | Corrigé | `TRUSTED_PROXY_HOPS` (1 par défaut, validé au démarrage) choisit l’entrée de `X-Forwarded-For` écrite par le proxy le plus extérieur |
| REV-12 | Corrigé | Nettoyage des anciennes clés `localStorage` de la connexion retiré |
| REV-21 | Outillé | `bun run test:postgres` (bases `*_test` recréées sur un PostgreSQL local, cible vérifiée en lecture seule avant migration) et étape « Run PostgreSQL suites » du job `verify` |

Contrôles exécutés le 24 octobre : types, lint (0 avertissement), budget
d’architecture (plafonds de `auth.ts` et `SecuritySection` resserrés), Vitest
complet **1 267 réussis**, 225 ignorés (les onze suites PostgreSQL), bancs
client de la fiche utilisateur (48/48) et de Mon compte (23/23) avec captures
relues, `bun run check` complet. Non exécutés : les suites PostgreSQL et l’E2E
de production.

**Migration de la base de travail — 24 octobre 2026**, sur accord du
propriétaire (« oui go ») :

1. Précontrôle en lecture : 54 migrations appliquées, seule
   `20261024120000_remove_account_lockout` en attente.
2. Sauvegarde signée v9 (même procédure que le 15 octobre : paire Ed25519
   dédiée, clé privée en mémoire seulement, clé publique dans le fichier
   `.verification-key.json` voisin) dans `.codex-tmp/database-backups/`,
   identifiant `97b66fb5-4870-4e98-8f9d-4896c60bc655` ; empreinte, taille et
   signature revérifiées indépendamment ; les deux colonnes retirées y figurent
   pour les 18 comptes. Attention : `db:migrate:deploy` ne sauvegarde pas
   lui-même, contrairement à ce qu’indiquait le compte rendu de la veille.
3. Précontrôles en lecture : aucune vue ne dépend des colonnes retirées ; les
   13 comptes supprimés respectent déjà la contrainte recréée.
4. `db:migrate:deploy` réussi. Contrôle postérieur : colonnes absentes,
   contrainte présente sans elles (14 conditions), 18 comptes dont 13 supprimés
   et 1 protégé, `migrate status` à jour (55 migrations).

## Suivi — lot 2 du 24 octobre 2026

Lot accepté par le propriétaire (« oui go ») le 24 octobre 2026.

| ID | État | Ce qui a changé |
| --- | --- | --- |
| REV-14 | Corrigé | `account:view_activity`, `users:view_activity` et `users:export_activity` retirés ; `audit:view` et `internal_news:*` déplacés dans `ROADMAP_PERMISSIONS`, hors des presets et de `PERMISSION_CATEGORIES` ; fichier de catégorie de l’actualité interne et code d’erreur `INTERNAL_NEWS_FEATURE_NOT_CONFIGURED` supprimés |
| REV-13 | Corrigé (code) | Alias, libellés « historique », clés en retrait et `preserveRetiringPermissionOverrides` supprimés ; une ancienne clé est inconnue, refusée en entrée et abandonnée au prochain enregistrement. Le module orphelin `audit-visibility` (seul consommateur des clés historiques) et le script `db:permissions:retire-historical` sont retirés. Également supprimés car sans appelant : `requiresMfaForAccess`, `countCategoryPermissions`, `getRoleColor`. `permissions.constants.ts` passe de 1 307 à 1 064 lignes |

**Donnée restante.** Lecture du 24 octobre : un seul compte actif porte encore
une clé retirée (`audit:view_sensitive`). Elle n’a aucun effet et disparaîtra
au prochain enregistrement de ses autorisations. L’exécution du script de
nettoyage sur la base partagée a été bloquée par le garde-fou de l’outil ; elle
n’est pas nécessaire et n’a pas été contournée.

Contrôles : types, Vitest (tests de permissions et de durcissement réécrits
pour vérifier qu’une ancienne clé est inconnue et jamais traduite).

## Suivi — première exécution des suites PostgreSQL, 24 octobre 2026

Serveur PostgreSQL 17 **temporaire** démarré avec les binaires déjà installés
(`initdb` puis `pg_ctl`, port 5433, authentification locale sans mot de passe,
dossier jetable), sans toucher au service installé ni à la base distante, puis
arrêté. `bun run test:postgres` : neuf bases recréées, 55 migrations appliquées
depuis une base vide sur chacune des sept bases migrées, onze suites lancées.

- Premier passage : **220 réussis sur 225**. Les cinq échecs étaient des tests
  périmés, sans défaut du produit :
  - un test envoyait la preuve `critical-mfa` retirée le 24 octobre (400 au lieu
    de 403) : réécrit pour vérifier le refus sans consommation du code ;
  - quatre tests retiraient un droit à un ADMIN par une surcharge `false`,
    sans effet depuis la règle du 18 octobre (« un ADMIN garde tous ses accès
    administratifs ») ; écrits le 13 octobre, ils n’avaient jamais tourné
    depuis. Ils retirent désormais le droit par passage au rôle USER.
- Second passage : **225 réussis sur 225**, dont la suite de connexion réécrite
  (blocage de la paire IP + identifiant sans blocage du compte), les compteurs
  à facettes du Répertoire et des Utilisateurs, et la migration du verrou.

REV-01 et AUTH-10 passent de « corrigé à vérifier » à **vérifié au niveau SQL** ;
REV-21 est **résolu** localement. Reste non exécuté : l’E2E de production
(cookies préfixés, REV-08).

## Suivi — lot 3 du 25 octobre 2026

Lot accepté par le propriétaire (« ok go ») le 25 octobre 2026.

| ID | État | Ce qui a changé |
| --- | --- | --- |
| REV-16 | Corrigé | Détecteur **knip 6.41.0** (version épinglée, publiée deux semaines plus tôt) configuré dans `knip.jsonc` et ajouté à `bun run check`, donc à la CI. Six modules orphelins supprimés ; 78 exports et 26 types sans usage retirés, puis 52 déclarations devenues mortes (sous-composants shadcn jamais utilisés, helpers et types dupliqués) ; dépendances inutiles retirées (`@radix-ui/react-scroll-area`, `prisma-json-types-generator`, `eslint` et `prettier` à la racine). Gardés délibérément : `TooltipProvider` (marqué `@public`, utilisé par les bancs client) et l’outil `scripts/codex-preview.mjs` |
| REV-17 | Corrigé | Route `GET /api/users/[id]/audit` (410) supprimée ; le test de contrat vérifie son absence |

Les bancs client datés d’avant le 20 octobre qui importaient des sous-composants
retirés (par exemple `SheetTrigger` dans le banc des composants du 11 octobre)
restent des preuves historiques et ne sont plus rejouables tels quels.

Contrôles du 25 octobre : documentation, lint, knip (aucun signalement), types,
budget d’architecture (plafonds de `sidebar.tsx` et `permissions.constants.ts`
resserrés), 1 249 tests web et 33 tests database réussis, build et budget de
performance ; bancs client du Répertoire (41/41) et de la fiche utilisateur
(48/48) rejoués après l’allègement des primitives. La génération du client
Prisma a été sautée dans `bun run check` : fichier verrouillé par le serveur de
développement en cours d’exécution (EPERM connu), étapes suivantes lancées
directement.

## Suivi — lot 4, première partie, 25 octobre 2026

Lot accepté par le propriétaire (« ok go ») le 25 octobre 2026.

- **`auth.ts` supprimé** (1 137 lignes), réparti dans `shared/server` :
  `session.ts`, `password.ts`, `audit-log.ts`, `auth-errors.ts`,
  `user-projection.ts`, tous sous 800 lignes. Son exception de taille est
  retirée du contrôle d’architecture. Les 30 importeurs et les 22 tests qui le
  simulaient ont été migrés par outil (analyse TypeScript), sans réécriture
  manuelle des assertions.
- **Routes d’authentification et du compte réduites à l’adaptateur HTTP** :
  la logique vit dans `features/auth/server` (`login`, `mfa-setup`,
  `mfa-account`, `step-up`, `account-sessions`, `password-change`) et
  `features/account/server` (`profile`, `contact-email`). Les onze routes
  totalisent 871 lignes ; `mfa/setup` passe de 790 à 144.
- **Enveloppes d’erreur unifiées** : un service lève une `AuthFlowError`
  (code, message, statut, détails, délai) ; `authFlowErrorResponse` et, pour
  les flux MFA, `mfaFlowErrorResponse` la traduisent. Les messages et statuts
  publics sont inchangés.
- **Retiré au passage** : la méthode DELETE de `/api/auth/mfa`, qui refusait
  toujours de désactiver le MFA et n’avait aucun appelant.

Contrôles : types, lint, knip, budget d’architecture, 1 248 tests web,
33 tests database, build et budget de performance ; **225 tests PostgreSQL sur
225** rejoués sur le serveur temporaire après chaque étape importante. Aucune
réponse publique n’a changé : les tests de routes existants passent sans
modification de leurs assertions (seuls leurs appels et simulations ont suivi
les nouveaux chemins).

**Reste pour la seconde partie** : les routes `users`, `users/[id]`,
`users/[id]/sessions`, `users/[id]/reset-mfa`, `users/[id]/reset-password` et
`systeme/parametres/[key]`. Elles s’appuient sur des aides partagées
(`preauthorize…`, `authorizeUserPermissionMutation`, `requireRecent…`) qui
renvoient elles-mêmes des réponses HTTP : il faut d’abord les convertir en
erreurs typées, ce qui fera de `AuthFlowError` une erreur de service commune.

## Suivi — lot 4, seconde partie, 25 octobre 2026

Suite acceptée par le propriétaire (« ok go la suite ») le 25 octobre 2026.

- **Erreur de service commune** : `AuthFlowError` devient `ServiceError`,
  déplacée dans `$server/service-error` avec `serviceErrors` et
  `serviceErrorResponse` ; `mfaFlowErrorResponse` reste propre aux flux MFA.
- **Aides d’autorisation sans réponse HTTP** : `assertPermission` (variante
  levante de `requirePermission`), `assertRecentPasswordReauthentication` et
  `assertRecentSensitiveActionProof` remplacent les `requireRecent…` ;
  `preauthorizeUserPermissionMutation` et `authorizeUserPermissionMutation`
  lèvent leur refus au lieu de renvoyer une réponse.
- **Routes d’administration réduites à l’adaptateur HTTP** : la logique vit
  dans `features/users/server` (`user-admin` pour la création, la
  modification et la suppression, `user-sessions`, `user-password-reset`,
  `user-mfa-reset`) et `features/settings/server/system-setting-update`.
  Les six routes passent de 2 343 à 580 lignes ; `users/[id]` de 764 à 100.
  L’adaptateur `user-session-authorization.ts` est retiré.

Contrôles : types, lint, knip, budget d’architecture, 1 248 tests web,
33 tests database, build de production et budget de performance (lancés à la
main, `bun run check` butant sur le verrou du client Prisma tenu par le
serveur de dev), **225 tests PostgreSQL sur 225** sur le serveur temporaire. Messages, codes et
statuts publics inchangés : seules les simulations de quatre tests ont suivi
les nouvelles aides (`assertPermission`, `assertRecent…`), sans changement
d’assertion.

## Suivi — lot 5, mots de passe, 25 octobre 2026

Le propriétaire délègue les décisions restantes (« fait ce que tu recommande »,
25 octobre 2026). Ordre retenu : mots de passe, puis clés et récupération MFA,
données, jetons de design ; REV-15, REV-19 et REV-20 sont consignés comme
décisions sans infrastructure sans consommateur.

| ID | État | Ce qui a changé |
| --- | --- | --- |
| REV-06 | Corrigé | Nouveau mot de passe : 12 à 128 caractères comptés en points de code, aucune règle de composition, refus des suites et répétitions simples (alphabet, chiffres, rangées AZERTY et QWERTY, cycliques, dans les deux sens), de l'identifiant, de ses parties, du prénom, du nom (4 lettres au moins, accents ignorés) et de « Noctambule » ou « Carnet ». Le serveur refuse en plus les mots de passe courants : 1 188 phrases de 12 caractères ou plus et 12 255 mots de base des listes SecLists (MIT), complétées de mots français, y compris décorés de chiffres ou de substitutions (« Soleil2026!! », « P@ssw0rd2026 »). La liste n'est jamais envoyée au navigateur. La fenêtre « Changer le mot de passe » affiche trois règles cochées en direct à la place de la jauge de force. Les mots de passe existants restent valides ; la politique s'applique au prochain changement |
| REV-05 | Corrigé | argon2id (`@node-rs/argon2` 2.2.2, 19 Mio, 2 passes, 1 voie, paramètres OWASP) pour tout nouveau hachage, y compris seed et E2E. Un hachage bcrypt reste vérifié (72 octets au plus) puis remplacé à la connexion par une écriture SQL conditionnelle qui ne touche ni `updatedAt`, ni la version de sécurité, ni les sessions. La limite visible de 72 octets disparaît. `bcryptjs` est retiré de `packages/database` ; l'application ne le garde que pour vérifier les anciens hachages ([exploitation](../exploitation/operations.md#déploiement)) |
| REV-07 | Corrigé (décision déléguée) | Gestionnaires de mots de passe autorisés sur les seuls champs d'authentification (`username`, `current-password`, `new-password`, `one-time-code`) ; codes de secours et tous les autres champs restent exclus. `Input` contrôle le jeton à l'exécution ; le test de contrat limite les jetons aux huit fichiers d'authentification ([règle](../design/comportements.md#autocomplétion), [journal](../design/preferences.md#journal)) |
| REV-10 | Corrigé | Clés MFA versionnées comme les clés d'audit : `MFA_ENCRYPTION_CURRENT_VERSION` choisit la clé des nouveaux secrets, chaque secret se lit avec la clé de sa version, la restauration authentifie chaque version. Commande `db:mfa:reencrypt` (à blanc, puis réel après sauvegarde signée, idempotente), vérifiée de bout en bout sur une base jetable ; `checks.mfa` dans la disponibilité. La signature des curseurs de liste dérive désormais de la clé courante au lieu de la chaîne de la clé V1 ([procédure](../exploitation/operations.md#rotation-de-la-clé-mfa)) |
| REV-11 | Corrigé (décision déléguée) | Autorisation critique délégable `users:reset_mfa` plutôt qu'un second compte protégé : elle reste dans le modèle de droits existant, auditée (`actorIsProtected`), revérifiée dans la transaction, avec mot de passe et code TOTP frais de l'acteur. Seule la racine réinitialise un ADMIN ; la racine garde la procédure hors ligne. Les clés d'accès (WebAuthn) restent une piste de long terme |
| REV-18 | Corrigé et appliqué | Migration `20261025120000_remove_orphan_tables` : `InternalAnnouncement` et `ArchivedStaffProfile` supprimées, clé `audit:view_sensitive` retirée des surcharges stockées (objet vidé ramené à `NULL`). Code associé retiré (purge à la suppression d'un compte, test de stockage, mécanisme `legacySourceTableName` de la sauvegarde) ; format de sauvegarde v10. Vérifiée sur PostgreSQL local : 56 migrations depuis une base vide, nettoyage de la clé sur trois comptes d'essai. Base de travail : précontrôle en lecture (55 migrations ; 1 annonce, 1 profil archivé, 1 compte porteur de la clé), export des deux tables (`rev18-export-2026-10-25T13-39-20-924Z.json` et son empreinte) puis sauvegarde v10 signée `0bb797a1-71f4-412d-9b51-1800b39de012` (clé publique dans le `.verification-key.json` voisin), vérifiée par une restauration à blanc vers une base locale vide : signature, empreinte et valeurs chiffrées authentifiées. `db:migrate:deploy` refusé par le garde-fou de l'outil, puis **lancé par le propriétaire le 25 octobre 2026** avec la régénération du client Prisma. Contrôle en lecture : 56 migrations, schéma à jour, deux tables absentes, aucun compte ne porte plus la clé. `bun run check` complet réussi ensuite, sans contournement |
| REV-24 | Corrigé | `SecuritySection` découpé à sa reprise : `AccountSessionsCard` porte les sessions et leurs confirmations, `SecurityCardTitle` le titre et le focus communs ; 838 → 443 lignes, exception de taille retirée. HARMO-02 clos par six rayons nommés aux valeurs existantes (banc du Répertoire rejoué, utilitaires compilés vérifiés) ; HARMO-03 qualifié : les tailles restantes sont celles des primitives. Le catalogue des droits sort de `permissions.constants.ts` vers `permission-catalog.constants.ts` (702 lignes), la logique reste (400 lignes) et réexporte le catalogue : seule `sidebar.tsx` (copie shadcn) garde une exception de taille |

**Décisions consignées sans infrastructure prématurée** :

- **REV-15** : modèle d'autorisation cible retenu (liaison compte ↔ personne,
  affectations datées par portée, politique `can()` par module, reprise des
  surcharges en portée « structure ») et construit avec le chantier « Accès &
  responsabilités métier », au plus tard avec le premier module à portée
  d'équipe ([décision](../domaines/roles-metier.md#décision-du-25-octobre-2026--modèle-dautorisation-retenu-rev-15)).
- **REV-20** : TanStack Query v5 pour les nouveaux modules, installé avec son
  premier consommateur ; pages livrées migrées à leur reprise
  ([architecture d'une fonctionnalité](../references/architecture-fonctionnalite.md#5-états-ux-obligatoires)).
- **REV-19** : regroupement des migrations juste avant la première mise en
  production, avec comparaison des schémas ([données](../systeme/donnees.md#migrations)).

Le test `auth.test.ts`, qui vérifiait des copies locales de bcrypt et d'un
générateur de jeton au lieu du code de l'application, est remplacé par
`password-hashing.test.ts` (vrai hachage, vérification, bornes, ancien bcrypt).
La suite SQL de connexion vérifie la mise à niveau d'un hachage bcrypt sur
PostgreSQL : révision, version de sécurité et date de changement inchangées.

Contrôles en fin de lot 5 (tous ses volets) : lint, knip, types, budget d'architecture, 1 240 tests web, 34 tests database, **226 tests PostgreSQL sur 226**,
build de production (module natif externe, liste absente du code client) et
budget de performance. Bancs client rejoués et alignés sur la nouvelle règle :
Mon compte 25/25 (deux scénarios ajoutés, captures relues à 390 et 1 440 px) et
Connexion 29/29 ; le scénario « anciens identifiants effacés » de ce dernier,
qui vérifiait le nettoyage retiré le 24 octobre (REV-12), est supprimé.

## Verdict et suivi

La connexion est **solide sur le fond** (jetons, MFA, limiteur, confirmations,
en-têtes) mais **pas encore démontrable** : ses tests SQL ne tournent nulle part
(REV-21), un verrou permet de bloquer un compte connu (REV-01) et du code de
compatibilité sans objet subsiste (REV-02, REV-03). Les quatre pages livrées
contrôlent correctement chaque droit actif ; le catalogue garde en revanche des
clés mortes ou prématurées (REV-13, REV-14) et le modèle d’autorisation ne
porte pas encore la cible métier (REV-15).

Suivi : [constats système](../systeme/constats.md) (SYS-07 à SYS-10),
[fiche Connexion](../pages/connexion.md#revue-complète--23-octobre-2026) et
[domaine Permissions](../domaines/permissions.md). Réexamen : à la livraison de
chaque lot, en rejouant les tests SQL et les bancs des pages touchées.
