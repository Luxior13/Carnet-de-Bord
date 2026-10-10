# Audit et corrections — pages restantes, 11 octobre 2026

## Périmètre et état examiné

Demande : traiter les pages actives qui n’avaient pas encore reçu la passe de
correction, en reprenant le Répertoire et Utilisateurs comme références de style.
Branche `main`, point de départ `c607fcc7dbbf4ce53f970de7a37ce5969757fcfc`, arbre
propre au départ ; corrections locales non commitées pendant cette passe.

Propriétaires : [accueil](../qualite/pages/accueil.md),
[connexion](../qualite/pages/connexion.md), [Mon compte](../qualite/pages/mon-compte.md),
[création de personne](../qualite/pages/membres-repertoire.md),
[feuille de route](../qualite/pages/systeme-feuille-de-route.md) et
[états techniques](../qualite/pages/etats-techniques.md).
API modifiée : `PATCH /api/auth/me`. Consommateurs indirects : dialogues de
coordonnées, mot de passe et MFA ; le dialogue de mot de passe est aussi utilisé
par le cadre authentifié pour le changement obligatoire.

Les listes/fiches déjà travaillées et les paramètres système ne sont pas
réaudités. Les routes `/administration`, `/tableau-de-bord` et `/systeme` sont des
entrées de redirection, examinées dans le code ; elles ne justifient pas une page
supplémentaire. Aucun module futur du catalogue n’est construit ou réactivé.

Environnement : Windows, Bun 1.3.10, Next 15.5.23, React 19.1.8, Chromium local.
Le banc de navigateur compile les composants et le CSS du dépôt ; cadre,
navigation, authentification et API sont simulés. Données entièrement fictives,
compte administrateur de test et changement vers un second compte fictif. Ce
banc ne représente pas une session serveur, une base PostgreSQL ou le déploiement.
La police et le cadre simplifiés limitent la comparaison visuelle avec le site
complet. Aucun compte réel ni secret de connexion n’est utilisé dans ces preuves.

## Sélection des sujets

| Sujets | Sélection et raison |
| --- | --- |
| Q01–Q07 | Examinés : périmètre, composition, interactions, filtres, formulaires et retours persistants |
| Q08 | Non applicable à cette correction : aucun destinataire différé, rappel ou nouvelle notification nécessaire |
| Q09–Q11 | Examinés : compte personnel, droits existants, réponses tardives, identifiant local et secrets de sécurité |
| Q12 | Hors impact : modèle et contraintes persistées inchangés ; le nom vide est déjà représentable |
| Q13–Q15 | Examinés : nouveau contrat de version du profil, conflits, transaction et audit requis |
| Q16 | Examiné : retrait du branchement d’activité déjà inaccessible dans Mon compte ; aucune purge ni retrait d’API |
| Q17–Q18 | Hors impact de capacité/cache : catalogue local borné à 39 chantiers, lectures de profil par identifiant ; pas de nouveau cache ou agrégat |
| Q19 | Examiné : garde partagé, démontage des formulaires, extraction de la ligne de session et budget de taille |
| Q20–Q21 | Hors impact : format et téléchargement des codes de récupération inchangés ; aucune pièce ni nouvel export |
| Q22 | Examiné : version de profil comparée comme instant ISO ; formats des dates de session conservés |
| Q23 | Hors impact : aucun prestataire, webhook ou traitement différé modifié |
| Q24–Q26 | Hors impact : ni engagement, finance, relation esport ni gouvernance modifiés ; distinction personne/compte conservée |
| Q27–Q28 | Examinés : régressions, rendu, états d’erreur et compatibilité au déploiement |
| Q29 | Hors impact de sauvegarde : aucune migration, purge, clé persistée ou modification de format de sauvegarde |
| Q30 | Examiné : décisions, preuves et index actualisés ; aucune dépendance ajoutée |

## Constats et corrections

Les priorités décrivent l’impact du défaut, pas un incident de production constaté.
Les contrôles cités ci-dessous restent limités à leur environnement.

