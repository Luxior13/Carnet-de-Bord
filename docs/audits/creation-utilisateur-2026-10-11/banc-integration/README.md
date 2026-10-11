# Création — intégration Next, PostgreSQL et navigateur

Passe du **11 octobre 2026** : [neuf scénarios réussis](resultats.json),
Chromium 149.0.7827.55 avec Next 15.5.23 en production et PostgreSQL 17 jetable.
Le [script](run.cjs) contient les assertions. La capture du
[formulaire vide à 1 440 px](form-1440.png) ne contient aucun secret.

## Ce qui est réellement exercé

- Connexion du compte protégé avec mot de passe, inscription MFA et TOTP réels.
  Formulaire à 320, 390, 640, 768, 1 024, 1 440 et 1 920 px, sans débordement
  du document ni de la zone principale ; retour filtré conservé.
- Email invalide arrêté avant le POST, focus du champ ; création USER réelle,
  nom vide, email normalisé, secret affiché vérifié contre le vrai hash,
  une réservation et un audit, sans secret dans cet audit.
- Presse-papiers réel, conservation explicitement cochée, annulation du reset
  avec retour du focus. Absence du secret dans localStorage/sessionStorage.
- Première connexion du compte créé avec son mot de passe temporaire,
  inscription MFA, changement imposé du mot de passe puis nouvelle connexion
  avec le mot de passe choisi et TOTP. Vérification du hash et de la suppression
  du drapeau `mustChangePassword` ; l'ancien secret ne correspond plus au hash.
- Doublon avec saisie conservée et champ focalisé ; refus d'un champ injecté
  `isProtected` et refus d'une requête sans jeton CSRF.
- Création ADMIN : seules les dates de preuve de la session fictive sont
  invalidées en base pour provoquer le défi. Annulation avec saisie/focus
  conservés, puis véritable mot de passe et nouveau code TOTP.
- Réponse coupée par Playwright **après un vrai POST réussi**. La reprise GET
  exacte retrouve le compte sans secret ; un seul POST, compte et audit.
- Créateur USER délégué connecté/MFA : ADMIN absent du formulaire, création
  USER autorisée, ADMIN refusée côté serveur. Retrait du droit dans la seule
  base d'essai puis refus de création avec la même session.
- URL de retour externe ramenée à la liste interne.

Les appels API authentifiés passent par `fetch` dans la page. Chromium accepte
les cookies Secure sur l'adresse de boucle locale HTTP ; le client HTTP séparé
de Playwright ne les transmet pas dans cette configuration.

## Reproduction

Les dépendances et Chromium doivent être installés. Préparer un cluster local
jetable sur le port 54594 et la base `creation_audit_test`. Un fichier JSON
**temporaire hors des preuves** contient ces clés :

- `E2E_DATABASE_URL` : URL de cette base locale, jamais celle de développement ;
- `E2E_SUPERADMIN_LOGIN_NAME` : identifiant valide préfixé `e2e-` ;
- `E2E_SUPERADMIN_PASSWORD` : secret fictif aléatoire d'au moins 12 caractères ;
- `WEB_URL` et `NEXT_PUBLIC_WEB_URL` : `http://127.0.0.1:3117` ;
- `MFA_ENCRYPTION_KEY_V1` et `AUDIT_ENCRYPTION_KEY_V1` : clés fictives générées,
  32 octets encodés en base64 ;
- `AUDIT_ENCRYPTION_CURRENT_VERSION` : `1`.

Charger ces variables dans le processus de préparation et exécuter
`bun apps/web/scripts/e2e-setup.mjs`. Ce script applique les 52 migrations et
prépare le seul compte protégé de test. Son garde exige que `DATABASE_URL`,
si définie lors du setup, désigne une cible différente : utiliser une autre URL
locale fictive, sans accès à la base habituelle.

Pour le build et le serveur local seulement, définir `DATABASE_URL` à la valeur
de `E2E_DATABASE_URL`, puis `bun run --filter web build` et lancer Next dans
`apps/web` sur `127.0.0.1:3117`. Le script refuse une autre base ou un autre
port HTTP. Depuis la racine, `AUDIT_ENV_FILE` pointe vers le JSON temporaire :

```powershell
node docs/audits/creation-utilisateur-2026-10-11/banc-integration/run.cjs
```

Les secrets TOTP des seuls comptes fictifs sont conservés à côté de ce JSON
pour permettre de rejouer le test. Aucune capture n'est prise durant leur
enrôlement ou l'affichage du mot de passe. Les identifiants créés portent un
suffixe propre à l'exécution. Le navigateur se ferme à la fin ; arrêter ensuite
le serveur et le cluster possédés par ce banc, puis supprimer le répertoire
temporaire validé. Ne pas conserver ces secrets dans le dépôt.

## Limites

La panne réseau est injectée après l'écriture réelle. Les rôles délégués sont
préparés en SQL avant une connexion complète ; la révocation et les dates de
preuve sont modifiées volontairement dans la base isolée. Les délais 30/15 s
et changements d'acteur en vol sont couverts par le banc client simulé, pas
par ce script d'intégration. Pas de lecteur d'écran, Safari, appareil mobile
physique ou test de charge massive. La réinitialisation sur la fiche ne fait
pas partie de ces neuf scénarios.
