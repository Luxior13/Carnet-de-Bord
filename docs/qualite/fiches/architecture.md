# Q19 — Architecture et maintenabilité

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Ajoute-t-on une responsabilité, une abstraction, un composant partagé ou une dépendance entre modules ?

## Questions

- Quelle responsabilité appartient à la page, au composant, au service métier et au stockage ?
- Une donnée a-t-elle un propriétaire unique malgré ses projections dans plusieurs pages ?
- La règle métier est-elle testable sans rendre l’interface ?
- Une nouvelle abstraction répond-elle à plusieurs besoins réels, ou masque-t-elle un cas unique simple ?
- Les dépendances entre modules sont-elles explicites, sans cycle ni accès caché à leurs tables ?
- Les composants partagés laissent-ils adapter densité, contenu et état au type de page ?
- Les contrats destinés au navigateur excluent-ils dépendances serveur et données privées ?
- Une constante commune change-t-elle des pages hors périmètre ?
- Le découpage améliore-t-il la compréhension, ou disperse-t-il artificiellement une logique ?
- Les variantes et exceptions restent-elles nommées, localisées et justifiées ?
- Le retrait futur du module laisse-t-il le reste de l’application utilisable ?
- Une extension nécessite-t-elle réellement service indépendant, worker, bus ou nouvelle base ?

## Vérifier

Suivre une lecture et une mutation de l’écran jusqu’au stockage. Repérer règles
dupliquées, modules consommateurs et frontières serveur/navigateur.
Utiliser les contrôles d’architecture du dépôt et des tests sur les invariants
concernés ; le nombre de lignes n’est pas à lui seul une mesure de qualité.

Le processus web unique et l’absence de worker permanent sont des décisions
actuelles. Un besoin futur de travail durable devra justifier son évolution.

## Trace attendue

Responsabilités, dépendances, réutilisation et compromis. Pour un choix transverse
durable, utiliser le modèle de décision plutôt qu’un commentaire dispersé.

## Non-applicabilité et réexamen

Hors impact pour une retouche locale sans dépendance nouvelle. Réexaminer quand
le même besoin revient, qu’une exception se multiplie ou qu’un module est retiré.

## Références

[Contrat d’architecture](../../FEATURE_ARCHITECTURE.md) ·
[Exploitation](../../OPERATIONS.md) · [Modèle de décision](../modeles/decision.md).
