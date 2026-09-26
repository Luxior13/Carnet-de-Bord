# Navigation — état actuel et cible

Référence révisée le 24 septembre 2026. Le catalogue des projets est séparé de la navigation active. Voir la [feuille de route](FEUILLE_DE_ROUTE.md) pour les étapes et la [matrice](../features/pages/MATRICE_PREPARATION.md) pour les correspondances historiques.

## Navigation actuelle

Huit entrées sont déclarées dans quatre pôles. Leur visibilité dépend des accès de l’utilisateur. Les noms et routes actifs proviennent du registre des fonctionnalités.

| Pôle actuel | Entrées actives | Placement |
| --- | --- | --- |
| Aujourd’hui | Accueil `/`, notifications `/mes-notifications` | Travail personnel et messages reçus |
| Membres | Répertoire `/membres/repertoire` | Membres et contacts de la structure |
| Activité | Actualité interne `/activite/actualites` | Informations collectives |
| Système | Utilisateurs `/systeme/utilisateurs`, journal `/systeme/journal-activite`, paramètres `/systeme/parametres`, feuille de route `/systeme/feuille-de-route` | Comptes, technique et plan produit |

`/mon-compte` et `/recherche` sont accessibles par les outils globaux. `/login` appartient au parcours de connexion. Les formulaires de création et fiches de personnes ou utilisateurs restent sous leur liste principale.

Le pôle « Membres » regroupe le Répertoire actuel et les futurs espaces Adhésions et rôles, Recrutement, Arrivées et départs. La page actuelle conserve le titre « Répertoire » et l’action « Ajouter une fiche » ; une fiche porte le nom ou le pseudo de la personne. Le fil d’Ariane présente « Membres → Répertoire → fiche » ; le nom du pôle ne crée pas un lien vers une page d’accueil fictive.

`/administration`, `/tableau-de-bord` et `/tableau-de-bord/mes-notifications` sont des accès de compatibilité. `/systeme` sert d’entrée au pôle. Les routes non livrées ne sont pas des écrans vides utilisables.

Les 46 anciennes destinations planifiées ont été retirées du catalogue de navigation. Elles restent référencées dans le catalogue de projets et dans une liste de destinations réservées pour conserver le refus d’ouverture par les helpers de navigation. Cette liste ne remplace aucune politique serveur.

## Huit pôles cibles

| Pôle | Responsabilité | Espaces ou vues prévus |
| --- | --- | --- |
| Aujourd’hui | Ce qui concerne le compte connecté | Mon travail, notifications, éléments à valider |
| Membres | Identité, engagements et parcours des membres | Répertoire, adhésions et rôles, recrutement, arrivées et départs |
| Esport | Vie des équipes et saisons | Effectifs, planning sportif, compétitions, préparation, performance |
| Activité | Travail collectif quotidien | Actualité, tâches, calendrier partagé, réunions, débriefs, logistique, communication |
| Relations | Relations avec les organisations externes | Organisations, partenariats et livrables |
| Structure | Responsabilité juridique et dossiers sensibles | Entités, gouvernance, documents, contrats, confidentialité, incidents |
| Finances | Prévisions, montants dus et mouvements d’argent | Comptes, règlements, factures, frais, budget, dotations, contrôles |
| Système | Administration technique | Comptes et accès, paramètres, journal, données, automatisations, intégrations, feuille de route |

Ce tableau décrit les lieux logiques, pas un engagement à créer autant d’entrées. Les vues rares deviennent des onglets ou actions contextuelles. Les pôles Esport, Relations, Structure et Finances s’ouvrent seulement avec leurs premiers modules utilisables.

## Règles de placement

- Une donnée a un module propriétaire. Les vues personnelles, synthèses et recherches ne créent pas de copies concurrentes.
- Structure contient les contrats et décisions de gouvernance ; Relations suit les engagements des partenaires. Une fiche partenaire peut afficher ses contrats autorisés.
- Une fiche Personne garde l’identité ; les mandats, adhésions, contrats et affectations sont datés. Personne et Utilisateur ne fusionnent pas.
- Une convocation sportive appartient au planning sportif. Le calendrier général et Mon travail la projettent avec les droits de sa source.
- Les incidents sont confidentiels dans Structure. Les notes de recrutement et les dossiers RH ont aussi leur propre périmètre.
- Les demandes de frais et factures gardent leur parcours distinct des paiements ; les filtres recettes/dépenses ne les remplacent pas.
- Le profil juridique appartient à Structure ; les réglages techniques restent dans Système.
- Le compte, la recherche et les notifications restent atteignables depuis les outils globaux, même lorsqu’une vue personnelle a aussi une entrée de navigation.
- Une archive reste dans son module ; une restauration technique et un export comptable n’ont pas les mêmes règles.

## Admission et expérience utilisateur

Le choix des pôles est un bloc dépliable au-dessus des pages, séparé par une bordure. Un petit bouton à flèche centré sur cette séparation ouvre ou réduit la liste ; le nom du pôle n’est pas le bouton de dépliage. Ouvert, le bloc affiche tous les pôles accessibles dans un ordre stable et met en évidence le pôle courant. Réduit, il affiche uniquement ce dernier. Seules les pages du pôle courant apparaissent en dessous.

