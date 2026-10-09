# Matrice de préparation — état réel et projets

Référence révisée le 9 octobre 2026. Les chantiers proviennent du [catalogue de la feuille de route](../../apps/web/src/features/roadmap/roadmap.constants.ts). L’ordre et les décisions sont décrits dans [FEUILLE_DE_ROUTE.md](../../docs/references/FEUILLE_DE_ROUTE.md).

## Pages actuellement disponibles

| Route ou famille | État | Placement |
| --- | --- | --- |
| `/` | Accueil livré, vues métier à enrichir | Aujourd’hui |
| `/mes-notifications` | Module retiré le 9 octobre 2026, à reconstruire ; redirige vers la feuille de route | — |
| `/mon-compte` | Profil et sécurité du compte livrés | Outils globaux |
| `/recherche` | Page retirée le 9 octobre 2026 ; navigation rapide conservée ; redirige vers l’accueil | Outils globaux |
| `/membres/repertoire`, `/nouveau`, `/[id]` sous ce chemin | Liste, création et fiche Personne livrées | Membres |
| `/activite/actualites` | Module mis en attente, à reconstruire ; redirige vers la feuille de route | — |
| `/systeme/utilisateurs`, `/nouveau`, `/[id]` sous ce chemin | Liste, création et fiche Utilisateur livrées | Système |
| `/systeme/journal-activite` | Vue globale retirée le 9 octobre 2026, à reconstruire ; redirige vers la feuille de route | — |
| `/systeme/parametres` | Paramètres techniques livrés | Système |
| `/systeme/feuille-de-route` | Catalogue de projets livré | Système |
| `/login` | Connexion | Authentification |
| `/administration`, `/tableau-de-bord`, `/mes-notifications`, `/tableau-de-bord/mes-notifications`, `/systeme/journal-activite`, `/systeme` | Accès de compatibilité, redirection ou entrée de pôle | Routes d’appui |

Les libellés de familles ci-dessus ne créent pas des routes racines `/nouveau` ou `/[id]`. Les écrans d’erreur, chargement et refus sont des états de parcours, pas des modules supplémentaires.

Les anciennes routes prévues ne sont pas des « squelettes disponibles ». Certaines sont absentes, d’autres rencontrent un refus ou une route générique sans module livré. Les organisations partenaires sont à reconstruire ; les anciens modèles supprimés ne sont pas comptés comme existants.

## Statuts des projets

- **À cadrer** : périmètre nouveau, à concevoir puis construire.
- **À compléter** : socle existant décrit dans la carte, extension à réaliser.
- Une carte livrée devra être retirée ou recentrée sur son reste à faire, avec une mise à jour de cette matrice.
- Chaque carte de l’interface précise public, première version, prérequis, critère de livraison et suite éventuelle. Les étapes ne sont pas des échéances.

## Les 37 chantiers

