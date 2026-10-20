# Clôture du socle existant — 12–13 octobre 2026

**Statut : clôturé le 13 octobre 2026 pour les onze pages livrées et leurs
composants communs. Le développement métier peut reprendre.**

## Demande et critère de fin

La demande est de terminer une dernière revue globale des pages présentes pour
poursuivre le produit Noctambule, sans recommencer indéfiniment les mêmes audits.
Point de départ : commit `c54e5d8`, arborescence propre ; corrections de cette
clôture ajoutées ensuite. Le projet reste en développement.

La clôture exige des parcours essentiels exécutés, des défauts confirmés corrigés
et revérifiés, ainsi que des contrôles techniques actuels. Elle signifie que le
socle est prêt pour la suite prévue ; elle ne signifie ni absence garantie de
bugs futurs ni livraison des modules métier encore prévus.

Après clôture, une page existante est réexaminée lorsqu'un changement la touche,
qu'un défaut est signalé ou qu'une nouvelle règle le nécessite. Une demande
« autre » ou « suite » ne déclenche plus spontanément un nouvel audit d'une page
déjà clôturée. Les idées facultatives ne sont pas des défauts bloquants.

## Périmètre fini

| Surface existante | Parcours et contrats examinés |
| --- | --- |
| `/login` | Connexion, première configuration MFA, code, secours, erreurs et reprise |
| `/` | Accueil autorisé, informations réelles, orientation et liens |
| `/mon-compte` | Identité, contact, mot de passe, MFA, sessions et annulation |
| `/membres/repertoire` | Recherche, filtres, tri, pagination, droits et navigation |
| `/membres/repertoire/nouveau` | Identité, doublons indicatifs, création et reprise ; coordonnées ajoutées depuis la fiche |
| `/membres/repertoire/[id]` | Lecture, édition, coordonnées, historique, concurrence et suppression |
| `/systeme/utilisateurs` | Recherche, filtres, pagination, accès et actions disponibles |
| `/systeme/utilisateurs/nouveau` | Création USER/ADMIN, preuve récente, remise du secret et reprise |
| `/systeme/utilisateurs/[id]` | Identité, état, permissions, sessions, réinitialisations et suppression |
| `/systeme/parametres` | Valeurs effectives, brouillon, conservation, réparation et confirmation |
| `/systeme/feuille-de-route` | Catalogue, recherche, filtres, progression et détails accessibles |
| Navigation et états techniques | Menu Rubriques conservé, sections, retour, refus, chargement, erreur et page absente |
| Composants communs | Champs, listes déroulantes, modales, focus, clavier, enregistrement, attente et résultat incertain |
| Serveur et données | Autorisations au moment d'écrire, sessions, versions, transactions, audit, chiffrement, schéma, migrations et restauration |

Onze pages fonctionnelles ; `/administration`, `/tableau-de-bord` et `/systeme`
sont des entrées de redirection. Les routes non livrées restent absentes : elles
ne sont pas des pages à compléter artificiellement pendant cette clôture.

## Sélection de la revue générale

- **À examiner : Q01–Q07, Q09–Q19, Q22, Q25, Q27–Q30.** Parcours,
  comportements, données personnelles, droits, concurrence, maintenance,
  migrations, restauration et séparation Personne/Compte sont déjà présents.
  Q18 demande une mesure ou une simplification utile, pas l'ajout d'un cache.
- **Q20–Q21 : portée technique limitée.** Remise des codes de secours et
  sauvegarde/restauration signée ; pas de gestion documentaire métier ni
  d'import/export de listes à inventer.
- **Q23 : maintenance existante seulement.** Pas de nouvelle intégration,
  notification ou automatisation métier.
- **Non applicables : Q08, Q24 et Q26.** Notifications différées, gouvernance
  juridique et finance sont des modules futurs. Leur cadrage existant est
  conservé ; aucune nouvelle table n'est nécessaire à la clôture.

## Environnements et preuves

Windows, Bun 1.3.10, Next 15.5.23, React 19.1.8, Prisma 6.19.3,
Playwright 1.61.1 et PostgreSQL 17. Les intégrations utilisent uniquement des
bases de test locales sur le port 54663 ; le serveur Next isolé utilise 3132.
Les clés, mots de passe et cookies restent dans le répertoire temporaire privé.
Les sauvegardes brutes utilisent le répertoire temporaire ignoré `.codex-tmp` du
dépôt, puis sont supprimées après l'exercice ; aucune n'est versionnée. Les données
habituelles de développement ne servent pas aux essais.

- Bancs client : composants réels et réponses simulées, résultats actuels dans
  `cloture-socle-2026-10-12/client/` ; ils ne démontrent pas une mutation SQL.
- Serveur : suites PostgreSQL sur bases distinctes après application des
  52 migrations ; résultats et reproductions dans les dossiers `serveur/` et
  `personnes/` de cette clôture.
