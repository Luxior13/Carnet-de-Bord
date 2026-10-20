# Modèle de création ou d’évolution

Modèle facultatif pour un travail conséquent. À utiliser dans une note, une
description de PR ou la section « Revues datées » d’une fiche ; inutile de créer
un fichier permanent pour chaque petite intervention. Sélectionner les points
via la [référence générale](../../REFERENCE_GENERALE.md), puis supprimer les
rubriques inutiles.

Cette trame cadre une intervention. La [fiche de page](suivi-page.md) conserve
l’état courant au-delà de cette intervention ; les preuves détaillées vont dans
un rapport daté selon l’[organisation documentaire](../organisation-documentaire.md).

## Résultat attendu

- Création / ajout / modification / correction / optimisation / refactorisation / retrait :
- Page, section, API, module, composant ou tâche :
- Utilisateurs concernés et comportement attendu :
- Pour une création : entrée dans le produit, registre des fonctionnalités et mécanismes partagés retenus :
- Pour une évolution : comportement avant et après :
- Risque : léger / fonctionnel / sensible :

## Points applicables

Classer chaque point « à examiner », « non applicable », « hors impact » ou
« à clarifier ». Une raison commune peut regrouper les points hors impact d’une
petite retouche ; une liste de tous les points « sans objet » n’est pas exigée.

| ID | Point | Classement | Raison ou lien utile |
| --- | --- | --- | --- |
| Q01 | Besoin, périmètre et règles métier | | |
| Q33 | Fiche de la page lue | | |
| Q34 | Préférences du propriétaire | | |
| Q35 | Propositions existantes | | |
| Q02 | Parcours, navigation et contenu | | |
| Q03 | Composition, couleurs et composants | | |
| Q36 | Variantes autorisées et harmonisation | | |
| Q04 | Accessibilité et adaptation | | |
| Q05 | Listes, recherche, filtres et pagination | | |
| Q06 | Formulaires, actions et validations | | |
| Q07 | Toasts et retours immédiats | | |
| Q08 | Notifications, alertes et rappels | | |
| Q09 | Permissions et périmètres d’accès | | |
| Q10 | Sécurité et scénarios d’abus | | |
| Q11 | Confidentialité, finalités et conservation | | |
| Q12 | Modèle de données et schéma Prisma | | |
| Q13 | Migrations et compatibilité | | |
| Q14 | API, intégrité et concurrence | | |
| Q15 | Audit et historique métier | | |
| Q16 | Suppression, archivage et retrait | | |
| Q17 | Performance et capacité | | |
| Q18 | Optimisation et caches | | |
| Q19 | Architecture et maintenabilité | | |
| Q20 | Documents et fichiers | | |
| Q21 | Imports et exports | | |
| Q22 | Dates, périodes et localisation | | |
| Q23 | Automatisations et intégrations | | |
| Q24 | Structure juridique et gouvernance | | |
| Q25 | Personnes, équipes et vie esport | | |
| Q26 | Finances, contrats et partenaires | | |
| Q27 | Tests et validation | | |
| Q28 | Exploitation, observation et incidents | | |
| Q29 | Sauvegarde, restauration et réversibilité | | |
| Q30 | Dépendances, configuration et documentation | | |

## Contrats et points d’entrée

Règles métier, données, responsabilités, fichiers à réutiliser et consommateurs
touchés. Ajouter la référence spécialisée uniquement si une règle propre au
module le nécessite.

## Résultats des points examinés

| Point | Décision ou modification | Contrôle et environnement | Résultat réel | Limite |
| --- | --- | --- | --- | --- |
| <ID> | <décision> | <test, lecture ou parcours> | Validé / corrigé et vérifié / examiné dans le code / à vérifier / à corriger | <non vérifié> |

## Livraison et vie suivante

- État : prêt pour le périmètre vérifié / préparation incomplète / défaut à corriger :
- Migration, retour arrière et exploitation : applicable ou raison d’absence :
- Données simulées / base isolée / parcours réel :
- Documents actualisés et fichiers temporaires nettoyés :
- Déclencheur du prochain réexamen :

## Documentation

Fiche ou référence à mettre à jour si une règle ou un point d’entrée change.
Pour une page nouvelle ou substantiellement reprise : fiche créée ou actualisée,
décisions retenues, points encore ouverts et lien depuis l’[index](../../pages/README.md).
Une règle commune reste dans sa référence, sans duplication dans la fiche.
