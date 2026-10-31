# Q15 — Audit et historique métier

[Référence générale](../REFERENCE_GENERALE.md) · Questions de sélection : Faut-il pouvoir expliquer qui a fait quoi, quand, sur quel objet et avec quel résultat ?

## Règle : toute action est lisible dans le journal d’activité

**Décision du propriétaire du 31 octobre 2026, jugée très importante.** Chaque
page, section, API ou tâche qui crée, modifie ou supprime une donnée, ou qui
touche à l’authentification d’un compte, doit être **prête pour le
[journal d’activité](../pages/systeme/journal-activite.md)** dès sa livraison :
l’action y apparaît, lisible en français, rattachée à son auteur et à son objet.
Une fonctionnalité qui écrit sans trace lisible n’est pas terminée.

Restent hors journal les écritures purement techniques sans décision humaine :
compteurs de limitation de débit, prolongation de session, mesures de
performance, caches. Une simple consultation n’est tracée que si sa politique
l’exige (le journal lui-même trace sa lecture).

Liste de contrôle pour toute nouvelle mutation :

1. **Trace dans la même transaction** que la mutation, obligatoire
   (`createAuditLog` / `createAuditLogWithHeaders`, `required: true` hors
   transaction) : pas de mutation réussie sans trace, pas de trace sans mutation.
   Un refus ou un échec de sécurité s’enregistre aussi (`outcome` échec).
2. **Action** : réutiliser une valeur de `AuditAction` existante si elle décrit
   bien le fait. Sinon, l’ajouter partout dans le même lot : enum Prisma et
   migration, `packages/shared` (`platform.contracts.ts`), flux et gravité dans
   `shared/server/audit-event.ts`, libellé français dans
   `features/audit/server/audit-journal.labels.ts` (le `Record<AuditAction, …>`
   refuse la compilation sans libellé).
3. **Rangement** : vérifier que la `category` et le `stream` font tomber
   l’événement dans le bon filtre « Type » (`TYPE_FILTERS` du service du
   journal) ; un nouveau domaine (partenaires, équipes…) ajoute son filtre et
   son libellé dans `audit-journal.types.ts`.
4. **Objet** : renseigner `targetUserId` pour un compte, `entityType` +
   `entityId` pour un dossier métier, et la localisation de la page
   (`pageKey`, `tabKey`…). C’est ce qui alimente « Ouvrir la fiche », le filtre
   par compte ou par fiche et le bouton « Historique ».
5. **Changements** : chaque champ modifiable a un libellé dans la liste fermée
   du journal (`PERSON_FIELD_LABELS`, `USER_FIELD_LABELS` ou équivalent du
   module). Un champ absent de la liste n’est pas affiché. Les valeurs
   sensibles sont chiffrées ou masquées, et leur lecture suit les droits du
   lecteur ; jamais de secret, mot de passe, jeton ou code.
6. **Faits utiles** (motif d’échec, nombre de sessions, paramètre…) : passés
   par la projection du journal en liste fermée ; les métadonnées brutes ne
   quittent jamais le serveur.
7. **Preuves** : un test de route vérifie la trace écrite ; si le journal
   change (libellé, filtre, champ), compléter `audit-journal.test.ts` et, pour
   un nouveau domaine, la suite `audit-journal-postgres`.
8. **Fiche de la page** : rubrique « Traces dans le journal » listant les
   actions écrites (modèle de [fiche de page](../methode/modeles/suivi-page.md)).
9. **Mot de passe ou code redemandé** : passer par le limiteur
   (`reserveSensitiveActionRateLimit`, `reserveLoginRateLimits`,
   `reserveMfaRateLimits` de `shared/server/rate-limiter.ts`) avec son
   `BlockedAttemptReport`, exigé par la signature : le blocage écrit alors seul
   « Tentatives bloquées ». Une nouvelle étape s’ajoute à la liste fermée du
   limiteur et à `BLOCKED_ATTEMPT_STEPS` du journal.

### État au 31 octobre 2026

Relevé du code (routes `app/api` et services `features/*/server`) :

