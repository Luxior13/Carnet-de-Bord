# Accueil — intégration réelle du 12 octobre 2026

**8/8 parcours réussis** dans Chromium 149.0.7827.55, sur le build Next
15.5.23 avec PostgreSQL 17. Le [runner](run.cjs) et les
[résultats finaux](resultats.json) portent les scénarios réellement exécutés.
Point de départ : `282066c`, modifications de cet audit présentes au build final.

## Environnement et données

Cluster temporaire sur `127.0.0.1:54600`, base `home_audit_test`, 52 migrations
appliquées et compte fictif protégé créé par `apps/web/scripts/e2e-setup.mjs`.
Next écoute sur `127.0.0.1:3123`. Le mot de passe et les clés de chiffrement
sont aléatoires et réservés au banc. Le bootstrap, les TOTP, les cookies, le
middleware, le contexte utilisateur, les mutations de profil, l'audit et les
sessions utilisent leur véritable implémentation. Les mots de passe des
fixtures utilisent le hachage bcrypt au coût 12 du setup existant.

La configuration vit uniquement dans un fichier privé temporaire pointé par
`AUDIT_ENV_FILE`. Il contient `E2E_DATABASE_URL`, `E2E_SUPERADMIN_LOGIN_NAME`,
`E2E_SUPERADMIN_PASSWORD`, `WEB_URL`, `NEXT_PUBLIC_WEB_URL`,
`MFA_ENCRYPTION_KEY_V1`, `AUDIT_ENCRYPTION_KEY_V1` et
`AUDIT_ENCRYPTION_CURRENT_VERSION`. Le runner vérifie la cible locale, le nom
de base et les deux ports ; il ne retombe jamais sur `DATABASE_URL` ou `.env`.

Une seconde fixture USER sans droits métier est créée dans cette base.
Les mutations et la suppression de sessions concernent exclusivement ces
comptes fictifs. Aucune base habituelle ni identité existante n'est utilisée.

## Défauts reproduits avant correction

- [ACC-03](avant.json) : après le bootstrap, accueil → Mon compte → prénom
  modifié → retour navigateur gardait l'ancienne salutation. Un rechargement
  affichait le nouveau prénom. La preuve utilise le build de la passe Connexion
  précédente, correspondant aux sources d'accueil de `282066c`.
- [ACC-06](version-profil-avant.json) : après une connexion TOTP ordinaire,
  `user.updatedAt` renvoyé par la MFA différait de celui de `GET /api/auth/me`.
  Le premier PATCH de profil, déclenché depuis le formulaire réel, répondait
  **409** sans modification concurrente. Ce second défaut a été découvert en
  rejouant le parcours d'accueil après la première correction.

Ces fichiers ne contiennent que les résultats, sans identités, versions
précises, cookies ni secrets. La reproduction d'ACC-06 ne remplace pas la
preuve finale ci-dessous : aucune relecture du contexte, actualisation ou
acceptation automatique de conflit n'est ajoutée pour faire passer le test.
Un GET auxiliaire compare les versions sans modifier l'état React.

## Parcours après correction

1. **Connexion MFA normale et modification immédiate** : le runner impose
   une connexion TOTP ordinaire après bootstrap si nécessaire, compare les
   versions reçues, enregistre le prénom une seule fois avec HTTP 200,
   revient par l'historique puis recharge. La salutation reste correcte.
2. **Cadre complet et clavier** : un seul `main` et `h1`, lien Mon compte,
   activation par Entrée et retour à l'accueil. Sept largeurs : 320, 360,
   390, 768, 1 024, 1 440 et 1 920 px, sans débordement du document/bandeau.
3. **Prénom long réel** : 50 caractères sans espaces enregistrés via Mon compte,
   salutation immédiate et lisible à 320 px. Le nom fictif normal est ensuite
   rétabli par le même formulaire.
4. **Utilisateur limité** : accueil et Mon compte accessibles ; API utilisateurs
   refusée avec 403. Retour navigateur cohérent.
5. **Retrait de la synthèse** : aucun appel `/api/dashboard` lors du rechargement
   de l'accueil ; l'ancienne API répond 404 au compte authentifié et ne livre
   plus de synthèse.
6. **Accès anonyme et cookie forgé** : redirection 307 vers `/login?next=%2F`,
   sans salutation privée dans le corps reçu, même avec les en-têtes de
   routage forgés.
7. **Alias historique** : `/tableau-de-bord` mène à `/` et à la bonne salutation.
8. **Session révoquée** : après suppression des sessions de la fixture, le
   rechargement privé revient à la connexion, sans prénom privé à l'écran.

Aucune erreur JavaScript observée. Les captures
[320 px, cas long](accueil-320.png) et [1 440 px](accueil-1440.png) ont été
inspectées. Elles montrent des noms fictifs ; les toasts sont les résultats
réels des modifications du profil. Aucun écran MFA, QR ou code de secours
n'est capturé.

## Reproduction et limites

Créer un cluster dédié à ces adresses et un fichier privé contenant les valeurs
temporaires ci-dessus. Injecter la configuration dans le processus de setup,
retirer `DATABASE_URL`, puis lancer `bun scripts/e2e-setup.mjs` depuis
`apps/web`. Construire et lancer Next avec `DATABASE_URL` explicitement fixé à
la valeur locale de `E2E_DATABASE_URL`, les URL locales et les mêmes clés.
Depuis la racine, une fois le serveur prêt :

```powershell
node docs/audits/accueil-2026-10-12/banc-integration/run.cjs
```

`AUDIT_BASELINE=1` est réservé au build avant correction et à une fixture
fraîche pour reproduire ACC-03. `AUDIT_AUTH_VERSION=1` est réservé au build
avant correction de la version MFA pour reproduire ACC-06. Retirer ces deux
variables pour le contrôle final. Les étapes MFA restent réelles ; le runner
attend le créneau TOTP suivant lorsqu'un code vient d'être consommé.

Le secret TOTP de chaque fixture est écrit dans le répertoire privé temporaire
afin de permettre les connexions suivantes ; il n'est pas archivé. Les erreurs
sont expurgées. Pas de trace réseau, vidéo ou copie de HTML sensible conservée.
Les navigateurs ont été fermés par le runner ; serveur et cluster ont été
arrêtés après les contrôles finaux. Base temporaire, fichier privé, secrets
TOTP et journaux ont été supprimés après vérification de leur emplacement.

La préparation Windows du cluster a été reprise après une attente incorrecte
du processus de lancement ; aucune de ces tentatives n'est une preuve produit.
Le refus 409 observé ensuite est, lui, un défaut applicatif reproduit et corrigé.

HTTP loopback sur Windows, sans proxy/TLS de déploiement, lecteur d'écran,
appareil physique, test de charge ou diffusion instantanée entre appareils.
Le [banc client](../banc-client/README.md) complète les variations de contexte
et de texte avec ses simulations explicites. Le
[rapport](../../2026-10-12-accueil.md) distingue ces preuves et les tests
de régression des routes et du service de session.
