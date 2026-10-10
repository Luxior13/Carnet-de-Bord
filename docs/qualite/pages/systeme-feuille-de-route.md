# Suivi — Feuille de route

## État courant — 11 octobre 2026

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
- Barre de filtres sur `surface-content-header`, sélecteurs et menus `compact`
  comme le Répertoire ; corps de section `surface-panel`, en-tête
  `surface-panel-header`. La composition par pôles reste adaptée à la lecture.
- La recherche inclut le critère de livraison `doneWhen`, déjà visible dans les
  cartes. Les paramètres inconnus reviennent aux filtres neutres ; la remise à
  zéro rend les 39 chantiers. Aucun module futur n’est activé par cet écran.

## Preuves et point ouvert

Le [contrôle transverse des menus du 10 octobre](../../audits/AUDIT_MENUS_2026-10-10.md)
exécute les sélecteurs pôle et phase du composant réel, avec contexte de navigation
simulé, à quatre largeurs. Ils héritent des contours et arrondis partagés ; clavier,
fermeture et restitution du focus vérifiés. Cela ne clôt pas FDR-01 : le parcours
authentifié complet reste distinct de cette validation des menus.

La cartographie et la réconciliation documentaire du 10 octobre examinent le
catalogue dans le code. La matrice est corrigée pour inclure notifications et
journal ; l’actualité reprend le statut « À cadrer » du catalogue. Les essais
applicatifs de la cartographie restent datés, non rejoués par cette modification.

Le [contrôle du 11 octobre](../../audits/AUDIT_PAGES_RESTANTES_2026-10-11.md)
exécute rendu, URL invalide, recherche sans résultat, filtres pôle/étape et remise
à zéro à 320, 390, 768 et 1 440 px, sans erreur JavaScript ni débordement global.
Le composant et le catalogue sont réels ; session et navigation sont simulées.
FDR-01 reste ouvert uniquement pour leur intégration authentifiée.

| ID | Point | Suite / déclencheur | Responsable / état |
| --- | --- | --- | --- |
| FDR-01 | Lecture et filtres vérifiés dans le navigateur isolé le 11 octobre ; intégration authentifiée non rejouée | Vérifier le cadre et la session dédiés avant conclusion de parcours complet | À attribuer / à vérifier |
