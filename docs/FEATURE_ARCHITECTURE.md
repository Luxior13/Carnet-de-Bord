# Architecture standard d'une fonctionnalité

Toute nouvelle page fonctionnelle suit ce contrat. L'objectif est de pouvoir
ajouter des dizaines de modules sans dupliquer les décisions de sécurité, de
pagination, d'audit ou d'UX.

## 1. Manifeste

Déclarer la fonctionnalité dans `feature-registry.constants.ts`, puis relier
son entrée de navigation avec `featureId`. Le manifeste possède une clé stable,
la route, les permissions requises et la localisation d'audit. Une page ne
devient `live` qu'une fois sa route, ses permissions et ses tests prêts.

Une fonctionnalité `planned` utilise uniquement les identifiants réservés de
`ROADMAP_PERMISSIONS`. Ils ne sont jamais effectifs, stockables dans les
surcharges ni attribuables dans l'éditeur. Le passage vers `PERMISSIONS`, la
politique serveur, les tests et le statut `live` doivent être livrés ensemble.

## 2. Découpage

```text
features/<module>/
  components/       composants visuels sans accès direct à la base
  hooks/            chargement, mutations et synchronisation URL
  schemas/          schémas Zod partagés par les routes
  server/           repository, service métier et politiques
  types/            contrats sérialisables publics
  <Feature>Page.tsx orchestration uniquement
app/api/<module>/   adaptation HTTP mince
```

Une route HTTP réalise dans cet ordre : authentification, permission,
validation, appel du service métier, transaction et audit obligatoire pour les
mutations sensibles, puis réponse standard. Les règles métier ne vivent pas
dans les composants React.

## 3. Listes et volumes

- Utiliser une pagination par curseur signée pour les flux susceptibles de
  grandir. Charger `limit + 1`, ne jamais compter toute la table à chaque page.
- Lier le curseur au module, aux filtres et à un instantané.
- Borner recherche, filtres, taille de page et exports.
- Ajouter les index correspondant exactement aux filtres et à l'ordre SQL.
- Utiliser la pagination numérotée seulement pour un petit référentiel borné.

## 4. Mutations

- Toutes les entrées passent par Zod et les objets inconnus sont refusés.
- Les éditions utilisent une version optimiste (`version` ou `updatedAt`).
- Les commandes rejouables possèdent une clé d'idempotence.
- Les écritures liées et l'audit partagent la même transaction.
- Les mutations actuelles restent bornées et transactionnelles dans la requête.
- Une future opération réellement longue devra introduire explicitement son
  mécanisme durable et son exploitation ; aucune promesse détachée ne garantit
  un travail métier.

## 5. États UX obligatoires

Chaque vue couvre : skeleton initial, rafraîchissement non bloquant, résultat,
état vide, erreur avec nouvelle tentative, permission refusée et conflit de
version. Utiliser `apiFetchJson`, `useAsyncResource` et
`ResourceStateBoundary`. Les mutations importantes confirment l'intention et
affichent un toast final unique.

## 6. Tests et exploitation

- Tests unitaires des politiques et services.
- Tests de route : authentification, permission, validation, conflit, audit.
- E2E du parcours critique avec une base isolée.
- Vérification clavier, noms accessibles et affichage mobile.
- Le build respecte les budgets d'architecture et de performance.
- Toute nouvelle table est ajoutée au manifeste de sauvegarde/restauration et
  à une politique de rétention.