| Identifiant stable | Chantier | Pôle cible | Étape | État | Prérequis |
| --- | --- | --- | --- | --- | --- |
| `legal-entities` | Identité juridique & périmètres | Structure | 1 | À cadrer | — |
| `compliance` | Confidentialité, image & mineurs | Structure | 1 | À cadrer | Identité juridique & périmètres ; Accès & responsabilités métier |
| `access-scopes` | Accès & responsabilités métier | Système | 1 | À compléter | — |
| `person-relationships` | Adhésions et rôles | Membres | 2 | À compléter | Identité juridique & périmètres ; Accès & responsabilités métier |
| `sport-teams` | Équipes & saisons | Esport | 2 | À cadrer | Adhésions et rôles |
| `sport-planning` | Planning & disponibilités | Esport | 2 | À cadrer | Équipes & saisons |
| `personal-work` | Mon travail & espace personnel | Aujourd’hui | 3 | À compléter | Accès & responsabilités métier ; Planning & disponibilités ; Documents & acceptations ; Projets & tâches |
| `recruitment` | Recrutement | Membres | 3 | À cadrer | Adhésions et rôles ; Équipes & saisons |
| `onboarding` | Arrivées et départs | Membres | 3 | À cadrer | Adhésions et rôles ; Documents & acceptations ; Projets & tâches |
| `competitions` | Compétitions & inscriptions | Esport | 3 | À cadrer | Équipes & saisons ; Planning & disponibilités |
| `governance` | Gouvernance & décisions | Structure | 3 | À cadrer | Identité juridique & périmètres ; Documents & acceptations ; Réunions & décisions de séance |
| `documents` | Documents & acceptations | Structure | 3 | À cadrer | Identité juridique & périmètres ; Accès & responsabilités métier |
| `incidents` | Incidents & sanctions | Structure | 3 | À cadrer | Adhésions et rôles ; Confidentialité, image & mineurs |
| `approvals` | À valider | Aujourd’hui | 3 | À cadrer | Accès & responsabilités métier |
| `tasks` | Projets & tâches | Activité | 3 | À cadrer | Accès & responsabilités métier |
| `calendar` | Calendrier commun | Activité | 3 | À cadrer | Planning & disponibilités |
| `meetings` | Réunions & décisions de séance | Activité | 3 | À cadrer | Adhésions et rôles ; Projets & tâches |
| `debriefs` | Débriefs | Activité | 3 | À cadrer | Projets & tâches ; Planning & disponibilités |
| `internal-news` | Actualité interne & audiences | Activité | 3 | À compléter | Accès & responsabilités métier |
| `contracts` | Contrats & obligations | Structure | 4 | À cadrer | Documents & acceptations ; Adhésions et rôles |
| `logistics` | Ressources & logistique | Activité | 4 | À cadrer | Adhésions et rôles ; Projets & tâches |
| `organizations` | Organisations & contacts | Relations | 4 | À cadrer | Adhésions et rôles |
| `partnerships` | Partenariats & opportunités | Relations | 4 | À cadrer | Organisations & contacts ; Contrats & obligations ; Projets & tâches |
| `accounts` | Comptes & rapprochement | Finances | 4 | À cadrer | Identité juridique & périmètres |
| `payments` | Opérations & règlements | Finances | 4 | À cadrer | Comptes & rapprochement ; Adhésions et rôles ; Organisations & contacts |
| `invoices` | Facturation & achats | Finances | 4 | À cadrer | Opérations & règlements ; Contrats & obligations |
| `expenses` | Notes de frais & remboursements | Finances | 4 | À cadrer | Opérations & règlements ; À valider |
| `finance-controls` | Contrôles & clôtures | Finances | 4 | À cadrer | Opérations & règlements ; À valider |
| `data` | Données, imports & sauvegardes | Système | 4 | À compléter | Identité juridique & périmètres ; Accès & responsabilités métier |
| `preparation` | Préparation & analyse vidéo | Esport | 5 | À cadrer | Planning & disponibilités ; Débriefs |
| `performance` | Performance & objectifs | Esport | 5 | À cadrer | Compétitions & inscriptions ; Débriefs |
| `budget` | Budget & pilotage | Finances | 5 | À cadrer | Opérations & règlements ; Facturation & achats |
| `prizes` | Gains de compétition & primes | Finances | 5 | À cadrer | Compétitions & inscriptions ; Contrats & obligations ; Opérations & règlements |
| `business-search` | Recherche dans les dossiers | Système | 5 | À compléter | Accès & responsabilités métier ; Documents & acceptations |
| `communication` | Communication & contenus | Activité | 6 | À cadrer | Projets & tâches ; Confidentialité, image & mineurs ; Partenariats & opportunités |
| `automations` | Rappels & automatisations | Système | 6 | À cadrer | Projets & tâches ; Documents & acceptations ; Accès & responsabilités métier |
| `integrations` | Intégrations & publication publique | Système | 6 | À cadrer | Équipes & saisons ; Organisations & contacts ; Données, imports & sauvegardes |

## Correspondance des anciennes destinations

Les références suivantes préservent le périmètre des anciennes propositions. Ce sont des **URL historiques de conception**, pas des liens vers des pages disponibles ni les futures routes canoniques. Plusieurs anciennes pages deviennent des vues du même chantier.

