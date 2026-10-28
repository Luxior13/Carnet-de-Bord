# Vues mobiles de toutes les pages — 28 octobre 2026

[Index des audits](README.md) · [Comportements — Mobile](../design/comportements.md#mobile-et-petites-fenêtres) · [Méthode d’audit](../methode/audit.md)

## Demande et périmètre

Le propriétaire demande un tour des vues mobiles de chaque page, « point très
important à bien mettre en place maintenant avant qu’il y ait beaucoup de
pages ». Audit transverse : toutes les routes privées et publiques, chaque
onglet des trois fiches, le menu mobile.

- **Point de départ** : `main` à `6bafed9` avec les changements locaux de la
  session (onglets, Profil, Sécurité, Paramètres, fiche personne, retrait de
  la provenance).
- **Environnement** : build de production Next, base PostgreSQL locale
  jetable préparée par `e2e:setup`, Chromium de Playwright (profil « Desktop
  Chrome » redimensionné), superadmin de test.
- **Données** : une personne aux valeurs longues (pseudo, prénom composé,
  email de 58 caractères) et un second compte au nom composé, créés pour la
  visite.
- **Largeurs** : 320, 390 et 768 px, hauteur 780 px ; capture en haut et en
  bas de chaque page ; menu ouvert sous 1 024 px.
- **Outil** : `apps/web/e2e/mobile-tour.spec.ts`, lancé seulement si
  `MOBILE_TOUR_DIR` est défini ; il relève tout élément qui sort de l’écran
  et toute cible tactile de moins de 44 px sous 640 px (liens en ligne et
  éléments réservés aux lecteurs d’écran exclus de l’analyse).
- **Résultat d’exécution** : 1 passage réussi (1,8 min), 84 captures relues
  à 390 px, et à 320 et 768 px pour les pages les plus denses. Les captures
  restent hors du dépôt.

## Limite importante

Le profil « Desktop Chrome » réserve une barre de défilement classique : avec
`scrollbar-gutter: stable both-edges`, la zone principale perd environ 15 px
de chaque côté sur les captures. Un téléphone a des barres superposées : la
marge réelle reste `--private-content-padding` (16 px à ces largeurs). Les
marges des captures ne sont donc pas un constat. Une prochaine visite doit
émuler un téléphone (tactile, barres superposées). Safari iOS, Android réel
et lecteur d’écran mobile ne sont pas couverts.

## Résultats

Aucun débordement horizontal, sur aucune page et à aucune des trois largeurs.
Toutes les pages restent utilisables ; les fenêtres passent en plein écran,
la navigation des fiches devient un sélecteur à 320 px, le menu latéral un
volet.

| ID | Nature / priorité | Constat | Attendu | Prochaine action |
| --- | --- | --- | --- | --- |
| MOB-01 | Défaut, P2 | Cibles tactiles sous 44 px à 390 px : boutons standards et « sm » à 40 px (`Button`), recherche et tri des listes à 38 px, boutons icône à 32 px (afficher le mot de passe, aide « i », « Détails de la session », dépliants de la feuille de route), interrupteur 32 × 18 px, case « Rester connecté » 16 px | Règle écrite : 44 px sous 640 px ([comportements](../design/comportements.md#mobile-et-petites-fenêtres)) | Appliquer la règle dans les primitives partagées, pas page par page |
| MOB-02 | Défaut, P2 | Fil d’Ariane : le nom courant est coupé net à 320 et 390 px (« Stéphanie-Marie Dupont-I »), sans points de suspension | Troncature avec « … », nom complet accessible | Corriger `BreadcrumbTrail` |
| MOB-03 | Dette, P2 | Listes (Répertoire, Utilisateurs) : les filtres rapides passent sur quatre à six lignes et repoussent le premier résultat d’environ 250 px | Premier résultat visible sans défiler sur un téléphone courant | Proposition à valider |
| MOB-04 | Défaut, P2 | Mon compte, Sécurité : « Nouveaux codes de secours » et « Changer d’application » restent alignés à droite à largeur naturelle, alors que les autres actions de carte prennent toute la largeur sur téléphone | Actions de carte pleine largeur sous 640 px | Aligner le pied de carte |
| MOB-05 | Suggestion | Fiche utilisateur, Autorisations : environ 300 px de réglages (volet, compteur, filtres, rôle, avertissement) avant la recherche | Contenu utile plus haut sur téléphone | À discuter |
| MOB-06 | Dette, P2 | Aucun contrôle automatique : une nouvelle page peut déborder ou avoir de petites cibles sans qu’un test le signale | Contrôle mobile systématique de chaque page | Faire de la visite un contrôle permanent |

Hors mobile, noté pendant la visite : l’éditeur d’autorisations affiche
« Double authentification non activée » pour le compte de test, alors que le
bandeau indique « activée ». Le compte a été créé directement en base avec
`mfaEnabledAt`, sans secret d’application : l’éditeur semble lire une autre
source. À vérifier sur un compte réellement enrôlé avant de qualifier.

## Suite

Constats présentés au propriétaire le 28 octobre 2026 ; corrections et règles
en attente de sa décision.
