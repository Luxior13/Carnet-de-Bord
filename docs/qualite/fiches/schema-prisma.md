# Q12 — Modèle de données et schéma Prisma

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Le stockage, une relation, une contrainte, un index ou le sens d’une donnée change-t-il ?

## Questions

- Quel concept métier représente la donnée ? Existe-t-il déjà un propriétaire ou une relation adaptée ?
- Personne, compte, engagement daté, organisation externe et entité interne restent-ils distincts ?
- Cardinalité, nullabilité, valeurs par défaut et états ont-ils une signification métier précise ?
- Quelle unicité est globale ou limitée à une entité, équipe, période ou version ?
- Les règles indispensables sont-elles protégées par des contraintes et pas seulement par un formulaire ?
- Les relations et comportements de suppression évitent-ils cascades accidentelles et orphelins ?
- Les valeurs actuelles doivent-elles être historisées ou figées dans un document émis ?
- Les montants, devises, dates civiles, instants et fuseaux utilisent-ils une représentation adaptée ?
- Le JSON a-t-il un contrat et une version, ou cache-t-il une relation qui devrait être explicite ?
- Les index correspondent-ils à des requêtes réelles ? Quel coût d’écriture et de stockage ajoutent-ils ?
- Les requêtes sélectionnent-elles uniquement les champs nécessaires, sans secrets ni graphe non borné ?
- Triggers, fonctions SQL et contraintes non décrites complètement par Prisma sont-ils inventoriés ?
- La nouvelle donnée est-elle couverte par confidentialité, rétention, export, audit et sauvegarde ?

## Vérifier

Relire le schéma et le SQL généré, puis contrôler contraintes et relations sur une
base isolée représentative. Un schéma valide ne démontre ni la bonne modélisation
ni le coût des requêtes. Les identifiants et historiques existants doivent conserver
leur sens.

Vérifier les versions installées de Prisma et du moteur ; consulter Context7 puis,
si nécessaire, la documentation officielle de cette version. Ne pas importer les
commandes d’une version majeure plus récente.

## Trace attendue

Dictionnaire succinct : champ/concept, propriétaire, type, contrainte, confidentialité,
cycle de vie et consommateurs. Justifier toute nouvelle table ou relation.

## Non-applicabilité et réexamen

Hors impact si le stockage et le sens des données ne changent pas. Un ajout de
colonne uniquement visuelle n’exige pas automatiquement un changement Prisma.

## Références

[Schéma actuel](../../../packages/database/prisma/schema.prisma) ·
[Guide de base](../../../packages/database/prisma/README.md) · [Migrations](migrations.md).
