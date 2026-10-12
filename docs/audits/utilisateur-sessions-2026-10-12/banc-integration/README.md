# Sessions d’un autre compte : parcours réels

Les [quatre parcours du 12 octobre 2026](preuves/resultats.json) réussissent :
annulation, révocation individuelle avec preuve sensible, révocation globale,
puis perte de la réponse après commit. Chaque révocation exécutée produit un
seul audit et déconnecte uniquement les sessions du compte cible.

## Environnement

Next **15.5.23** en production, Chromium **149.0.7827.55**, PostgreSQL **17**
avec les **52 migrations**. Next `127.0.0.1:3130`, base fictive
`user_sessions_test` sur `127.0.0.1:54661`. Le [helper](auth.cjs) refuse
toute autre cible. Aucun fichier `.env` habituel modifié, aucune connexion à
la base habituelle du projet.

Le compte racine fictif provient de `apps/web/scripts/e2e-setup.mjs`. Les
comptes cibles et réservations d’identifiant sont des fixtures SQL dédiées,
avec le même hash fictif pour simplifier leur connexion. **Leurs sessions
sont créées par de vraies connexions**, dans des contextes Chromium distincts.
Enrôlement initial, TOTP, mot de passe, preuve sensible, cookies, CSRF et handlers
sont réels. Les codes et clés restent dans le dossier temporaire privé.

## Observations

| Parcours | Résultat |
| --- | --- |
| Annuler | Annuler la confirmation globale n’envoie aucun DELETE. Annuler ensuite le défi d’identité après une demande individuelle laisse les deux sessions et zéro audit ; le DELETE initial a été refusé avant toute révocation. |
| Individuel | Le premier DELETE demande une preuve ; saisir le vrai mot de passe et un TOTP valide autorise la nouvelle requête. Une session cible reste active, l’autre reçoit 401 sur GET `/api/auth/me`, un audit est ajouté. |
| Global | Un seul DELETE déconnecte la dernière session cible. Les deux navigateurs cibles reçoivent 401, l’administrateur conserve 200. Un audit ajouté, titre Sessions focalisé et visible sous les onglets. |
| Réponse perdue | `route.fetch()` reçoit le vrai DELETE 200 après commit, puis `route.abort()` interrompt son retour au navigateur. Un DELETE, un GET de relecture et un audit. La cible reçoit 401, l’administrateur 200 ; message d’incertitude persistant et titre focalisé à 390 × 700. Aucun rejeu automatique du DELETE. |

Le [runner](run.cjs) contrôle les effets SQL et les réponses des navigateurs.
Les délais éventuels entre connexions et preuve sensible respectent la fenêtre
TOTP consommée ; le contrôle anti-rejeu n’est pas contourné. Le titre du parcours
mobile initial est mesuré à 290,30 px, sous la barre dont le bas est à 105 px.

La [capture desktop](preuves/sessions-success-1440.png) montre le résultat
global. La première [capture mobile](preuves/sessions-lost-390.png) précède le
déplacement de la notice dans sa carte Sessions. Le
[contrôle final limité à cette notice](check-final-notice.cjs) réussit sur le
build final : [mesures](preuves/notice-finale.json) et
[capture finale mobile inspectée](preuves/sessions-notice-final-390.png).
La notice appartient bien à la carte Sessions ; le titre focalisé est à
**178,30 px**, sous la barre à 105 px. Une nouvelle cible fictive est révoquée
avec un seul DELETE commité puis perdu, un GET et un audit. Ce complément
visuel est distinct des quatre parcours déjà acquis.

## Reproduction

Créer un cluster local dédié sur 54661, deux bases vides `user_sessions_test`
et `user_detail_service_test`. `AUDIT_ENV_FILE` pointe vers `env.json` dans
`noctambule-user-sessions-*` ; le marker privé temporaire est
`noctambule-user-sessions-current.txt`. Le fichier contient seulement les
variables E2E, l’origine locale et les secrets fictifs de cette campagne.

Retirer `DATABASE_URL` du processus avant `bun apps/web/scripts/e2e-setup.mjs`,
puis affecter explicitement `E2E_DATABASE_URL` à `DATABASE_URL` pour le build
et le démarrage Next. Injecter les autres variables de ce même fichier privé.
Depuis la racine, après démarrage du build validé sur 3130 :

```powershell
node docs/audits/utilisateur-sessions-2026-10-12/banc-integration/run.cjs
```

Le runner crée une nouvelle cible fictive à chaque exécution et conserve le
secret TOTP uniquement dans le dossier temporaire. Ne pas le lancer contre
une base partagée ou habituelle. Le contrôle final de notice utilise une autre
cible fictive, une connexion réelle et une preuve sensible HTTP réelle.

## Limites et nettoyage

Les [treize cas SQL](../banc-serveur/README.md) qualifient les anciennes
autorisations et la preuve expirée pendant un verrou, avec snapshot auth simulé.
Les délais suspendus, erreurs JSON et changements de focus tardifs relèvent du
[banc client](../banc-client/README.md), dont les API sont simulées. Ces preuves
ne sont pas ajoutées aux quatre parcours HTTP réels.

HTTP local et deux viewports, pas d’appareil physique, Safari/iOS, lecteur
d’écran, proxy ni mesure sous charge. Les autres actions de la fiche ne sont
pas rejouées.

[Le nettoyage](preuves/cleanup.json) est terminé : Next 3130 et PostgreSQL
54661 arrêtés, ports libres, cluster et deux bases fictives supprimés, dossier
temporaire et marker supprimés. Les chemins absolus, les deux cibles SQL et
l’absence de jonction ont été vérifiés. La comparaison des artefacts texte aux
secrets privés n’a trouvé aucune occurrence. Clés, mots de passe, secrets TOTP
et journaux privés ne sont pas archivés. L’écriture du compte rendu JSON a
nécessité une reprise après une erreur de sérialisation PowerShell ; le
nettoyage lui-même avait déjà réussi et son résultat a été revérifié.
