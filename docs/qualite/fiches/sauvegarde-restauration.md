# Q29 — Sauvegarde, restauration et réversibilité

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Une donnée persistante, un fichier, une clé, une purge ou le format de sauvegarde change-t-il ?

## Questions

- Quelles données, fichiers, configurations et clés sont nécessaires pour restaurer ce module ?
- La nouvelle table est-elle incluse dans le manifeste de sauvegarde/restauration du projet ?
- Quelles pertes de données et quelle durée d’indisponibilité sont acceptables pour ce parcours ?
- La fréquence, rétention et localisation des sauvegardes répondent-elles à ces objectifs ?
- La sauvegarde est-elle complète, cohérente, chiffrée et protégée contre altération selon le format actuel ?
- Quelles versions de schéma et de clés sont nécessaires pour relire les sauvegardes anciennes ?
- Qui peut sauvegarder, télécharger, vérifier et restaurer, et où sont gardées les clés ?
- Les fichiers et leurs métadonnées sont-ils restaurés au même état logique ?
- Une sauvegarde antérieure réintroduit-elle personnes supprimées, droits révoqués ou tâches déjà exécutées ?
- Après restauration, quelles réconciliations empêchent nouvel envoi, double paiement ou résurrection d’un accès ?
- Les invariants, comptes protégés, pièces et opérations essentielles sont-ils vérifiés avant remise en trafic ?
- Quand la restauration a-t-elle réellement été essayée, par qui et en combien de temps ?
- Peut-on quitter un fournisseur sans perdre les données, leur sens ou leurs preuves ?

## Vérifier

Restaurer une sauvegarde représentative dans une cible isolée selon le guide actuel.
Vérifier l’état métier et les parcours, pas uniquement le code retour de la commande.
Distinguer checksum, signature, chiffrement et test de restauration.

Les clés ne vivent pas dans le dépôt. Ne pas supprimer une ancienne version tant
que des données ou sauvegardes conservées en ont besoin, selon la politique en vigueur.

## Trace attendue

Périmètre, objectifs de reprise, format/version, dépendances, dernier essai et
traitement des données qui ne doivent pas réapparaître.

## Non-applicabilité et réexamen

Hors impact sans changement de persistance, fichier, clé, rétention ni exploitation.
Un export utilisateur n’est pas une stratégie de sauvegarde.

## Références

[Guide d’exploitation](../../references/OPERATIONS.md) ·
[Base et restauration](../../../packages/database/prisma/README.md) ·
[Suppression](suppression-archivage.md).
