# Parcours réels — Utilisateurs

[Programme](run.cjs) pour un build Next de production, PostgreSQL 17 local isolé
et Chromium. La connexion par mot de passe, l'enrôlement TOTP et la session sont
réels. Aucune interception d'API dans ce banc ; les pannes et réponses retardées
relèvent du banc client séparé.

## Préparation et exécution

Créer un cluster jetable en écoute sur `127.0.0.1`, sur un port distinct de 5432,
puis la base vide `users_audit_test`. Appliquer les migrations et préparer le
compte protégé avec `apps/web/scripts/e2e-setup.mjs` sous Bun. Ce script exige des
variables E2E explicites et refuse la base de l'application. Ne jamais le lancer
avec la base habituelle du projet.

Le fichier JSON privé désigné par `AUDIT_ENV_FILE` contient
`E2E_DATABASE_URL`, `E2E_SUPERADMIN_LOGIN_NAME` (préfixé `e2e-`),
`E2E_SUPERADMIN_PASSWORD`, `WEB_URL`, `NEXT_PUBLIC_WEB_URL`,
`MFA_ENCRYPTION_KEY_V1`, `AUDIT_ENCRYPTION_KEY_V1` et
`AUDIT_ENCRYPTION_CURRENT_VERSION`. Générer des secrets fictifs pour ce banc.
L'origine est strictement `http://127.0.0.1:3117`.

Construire puis démarrer Next avec ces mêmes variables et `DATABASE_URL` pointant
explicitement sur cette base isolée. Exécuter depuis la racine :

```powershell
$env:AUDIT_ENV_FILE = '<chemin absolu du JSON privé temporaire>'
node docs/audits/utilisateurs-2026-10-11/banc-integration/run.cjs
```

Le programme crée 66 comptes de données fictives, en plus du compte protégé,
puis un lecteur. Il modifie les droits du lecteur pour contrôler les projections
et la révocation. Il garde temporairement sa clé TOTP près du JSON,
sans les copier dans les preuves publiques. Après l'essai, arrêter les processus
créés pour le banc et retirer uniquement son répertoire temporaire vérifié.

Le navigateur exécute les requêtes authentifiées avec `fetch` et ses cookies
réels. Le client HTTP séparé de Playwright n'envoie pas les cookies `Secure` sur
HTTP loopback, alors que Chromium les accepte ; ce banc respecte la configuration
de sécurité du produit.

## Résultats du 11 octobre

[Observations](observations.json) : **dix parcours réussis** avec Chromium
149.0.7827.55. Six largeurs de 320 à 1 920 px, plus les quatre combinaisons de
colonnes à 1 120, 1 280 et 1 440 px, sont mesurées dans ces parcours. Pas de
débordement horizontal ; colonne d'identité d'au moins 260 px quand le tableau
est visible. Les captures [390 px](users-390.png), [1 120 px](users-1120.png)
et [1 920 px](users-1920.png) montrent le vrai cadre et les données fictives.

Le compte protégé et le lecteur passent par une nouvelle connexion. Leur
enrôlement initial et leur preuve TOTP utilisent les écrans réels. La reprise
d'un banc déjà enrôlé attend au besoin le prochain créneau TOTP plutôt que
réutiliser un code déjà consommé. Une première tentative avait le mauvais
sélecteur de recherche, repris du Répertoire : montage corrigé, puis passe
complète réussie. Ce n'était pas un défaut de la page.

## Portée

Connexion et MFA, recherche et SQL réel, limites de champs transmis, compteurs,
pagination, historique navigateur, fiche puis retour, focus et position,
six largeurs dans le cadre complet, quatre combinaisons de droits contact/sécurité,
masquage du compte protégé, refus de création et révocation de lecture.

La création réussie et les mutations de fiche restent couvertes par leurs audits
propres, sans nouvelle certification ici. Réseau distant, Safari/iOS, lecteur
d'écran, appareils physiques et extensions de gestionnaire de mots de passe
ne sont pas exercés. Les résultats de performance viennent du banc serveur.
