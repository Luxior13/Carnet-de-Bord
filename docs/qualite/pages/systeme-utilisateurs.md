# Suivi — Utilisateurs, liste

## Identité et périmètre

- Route : `/systeme/utilisateurs`.
- Fonction livrée : rechercher et consulter les comptes, leurs accès, leur état
  et leur dernière connexion ; accès à la création selon les droits.
- Type : liste de gestion privée ; fiche et formulaire de création hors de ce suivi.
- Sources : [page](../../../apps/web/src/app/systeme/utilisateurs/page.tsx),
  [liste](../../../apps/web/src/features/users/UsersListPage.tsx),
  [disposition](../../../apps/web/src/features/users/UsersListLayout.module.css).
- Ce suivi est amorcé le 26 septembre 2026 depuis les décisions et contrôles déjà
  consignés. La création du référentiel n’a pas rejoué ces contrôles.

## Décisions courantes

- Titre compact, description « Gérez les comptes et leurs accès. » en texte secondaire.
- Création dans la barre d’outils de la liste, adaptée aux droits.
- Sidebar ancrée à gauche ; rail indépendant à droite lorsque la place le permet.
- Largeur de travail privilégiée aux tailles intermédiaires ; centrage écran sur
  grand écran ; adaptation en cartes selon la largeur réelle.
- Palette bleue proche de la sidebar, badges discrets sans fond coloré dominant.
- Recherche, filtres, tri et pagination serveur ; la liste n’affiche pas tous les
  comptes à la fois. Permissions effectives décrites dans [PERMISSIONS](../../PERMISSIONS.md).
- Aucun nouveau toast ou événement durable n’est nécessaire pour simplement lire
  la liste ou changer un filtre. Les événements de sécurité des autres parcours
  conservent leurs règles propres.
- Les comptes ne sont pas les fiches Personnes du Répertoire.

## Utilisation du guide pour le prochain changement

Une retouche de description concerne surtout Q01, Q02, Q03, Q04 et Q27 ; le reste
peut être regroupé hors impact si aucun effet indirect n’est identifié.

Une nouvelle commande sur un compte réactive au minimum les questions Q06, Q07,
Q09, Q10, Q14 et Q15. Q08 se décide selon l’événement, pas automatiquement.
Un changement de stockage ou de suppression impose de reconsidérer Q11 à Q16 et Q29.

Ces exemples ne remplacent pas le passage de toutes les questions de sélection.

## Contrôles historiques et limites

Le [rapport daté](../../AUDIT_UI_UTILISATEURS_2026-09-26.md) conserve le détail des
mesures, décisions et limites. Les captures, relevés et scripts temporaires ont
été supprimés à la demande de l’utilisateur.

Les essais antérieurs incluent disposition, clavier, pagination simulée, erreurs
réseau et réponses tardives. Ils ne constituent pas un benchmark de la base réelle.
Une modification future doit choisir ses propres vérifications pertinentes.

## Points ouverts hérités

| Point | Suite concrète | Déclencheur |
| --- | --- | --- |
| Parcours réels avec permissions/session/base | Préparer une base E2E isolée et les profils nécessaires | Avant conclusion fonctionnelle globale |
| Volumes et coûts serveur | Mesurer requêtes, agrégations et pages éloignées sur données représentatives | Hausse de volume ou travail de performance |
| Lecteur d’écran, appareils réels, zoom natif | Exécuter les parcours importants dans ces environnements | Revue d’accessibilité complète |
| Graisses visuelles dans WebKit Windows | Comparer dans Safari réel avant toute correction globale de police | Revue de compatibilité |
| Responsables et fréquence de suivi | Désigner selon l’exploitation réelle | Mise en place du suivi opérationnel |

Ne pas présenter ces points comme nouveaux défauts prouvés ni comme déjà résolus.
