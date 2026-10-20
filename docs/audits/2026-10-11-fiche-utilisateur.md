# Fiche utilisateur — revue du 11 octobre 2026

## Périmètre

Demande : poursuivre sur une autre page après la création. Page retenue :
`/systeme/utilisateurs/[id]`, Profil, Autorisations administratives, Compte
personnel, Sécurité et dialogues actifs. Les preuves du
[10 octobre](2026-10-10-fiche-utilisateur.md) restent historiques ; le
[suivi courant](../pages/systeme/utilisateurs/README.md) porte les décisions
applicables. Activité demeure dormant et n'est pas réactivé par cette revue.

Départ : branche `main`, commit `96143d7`, arbre propre. Projet en développement,
Windows, Node 24.14.0, Bun 1.4.2, Next 15.5.23, React 19.1.8 et Prisma 6.19.3.
PostgreSQL 17 local jetable : `user_detail_service_test` et
`user_detail_audit_test`, port 54595, 52 migrations existantes appliquées.
Les mutations concernent exclusivement des comptes fictifs ; les données
habituelles du projet ne sont pas utilisées.

## Sélection de la revue générale

| Sujets | Classement et justification |
| --- | --- |
| Q01–Q04 | À examiner : actions de la fiche, navigation, style partagé, responsive et focus |
| Q05 | À examiner pour la collection de sessions ; la liste générale et l'historique dormant sont hors impact |
| Q06–Q07 | À examiner : saisie, enregistrement, attente, conflits, annulation et messages locaux |
| Q08 | Non applicable : aucune notification différée requise par ces corrections |
| Q09–Q12 | À examiner : permissions, acteur/cible, confidentialité, secrets, compte et invariants SQL |
| Q13 | Hors impact produit : aucune nouvelle migration attendue ; les migrations existantes préparent les seules bases d'essai |
| Q14–Q16 | À examiner : versions, mutations concurrentes, audit atomique, désactivation et suppression irréversible |
| Q17–Q19 | À examiner : projections, sessions obsolètes, requêtes/réponses tardives et responsabilités des services |
| Q20–Q21 | Hors impact : aucun fichier métier ni export créé ; les captures et résultats sont des preuves de test |
| Q22 | À examiner : dates de preuve, versions, sessions, délais et expiration de l'affichage du secret |
| Q23–Q26 | Non applicable : ni traitement différé, fournisseur, gouvernance, relation esport ni finance |
| Q27 | À examiner : tests unitaires, navigateur simulé, PostgreSQL et parcours réel distingués |
| Q28–Q29 | Hors impact : déploiement, formats de sauvegarde et clés inchangés ; nettoyage des environnements d'essai |
| Q30 | À examiner : contrat PATCH, variables des tests et références documentaires ; aucune nouvelle dépendance |

## Constats et corrections

| Point | Attendu et défaut observé | Correction et preuve courante |
| --- | --- | --- |
| USR-D10 — P2, nom facultatif | Effacer le nom doit persister ; le PATCH acceptait `''` mais conservait l'ancien nom | Clos : condition corrigée, régression HTTP, SQL et formulaire Next réels réussis |
| USR-D11 — P2, version facultative | Une fiche périmée doit être détectée pour toute modification ; le PATCH permettait des champs sans version | Clos : version requise, refus 400 et conflit SQL ; deux fenêtres réelles donnent 200/409, puis reprise explicite conservant la saisie |
| USR-D12 — P1, ancienne portée conservée | Les données et brouillons appartiennent à un acteur et à ses droits ; le snapshot SSR et les réponses tardives survivaient à leur changement | Clos au périmètre testé : portée explicite, remontage et retrait définitif du snapshot ; A→B→A, PATCH tardif et refus non JSON avec secret exercés au banc client |
| USR-D13 — P2, sessions présentées comme actives | Une session d'ancienne version de sécurité ne doit pas figurer parmi les sessions utilisables | Clos : nettoyage et filtre SQL testés avec session ancienne ; arrivée directe et refus de lecture vérifiés côté client |
| USR-D14 — P2, opérations concurrentes du client | Une action déjà en cours doit exclure les doublons et une actualisation ne doit pas avaler un brouillon | Clos : verrous synchrones, gardes de durée de vie et rejet des versions antérieures ; tests de contrôleurs et conflits dans les quatre sections |
| USR-D15 — P2, issue du reset MFA inconnue | Une réponse perdue après commit ne prouve pas un échec | Clos : retour d'incertitude et lecture explicite ; un seul POST après réponse perdue, en simulation et après vrai commit Next/PostgreSQL |
| USR-D16 — P2, cohérence de la section Sécurité | Même contrat d'enregistrement que les autres sections et focus après Annuler | Clos : `SectionActionBar` partagée ; états, focus et cinq largeurs exercés au banc client |
| USR-D17 — P2, ancienne copie de secret | Le résultat de copie A ne doit pas apparaître pour un autre secret | Clos : résultat invalidé au remplacement ; copie A retardée puis secret B au banc client ; copie réelle et masquage au banc Next |
| USR-D18 — P2, dette de la route et projection | Le GET n'a pas besoin du hash, et préparation/transaction étaient peu lisibles dans la route longue | Clos : projection explicite, schéma et service extraits ; tests de droits/projection et trois pannes d'audit SQL ; route à 708 lignes, exception de budget retirée |
| USR-D19 — P2, identité longue | Sur sa fiche administrative en lecture seule, un nom sans espaces était coupé | Clos : largeur minimale et retour à la ligne corrigés ; texte et débordement vérifiés à 320 px |

Le marqueur `criticalAccessReady` a été examiné : il est déjà réservé au compte
protégé ou à l'acteur ayant le droit effectif d'accorder des accès. Il n'est pas
exposé au simple lecteur ; ce point n'est pas présenté comme un défaut corrigé.

