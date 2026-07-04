# Recherche globale

## Objectif

Permettre de retrouver rapidement les informations importantes du site prive sans devoir savoir exactement dans quelle page chercher.

## Ce que la feature doit permettre

- Rechercher un membre.
- Rechercher un sponsor.
- Rechercher un contrat.
- Rechercher un document.
- Rechercher une operation de tresorerie.
- Rechercher une reunion.
- Rechercher un debrief.
- Rechercher une sanction ou incident si autorise.
- Rechercher une note interne si autorise.
- Filtrer les resultats par module.

## Donnees recherchables

- Membres.
- Sponsors.
- Adherents.
- Contrats.
- Documents officiels.
- Operations de tresorerie.
- Reunions.
- Debriefs.
- Incidents et sanctions.
- Inventaire et acces.
- Notes internes.

## Role dans l'organisation UX

La recherche globale est une feature transversale.
Elle ne doit pas forcement etre une page principale dans la sidebar.

L'ideal :

- Une barre de recherche dans le header.
- Des resultats rapides dans un menu.
- Une page de resultats complete si besoin.
- Des filtres par type de resultat.
- Des raccourcis vers les fiches concernees.

## Permissions

La recherche doit respecter les permissions de chaque module.

Exemples :

- Un utilisateur sans acces tresorerie ne voit pas les montants financiers.
- Un utilisateur sans acces sanctions ne voit pas les sanctions sensibles.
- Un utilisateur sans acces contrats ne voit pas les contrats confidentiels.
- Un admin peut voir plus de resultats qu'un membre simple.

## Idees d'ecran

- Barre de recherche dans le header.
- Menu de resultats rapides.
- Page de resultats complete.
- Filtres par module.
- Filtres par date.
- Resultats recents.

## A clarifier

- Quels modules doivent etre cherchables des le debut.
- Si les notes internes doivent etre incluses dans la recherche.
- Si la recherche doit inclure les archives.
- Quel niveau de detail afficher dans les resultats sensibles.
