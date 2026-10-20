# Création d'utilisateur — revue du 11 octobre 2026

## Périmètre et état examiné

Demande : « page suivante », après la revue approfondie de la liste Utilisateurs.
Page retenue : `/systeme/utilisateurs/nouveau`, son contrôleur, POST `/api/users`,
création transactionnelle, génération du secret et dépendances de reprise.
Le [suivi courant](../pages/systeme/utilisateurs/README.md) porte les décisions
applicables ; le [rapport du 10 octobre](2026-10-10-creation-utilisateur.md)
reste une preuve historique distincte.

Départ : branche `main`, commit `d1d61ee`, arbre propre, projet en développement. Windows,
Node 24.14.0, Bun 1.4.2, Next 15.5.23, React 19.1.8, Prisma 6.19.3,
PostgreSQL 17 local et Chromium. Deux bases jetables exclusivement :
`creation_service_test` pour les transactions et `creation_audit_test` pour Next,
sur le port local 54594. Les 52 migrations existantes ont été appliquées.
Aucune utilisation des données habituelles ni nouvelle migration.

Risque sensible : création d'un compte et remise de son secret initial. La
création ne devient ni une fiche Personne, ni un envoi d'email, ni une nouvelle
capacité de récupération par email. La composition issue du design system et
les composants partagés sont conservés.

## Sélection des sujets

| Sujets | Classement et contrôle utile |
| --- | --- |
| Q01–Q04 | À examiner : besoin, parcours, contenu, composition, focus et responsive |
| Q05 | À examiner uniquement pour la recherche exacte après réponse perdue ; liste générale déjà auditée séparément |
| Q06–Q07 | À examiner : validation, double soumission, états occupés, erreurs et retours locaux |
| Q08 | Non applicable : remise manuelle du secret ; aucune notification différée requise |
| Q09–Q12 | À examiner : droits effectifs, ADMIN protégé, données privées, secret, contraintes User et réservation |
| Q13 | Hors impact produit : aucun changement de schéma ; migrations existantes rejouées pour les bases isolées |
| Q14–Q15 | À examiner : concurrence, atomicité compte/réservation/audit et reprise après panne |
| Q16 | Hors impact : aucune suppression ; réservation d'un identifiant renommé contrôlée |
| Q17–Q19 | À examiner : projection inutile, coût borné, séparation du service et générateur partagé ; pas de cache ajouté |
| Q20–Q21 | Non applicable au formulaire : aucune pièce ni import/export ; inscription MFA utilisée comme dépendance de première connexion |
| Q22 | À examiner : délais POST/GET, expiration des preuves sensibles et code TOTP |
| Q23–Q26 | Non applicable : pas d'automatisation, fournisseur, gouvernance, relation esport ou finance dans cette création de compte |
| Q27 | À examiner : contrôleur, navigateur simulé, transactions SQL et parcours réel distingués |
| Q28–Q29 | Hors impact : configuration de déploiement, conservation, chiffrement et sauvegardes inchangés ; environnements d'essai jetables |
| Q30 | À examiner : documentation, déclaration de la variable de test et API crypto native ; aucune dépendance ajoutée |

## Constats et corrections

| Point | Déclencheur et effet | Correction et état |
| --- | --- | --- |
| USR-N08 — P2, copie tardive | La copie du secret A finit après remise à zéro/création de B et affiche un succès sous le mauvais secret | Numéro d'opération invalidé à chaque copie, reset, nouveau succès et démontage ; tests contrôleur et navigateur : **clos** |
| USR-N09 — P2, focus ADMIN | Annuler le défi administrateur ne rend pas le focus au bouton de création | Retour local au bouton s'il existe et est disponible, sans détourner le focus du succès ; reproduction avant/après : **clos** |
| USR-N10 — P2, texte contact | L'aide promettait une récupération de compte par email, absente du parcours courant | Adresse de contact facultative, distincte de l'identifiant et jamais utilisée pour se connecter ; **clos** après relecture |
| USR-N11 — P2, dette du service | Création métier dans le module d'authentification, audit facultatif dans sa signature, prélecture complète du compte pour détecter un doublon | Service extrait dans `features/users/server`, audit exigé, prélecture limitée à `id` ; refus, transactions SQL et parcours Next vérifiés : **clos** |
| USR-N12 — P2, dette du générateur | Tirages par modulo et test recopiant l'algorithme au lieu d'appeler le code utilisé | Générateur partagé création/reset utilisant `crypto.randomInt`, contrat de 14 caractères conservé, tests du vrai export et première connexion réelle : **clos** |

