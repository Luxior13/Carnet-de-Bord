# Q16 — Suppression, archivage et retrait

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Retire-t-on une donnée, un champ, une route, un droit, une intégration ou un module ?

## Questions

- Retire-t-on une visibilité, un accès, un état actif, une donnée ou tout un module ?
- Archiver, désactiver, anonymiser, purger et supprimer ont-ils des effets clairement distincts ?
- Quelles références entrantes existent : liens, relations, fichiers, jobs, exports, caches et notifications ?
- Quels faits doivent rester intelligibles et quelles valeurs doivent réellement disparaître ?
- La conservation restante a-t-elle une raison métier ou juridique documentée ?
- Une cascade supprime-t-elle davantage que l’objet annoncé ? Une restriction rend-elle l’erreur compréhensible ?
- La suppression peut-elle être rejouée sans risque et sans recréer un travail inutile ?
- Une commande concurrente peut-elle réintroduire une donnée ou modifier un objet en cours de retrait ?
- Un lien ancien affiche-t-il une issue sûre sans dévoiler l’existence d’un dossier interdit ?
- Une restauration de sauvegarde peut-elle réintroduire une donnée déjà supprimée ?
- Le retrait nettoie-t-il routes, permissions actives, secrets, tâches, dépendances, navigation et documentation ?
- Quel délai de compatibilité ou quelle redirection est nécessaire pour les consommateurs existants ?
- L’annulation annoncée est-elle possible ? Quels effets externes sont irréversibles ?

## Vérifier

Inventorier les références avant retrait, puis vérifier qu’il ne reste ni accès
dangereux, ni tâche orpheline, ni secret inutilisé. Tester replay, contrainte,
concurrence et lecture historique selon le risque.

Le nettoyage de fichiers temporaires explicitement demandé n’impose pas un chantier
d’archivage métier. Pour une donnée sensible, suivre les politiques de conservation
et de restauration propres au domaine.

## Trace attendue

Inventaire des effets, données retirées/conservées et raison, reprise possible,
compatibilité et contrôle final des références.

## Non-applicabilité et réexamen

Non applicable sans retrait ni effet sur le cycle de vie. Rouvrir lors d’un départ,
d’une purge, d’un changement de rétention ou d’un remplacement de fournisseur.

## Références

[Confidentialité](confidentialite.md) · [Migrations](migrations.md) ·
[Sauvegarde](sauvegarde-restauration.md).
