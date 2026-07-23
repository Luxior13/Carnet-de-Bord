# Modèle de permissions

Ce document est la référence fonctionnelle du contrôle d'accès. La source
exécutable reste `apps/web/src/shared/constants/permissions.constants.ts`.
Toute divergence doit être corrigée dans le même changement que le code, les
politiques serveur et les tests concernés.

## Principes

- Refus par défaut : une clé inconnue ou seulement planifiée vaut toujours
  `false` pour un compte non protégé.
- Une permission décrit une capacité métier, pas un menu, un pôle, un rôle ou
  un composant React.
- Le serveur contrôle chaque lecture et mutation. Masquer un bouton ou une
  entrée de navigation n'est jamais une autorisation suffisante.
- Une dépendance manquante rend la permission dépendante inefficace, même si
  une surcharge individuelle la contient à `true`.
- Les surcharges sont différentielles : elles ajoutent ou retirent uniquement
  les permissions marquées `grantable`, c'est-à-dire configurables
  individuellement, par rapport au preset du rôle.
- Les droits du compte racine protégé sont implicites et ne sont pas éditables.
- Une page future ne justifie pas un droit actif. Les capacités futures restent
  dans `ROADMAP_PERMISSIONS` jusqu'à la mise en ligne complète du module.

Le catalogue actif possède deux pôles dans l'éditeur des autorisations :
**Vie interne** (`internal`) et **Système** (`system`). `Administration` reste
le nom d'une section de navigation à l'intérieur du pôle Système. Les pôles
futurs ne doivent être ajoutés à `PERMISSION_POLES` qu'au moment où leurs pages
deviennent réellement actives.

## Vocabulaire canonique de l'interface

La hiérarchie visible est toujours : **Pôle → Page → Rubrique →
Autorisation**.

- pôles `Vie interne` et `Système` ;
- pages `Répertoire`, `Utilisateurs`, `Paramètres système` et
  `Journal d'activité` ;
- rubriques telles que `Annuaire`, `Profil et contact`, `Sécurité` ou
  `Autorisations` ;
- autorisations formulées avec un verbe d'action : `Consulter`, `Créer`,
  `Modifier`, `Accorder`, `Retirer`, `Déléguer`, `Exporter`, `Révoquer` ou
  `Supprimer`.

Le mot `permission` reste accepté dans le code et dans cette documentation
technique. Dans l'interface, `autorisation` désigne le réglage et `accès`
désigne son résultat effectif (page accessible ou inaccessible).

## Trois ensembles à ne pas confondre

1. `PERMISSIONS` contient toutes les clés actives reconnues par
   `hasPermission` : socle, autonomie personnelle, administration et API.
2. `PERMISSION_CATEGORIES` décrit toutes les pages administratives actives
   visibles dans l'éditeur. `DELEGABLE_PERMISSION_CATEGORIES` isole celles dont
   les droits sont configurables individuellement ; les droits liés au rôle
   restent affichés en lecture seule.
3. `ROADMAP_PERMISSIONS` contient des noms réservés pour la préparation produit.
   Ils sont absents des presets, des surcharges acceptées et du calcul des
   droits effectifs.

`ACCOUNT_PERMISSION_CATEGORIES` décrit l'autonomie de `/mon-compte`. La plupart
des actions de sécurité personnelles sont garanties par le socle. Seule
`account:update_profile` est actuellement configurable individuellement afin de
pouvoir retirer à un compte la modification de son prénom et de son nom.

## Presets USER, ADMIN et compte racine

Les colonnes USER et ADMIN ci-dessous décrivent le preset sans surcharge
individuelle. Une permission configurable peut être ajoutée à un USER ou
retirée à un ADMIN. Le compte racine protégé contourne les presets et possède
toutes les capacités actives ; les restrictions structurelles du compte racine
continuent néanmoins de s'appliquer.

Légende :

- **socle** : toujours active pour un compte authentifié, non retirable ;
- **rôle** : valeur fournie par le preset, modifiable seulement si la clé
  accepte une surcharge individuelle ;
- **implicite** : droit du compte racine, sans surcharge stockée.

### Socle et autonomie personnelle