USR-N12 est un durcissement de l'implémentation et des preuves ; aucune
compromission n'a été observée. Les tirages de caractères et de permutation
évitent le biais modulo. Le coût bcrypt reste à 12. La copie ne vaut toujours
pas confirmation de conservation ; une réponse perdue ne vaut pas annulation.
La [documentation Node 24](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptorandomintmin-max-callback)
a été consultée via Context7 pour l'API `randomInt` utilisée.

Le retour de focus de la garde de navigation existante est maintenant branché
explicitement. Les boutons « Rester » des dialogues de départ et de remise à
zéro fonctionnaient déjà dans le banc ; aucun défaut supplémentaire n'est déduit
de la seule absence du branchement explicite.

## Données et architecture

- Le POST conserve les gardes d'authentification et de permissions effectives.
  `users:create` dépend de `users:view`. Un ADMIN ne peut être créé que par le
  compte protégé après preuve mot de passe/MFA récente.
- Le schéma partagé strict borne les champs ; des propriétés injectées telles
  que `isProtected`, `permissions` ou `password` sont refusées.
- `User` représente le compte ; aucun `Person`, relation esport ou session n'est
  créé implicitement. Le prénom et l'identifiant sont requis, le nom reste
  facultatif. Le service existant écrit `''` pour ce nom vide ; le schéma accepte
  aussi `null`, normalisé pour la lecture. L'email absent est stocké `null`.
- L'unicité SQL et la réservation permanente protègent aussi les courses et les
  anciens identifiants renommés. Compte, réservation et audit réussissent ou
  échouent ensemble. Le hash est calculé avant la transaction.
- Le mot de passe temporaire est renvoyé uniquement au créateur dans la réponse
  initiale. Le GET de reprise ne le relit pas. Ni hash ni secret initial ne sont
  présents dans l'audit contrôlé. Le navigateur conserve le secret en état local.
- Le nouveau service est spécifique aux utilisateurs. Le générateur est partagé
  avec la réinitialisation ; les tests transactionnels de cette dernière sont
  conservés. Aucun composant supplémentaire, cache, index ou modèle n'est utile.

## Preuves et validation

### Navigateur avec dépendances simulées

[Banc et instructions](creation-utilisateur-2026-10-11/banc-client/README.md),
[observations](creation-utilisateur-2026-10-11/banc-client/preuves/observations.json),
[reproduction du focus avant](creation-utilisateur-2026-10-11/banc-client/preuves/avant-focus-admin.json)
et [après correction](creation-utilisateur-2026-10-11/banc-client/preuves/apres-focus-admin.json).

28 scénarios réussis avec les vrais composants, contrôleur et CSS ; API, acteur,
routeur et presse-papiers simulés. Largeurs 320, 390, 768, 1 440 et 1 920 px,
aucun débordement document/contenu. Validation, radios clavier, reprise exacte,
double envoi, attente, annulations, copie rejetée/tardive, révocation et changement
d'acteur exercés. Les délais de 30 et 15 secondes utilisent une horloge accélérée.

### Transactions PostgreSQL et serveur réel

[Banc serveur](creation-utilisateur-2026-10-11/banc-serveur/README.md) :
23 tests POST avec stockage/session simulés et 5 tests de transaction sur la
base PostgreSQL réellement migrée. Création USER/ADMIN, bcrypt réel, concurrence
d'un même identifiant, réservation historique et rollback de panne d'audit
suivi d'une reprise réussie. Les en-têtes de requête et l'acteur du service sont
préparés ; ce banc ne revendique pas une connexion HTTP.