| Page ou module | Actions tracées |
| --- | --- |
| Connexion et déconnexion | `LOGIN_SUCCESS`, `LOGIN_FAILED` (motif), `LOGOUT`, `MFA_RECOVERY_CODE_USED` |
| Tout mot de passe ou code refusé par le limiteur | `ATTEMPTS_BLOCKED` « Tentatives bloquées » (étape, preuve, durée), une fois par blocage |
| Confirmation d’identité avant une action sensible | `STEP_UP_SUCCESS`, `STEP_UP_FAILED` |
| Mon compte | `USER_UPDATE` (profil, email de contact), `PASSWORD_CHANGE`, `MFA_ENABLED`, `MFA_RECOVERY_CODES_REGENERATED`, `SESSION_INVALIDATE` |
| Utilisateurs et fiche utilisateur | `USER_CREATE`, `USER_UPDATE`, `USER_ACTIVATE` / `USER_DEACTIVATE`, `PERMISSION_UPDATE`, `PASSWORD_RESET`, `MFA_RESET`, `SESSION_INVALIDATE`, `USER_DELETE` |
| Répertoire et fiche personne | `PERSON_CREATE`, `PERSON_UPDATE` (identité, rattachement, emails, téléphones, réseaux), `PERSON_DELETE` |
| Paramètres | `SYSTEM_SETTING_UPDATE` |
| Journal d’activité | `AUDIT_VIEW` |
| Accueil, feuille de route | Lecture seule, rien à tracer |

Toutes les mutations livrées écrivent leur trace. Points relevés :

- **Tentatives refusées par la limitation de débit** : **corrigé le 31 octobre
  2026** (« ok go » du propriétaire). Elles ne laissaient aucune trace ; chaque
  blocage écrit désormais une seule `ATTEMPTS_BLOCKED` (migration
  `20261031120000_audit_attempts_blocked`). La connexion (mot de passe et
  code), l’activation de la double authentification et les sept vérifications
  d’un compte connecté (confirmation d’identité, mot de passe, email de
  contact, gestion et réinitialisation de la double authentification) sont
  couvertes. Le premier refus de chaque compteur bloqué réserve un compteur de
  signalement d’une place, valable jusqu’au déblocage : les refus parallèles
  ne l’écrivent qu’une fois, un nouveau blocage est signalé de nouveau.
  Écriture sans effet sur la réponse : un échec de trace ne change pas le 429.
  `ACCOUNT_LOCKED` n’est pas réutilisé : aucun compte n’est verrouillé (REV-01).
- **Actions réservées sans producteur** : `ACCOUNT_LOCKED` (aucun compte n’est
  verrouillé, seule la limitation de débit freine), `MFA_DISABLED` (pas de
  désactivation volontaire, seule la réinitialisation par un administrateur),
  `AUDIT_EXPORT`, `NOTIFICATION_SEND`, `INTERNAL_ANNOUNCEMENT_*`,
  `BACKGROUND_JOB_UPDATE` et `PARTNER_*` : modules planifiés. Leur libellé
  existe déjà. Les points 3 à 8 de la liste ci-dessus s’appliquent à leur
  livraison.

## Questions

- Quel fait doit être explicable après coup, et pour quel public autorisé ?
- Faut-il un journal de sécurité, un historique métier lisible, une version de document ou plusieurs traces distinctes ?
- Qui agit réellement : compte, délégataire, automatisation ou tiers ? Sur quelle ressource et dans quel contexte ?
- Quelles anciennes/nouvelles valeurs sont utiles, et lesquelles ne doivent jamais être enregistrées ?
- L’événement représente-t-il une tentative, une réussite, un refus ou une correction ?
- Une mutation peut-elle réussir sans sa trace obligatoire, ou créer une trace sans mutation ?
- Les événements sont-ils append-only selon la politique du projet, avec une voie de purge définie ?
- Qui peut lire les métadonnées et les anciennes valeurs sensibles ?
- Une suppression conserve-t-elle la compréhension de l’événement sans conserver des données personnelles inutiles ?
- Les anciennes actions/enums restent-elles interprétables après retrait du module qui les produisait ?
- Les libellés restent-ils intelligibles quand un nom, rôle, entité ou règle change ?
- La conservation, le chiffrement et la rotation des clés couvrent-ils les anciennes valeurs et sauvegardes ?

## Vérifier

Mutation et trace cohérentes, absence de secret dans la charge utile, lecture
autorisée/refusée, objet supprimé, événement historique et purge contrôlée.
Un log technique de console n’est pas un historique métier fiable.

L’exclusion des secrets et la protection des journaux font partie des principes
décrits par [OWASP Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).

## Trace attendue

Catalogue des faits, métadonnées minimales, lecteurs, atomicité, conservation et
comportement des références devenues absentes.

## Non-applicabilité et réexamen

Un simple affichage ou changement de filtre n’exige pas automatiquement un événement
d’audit. Reconsidérer pour les lectures sensibles si la politique du dossier l’exige.

## Références

[Exploitation et purge](../exploitation/operations.md) ·
[Confidentialité](confidentialite.md) · [Architecture](architecture-fonctionnalite.md).
