# Fiche utilisateur — intégration Next, PostgreSQL et navigateur

Passe du **11 octobre 2026** pour `/systeme/utilisateurs/[id]` :
**[treize scénarios réussis](resultats.json)** sur Chromium 149.0.7827.55,
Next 15.5.23 en production et PostgreSQL 17 local jetable.
Le [script](run.cjs) contient les assertions exécutées ; la
[capture du profil à 1 440 px](profil-1440.png) est prise hors affichage de secret.

## Scénarios du protocole

1. Connexions réelles du compte racine et d'un compte cible, avec mot de passe,
   inscription MFA et TOTP. Les quatre sections de la fiche sont parcourues à
   320, 390, 640, 768, 1 024, 1 440 et 1 920 px ; contrôle du débordement du
   document et de la zone principale.
2. Effacement du nom facultatif, prénom conservé, email de contact normalisé,
   persistance après rechargement et audit. Une requête PATCH sans version doit
   être refusée.
3. Deux onglets éditent la même version : premier enregistrement, conflit du
   second, conservation de son brouillon, actualisation explicite puis nouvel
   enregistrement.
4. Changement de section avec brouillon : confirmation de départ, annulation,
   retour du focus au lien déclencheur et saisie conservée ; Annuler restaure
   ensuite la dernière valeur enregistrée.
5. Deux véritables sessions de la cible : annulation du défi administrateur
   sans révocation, puis confirmation par mot de passe et TOTP, révocation
   individuelle et globale. Les navigateurs concernés vérifient ensuite le
   refus de leur session.
6. Modifications des autorisations administratives et de l'autonomie du compte :
   chaque scope conserve les valeurs de l'autre.
7. Changement d'identifiant avec confirmation : ancien et nouvel identifiants
   restent réservés au même compte, sans modifier l'email de contact.
8. Réinitialisation du mot de passe, comparaison du secret affiché avec le vrai
   hash bcrypt, copie dans le presse-papiers réel, conservation explicitement
   cochée puis masquage avec retour du focus. Absence du secret dans les audits,
   localStorage et sessionStorage.
9. Réponse du reset de mot de passe perdue **après commit réel** : vérification
   par GET, puis nouvelle émission explicitement demandée et confirmée. Le
   nouveau hash remplace celui de la réponse perdue ; aucun rejeu automatique.
10. Réinitialisation MFA par la racine avec véritables mot de passe et TOTP :
    retrait du credential, des codes de secours et des sessions, puis connexion
    de la cible avec le mot de passe temporaire réémis, nouvelle inscription MFA
    et changement obligatoire du mot de passe.
11. Réponse du reset MFA perdue **après commit réel** : bouton de réinitialisation
    bloqué pendant l'incertitude, vérification par GET, fermeture après
    confirmation de l'état sans second POST.
12. Lecteur connecté avec MFA : profil non modifiable, projection des champs
    privés, puis retrait des droits contact/sécurité et du droit de lecture.
    Après actualisation de l'acteur, les données disparaissent ; mutations
    interdites et GET refusé sont vérifiés côté serveur.
13. Compte actif non supprimable, désactivation confirmée puis suppression avec
    saisie de l'identifiant. Contrôle de l'anonymisation, de la disparition des
    sessions, de la réservation historique conservée et du GET devenu 404.

Les mutations authentifiées utilisent `fetch` dans le navigateur et le véritable
cookie/jeton CSRF. Le script n'injecte pas de cookie de session fabriqué.
Chromium accepte les cookies Secure sur l'adresse de boucle locale HTTP ; le
client HTTP séparé de Playwright ne les transmet pas dans cette configuration.

## Reproduction

Préparer les dépendances, Chromium et un cluster PostgreSQL jetable local sur
le port **54595**, avec la base **`user_detail_audit_test`**. Un fichier privé
`env.json`, temporaire et hors des preuves conservées, contient :

- `E2E_DATABASE_URL` : URL de cette seule base locale ;
- `E2E_SUPERADMIN_LOGIN_NAME` : identifiant valide préfixé `e2e-` ;
- `E2E_SUPERADMIN_PASSWORD` : mot de passe fictif aléatoire d'au moins 12 caractères ;
- `WEB_URL` et `NEXT_PUBLIC_WEB_URL` : `http://127.0.0.1:3118` ;
- `MFA_ENCRYPTION_KEY_V1` et `AUDIT_ENCRYPTION_KEY_V1` : clés fictives de 32 octets
  encodés en base64 ;
- `AUDIT_ENCRYPTION_CURRENT_VERSION` : `1`.

Charger ces variables dans le processus de préparation et exécuter
`bun apps/web/scripts/e2e-setup.mjs`. Le setup applique les **52 migrations** et
prépare le compte racine de test. Son garde exige que `DATABASE_URL`, si elle
est définie pendant le setup, désigne une autre cible : utiliser une URL locale
fictive distincte, sans accéder à la base habituelle.

Pour le build et le serveur seulement, définir `DATABASE_URL` à la valeur de
`E2E_DATABASE_URL`, exécuter `bun run --filter web build`, puis lancer Next dans
`apps/web` sur `127.0.0.1:3118`. Le banc vérifie l'hôte local, le nom exact de base,
un port PostgreSQL différent de 5432 et le port HTTP 3118.

Depuis la racine, définir `AUDIT_ENV_FILE` avec le chemin du JSON privé :

```powershell
node docs/audits/fiche-utilisateur-2026-10-11/banc-integration/run.cjs
```

Les comptes cibles ont un suffixe propre à l'exécution. Les secrets TOTP sont
conservés à côté du JSON privé pour les connexions suivantes. Le script ne prend
pas de capture pendant l'inscription MFA ou l'affichage d'un mot de passe ; les
valeurs sensibles connues sont retirées des diagnostics d'échec. Après le banc,
fermer les processus possédés, arrêter le cluster puis supprimer uniquement le
répertoire temporaire vérifié. Ne pas conserver ses secrets dans le dépôt.

## Injections et limites

Les comptes fictifs et leurs droits initiaux sont préparés en SQL avant une
connexion complète. Le retrait des permissions et l'invalidation des dates de
preuve administrateur sont également réalisés directement dans cette seule
base d'essai. Ils servent à éprouver une session déjà ouverte ; ils ne constituent
pas une validation du formulaire qui produirait ces changements.

Pour la révocation en cours de consultation, seule l'horloge **Date du
navigateur** avance de 65 puis 130 secondes et une activité est déclenchée.
Les timers et l'horloge du serveur restent inchangés. Cela franchit le délai
de synchronisation d'activité existant sans simuler une expiration serveur.

Les pannes de réponse utilisent `route.fetch()` pour laisser réussir la vraie
mutation, puis `route.abort('connectionreset')` avant sa remise à l'interface.
Ces scénarios valident la reprise après écriture confirmée en base ; ils ne
simulent pas toutes les causes possibles de panne réseau ou de rollback.
Les rollbacks SQL sur échec d'audit sont couverts par le
[banc serveur](../banc-serveur/README.md).

Les délais de réponse simulés, changements d'acteur pendant une requête et
autres courses client relèvent du banc client complémentaire. Aucun résultat
de charge massive, de lecteur d'écran, de Safari ou d'appareil mobile physique
n'est déduit de ce protocole Chromium.
