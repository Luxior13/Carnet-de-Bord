# Création de personne — intégration du 12 octobre 2026

**11/11 parcours réussis** dans Chromium 149.0.7827.55, avec le build Next
15.5.23 et PostgreSQL 17. Le [runner](run.cjs) et les
[résultats](resultats.json) décrivent les actions exécutées. Départ propre :
`5706bba`, puis corrections de cette passe au build final.

## Environnement

Cluster temporaire lié à `127.0.0.1:54610`, base `person_creation_test`,
52 migrations appliquées. Le setup existant `apps/web/scripts/e2e-setup.mjs`
crée un compte fictif protégé ; un second compte n'a que les permissions
`persons:view` et `persons:create`. Next écoute sur `127.0.0.1:3124`.

Les mots de passe et clés de chiffrement sont aléatoires et réservés au banc.
La configuration privée contient `E2E_DATABASE_URL`,
`E2E_SUPERADMIN_LOGIN_NAME`, `E2E_SUPERADMIN_PASSWORD`, `WEB_URL`,
`NEXT_PUBLIC_WEB_URL`, `MFA_ENCRYPTION_KEY_V1`, `AUDIT_ENCRYPTION_KEY_V1`
et `AUDIT_ENCRYPTION_CURRENT_VERSION`. Le runner la lit via `AUDIT_ENV_FILE`,
vérifie les adresses, ports et nom de base, et ne retombe jamais sur `.env`
ou une `DATABASE_URL` implicite. La base habituelle du projet n'est pas utilisée.

Mot de passe, configuration initiale MFA ou connexion TOTP suivante, cookies,
CSRF, middleware, permissions, composants, mutations, audit et transactions
utilisent leurs implémentations réelles. Les fixtures sont les seules données
modifiées. Les audits restent dans la base jetable jusqu'à son nettoyage.

Le [banc serveur](../banc-serveur/README.md) utilise une **autre base**, nommée
`person_creation_service_test`, sur le même cluster. Ses 16 scénarios ne sont
pas comptés comme des parcours navigateur supplémentaires.

## Reproduction avant correction

Le [résultat avant correction](avant-integration.json) provient du build de
la passe Accueil précédente, avec les sources de création de `5706bba`.
Le navigateur envoie un POST réel ; l'interception attend sa réponse **201**
avant de simuler une coupure réseau. SQL confirme qu'une fiche existe déjà.
L'ancien formulaire réactive sa soumission ; un deuxième POST crée une seconde
fiche de même pseudo. SQL confirme **deux fiches**. Les homonymes étant permis,
aucune contrainte n'interdit cette répétition.

Le défaut est l'absence d'explication et de garde devant un résultat incertain,
pas l'autorisation d'homonymes. La correction ne crée aucune garantie
d'idempotence : une relance explicitement confirmée demeure une nouvelle création.

## Parcours après correction

1. Pseudo seul avec espaces extérieurs : valeur normalisée, identité civile
   et naissance nulles, statut extérieur, version 1, audit et historique
   chiffré présents ; fiche ouverte sur Identité puis retour aux filtres.
2. Prénom et nom sans pseudo : normalisation, statut Dans la structure,
   soumission par Entrée, persistance et ouverture de la fiche.
3. Formulaire vide et corrections : aucun POST invalide, focus du champ,
   erreurs actualisées, annulation du départ avec saisie/focus conservés,
   puis départ explicitement confirmé.
4. Cadre complet à 320, 360, 390, 768, 1 024, 1 440 et 1 920 px : un `main`,
   un `h1`, focus clavier, aucun débordement du document, barre hors carte.
5. Réponse perdue **après un commit réel** : message incertain, identité
   conservée, relance bloquée, recherche dans un nouvel onglet retrouvant la
   fiche, retour au formulaire sans nouvelle requête. Une seule fiche existe.
6. Coupure **avant transmission** : aucune fiche créée, confirmation explicite
   de reprise, nouveau POST réel puis une seule fiche enregistrée.
