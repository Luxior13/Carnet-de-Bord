# Suivis de pages

Un fichier par page, groupe cohérent de routes ou composant partagé suivi ; un formulaire distinct peut
mériter son propre suivi si ses règles diffèrent fortement de celles de la liste.
Utiliser un nom stable compréhensible, sans multiplier les copies datées.

Complément transverse : [menus déroulants du 10 octobre](../../audits/AUDIT_MENUS_2026-10-10.md),
onze consommateurs actifs inventoriés et contrôlés dans un navigateur isolé ;
les parcours authentifiés restent suivis page par page.

La [règle d'autocomplétion sans exception](../../references/DESIGN_SYSTEM.md)
inclut aussi connexion et MFA depuis la correction du 11 octobre ;
[preuves et limites des extensions](../../audits/AUDIT_AUTOCOMPLETION_2026-10-11.md).

| Page | Suivi | État du document |
| --- | --- | --- |
| Composants partagés — transverse | [composants-partages.md](composants-partages.md) | Catalogue et contrats communs ; actions d'enregistrement, recherche, pagination, focus et reprises harmonisés le 11 octobre ; preuves et limites dans l'audit lié |
| Fenêtres modales — transverse | [modales.md](modales.md) | Modales actives inventoriées ; présentation, focus, conservation des brouillons et reprises corrigés le 11 octobre ; validations simulées et limites documentées |
| Accueil / Mon travail | [accueil.md](accueil.md) | Revue du 12 octobre : prénom au retour et conflit de version après MFA corrigés, chaîne inutilisée retirée ; huit parcours client simulés et huit Next/PostgreSQL réels réussis, 1 235 tests web réussis ; ACC-01 et ACC-03 à ACC-06 clos au périmètre vérifié, vues métier futures |
| Connexion | [connexion.md](connexion.md) | Revue du 12 octobre : attentes, reprise MFA, collage, focus et échéances après verrou corrigés ; 30 parcours client, 17 tests SQL et 12 parcours Next/MFA réels réussis. AUTH-01 et AUTH-03 à AUTH-08 clos au périmètre testé ; limites d'accessibilité et d'exploitation dans le rapport |
| Utilisateurs — liste, création et fiche | [systeme-utilisateurs.md](systeme-utilisateurs.md) | Trois pages revues le 11 octobre. Compléments du 12 : sessions USR-D20 à USR-D22 closes ; création USR-N13/N14 corrigées, six parcours client, onze SQL de création et trois HTTP réussis, garde partagé revérifié sur treize SQL sessions. Preuves historiques et limites conservées |
| Paramètres système | [systeme-parametres.md](systeme-parametres.md) | Revue commencée le 11, contrôles du 12 octobre : reprises et réparation de valeur invalide corrigées ; 30 parcours client simulés, 44 contrôles serveur dont 16 PostgreSQL, et onze parcours Next/session réels réussis, avec commande de maintenance. Limites de déploiement, charge et conservation dans le suivi |
| Feuille de route | [systeme-feuille-de-route.md](systeme-feuille-de-route.md) | Revue du 12 octobre : catalogue et matrice cohérents, focus et détails accessibles corrigés ; 18 parcours client, huit Next/MFA réels et 20 tests ciblés réussis ; FDR-01 à FDR-04 clos, limites dans le rapport |
| Journal d’activité | [systeme-journal-activite.md](systeme-journal-activite.md) | Page retirée le 9 octobre 2026, replanifiée ; suivi conservé comme historique |
| Navigation générale — sidebar, header et sections | [navigation-generale.md](navigation-generale.md) | Revue du 12 octobre : menu Rubriques confirmé, focus, gardes et reprise de déconnexion corrigés. Complément sections : début du contenu visible et remplacement d'URL conservé, huit parcours client et neuf Next réels réussis. NAV-02 à NAV-09 clos ou réconciliés dans leur portée ; limites de scroll natif et de navigateurs précisées |
| Mon compte | [mon-compte.md](mon-compte.md) | Profil/contact et dialogues revus le 11 octobre. Complément Sécurité du 12 : attentes, reprise des sessions, focus et autorisation concurrente corrigés ; huit parcours client, neuf SQL ciblés et trois HTTP réels réussis. COMPTE-10 à COMPTE-12 clos au périmètre testé ; limites dans le suivi |
| Membres — liste, création et fiche | [membres-repertoire.md](membres-repertoire.md) | **Référence visuelle et UX** avec Utilisateurs ; liste vérifiée le 11 octobre, création du 12 : 28 parcours simulés, onze réels et seize SQL réussis. Fiche du 12 : trente parcours client, treize HTTP avec connexion/MFA et trente SQL réussis ; REP-N01 à REP-N06 et REP-D01 à REP-D10 clos ou vérifiés selon leur portée ; limites dans les rapports |
| Erreur, page introuvable et chargement | [etats-techniques.md](etats-techniques.md) | Revue du 12 octobre : erreur racine française autonome, rechargement GET, issues et focus vérifiés ; treize scénarios client, cinq contrôles HTTP et quatre sondes Next réussis. ETAT-01 à ETAT-06 clos ou vérifiés selon leur portée ; limites dans le rapport |

Pour commencer un nouveau suivi : [modèle de revue](../modeles/revue-page.md).
L’état livré et le niveau de vérification sont distincts. « Alignée » ou « référence
visuelle » ne signifie pas que tous les défauts sont clos. Les preuves détaillées
appartiennent aux [audits datés](../../audits/README.md).
Les spécifications métier historiques de `features/pages` restent consultables
via [leur index](../../../features/pages/README.md) ; ce dossier suit les décisions
courantes et les vérifications, il ne remplace pas le plan produit.

Ne pas créer trente suivis vides pour les modules prévus. Ajouter une entrée lorsqu’un
travail réel justifie un suivi, puis maintenir décisions et points ouverts avec lui.
