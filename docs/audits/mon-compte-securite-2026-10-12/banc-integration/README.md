# Révocation globale avec sessions réelles

Les [trois parcours du 12 octobre 2026](preuves/resultats.json) réussissent sur
le build final : annulation, confirmation normale et réponse perdue après
commit. Les deux dernières opérations conservent la session courante,
invalident l’autre navigateur et ajoutent chacune un seul audit.

## Environnement et portée

Next **15.5.23** en production, Chromium **149.0.7827.55**, PostgreSQL **17**
avec les **52 migrations**. Origine `127.0.0.1:3129`, base fictive
`account_sessions_test` sur `127.0.0.1:54660`. Le [helper](auth.cjs) refuse
d’autres cibles. Aucun fichier `.env` habituel modifié et aucune connexion à la
base habituelle du projet.

Un compte racine fictif est préparé avec `apps/web/scripts/e2e-setup.mjs`.
Connexion, enrôlement initial, TOTP, cookies, CSRF et handlers sont réels.
Deux contextes Chromium indépendants ont chacun leur session authentifiée ;
le second se reconnecte entre la révocation normale et le scénario de réponse
perdue. Les sessions ne sont pas fabriquées directement en SQL. Le compte et
les clés de chiffrement sont exclusivement ceux du dossier temporaire privé.

Le [runner](run.cjs) vérifie les statuts HTTP, les sessions restantes et le
nombre d’audits. Il ne rejoue pas l’ensemble des audits précédents de Mon
compte et n’exerce pas le remplacement d’application MFA.

## Résultats observés

| Parcours | Preuve |
| --- | --- |
| Annuler la confirmation globale | Aucun DELETE, aucun audit ajouté, les deux sessions restent actives. |
| Confirmer | DELETE 200, une seule session conservée, un audit ajouté. L’autre contexte reçoit 401 sur GET `/api/auth/me` ; le contexte courant reçoit 200. Dialogue fermé et titre Sessions actives focalisé, visible. |
| Perdre la réponse après commit | `route.fetch()` reçoit le vrai 200, puis `route.abort()` interrompt seulement son retour au navigateur. Un seul DELETE, un GET de relecture, un audit ajouté. L’autre contexte reçoit 401 et la session courante 200. Le message d’incertitude reste présent, sans rejeu automatique. |

À 390 × 700, le titre focalisé est à **326,39 px**, sous la barre dont le bas
est à 105 px. La [capture mobile après réponse perdue](preuves/revoke-lost-390.png)
a été inspectée : notification, session courante et absence d’autre session
lisibles. La [capture après succès à 1440 px](preuves/revoke-success-1440.png)
complète les mesures du JSON.

## Reproduction

Créer le cluster local dédié et injecter les variables E2E privées. Retirer
`DATABASE_URL` du seul processus de préparation avant
`bun apps/web/scripts/e2e-setup.mjs`, puis définir explicitement cette variable
depuis `E2E_DATABASE_URL` pour le build et le démarrage Next.

`AUDIT_ENV_FILE` pointe vers `env.json` dans `noctambule-account-sessions-*`.
Il contient l’URL E2E locale, le mot de passe fictif, les clés audit/MFA et
l’origine du serveur. Le helper conserve le secret TOTP dans ce même dossier,
jamais dans les preuves. Après démarrage du build final :

```powershell
node docs/audits/mon-compte-securite-2026-10-12/banc-integration/run.cjs
```

Le premier scénario attend une base préparée sans ancienne session de campagne.
Les éventuelles attentes entre connexions respectent le pas TOTP réellement
consommé ; aucun contournement du contrôle anti-rejeu n’est utilisé.

## Limites

Les délais de requête suspendue, les refus injectés avant handler, le focus
tardif et les erreurs de relecture relèvent du [banc client](../banc-client/README.md).
Leurs API sont simulées ; ces résultats ne sont pas ajoutés aux trois parcours
HTTP réels. La course entre ancien snapshot et rotation est vérifiée par les
[tests SQL dédiés](../banc-serveur/README.md), avec source d’authentification
simulée. HTTP local, deux tailles de viewport, pas d’appareil physique,
Safari/iOS, lecteur d’écran, proxy ni benchmark de charge.

## Nettoyage

Les trois scénarios sont terminés. [Le contrôle de nettoyage](preuves/cleanup.json)
confirme Next 3129 et PostgreSQL 54660 arrêtés, ports libres, dossier temporaire
et marker supprimés. Le chemin absolu, les deux cibles SQL et l’absence de
jonction ont été vérifiés avant suppression du cluster et de ses deux bases.
Les artefacts texte ont été comparés aux secrets temporaires sans occurrence.
Les clés, mot de passe fictif, secret TOTP et journaux privés ne sont pas
archivés ; seuls scripts, mesures et captures fictives sont conservés.
