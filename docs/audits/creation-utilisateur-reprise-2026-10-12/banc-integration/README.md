# Création et reprise avec Next authentifié

Les [trois parcours du 12 octobre 2026](preuves/resultats.json) réussissent
sur le build final : USER, ADMIN avec vraie preuve sensible, et reprise par
identifiant exact après une réponse perdue.

## Environnement et scénarios

Next **15.5.23** production, Chromium **149.0.7827.55**, PostgreSQL **17** et
**52 migrations**. Origine `127.0.0.1:3131`, base fictive
`creation_reprise_test` sur `127.0.0.1:54662`. Le [helper](auth.cjs) refuse
d’autres cibles ; aucun `.env` habituel ni donnée du projet utilisés.

Le compte racine fictif est préparé par `apps/web/scripts/e2e-setup.mjs`.
Connexion, enrôlement initial, mot de passe/TOTP, CSRF, cookies et handlers
sont réels. Les comptes créés passent par le formulaire et le vrai POST ;
leurs réservations et audits sont lus en SQL pour vérifier le résultat.

| Parcours | Résultat |
| --- | --- |
| USER | Compte, réservation et audit uniques ; secret affiché vérifié contre le hash bcrypt, changement obligatoire conservé. Aucun secret dans l’audit. |
| ADMIN | Annuler le défi ne crée rien, conserve la saisie et rend le focus à Créer. La nouvelle confirmation avec vrai mot de passe/TOTP crée un seul ADMIN, sa réservation et son audit. |
| Réponse perdue et vérification retardée | `route.fetch()` reçoit le vrai POST 200 puis `route.abort()` coupe seulement la réponse. Recherche exacte réelle par GET ; le banc retarde la remise de ce GET pendant une nouvelle interaction dans la recherche rapide. Son champ conserve le focus ; le panneau annonce qu’un compte utilise l’identifiant. Un POST, un GET de vérification, un compte et un audit, aucun rejeu automatique. |

La [capture mobile de reprise](preuves/creation-reprise-390.png) ne contient
aucun mot de passe. Les secrets affichés pendant les deux succès sont vérifiés
en mémoire puis quittés avec le repère de conservation ; aucune capture ou
valeur secrète n’est ajoutée aux résultats.

Une [première passe intermédiaire](preuves/intermediaire-radio.json) a réussi
USER puis échoué dans le runner : `.check()` tentait de cliquer le radio masqué
1 × 1 px et son label interceptait le clic. Le runner clique maintenant la
carte label et vérifie la sélection. Aucun défaut produit ni correctif du radio
n’a été nécessaire.

## Reproduction et limites

`AUDIT_ENV_FILE` désigne `env.json` dans `noctambule-user-create-reprise-*`.
Le marker privé temporaire est `noctambule-user-create-reprise-current.txt`.
Préparer les bases jetables, injecter uniquement leurs variables, retirer
`DATABASE_URL` du processus avant le script E2E, puis définir explicitement
`DATABASE_URL=E2E_DATABASE_URL` pour build et démarrage sur 3131. Après le GO build :

```powershell
node docs/audits/creation-utilisateur-reprise-2026-10-12/banc-integration/run.cjs
```

Le runner utilise de nouveaux identifiants fictifs à chaque exécution et attend
le pas TOTP suivant si nécessaire. La reprise ne relit aucun mot de passe et
ne prétend pas attribuer une création à cette tentative par la seule présence
de l’identifiant. Les [courses d’autorisation](../banc-serveur/README.md) sont
établies séparément en SQL, avec snapshot auth simulé ; les délais suspendus
et autres variantes de focus relèvent du [banc client](../banc-client/README.md).
Pas de contrôle d’appareil physique, Safari/iOS, lecteur d’écran ou forte charge.
Les autres mutations et la première connexion des comptes créés ne sont pas
réauditées dans ce complément.

Le [nettoyage vérifié](preuves/cleanup.json) a arrêté Next et PostgreSQL ;
les ports 3131 et 54662 sont libres. Les trois bases fictives, le cluster,
le dossier temporaire, son marqueur, `env.json` et les clés/TOTP ont été supprimés.
Aucun point de jonction n’était présent dans ce dossier. Les 13 fichiers texte
de preuve contrôlés ne contiennent aucune des valeurs privées de l’environnement.