[Banc d'intégration](creation-utilisateur-2026-10-11/banc-integration/README.md) :
**9 scénarios réussis** sur Next production, vrai PostgreSQL et Chromium
149.0.7827.55. Connexions mot de passe/MFA réelles du compte protégé, du nouveau
compte et d'un créateur délégué. Le compte nouvellement créé effectue son
inscription MFA, le changement imposé du secret initial puis une nouvelle
connexion avec son nouveau mot de passe et TOTP.

Également contrôlés : sept largeurs de 320 à 1 920 px, email invalide sans POST,
normalisation, nom vide, focus et doublon, presse-papiers réel, CSRF et propriétés
injectées refusés, défi ADMIN annulé puis validé, création perdant sa réponse
après commit et reprise exacte, absence de secrets dans le GET et l'audit,
créateur délégué refusé pour ADMIN puis refusé après retrait de son droit de
création. Les mutations de preuve/droits concernent uniquement les fixtures.
Les résultats client simulés restent distincts de ces neuf parcours réels.

### Contrôles finaux

| Vérification du 11 octobre | Résultat |
| --- | --- |
| `bun run --filter web test`, avec `USER_CREATION_TEST_DATABASE_URL` local dédié | **1 161 réussis, 41 ignorés** ; les 5 tests SQL de création sont exécutés. Les 18 tests SQL Personnes et 23 tests SQL de liste Utilisateurs sont ignorés faute de leurs URL dédiées |
| `bun run --filter web build` | Réussi, dont lint et contrôle des types ; génération des 19 pages statiques et traces |
| `bun run --filter web typecheck` | Réussi |
| `bun run --filter web check:architecture` | Réussi |
| `bun run --filter web check:performance` | Réussi ; création : 276 620 octets gzip agrégés par le script du dépôt |
| `bun run docs:check` | Réussi : 210 fichiers et 1 340 liens locaux/index contrôlés |
| `bun run docs:check:test` | 6 tests réussis |
| `git -c core.safecrlf=false diff --check` | Réussi |

Un premier build a révélé la variable dédiée du nouveau test SQL non déclarée
dans Turbo et des annotations de test à compléter. Ils ont été corrigés avant
le build final réussi. Cela ne correspondait pas à un échec du parcours produit.
Les durées Vitest et la taille des bundles ne constituent pas une mesure de
capacité du serveur ; aucune charge massive n'est annoncée.

**Conforme sur le périmètre vérifié ; USR-N08 à USR-N12 clos.** La remise manuelle,
la reprise après réponse perdue et les droits restent explicitement cadrés. Le
schéma existant suffit ; la refactorisation ne change pas les données.
Le serveur Next et le cluster possédés par l'audit ont été arrêtés ; les deux
bases et les secrets fictifs de l'environnement temporaire ont été supprimés.
Les preuves conservées ont été contrôlées pour exclure ces secrets.

## Limites et réexamen

Chromium de bureau et dimensions de viewport ne prouvent pas Safari, un appareil
physique, le clavier virtuel ni une lecture au lecteur d'écran. Aucun essai de
charge de création massive ou audit exhaustif d'authentification n'est revendiqué.
Les extensions de mots de passe ne sont pas exécutées ; le contrat local sans
autocomplétion reste celui du design system.

La modification de la fiche utilisateur est une page distincte. Une lecture de
son PATCH a repéré `if (lastName)`, qui ignore une chaîne vide pour le nom
facultatif. Le suivi porte USR-D10 à vérifier/corriger lors de sa prochaine passe ;
cela ne remet pas en cause la création d'un compte sans nom.

Réexaminer après changement des droits, de la garde de navigation, du contrat de
réponse ou de reprise, du générateur, des contraintes User/réservation ou de la
remise du secret. Les preuves historiques du 10 octobre ne sont pas réétiquetées.
