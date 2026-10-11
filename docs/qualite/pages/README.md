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
| Accueil / Mon travail | [accueil.md](accueil.md) | Salutation et lien Mon compte ; rendu vérifié le 11 octobre, E2E authentifié à rejouer ; vues métier futures |
| Connexion | [connexion.md](connexion.md) | Stockage facultatif, soumissions et parcours MFA vérifiés dans le navigateur isolé le 11 octobre ; authentification réelle à vérifier |
| Utilisateurs — liste, création et fiche | [systeme-utilisateurs.md](systeme-utilisateurs.md) | Trois pages revues le 11 octobre : USR-18 à USR-25, USR-N08 à USR-N12 et USR-D10 à USR-D19 clos au périmètre testé. Fiche : 43 parcours simulés, treize réels avec connexion/MFA, quinze SQL ; preuves et limites par audit |
| Paramètres système | [systeme-parametres.md](systeme-parametres.md) | Un réglage : conservation du journal ; parcours et présentation corrigés les 10–11 octobre, 32 scénarios navigateur isolé réussis ; session et purge réelles non rejouées |
| Feuille de route | [systeme-feuille-de-route.md](systeme-feuille-de-route.md) | Catalogue de 39 chantiers ; filtres harmonisés et parcours simulé à quatre largeurs vérifié le 11 octobre ; intégration privée à vérifier |
| Journal d’activité | [systeme-journal-activite.md](systeme-journal-activite.md) | Page retirée le 9 octobre 2026, replanifiée ; suivi conservé comme historique |
| Navigation générale — sidebar, header et sections | [navigation-generale.md](navigation-generale.md) | Trois pôles actifs, sidebar fixe et navigation rapide ; barres de sections améliorées le 11 octobre et vérifiées sur trois consommateurs dans Chromium isolé ; réutilisation du composant imposée sur tout le site lorsque adaptée ; limites d'intégration explicites |
| Mon compte | [mon-compte.md](mon-compte.md) | Profil versionné, brouillons conservés, navigation et dialogues fiabilisés le 11 octobre ; parcours simulés et tests API réussis ; mutations réelles à vérifier |
| Membres — liste, création et fiche | [membres-repertoire.md](membres-repertoire.md) | **Référence visuelle et UX** avec Utilisateurs ; audit de liste le 11 octobre, 41 scénarios simulés et neuf parcours réels, mesures jusqu’à 10k fiches ; schéma/SQL et séparation des services complétés, 29 contrôles SQL, concurrence et propriété des coordonnées corrigées ; limites détaillées dans le suivi |
| Erreur, page introuvable et chargement | [etats-techniques.md](etats-techniques.md) | Présentation harmonisée et rendus vérifiés à quatre largeurs le 11 octobre ; déclenchement réel du routeur à vérifier |

Pour commencer un nouveau suivi : [modèle de revue](../modeles/revue-page.md).
L’état livré et le niveau de vérification sont distincts. « Alignée » ou « référence
visuelle » ne signifie pas que tous les défauts sont clos. Les preuves détaillées
appartiennent aux [audits datés](../../audits/README.md).
Les spécifications métier historiques de `features/pages` restent consultables
via [leur index](../../../features/pages/README.md) ; ce dossier suit les décisions
courantes et les vérifications, il ne remplace pas le plan produit.

Ne pas créer trente suivis vides pour les modules prévus. Ajouter une entrée lorsqu’un
travail réel justifie un suivi, puis maintenir décisions et points ouverts avec lui.