Le bloc est ouvert par défaut sur ordinateur et réduit par défaut sur mobile. Un choix explicite est mémorisé dans le navigateur pour le compte concerné et conservé lors des changements de page ou de pôle. En mode sidebar réduite en icônes, le bouton sur la séparation déploie la sidebar et ouvre la liste. Sur un petit écran, la liste peut défiler pour préserver l’accès aux pages et au menu utilisateur.

Le bouton utilisateur reste en bas, séparé des pages : 56 px de hauteur pour
l’avatar, le nom et le rôle, ou une cible de 44 px en mode icônes. Son fond bleu
signale un menu ouvert ou la page Mon compte active. La flèche pointe vers le
menu situé au-dessus ; en mode icônes, celui-ci s’ouvre à droite. Le menu
affiche le nom complet, l’identifiant et le rôle sur des lignes distinctes,
puis Mon compte et Déconnexion. Il défile entièrement lorsque la hauteur
disponible est réduite. La marge inférieure respecte la zone sûre du téléphone.

Le popover utilisateur utilise une surface ardoise uniforme, des séparateurs
en retrait et des icônes sans pastille. Le survol ou la sélection colore
uniquement l’action concernée. Sa largeur de 18rem reste limitée au viewport.

Une nouvelle entrée répond à un usage récurrent, porte un nom clair et possède un état vide utile. Un filtre, une action isolée et un accueil qui répète le menu ne justifient pas automatiquement une page.

La hiérarchie privilégiée est pôle → lieu → fiche ou vue. Le fil d’Ariane situe l’utilisateur ; le retour conserve les filtres. Sur mobile, les mêmes destinations restent accessibles sans forcer un menu de huit pôles dépliés.

Le placement dépend du gabarit et du contenu : la sidebar reste ancrée à gauche,
la colonne principale garde une largeur de travail adaptée et aucun rail ne la
recouvre. Le centrage écran peut être retenu tant qu'il préserve cette largeur ;
sur les tailles intermédiaires, la zone utile peut devenir prioritaire. Consigner
ce choix dans le [suivi de la page](qualite/pages/README.md), sans imposer le même
centrage à une liste et à une page de lecture.

Le header conserve le fil d’Ariane et les outils globaux. Les fiches Personne, Utilisateur et Mon compte placent leur navigation horizontale sous le titre, à toutes les largeurs : liens soulignés, libellés complets, défilement horizontal sur petit écran et barre collante dans le contenu. Le retour vers la liste reste avant le titre. La navigation locale n’occupe plus de rail dans la marge. Les filtres de listes utilisent des contrôles distincts de cette navigation.

Les gabarits partagés limitent la largeur extérieure à 76rem par défaut, 52rem pour les créations et 56rem pour la lecture (actualité, notifications, recherche). Une variante de 92rem reste disponible pour les données denses. Les listes basculent entre tableau et présentation mobile selon la largeur de leur conteneur. Voir la [proposition UX/UI et son suivi](UX_UI_PROPOSITION_2026-09-23.md).

Chaque module traite les états de chargement, absence de données, erreur réessayable, accès refusé et conflit de modification lorsqu’il s’applique. L’interface explique une action indisponible sans révéler l’existence d’un dossier confidentiel.

Une entrée masquée n’est jamais une protection suffisante : le serveur contrôle la ressource et l’action. La feuille de route est un catalogue informatif commun aux comptes connectés et ne confère aucun accès futur.

## Routes et maintenance

Les routes ont été harmonisées le 24 septembre 2026 : Répertoire sous `/membres/repertoire`, Actualité sous `/activite/actualites`, Utilisateurs sous `/systeme/utilisateurs` et Feuille de route sous `/systeme/feuille-de-route`. Les créations et fiches restent sous leur collection. Les anciennes adresses redirigent directement vers leur destination actuelle, avec leurs paramètres. `/systeme` conserve son entrée dépendante des permissions.

Les chemins, constructeurs de fiches et alias sont centralisés dans `apps/web/src/shared/constants/routes.constants.ts`. Les notifications historiques restent lisibles et leurs liens sont traduits à la lecture. Les retours de fiches et de créations conservent la liste filtrée ; les retours historiques vers le Répertoire sont également acceptés et traduits. Les liens d’onglets existants sont conservés ; `section=contacts` est accepté comme alias de Coordonnées dans le Répertoire.

Les notifications partagent leur filtre par `?status=unread` ou `?status=archived`. La feuille de route partage ses filtres avec `pole`, `phase` et `q` ; ses identifiants de pôles restent ceux du catalogue (par exemple `people` pour Membres). Les changements de filtre participent à l’historique ; la saisie de recherche remplace l’entrée courante pour éviter une étape d’historique à chaque caractère.

Les anciennes URL planifiées sont des références de conception, pas des liens à exposer. Les préfixes futurs sont `/esport`, `/relations`, `/structure` et `/finances`. La route précise d’un nouveau module sera fixée à sa livraison, avec ses permissions et ses tests. Les noms de menu peuvent évoluer sans entraîner un nouveau changement de chemin.

Mettre à jour ensemble le registre de fonctionnalités, la navigation active, les permissions, les politiques serveur, les fils d’Ariane et les tests de contrat lors de l’ouverture d’un module. Les libellés historiques internes ne se renomment pas implicitement à partir de la cible produit.
