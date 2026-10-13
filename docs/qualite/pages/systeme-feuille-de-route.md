# Suivi — Feuille de route

## État courant — clôture du socle du 13 octobre 2026

La [revue finale du socle](../../audits/AUDIT_CLOTURE_SOCLE_2026-10-12.md) est
terminée au périmètre livré, pour poursuivre le développement métier. Ses
preuves et limites ne constituent pas une qualification de déploiement.

La page livrée, son catalogue local et ses composants partagés ont été
revérifiés, avec parcours réel aux trois largeurs retenues. Aucun chantier futur
n’est rendu actif par cette clôture et aucun mécanisme de cache ou de
virtualisation n’est ajouté.

Les décisions et preuves datées ci-dessous restent conservées. Une nouvelle
revue répond à un changement, un défaut constaté ou une règle nouvelle.

## État courant — 12 octobre 2026

Route `/systeme/feuille-de-route`, catalogue informatif pour les comptes connectés.
Le catalogue comprend 39 chantiers, huit pôles cibles et six étapes ; ces nombres
ne représentent ni 39 pages à créer ni huit pôles actifs. La navigation actuelle
compte trois pôles et cinq entrées principales.

La [revue du 12 octobre](../../audits/AUDIT_FEUILLE_DE_ROUTE_2026-10-12.md)
vérifie le catalogue, la correspondance documentaire et le parcours privé.
Les 18 scénarios client et huit parcours d'intégration Next/MFA réels passent ;
FDR-01 à FDR-04 sont clos sur le périmètre vérifié.

Sources : [décisions produit](../../references/FEUILLE_DE_ROUTE.md),
[matrice](../../../features/pages/MATRICE_PREPARATION.md),
[catalogue](../../../apps/web/src/features/roadmap/roadmap.constants.ts),
[tests](../../../apps/web/src/__tests__/roadmap-catalog.test.ts).

## Décisions courantes et questions de revue

- Une carte décrit public, socle éventuel, première version, prérequis et critère
  de livraison. « À compléter » ne rend pas son futur parcours disponible.
- Les étapes donnent une priorité, sans calendrier promis ni tâche planifiée.
- Les notifications et la vue globale du journal sont à reconstruire. Les
  actualités sont en attente. Leurs anciens liens ne rouvrent pas les modules.
- Faire évoluer ensemble décisions, données applicatives et matrice. Vérifier
  les identifiants, doublons, prérequis et dépendances circulaires.
- Une carte livrée doit refléter son reste à faire ; la masquer ou changer son
  statut ne modifie pas automatiquement le registre des fonctionnalités.
- Sélectionner Q01–Q05, Q09, Q19, Q27 et Q30 selon le changement. Un tri du
  catalogue n’autorise aucune permission supplémentaire.
- Barre de filtres sur `surface-content-header`, sélecteurs et menus `compact`
  comme le Répertoire ; corps de section `surface-panel`, en-tête
  `surface-panel-header`. La composition par pôles reste adaptée à la lecture.
- Conserver `PageIdentityHero`, les compteurs et les cartes de lecture : les
  descriptions et prérequis n'appellent ni tableau de gestion, ni pagination,
  ni barre d'enregistrement. Le catalogue versionné en code ne nécessite
  aucun modèle Prisma ou éditeur métier.
- Utiliser `ListSearchField` avec son label visible associé, son effacement
  partagé et la limite de 200 caractères. Les commandes de remise à zéro
  rendent le focus à la recherche ; chaque commande de détail nomme son
  chantier pour la navigation accessible.
- La recherche inclut le critère de livraison `doneWhen`, déjà visible dans les
  cartes. Les valeurs inconnues de pôle/étape reviennent aux filtres neutres ;
  l'URL est normalisée sans entrée d'historique supplémentaire, en conservant
  les autres paramètres et l'ancre. La remise à zéro rend les 39 chantiers.
  Aucun module futur n’est activé par cet écran.

## Preuves et limites

Le [contrôle transverse des menus du 10 octobre](../../audits/AUDIT_MENUS_2026-10-10.md)
exécute les sélecteurs pôle et phase du composant réel, avec contexte de navigation
simulé, à quatre largeurs. Ils héritent des contours et arrondis partagés ; clavier,
fermeture et restitution du focus vérifiés. Cette preuve historique n'incluait
pas le parcours authentifié complet.

La cartographie et la réconciliation documentaire du 10 octobre examinent le
catalogue dans le code. La matrice est corrigée pour inclure notifications et
journal ; l’actualité reprend le statut « À cadrer » du catalogue. Les essais
applicatifs de la cartographie restent datés, non rejoués par cette modification.

Le [contrôle du 11 octobre](../../audits/AUDIT_PAGES_RESTANTES_2026-10-11.md)
exécute rendu, URL invalide, recherche sans résultat, filtres pôle/étape et remise
à zéro à 320, 390, 768 et 1 440 px, sans erreur JavaScript ni débordement global.
Le composant et le catalogue sont réels ; session et navigation sont simulées.
L'intégration authentifiée restait alors à vérifier.

Le contrôle du 12 octobre confirme les 39 lignes de chantiers, leurs statuts
et prérequis, et les 57 correspondances d'anciennes destinations. Les trois
tests du catalogue passent ; aucun cycle ni prérequis d'étape ultérieure.
L'omission de `/activite/actualites` dans la matrice est corrigée et vérifiée.
Les **18 scénarios client** passent à six largeurs de 320 à 1 920 px : détails,
clavier, recherche, 48 combinaisons pôle/étape, URL et historique. Le focus de
réinitialisation et les noms contextuels sont corrigés et vérifiés dans ce cadre.
Les **20 tests ciblés** passent ; le rapport distingue leurs preuves de
l'intégration authentifiée : huit scénarios avec le véritable serveur Next
de production, PostgreSQL isolé, comptes racine et USER et connexion MFA.
Accès anonyme, cookie forgé et session périmée sont refusés ; filtres,
historique, rechargement, recherche et cadre réel passent à sept largeurs.
La suite web comporte 1 230 réussites et 100 tests ignorés ; build, types,
lint et budgets passent. Les tests SQL ignorés d'autres modules ne sont pas
comptés comme validés.

| ID | Point | Résultat / déclencheur de réexamen | État |
| --- | --- | --- | --- |
| FDR-01 | Intégration authentifiée | Huit scénarios réels réussis le 12 octobre ; rouvrir lors d'une modification du cadre privé ou de sa politique | Clos |
| FDR-02 à FDR-04 | Focus, détails accessibles et correspondance de matrice | Corrections vérifiées ; maintenir les noms contextuels, le focus de reprise et l'alignement des références | Clos |

Aucun défaut bloquant identifié dans ce périmètre. Lecteur d'écran, zoom natif,
appareils physiques et gestionnaires de mots de passe installés ne sont pas
couverts par ces preuves. Les étapes, statuts et prérequis seront réexaminés
avec les décisions produit lors de la conception ou livraison d'un chantier.
