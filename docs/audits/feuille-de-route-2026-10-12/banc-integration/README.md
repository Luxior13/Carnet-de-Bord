# Feuille de route — intégration réelle du 12 octobre 2026

**8/8 scénarios réussis**, dans l'application Next construite en production.
[Résultats](resultats.json) · [Script](run.cjs) ·
[Rapport de la page](../../2026-10-12-feuille-de-route.md).

Départ propre au commit `f108f6c`, puis corrections locales de cette revue.
Windows, Node 24.14.0, Bun 1.4.2, Next 15.5.23, Prisma 6.19.3,
PostgreSQL 17 et Chromium 149.0.7827.55. Serveur local `127.0.0.1:3121`, base
jetable `roadmap_audit_test` sur `127.0.0.1:54598`, avec les **52 migrations
existantes appliquées**. Aucun accès à la base habituelle du projet.

## Parcours exercés

| Scénario | Observation |
| --- | --- |
| Accès privé anonyme | HTTP 307 vers la connexion ; URL et filtres conservés dans `next`, aucun contenu de carte rendu. Même refus avec un faux cookie `session` et des en-têtes `x-request-path`/`x-request-target` falsifiés. |
| Connexion MFA et catalogue | Compte racine fictif réellement connecté et enrôlé ; cadre complet, 39 cartes distinctes et compteur exact. |
| Filtres et historique | Intersection pôle/étape, précédent, suivant, rechargement et remise à zéro ; identifiants comparés aux cartes initiales, focus rendu à la recherche. |
| Recherche rapide et vide | Saisie caractère par caractère, accents/casse, résultat vide et reprise ; saisie par remplacement d'URL sans entrée d'historique à chaque frappe. Aucun appel de page/RSC ni d'API de catalogue pendant ces interactions. |
| URL et anciennes destinations | Alias `/feuille-de-route` avec filtres, anciennes actualités/notifications/journal ; aucun module retiré rouvert. Filtres inconnus neutres, texte ressemblant à un script traité comme texte, recherche longue limitée à 200 caractères. |
| Sept largeurs | 320, 390, 640, 768, 1024, 1440 et 1920 px ; filtres utilisables, résultats exacts, aucun débordement horizontal du document ou de `main`. |
| Compte USER limité | Deuxième compte fictif sans permission administrative réellement connecté avec MFA ; catalogue autorisé, `/systeme` mène à la feuille de route, réglages administratifs masqués et API Paramètres refusée 403. |
| Session périmée | Échéance de la session USER avancée dans la fixture SQL ; rechargement renvoyé à la connexion, cartes retirées et `/api/auth/me` refusée 401. |

Aucune erreur JavaScript observée sur les pages surveillées. Le catalogue ne
possède ni API de données, ni mutation métier, ni table Prisma. PostgreSQL sert
ici à vérifier les comptes, les sessions et leurs contrôles effectifs.

Captures réelles inspectées : [bureau 1440 px](feuille-de-route-1440.png) et
[mobile 390 px](feuille-de-route-390.png), après filtrage Esport/étape 2.
Elles montrent la zone visible du conteneur défilant, pas toutes les cartes
simultanément. Le compte et son avatar sont fictifs.

## Reproduction

Le script suppose le serveur construit/démarré et une base isolée préparée
avec le script **Bun** `apps/web/scripts/e2e-setup.mjs`. Celui-ci fournit le
compte `e2e-only-superadmin`. L'essai initial de préparation avec Node a échoué
car ce lanceur appelle le sous-processus Bun `x prisma` ; la préparation a été
reprise avec le lanceur prévu, avant toute exécution des parcours. Ce défaut
de commande du banc n'est pas compté comme une anomalie de la page.

Le JSON privé pointé par `AUDIT_ENV_FILE` contient `E2E_DATABASE_URL`,
`E2E_SUPERADMIN_LOGIN_NAME`, `E2E_SUPERADMIN_PASSWORD`, `WEB_URL`,
`NEXT_PUBLIC_WEB_URL`, `MFA_ENCRYPTION_KEY_V1`, `AUDIT_ENCRYPTION_KEY_V1`
et `AUDIT_ENCRYPTION_CURRENT_VERSION`. Générer des secrets propres à cette
base ; le serveur utilise les mêmes valeurs et `DATABASE_URL=E2E_DATABASE_URL`.
Le fichier et les secrets TOTP temporaires restent hors du dépôt.

Depuis la racine, après définition de `AUDIT_ENV_FILE` :

```powershell
node docs/audits/feuille-de-route-2026-10-12/banc-integration/run.cjs
```

Le script exige une base nommée `roadmap_audit_test` sur `127.0.0.1`, un port
PostgreSQL autre que 5432 et le serveur local port 3121. Il crée un compte
USER fictif, expire sa session à la fin et ferme ses contextes navigateur dans
un `finally`. Les anciens essais de cette base peuvent rester jusqu'à sa
destruction ; le catalogue n'est jamais modifié.

Le script ne démarre ni n'arrête Next ou PostgreSQL. Après cette passe, les
processus dédiés et leur dossier temporaire sont nettoyés par l'opérateur ;
une nouvelle exécution demande un environnement isolé nouvellement préparé.

## Limites

L'authentification, le MFA, les cookies, le routeur, les composants, le style
et les lectures de session sont réels. La création du compte USER et
l'expiration de sa session sont des changements ciblés de fixtures SQL ;
aucune attente d'expiration naturelle ni parcours de suspension administrative
n'est déduit de ce contrôle.

Chromium seul, comptes fictifs et catalogue de 39 chantiers ; aucun lecteur
d'écran, Safari/iOS, appareil mobile physique, extension Bitwarden ou test de
charge. Les 48 combinaisons et les 39 détails sont vérifiés exhaustivement
dans le banc client distinct. La mesure du bundle et l'absence de requêtes
pendant le filtrage ne constituent pas un benchmark de serveur sous charge.