| ID | Nature / priorité et attendu-observé initial | Correction et preuve | État / reprise |
| --- | --- | --- | --- |
| REST-01 | Défaut P1 : nom annoncé facultatif sur Mon compte, refusé vide par l’API | Validation serveur alignée ; test API de nom vide et parcours navigateur de sauvegarde | Corrigé et vérifié avec API simulée ; intégration dans COMPTE-01 |
| REST-02 | Défaut P1 : un profil ancien pouvait écraser une modification concurrente | Version requise, comparaison avant écriture et condition atomique `id + updatedAt`, réponse 409 ; tests de version initiale périmée et de course pendant la transaction | Corrigé et vérifié dans les tests ; concurrence PostgreSQL à rejouer dans COMPTE-01 |
| REST-03 | Défaut P1 : une mise à jour du contexte de compte pouvait remplacer le brouillon | Base de comparaison séparée, conservation de saisie après modification des coordonnées, garde partagé et reprise du conflit ; scénarios brouillon, navigation, compte changé | Corrigé et vérifié dans Chromium isolé |
| REST-04 | Défaut P1 : échec du stockage de l’alerte de doublon présenté comme échec d’une fiche déjà créée | Stockage facultatif isolé du succès, avertissement visible, verrou maintenu jusqu’au départ ; une seule requête malgré double soumission | Corrigé et vérifié avec stockage bloqué et API simulée |
| REST-05 | Dette P2 : boutons désactivés après rendu sans verrou immédiat, callbacks possibles après démontage | Verrous synchrones des formulaires concernés, garde de durée de vie et annulation des lectures/révocations de sessions | Doubles soumissions vérifiées dans Chromium ; aucune garantie d’idempotence serveur ajoutée |
| REST-06 | Défaut P2 : saisie effacée encore considérée comme brouillon en création, erreur de création seulement fugace | Comparaison à l’état initial, erreur persistante, retour du focus du dialogue de navigation | Corrigé et vérifié à quatre largeurs |
| REST-07 | Défaut P2 : identifiant précédent stocké puis prérempli ; stockage local supposé disponible | Fin de la mémorisation applicative, nettoyage facultatif, connexion utilisable avec stockage bloqué et focus initial explicite | Corrigé et vérifié avec parcours MFA simulé ; AUTH-01 reste ouvert |
| REST-08 | Écarts P2 de composition : ancien hero de création, filtres non compacts, surfaces des états techniques | Composants et tokens de référence ; recherche du catalogue étendue au critère de livraison visible | Rendus et filtres vérifiés dans Chromium ; recherche `doneWhen` examinée dans le code |
| REST-09 | Amélioration P2 : accueil sans accès direct au compte attendu par l’ancien E2E | Lien Mon compte dans le hero existant ; pas de tableau de bord inventé | Rendu vérifié ; ancien E2E à rejouer, ACC-01 |

Corrections réalisées dans cette passe. Responsables de la reprise des contrôles
d’intégration : à attribuer dans les suivis propriétaires.

## Scénarios exécutés et preuves

Les [observations détaillées](pages-restantes-2026-10-11/observations.json)
contiennent **58 combinaisons réussies**. Chaque scénario vérifie aussi l’absence
d’erreur JavaScript et de débordement horizontal global.

