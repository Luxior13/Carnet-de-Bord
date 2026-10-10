# Organisation documentaire — 10 octobre 2026

## Demande et périmètre

Corriger et enrichir la documentation de Noctambule : organisation, questions à se
poser lors d’une évolution de page, méthodes d’audit et fiabilité du suivi. Reprendre
les méthodes utiles du projet local `C:\Users\Luxior\Desktop\exemple-site-discord-main`,
sans transférer ses contraintes produit ou d’exploitation dans Noctambule.

Passe sur la copie de travail locale, qui contenait déjà le
[diagnostic de compréhension](COMPREHENSION_PROJET_2026-10-10.md) et ses notes dans
les suivis. Périmètre : documentation et outillage de contrôle documentaire ; aucun
changement de comportement applicatif ni de base. Le corpus historique est conservé.

Sujets principaux : Q01, Q19, Q27 et Q30. Les questions réutilisables des autres
fiches sont enrichies sans auditer ni développer les capacités correspondantes.
Exploitation réelle, permissions serveur et conformité juridique restent hors
validation de cette passe documentaire.

## Réorganisation et décisions

- Maintien d’une source par responsabilité : références courantes, suivis de
  pages, rapports datés, plans et intentions. Aucune copie générale du projet source.
- Ajout d’index pour les audits, les plans et les 26 intentions à la racine de
  `features/`, avec statut et sources actuelles. Les 66 fiches historiques de
  pages deviennent également accessibles depuis leur catalogue.
- Correction des liens déplacés. Les sources supprimées citées dans les anciens
  audits sont gardées comme chemins historiques explicites, sans fichier factice.
- Signalement du statut des anciens plans et audits dès leur ouverture. Les
  résultats passés ne deviennent pas des contrôles actuels après correction d’un lien.
- Réconciliation de la navigation, des notifications retirées, du réglage unique
  de rétention et du catalogue à 39 chantiers. La matrice ajoute notifications et
  journal et reprend le statut actuel de l’actualité interne.
- Séparation du périmètre visuel terminé et des défauts ou contrôles ouverts dans
  les suivis. Ajout de suivis utiles pour accueil, connexion et feuille de route.

## Méthode enrichie

La [méthode d’audit](../qualite/AUDITS.md) distingue retouche, audit ciblé, audit
complet d’une page et audit transverse. Elle définit les preuves, les priorités
motivées par l’impact, les états d’un constat, la clôture après vérification et
les déclencheurs de réexamen. Le [modèle](../qualite/modeles/audit.md) reste facultatif
pour une petite correction. Le [guide des contrôles](../qualite/CONTROLES.md)
explicite les commandes disponibles et leurs limites.

Quatorze fiches sont enrichies : parcours, listes, formulaires, accessibilité,
composition, permissions, API/concurrence, confidentialité, performance,
architecture, documents, retrait, tests et documentation. Les nouveaux angles
couvrent notamment totaux après curseur, données sérialisées malgré un masquage,
conflits entre objets, échec après écriture réussie, normalisation, perte de saisie
au changement de largeur, pièces historiques et limites des preuves simulées.
Les identifiants Q01–Q30 restent stables. Aucun sujet ne rend obligatoire une
notification, un cache, un service ou une nouvelle permission.

## Apports du projet de référence

Sources locales consultées dans `exemple-site-discord-main` : index de `docs/`,
`REFERENCE_GENERALE.md`, modèle de création/évolution, index et modèle des audits,
références de vérification, interface/navigation et données/mutations, ainsi que
le cadrage d’audit final des pages à la racine du projet.

Principes retenus : lecture conditionnelle, audit de chaque élément utile, parcours
complets, distinction défaut/dette/suggestion, preuves datées, contrôle des effets
indirects, règles de clôture et traçabilité vers un propriétaire. Les politiques
de production, l’authentification Discord, le stockage et les traitements propres
au projet source ne sont pas transposés. Le dossier source a été consulté en lecture.

## Vérification

Le contrôleur documentaire découvre maintenant `docs/`, `features/`, `AGENTS.md`
et le guide de la base. Il vérifie chemins, ancres Markdown, définitions de liens,
images locales et présence des documents dans leurs index propriétaires. Il ignore
les exemples de code et les URL externes. Les index des fiches historiques sont
contrôlés récursivement. Ses tests vérifient les erreurs et les cas de syntaxe
utilisés, pas seulement une réussite sur le dépôt. La chaîne `bun run check`
commence désormais par les contrôles documentaires et leurs tests.

La comparaison directe du catalogue et de la matrice retrouve **39 identifiants**,
avec des étapes et statuts concordants. Cette comparaison porte sur les données
du code, sans parcours navigateur authentifié.

Contrôles exécutés localement le 10 octobre 2026 :

| Contrôle | Résultat | Limite |
| --- | --- | --- |
| `bun run docs:check` | 173 fichiers, 809 liens locaux et index contrôlés ; aucune erreur | Liens Internet et vérité métier hors portée |
| `bun run docs:check:test` | Six tests réussis, aucun ignoré | Tests du contrôleur documentaire, pas de l’application |
| Comparaison catalogue / matrice | 39 identifiants, étapes et statuts concordants | Lecture des sources ; pas de parcours privé |
| `git diff --check` | Aucune erreur d’espacement | Ne vérifie pas le fond |

Les scripts du contrôleur sont formatés avec la version locale de Prettier.
Lint, types, suites applicatives, build et E2E n’ont pas été rejoués pour ces
modifications documentaires. Les échecs applicatifs du diagnostic restent ouverts.

## Verdict et limites

Les incohérences documentaires repérées sont corrigées et la méthode de suivi est
renforcée. Un lien valide ne prouve pas la vérité métier ; les références externes
et les chemins historiques en texte restent soumis à une lecture contextualisée.
Les anciens rapports gardent leurs constats d’origine derrière leur statut explicite.

Les défauts applicatifs du diagnostic initial restent suivis dans
[Membres](../qualite/pages/membres-repertoire.md),
[Utilisateurs](../qualite/pages/systeme-utilisateurs.md),
[Navigation](../qualite/pages/navigation-generale.md) et
[Accueil](../qualite/pages/accueil.md). Ils ne sont ni corrigés ni clos par cette passe.
Les personnes responsables de leur traitement restent à attribuer ; aucune date
de livraison n’a été inventée. Les essais applicatifs de la cartographie ne sont
pas présentés comme rejoués.

Réexamen : nouveau document, déplacement/suppression, changement de statut produit,
évolution du contrôleur ou découverte d’une contradiction. Mettre à jour la source
propriétaire, son index et sa preuve, puis exécuter le contrôle documentaire.
