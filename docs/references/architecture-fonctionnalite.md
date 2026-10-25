# Architecture standard d'une fonctionnalité

Toute nouvelle page fonctionnelle suit ce contrat. L'objectif est de pouvoir
ajouter des dizaines de modules sans dupliquer les décisions de sécurité, de
pagination, d'audit ou d'UX.

Le projet est encore en développement. Simplifier le code et corriger le modèle
quand un besoin concret le justifie ; ne pas multiplier les couches de
compatibilité pour une production supposée. Les données locales existantes ne
sont pas présumées supprimables et les contrôles d’intégrité restent nécessaires.

Pour choisir les sujets à examiner selon le changement, commencer par la
[référence générale](../REFERENCE_GENERALE.md). Ce contrat décrit les responsabilités
des fonctionnalités ; il ne demande pas d'ajouter une capacité inutile à chaque page.

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
  grandir. Charger `limit + 1` pour déterminer la suite ; ne pas calculer un
  total complet sans besoin d’interface explicite.
- Si un total exact ou une synthèse globale est demandé, en préciser le sens,
  mesurer le coût et garder le total filtré cohérent avec les résultats. Le
  Répertoire utilise un total avant curseur et une synthèse globale séparée ;
  ce choix mesuré ne rend pas le comptage obligatoire pour toutes les listes.
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

Chaque vue couvre les états applicables à son parcours : chargement initial,
rafraîchissement non bloquant, résultat, état vide, erreur avec nouvelle tentative,
permission refusée et conflit de version pour une édition concurrente. Réutiliser
le client typé `apiFetchJson` et son `ApiClientError`, sans refonte automatique
d'une page existante pour une petite retouche.

**Couche de données client — décision du 25 octobre 2026 (REV-20)** : TanStack
Query (v5) devient la couche commune de lecture et de mutation des **nouveaux
modules** : cache par clé, déduplication, annulation, reprise, données périmées
et états de chargement, au lieu des `AbortController` et `mountedRef` recodés
par page. Chaque module l’enveloppe dans ses hooks (`hooks/use<Objet>Query`,
`use<Action>Mutation`) avec `apiFetchJson` comme fonction de requête ; un
conflit de version reste une `ApiClientError` traitée par la page. La
dépendance s’installe avec son **premier consommateur** (version exacte publiée
depuis au moins deux semaines), jamais sans usage. Les pages livrées migrent à
leur prochaine reprise en profondeur, pas par une campagne de réécriture
([revue du 23 octobre 2026](../audits/2026-10-23-revue-complete.md), REV-20).
Les mutations reçoivent un retour visible ; la confirmation d'intention dépend
du risque et le toast est retenu lorsqu'il apporte une information utile, selon
[politique des retours](feedback.md).

## 6. Tests et exploitation

- Tests unitaires des politiques et services.
- Tests de route : authentification, permission, validation, conflit, audit.
- E2E du parcours critique avec une base isolée.
- Vérification clavier, noms accessibles et affichage mobile.
- Le build respecte les budgets d'architecture et de performance.
- Toute nouvelle table est ajoutée au manifeste de sauvegarde/restauration et
  à une politique de rétention.
