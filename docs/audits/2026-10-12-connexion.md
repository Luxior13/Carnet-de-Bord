# Connexion et MFA — revue complète du 12 octobre 2026

## Périmètre et départ

Poursuite demandée de la revue page par page : `/login`, identification,
vérification MFA, première configuration obligatoire, codes de secours et
reprise de session. Le [suivi Connexion](../pages/connexion.md) porte les
règles courantes. Les preuves du 10 et du 11 octobre restent historiques.

Départ propre au commit `0fd674a`, projet en développement. Les corrections
conservent les composants partagés, la MFA obligatoire, les règles de confiance
de l'appareil, le stockage facultatif et l'interdiction d'autocomplétion décidée
par l'utilisateur. Aucune nouvelle méthode d'authentification ni récupération
publique de compte n'est ajoutée.

Le périmètre comprend la page, `UserContext`, les routes login/MFA/session et
la création transactionnelle de session. Les composants MFA partagés sont
consommés par la connexion, Mon compte et la configuration obligatoire du
cadre authentifié. `MfaActionDialog` et `MfaRecoveryCodesPanel` sont examinés ;
aucun changement de production n'y est nécessaire pour cette passe.

Les essais utilisent des identités fictives. Le banc client simule les réponses
HTTP ; les tests serveur utilisent PostgreSQL isolé avec les migrations du
projet. Aucun compte ni base habituelle n'est utilisé. Aucun mot de passe,
cookie, QR opérationnel, secret TOTP ou code de secours n'est conservé dans
les preuves du navigateur.

Le [banc serveur](connexion-2026-10-12/banc-serveur/README.md) utilise PostgreSQL
17 sur un cluster local dédié et la base `login_service_test`, avec 52
migrations existantes appliquées. Les horloges des courses SQL sont réelles ;
seules les échéances des fixtures sont raccourcies pour observer l'expiration
pendant l'attente du verrou.

## Sélection de la revue générale

| Sujets | Classement et justification |
| --- | --- |
| Q01–Q04 | À examiner : entrée publique, parcours progressif, composants, clavier, focus et responsive |
| Q05 | Non applicable : pas de recherche, filtre ni pagination ; les dix codes sont une remise de secrets, pas une liste de gestion |
| Q06–Q07 | À examiner : saisies, collage, validation, attentes, erreurs locales et copie |
| Q08 | Non applicable : aucun destinataire différé ni nouvelle notification nécessaire |
| Q09–Q11 | À examiner : session, MFA, compte protégé, stockage local et confidentialité des secrets |
| Q12 | À examiner : contraintes et relations existantes des sessions, défis et preuves consommables ; aucune nouvelle table |
| Q13 | Hors impact produit : aucune migration nouvelle ; migrations existantes utilisées pour les bases isolées |
| Q14–Q16 | À examiner : double appel, consommation unique, transaction, audit obligatoire et annulation du défi |
| Q17–Q18 | À examiner : attentes bornées, limites d'essais et concurrence ; aucune optimisation spéculative ni mesure de charge générale |
| Q19 | À examiner : responsabilité page/contexte, signaux d'annulation et consommateurs MFA partagés |
| Q20–Q21 | À examiner uniquement pour la copie et le fichier local des codes de secours ; aucun import ni export métier en masse |
| Q22 | À examiner : échéances de session et de défi, code temporel, expiration pendant l'attente d'un verrou |
| Q23 | Hors impact : aucun service externe ni traitement différé ajouté ; pas d'appel réseau à l'application Authenticator |
| Q24–Q26 | Non applicable : aucune décision de structure, parcours esport, finance ou contrat dans cette entrée technique |
| Q27–Q28 | À examiner : preuves par couche, reprise réseau et intégration de session ; déploiement non modifié |
| Q29 | Hors impact : format de sauvegarde inchangé ; rollback SQL vérifié, restauration complète non exécutée |
| Q30 | À examiner : contrats, variable dédiée aux tests SQL et documentation ; aucune dépendance ajoutée |

## Résultat et corrections

**Conclusion au périmètre testé** : les six défauts identifiés sont corrigés et
vérifiés. Les 30 parcours client, 17 scénarios PostgreSQL et 12 parcours
Next/MFA réels réussissent. La suite web, le build, les types et les budgets
passent. AUTH-01 est clos sur ces parcours ; AUTH-02 et les limites
d'exploitation ci-dessous restent explicites.

