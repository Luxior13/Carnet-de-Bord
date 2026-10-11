# Mon compte — banc serveur du 11 octobre 2026

Ce banc contrôle les routes personnelles avec PostgreSQL réel et complète les
parcours navigateur. Les résultats structurés sont dans
[observations.json](observations.json). Il ne constitue pas un audit de toutes
les routes d’authentification.

## Défauts reproduits et corrections

| Cas | Avant correction | Après correction |
| --- | --- | --- |
| Version de compte absente | Le parcours Next réel révèle que `SESSION_USER_SELECT` omet `updatedAt` : ni le rendu serveur ni `GET auth/me` ne fournissent la version nécessaire au profil et au contact. | Ajout de `updatedAt` à la projection partagée. Deux tests utilisant les vrais lecteurs de session API/SSR et un stockage simulé respectant le `select` échouent avant correction, puis passent. |
| Sessions actives | Une session dont `securityVersion` est ancienne apparaît encore si ses deux échéances sont valides. Reproduction SQL. | Lecture et nettoyage contrôlent la version et les dates. Le filtre sur la version actuelle de `User` protège aussi une nouvelle session créée après l’authentification de la requête. |
| Contact périmé | Avec l’ancien contrat, deux formulaires envoyés successivement obtiennent 200 et le second écrase le premier. Reproduction SQL. | `expectedUpdatedAt` est obligatoire ; une version périmée est refusée avec 409, même si la valeur proposée égale déjà celle du serveur. Une actualisation explicite permet de reprendre. |
| Révocation concurrente | Une session supprimée entre sa lecture et sa révocation déclenche une erreur Prisma `P2025`, rendue comme 500. Reproduction déterministe avec stockage simulé. | Suppression conditionnelle liée au compte et excluant le jeton courant ; zéro ligne supprimée donne 404 sans audit de réussite. |

Le mot de passe actuel dépassant 72 octets a aussi été vérifié avec bcrypt réel :
bcrypt accepte le préfixe, mais le service `verifyPassword` refuse déjà la saisie
trop longue. Ce point est **validé sans correction**, pas un contournement trouvé.

## Environnement et lancement

- PostgreSQL 17, cluster temporaire local fourni pour l’audit, port `54596`.
- Base dédiée `account_service_test`, **52 migrations appliquées** par le banc
  principal avant les tests. Aucune base distante consultée.
- [Test SQL exécutable](../../../../apps/web/src/__tests__/account-postgres.test.ts) :
  URL explicite obligatoire, limitée à `localhost` ou `127.0.0.1` et au nom exact
  `account_service_test`. Sans variable, ces tests sont ignorés.
- Le test crée uniquement des comptes, sessions, credentials et codes fictifs.
  Il réutilise son compte racine fictif au prochain lancement. Les audits sont
  conservés ; aucune purge ni réécriture de migration. Les triggers temporaires
  injectant une panne d’audit sont supprimés dans un `finally`.

Depuis la racine, avec le cluster temporaire démarré :

```powershell
$env:ACCOUNT_TEST_DATABASE_URL = 'postgresql://postgres@127.0.0.1:54596/account_service_test?schema=public'
Push-Location apps/web
bun run test src/__tests__/account-postgres.test.ts
Pop-Location
Remove-Item Env:ACCOUNT_TEST_DATABASE_URL
```

La commande ne démarre ni ne migre PostgreSQL. Adapter le port seulement à un
autre cluster **isolé**, jamais à la configuration courante du projet.

## Contrôles exécutés

**23 scénarios SQL réussis** :

- Refus anonyme ; autonomie du profil refusée sans retirer les protections
  personnelles obligatoires ; projection de `auth/me` sans hash ni jeton ;
  modification du contact par le compte racine lui-même.
- Sessions : exclusion/nettoyage des échéances et versions invalides, isolation
  entre comptes et conservation d’une session de version plus récente.
- Contact : version obligatoire, formulaire périmé, faux no-op périmé,
  normalisation, retrait après actualisation, deux écritures concurrentes,
  remise à zéro de la vérification et rollback lors d’un échec d’audit.
- Profil : nom facultatif vide, une seule écriture concurrente acceptée et
  rollback des valeurs/version si l’audit échoue.
- Mot de passe : borne bcrypt, remplacement réel, maintien de la session
  courante et révocation des autres, effacement des preuves récentes,
  changement obligatoire, refus après disparition de la session source,
  rollback du hash/version/sessions/audit.
- Révocations : propriété, session courante protégée, révocation unitaire et
  globale, demandes concurrentes et rollback de l’audit.
- MFA : annulation d’un remplacement préparé ; échec de confirmation avec
  rollback puis réussite ; ancien défi refusé même avec son ancien cookie ;
  régénération des codes avec rollback de la consommation TOTP puis réussite ;
  refus d’un TOTP rejoué. Les dates limites de la session initiale sont conservées
  après rotation. Les anciens codes cessent de correspondre, les nouveaux
  correspondent aux hashes, et aucun secret n’entre dans les audits.

Les suites ciblées des routes contact/sécurité et celles des transactions/MFA
sont également rejouées. Le détail des fichiers et résultats figure dans le JSON.
TypeScript et lint ciblé sont réussis. Le build et les parcours HTTP/navigateur
relèvent du banc principal.

Le complément de session ajoute deux régressions : **36 tests de transactions
d’authentification réussis** après correction. Le défaut de projection avait été
masqué dans les premiers tests SQL par leur source d’authentification simulée.
Ce complément contrôle précisément cette projection ; le banc Next réel exige
désormais aussi une version dans `auth/me` et une sauvegarde depuis le rendu
serveur, avec résultat d’intégration consigné séparément.

## Limites de la preuve

- Les handlers, autorisations effectives, validations, transactions Prisma,
  contraintes PostgreSQL, audits, bcrypt, chiffrement MFA et TOTP sont réels.
- La source `getAuthSession`, les cookies et les en-têtes sont simulés. Les
  fixtures SQL remplacent une connexion préalable ; ce banc ne prouve pas la
  distribution des cookies ni le middleware CSRF. Le garde de version après
  authentification est testé avec un instantané volontairement périmé.
- Les limiteurs renvoient un quota disponible : résistance à la saturation et
  délais de blocage non mesurés ici. Les mots de passe initiaux fictifs sont
  hashés avec un coût 4 pour accélérer les fixtures ; les changements utilisent
  le service réel et son coût 12. Aucun benchmark de charge n’est revendiqué.
- La clé MFA du test est une constante réservée aux fixtures isolées. Elle ne
  provient d’aucun fichier d’environnement du projet. Les codes ne sont ni
  écrits dans ce dossier ni inclus dans les résultats.
- Les pannes d’audit sont injectées par un trigger ciblant le compte fictif.
  Elles démontrent le rollback SQL ; elles ne simulent pas une coupure réseau
  après commit. La perte de réponse et la reprise de l’interface sont à vérifier
  dans le banc navigateur.
- Le test de révocation simultanée SQL dépend de l’ordonnancement PostgreSQL ;
  le test de route simule en complément, de façon déterministe, la disparition
  entre lecture et suppression.

L’API fonctionnelle `generate` d’otplib 13.4.1 utilisée pour les preuves TOTP a
été vérifiée via Context7 dans la
[documentation officielle](https://github.com/yeojz/otplib/blob/main/apps/docs/guide/getting-started.md).
Pas de migration, index ou extraction de service ajouté : les responsabilités
des routes et les transactions de sécurité existantes suffisent à ces corrections.