| Clé canonique             | Portée                                | Dépend de               | Risque    | USER       | ADMIN      | Racine         | Surcharge |
| ------------------------- | ------------------------------------- | ----------------------- | --------- | ---------- | ---------- | -------------- | --------- |
| `dashboard:view`          | `/`                                   | —                       | `default` | Oui, socle | Oui, socle | Oui, implicite | Non       |
| `notifications:view`      | `/mes-notifications`, données propres | —                       | `default` | Oui, socle | Oui, socle | Oui, implicite | Non       |
| `account:view_profile`    | profil propre                         | —                       | `default` | Oui, socle | Oui, socle | Oui, implicite | Non       |
| `account:update_profile`  | prénom et nom propres                 | `account:view_profile`  | `default` | Oui, rôle  | Oui, rôle  | Oui, implicite | Oui       |
| `account:update_contact`  | contact propre                        | `account:view_profile`  | sensible  | Oui, socle | Oui, socle | Oui, implicite | Non       |
| `account:view_security`   | sécurité propre                       | —                       | `default` | Oui, socle | Oui, socle | Oui, implicite | Non       |
| `account:change_password` | mot de passe propre                   | `account:view_security` | sensible  | Oui, socle | Oui, socle | Oui, implicite | Non       |
| `account:manage_mfa`      | MFA et récupération propres           | `account:view_security` | sensible  | Oui, socle | Oui, socle | Oui, implicite | Non       |
| `account:manage_sessions` | sessions propres                      | `account:view_security` | sensible  | Oui, socle | Oui, socle | Oui, implicite | Non       |
| `account:view_activity`   | activité propre                       | —                       | `default` | Oui, socle | Oui, socle | Oui, implicite | Non       |

La modification du contact propre exige en plus la confirmation du mot de
passe. Les capacités personnelles ne donnent aucun droit sur un autre compte.

### Page Utilisateurs

Toutes les clés de ce tableau acceptent une surcharge individuelle. Leur preset
est `false` pour USER et `true` pour ADMIN. Le compte racine les possède
implicitement. Cela ne signifie pas que chaque gestionnaire peut toutes les
attribuer : les limites d'attribution sont détaillées sous le tableau.

| Clé canonique                 | Action couverte                                 | Dépend de                                   | Risque    | Step-up à l'usage |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------- | --------- | ----------------- |
| `users:view`                  | liste, fiche et données de base                 | —                                           | `default` | Non               |
| `users:create`                | créer un compte standard                        | `users:view`                                | sensible  | Non               |
| `users:view_contact`          | voir les adresses de contact                    | `users:view`                                | sensible  | Non               |
| `users:update_profile`        | modifier prénom et nom                          | `users:view`                                | sensible  | Non               |
| `users:update_contact`        | modifier une adresse de contact                 | `users:view`, `users:view_contact`          | sensible  | Non               |
| `users:update_login`          | modifier l'identifiant et fermer les sessions   | `users:view`                                | critique  | Oui               |
| `users:view_security`         | voir verrouillage, mot de passe et MFA          | `users:view`                                | sensible  | Non               |
| `users:update_status`         | désactiver ou réactiver un compte               | `users:view`, `users:view_security`         | critique  | Oui               |
| `users:view_access`           | consulter les autorisations administratives     | `users:view`                                | sensible  | Non               |
| `users:grant_access`          | accorder des autorisations administratives      | `users:view_access`                         | critique  | Oui               |
| `users:revoke_access`         | retirer des autorisations administratives       | `users:view_access`                         | critique  | Oui               |
| `users:delegate_access`       | déléguer l'attribution et le retrait des accès  | `users:grant_access`, `users:revoke_access` | critique  | Oui               |
| `users:view_account_policy`   | voir l'autonomie personnelle                    | `users:view`                                | sensible  | Non               |
| `users:update_account_policy` | modifier les options personnelles configurables | `users:view_account_policy`                 | sensible  | Oui               |
| `users:reset_password`        | émettre un mot de passe temporaire              | `users:view_security`                       | critique  | Oui               |
| `users:view_sessions`         | voir les sessions actives                       | `users:view_security`                       | sensible  | Non               |
| `users:revoke_sessions`       | révoquer une ou toutes les sessions             | `users:view_sessions`                       | critique  | Oui               |
| `users:view_activity`         | voir l'activité d'un autre compte               | `users:view`                                | sensible  | Non               |
| `users:export_activity`       | exporter l'activité d'un autre compte           | `users:view_activity`                       | critique  | Oui               |
| `users:delete_account`        | supprimer irréversiblement un compte désactivé  | `users:view_security`                       | critique  | Non               |