| ID | Défaut et impact | Correction et preuve | État |
| --- | --- | --- | --- |
| AUTH-03 · P2 | Une attente réseau de connexion, vérification ou retour pouvait laisser l'écran bloqué ; une ancienne réponse pouvait encore produire des effets après départ ou annulation. | Délais de 30 s sur les opérations de la page et l'annulation de configuration ; lectures de session bornées à 15 s. Signal d'annulation, identité de requête et génération d'opération du contexte contrôlés. Tests client/contexte et navigateur avec réponses retardées. | Clos au périmètre testé |
| AUTH-04 · P2 | Une vérification MFA dont la réponse est perdue était présentée comme un simple échec, alors que session et consommation du code pouvaient déjà être validées. | État incertain distinct, code effacé, nouveau POST bloqué. GET volontaire « Vérifier la session », puis reprise explicite par les identifiants si nécessaire. Deux scénarios simulés couvrent session retrouvée et absente ; le banc HTTP endommage le JSON après commit et livraison des vrais cookies, puis retrouve la session sans second POST. | Clos au périmètre testé |
| AUTH-05 · P2 | Le collage natif d'un TOTP contenant un espace ne conservait que cinq chiffres : `maxLength` agissait avant la normalisation. | Un code complet collé est normalisé avant la limite native ; saisie bornée et validation conservées. Reproduction Chromium avant/après, collage du code de secours groupé et deux régressions ciblées. | Clos après vérification |
| AUTH-06 · P2 | Après un refus, le focus pouvait viser un champ encore désactivé ou rester sans destination utile ; la bascule entre TOTP et secours ne ramenait pas à la saisie. | Focus sur l'erreur après réactivation, puis Tab vers le champ ; bascule vers le champ approprié. Erreur d'identification locale, sans toast dupliqué. Parcours clavier à 390 et 1 440 px. | Clos après vérification |
| AUTH-07 · P2 | Après expiration de la configuration MFA obligatoire, le message demandait de recommencer mais le QR restait affiché, sans étape de préparation accessible dans le mode sans Annuler. | PUT 401 retire QR, clé et code, puis revient à l'autorisation explicite. Aucun nouvel appel automatique. Confirmation incertaine retire aussi le secret et demande une relecture ; préparation incertaine d'un remplacement explique la possible consommation de sa preuve. Banc client, dont mode obligatoire sans Annuler. | Clos au périmètre testé |
| AUTH-08 · P1 | La création de session contrôlait l'expiration d'un défi ou d'une session source avec une heure antérieure à l'attente du verrou utilisateur. Une preuve expirée pendant cette attente pouvait encore être acceptée. | LOGIN et SETUP répondaient 200 au lieu de 401 après une attente constatée dans `pg_locks`. Nouvelle heure prise après le verrou : les deux refusent désormais sans session ni audit de succès. Deux autres tests vérifient les échéances absolue/inactive de session source. [Preuve SQL](connexion-2026-10-12/banc-serveur/observations.json). | Clos après vérification SQL |

Les politiques ne changent pas : le mot de passe seul ne crée pas de session
authentifiée ; TOTP ou code de secours termine la connexion. « Faire confiance
à cet appareil » reste un choix explicite, avec les limites annoncées et
l'exception du superadmin appliquées par le serveur. Aucun ancien identifiant
n'est réinjecté par l'application. Le stockage local indisponible ne bloque pas
le parcours. `next` passe par le validateur interne existant.

Les relations, contraintes et index Prisma existants conviennent à ce besoin :
secret TOTP séparé du compte et chiffré, codes salés/hachés, défi unique par
utilisateur, jeton de session haché, dates d'expiration et version de sécurité.
Aucune migration, table, permission, dépendance ou cache n'est ajouté.
L'enrôlement conserve sa fenêtre existante de dix minutes après préparation ;
cette passe n'invente pas de nouvelle politique de durée absolue.

Une annulation réseau ne prouve pas l'annulation du traitement serveur. Après
réponse MFA perdue, un GET peut retrouver la session si le cookie a été reçu ;
une absence de session côté navigateur ne prouve pas que le code est encore
utilisable. La reprise demande un nouveau code de l'application ou un autre
code de secours. Aucun renvoi automatique n'est ajouté.

## Choix des éléments et composants

| Élément | Décision et contrôle |
| --- | --- |
| Cadre public | Formulaire centré et surfaces du design system conservés ; pas de barre d'enregistrement de fiche ni de navigation privée artificielle |
| Identifiant et mot de passe | `Input`, `Label`, bouton de visibilité et formulaire natif ; borne de 32 caractères pour l'identifiant, normalisation avant appel, aucun stockage du mot de passe |
| Confiance de l'appareil | `Checkbox` et explication de la portée ; choix envoyé au serveur, aucune préférence locale persistante ajoutée |
| Code MFA | `MfaCodeInput` partagé ; six chiffres ou code de secours Base32, collage, libellés et clavier adaptés ; aucune soumission automatique au sixième chiffre |
| Retours d'erreur | Message local focalisé, reprise clavier et états d'attente distincts ; aucune notification persistante pour un refus de connexion |
| Configuration et codes | QR/clé limités à la préparation, codes remis une fois, copie et téléchargement explicites ; confirmation de conservation avant Terminer |
| Modale de configuration | `MfaSetupDialog` conserve son obligation et son annulation asynchrone ; délai et réponse après démontage protégés ; focus vérifié dans le banc client |

## Validation disponible

