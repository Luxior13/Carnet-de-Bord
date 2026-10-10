# Suivi de page — <nom>

Copier dans `docs/qualite/pages/<identifiant-stable>.md` quand une page mérite un
suivi durable. Remplacer les liens relatifs si le fichier est placé ailleurs.
Pour une retouche mineure, actualiser le suivi existant ou le compte rendu suffit.

## Identité et état

- Route(s), module propriétaire et public :
- Statut : prévu / en développement / livré / retiré :
- Niveau de vérification : code examiné / contrôles ciblés / parcours réel ; limites et défauts ouverts :
- Responsable métier / technique, si nécessaire :
- Dernière revue, version/commit et raison :
- Références canoniques et éventuelles décisions transverses :

## Fonction et décisions courantes

- Tâche principale et critère de réussite :
- Type de page, volume, fréquence et actions :
- Données et modules propriétaires :
- Règles métier et adaptations de composition :
- Accès, confidentialité et rôle de l’entité/saison :
- Retours immédiats et événements durables nécessaires :
- Hypothèses et décisions à confirmer :

Décrire l’état courant ; ne pas recopier toutes les fiches de contrôle.

## Changement examiné

- Ajout / modification / correction / optimisation / suppression :
- Résultat avant/après attendu :
- Périmètre et consommateurs touchés :
- Risque : léger / fonctionnel / sensible :
- Validation attendue :

## Sélection des sujets

Cette table concerne le changement indiqué, pas toutes les capacités possibles.
Remplir par « à examiner », « non applicable », « hors impact » ou « à clarifier ».
Une raison commune peut regrouper des sujets hors impact pour une petite retouche.

| ID | Sujet | Classement | Raison / lien utile |
| --- | --- | --- | --- |
| Q01 | [Besoin, périmètre et règles métier](../fiches/cadrage-metier.md) | À classer | |
| Q02 | [Parcours, navigation et contenu](../fiches/parcours-navigation.md) | À classer | |
| Q03 | [Composition, couleurs et composants](../fiches/interface-visuelle.md) | À classer | |
| Q04 | [Accessibilité et adaptation](../fiches/accessibilite.md) | À classer | |
| Q05 | [Listes, recherche, filtres et pagination](../fiches/listes-recherche.md) | À classer | |
| Q06 | [Formulaires, actions et validations](../fiches/formulaires-actions.md) | À classer | |
| Q07 | [Toasts et retours immédiats](../fiches/toasts-feedback.md) | À classer | |
| Q08 | [Notifications, alertes et rappels](../fiches/notifications.md) | À classer | |
| Q09 | [Permissions et périmètres d’accès](../fiches/permissions.md) | À classer | |
| Q10 | [Sécurité et scénarios d’abus](../fiches/securite.md) | À classer | |
| Q11 | [Confidentialité, finalités et conservation](../fiches/confidentialite.md) | À classer | |
| Q12 | [Modèle de données et schéma Prisma](../fiches/schema-prisma.md) | À classer | |
| Q13 | [Migrations et compatibilité](../fiches/migrations.md) | À classer | |
| Q14 | [API, intégrité et concurrence](../fiches/api-concurrence.md) | À classer | |
| Q15 | [Audit et historique métier](../fiches/audit-historique.md) | À classer | |
| Q16 | [Suppression, archivage et retrait](../fiches/suppression-archivage.md) | À classer | |
| Q17 | [Performance et capacité](../fiches/performance.md) | À classer | |
| Q18 | [Optimisation et caches](../fiches/optimisation.md) | À classer | |
| Q19 | [Architecture et maintenabilité](../fiches/architecture.md) | À classer | |
| Q20 | [Documents et fichiers](../fiches/documents-fichiers.md) | À classer | |
| Q21 | [Imports et exports](../fiches/imports-exports.md) | À classer | |
| Q22 | [Dates, périodes et localisation](../fiches/temps-localisation.md) | À classer | |
| Q23 | [Automatisations et intégrations](../fiches/automatisations-integrations.md) | À classer | |
| Q24 | [Structure juridique et gouvernance](../fiches/structure-gouvernance.md) | À classer | |
| Q25 | [Personnes, équipes et vie esport](../fiches/esport-personnes.md) | À classer | |
| Q26 | [Finances, contrats et partenaires](../fiches/finance-contrats.md) | À classer | |
| Q27 | [Tests et validation](../fiches/tests-validation.md) | À classer | |
| Q28 | [Exploitation, observation et incidents](../fiches/exploitation.md) | À classer | |
| Q29 | [Sauvegarde, restauration et réversibilité](../fiches/sauvegarde-restauration.md) | À classer | |
| Q30 | [Dépendances, configuration et documentation](../fiches/dependances-configuration.md) | À classer | |

## Résultats des sujets examinés

| Sujet | Décision / modification | Contrôle et environnement | Résultat réel | Limite |
| --- | --- | --- | --- | --- |
| <ID> | <décision> | <test, lecture ou parcours> | <statut défini dans la revue générale> | <non vérifié> |

## Points ouverts

| ID / point | Attendu / observé et preuve | Impact / priorité | Action / responsable | État / déclencheur |
| --- | --- | --- | --- | --- |
| <ID stable et défaut/question> | <scénario ou lien vers le rapport> | <conséquence> | <étape concrète ; nom/rôle ou à attribuer> | <ouvert, corrigé à vérifier, clos ; événement/date> |

La [méthode d’audit](../AUDITS.md) définit les preuves et la clôture. Conserver les
points actifs ici et lier le rapport détaillé, sans dupliquer plusieurs registres.

## Livraison et vie suivante

- État : prêt pour le périmètre vérifié / préparation incomplète / défaut à corriger :
- Migration, déploiement, retour arrière et exploitation : applicable ou raison d’absence :
- Vérifications réellement exécutées et résultat :
- Données simulées / base isolée / parcours réel :
- Documents actualisés et fichiers temporaires nettoyés :
- Déclencheur du prochain réexamen :

## Historique utile

| Date | Changement ou décision | Conséquence / référence |
| --- | --- | --- |
| <date> | <une phrase> | <lien ou effet> |

Conserver les décisions utiles ; Git porte le détail des anciennes versions.