La désactivation via `users:update_status` est la seule opération réversible.
La suppression exige un compte déjà désactivé, anonymise sa ligne technique,
supprime ses secrets d'authentification et interdit toute restauration en base.
Un détenteur de `users:delete_account` peut supprimer un compte standard ; seul
le compte racine peut supprimer un administrateur. Le compte racine et son
propre compte ne peuvent jamais être supprimés depuis l'application.

La clé neuve `users:delete_account` évite de réutiliser `users:delete`, qui a
historiquement désigné l'ancien archivage. Aucun ancien droit positif
d'archivage n'est transformé en droit de suppression irréversible. Les anciens
événements `USER_DELETE` sans marqueur `irreversible` restent affichés comme des
archives historiques ; seuls les nouveaux événements versionnés sont présentés
comme des suppressions définitives.

Les tombstones supprimés sont immuables au niveau PostgreSQL. Toute future
migration globale de `User` doit donc exclure `deletedAt IS NOT NULL` ou gérer
explicitement le retrait puis la recréation du trigger dans la même migration.
Une sauvegarde antérieure à ce changement doit être restaurée dans le schéma de
la même version, puis recevoir cette migration de conversion.

La gestion déléguée des autorisations repose sur trois capacités distinctes :

- `users:grant_access` permet d'accorder une autorisation que l'acteur possède
  lui-même ;
- `users:revoke_access` permet de retirer une autorisation ;
- `users:delegate_access` permet d'attribuer ou de retirer les deux capacités
  précédentes à un autre compte standard.

Seul le compte racine peut attribuer ou retirer `users:delegate_access`. Un
détenteur de ce droit peut déléguer l'attribution et le retrait, mais ne peut
pas transmettre le droit de délégation lui-même. Les rôles `USER` et `ADMIN`
restent hors de ce mécanisme : seul le compte racine peut les modifier.

Chaque modification enregistre séparément les clés effectivement accordées et
effectivement retirées, y compris les effets indirects des dépendances ou d'un
changement de rôle. Ces listes sont des métadonnées d'audit sensibles : elles
ne sont visibles que dans la projection détaillée autorisée par `audit:view`.

### Page Répertoire

Les quatre permissions acceptent une surcharge individuelle. Leur preset est
`false` pour USER et `true` pour ADMIN. Le compte racine les possède
implicitement.

| Clé canonique    | Action couverte                                       | Dépend de      | Risque   | Step-up à l'usage |
| ---------------- | ----------------------------------------------------- | -------------- | -------- | ----------------- |
| `persons:view`   | consulter la liste et la fiche complète               | —              | sensible | Non               |
| `persons:create` | créer une fiche et choisir son statut                 | `persons:view` | sensible | Non               |
| `persons:update` | modifier l'identité, le statut et les coordonnées     | `persons:view` | sensible | Non               |
| `persons:delete` | supprimer définitivement une fiche et ses coordonnées | `persons:view` | critique | Non               |

`persons:view` donne accès à toutes les données de la fiche détaillée, mais les
listes et suggestions n'exposent ni coordonnées privées ni date de naissance.
La suppression exige une confirmation explicite et une version courante ; elle
ne demande pas de nouvelle preuve à l'usage. Comme toute permission critique,
son attribution reste soumise aux protections générales du moteur.

### Page Sponsors & partenaires

Les trois permissions acceptent une surcharge individuelle. Leur preset est
`false` pour USER et `true` pour ADMIN. Le compte racine les possède
implicitement.

| Clé canonique     | Action couverte                                                       | Dépend de       | Risque   | Step-up à l'usage |
| ----------------- | --------------------------------------------------------------------- | --------------- | -------- | ----------------- |
| `partners:view`   | consulter les organisations, périodes et suivis                       | —               | sensible | Non               |
| `partners:manage` | créer et modifier organisations, contacts, périodes et suivis         | `partners:view` | sensible | Non               |
| `partners:delete` | supprimer uniquement une fiche vide créée par erreur                  | `partners:view` | critique | Non               |

L'identité d'un contact reste conditionnée par `persons:view`. Sans cette
permission, la fiche partenaire ne révèle ni son nom ni ses coordonnées.
Associer un contact exige simultanément `partners:manage` et `persons:view`.
Une fiche possédant une période, un contact ou un suivi ne peut plus être
supprimée ; elle doit être terminée ou, pour un doublon, fusionnée lorsque
cette opération sera activée.

