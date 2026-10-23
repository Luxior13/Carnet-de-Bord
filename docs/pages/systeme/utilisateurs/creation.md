# Nouvel utilisateur

[Index des pages](../../../pages/README.md) · [Utilisateurs](README.md) · [Design](../../../design/README.md) · [Guide général](../../../REFERENCE_GENERALE.md)

## Identité

| Élément | Valeur |
| --- | --- |
| Route | `/systeme/utilisateurs/nouveau` |
| Espace | Système |
| Gabarit visé | [C. Formulaire de création](../../../design/gabarits.md#c-formulaire-de-création) |
| État d’harmonisation | Aligné : bandeau compact, champs adoucis du 17 octobre 2026, barre commune — voir [Harmonisation](../../../design/harmonisation.md#état-par-page) |
| Point d’entrée | [page.tsx](../../../../apps/web/src/app/systeme/utilisateurs/nouveau/page.tsx) → [NewUserForm](../../../../apps/web/src/features/users/NewUserForm.tsx) |
| Contrôle d’accès | `users:create` (page et `POST /api/users`), preuve récente selon le rôle créé |
| Chargement / erreur dédiés | `PageDetailSkeleton` pendant la session / commune à l’application |

## Rôle et tâches principales

Créer un compte de connexion, choisir son rôle et remettre une seule fois son
mot de passe provisoire. Critère de réussite : un seul compte créé, même après
double action ou réponse perdue, et un secret remis sans être conservé.

## Composition actuelle

Bandeau compact ; carte sans en-tête, groupes Identité, Connexion et Accès ;
choix du rôle en cartes radio, aide grise sur le mot de passe temporaire ; `SectionActionBar` avec soumission native ; confirmation avec
copie du mot de passe provisoire et repère de conservation ; reprise après
réponse perdue par recherche exacte du compte.

## Décisions retenues

- Nom facultatif ; email validé avant l’envoi ; doublon expliqué près du champ.
- Une seule soumission par action ; départ pendant l’envoi signalé.
- Autorisation revérifiée au moment de l’écriture, sans rejeu automatique.
- Détails : [Formulaire de création — revue du 10 octobre 2026](#formulaire-de-création--revue-du-10-octobre-2026) et suites.

## Points ouverts

Aucun point ouvert : USR-N01 à USR-N14 sont clos au périmètre vérifié.

## Références

- Fiches [Formulaires](../../../references/formulaires-actions.md) et [Sécurité](../../../references/securite.md)
- Audits : [10 octobre 2026](../../../audits/2026-10-10-creation-utilisateur.md), [11 octobre 2026](../../../audits/2026-10-11-creation-utilisateur.md)

## Historique

- 10 au 12 octobre 2026 : audit, corrections et reprise de l’autorisation à l’exécution.
- 19 octobre 2026 : fiche propre à la création, créée par découpage du suivi du module.
- 23 octobre 2026 : reprise, voir ci-dessous.

## Reprise — 23 octobre 2026

Même passe que la création de fiche personne.

| ID | Nature / priorité | État | Point et traitement |
| --- | --- | --- | --- |
| USR-N15 | Composition, P2 | Clos | En-tête « Création du compte · Renseignez l’identité… » retiré : il répétait le bandeau |
| USR-N16 | Sens des couleurs, P3 | Clos | Note sur le mot de passe temporaire encadrée en jaune alors qu’elle n’alerte pas : aide grise |
| USR-N17 | Libellés, P2 | Clos | Aide de l’email « jamais utilisée pour vous connecter » sur le compte d’un tiers : « pour se connecter » |
| USR-N18 | Libellés, P3 | Clos | Barre : plus de « Le compte pourra être complété… » ni de « Modifications non enregistrées » sur un formulaire vide (`status={null}`) |

- **Vérifié** : types, lint, Vitest complet ;
  [banc client du 23 octobre](../../../audits/creation-utilisateur-2026-10-23/banc-client/README.md),
  28 scénarios sur 28, avec désormais une capture du formulaire à cinq largeurs.
- **Non vérifié** : session et serveur réels ; pas de capture « avant » du
  formulaire, l’ancien banc ne capturait que l’écran de succès.

## Revues datées

Sections déplacées le 19 octobre 2026 depuis l’ancien suivi du module, sans
modification de leur contenu. Elles conservent leur date, leur portée et leurs
preuves ; la synthèse ci-dessus porte l’état courant.

### Formulaire de création — revue du 10 octobre 2026

- URL vérifiée : `/systeme/utilisateurs/nouveau` (canonique ; l'ancien
  `/administration/utilisateurs/nouveau` est redirigé). `returnTo` reste borné
  à la collection utilisateurs.
- Champs conservés : prénom (obligatoire), nom (facultatif, décision du
  2026-10-10 pour le contexte esport où le nom complet n'est pas toujours connu),
  identifiant de connexion (obligatoire), email de contact (facultatif), rôle
  (`USER`, `ADMIN` seulement pour un compte protégé). Aucun champ ajouté : le
  compte est distinct de la fiche Personne ; l'identité complète et les
  relations se renseignent sur la fiche. Le schéma reflète ce choix :
  `User.lastName` est nullable (migration `20261010150000`), et la lecture
  normalise `null` en chaîne vide pour l'affichage.
- Interface recentrée sur la tâche : hero `PageIdentityHero` compact (dégradé
  des pages de référence, avatar DiceBear du compte créé, badges d'accès
  partagés `UserAccessBadge`), formulaire en une seule carte alignée sur le
  formulaire de création du répertoire (en-tête avec `ServiceIcon`, sections
  « Identité », « Connexion » et « Accès » en libellés majuscules discrets).
  Le rôle est choisi par cartes radio (Utilisateur / Administrateur) avec
  description, au lieu d'un menu déroulant.
- Écran de succès aplati sur le même gabarit : remise du mot de passe
  temporaire puis synthèse des accès, sans cartes imbriquées.
- Aligné sur le répertoire : champs en style `Input` partagé, dernier fil
  d'Ariane sans lien vers lui-même, focus placé sur le premier champ invalide
  après validation. Autocomplétion désactivée (règle globale du 2026-10-10) :
  `autoComplete="off"` sur le formulaire, champs sans `name` ni `autoComplete`
  explicite, et champ email en `type="text"` avec `inputMode="email"`.
- Vérifié : TypeScript et lint au vert. Le parcours réel (création, mot de
  passe temporaire, relance d'authentification pour ADMIN) reste à valider en
  base réelle.

#### Audit ciblé du formulaire — 10 octobre 2026

Lecture du formulaire, POST, validation, transaction et droits ; Chromium avec
composants/CSS réels mais API, acteur, shell et navigation Next simulés, sept
largeurs. **185 tests ciblés, types, lint et architecture réussis.** Aucun code
produit changé par cet audit. [Rapport et preuves](../../../audits/2026-10-10-creation-utilisateur.md).

La protection du brouillon, la conservation des valeurs après erreur, le focus
sur une erreur locale et l'ouverture du dialogue ADMIN fonctionnent dans ce banc.
Le nom vide est accepté par la validation métier. Les défauts portent sur les
dimensions des radios masquées, la sémantique du nom facultatif, les erreurs
serveur et le focus après transition. La remise et la reprise du secret demandent
également un cadrage explicite ; aucun envoi automatique ajouté.

USR-10 reste clos pour la réutilisation des primitives et le clavier contrôlés
précédemment. Sa vérification ne couvrait pas le débordement des radios, désormais
isolé en USR-N01. Les preuves de liste sur base réelle ne valident pas la création.

#### Corrections du formulaire — 10 octobre 2026

Le « go » suivant l'audit autorise les corrections et le repère de conservation
du secret. Composition visuelle conservée ; contrôleur, validation, retours de
reprise et confirmation séparés dans `features/users` pour garder une page
lisible. Q05 devient pertinent pour la recherche exacte de reprise ; les autres
sujets gardent le périmètre de l'audit. Aucune migration, dépendance ou permission
supplémentaire.

Décisions courantes :

- Un même schéma valide la saisie et le POST. Erreurs de champ persistantes,
  erreur générale locale et focus adapté ; nom toujours facultatif.
- Radios masquées limitées à 1 × 1 px ; cartes et sélection au clavier conservées.
- Champs verrouillés pendant l'envoi et la vérification ; verrou synchrone contre
  le double envoi. Quitter pendant le POST n'annule pas la mutation serveur.
- Une panne réseau, une réponse inexploitable, une erreur 5xx ou un délai de
  30 secondes dépassé signifie « résultat à vérifier », jamais « écriture annulée ».
  La vérification attend au maximum 15 secondes ; une indisponibilité conserve
  ce parcours, sans nouvelle création automatique.
- Reprise via `GET /api/users?loginName=…&limit=1` : identifiant exact normalisé,
  droit existant `users:view`, projections existantes et exclusion de l'identité
  protégée pour un acteur non protégé, y compris avec d'autres filtres. Aucun
  secret relisible dans ce GET. Un compte trouvé peut préexister à la tentative :
  le message ne prétend pas prouver qui l'a créé.
- Aucun compte trouvé : relance explicite avec le même identifiant, toujours
  soumis à l'unicité. Compte trouvé : fiche puis réinitialisation avec les droits
  et preuves existants ; aucune réinitialisation automatique. Sans droit de
  vérification ou de réinitialisation, recours indiqué à un administrateur habilité.
- Mot de passe temporaire conservé uniquement dans l'état de la page. Message de
  copie et case « J’ai conservé ce mot de passe pour le transmettre » ; copier
  ne coche pas la case. Avant conservation déclarée, quitter ou créer un autre
  demande une confirmation ciblée. Ce repère ne prouve pas la remise effective.
  Aucun email, stockage persistant ou journal contenant ce secret ajouté.
- L'état de création est remonté à neuf si le compte, le rôle, la protection ou
  le droit de création change ; les réponses d'une instance démontée sont ignorées.

| Point | État et preuve du correctif | Déclencheur de réexamen |
| --- | --- | --- |
| USR-N01 — P2, radios et débordement | **Corrigé et vérifié** : 0 px de débordement principal/document de 320 à 1 920 px, sept largeurs ; radio 1 px et flèches clavier | Changement de primitive ou composition |
| USR-N02 — P2, nom facultatif | **Corrigé et vérifié** : attribut retiré, création réelle avec nom vide | Changement du contrat d'identité |
| USR-N03 — P2, erreurs serveur | **Corrigé et vérifié** : email refusé avant POST, doublon persistant et focus du champ ; pannes expliquées dans la page | Changement de validation ou retour API |
| USR-N04 — P2, focus des transitions | **Corrigé et vérifié** : titre de succès puis prénom après remise à zéro ; panneau de reprise focalisé | Changement des transitions |
| USR-N05 — P2, départ pendant le POST | **Corrigé et vérifié** : double soumission dans le même événement produit un seul POST, champs désactivés et avertissement exact | Changement du contrôleur ou de la navigation |
| USR-N06 — P2, réponse perdue après commit | **Corrigé et vérifié** : écriture réelle puis réponse coupée, recherche exacte, fiche et nouveau secret émis avec droit existant ; un seul compte et audit | Changement du contrat de reprise, d'unicité ou de réinitialisation |
| USR-N07 — remise du mot de passe | **Implémenté et vérifié** : copie réelle, repère de conservation, confirmation avant départ/remise à zéro ; pas de secret dans les stockages navigateur ni l'audit contrôlés | Changement de transmission des accès |

**Preuves actuelles :** Next production + Chromium + PostgreSQL 17 jetable,
51 migrations appliquées. Créations USER/ADMIN, mot de passe et TOTP réels pour
ADMIN, annulation du défi, droits délégués, CSRF, collision de deux POST et
rollback d'un échec d'audit contrôlés. Le mot de passe affiché correspond au hash
persisté ; changement obligatoire conservé. Pannes réseau/503 injectées ; les
lectures, créations, réservations et audits correspondants utilisent la vraie base.

Suite web : **1 028 tests réussis, 25 ignorés** (deux suites PostgreSQL dont les
variables dédiées ne sont pas fournies à Vitest). TypeScript, lint, build,
architecture et budget de performance réussis. Une régression Playwright durable
est intégrée au smoke et exécutée seule sur ce banc ; le smoke complet n'est pas
rejoué. [Rapport et preuves détaillées](../../../audits/2026-10-10-creation-utilisateur.md#validation-des-corrections).

Limites : première connexion du nouveau compte et activation MFA, lecteur d'écran,
Safari et appareils physiques non rejoués. Le changement de compte/droits pendant
un POST et les délais de 30/15 secondes sont examinés dans le code, sans scénario
navigateur dédié. Les anciennes preuves ci-dessus restent historiques.

#### Revue approfondie de la création — 11 octobre 2026

Passe suivante après la liste, demandée en contexte développement. Le
[rapport du 11 octobre](../../../audits/2026-10-11-creation-utilisateur.md)
sépare les nouveaux contrôles des preuves du 10 octobre ci-dessus.

Décisions courantes complémentaires :

- Une copie de mot de passe ne peut annoncer son résultat que pour la dernière
  opération encore pertinente. Reset, nouveau succès et changement d'instance
  invalident les anciens résultats de copie.
- Annuler la confirmation administrateur rend le focus au bouton « Créer le
  compte » ; une confirmation réussie conserve le focus sur le titre du succès.
  La garde de navigation utilise son contrat partagé de restitution du focus.
- Le contact est facultatif et ne sert jamais d'identifiant de connexion.
  L'aide ne promet plus de récupération de compte par email.
- La création atomique appartient au service de la feature Utilisateurs. Son
  audit est obligatoire et le contrôle préalable du doublon ne lit que `id`.
- Le générateur partagé création/réinitialisation est testé directement et
  utilise les tirages `crypto.randomInt`. Longueur 14, catégories de caractères,
  hash bcrypt coût 12 et changement obligatoire restent inchangés.
- Schéma et réservations existants suffisants : aucune migration, dépendance,
  permission, notification ou nouvelle capacité de stockage ajoutée.

**Création conforme sur le périmètre vérifié ; USR-N08 à USR-N12 clos.**
28 scénarios Chromium simulés, neuf parcours réels Next/PostgreSQL/MFA et cinq
tests SQL transactionnels réussis. La première connexion du compte créé,
l'inscription MFA, le changement obligatoire puis une nouvelle connexion sont
désormais exécutés, avec une vraie copie dans le presse-papiers. Les délais
30/15 s et changements d'acteur/droits en vol sont vérifiés au banc simulé.

Suite web : 1 161 tests réussis, 41 tests SQL Personnes/liste Utilisateurs
ignorés faute de leurs variables dédiées ; les cinq SQL de création sont
exécutés. Build, lint via build, types et budgets réussis. Aucune donnée habituelle
touchée. Lecteur d'écran, Safari, appareils physiques, extensions et charge
massive restent hors des preuves, comme détaillé dans le rapport.
Documentation et index vérifiés (`docs:check` : 210 fichiers, 1 340 liens ;
six tests du contrôleur documentaire réussis). Les environnements temporaires
de cette passe ont été arrêtés et supprimés après les vérifications.

#### Création : autorisation à l'exécution et reprise — complément du 12 octobre 2026

**Corrigé et vérifié dans le périmètre décrit.** Départ `31091b3`, arbre propre.
Reprise ciblée du POST de création
et de son défi administrateur partagé : vérifier l'autorisation après le calcul
du hash et les attentes éventuelles, puis le retour et la reprise dans le
formulaire. Les délais POST/GET de 30/15 secondes, l'unicité/réservation,
la remise manuelle du secret et les règles USER/ADMIN restent inchangés.
Les premières connexions, pertes de réponse et changements d'acteur déjà
éprouvés le 11 octobre ne sont pas déclarés manquants dans cette nouvelle passe.

Sélection de la [référence générale](../../../REFERENCE_GENERALE.md) : Q01–Q07, Q09–Q11,
Q14–Q15, Q17, Q19, Q22, Q27–Q28 et Q30 examinés pour la preuve sensible,
l'autorisation concurrente, la reprise exacte et le focus. Q12–Q13, Q16, Q18 et
Q29 hors impact : modèle, migrations, retrait, cache et sauvegardes inchangés.
Q08, Q20–Q21 et Q23–Q26 non applicables : aucune notification, pièce,
import/export, automatisation, règle de structure, relation esport ou finance.

| Point | Constat et portée | Correction et clôture du 12 octobre |
| --- | --- | --- |
| USR-N13 — P1, autorisation après attente | Six reproductions SQL renvoyaient 200 après capture de l'autorisation puis suppression de la source, rotation de version, retrait du droit, désactivation de l'acteur, expiration de source ou expiration de preuve ADMIN pendant une attente réelle de verrou. | **Clos au périmètre SQL testé** : acteur, source, droit et preuve relus à l'exécution ; les six refus 401/403 ne créent ni compte, ni réservation, ni audit et ne renvoient aucun secret. Snapshot d'authentification, en-têtes et quotas simulés ; POST, service, bcrypt et transactions SQL réels. |
| USR-N14 — P2, focus de vérification tardive | Pendant le GET de vérification, Tab place le focus sur un lien de navigation ; la réponse « compte trouvé » le reprend sur le bloc de reprise. Reproduit dans le navigateur avec API simulée, un POST puis un GET. | **Clos au périmètre testé** : une interaction avant la réponse ou avant le rendu annule l'intention de focus. Sans nouveau geste, le panneau le reçoit ; succès et erreur respectent le focus choisi. Cinq nouvelles régressions parmi seize tests du contrôleur, parcours client et vérification HTTP retardée réussis. |

Le défi partagé a reçu une borne de requête lors de la passe Sessions ; son
annulation, son succès et son délai dans la création sont des contrôles de
non-régression, pas de nouveaux défauts déclarés. Les preuves client simulées,
SQL et HTTP sont distinguées ci-dessous, sans nouveau rapport complet.

[Banc client : six parcours réussis](../../../audits/creation-utilisateur-reprise-2026-10-12/banc-client/README.md) :
trois vérifications du focus de reprise et trois non-régressions du défi ADMIN
(annulation, succès, délai contrôlé à 31 secondes), réparties entre 390 et
1 440 px. API, contexte, routeur et horloge simulés ; polices Next non chargées.
Les anciens délais de création 30 s et de vérification 15 s ne sont pas
revendiqués comme entièrement rejoués.

[Banc serveur](../../../audits/creation-utilisateur-reprise-2026-10-12/banc-serveur/README.md) :
110 tests ciblés réussis, dont onze SQL de création (six nouvelles régressions,
cinq contrats d'intégrité), puis treize SQL de sessions réussis et douze ignorés
par filtre pour vérifier l'adaptateur partagé. PostgreSQL 17, 52 migrations ;
snapshots d'authentification simulés. La preuve ADMIN est datée artificiellement,
mais l'attente de verrou est observée dans PostgreSQL. Unicité, réservations,
hash et rollback de l'audit restent contrôlés ; ce n'est pas une preuve de
toutes les courses possibles ni un essai de charge.

[Banc HTTP : trois parcours réussis](../../../audits/creation-utilisateur-reprise-2026-10-12/banc-integration/README.md) :
USER, ADMIN après annulation puis vraie preuve mot de passe/TOTP, réponse
perdue après commit et recherche exacte réelle. Compte, réservation et audit
uniques ; secret affiché vérifié contre le hash, changement obligatoire conservé.
Le GET retardé conserve le focus déplacé dans la recherche rapide : un POST,
un GET de vérification, aucun rejeu. Il ne récupère pas le secret et ne prouve
pas à lui seul l'origine d'un compte trouvé. La première connexion du nouveau
compte n'est pas rejouée ; sa preuve demeure celle du 11 octobre.

Suite générale : 1 257 tests réussis, 185 ignorés, dans 103 fichiers réussis et
dix ignorés. Les SQL exécutés séparément ne sont pas additionnés à ce total.
Types, lint global, architecture, build Next 15.5.23 et budgets réussis ; création
à 281 466 octets gzip, sans hausse du plafond ni mesure de charge. Safari/iOS,
appareils physiques, lecteurs d'écran et autres mutations restent hors passe.
Nettoyage confirmé : Next et PostgreSQL arrêtés, ports 3131 et 54662 libres,
trois bases isolées et dossier temporaire supprimés avec le marker,
l'environnement et les secrets de test. Le scan des treize fichiers texte
archivés n'a trouvé aucune valeur privée.

Le [garde transactionnel](../../../../apps/web/src/shared/server/user-action-authorization.ts)
est partagé seulement par la création et les sessions administratives, deux
consommateurs réels. Il relit acteur, source et permissions après les verrous ;
la preuve ADMIN reste une règle du service de création, et l'adaptateur sessions
conserve son contrat HTTP. Le calcul bcrypt reste hors de la transaction ;
compte, réservation et audit restent atomiques. Cette extraction évite deux
copies du contrôle sans généraliser toutes les actions administratives.

Question durable : l'autorisation, la session et la preuve sensible sont-elles
encore valides lorsque le compte va réellement être créé, après un calcul
coûteux ou une attente de verrou ? Une ancienne réponse de vérification peut-elle
reprendre le focus après une nouvelle action de l'utilisateur ?
