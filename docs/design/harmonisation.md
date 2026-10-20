# Harmonisation : audit des écarts

[Système de design](README.md) · [Fondations](fondations.md) · [Préférences](preferences.md)

Audit du code au 19 octobre 2026 (commit `a39d1c9`), par relevés automatiques
des fichiers CSS et TSX de `apps/web/src`, tests exclus. Les chiffres décrivent
le code, pas un rendu vérifié dans un navigateur. Les mettre à jour à chaque
reprise d’une page ou d’un composant partagé.

## Synthèse

- **10 fichiers CSS (1 525 lignes)** : `globals.css` (468 lignes) porte tous les
  tokens ; neuf modules partagés ou métier (`directory.module.css` 382 lignes,
  `PermissionsEditor.module.css` 181, `PageIdentityHero.module.css` 133…).
- **Aucune couleur codée** : 0 valeur hexadécimale et 0 `rgba()` dans les
  modules CSS, 0 classe arbitraire `[#…]` dans les 154 fichiers TSX. Les
  modules consomment les tokens globaux, parfois via des alias locaux `--m-*`.
- **Aucun texte sous 10 px**, aucune `transition-all`, ombres limitées aux
  tokens `--shadow-*` et à des contours internes.
- Toutes les pages servies utilisent `PageIdentityHero` et les cadres communs ;
  leur alignement est suivi page par page ci-dessous.
- Les écarts restants sont des **valeurs arbitraires recopiées** (rayons,
  tailles) là où une variante partagée éviterait la divergence, et la liste
  Utilisateurs à aligner sur les filtres rapides du 20 octobre 2026.

## Constats

