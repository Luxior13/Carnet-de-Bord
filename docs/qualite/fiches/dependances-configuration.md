# Q30 — Dépendances, configuration et documentation

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Une bibliothèque, une version, un secret, un réglage ou une règle documentaire change-t-il ?

## Questions

- Le besoin justifie-t-il une bibliothèque, ou l’existant suffit-il ?
- Quelle version est installée et quelle documentation correspond réellement à cette version ?
- Maintenance, licence, vulnérabilités, compatibilité, taille et dépendances indirectes ont-elles été examinées ?
- L’outil ajoute-t-il collecte de données, réseau, binaire, service, coût récurrent ou accès sensible ?
- Le lockfile et les environnements rendent-ils l’installation reproductible ?
- Quelle configuration est nécessaire, quel défaut s’applique et quelle valeur doit provoquer un refus de démarrage ?
- Un réglage métier mérite-t-il une interface, ou doit-il rester une configuration d’exploitation ?
- La portée d’un réglage est-elle globale, par entité, utilisateur, période ou environnement ?
- Qui peut le modifier et comment constater la valeur effective et son historique ?
- Secret, paramètre public et information métier sont-ils séparés ?
- Retirer une dépendance retire-t-il aussi clés, scripts, imports, règles de déploiement et documentation ?
- Les références, exemples et commandes restent-ils à jour sans dupliquer une politique canonique ?
- Une nouvelle règle documentaire impose-t-elle par erreur du travail ou des approbations à chaque petite modification ?

## Vérifier

Contrôler la version dans le manifeste et le lockfile ; suivre Context7 pour les
API/outils puis une source officielle adaptée en cas de manque. Tester les
consommateurs affectés par une mise à jour. Ne pas recopier une commande de dernière
version dans un projet utilisant une autre version majeure.

Pour les documents, vérifier liens locaux, identifiants de fiches, absence de
références obsolètes et cohérence avec les décisions courantes.

## Trace attendue

Justification, version, impacts, configuration, solution de sortie et documents
modifiés. Une simple mise à jour ne justifie pas une nouvelle dépendance.

## Non-applicabilité et réexamen

Hors impact si aucune dépendance, configuration ou règle documentaire ne change.
Réouvrir à chaque changement de version majeure, fournisseur ou politique.

## Références

[AGENTS.md](../../../AGENTS.md) · [Références canoniques](../REFERENCES.md) ·
[Exploitation](../../references/OPERATIONS.md).