| Scénarios | Largeurs | Résultat observé |
| --- | --- | --- |
| Huit rendus : accueil, connexion, compte, création, feuille de route, erreur, introuvable, chargement | 320, 390, 768, 1 440 px | 32 réussites ; structure visible sans débordement |
| Catalogue : paramètres invalides, aucun résultat, pôle, étape, réinitialisation | Les quatre largeurs | 4 réussites ; retour aux 39 chantiers |
| Création : saisie puis effacement, confirmation annulée, focus, stockage indisponible, double soumission | Les quatre largeurs | 4 réussites ; une requête, succès conservé et destination fiche |
| Création : validation et erreur serveur 500 | Les quatre largeurs | 4 réussites ; champ invalide focalisé et saisie conservée |
| Connexion : stockage bloqué, double soumission, défi refusé puis récupération, destination externe | 390 et 1 440 px | 2 réussites ; reprise et destination interne |
| Compte : brouillon après actualisation des coordonnées, navigation annulée puis abandonnée | 390 et 1 440 px | 2 réussites ; conservation puis abandon explicite, focus restauré |
| Profil : 409, relecture de version, nom vide, nouvelle sauvegarde | 390 et 1 440 px | 2 réussites ; brouillon conservé et nouvelle version envoyée |
| Compte : changement d’identité pendant une confirmation de navigation | 390 et 1 440 px | 2 réussites ; ancien dialogue fermé et nouveau profil affiché |
| Coordonnées, mot de passe et codes de récupération : doubles soumissions | 390 et 1 440 px | 2 réussites ; une requête par action |
| Initialisation MFA : doubles soumissions démarrage/confirmation | 390 et 1 440 px | 2 réussites ; une requête par étape |
| Sessions : révocation des autres sessions | 390 et 1 440 px | 2 réussites ; session courante conservée et état vide des autres sessions |

Captures relues : [compte ordinateur](pages-restantes-2026-10-11/compte-1440.png),
[compte mobile](pages-restantes-2026-10-11/compte-390.png),
[connexion mobile](pages-restantes-2026-10-11/connexion-390.png),
[création mobile](pages-restantes-2026-10-11/creation-390.png),
[catalogue ordinateur](pages-restantes-2026-10-11/feuille-de-route-1440.png).
Les autres captures à 390 et 1 440 px complètent les pièces brutes. Elles ne
contiennent ni mot de passe, QR MFA, code de récupération ni session réelle.

Contrôles techniques réellement rejoués le 11 octobre :

- `bun run --filter web test` : **1 046 tests réussis, 25 ignorés**, 86 fichiers
  réussis et deux ignorés. Les deux suites SQL conditionnelles ne sont pas rejouées.
- `bun run --filter web typecheck` : réussi.
- `bun run --filter web lint` : réussi.
- `bun run --filter web check:architecture` : réussi ; la section Sécurité est
  redescendue sous son budget après extraction de la ligne de session.
- `bun run --filter web build` : compilation de production réussie, lint et types
  inclus. Variables de build limitées à une adresse PostgreSQL locale volontairement
  inaccessible, des URL locales et des clés fictives ; aucune base contactée.
- `bun run --filter web check:performance` : budgets du build réussis. Ce résultat
  porte sur la taille des artefacts, pas sur le temps de réponse des API.
- `bun run docs:check` : réussi, 182 fichiers et 1 025 liens locaux/index contrôlés.
- `git diff --check` : réussi.

Les tests API utilisent Prisma simulé : ils contrôlent les conditions d’écriture,
les réponses et l’appel d’audit, sans démontrer une transaction sur base réelle.
Le banc navigateur temporaire n’est pas une suite E2E permanente ; ses scénarios
et résultats sont conservés ici, les fichiers de travail sont nettoyés.

## Compatibilité et verdict

Client et API de profil doivent être déployés ensemble. Le champ
`expectedUpdatedAt` est désormais requis ; les anciennes pages ouvertes doivent
être rechargées après conservation manuelle de leur brouillon. Le nom facultatif
est stocké vide dans le modèle existant. Aucune migration ni modification de
permission, de politique MFA ou de format d’audit.

**Conclusion partielle : corrections vérifiées sur le périmètre simulé et
statique.** Restent à exercer sur environnement isolé avec serveur et base réels :
authentification/MFA/cookies et refus/expiration (AUTH-01), profil avec concurrence
et rollback d’audit, sécurité/révocation et changement obligatoire du mot de passe
(COMPTE-01), création réelle (REP-01), intégration accueil/catalogue (ACC-01/FDR-01)
et déclenchement réel des états techniques (ETAT-01). Lecteur d’écran, appareil
physique et charge non contrôlés par cette passe. Aucun déploiement effectué.
