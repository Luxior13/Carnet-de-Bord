# Raisons des autres features a trier

## Objectif

Donner une raison simple pour chaque feature encore a trier afin de decider si elle doit devenir une vraie partie du site prive, etre fusionnee dans une autre page ou rester pour plus tard.

## Features validees pendant le tri

- Contrats - A garder, plutot comme sous-partie de documents officiels et comme donnee liee aux sponsors, membres et operations de tresorerie.
- Debriefs - A garder, comme feature transversale liee aux reunions, matchs, scrims, entrainements, tryouts et fiches membres.
- Journal d'activite - A garder, comme trace admin globale et historique local dans les fiches sensibles.
- Recherche globale - A garder apres les modules principaux, comme barre de recherche transversale avec permissions strictes.
- Validations - A garder pour les actions sensibles, avec une vue globale dans Systeme et une vue finance dans Tresorerie.
- Exports et sauvegardes - A garder pour sortir les donnees importantes et securiser les informations.
- Parametres - A garder pour configurer les statuts, categories, jeux, saisons et options globales.
- Archives - A garder pour conserver les anciennes donnees sans suppression definitive.

## Features restantes

- Import/export site public - Utile plus tard pour exporter les donnees publiques puis les importer dans le prive sans les recopier a la main.
- Equipes - Deja gere cote public, donc ne pas recreer une gestion complete en prive. A utiliser plus tard en lecture seule si besoin.
- Joueurs - Deja gere cote public pour la partie sportive. Les informations privees doivent plutot etre dans membres.
- Staff - Deja gere cote public pour l'organisation visible. Les informations privees doivent plutot etre dans membres et permissions.
- Rosters - Deja gere cote public. A lier plus tard aux debriefs, matchs, entrainements ou notes internes si besoin.
- Disponibilites internes - A garder seulement si le prive a besoin de disponibilites differentes du site public.
- Entrainements - Utile pour suivre les objectifs, presences, retours et progression des equipes.
- Preparation match - Utile pour garder les consignes privees avant un match public, sans exposer les informations sensibles.
- Preparation scrim - Utile pour ajouter des objectifs internes aux scrims deja visibles ailleurs.
- Tournois - Utile pour suivre inscriptions, deadlines, reglements, frais et informations administratives.
- Taches internes - A garder si les taches privees sont differentes des taches deja presentes sur le site public.
- Strategie - Utile pour centraliser plans de jeu, maps, drafts, compositions et consignes privees.
- VOD review - Utile pour structurer l'analyse des replays et relier les notes aux joueurs, matchs ou objectifs.
- Performance - Utile pour suivre la progression individuelle et collective, mais peut arriver plus tard.
- Objectifs - Utile pour fixer des objectifs par joueur, equipe ou saison et suivre leur avancement.
- Messagerie interne - Utile pour les annonces importantes, mais peut etre repousse si Discord suffit au debut.
- Demandes internes - Utile pour gerer les demandes avec un statut au lieu de perdre les infos dans des messages.
- API privee - Utile plus tard pour connecter proprement le site prive, le site public et d'autres outils.

## Classement actuel

### A confirmer

- Disponibilites internes.
- Entrainements.
- Preparation match.
- Preparation scrim.
- Tournois.
- Taches internes.
- Strategie.
- VOD review.
- Performance.
- Objectifs.
- Demandes internes.

### A ne pas dupliquer en prive

- Equipes.
- Joueurs.
- Staff.
- Rosters.

### A ajouter plus tard

- Import/export site public.
- Messagerie interne.
- API privee.

## Note UX

Toutes ces features ne doivent pas forcement devenir des pages dans la sidebar.
Certaines peuvent etre des onglets, blocs ou vues filtrees dans membres, equipes, sponsors, tresorerie ou documents.
