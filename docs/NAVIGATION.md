# Navigation — état actuel et cible

Référence révisée le 22 septembre 2026. Le catalogue des projets est séparé de la navigation active. Voir la [feuille de route](FEUILLE_DE_ROUTE.md) pour les étapes et la [matrice](../features/pages/MATRICE_PREPARATION.md) pour les correspondances historiques.

## Navigation actuelle

Huit entrées sont déclarées dans quatre pôles. Leur visibilité dépend des accès de l’utilisateur. Les noms et routes actifs proviennent du registre des fonctionnalités.

| Pôle actuel | Entrées actives | Placement |
| --- | --- | --- |
| Aujourd’hui | Accueil `/`, notifications `/mes-notifications` | Travail personnel et messages reçus |
| Personnes | Répertoire `/vie-interne/repertoire` | Identités, création et fiches |
| Activité | Actualité interne `/vie-interne/actualite-interne` | Informations collectives |
| Système | Utilisateurs `/administration/utilisateurs`, journal `/systeme/journal-activite`, paramètres `/systeme/parametres`, feuille de route `/feuille-de-route` | Comptes, technique et plan produit |

`/mon-compte` et `/recherche` sont accessibles par les outils globaux. `/login` appartient au parcours de connexion. Les formulaires de création et fiches de personnes ou utilisateurs restent sous leur liste principale.

`/administration`, `/tableau-de-bord` et `/tableau-de-bord/mes-notifications` sont des accès de compatibilité. `/systeme` sert d’entrée au pôle. Les routes non livrées ne sont pas des écrans vides utilisables.

Les 46 anciennes destinations planifiées ont été retirées du catalogue de navigation. Elles restent référencées dans le catalogue de projets et dans une liste de destinations réservées pour conserver le refus d’ouverture par les helpers de navigation. Cette liste ne remplace aucune politique serveur.

## Huit pôles cibles

| Pôle | Responsabilité | Espaces ou vues prévus |
| --- | --- | --- |
| Aujourd’hui | Ce qui concerne le compte connecté | Mon travail, notifications, éléments à valider |
| Personnes | Identité et parcours des personnes | Répertoire et engagements, candidatures, arrivées/départs |
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

Une nouvelle entrée répond à un usage récurrent, porte un nom clair et possède un état vide utile. Un filtre, une action isolée et un accueil qui répète le menu ne justifient pas automatiquement une page.

La hiérarchie privilégiée est pôle → lieu → fiche ou vue. Le fil d’Ariane situe l’utilisateur ; le retour conserve les filtres. Sur mobile, les mêmes destinations restent accessibles sans forcer un menu de huit pôles dépliés.

Chaque module traite les états de chargement, absence de données, erreur réessayable, accès refusé et conflit de modification lorsqu’il s’applique. L’interface explique une action indisponible sans révéler l’existence d’un dossier confidentiel.

Une entrée masquée n’est jamais une protection suffisante : le serveur contrôle la ressource et l’action. La feuille de route est un catalogue informatif commun aux comptes connectés et ne confère aucun accès futur.

## Routes et maintenance

Les routes fonctionnelles actuelles restent stables. Les anciennes URL planifiées sont des références de conception, pas des liens à exposer. La route canonique d’un nouveau module sera fixée à sa livraison ; les redirections nécessaires seront explicites et testées.

Mettre à jour ensemble le registre de fonctionnalités, la navigation active, les permissions, les politiques serveur, les fils d’Ariane et les tests de contrat lors de l’ouverture d’un module. Les libellés historiques internes ne se renomment pas implicitement à partir de la cible produit.
