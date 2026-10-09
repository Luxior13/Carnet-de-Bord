# Q15 — Audit et historique métier

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Faut-il pouvoir expliquer qui a fait quoi, quand, sur quel objet et avec quel résultat ?

## Questions

- Quel fait doit être explicable après coup, et pour quel public autorisé ?
- Faut-il un journal de sécurité, un historique métier lisible, une version de document ou plusieurs traces distinctes ?
- Qui agit réellement : compte, délégataire, automatisation ou tiers ? Sur quelle ressource et dans quel contexte ?
- Quelles anciennes/nouvelles valeurs sont utiles, et lesquelles ne doivent jamais être enregistrées ?
- L’événement représente-t-il une tentative, une réussite, un refus ou une correction ?
- Une mutation peut-elle réussir sans sa trace obligatoire, ou créer une trace sans mutation ?
- Les événements sont-ils append-only selon la politique du projet, avec une voie de purge définie ?
- Qui peut lire les métadonnées et les anciennes valeurs sensibles ?
- Une suppression conserve-t-elle la compréhension de l’événement sans conserver des données personnelles inutiles ?
- Les anciennes actions/enums restent-elles interprétables après retrait du module qui les produisait ?
- Les libellés restent-ils intelligibles quand un nom, rôle, entité ou règle change ?
- La conservation, le chiffrement et la rotation des clés couvrent-ils les anciennes valeurs et sauvegardes ?

## Vérifier

Mutation et trace cohérentes, absence de secret dans la charge utile, lecture
autorisée/refusée, objet supprimé, événement historique et purge contrôlée.
Un log technique de console n’est pas un historique métier fiable.

L’exclusion des secrets et la protection des journaux font partie des principes
décrits par [OWASP Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).

## Trace attendue

Catalogue des faits, métadonnées minimales, lecteurs, atomicité, conservation et
comportement des références devenues absentes.

## Non-applicabilité et réexamen

Un simple affichage ou changement de filtre n’exige pas automatiquement un événement
d’audit. Reconsidérer pour les lectures sensibles si la politique du dossier l’exige.

## Références

[Exploitation et purge](../../references/OPERATIONS.md) ·
[Confidentialité](confidentialite.md) · [Architecture](../../references/FEATURE_ARCHITECTURE.md).
