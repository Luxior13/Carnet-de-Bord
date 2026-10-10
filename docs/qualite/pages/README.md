# Suivis de pages

Un fichier par page, groupe cohérent de routes ou composant partagé suivi ; un formulaire distinct peut
mériter son propre suivi si ses règles diffèrent fortement de celles de la liste.
Utiliser un nom stable compréhensible, sans multiplier les copies datées.

| Page | Suivi | État du document |
| --- | --- | --- |
| Accueil / Mon travail | [accueil.md](accueil.md) | Salutation livrée ; vues métier futures ; parcours privé à vérifier |
| Connexion | [connexion.md](connexion.md) | Affichage anonyme vérifié le 10 octobre ; parcours authentification/MFA complet à vérifier |
| Utilisateurs — liste, création et fiche | [systeme-utilisateurs.md](systeme-utilisateurs.md) | Liste corrigée et vérifiée sur Next/PostgreSQL isolés ; audit suivant de création : 185 tests ciblés et sept largeurs simulées, USR-N01 à USR-N07 ouverts ; mutations réelles et MFA à valider |
| Paramètres système | [systeme-parametres.md](systeme-parametres.md) | Un réglage : conservation du journal ; documentation réconciliée le 10 octobre, essais de septembre historiques |
| Feuille de route | [systeme-feuille-de-route.md](systeme-feuille-de-route.md) | Catalogue de 39 chantiers ; matrice réconciliée avec le code, parcours privé à vérifier |
| Journal d’activité | [systeme-journal-activite.md](systeme-journal-activite.md) | Page retirée le 9 octobre 2026, replanifiée ; suivi conservé comme historique |
| Navigation générale — sidebar et header | [navigation-generale.md](navigation-generale.md) | Trois pôles actifs, sidebar fixe et navigation rapide ; notifications retirées ; synthèse du 10 octobre et limites explicites |
| Mon compte | [mon-compte.md](mon-compte.md) | Alignée sur la fiche utilisateur ; retour aux Utilisateurs avec contexte vérifié le 10 octobre sur Next/PostgreSQL isolés ; mutations profil/sécurité à vérifier |
| Membres — liste, création et fiche | [membres-repertoire.md](membres-repertoire.md) | **Référence visuelle et UX** avec Utilisateurs ; corrections et quatre améliorations livrées, 112 tests du périmètre et build réussis ; session complète et charge à compléter |

Pour commencer un nouveau suivi : [modèle de revue](../modeles/revue-page.md).
L’état livré et le niveau de vérification sont distincts. « Alignée » ou « référence
visuelle » ne signifie pas que tous les défauts sont clos. Les preuves détaillées
appartiennent aux [audits datés](../../audits/README.md).
Les spécifications métier historiques de `features/pages` restent consultables
via [leur index](../../../features/pages/README.md) ; ce dossier suit les décisions
courantes et les vérifications, il ne remplace pas le plan produit.

Ne pas créer trente suivis vides pour les modules prévus. Ajouter une entrée lorsqu’un
travail réel justifie un suivi, puis maintenir décisions et points ouverts avec lui.
