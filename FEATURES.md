# Features a ajouter

Liste simple des features prevues pour le site prive de gestion esport.
Chaque ligne pourra ensuite avoir son propre fichier detaille.

## Organisation globale

- [Organisation UX et relations](features/organisation-ux.md) - Regle generale pour lier les donnees entre modules sans les dupliquer.
- [Documentation des pages](features/pages/README.md) - Detail page par page avec contenu attendu, actions, donnees et liaisons entre modules.
- [Raisons des autres features](features/tri-autres-features.md) - Aide pour decider quelles features garder, fusionner ou repousser.

## Deja existant

- Utilisateurs et permissions - Partie deja presente pour gerer les comptes, roles et acces au site.

## Fonctionnalites transversales

- [Recherche globale](features/recherche-globale.md) - Retrouver rapidement membres, sponsors, documents, finances et notes selon les permissions.

## Sidebar

- [Tableau de bord](features/tableau-de-bord.md) - Vue d'accueil privee avec les alertes, echeances, actions importantes et raccourcis.
- [Gestion des reunions](features/gestion-reunions.md) - Page complete pour organiser les reunions, ajouter les participants et faire le debrief.
- [Actualite interne](features/actualite-interne.md) - Page qui liste les evenements importants de la structure comme un joueur retire ou un sponsor ajoute.
- [Membres](features/membres.md) - Liste des membres avec une fiche detaillee pour garder mail, telephone, notes internes, bans ou informations importantes.
- [Répertoire](features/personnes-contacts.md) - Répertoire central des personnes internes ou externes avec identité, coordonnées et statut dans la structure.
- [Tresorerie](features/tresorerie.md) - Partie finance pour gerer la tresorerie, paiements, depenses, recettes et bilans de l'equipe esport.
- [Adherents](features/adherents.md) - Suivre les adherents, cotisations, informations personnelles et statut dans la structure.
- [Sponsors](features/sponsors.md) - Centraliser les sponsors avec leurs contacts, contrats, obligations, livrables et historique.
- [Chartes et documents officiels](features/chartes-documents.md) - Creer, mettre a jour et exporter en PDF les chartes, reglements et documents importants.
- [Contrats](features/contrats.md) - Centraliser les contrats lies aux sponsors, membres, documents et operations de tresorerie.
- [Debriefs](features/debriefs.md) - Garder les retours internes apres reunions, matchs, scrims, entrainements ou tryouts.
- [Calendrier interne](features/calendrier-interne.md) - Regrouper les reunions, echeances, rappels, deadlines et evenements prives de la structure.
- [Recrutement et tryouts](features/recrutement-tryouts.md) - Suivre les candidats, tests, evaluations et decisions de recrutement.
- [Onboarding et depart](features/onboarding-depart.md) - Gerer les checklists d'arrivee et de depart des membres, staff ou joueurs.
- [Incidents et sanctions](features/incidents-sanctions.md) - Centraliser les incidents, sanctions, avertissements et decisions sensibles.
- [Inventaire et acces](features/inventaire-acces.md) - Suivre le materiel, comptes, licences, maillots et acces confies aux membres.
- [Notifications et rappels](features/notifications-rappels.md) - Envoyer des rappels internes pour reunions, paiements, documents, sponsors et actions importantes.
- [Acceptation des chartes](features/acceptation-chartes.md) - Suivre qui a lu et accepte les chartes ou documents officiels.
- [Journal d'activite](features/journal-activite.md) - Garder une trace des actions importantes faites sur les donnees sensibles.
- [Validations](features/validations.md) - Faire approuver les actions sensibles avant confirmation.
- [Exports et sauvegardes](features/exports-sauvegardes.md) - Exporter les donnees importantes et prevoir les sauvegardes.
- [Parametres](features/parametres.md) - Configurer les statuts, categories, jeux, saisons et options globales.
- [Archives](features/archives.md) - Conserver les anciennes donnees sans les supprimer.

## Autres features a trier

### A confirmer

- Disponibilites internes - A confirmer si besoin prive, car une partie existe deja sur le site public.
- Entrainements - Planifier les sessions, objectifs, presences et retours de performance.
- Preparation match - Gerer les convocations, compositions, consignes et objectifs avant un match public.
- Preparation scrim - Ajouter les notes privees, objectifs et plans lies aux scrims deja visibles ailleurs.
- Tournois - Suivre les inscriptions, deadlines, reglements internes et informations administratives.
- Taches internes - A confirmer si besoin prive, car une partie existe deja sur le site public.
- Strategie - Centraliser les plans de jeu, maps, drafts, compositions et consignes.
- VOD review - Lier les replays, notes d'analyse et axes d'amelioration.
- Performance - Suivre les statistiques, progression, points forts et points a travailler.
- Objectifs - Definir les objectifs individuels, collectifs et saisonniers.
- Demandes internes - Gerer les demandes de joueurs ou staff avec suivi de statut.

### A ne pas dupliquer en prive

- Equipes - Deja gere cote public, a ne pas dupliquer en prive sauf lecture seule plus tard.
- Joueurs - Deja gere cote public pour la partie sportive, utiliser membres pour les infos privees.
- Staff - Deja gere cote public pour l'organisation, utiliser membres et permissions pour les infos privees.
- Rosters - Deja gere cote public, a lier plus tard au prive si besoin de debriefs ou notes internes.

### A ajouter plus tard

- Import/export site public - A ajouter plus tard pour importer en prive les donnees publiques utiles sans les recopier a la main.
- Messagerie interne - Envoyer des messages importants aux joueurs, staffs ou equipes.
- API privee - Prevoir des integrations securisees avec le site public et les outils externes.