### Journal global et historique contextuel

| Clé canonique              | Action couverte                                          | Dépend de    | Risque   | USER | ADMIN     | Racine         | Surcharge | Step-up |
| -------------------------- | -------------------------------------------------------- | ------------ | -------- | ---- | --------- | -------------- | --------- | ------- |
| `audit:view`               | consulter le journal global et ses détails autorisés     | —            | critique | Non  | Oui, rôle | Oui, implicite | Oui       | Non     |
| `audit:view_field_history` | voir trois changements d'un champ sur une page autorisée | dynamique    | sensible | Non  | Oui, rôle | Oui, implicite | Oui       | Non     |
| `audit:export`             | exporter le journal global                               | `audit:view` | critique | Non  | Oui, rôle | Oui, implicite | Oui       | Oui     |

`audit:view_field_history` ne dépend statiquement d'aucune page : chaque route
contextuelle exige simultanément ce droit et le droit de consulter l'entité
concernée, par exemple `persons:view`. Il n'accorde jamais l'accès au journal
global. `audit:view` suffit en revanche à consulter la projection globale
détaillée sans permission métier supplémentaire. Les secrets
d'authentification ne sont jamais enregistrés. Le droit de consulter l'activité
d'un utilisateur ne permet jamais de lire l'activité privée du compte racine :
seul son propriétaire y accède.

### API actives sans écran d'administration

Ces permissions protègent une API opérationnelle, mais aucun écran actif ne
permet encore d'en configurer l'usage individuellement. Elles sont donc
connues, non `grantable`, absentes de l'éditeur et impossibles à ajouter ou
retirer par surcharge.

| Clé canonique        | API                                 | Dépend de       | Risque   | USER | ADMIN     | Racine         | Step-up |
| -------------------- | ----------------------------------- | --------------- | -------- | ---- | --------- | -------------- | ------- |
| `notifications:send` | `POST /api/notifications`           | —               | critique | Non  | Oui, rôle | Oui, implicite | Oui     |
| `settings:view`      | `GET /api/systeme/parametres`       | —               | sensible | Non  | Oui, rôle | Oui, implicite | Non     |
| `settings:update`    | `PUT /api/systeme/parametres/[key]` | `settings:view` | critique | Non  | Oui, rôle | Oui, implicite | Oui     |

Lorsqu'un écran correspondant deviendra actif, la possibilité d'une surcharge
individuelle devra être décidée explicitement. La seule présence de l'API ou du
futur écran ne doit pas transformer automatiquement ces droits de rôle en
droits individuels.

## Pages actives et contrôles attendus

