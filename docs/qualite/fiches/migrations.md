# Q13 — Migrations et compatibilité

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Des données ou installations existantes doivent-elles changer de format ou de comportement ?

## Questions

- Le changement affecte-t-il le schéma, les valeurs existantes, les identifiants, les URLs ou un contrat échangé ?
- Quels volumes, incohérences anciennes et références doivent être traités avant la nouvelle contrainte ?
- Quelle compatibilité faut-il entre ancienne application, nouvelle application et schéma intermédiaire ?
- Faut-il ajouter, remplir, basculer les lectures/écritures, puis retirer l’ancien champ en étapes distinctes ?
- Le renommage a-t-il été interprété comme suppression/recréation avec perte de valeurs ?
- Le SQL prend-il des verrous longs ou réécrit-il une table importante ?
- Le remplissage des anciennes lignes est-il borné, contrôlable et reprenable ?
- Les migrations déjà appliquées restent-elles immuables ?
- Quelle vérification compare comptages, contraintes, échantillons et invariants avant/après ?
- Un échec partiel est-il détectable ? Quel redémarrage est sûr pour la version réellement installée ?
- Quel retour arrière est possible après nouvelles écritures ? Faut-il corriger en avant plutôt que restaurer ?
- L’application, les outils de sauvegarde et les traitements ponctuels sont-ils déployés dans le bon ordre ?

## Vérifier

Exécuter le chemin depuis une base représentant la version précédente, pas seulement
une base vide. Essayer échec et reprise lorsque le risque le justifie. Distinguer
migration de schéma, migration de données et génération de client.

Lire le SQL effectivement exécuté et les scripts du dépôt. Ne pas supposer une
atomicité universelle de l’outil de migration. Une sauvegarde non restaurée en
essai ne prouve pas que le retour arrière fonctionne.

## Trace attendue

Préconditions, versions compatibles, séquence, données transformées, contrôles
après exécution et plan de récupération. Identifier le responsable d’une migration
opérationnelle et son périmètre autorisé.

## Non-applicabilité et réexamen

Non applicable si aucun état existant ni contrat ne doit évoluer. Une suppression
de champ ou un changement de sens la rend applicable même sans nouvelle table.

## Références

[Guide de base](../../../packages/database/prisma/README.md) ·
[Exploitation](../../OPERATIONS.md) · [Sauvegarde](sauvegarde-restauration.md).