- Parcours intégrés : navigateur, authentification et serveur réels ;
  [scénarios et limites](cloture-socle-2026-10-12/integration/README.md).
  Le smoke distingue ses interceptions réseau des écritures réelles ; le
  panorama comprend une mutation réelle du réglage de conservation.
- Les rapports antérieurs gardent leur date et leurs limites ; aucun ancien
  succès n'est compté comme un nouveau contrôle.

## Constats confirmés et corrections

| ID | Défaut et impact | Correction et preuve actuelle |
| --- | --- | --- |
| CLT-01 — autorité au moment d'écrire | Après une authentification valable, certaines mutations réussissaient malgré un retrait de droit, une révocation ou une expiration intervenant avant l'écriture. Cela touchait Personnes, administration, paramètres et compte personnel/MFA. | Garde partagée dans les transactions, ordre de verrous explicite, session et droits courants, preuves vérifiées après attente. Refus sans effet partiel ni audit de réussite. Reproductions avant/après dans les trois bancs serveur ; les 218 tests SQL actuels passent. |
| CLT-02 — identité normalisée vide | Un accent combinant seul passait la validation puis échouait sur la contrainte SQL avec un 500. | Validation 400 avant écriture, sans changement de normalisation ni migration ; tests de schéma et SQL réussis. |
| CLT-03 — attente et résultat incertain | GET de reprise MFA, quatre sauvegardes et suppression de compte pouvaient garder leurs commandes bloquées indéfiniment. | Attente bornée, corps de réponse compris ; brouillon et avertissement conservés, lecture explicite, suppression non rejouée. Six nouveaux scénarios client réussis, fiche et sessions rejouées. |
| CLT-04 — focus du fil d'Ariane | Lors du passage du mode bureau au mode compact, le lien disparaissait avant que le contrôle de focus puisse le retrouver. | Mémoire de la destination focalisée, restitution au contrôle visible et respect d'un focus extérieur ; 17 scénarios de navigation réussis. |

Ces quatre familles sont corrigées et revérifiées dans les conditions indiquées.
La revue indépendante des nouvelles gardes ne relève pas de défaut concret.
Aucune nouvelle permission, table ou migration n'est ajoutée. Les anciennes
preuves de pages gardent leur portée ; les constats de cette clôture ont leur
source unique dans ce rapport et ses pièces.

## Contrôles techniques actuels

| Contrôle | Résultat et portée |
| --- | --- |
| Suite web complète sans cache | **1 482/1 482 tests, aucun ignoré, 114 fichiers**, dont 218 PostgreSQL dans dix fichiers et neuf bases dédiées |
| Base et documentation | 21/21 tests du package database ; 6/6 tests du contrôleur documentaire |
| Corpus documentaire | `docs:check` réussi : 264 fichiers, 1 910 liens locaux et index contrôlés ; suivis courants réconciliés avec cette clôture |
| Lint et TypeScript | Six tâches réussies sur web, shared et database, cache forcé désactivé |
| Schéma et migrations | `prisma validate` réussi avec la version installée 6.19.3 ; état de migration à jour, 52 migrations ; onze bases entièrement migrées |
| Build Next de production | Réussi sur l'environnement isolé ; budgets d'architecture et de bundles respectés |
| Client | 401 observations de 18 bancs + six nouvelles reprises, sans double comptage des rejeux ; API simulées |
| Requêtes de listes | 38 mesures Personnes et 33 Utilisateurs, de 25 à 10 000 entrées ; médianes à 10 000 de 8,339–22,468 ms et 2,636–31,226 ms, cache chaud et hors HTTP |
| Parcours intégré canonique | **1/1 smoke réussi**, plusieurs parcours enchaînés : MFA, navigation, comptes, profil personnel, Personnes/coordonnées, conflits, provenance, pagination et suppression avec tombstone SQL |
| Panorama actuel | **14/14 scénarios réussis** : onze pages à 320/768/1 440 px, alias, 404, santé, réglage persisté/audité, CSRF et conflit ; compte en lecture seule, MFA réel et retrait de son droit pendant la session |
| Examen visuel | **13 captures inspectées**, dix à 1 440 px et trois à 320 px ; aucune anomalie manifeste de lisibilité, chevauchement ou coupure anormale |
| Sauvegarde/restauration | **4/4 contrôles réussis**, format v9 signé ; empreintes identiques des 19 tables du contrat, dont `SystemSetting` ; refus sans clé publique et refus de cible non vide sans écriture |

[Index des pièces](cloture-socle-2026-10-12/README.md),
[résumé de la suite complète](cloture-socle-2026-10-12/integration/preuves/tests.json),
[client](cloture-socle-2026-10-12/client/README.md),
[comptes et paramètres](cloture-socle-2026-10-12/serveur/README.md),
[Personnes](cloture-socle-2026-10-12/personnes/README.md) et
[compte personnel/MFA](cloture-socle-2026-10-12/personnel/README.md).