| Route active ou de support                           | Contrôle principal                                                                                                                                         |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`                                             | publique ; le parcours d'authentification impose la MFA                                                                                                    |
| `/`                                                  | `dashboard:view`, toujours actif ; chaque donnée administrative du tableau de bord conserve ensuite son propre contrôle                                    |
| `/mes-notifications`                                 | `notifications:view`, limité aux notifications du compte connecté                                                                                          |
| `/mon-compte`                                        | droits `account:*`, toujours limités au compte connecté                                                                                                    |
| `/feuille-de-route`                                  | authentification ; catalogue informatif des pages planifiées, sans attribution de droits                                                                   |
| `/recherche`                                         | authentification ; chaque résultat est filtré selon la destination réellement autorisée                                                                    |
| `/vie-interne/repertoire`                            | `persons:view` pour consulter et rechercher le répertoire                                                                                                  |
| `/vie-interne/repertoire/nouveau`                    | `persons:create`, donc aussi `persons:view`                                                                                                                |
| `/vie-interne/repertoire/[id]`                       | `persons:view` pour la fiche ; les mutations exigent `persons:update` ou `persons:delete`                                                                  |
| `/tableau-de-bord`                                   | alias de support redirigeant vers `/` ; aucune permission supplémentaire                                                                                   |
| `/tableau-de-bord/mes-notifications`                 | ancien alias redirigeant vers `/mes-notifications`                                                                                                         |
| `/systeme`                                           | au moins `users:view`, `settings:view` ou `audit:view` pour un compte non protégé                                                                          |
| `/administration`                                    | route de support redirigeant vers les utilisateurs                                                                                                         |
| `/administration/utilisateurs`                       | `users:view`                                                                                                                                               |
| `/administration/utilisateurs/nouveau`               | `users:create`, donc aussi `users:view`                                                                                                                    |
| `/administration/utilisateurs/[id]?section=profile`  | lecture de fiche, contact, profil et identifiant via les clés `users:*` correspondantes                                                                    |
| `/administration/utilisateurs/[id]?section=security` | sécurité, statut, sessions, mot de passe et suppression définitive via les clés `users:*` correspondantes                                                  |
| `/administration/utilisateurs/[id]?section=access`   | `users:view_access` pour lire ; `users:grant_access` pour accorder ; `users:revoke_access` pour retirer ; `users:delegate_access` pour déléguer la gestion |
| `/administration/utilisateurs/[id]?section=account`  | `users:view_account_policy` pour lire ; `users:update_account_policy` pour modifier                                                                        |
| `/administration/utilisateurs/[id]?section=history`  | `users:view_activity` ; `users:export_activity` pour le CSV                                                                                                |
| `/systeme/parametres`                                | `settings:view` pour lire ; `settings:update` pour modifier ; droits exclusivement liés au rôle ADMIN                                                      |
| `/systeme/journal-activite`                          | `audit:view` pour le journal détaillé ; `audit:export` reste nécessaire pour une extraction                                                                |
| pages d'erreur et page introuvable                   | support technique, sans capacité métier accordée                                                                                                           |

Les routes génériques présentes pour les pôles Vie interne, Bureau & juridique,
Trésorerie, Système futur et Sport restent des pages planifiées. Leur existence
dans le routeur ou dans la feuille de route ne les rend ni actives ni
attribuables. La liste exhaustive et leur statut produit sont maintenus dans
`features/pages/MATRICE_PREPARATION.md`.

## Calcul des droits et dépendances

Pour un compte non protégé, le calcul suit cet ordre :

1. partir du preset USER ou ADMIN ;
2. convertir temporairement les alias legacy vers leurs cibles canoniques ;
3. ne conserver et appliquer que les surcharges individuelles configurables ;
4. forcer les clés `alwaysEnabled` à `true` ;
5. résoudre récursivement toutes les dépendances et refuser toute clé inconnue
   ou seulement planifiée.

Une surcharge stockée est volontairement parcimonieuse. `true` signifie un
ajout par rapport au rôle et `false` un retrait. L'absence de clé signifie
« suivre le rôle ». `normalizePermissionOverrides` retire les clés inconnues,
les droits de socle et les API non configurables individuellement. Une valeur
affichée comme accordée mais privée de sa dépendance n'est pas effective.

Lors d'une attribution, un administrateur non protégé ne peut pas accorder une
permission qu'il ne possède pas lui-même, ne peut pas modifier ses propres
permissions et ne peut pas administrer un autre ADMIN. Accorder un droit exige
`users:grant_access` ; le retirer exige `users:revoke_access`. Modifier les
droits d'attribution ou de retrait d'un autre compte exige en plus
`users:delegate_access`. Seul le compte racine peut attribuer ou retirer ce
dernier droit. Les créations ou modifications d'ADMIN et tous les changements
de rôle restent réservés au compte racine.

## Risques, MFA et step-up

Le champ `risk` classe l'impact ; il ne remplace jamais un contrôle serveur.

- `default` : lecture ou action personnelle ordinaire ;
- `sensitive` : donnée personnelle, sécurité ou mutation administrative à
  portée limitée ;
- `critical` : changement d'identité ou d'autorisation, révocation, export,
  suppression irréversible ou mutation globale.

La plateforme exige une MFA configurée pour tous les comptes. En plus de ce
socle, le backend refuse l'attribution d'un rôle ADMIN ou de toute permission
administrative critique tant que la cible ne possède pas une MFA complète
(`mfaEnabledAt` et secret TOTP présents).

Les actions marquées « Step-up » exigent une preuve récente associant mot de
passe et MFA. La preuve MFA renforcée est valable cinq minutes et la preuve du
mot de passe trente minutes. Elles sont vérifiées par la route de mutation ou
d'export, y compris pour le compte racine ; passé ces délais,
`/api/auth/step-up` doit être utilisé.

La suppression définitive d'un utilisateur suit le compromis UX retenu : elle
exige seulement une preuve de mot de passe récente. Le mot de passe saisi à la
connexion compte pendant trente minutes ; ensuite, seul le mot de passe est
redemandé, sans nouveau code MFA. La cible devait déjà avoir été désactivée par
une mutation distincte et toutes les opérations restent auditées.

Cas supplémentaires : la création d'un compte ADMIN est réservée au compte
racine et exige aussi un step-up. Le compte racine protégé ne peut être
supprimé, désactivé ou rétrogradé, et ses accès ne sont jamais gérés
manuellement.

Pour toute nouvelle permission critique :

1. définir ses dépendances de lecture ;
2. décider si son attribution exige la MFA de la cible ;
3. définir explicitement la confirmation d'usage adaptée au risque : mot de
   passe récent ou step-up mot de passe + MFA ;
4. auditer succès et refus pertinents sans exposer de secret ;
5. tester le refus sans permission, sans dépendance, sans MFA et sans preuve
   récente.

## Capacités planifiées

Les identifiants suivants sont réservés dans `ROADMAP_PERMISSIONS`, mais ne sont
pas des permissions effectives :

- Dashboard : `dashboard:manage_widgets` ;
- tâches : `tasks:view`, `tasks:create`, `tasks:update`, `tasks:assign`,
  `tasks:delete` ;
- notifications : `notifications:manage` ;
- vie interne : `internal:view`, `meetings:view`, `meetings:update` ;
- documents et juridique : `documents:view`, `documents:create`,
  `documents:update`, `documents:approve`, `documents:archive`, `legal:view`,
  `contracts:view`, `contracts:update`, `incidents:view`, `incidents:update` ;
- trésorerie : `treasury:view`, `treasury:edit`, `treasury:validate`,
  `treasury:export`, `treasury:audit`, `treasury:archives` ;
- système futur : `system:validate`, `system:archives`, `system:automation`,
  `backups:view` ;
- sport : `sport:view`, `sport:update`, `sport:public_sync`.

Elles ne doivent jamais apparaître dans un JSON `User.permissions`, un preset de
rôle, `PERMISSION_CATEGORIES` ou une politique serveur avant leur activation.
`hasPermission` les refuse et la normalisation les supprime.

La future capacité de sauvegarde utilise déjà le nom réservé `backups:view`
afin de ne jamais entrer en collision avec l'alias historique
`system:exports`, qui signifie temporairement `audit:export`.

## Cycle de vie planned vers active

Une capacité passe par les étapes suivantes dans un même flux de livraison :

1. **Planned** : route générique éventuelle, fiche fonctionnelle et identifiant
   dans `ROADMAP_PERMISSIONS`. Aucun effet d'autorisation.
2. **Politique conçue** : ressource, action, portée, propriétaire des données,
   dépendances, risque, preset de rôle, MFA, step-up et audit sont décidés.
3. **Implémentation complète** : service métier, garde serveur, UI, états
   chargement/vide/erreur/refus, journalisation et tests existent.
4. **Activation atomique** : déplacer la clé vers `PERMISSIONS`, ajouter son
   `PermissionItem`, décider `grantable`, intégrer le preset voulu et passer la
   fonctionnalité/navigation à `live` dans le même changement.
5. **Dépréciation éventuelle** : empêcher les nouvelles attributions, migrer
   les données et consommateurs, conserver temporairement un alias de lecture,
   puis retirer la clé après vérification qu'elle n'est plus stockée.

Le compte racine peut consulter le catalogue planifié, mais son bypass ne rend
pas une capacité planifiée opérationnelle : sans politique et module actifs,
il n'existe rien à autoriser.

## Convention de nommage

- Format ASCII en minuscules : `<ressource>:<verbe>` ou
  `<ressource>:<verbe>_<objet>`.
- Un seul `:` sépare la ressource stable de l'action ; les mots composés
  utilisent `_`.
- Utiliser le vocabulaire d'action commun : `view`, `create`, `update`,
  `approve`, `archive`, `assign`, `delegate`, `delete`, `export`, `grant`,
  `manage`, `reset`, `restore`, `revoke`, `send`, `sync`, `validate`.
- Préférer une action précise à `manage`. Ce dernier convient seulement à un
  ensemble cohérent impossible à séparer utilement, comme la MFA personnelle.
- Séparer lecture, modification, export et données sensibles. Une permission
  `update` n'implique pas silencieusement `view` : déclarer la dépendance.
- Nommer selon la capacité métier, jamais selon le libellé français, l'URL, le
  pôle, le rôle (`admin`) ou une technologie.
- Ne pas stocker de joker comme `users:*` et ne jamais réutiliser une ancienne
  clé avec une nouvelle sémantique.
- Un changement de libellé ou de route ne renomme pas la clé. Un changement de
  sens exige une nouvelle clé et une migration explicite.

Exemples cohérents : `audit:view_field_history`, `users:grant_access`,
`users:revoke_sessions`, `account:change_password`. Exemple à éviter :
`system:manage_everything`, qui mélangerait plusieurs ressources, risques et
responsabilités.

## Migration des clés legacy

La compatibilité est prévue pour une seule version : les anciennes clés sont
lues, mais toute nouvelle écriture doit utiliser les clés canoniques.

| Clé legacy                    | Clé(s) canonique(s)                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `system:audit`                | `audit:view`                                                                                        |
| `system:exports`              | `audit:export`                                                                                      |
| `system:settings`             | aucune surcharge conservée : `settings:view` et `settings:update` sont désormais liés au rôle ADMIN |
| `users:update_access`         | `users:grant_access`, `users:revoke_access`, `users:delegate_access`                                |
| `users:edit_permissions`      | `users:grant_access`, `users:revoke_access`, `users:delegate_access`                                |
| `users:export`                | `users:export_activity`                                                                             |
| `users:manage_account_policy` | `users:update_account_policy`                                                                       |
| `users:manage_status`         | `users:update_status`                                                                               |

Règles de résolution :

- une valeur canonique explicite gagne si l'ancien et le nouveau nom sont
  présents ;
- si les deux anciens noms de gestion des accès coexistent,
  `users:update_access` gagne sur `users:edit_permissions` ;
- un alias à plusieurs cibles propose sa valeur à chaque cible absente avant le
  filtrage des droits configurables individuellement ;
- seules les cibles actives et configurables individuellement survivent à la
  normalisation ;
- les clés totalement inconnues sont remontées par
  `getUnknownPermissionKeys`, jamais rendues effectives.

Plan de retrait : inventorier les JSON existants, convertir les alias en clés
canoniques, enregistrer uniquement des surcharges différentielles, vérifier
qu'aucune ligne et aucun client n'émet encore l'ancien format, puis supprimer
les alias et leurs tests de compatibilité. Les anciens droits globaux
`users:update_access` et `users:edit_permissions` sont convertis vers les trois
capacités afin de conserver leur valeur effective ; toutes les nouvelles
écritures doivent employer les clés séparées. Les clés `users:archive` et
`users:delete` sont désormais historiques uniquement : elles restent lisibles
dans les anciens journaux, mais sont inconnues pour toute décision
d'autorisation et ne sont jamais converties en `users:delete_account`. Lors de
la migration, seul un refus explicite d'archivage porté par un ADMIN est
conservé comme refus du nouveau droit, afin de ne pas élargir son preset. Les
anciennes surcharges `system:settings` doivent être supprimées : les deux
capacités de paramètres sont désormais exclusivement fournies par le preset
ADMIN.

Les clés `audit:view_sensitive`, `system:audit_sensitive`, `members:view` et
`members:update` sont également historiques uniquement. Elles restent dans
l'allowlist de rendu des événements immuables, mais sont inconnues de
`hasPermission`, non attribuables et supprimées de toute surcharge normalisée.
`audit:view` porte désormais l'accès détaillé au journal ; aucune ancienne clé
ne peut le conférer. Durant le déploiement A, leurs valeurs brutes sont
néanmoins conservées à l'écriture pour les anciennes instances en cours de
drainage. Leur suppression physique est une phase B explicite, documentée dans
`OPERATIONS.md`, jamais une migration automatique du lot Répertoire.

## Checklist d'ajout ou de revue

- La page ou l'API est-elle réellement active ?
- La clé est-elle métier, stable et suffisamment fine ?
- Lecture, écriture, export et données sensibles sont-ils séparés ?
- Les dépendances sont-elles déclarées et testées ?
- Le preset USER/ADMIN suit-il le moindre privilège ?
- `grantable`, `alwaysEnabled`, `risk`, MFA cible et step-up sont-ils justifiés ?
- La navigation et l'UI reflètent-elles le garde serveur sans le remplacer ?
- Les mutations critiques sont-elles transactionnelles et auditées ?
- Les surcharges inconnues, non configurables et planifiées sont-elles rejetées ?
- La documentation, la migration éventuelle et les tests sont-ils livrés dans
  le même changement que l'activation ?
