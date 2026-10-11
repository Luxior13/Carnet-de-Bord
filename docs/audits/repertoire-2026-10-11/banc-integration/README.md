# Répertoire — parcours réels du 11 octobre 2026

[Banc](run.cjs) et [observations](observations.json) : **neuf scénarios réussis**
dans Chromium 149.0.7827.55, sur le build de production Next 15.5.23 et PostgreSQL
17.10 local. Les composants, sessions, API, permissions et écritures sont réels ;
aucune interception de requête ou simulation de route n’est utilisée.

## Environnement isolé

Un cluster jetable a été créé dans un dossier temporaire, accessible seulement
sur `127.0.0.1:54591`, avec une base neuve `repertoire_audit_test`. Les 51 migrations
du dépôt ont été appliquées via le script `apps/web/scripts/e2e-setup.mjs` avec
`E2E_DATABASE_URL` vers cette base. Identifiant du compte protégé fictif :
`e2e-repertoire-audit`. Mot de passe et clés de chiffrement aléatoires réservés à
ce banc, jamais copiés dans le dépôt. Le compte de lecture seule est aussi fictif.

Le serveur démarre avec le même environnement que le build, `DATABASE_URL` égal
à cette URL dédiée, `WEB_URL` et `NEXT_PUBLIC_WEB_URL` égaux à
`http://127.0.0.1:3117`. Aucun fichier `.env` du projet n’est modifié. Le mot de
passe et l’enrôlement TOTP passent par l’interface. Les relances intermédiaires
réutilisent la session ainsi obtenue dans le seul dossier temporaire ; la passe
finale réutilise celle du compte protégé et enrôle réellement le compte lecteur.
Le temps de 35 ms du scénario de session correspond à sa vérification, pas à la
durée d’enrôlement ou à une mesure de performance de connexion.

Le client API séparé de Playwright ne transmet pas les cookies Secure sur HTTP
loopback, contrairement à Chromium. Les appels authentifiés du banc utilisent
donc `fetch` dans le vrai navigateur, avec ses vrais cookies et le jeton CSRF
fourni par l’application. Les protections produit n’ont pas été désactivées.

## Rejouer

Préparer **une nouvelle base jetable** avec les noms et cibles ci-dessus, les
migrations et le compte de test, puis compiler et démarrer Next sur le port
3117. La base courante du projet ne doit pas servir à ce banc. Un JSON privé
dans le dossier temporaire contient les variables utilisées :
`E2E_DATABASE_URL`, `E2E_SUPERADMIN_LOGIN_NAME`, `E2E_SUPERADMIN_PASSWORD`,
`MFA_ENCRYPTION_KEY_V1`, `AUDIT_ENCRYPTION_KEY_V1`,
`AUDIT_ENCRYPTION_CURRENT_VERSION`, `WEB_URL`, `NEXT_PUBLIC_WEB_URL`.
Les clés/mots de passe doivent être générés pour cette exécution.

Depuis la racine, définir `AUDIT_ENV_FILE` vers ce JSON puis lancer :

```powershell
node docs/audits/repertoire-2026-10-11/banc-integration/run.cjs
```

Le script refuse un hôte distant, le port PostgreSQL courant 5432, un autre nom
de base ou une autre origine web. Il crée 60 fiches par l’API puis une par
l’interface, modifie une identité et révoque le droit du lecteur fictif. Une
exécution complète modifie donc les compteurs globaux : repartir d’une base
neuve pour reproduire toute la suite. Il écrit observations, captures et états
de session dans le dossier temporaire. Conserver uniquement les preuves utiles,
puis arrêter les processus possédés par le banc et supprimer ce dossier vérifié.
Les secrets TOTP, sessions et clés ne sont pas des pièces d’audit à publier.
À la fin de la passe conservée, le serveur Next et le cluster possédés par le
banc ont été arrêtés ; leur dossier temporaire vérifié a été supprimé.

## Résultats

| Scénario | Résultat observé |
| --- | --- |
| Anonyme | API 401 ; page redirigée vers connexion |
| Authentification | Session issue du mot de passe et de la MFA réels ; compte protégé reconnu |
| Pagination SQL | 60 résultats sur 25/25/10, total constant, aucun identifiant répété |
| Fiche puis retour | Deuxième page conservée, mêmes lignes, focus sur le lien d’origine ; rechargement avec précédent disponible |
| Recherche/filtres | Identité multi-mots sans accents, email et explication, statut extérieur, tri, compteur Sans coordonnées et retrait du filtre |
| Reprise et bornes | Limite 101, recherche 101 caractères, tri inconnu et curseur invalide refusés ; Première page conserve la recherche |
| Responsive réel | 320, 390, 768, 1 024, 1 440 et 1 920 px, aucun débordement horizontal global ou du contenu principal |
| Création/actualisation | Création depuis la liste, ouverture de la fiche, personne et audit présents en base, retour et recherche ; identité actualisée retrouvée après changement de recherche |
| Lecture seule/révocation | Action de création absente et POST refusé ; retrait en base du droit de lecture, GET 403, lignes et synthèse retirées, accès refusé au rechargement |

Les [captures mobile](directory-390.png) et [desktop](directory-1920.png) ont été
prises et relues après la passe, en haut de page, sur le même build et la même
base : elles montrent 61 fiches après la création. Les captures de la boucle de
responsive ont aussi été relues, mais ne sont pas dupliquées dans le dépôt.

Quelques essais intermédiaires ont corrigé des hypothèses du banc : suffixe
« obligatoire » des labels, rôle `searchbox`, texte de correspondance, et page
excessive normalisée avant d’atteindre le traitement du curseur. Un essai de
navigation vers création a expiré ; ouverture directe et navigation isolée
ont ensuite réussi, puis le parcours entier sur le bundle final. Il n’est pas
présenté comme un défaut produit reproduit. Les observations conservées sont
celles de la dernière passe complète réussie.

## Limites

Jeu fictif réduit, deux comptes, serveur local et Chromium sur ordinateur ;
pas de réseau distant, appareil physique, extension Bitwarden ou charge simultanée.
La révocation est observée au prochain appel/refraîchissement de session, pas
par une notification serveur instantanée. Ni tous les dialogues de coordonnées,
ni la suppression, ni un scénario complet de réinitialisation MFA ne sont
réaudités ici. Les pannes et courses provoquées sont documentées dans le banc
client séparé ; les mesures de volume, dans le banc serveur.
