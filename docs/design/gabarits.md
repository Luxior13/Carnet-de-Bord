# Gabarits de page

[Système de design](README.md) · [Composants](composants.md) · [Comportements](comportements.md)

Compositions validées. Choisir le gabarit selon la tâche principale de la page,
puis adapter sections, colonnes et actions. La fiche de page consigne
l’adaptation retenue ; la [hiérarchie d’une page](#hiérarchie-dune-page) vaut
pour tous les gabarits du cadre privé.

| Gabarit | Tâche principale | Référence |
| --- | --- | --- |
| [A. Liste de gestion](#a-liste-de-gestion) | Retrouver, comparer, filtrer, ouvrir | `/membres/repertoire`, complété par `/systeme/utilisateurs` |
| [B. Fiche à sections](#b-fiche-à-sections) | Comprendre une entité et la modifier sans perte | `/systeme/utilisateurs/[id]` ; aussi `/membres/repertoire/[id]`, `/mon-compte` |
| [C. Formulaire de création](#c-formulaire-de-création) | Créer une entité avec le minimum utile | `/systeme/utilisateurs/nouveau`, `/membres/repertoire/nouveau` |
| [D. Page de réglages](#d-page-de-réglages) | Comprendre la valeur effective et la changer en connaissance de cause | `/systeme/parametres` |
| [E. Page de lecture](#e-page-de-lecture) | Lire, filtrer et retrouver une information | `/systeme/feuille-de-route` |
| [F. Accueil personnel](#f-accueil-personnel) | Savoir quoi faire maintenant | `/` |
| [G. Écran hors cadre](#g-écran-hors-cadre) | Se connecter ou sortir d’une erreur | `/login`, erreur racine, page introuvable |

## A. Liste de gestion

```text
Cadre privé (sidebar 264 px, header 56 px)
└─ PageShell (76 rem) · PageCanvas
   ├─ PageIdentityHero : icône · titre · description · action principale
   └─ DataTableSection (directory.module.css, rayon 10 px)
      ├─ Barre de filtres : recherche · réinitialisation · menus compacts 38 px · tri (au bord droit)
      ├─ Filtres rapides à bascule avec compteurs, un groupe libellé par dimension · nombre de résultats
      ├─ En-tête de colonnes (surface-table-head)
      ├─ Lignes alternées (cartes sous 740 px de conteneur)
      └─ ListPagination (25 lignes, curseur ou numéro selon le contrat)
```

- Ni bandeau ni carte de synthèse ne portent de statistiques : les compteurs
  sont dans les filtres rapides, affichés seulement s’ils égalent le résultat
  (décision du 20 octobre 2026). Pas de rail sur une liste.
- Le dernier contrôle de la barre affleure le bord droit de la liste, aligné
  sur le nombre de résultats et l’action du bandeau : la réinitialisation,
  dont la place reste réservée quand elle est masquée, vient avant les menus.
- Une ligne : identité à gauche (avatar, nom, contexte en dessous), puis
  colonnes de données autorisées, statut en badge à pastille, date.
- Les colonnes dépendent des droits ; leurs seuils de passage en cartes sont
  propres à la liste (Utilisateurs : 48, 52, 56 ou 64 rem).
- Retour de fiche avec contexte restauré ([comportements](comportements.md#listes-recherche-et-pagination)).

Pages adoptant ce gabarit : voir [Harmonisation](harmonisation.md#état-par-page).

## B. Fiche à sections

```text
PageShell · PageCanvas (EntityDetailLayout ou composition équivalente)
├─ PageIdentityHero compact : avatar · nom · états en pastilles · identifiant et dates · rôle à droite
├─ PageSectionNavigation : vrais liens, section active, point de brouillon
└─ Section active (chargée à la demande)
   ├─ Carte de section : titre h2 pour les lecteurs d’écran, rubriques en petites capitales
   ├─ Champs aux primitives communes (40/44 px, rayon 8 px)
   └─ SectionActionBar (collante avec un brouillon)
```

- Une section par sujet ; elle possède sa propre URL (`?section=`).
- Pas de carte de synthèse ni de rail (décision du 20 octobre 2026) : les
  états utiles (compte, mot de passe, double authentification) sont des
  pastilles à côté du nom, l’identifiant et les dates sous le titre ; un
  compteur propre à une section vit dans cette section.
- Le haut d’une section n’a pas de titre visible qui répète son lien ; il
  commence par sa première rubrique (titre de section réservé aux lecteurs
  d’écran).
- Les réglages répétitifs (autorisations) sont des cartes compactes avec aide
  en popover ; les conséquences critiques restent visibles.
- Les volets d’une section se choisissent dans l’en-tête de sa carte, pas dans
  une barre isolée ; ils partagent en-tête et lignes (26 octobre 2026).
- Exception à « pas de rail » : un éditeur dont les réglages se comptent par
  dizaines sur plusieurs pôles (autorisations) a une **navigation** à gauche
  (recherche sur tous les pôles, menu déroulant « Pôle », pages de ce pôle avec
  compteur) et le détail à droite ; les filtres « Toutes / Accordées » sont dans
  l’en-tête de la carte, tenu sur une ligne. Une colonne de navigation suit
  toujours ce qu’affiche le détail : un filtre restreint ses menus et listes à
  ce qu’il retient ; une recherche sur tous les pôles la transforme en
  sommaire des résultats. Sur ordinateur (au moins 1 024 px de large et deux
  colonnes, portables compris), la carte occupe le reste de l’écran : la page ne défile plus,
  l’en-tête reste visible, chaque colonne défile seule et la barre
  d’enregistrement est ancrée en bas de la carte. Si la place restante tombe
  sous 300 px (fenêtre très basse, zoom fort), la navigation est collante et le contenu garde le défilement de la page. Sur
  une largeur réduite, la liste puis la page, avec
  « Toutes les pages ». Ce n’est pas une synthèse : elle ne répète aucune
  donnée du contenu (décision du 26 octobre 2026).
- La suppression vit dans sa section (Sécurité, Identité) avec
  `EntityDangerZone` ou une carte dédiée, toujours intitulée « Zone dangereuse »
  avec la même icône et le même en-tête teinté.

Détail et preuves : [Utilisateurs](../pages/systeme/utilisateurs/README.md).

## C. Formulaire de création

`PageShell` en largeur `form` (52 rem), `PageIdentityHero` compact, groupes de
champs partagés avec la fiche, `SectionActionBar` en soumission native,
confirmation après succès (secret à copier une seule fois pour un compte),
reprise explicite après réponse perdue, garde de départ jusqu’au chargement.

- Le bandeau explique le déroulé ; la carte commence par ses champs, sans
  en-tête qui le répète, et chaque règle de saisie n’est écrite qu’une fois,
  près de son champ (décision du 23 octobre 2026).
- La barre d’enregistrement n’affiche pas « Modifications non enregistrées »
  sur un formulaire de création (`status={null}`) ; elle garde un message
  seulement pour un état utile, par exemple un résultat à vérifier.

Détail : [Nouvel utilisateur](../pages/systeme/utilisateurs/creation.md),
[Nouvelle fiche personne](../pages/membres/repertoire/creation.md).

## D. Page de réglages

Bandeau compact, une carte par groupe de réglages (portée, champ, aide unique),
saisie directe, valeur par défaut et bornes visibles une seule fois, barre
commune seulement avec un brouillon, une réparation, une attente, une erreur ou
un conflit. Une réduction risquée demande une confirmation et une preuve récente.

Détail : [Paramètres système](../pages/systeme/parametres.md).

## E. Page de lecture

Bandeau, filtres de lecture (phases, statuts), cartes ou sections lisibles,
détails accessibles au clavier. Les filtres ne sont pas des onglets.

Détail : [Feuille de route](../pages/systeme/feuille-de-route.md).

## F. Accueil personnel

Bandeau de salutation lisant l’identité courante, lien vers Mon compte ;
aucun widget futur affiché pour le décor. Les vues personnelles métier
s’ajouteront quand leurs modules seront livrés.

Détail : [Accueil](../pages/accueil.md).

## G. Écran hors cadre

Hors sidebar et header : colonne de fond `site-background-column`, carte
centrée (`surface-panel`, rayon 10 px), titre `h1`, une seule action principale,
erreurs focalisées et annoncées. Les états racines sont autonomes (langue,
styles, viewport) et proposent une reprise par rechargement ou un retour à l’accueil.

Détail : [Connexion](../pages/connexion.md), [états techniques](../pages/transverse/etats-techniques.md).

## Hiérarchie d'une page

De haut en bas :

1. **En-tête** : fil d'Ariane, recherche ; bouton de menu sur mobile.
   Reprendre le header partagé, sa hauteur, ses surfaces et son focus intérieur.
   La sidebar reste ouverte à 264 px sur ordinateur.
2. **Héro de page** : titre, description, éventuellement une action principale.
3. **Toile de page** : `PageShell` puis `PageCanvas`, largeur bornée.
4. **Sections** : une carte par section ou par rubrique d’actions, sans titre
   visible qui répète le lien de section.
5. **Listes** : `DataTableSection` avec recherche, filtres, tri et pagination.
6. **Fiche** : identité compacte, navigation par sections, contenu de la section
   active ; les états utiles vivent dans le bandeau.

Pagination : partir de **25 éléments**, via `PAGINATION.DEFAULT_LIMIT` partagé
entre client et serveur. Une page peut définir une exception justifiée par sa
densité et son usage ; conserver ses plafonds de requête côté serveur. Le nombre
de lignes ne relève pas des paramètres système administrateur. Ajouter un choix
local et sa mémorisation par utilisateur/page seulement si le besoin est établi,
sans imposer ce contrôle à toutes les listes.

Pour des réglages globaux, la page des Paramètres a remplacé le 14 octobre 2026
l’ancien mode « valeur appliquée puis Modifier » par une saisie directe dans une
carte, avec la barre commune seulement en cas de brouillon ou de reprise
([gabarit D](#d-page-de-réglages)). Un formulaire de création reste directement
en saisie.

Règles : une page n'a qu'un héro ; une action globale vit dans le héro, une
action locale dans sa section ; un retour contextuel ramène à la liste avec ses
filtres.

`PageIdentityHero` est la référence d'en-tête de toutes les pages actuelles,
en variante compacte pour une fiche ou un formulaire. L’ancien `PageHero` a été
retiré le 20 octobre 2026 ([SYS-01](../systeme/constats.md)). L'ancien `PageHeader`, inutilisé, a
été supprimé. Les bordures des cartes appartiennent à `CardHeader` et
`CardFooter` : ne pas les redoubler sur le contenu adjacent.
