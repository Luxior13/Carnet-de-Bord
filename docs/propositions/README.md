# Propositions et évolutions

[Guide général](../REFERENCE_GENERALE.md) · [Index de la documentation](../README.md)

Feuille de route, besoins futurs, plans et propositions. **Une proposition
n’est ni une décision ni une livraison** tant que son statut ne le dit pas.
Avant d’en reprendre une, confronter son contenu au code actuel, à la
[feuille de route](feuille-de-route.md) et aux [fiches des pages](../pages/README.md)
concernées.

## Périmètre produit

| Document | Rôle | Statut au 19 octobre 2026 |
| --- | --- | --- |
| [Feuille de route](feuille-de-route.md) | Priorités de construction : 39 chantiers, 8 pôles cibles, 6 étapes ; catalogue exécutable dans `roadmap.constants.ts` | Référence produit courante ; seule source des priorités |
| [Matrice de préparation](intentions/pages/MATRICE_PREPARATION.md) | Pages livrées, chantiers et anciennes destinations | Référence de correspondance courante |
| [Sujets futurs](sujets-futurs.md) | Fiches transversales à rédiger quand leur module existera (SEO, médias, audience, notifications, compétitions, sanctions…) | Candidats, aucune fiche à créer avant le module |

## Plans et propositions

| Document | Périmètre | Statut au 19 octobre 2026 |
| --- | --- | --- |
| [Personnes et identité](membres-personnes-identite.md) | Répertoire, identité, relations | Plan d’origine ; confronter chaque reste à faire aux [fiches du Répertoire](../pages/membres/repertoire/README.md) et au modèle actuel |
| [Réunions](vie-interne-reunions.md) | Pôle Activité | Conception future ; aucun module livré déduit de ce plan |
| [Sponsors et partenaires](relations-sponsors-partenaires.md) | Pôle Relations | Conception historique ; module retiré le 21 septembre 2026, reconstruction à cadrer |
| [Proposition UX/UI](interface-proposition-ux-ui.md) | Interface générale, 23 septembre 2026 | Proposition datée ; les décisions courantes sont dans le [design](../design/README.md) et les fiches |
| [Catalogue initial](catalogue-initial.md) | Anciennes familles de fonctionnalités | Historique ; ne pas appliquer sa navigation comme règle courante |

## Intentions métier historiques

Le dossier [intentions](intentions/README.md) conserve les besoins qui ont
préparé le produit (ancien dossier `features/` de la racine, déplacé le
19 octobre 2026) et l’ancienne arborescence des [fiches de pages prévues](intentions/pages/README.md).
Ces textes ne prouvent ni qu’une fonction est livrée ni qu’une route doit être
créée.

## Ajouter une proposition

1. Un fichier par sujet, nommé `<pôle>-<sujet>.md` sans date.
2. En tête : date, demandeur, périmètre, **statut** (proposée, autorisée,
   en cours, appliquée, abandonnée) et décisions déjà données.
3. Relier la proposition depuis la fiche de la page concernée et depuis ce tableau.
4. Quand elle est appliquée, reporter les décisions durables dans la fiche de
   page, le design ou le domaine, puis mettre à jour son statut ici.

Avant de reprendre un plan : qualifier ce qui reste utile, ce qui a été livré,
abandonné ou remplacé, puis modifier sa source propriétaire. Une idée ne devient
pas une exigence par sa présence ici.
