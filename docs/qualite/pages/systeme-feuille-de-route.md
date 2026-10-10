# Suivi — Feuille de route

## État courant — 10 octobre 2026

Route `/systeme/feuille-de-route`, catalogue informatif pour les comptes connectés.
Le catalogue comprend 39 chantiers, huit pôles cibles et six étapes ; ces nombres
ne représentent ni 39 pages à créer ni huit pôles actifs. La navigation actuelle
compte trois pôles et cinq entrées principales.

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

## Preuves et point ouvert

La cartographie et la réconciliation documentaire du 10 octobre examinent le
catalogue dans le code. La matrice est corrigée pour inclure notifications et
journal ; l’actualité reprend le statut « À cadrer » du catalogue. Les essais
applicatifs de la cartographie restent datés, non rejoués par cette modification.

| ID | Point | Suite / déclencheur | Responsable / état |
| --- | --- | --- | --- |
| FDR-01 | Parcours authentifié de lecture, filtres et petit écran non rejoué pendant la réconciliation | Vérifier lors de la prochaine évolution visible du catalogue, avec session dédiée | À attribuer / à vérifier |
