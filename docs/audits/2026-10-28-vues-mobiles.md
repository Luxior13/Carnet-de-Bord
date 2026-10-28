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
  jetable préparée par `e2e:setup`, Chromium de Playwright, superadmin de test.
- **Données** : une personne aux valeurs longues (pseudo, prénom composé,
  email de 58 caractères) et un second compte au nom composé.
- **Largeurs** : 320, 390 et 768 px, hauteur 780 px ; menu ouvert sous
  1 024 px.
- **Première visite** : profil « Desktop Chrome » redimensionné, 84 captures
  relues (haut et bas de page) à 390 px, et à 320 et 768 px pour les pages
  les plus denses.
- **Contrôle permanent** (après correction) : `apps/web/e2e/mobile-layout.checks.ts`,
  appelé par le parcours E2E, sur un téléphone émulé (« Pixel 7 » : tactile,
  barres de défilement superposées). Captures gardées seulement si
  `MOBILE_TOUR_DIR` est défini, hors du dépôt.

## Limites

- Sur la première visite, le profil de bureau réservait une barre de
  défilement classique de chaque côté (`scrollbar-gutter: stable both-edges`) :
  les marges d’environ 32 px des captures n’étaient pas réelles. Le contrôle
  permanent, sur téléphone émulé, montre la marge réelle de 16 px.
- La première visite excusait tout élément contenu par un ancêtre rogné ou
  défilant ; or `#main-content` défile verticalement, donc `overflow-x: auto` :
  un débordement réel y aurait été masqué. Son « aucun débordement » n’était
  pas une preuve. Le contrôle permanent mesure le défilement horizontal de la
  page et de `#main-content`, et n’excuse que les conteneurs défilants
  volontaires ; c’est sa passe qui fait foi.
- Safari iOS, Android réel et lecteur d’écran mobile ne sont pas couverts.

## Constats

| ID | Nature / priorité | Constat | Attendu | État |
| --- | --- | --- | --- | --- |
| MOB-01 | Défaut, P2 | Cibles tactiles sous 44 px à 390 px : boutons standards et « sm » à 40 px (`Button`), recherche et tri des listes à 38 px, boutons icône à 32 px (afficher le mot de passe, aide « i », « Détails de la session », dépliants de la feuille de route), interrupteur et case sous 44 px, liens des coordonnées à 19 px | Règle écrite : 44 px sous 640 px | Clos après vérification : 44 px sous 640 px dans `Button` (défaut, sm, icône), `Select` compact, recherche et icônes des listes (texte à 16 px, sans zoom iOS), `Disclosure`, zones `::after` de `Switch` et `Checkbox`, actions du bandeau, volet Autorisations, menu Rubriques, liens des coordonnées, champs de connexion |
| MOB-02 | Défaut, P2 | Fil d’Ariane : le nom courant coupé net à 320 et 390 px (« Stéphanie-Marie Dupont-I »), sans points de suspension | Troncature avec « … », nom complet accessible | Clos après vérification : libellés dans un `span` tronqué (« Version B 1793… ») |
| MOB-03 | Dette, P2 | Listes (Répertoire, Utilisateurs) : les filtres rapides passent sur quatre à six lignes et repoussent le premier résultat d’environ 250 px | Premier résultat proche du haut sur téléphone | Clos après vérification : une rangée par groupe, défilante horizontalement sous 640 px, jusqu’aux bords de la carte |
| MOB-04 | Défaut, P2 | Mon compte, Sécurité : « Nouveaux codes de secours » et « Changer d’application » alignés à droite à largeur naturelle | Actions de carte pleine largeur sous 640 px | Clos après vérification : pieds de carte en colonne pleine largeur (double authentification, sessions, création de compte) |
| MOB-05 | Défaut, P2 | Fiche utilisateur, Autorisations : environ 300 px de réglages avant la recherche ; page ouverte en bas de l’écran ; retour et nom de page perdus au défilement ; barre d’enregistrement hors de l’écran ; onglets qui basculent en menu dès qu’un point de modification apparaît | Écran utilisable sur téléphone | Clos après vérification : vue en deux écrans, titre collé, barre `docked`, point en pastille ([fiche](../pages/systeme/utilisateurs/fiche-autorisations.md#décisions-retenues)) ; banc 59/59 |
| MOB-06 | Dette, P2 | Aucun contrôle automatique : une nouvelle page pouvait déborder ou avoir de petites cibles sans qu’un test le signale | Contrôle mobile systématique de chaque page | Clos après vérification : contrôle permanent dans l’E2E, couverture du registre des fonctionnalités exigée ; E2E réussi en 2,0 min, 54 captures, échantillon relu |

## Suite

« Ok go » du propriétaire le 28 octobre 2026 sur toutes les corrections.
Règles regroupées dans [comportements](../design/comportements.md#mobile-et-petites-fenêtres).

**À vérifier, hors mobile.**

- L’éditeur d’autorisations affichait « Double authentification non activée »
  pour un compte de test créé directement en base avec `mfaEnabledAt`, sans
  secret d’application, alors que le bandeau indiquait « activée ». À vérifier
  sur un compte réellement enrôlé avant de qualifier.
- Le journal du navigateur de l’E2E montre des chargements de morceaux
  JavaScript refusés par la politique de sécurité du contenu (`script-src`),
  sans échec de parcours. Origine (préchargement ou chargement réel) non
  qualifiée.
