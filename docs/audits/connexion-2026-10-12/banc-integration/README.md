# Connexion — banc HTTP réel du 12 octobre 2026

**12/12 parcours réussis** avec le build Next 15.5.23, Chromium
149.0.7827.55 et PostgreSQL 17. Le [runner](run.cjs) et les
[résultats](resultats.json) sont conservés. Les sources de départ sont au commit
`0fd674a`, avec les corrections de cet audit présentes dans le build.

## Isolation et exécution

Cluster temporaire sur `127.0.0.1:54599`, base `login_audit_test`, serveur
Next de production sur `127.0.0.1:3122`. Les 52 migrations du dépôt sont
appliquées ; le script existant `apps/web/scripts/e2e-setup.mjs` prépare le
compte protégé `e2e-only-superadmin`. Le mot de passe est aléatoire et haché par
ce script au coût bcrypt 12. Les autres utilisateurs du banc sont des fixtures
créées exclusivement dans cette base. Aucun compte ni donnée de la base de
développement habituelle n'est utilisé.

Le fichier JSON privé pointé par `AUDIT_ENV_FILE` contient uniquement les valeurs
temporaires requises : `E2E_DATABASE_URL`, `E2E_SUPERADMIN_LOGIN_NAME`,
`E2E_SUPERADMIN_PASSWORD`, `WEB_URL`, `NEXT_PUBLIC_WEB_URL`,
`MFA_ENCRYPTION_KEY_V1`, `AUDIT_ENCRYPTION_KEY_V1` et
`AUDIT_ENCRYPTION_CURRENT_VERSION`. Les clés et le mot de passe sont générés
pour ce banc, sans réutiliser les secrets de `.env`.

Avant de reproduire : créer le cluster local dédié et le fichier privé,
injecter ces variables dans le processus, exécuter le setup avec Bun depuis
`apps/web` en retirant `DATABASE_URL` de son environnement, puis construire et
démarrer Next avec `DATABASE_URL` explicitement égal à `E2E_DATABASE_URL`.
`e2e-setup` refuse de confondre cette base avec la base applicative fournie.
Ne pas charger la cible distante du `.env` dans les commandes du banc.

Depuis la racine, avec `AUDIT_ENV_FILE` pointant vers ce fichier privé :

```powershell
node docs/audits/connexion-2026-10-12/banc-integration/run.cjs
```

Le runner refuse toute autre adresse, base ou port. Il remet les compteurs
`RateLimit` à zéro **uniquement avant le banc**, dans cette base jetable, sans
modifier les quotas ni les vider entre les scénarios. Pour rejouer entièrement
le premier enrôlement, relancer le setup existant sur cette même base dédiée :
il réinitialise seulement l'identité protégée appartenant au banc.

## Contrôles effectués

1. Entrée anonyme et redirection privée conservant `next` ; champs vides,
   autocomplétion désactivée et absence de débordement à 320, 360, 390, 768,
   1 024, 1 440 et 1 920 px.
2. Même réponse publique pour identifiant inconnu, compte désactivé, compte
   verrouillé et mauvais mot de passe ; auteur d'audit anonyme ; CSRF incorrect
   refusé par le middleware réel.
3. Bootstrap du superadmin avec vrai TOTP ; aucune session avant MFA,
   cookie de défi HttpOnly/Secure/SameSite Strict limité au chemin MFA,
   session hachée en base ; confiance forcée à faux et durées 1 jour/30 minutes.
4. Bootstrap d'un utilisateur ; dix codes de secours distincts, conservation
   explicitement confirmée, secret chiffré et codes hachés en base ; confiance
   choisie avec durées 30 jours/7 jours ; retour interne avec filtres.
5. Code MFA refusé puis TOTP accepté ; erreur locale focalisée, code effacé et
   aucune duplication en toast d'erreur.
6. Code de secours consommé une fois ; rejeu refusé puis autre code accepté.
7. Défi réellement expiré en base, refus et retour utilisable aux identifiants ;
   mot de passe vidé, identifiant conservé et refocalisé.
8. Annulation réelle supprimant le défi et son cookie, sans supprimer les
   sessions déjà ouvertes.
9. Corps JSON volontairement endommagé **après une vraie vérification serveur
   réussie**, en conservant ses en-têtes Set-Cookie : écran incertain, code
   désactivé, session retrouvée par GET et un seul POST MFA.
10. Destination externe remplacée par l'accueil après authentification réelle.
11. Version de sécurité changée entre mot de passe et MFA : aucune session
    accordée à l'ancien défi.
12. Inactivité de session réellement expirée en base : accès SSR privé et
    lecture de session refusés.

La navigation, les requêtes applicatives, le middleware CSRF, le chiffrement,
la consommation des codes, les transactions, les cookies et les sessions sont
réels. Les appels auxiliaires utilisent le `fetch` de Chromium, donc ses vrais
cookies. La seule réponse modifiée est le corps décrit au scénario 9 ; le
traitement et le commit correspondants restent réels. L'absence de cookie après
une réponse entièrement perdue est couverte par le banc client simulé, pas
revendiquée comme une seconde expérience HTTP dans ce banc.

## Ajustements du banc et confidentialité

Les premières préparations ont corrigé le chemin du binaire Next dans le
monorepo, la lecture du CSRF au moment de l'appel, l'oracle SameSite (Strict),
le sélecteur de label incluant l'indicateur obligatoire et la portée de l'alerte
(l'annonceur Next possède aussi ce rôle). Ces échecs de préparation ne sont pas
présentés comme des défauts produit. La dernière passe rejoue les douze
scénarios ensemble et réussit sans erreur JavaScript.

Aucune capture, trace HTTP, vidéo ou copie de page sensible n'est produite.
TOTP et codes de secours restent en mémoire ; les diagnostics sont expurgés des
secrets et le JSON final est vérifié avant écriture. Le fichier privé, les
journaux locaux et le cluster temporaires sont supprimés après la passe finale.
Les navigateurs et le serveur dédié sont arrêtés.

## Limites

Chromium sur Windows et HTTP loopback, sans proxy/TLS de déploiement ni appareil
Authenticator physique. Ce banc ne constitue ni test de charge, ni test de
résistance distribuée, ni validation de Safari/iOS ou lecteur d'écran.
Les cas de concurrence, limites d'essais et rollback d'audit sont détaillés dans
le [banc serveur](../banc-serveur/README.md) ; les interactions de panne et
modales complémentaires dans le [banc client](../banc-client/README.md).
Le [rapport propriétaire](../../AUDIT_CONNEXION_2026-10-12.md) regroupe les
résultats sans confondre ces couches.