7. Retour externe neutralisé, espaces seuls sans confirmation inutile,
   annulation vers le Répertoire.
8. Compte lecture/création : création et ouverture autorisées, administration
   refusée ; retrait de création en base puis POST 403 et formulaire retiré
   après rechargement.
9. Anonyme ou cookie forgé : accès privé redirigé vers la connexion et
   création refusée. Aucun contournement de garde depuis le client.
10. Deux soumissions synchrones : une seule personne et un seul audit.
11. Chargement réel de la fiche ralenti après le commit : un verrou temporaire
    sur Person bloque uniquement la lecture suivante. Le serveur diffuse son
    vrai squelette ; le fil d'Ariane ne propose aucun lien Répertoire qui
    perdrait les filtres. Après libération du verrou, le titre réel et le lien
    contextuel apparaissent, puis le retour conserve les critères. Le verrou
    est libéré dans un `finally`, exclusivement dans cette base isolée.

Les coupures sont injectées dans le transport du navigateur. Elles ne simulent
ni le résultat de la transaction ni les permissions. Aucune erreur JavaScript
observée. Captures du cadre réel inspectées à
[320 px](creation-320.png) et [1 440 px](creation-1440.png).

La première passe finale a révélé un vrai lien sans contexte pendant le
squelette de la fiche (REP-N06). Le contrôle principal attend le titre réel
avant de vérifier le retour ; le onzième scénario qualifie séparément le
chargement après sa correction. Le lien statique erroné est retiré du squelette.

Les rechargements rapprochés du banc ont aussi atteint la limite de douze
requêtes de disponibilité par minute. Le runner respecte désormais
`Retry-After` puis utilise Revérifier ; la passe finale a attendu 18 secondes.
Les limites du produit n'ont pas été désactivées. Ce refus temporaire du banc
ne constitue ni une écriture ratée ni une preuve de panne métier.

## Rejouer

Préparer un cluster et une base dédiés aux adresses ci-dessus, avec un fichier
privé de configuration. Injecter ses variables dans le setup, retirer une
éventuelle `DATABASE_URL`, puis lancer `bun scripts/e2e-setup.mjs` depuis
`apps/web`. Construire et lancer Next avec `DATABASE_URL` explicitement fixée
à `E2E_DATABASE_URL`, les URL et clés locales. Après disponibilité du serveur,
depuis la racine :

```powershell
node docs/audits/creation-personne-2026-10-12/banc-integration/run.cjs
```

`AUDIT_BASELINE=1` rejoue uniquement la reproduction avant correction et exige
le build correspondant. Retirer cette variable pour la passe finale.
Les TOTP nécessaires aux reconnexions sont conservés uniquement dans le dossier
privé temporaire ; le runner attend le créneau suivant si un code vient d'être
consommé. Les erreurs imprimées sont expurgées. Aucun QR, code de secours,
cookie, secret ni copie sensible du HTML n'est archivé.

Le runner ferme les navigateurs et Prisma dans un `finally`. Après cette passe,
Next et le cluster ont été arrêtés ; les deux bases, clés, secrets TOTP et
journaux ont été supprimés après vérification du dossier temporaire. La
recherche des secrets privés dans les 26 fichiers texte modifiés ou ajoutés
n'a trouvé aucune occurrence. Une reproduction doit effectuer le même nettoyage.

## Limites

HTTP loopback sur Windows, pas de proxy/TLS de déploiement, lecteur d'écran,
appareil physique, test de charge ou extension de gestion de mots de passe.
Les disponibilités changeantes, réponses tardives après démontage, panne de
navigation après succès et délai accéléré sont contrôlés dans le
[banc client](../banc-client/README.md), avec simulations déclarées.
La recherche de nom aide à vérifier ; elle ne prouve pas l'unicité d'une personne.
La revue ne certifie pas tous les dialogues et suppressions de la fiche créée.

[Rapport de la page](../../AUDIT_CREATION_PERSONNE_2026-10-12.md).