Les tests API qui simulaient déjà l'authentification ont été adaptés aux nouvelles
lectures transactionnelles, en conservant leurs assertions métier. La protection
de la garde est prouvée séparément par PostgreSQL. Une première suite générale
avait 1 481 réussites et un ancien oracle textuel du bouton Supprimer ; après
adaptation à son nouveau blocage de résultat incertain, la suite entière passe.

Context7 a servi à vérifier Playwright 1.61.1. Sa réponse Prisma courante mêlait
des commandes de versions plus récentes : les commandes de cette passe ont été
vérifiées dans l'aide officielle de la CLI **6.19.3 installée**, sans recopier les
options d'une autre version.

## Intégration, limites et clôture

**Verdict du 13 octobre 2026 : conforme sur le périmètre actuel vérifié ; les
onze pages et leurs composants communs sont clôturés pour poursuivre le
développement métier. Aucun défaut confirmé de cette revue ne reste ouvert.**

Le [smoke](cloture-socle-2026-10-12/integration/preuves/smoke.json) conserve de
vraies mutations HTTP/SQL. Son bloc Paramètres intercepte des réponses pour
provoquer les erreurs ; le
[panorama](cloture-socle-2026-10-12/integration/preuves/pages.json) complète ce
bloc par une vraie sauvegarde, son audit, un refus CSRF et un conflit sans effet.
Les parcours réels utilisent le compte racine fictif et un USER limité au
Répertoire ; les autres combinaisons sont détaillées dans les bancs client/SQL,
sans les présenter comme autant de connexions navigateur distinctes.

Les anciens oracles du smoke ont été alignés sur les champs, modales et libellés
actuels. Les attentes portent sur le résultat observable : fin de l'ouverture
avant un second Échap, retour du focus avant provenance, rendu/URL plutôt qu'un
GET client facultatif lorsque Next fournit un état serveur. La redirection de
`/systeme` est également attendue. Ces adaptations ne sont pas des correctifs
produit. Les réponses 429 de readiness sont reprises en respectant le vrai
`Retry-After`, sans modifier le limiteur. Le lint/typecheck global est repassé
après les changements des tests E2E : six tâches réussies sans cache.

La [restauration](cloture-socle-2026-10-12/integration/preuves/restauration.json)
a été effectuée après arrêt de Next, dans la base vide réservée. Les données
fictives comprennent 20 comptes, 120 personnes, leurs coordonnées et audits ;
les tables vides sont également comparées. Les contrôles de refus vérifient le
code de sortie **et** le motif exact. Aucune donnée habituelle de développement
n'a été utilisée ni modifiée.

Le nettoyage est terminé : Next et PostgreSQL isolés arrêtés, onze bases
temporaires supprimées avec leur cluster, clés/cookies/journaux privés et
marqueur retirés. Les trois fichiers de sauvegarde brute et les deux dossiers
temporaires de mesure ont également été supprimés après vérification de leurs
chemins. Preuves : [environnement](cloture-socle-2026-10-12/integration/preuves/nettoyage-environnement.json)
et [fichiers de sauvegarde/mesure](cloture-socle-2026-10-12/integration/preuves/nettoyage-root.json).

Les limites suivantes restent explicites ; elles ne sont pas de nouveaux défauts
reproduits des pages actuelles :

- Safari/iOS, appareils et claviers mobiles physiques, lecteur d'écran humain,
  zoom natif et comportement de toutes les extensions ne sont pas certifiés.
  Le cas Bitwarden déjà confirmé résolu par l'utilisateur n'est pas rouvert.
- Remplacement MFA et perte de réponse sont couverts séparément par les bancs
  concernés ; leur combinaison n'a pas été rejouée dans Next réel pendant cette
  clôture. Le smoke vérifie l'inscription initiale MFA.
- Les mesures à 10 000 entrées n'attestent ni charge concurrente en production,
  ni purge à très gros volume, ni objectifs de reprise opérationnelle. La
  restauration compare les 19 tables, sans redémarrer l'application sur la cible.
- Hébergement, planification/alertes de maintenance, responsabilités et durées
  adaptées aux données réellement utilisées se qualifient avant l'exploitation
  concernée. La durée unique de journal et son effet sur la provenance Personne
  restent documentés ; aucun nouveau besoin de conservation n'est inventé ici.

Le style de référence Répertoire/Utilisateurs, les composants partagés et le
menu Rubriques restent les conventions de la suite. Les suivis courants pointent
vers cette clôture ; les rapports anciens conservent leur date. La prochaine
étape de la feuille de route est le cadrage et la construction de l'identité de
la structure et des entités juridiques, puis des relations métier datées. Une
demande « suite » ne relance plus la revue générale de ces onze pages.

Références : [méthode d'audit](../methode/audit.md),
[suivis des pages](../pages/README.md),
[design system](../design/README.md),
[structure cible](../domaines/structure-juridique.md) et
[feuille de route](../propositions/feuille-de-route.md).