## Validation

- [Banc serveur](fiche-utilisateur-2026-10-11/banc-serveur/README.md) :
  230 tests ciblés, dont 20 nouveaux cas HTTP et 15 cas PostgreSQL. Les derniers
  utilisent les routes, Prisma et bcrypt réels, avec source de session simulée.
  Nom vide, versions, conflit concurrent, réservation, contact, scopes, resets,
  sessions et suppression couverts. Trois pannes d'audit vérifient le rollback
  du login, du reset et de la révocation globale.
- [Banc client](fiche-utilisateur-2026-10-11/banc-client/README.md) :
  **43 parcours distincts réussis** (passe principale de 38 puis cinq contrôles
  ciblés). Composants/CSS réels ; API, session, shell et presse-papiers simulés.
  Le nom long est corrigé et contrôlé après la passe de 38, sans annoncer une
  nouvelle passe globale des 43.
- Suite web finale : **1 199 tests réussis, 46 ignorés**, 97 fichiers réussis et
  trois ignorés. Les quinze SQL de fiche sont exécutés ; les 46 SQL du
  Répertoire, de la liste Utilisateurs et de la création ne sont pas rejoués
  faute de leurs variables dédiées dans cette exécution.
- [Banc d'intégration](fiche-utilisateur-2026-10-11/banc-integration/README.md) :
  **13 scénarios réussis** dans Chromium 149.0.7827.55, Next de production et
  PostgreSQL. Connexions/MFA réelles, quatre sections à sept largeurs, nom et
  contact, conflit entre deux fenêtres, navigation, deux sessions révoquées,
  scopes séparés, changement de login, reset et vraie copie du secret, réponses
  perdues après commit, récupération MFA suivie de réenrôlement et changement
  obligatoire de mot de passe, droits retirés en consultation et suppression
  après désactivation. Les injections sont détaillées dans le banc.
- Build de production Next, lint et types via build réussis. Budgets respectés :
  fiche à **309 103 octets gzip** selon le contrôleur du dépôt, sous 325 Kio.
  Aucune mesure de débit ou de charge SQL déduite de ce poids.

Le schéma Prisma et ses contraintes existantes suffisent aux corrections :
version de sécurité, dates, réservations de login, sessions, anonymisation et
audit transactionnel sont utilisés et exercés. Aucune migration, dépendance,
permission, index ou cache ajouté sans besoin démontré. La règle documentaire
de suppression est alignée sur le contrôle existant du mot de passe récent,
sans changement de politique serveur.

Documentation : `docs:check` réussi sur **214 fichiers et 1 368 liens** ; les
six tests du contrôleur documentaire et `git diff --check` passent. Les preuves
textuelles ne contiennent aucune clé privée du banc. Next, PostgreSQL et les
répertoires temporaires des bancs ont été arrêtés/supprimés ; seules les preuves
sans secrets sont conservées dans le dépôt.

**USR-D10 à USR-D19 clos sur le périmètre et les preuves décrits.** Les anciennes
limites d'intégration de la fiche ne sont pas toutes reportées artificiellement :
connexion, reset MFA, sessions individuelles et changements contact/login ont
désormais été exercés. Un point voisin de sessions à vérifier est consigné dans
le [suivi Mon compte](../pages/mon-compte/README.md), dont la route personnelle
n'est pas modifiée ici.

## Complément — barre d'état au défilement

Retour utilisateur après la première passe : la barre d'enregistrement de l'état
restait dans sa carte. `placement="inline"` désactivait le collage ; la carte
courte à débordement masqué empêchait aussi une portée sur le contenu complet.
Les preuves précédentes vérifiaient les actions et la composition, pas ce maintien
pendant le défilement de toute la rubrique Sécurité.

Correction locale : même `SectionActionBar`, déplacée après les cartes de Sécurité,
avec placement collant par défaut. Les libellés, droits, garde de sauvegarde,
barre inchangée dans le flux et retour du focus après Annuler sont conservés.
Q01–Q04, Q06 et Q27 examinés ; Q30 pour la décision documentaire. Les autres
sujets sont hors impact : pas de changement de requête, donnée, permission,
contrat de composant partagé ou traitement métier.

Types et lint ciblé réussis. Trois scénarios Chromium ciblés passent au
[banc client](fiche-utilisateur-2026-10-11/banc-client/README.md) : à 1 440 × 900,
la barre reste hors carte et son bord inférieur à 884 px pour les défilements
0, 343 et 644 px. À 390 × 844 et 1 440 × 550, elle reste dans le flux selon
le contrat commun. Annuler restaure l'état et le focus sur l'interrupteur dans
les trois cas. Les treize parcours Next/PostgreSQL ci-dessus ne sont pas
annoncés comme rejoués pour cette correction de placement.

## Limites

Cette passe ne réactive pas l'Activité ni ses exports et ne prétend pas valider
tout le système d'authentification. Les tests ciblés d'autorisations ne couvrent
pas chaque combinaison possible du catalogue. Lecteur d'écran, Safari, appareils
physiques, extensions de mots de passe et charge massive ne sont pas testés.

La révocation observée par le client prend effet lorsque le contexte d'acteur
est actualisé ou qu'une requête reçoit un refus ; elle n'est pas annoncée comme
une notification serveur instantanée. Les contrôles serveur restent exécutés
sur chaque requête. La Date du navigateur est avancée de 65 puis 130 secondes
pour exercer l'actualisation d'activité existante ; les timers et l'horloge
PostgreSQL/serveur restent inchangés. La syntaxe a été vérifiée via Context7
dans la [documentation Playwright 1.61.1](https://github.com/microsoft/playwright/blob/v1.61.1/docs/src/clock.md).
