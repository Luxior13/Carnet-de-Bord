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
   ├─ [Synthèse : rail de 16 rem dès 118 rem, compacte au-dessus sinon]
   └─ DataTableSection (directory.module.css, rayon 10 px)
      ├─ Barre de filtres : recherche · filtres compacts 38 px · tri · filtres actifs retirables
      ├─ En-tête de colonnes (surface-table-head)
      ├─ Lignes alternées (cartes sous 740 px de conteneur)
      └─ ListPagination (25 lignes, curseur ou numéro selon le contrat)
```

- Le bandeau ne porte pas de statistiques ; elles vont dans la synthèse, dont
  les compteurs ouvrent leur sous-ensemble.
- Une ligne : identité à gauche (avatar, nom, contexte en dessous), puis
  colonnes de données autorisées, statut en badge à pastille, date.
- Les colonnes dépendent des droits ; leurs seuils de passage en cartes sont
  propres à la liste (Utilisateurs : 48, 52, 56 ou 64 rem).
- Retour de fiche avec contexte restauré ([comportements](comportements.md#listes-recherche-et-pagination)).

Pages adoptant ce gabarit : voir [Harmonisation](harmonisation.md#état-par-page).

## B. Fiche à sections

```text
PageShell · PageCanvas (EntityDetailLayout ou composition équivalente)
├─ PageIdentityHero compact : avatar · nom · rôle ou statut · retour à la liste
├─ [Synthèse : UserOverviewCard ou PersonOverview, rail dès 118 rem]
├─ PageSectionNavigation : vrais liens, section active, point de brouillon
└─ Section active (chargée à la demande)
   ├─ SectionPanel : titre h2, groupes titrés en petites capitales
   ├─ Champs aux primitives communes (40/44 px, rayon 8 px)
   └─ SectionActionBar (collante avec un brouillon)
```

- Une section par sujet ; elle possède sa propre URL (`?section=`).
- La synthèse porte l’état utile (accès, double authentification, mot de
  passe, compteur d’autorisations) sans répéter le contenu des sections.
- Les réglages répétitifs (autorisations) sont des cartes compactes avec aide
  en popover ; les conséquences critiques restent visibles.
- La suppression vit dans sa section (Sécurité, Identité) avec
  `EntityDangerZone` ou une carte dédiée.

Détail et preuves : [Utilisateurs](../pages/systeme/utilisateurs/README.md).

## C. Formulaire de création

`PageShell` en largeur `form` (52 rem), `PageIdentityHero` compact, groupes de
champs partagés avec la fiche, `SectionActionBar` en soumission native,
confirmation après succès (secret à copier une seule fois pour un compte),
reprise explicite après réponse perdue, garde de départ jusqu’au chargement.

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

## Rail de synthèse

`PageAsideLayout` affiche le rail à partir de 118 rem de viewport, sur 16 rem ;
en dessous, la synthèse passe entre le bandeau et le contenu, en version
compacte. Le rail porte un contexte de décision (compteurs, état du compte),
jamais un champ à enregistrer ni une copie du contenu central.

## Hiérarchie d'une page

De haut en bas :

1. **En-tête** : fil d'Ariane, recherche ; bouton de menu sur mobile.
   Reprendre le header partagé, sa hauteur, ses surfaces et son focus intérieur.
   La sidebar reste ouverte à 264 px sur ordinateur.
2. **Héro de page** : titre, description, éventuellement une action principale.
3. **Toile de page** : `PageShell` puis `PageCanvas`, largeur bornée.
4. **Sections** : `SectionPanel`, chacune avec un titre et une action locale.
   Il compose `Card`, `CardHeader` et `CardContent`. `AccountPanel` est uniquement
   un adaptateur qui lui fournit un identifiant accessible.
5. **Listes** : `DataTableSection` avec recherche, filtres, tri et pagination.
6. **Fiche** : identité compacte, navigation par sections, contenu de la section
   active et synthèse secondaire si utile.

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
