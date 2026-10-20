# Mon compte — intégration Next, PostgreSQL et Chromium

Le [script](run.cjs) utilise Next en production sur `http://127.0.0.1:3119`,
PostgreSQL 17 local sur le port 54596 et la base exacte `account_audit_test`.
Les 52 migrations ont été appliquées et `e2e-setup.mjs` a préparé le seul compte
racine fictif. Chaque lancement crée un autre compte USER fictif pour les parcours.

Le fichier privé `AUDIT_ENV_FILE`, conservé uniquement dans un dossier temporaire,
contient `E2E_DATABASE_URL`, `WEB_URL`, `E2E_SUPERADMIN_LOGIN_NAME`,
`E2E_SUPERADMIN_PASSWORD` et les clés de chiffrement de ce banc. Le processus Next
doit utiliser ces mêmes valeurs et `DATABASE_URL=E2E_DATABASE_URL`.
Le script refuse une base ou origine différente des cibles locales attendues.

```powershell
$env:AUDIT_ENV_FILE = 'CHEMIN_TEMPORAIRE_DU_BANC/env.json'
node docs/audits/mon-compte-2026-10-11/banc-integration/run.cjs
```

Cette commande ne démarre ni ne migre la base, ne lance pas Next et ne lit pas
la configuration habituelle du projet. Les fichiers de secrets du banc ne sont
pas versionnés. L'environnement temporaire est à recréer pour une autre passe.

## Ce qui est réel et ce qui est injecté

Les connexions, mots de passe, enrôlement MFA initial, TOTP, cookies de session,
CSRF, permissions, handlers, transactions Prisma et PostgreSQL sont réels.
Les requêtes authentifiées partent du navigateur avec ses cookies. La création
initiale du compte et le retrait d'autonomie du profil utilisent des fixtures SQL.

La perte de réponse du contact est injectée **après** le succès réel du handler
et son commit : le proxy Playwright transmet la requête puis coupe le retour au
navigateur. L'état SQL et une relecture HTTP confirment le résultat, avec un seul
PATCH. La relecture des droits à chaud avance seulement l'horloge Date du client
puis déclenche l'activité ; l'horloge du serveur et les échéances SQL sont intactes.

La copie des codes utilise le presse-papiers Chromium. Le téléchargement est
contrôlé dans un fichier temporaire immédiatement supprimé. Codes, mots de passe
et clés TOTP sont exclus des captures et résultats. Les captures présentent
uniquement des comptes fictifs : [Profil bureau](profile-1440.png),
[Profil mobile](profile-390.png), [Sécurité bureau](security-1440.png),
[Sécurité mobile](security-390.png). Sur mobile, la capture correspond à la partie
visible du conteneur défilant, pas à toutes les cartes simultanément.

## Défaut découvert par ce banc

Le premier enregistrement s'arrêtait avant toute requête avec « Actualisez la
version du profil ». Entrée déclenchait bien le formulaire ; `updatedAt` manquait
dans la projection SQL de session, donc dans le snapshot SSR et `/api/auth/me`.
L'ancien banc simulé fournissait artificiellement cette version. La correction
ajoute le champ à la projection et deux régressions qui respectent les champs
réellement sélectionnés. Le parcours exige désormais cette date et enregistre
depuis la page réellement chargée.

## Limites

Chromium seul, comptes fictifs et base locale ; pas de Safari/iOS, lecteur d'écran,
extension de mots de passe, clavier virtuel ou test de charge. La révocation
globale, le remplacement MFA, son annulation et les pertes de réponse mot de
passe/MFA sont exercés par les bancs SQL et/ou client simulé, pas en entier par
ce script. Aucun succès sur ces combinaisons réelles n'est déduit des autres cas.
Les contrôles de quota ne constituent pas une mesure de résistance à une attaque.

**12 scénarios réussis** dans Chromium 149.0.7827.55. Les
[résultats de cette exécution](resultats.json) sont repris dans le
[rapport principal](../../2026-10-11-mon-compte.md).
Une première passe s'était arrêtée sur le défaut réel de version décrit plus
haut ; une autre sur la comparaison du presse-papiers Windows (CRLF contre LF).
La dernière passe complète réussit après correction produit puis normalisation
des fins de ligne dans la seule assertion du banc.