| Contrôle exécuté le 12 octobre | Résultat et portée |
| --- | --- |
| [Banc client](connexion-2026-10-12/banc-client/README.md) | **30/30** parcours Chromium ; vraie page, contexte, composants et CSS, réponses HTTP et navigation Next simulées ; sept largeurs de 320 à 1 920 px, clavier, stockage bloqué, reprises, timeouts et StrictMode |
| [Collage natif avant/après](connexion-2026-10-12/banc-client/README.md#preuve-avantaprès-du-collage) | Régression reproduite sur le composant du commit initial puis corrigée ; ce scénario est inclus dans les 30 parcours, pas ajouté au total |
| [Tests frontend](../../apps/web/src/__tests__/login-page-state.test.ts) | **16 tests réussis** : six transitions de la page, six contrôles de code MFA et quatre contrats de politique. Le banc de transitions appelle les vrais handlers avec méthodes de contexte simulées ; ce n'est pas un moteur de rendu React. |
| [UserContext](../../apps/web/src/__tests__/user-context.test.ts) | **28 tests réussis**, dont lectures bornées, réponses dépassées, annulation, session seulement après MFA et traitement distinct du résultat incertain |
| [Banc serveur](connexion-2026-10-12/banc-serveur/README.md) | **17 tests PostgreSQL et 69 tests existants réussis**, soit 86 dans six fichiers. Base isolée migrée : refus, quotas, sessions, consommation concurrente des preuves, configuration, audit/rollback et échéances après attente. Routes et cryptographie réelles dans les 17 scénarios SQL ; cookies et en-têtes Next simulés. Les 69 autres tests ne deviennent pas des essais SQL. |
| [Banc HTTP réel](connexion-2026-10-12/banc-integration/README.md) | **12/12** parcours avec Next construit, PostgreSQL migré et Chromium ; bootstrap superadmin/utilisateur, TOTP/secours, cookies/CSRF, durées, reprise après commit, expirations et redirections réelles |

La préparation des bancs n'a pas modifié les seuils ou durées de production.
Les timeouts sont accélérés seulement dans les scénarios client explicitement
marqués. Les captures conservées montrent uniquement le formulaire vide. Les
observations ne contiennent pas les valeurs secrètes envoyées.

### Contrôles finaux

- `bun run test` dans `apps/web`, avec `LOGIN_TEST_DATABASE_URL` vers la base
  isolée : **1 263 tests réussis, 100 ignorés**, 103 fichiers réussis et six
  ignorés. Les 17 nouveaux tests SQL sont exécutés ; les six autres bancs SQL
  facultatifs ne sont pas activés dans cette passe. Les tests ciblés ci-dessus
  sont inclus dans la suite, pas des succès supplémentaires à additionner.
- Types et architecture : réussis. Lint complet puis build Next : deux erreurs
  de mise en forme du contexte/tests ont été corrigées ; le build final passe
  son lint, ses types, sa génération et ses traces. C'est ce build qui est
  exécuté par les douze parcours HTTP.
- Budgets de performance respectés : `/login` à **158 121 octets gzip** selon
  le script du dépôt ; aucune nouvelle dépendance. Cette mesure du chargement
  JavaScript ne remplace pas une mesure de charge serveur ou de Web Vitals en
  exploitation.
- `docs:check` : **229 documents et 1 477 liens locaux/index contrôlés** ; les
  six tests du vérificateur documentaire réussissent. `git diff --check` passe.
  Aucun des trois secrets temporaires n'est retrouvé dans les 27 fichiers
  texte modifiés/ajoutés ; les captures ne montrent que des champs vides.
- Navigateurs, serveur Next dédié et PostgreSQL isolé arrêtés. Les deux bases,
  le fichier privé et les journaux de ce cluster ont été supprimés ; les quatre
  dossiers temporaires du banc client ont aussi été nettoyés. Aucune donnée
  habituelle n'est réinitialisée.

La preuve HTTP est séparée de la simulation : pour AUTH-04, le serveur réalise
une vraie consommation et ouvre une vraie session ; seul le corps JSON est
endommagé, ses en-têtes Set-Cookie étant conservés. La reprise par GET retrouve
la session et le banc constate **un seul POST MFA**. Le cas sans cookie reçu
reste couvert par la simulation client, avec sa limite indiquée.

## Limites et suivi

- Chromium uniquement : pas de lecteur d'écran ni d'appareil mobile physique
  (**AUTH-02**), Safari/iOS, zoom natif ou clavier virtuel réel.
- Les exclusions d'autocomplétion sont inspectées ; aucune extension
  Bitwarden, 1Password ou LastPass installée n'a été testée. Les attributs ne
  garantissent pas le comportement d'une extension.
- Petites fixtures isolées ; pas de test de charge, de résistance à une attaque
  distribuée ou de restauration complète de sauvegarde. Les quotas et quelques
  courses sont testés, pas toutes les conditions d'exploitation. Le hash bcrypt
  des fixtures SQL emploie un coût 4 ; il ne mesure pas le coût de production.
- La simulation client ne démontre pas les cookies, le CSRF ou la cryptographie.
  Les tests SQL ne démontrent pas à eux seuls leur transport HTTP. L'intégration
  finale est consignée séparément ci-dessus.
- Aucun déploiement, équipement Authenticator physique, rotation de clés ni
  changement de politique de récupération décidé par cette passe.

Les règles et les déclencheurs de réexamen restent dans le
[suivi Connexion](../pages/connexion.md). Les garanties des composants
partagés doivent être rejouées si leur parcours ou leurs consommateurs évoluent.
