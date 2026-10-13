# Suivis de pages

Un fichier par page, groupe cohérent de routes ou composant partagé suivi ; un formulaire distinct peut
mériter son propre suivi si ses règles diffèrent fortement de celles de la liste.
Utiliser un nom stable compréhensible, sans multiplier les copies datées.

## État courant — 13 octobre 2026

La [clôture du socle](../../audits/AUDIT_CLOTURE_SOCLE_2026-10-12.md) reprend les
onze suivis actifs et transverses ci-dessous, pour poursuivre le développement
métier. Smoke réel, panorama de onze pages à trois largeurs et restauration
signée isolée sont réussis. Le rapport unique distingue les preuves client,
SQL et HTTP ; les détails des revues précédentes restent datés dans chaque suivi.

Cette clôture ne qualifie pas un déploiement : lecteur d'écran, Safari/iOS et
appareils physiques, charge concurrente ou supérieure aux volumes mesurés,
purges importantes, exploitation et qualification des durées restent à reprendre
selon le besoin. Le remplacement MFA combiné à une perte de réponse n'est pas
annoncé comme joué de bout en bout HTTP. L'incident Bitwarden déclaré résolu
par l'utilisateur reste clos. Aucun nouvel audit complet n'est requis sans
changement, défaut constaté ou règle nouvelle.

Complément transverse : [menus déroulants du 10 octobre](../../audits/AUDIT_MENUS_2026-10-10.md),
onze consommateurs actifs inventoriés et contrôlés dans un navigateur isolé ;
les parcours authentifiés restent suivis page par page.

La [règle d'autocomplétion sans exception](../../references/DESIGN_SYSTEM.md)
inclut aussi connexion et MFA depuis la correction du 11 octobre ;
[preuves et limites des extensions](../../audits/AUDIT_AUTOCOMPLETION_2026-10-11.md).

| Page | Suivi | État du document |
| --- | --- | --- |
| Composants partagés — transverse | [composants-partages.md](composants-partages.md) | Socle revu le 13 octobre ; UI-C10 réconcilié par les preuves client/SQL/HTTP des consommateurs, UI-C11 conservé pour les moteurs et aides techniques non testés |
| Fenêtres modales — transverse | [modales.md](modales.md) | Socle revu le 13 octobre ; MOD-INT réconcilié sans prétendre chaque dialogue joué par HTTP, MOD-A11Y conservé ; reprises et responsabilités des composants inchangées |
| Accueil / Mon travail | [accueil.md](accueil.md) | Parcours réel du 13 octobre réussi ; identité issue du contexte courant, aucun widget futur ajouté ; anciennes corrections et preuves conservées |
| Connexion | [connexion.md](connexion.md) | Connexion/MFA réelles et contrôles SQL rejoués pour la clôture ; échéances et source revérifiées après les verrous ; AUTH-02 et limites d'exploitation conservés |
| Utilisateurs — liste, création et fiche | [systeme-utilisateurs.md](systeme-utilisateurs.md) | Trois pages reprises dans la clôture du 13 octobre ; autorité transactionnelle, attentes bornées et reprises explicites vérifiées ; détails et limites des preuves dans le rapport unique |
| Paramètres système | [systeme-parametres.md](systeme-parametres.md) | Mutation HTTP avec CSRF/conflit/audit et restauration de SystemSetting réussies le 13 octobre ; PAR-S-07 réconcilié au périmètre du socle, exploitation/charge/durées conservées comme limites |
| Feuille de route | [systeme-feuille-de-route.md](systeme-feuille-de-route.md) | Page et composants revérifiés dans la clôture du 13 octobre ; catalogue livré inchangé, chantiers futurs non activés |
| Journal d’activité | [systeme-journal-activite.md](systeme-journal-activite.md) | Page retirée le 9 octobre 2026, replanifiée ; suivi conservé comme historique |
| Navigation générale — sidebar, header et sections | [navigation-generale.md](navigation-generale.md) | Clôture du 13 octobre : focus compact du fil d'Ariane corrigé ; Rubriques confirmé, gardes et déconnexion conservées ; preuves et limite du scroll natif précisées |
| Mon compte | [mon-compte.md](mon-compte.md) | Parcours actuel revérifié le 13 octobre ; garde transactionnelle personnelle/MFA renforcée ; remplacement MFA avec perte de réponse combinés HTTP encore hors preuve ; Bitwarden reste résolu |
| Membres — liste, création et fiche | [membres-repertoire.md](membres-repertoire.md) | **Référence visuelle et UX** avec Utilisateurs ; trois pages reprises le 13 octobre, droits/source au moment d'écrire et identité normalisée corrigés ; preuves client/SQL/HTTP et volumes bornés dans le rapport |
| Erreur, page introuvable et chargement | [etats-techniques.md](etats-techniques.md) | États client et 404 réelle revérifiés dans la clôture du 13 octobre ; pannes racines et reprises antérieures restent datées, sans qualification de disponibilité en déploiement |

Pour commencer un nouveau suivi : [modèle de revue](../modeles/revue-page.md).
L’état livré et le niveau de vérification sont distincts. « Alignée » ou « référence
visuelle » ne signifie pas que tous les défauts sont clos. Les preuves détaillées
appartiennent aux [audits datés](../../audits/README.md).
Les spécifications métier historiques de `features/pages` restent consultables
via [leur index](../../../features/pages/README.md) ; ce dossier suit les décisions
courantes et les vérifications, il ne remplace pas le plan produit.

Ne pas créer trente suivis vides pour les modules prévus. Ajouter une entrée lorsqu’un
travail réel justifie un suivi, puis maintenir décisions et points ouverts avec lui.
