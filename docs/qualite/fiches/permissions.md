# Q09 — Permissions et périmètres d’accès

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Une donnée, une route, une action ou une portée d’accès est-elle exposée ou modifiée ?

## Questions

- Quelles lectures et commandes doivent être permises, à qui, sur quelles ressources ?
- Une capacité existante suffit-elle ? Faut-il distinguer consulter, créer, modifier, valider, exporter ou supprimer ?
- La portée est-elle personnelle, attribuée à une équipe, à une entité, à une période ou à un dossier ?
- Le rôle technique est-il confondu avec une responsabilité de coach, bureau ou trésorerie ?
- Le serveur contrôle-t-il page, API, ressource, champs sensibles, pièces et téléchargement ?
- Totaux, recherche, exports, historique et notifications appliquent-ils la même portée ?
- Un identifiant deviné ou modifié permet-il d’atteindre une ressource interdite ?
- Un cache ou une vue agrégée mélange-t-il les résultats de personnes aux droits différents ?
- Une révocation est-elle prise en compte en session, à l’exécution d’un traitement et à l’ouverture d’un lien ?
- Qui peut accorder ou déléguer la capacité, pendant combien de temps, et avec quel audit ?
- Les dépendances entre droits et restrictions du compte protégé sont-elles respectées ?
- Une permission retirée reste-t-elle dans des presets, surcharges, API ou anciens liens ?
- Une capacité seulement prévue reste-t-elle inactive jusqu’à livraison complète ?

## Vérifier

Matrice autorisé/refusé : non connecté, utilisateur limité, administrateur, compte
protégé et profils métier concernés. Essayer l’accès direct côté serveur, pas
seulement le menu. Tester horizontalement une autre personne/équipe/entité et
verticalement une commande plus privilégiée.

Les politiques du projet restent la référence. Le refus par défaut et le contrôle
à chaque requête sont aussi rappelés par [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

## Trace attendue

Capacité réutilisée ou ajoutée, portée, dépendances, points de contrôle serveur et
cas de refus vérifiés. « Aucun nouveau droit » est une décision possible.

## Non-applicabilité et réexamen

Une retouche visuelle peut être hors impact. L’exposition d’une ressource privée
ne peut pas être exemptée au motif qu’il n’y a pas de bouton Modifier.

## Références

[Permissions actives](../../PERMISSIONS.md) ·
[Rôles métier cibles](../../ROLES_ET_PERMISSIONS.md).