| Ancienne destination | Chantier qui reprend le besoin | Étape |
| --- | --- | --- |
| `/tableau-de-bord/mes-taches` | Aujourd’hui → Mon travail & espace personnel | 3 |
| `/tableau-de-bord/prochaines-reunions` | Aujourd’hui → Mon travail & espace personnel | 3 |
| `/tableau-de-bord/documents-a-accepter` | Aujourd’hui → Mon travail & espace personnel | 3 |
| `/tableau-de-bord/alertes-importantes` | Aujourd’hui → Mon travail & espace personnel | 3 |
| `/tableau-de-bord/mes-rappels` | Aujourd’hui → Mon travail & espace personnel | 3 |
| `/vie-interne/membres-adherents` | Membres → Adhésions et rôles | 2 |
| `/vie-interne/membres` | Membres → Adhésions et rôles | 2 |
| `/vie-interne/adherents` | Membres → Adhésions et rôles | 2 |
| `/bureau-juridique/personnes-contacts` | Membres → Adhésions et rôles | 2 |
| `/vie-interne/recrutement-tryouts` | Membres → Recrutement | 3 |
| `/sport-team-control/recrutement-tryouts` | Membres → Recrutement | 3 |
| `/vie-interne/onboarding-depart` | Membres → Arrivées et départs | 3 |
| `/sport-team-control` | Esport → Équipes & saisons | 2 |
| `/sport-team-control/jeux` | Esport → Équipes & saisons | 2 |
| `/sport-team-control/rosters` | Esport → Équipes & saisons | 2 |
| `/sport-team-control/membres-esport` | Esport → Équipes & saisons | 2 |
| `/sport-team-control/scrims` | Esport → Planning & disponibilités | 2 |
| `/sport-team-control/calendrier-esport` | Esport → Planning & disponibilités | 2 |
| `/sport-team-control/tournois-matchs` | Esport → Compétitions & inscriptions | 3 |
| `/sport-team-control/performance` | Esport → Performance & objectifs | 5 |
| `/bureau-juridique/decisions-bureau` | Structure → Gouvernance & décisions | 3 |
| `/bureau-juridique/documents` | Structure → Documents & acceptations | 3 |
| `/bureau-juridique/documents-officiels` | Structure → Documents & acceptations | 3 |
| `/bureau-juridique/acceptation-chartes` | Structure → Documents & acceptations | 3 |
| `/systeme/modeles-documents` | Structure → Documents & acceptations | 3 |
| `/bureau-juridique/contrats` | Structure → Contrats & obligations | 4 |
| `/bureau-juridique/incidents-sanctions` | Structure → Incidents & sanctions | 3 |
| `/systeme/validations` | Aujourd’hui → À valider | 3 |
| `/vie-interne/calendrier-interne` | Activité → Calendrier commun | 3 |
| `/vie-interne/reunions` | Activité → Réunions & décisions de séance | 3 |
| `/vie-interne/reunions-suivi` | Activité → Réunions & décisions de séance | 3 |
| `/vie-interne/debriefs` | Activité → Débriefs | 3 |
| `/sport-team-control/debriefs` | Activité → Débriefs | 3 |
| `/bureau-juridique/inventaire-acces` | Activité → Ressources & logistique | 4 |
| `/bureau-juridique/partenaires` | Relations → Organisations & contacts | 4 |
| `/bureau-juridique/sponsors` | Relations → Organisations & contacts | 4 |
| `/tresorerie/comptes` | Finances → Comptes & rapprochement | 4 |
| `/tresorerie/operations` | Finances → Opérations & règlements | 4 |
| `/tresorerie/recettes` | Finances → Opérations & règlements | 4 |
| `/tresorerie/depenses` | Finances → Opérations & règlements | 4 |
| `/tresorerie/cotisations-adherents` | Finances → Opérations & règlements | 4 |
| `/tresorerie/sponsoring-financier` | Finances → Opérations & règlements | 4 |
| `/tresorerie/factures-justificatifs` | Finances → Facturation & achats | 4 |
| `/tresorerie/remboursements` | Finances → Notes de frais & remboursements | 4 |
| `/tresorerie/budget` | Finances → Budget & pilotage | 5 |
| `/tresorerie/bilans` | Finances → Budget & pilotage | 5 |
| `/tresorerie/validations-finance` | Finances → Contrôles & clôtures | 4 |
| `/tresorerie/exports-finance` | Finances → Contrôles & clôtures | 4 |
| `/tresorerie/journal-financier` | Finances → Contrôles & clôtures | 4 |
| `/tresorerie/archives-finance` | Finances → Contrôles & clôtures | 4 |
| `/vie-interne/notifications-rappels` | Système → Rappels & automatisations | 6 |
| `/systeme/modeles` | Système → Rappels & automatisations | 6 |
| `/systeme/modeles-notifications` | Système → Rappels & automatisations | 6 |
| `/systeme/automatisations` | Système → Rappels & automatisations | 6 |
| `/systeme/exports-sauvegardes` | Système → Données, imports & sauvegardes | 4 |
| `/systeme/archives` | Système → Données, imports & sauvegardes | 4 |

Les accueils de pôles sans synthèse utile ne sont pas recréés. La messagerie interne autonome est écartée du périmètre actuel. Une ancienne fiche qui décrit un besoin plus large doit être relue à la lumière du chantier cible avant développement.

## Contrat de préparation et livraison

1. Identifier la source des données, le responsable métier et un parcours utile de bout en bout.
2. Définir le rattachement à l’entité, la saison/période et les relations nécessaires, sans fusionner des objets aux cycles différents.
3. Décrire les actions autorisées, la confidentialité, les pièces jointes, l’audit, la conservation et les cas de révocation.
4. Concevoir les états vide, chargement, erreur, accès refusé, mobile et conflit de modification lorsqu’il s’applique.
5. Vérifier le critère de livraison de la carte, les dépendances et les politiques serveur.
6. Activer ensemble route, fonctionnalité, permissions et navigation ; actualiser cette matrice et le catalogue.

Le socle visuel existant doit être réutilisé. Une carte de projet ne justifie pas d’ajouter une table dormante, une permission active ou une fausse page métier.

Les anciennes fiches détaillées sont conservées comme historique et matière de conception. Elles ne font plus autorité sur le statut actuel, le découpage ni la navigation.
