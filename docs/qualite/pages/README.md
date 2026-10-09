# Suivis de pages

Un fichier par page, groupe cohérent de routes ou composant partagé suivi ; un formulaire distinct peut
mériter son propre suivi si ses règles diffèrent fortement de celles de la liste.
Utiliser un nom stable compréhensible, sans multiplier les copies datées.

| Page | Suivi | État du document |
| --- | --- | --- |
| Utilisateurs — liste | [systeme-utilisateurs.md](systeme-utilisateurs.md) | Analyse complète et alignement sur la page de référence du 10 octobre 2026 : squelette, pagination « sur N », recherche et légende harmonisés |
| Paramètres système | [systeme-parametres.md](systeme-parametres.md) | Durées en lecture avec Modifier ; portée du journal et séparation future documentées ; pagination retirée, défaut commun de 25 |
| Journal d’activité | [systeme-journal-activite.md](systeme-journal-activite.md) | Page retirée le 9 octobre 2026, replanifiée ; suivi conservé comme historique |
| Navigation générale — sidebar et header | [navigation-generale.md](navigation-generale.md) | Sidebar fixe, recherche affinée et clavier corrigé, notifications compactes avec compteur partagé ; suivi du 27 septembre 2026 |
| Membres — répertoire | [membres-repertoire.md](membres-repertoire.md) | **Page de référence visuelle et UX** du 9 octobre 2026 : composants partagés, tokens, typographie, squelette et rythmes à réutiliser sur les autres pages. Vue d'ensemble ajoutée le 10 octobre 2026, alignée sur `/systeme/utilisateurs` |

Pour commencer un nouveau suivi : [modèle de revue](../modeles/revue-page.md).
Les spécifications métier historiques de `features/pages` restent consultables
via [leur index](../../../features/pages/README.md) ; ce dossier suit les décisions
courantes et les vérifications, il ne remplace pas le plan produit.

Ne pas créer trente suivis vides pour les modules prévus. Ajouter une entrée lorsqu’un
travail réel justifie un suivi, puis maintenir décisions et points ouverts avec lui.
