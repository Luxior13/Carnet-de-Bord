# Paramètres — intégration réelle

Revue commencée le 11 octobre 2026 ; **11/11 scénarios réussis le 12 octobre**,
Europe/Paris. [Résultats](resultats.json) · [Banc exécutable](run.cjs).

Next **15.5.23**, build de production sur `127.0.0.1:3120`, PostgreSQL **17**
sur `127.0.0.1:54597`, Prisma **6.19.3**, Chromium **149.0.7827.55**, Node
**24.14.0**, Bun **1.4.2**. Base jetable `settings_audit_test`, **52 migrations
existantes appliquées** et compte fictif fourni par `e2e:setup`.

## Scénarios et observations

1. Connexion et MFA réelles ; réglage absent = défaut 1095/version 0. PUT sans
   changement : aucune ligne créée, aucun audit ajouté. `01095` n'est pas sale.
2. Lecture et édition à 320, 390, 640, 768, 1024, 1440 et 1920 px ; aucun
   débordement du document. Bornes, boutons −/+, flèches et retour de focus.
3. Augmentation par Entrée : valeur/version/audit persistés, ancien audit encore
   présent. Enregistrer ne purge pas.
4. Modification dans un deuxième onglet : refus 409 dans le premier, brouillon
   conservé, reprise explicite et enregistrement avec la version relue.
5. Actualisation d'un brouillon : annuler conserve la saisie ; abandon volontaire
   recharge la valeur persistée.
6. Réduction : annulation locale, refus serveur sans preuve récente, mot de
   passe erroné puis correct ; focus sur le champ réactivé et écriture réelle.
7. PUT réellement validé puis réponse interrompue : enregistrement bloqué jusqu'à
   la lecture volontaire ; une seule écriture, sans renvoi automatique.
8. JSON invalide injecté dans la fixture : état bloqué explicite et défaut
   proposé ; réparation 1095 impossible sans preuve récente, puis confirmée et
   persistée avec version incrémentée et marqueur d'invalidité retiré.
9. Vraie commande Bun de maintenance : événement de 1600 jours supprimé, événement
   de 100 jours et audit de réglage conservés ; session active encore utilisable.
10. Compte ADMIN réellement connecté puis rétrogradé dans la fixture : actualiser
    retire valeurs et éditeur ; GET/PUT refusés, page refusée après rechargement.
11. GET anonyme 401, ancienne clé `ui.defaultPageSize` refusée 404, CSRF erroné 403.

Captures : [lecture bureau](lecture-1440.png), [édition bureau](edition-1440.png),
[lecture mobile](lecture-390.png), [édition mobile](edition-390.png). Lecture
bureau et édition mobile inspectées visuellement. Le compte affiché est fictif.

## Défaut de maintenance reproduit

Avant correction, le scénario 9 échouait et la commande exécutée séparément
confirmait `P2010`, SQLSTATE `42883` :

```text
ERROR: function public.purge_expired_audit_logs(bigint) does not exist
```

Prisma transmet le nombre paramétré comme `bigint`, alors que la procédure
existante attend un `integer`. L'appel de `scripts/run-maintenance.ts` utilise
maintenant `${auditRetentionDays}::integer`. Le banc complet a ensuite été
rejoué : commande terminée avec code 0 et suppressions/conservations vérifiées
en base. Aucune surcharge de fonction ni migration n'a été ajoutée.

## Reproduction et isolation

Le banc attend un serveur déjà construit et démarré, un cluster isolé migré,
et le compte `e2e-only-superadmin` créé par `apps/web/scripts/e2e-setup.mjs`.
Il ne lit jamais le `.env` habituel. Le JSON privé indiqué par `AUDIT_ENV_FILE`
contient `E2E_DATABASE_URL`, `E2E_SUPERADMIN_LOGIN_NAME`,
`E2E_SUPERADMIN_PASSWORD`, `WEB_URL`, `NEXT_PUBLIC_WEB_URL`,
`MFA_ENCRYPTION_KEY_V1`, `AUDIT_ENCRYPTION_KEY_V1` et
`AUDIT_ENCRYPTION_CURRENT_VERSION`. Générer des secrets propres à ce cluster ;
aucun secret ni JSON privé n'est archivé ici. Le serveur doit utiliser ces mêmes
variables et `DATABASE_URL=E2E_DATABASE_URL`.

Lancer depuis la racine, avec `AUDIT_ENV_FILE` déjà défini :

```powershell
node docs/audits/parametres-complet-2026-10-11/banc-integration/run.cjs
```

Garde du banc : base nommée exactement `settings_audit_test`, hôte `127.0.0.1`,
port PostgreSQL différent de 5432, serveur local port 3120. La clé de réglage
est réinitialisée au début ; les anciens audits ne sont supprimés que par la
maintenance normale. Cette commande est donc réservée à la base jetable.
Les secrets TOTP temporaires restent à côté du JSON privé jusqu'à destruction
du cluster ; ils permettent une répétition sans réenrôlement artificiel.

## Limites

Sessions, cookies, CSRF, preuves, handlers, transactions et maintenance sont
réels. La perte de réponse est injectée après `route.fetch()` ; l'invalidité SQL,
l'expiration de la preuve et la rétrogradation ADMIN sont des mutations de
fixtures ciblées. Le banc n'établit pas une panne réseau naturelle, l'expiration
temporelle d'une session ni le parcours administratif de rétrogradation.

Le navigateur ferme ses contextes dans un `finally`. Il ne démarre ni n'arrête
le serveur Next ou PostgreSQL ; leur cycle de vie et leur nettoyage appartiennent
à l'opérateur du banc. Aucun test de charge, ordonnanceur, restauration,
lecteur d'écran, Safari ou extension d'autocomplétion exécuté ici.

Après cette passe, les processus dédiés ont été arrêtés et le dossier temporaire
vérifié puis supprimé, avec les bases jetables et les secrets d'essai. Une
réexécution demande donc un nouvel environnement isolé.