| ID | Constat | Mesure | Règle concernée | Correction attendue |
| --- | --- | --- | --- | --- |
| HARMO-01 | Classe du badge de statut recopiée | La même chaîne (`inline-flex … rounded-[5px] border px-2 py-0.5 text-xs leading-5 font-medium`) est écrite dans `PersonStatusBadge`, `user-badges` (2), `UserOverviewCard` (3), `NewUserForm`, `NewUserSuccess`, `UserSecurityTab`, `SecuritySection`, `UsersListResults` (2) et `PersonListCells` | [Variantes autorisées](fondations.md#variantes-autorisées), [principe 5](principes.md#règles-fondatrices) | **Clos le 20 octobre 2026** : composant commun [`StatusBadge`](../../apps/web/src/components/ui/status-badge.tsx) adopté par tous ces usages ; la pastille « N coordonnées » du Répertoire est retirée (REP-22) |
| HARMO-02 | Rayons écrits en valeur arbitraire | `rounded-[10px]` ×22, `rounded-[7px]` ×13, `rounded-[5px]` ×13, `rounded-[8px]` ×7, `rounded-[4px]` ×6, `rounded-[6px]` ×4, `rounded-[2px]` ×1, dans 34 fichiers TSX ; dans le CSS : 6, 8, 10 px, 5 px (bouton de page) et 4 px | [Variantes autorisées](fondations.md#variantes-autorisées) | Valeurs conformes aux variantes ; à qualifier : `rounded-[10px]` ne suit pas la portée indigo (8 px) contrairement à `rounded-lg`. Décider s’il faut des tokens de rayon nommés par rôle |
| HARMO-03 | Tailles de texte arbitraires | `text-[11px]` ×16, `text-[13px]` ×7, `text-[10px]` ×5, `text-[16px]` ×3, `text-[14px]`, `text-[12px]`, `text-[0.9375rem]` | [Typographie](fondations.md#typographie) | Les primitives de formulaire (16 px puis 13 px) sont justifiées par l’échelle dense ; vérifier les autres usages et préférer `text-xs`, `text-caption`, `text-sm` quand la valeur est identique |
| HARMO-04 | Documentation de design en retard sur le code | Le 19 octobre 2026, l’ancien design system décrivait encore le rôle des Autorisations en variante par défaut avec lignes alternées, et les réglages en mode « Modifier » | [Ordre de priorité](README.md#ordre-de-priorité) | Corrigé le 19 octobre 2026 dans [fondations](fondations.md#espacements-et-arrondis), [gabarits](gabarits.md#d-page-de-réglages) et [comportements](comportements.md#saisie-brouillon-et-enregistrement) ; à chaque reprise, actualiser le fichier propriétaire dans le même travail |
| HARMO-06 | Liste Utilisateurs pas encore alignée sur les filtres rapides | `UsersOverview` en carte de synthèse (`PageAsideLayout`), menus « Filtrer par état du compte » et « Filtrer par rôle » | [Gabarit A](gabarits.md#a-liste-de-gestion), [préférences du 20 octobre 2026](preferences.md#journal) | Remplacer la synthèse par des filtres rapides avec compteurs (état du compte au moins ; rôle à qualifier selon le nombre d’options), extraire alors `QuickFilter` en composant partagé, puis rejouer le banc de la liste |
| HARMO-05 | Composants sans consommateur | `ResourceStateBoundary`, `Tabs`, `PageHero`, composants de l’actualité interne, `UserHistoryTab` | [Composants](composants.md#à-retirer-ou-à-adopter) | **Clos le 20 octobre 2026** : tous retirés ([SYS-01 à SYS-04](../systeme/constats.md)) |

## Plan de reprise proposé

Proposition, à confirmer selon les priorités du propriétaire :

1. Fait le 20 octobre 2026 : badge de statut commun (HARMO-01).
2. Liste Utilisateurs alignée sur les filtres rapides (HARMO-06), à sa reprise.
3. Qualification des rayons et tailles arbitraires (HARMO-02, HARMO-03) à la
   reprise de chaque composant concerné, sans campagne de remplacement aveugle.
4. Fait le 20 octobre 2026 : code dormant retiré (HARMO-05, SYS-01 à SYS-04).

## État par page

Colonnes : **État** selon le gabarit et les pages de référence ; **Couleurs
codées** : valeurs hexadécimales dans les styles chargés par la page ;
**< 10 px** : textes sous 10 px ; **Marqueurs** : composants relevés dans le code.

| Route | Gabarit | État | Couleurs codées | < 10 px | Marqueurs |
| --- | --- | --- | ---: | ---: | --- |
| `/` | F | Aligné | 0 | 0 | `PageIdentityHero` |
| `/login` | G | Aligné ; champs adoucis vérifiés sur le serveur local le 17 octobre 2026 | 0 | 0 | Carte hors cadre, `MfaCodeInput` |
| `/membres/repertoire` | A | **Référence** ; reprise du 20 octobre 2026, banc client 41/41 | 0 | 0 | `PageIdentityHero`, `DataTableSection`, filtres rapides, `StatusBadge` |
| `/membres/repertoire/nouveau` | C | Aligné | 0 | 0 | `PageIdentityHero` compact, `SectionActionBar` |
| `/membres/repertoire/[id]` | B | Aligné | 0 | 0 | `EntityDetailLayout`, `PageSectionNavigation`, `SectionActionBar` |
| `/mon-compte` | B | Aligné | 0 | 0 | `UserOverviewCard`, `PageSectionNavigation`, `SectionActionBar` |
| `/systeme/utilisateurs` | A | **Référence** (complément) ; synthèse et menus de filtres à aligner (HARMO-06) | 0 | 0 | `DataTableSection`, `UsersOverview`, `StatusBadge` |
| `/systeme/utilisateurs/nouveau` | C | Aligné | 0 | 0 | `PageIdentityHero` compact, `SectionActionBar` |
| `/systeme/utilisateurs/[id]` | B | **Référence** (barre d’enregistrement) ; Autorisations en cartes le 18 octobre 2026, rendu à 320, 768 et 1920 px à recapturer | 0 | 0 | `UserOverviewCard`, `PermissionsEditor`, `SectionActionBar` |
| `/systeme/parametres` | D | Aligné (refonte du 14 octobre 2026) | 0 | 0 | `PageIdentityHero`, `SectionActionBar` |
| `/systeme/feuille-de-route` | E | Aligné | 0 | 0 | `PageIdentityHero`, `directory.module.css` |
| États techniques (erreur, 404, chargement) | G | Aligné | 0 | 0 | `RouteErrorState`, `PageState`, `Skeleton` |

Redirections sans rendu propre : `/systeme` sans segment, et les alias
`/administration` et `/tableau-de-bord` ([routes](../systeme/routes.md)).

## Reproduire les mesures

Depuis `apps/web/src` :

```bash
grep -rhoE '#[0-9a-fA-F]{3,8}\b' --include=*.module.css . | wc -l
grep -rnoE '\[#[0-9a-fA-F]{3,8}\]' --include=*.tsx . | wc -l
grep -rnE 'font-size: *[0-9](\.[0-9]+)?px' --include=*.css .
grep -rhoE 'rounded(-[a-z]+)?-\[[^]]+\]' --include=*.tsx . | sort | uniq -c
grep -rhoE 'text-\[[0-9.]+(px|rem)\]' --include=*.tsx . | sort | uniq -c
grep -rlE 'transition-all|transition: *all' --include=*.tsx --include=*.css .
```

Ces relevés sont des indicateurs ; une reprise de page vérifie le rendu réel.
