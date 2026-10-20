# Cartographie et audit du système

[Guide général](../REFERENCE_GENERALE.md) · [Index de la documentation](../README.md)

Vue d’ensemble vivante de ce que le code contient : architecture, routes, API,
données et tests. Chaque fichier décrit l’**état constaté** à une date, avec ses
sources, et reporte les écarts relevés dans [Constats](constats.md). Les règles
à respecter restent dans les [fiches du guide](../REFERENCE_GENERALE.md#2-points-à-examiner) ;
ces fichiers servent à savoir **ce qui existe** avant de créer, modifier ou retirer.

| Fichier | Contenu | Source de vérité |
| --- | --- | --- |
| [Architecture](architecture.md) | Applications, paquets, flux d’une requête, registre des fonctionnalités, scripts d’exploitation, dépendances principales | Manifests, `middleware.ts`, `feature-registry.constants.ts` |
| [Routes](routes.md) | Les 11 fichiers `page.tsx`, leurs fiches, layouts, états de route, redirections et alias | `apps/web/src/app/**/page.tsx`, `routes.constants.ts` |
| [API](api.md) | Les 33 gestionnaires HTTP, méthodes et protections | `apps/web/src/app/api/**/route.ts` |
| [Données](donnees.md) | Les 19 modèles et 12 énumérations Prisma par domaine, migrations | `packages/database/prisma/schema.prisma` |
| [Tests et contrôles](tests.md) | Commandes du dépôt, familles de tests, bases isolées, CI, couverture documentaire | Manifests, `turbo.json`, `.github/workflows/ci.yml` |
| [Constats](constats.md) | Écarts et anomalies relevés, avec identifiants `SYS-xx` | Ces fichiers |

Le projet n’a ni actions serveur (`'use server'`), ni worker : les mutations
passent par les routes API, et la maintenance par la commande `bun run maintenance`.

## Lecture

- **Ces fichiers ne valident rien.** Un inventaire relevé dans le code ne
  prouve ni un comportement correct, ni une protection suffisante.
- Les chiffres sont datés. Avant de s’y fier pour une décision, relancer le
  relevé indiqué dans chaque fichier.
- Un constat reste « ouvert » ou « à qualifier » tant qu’un travail dédié ne l’a
  pas vérifié et traité.

## Entretien

- Mettre à jour le fichier concerné dans le même travail qu’un ajout ou retrait
  de route, d’API, de modèle, de script ou de famille de tests.
- Un audit complet d’un domaine crée un rapport daté dans
  [audits](../audits/README.md) et actualise ici l’inventaire et les constats.
- Relevé initial : 19 octobre 2026, commit `a39d1c9` ; code dormant retiré le 20 octobre 2026 (SYS-01 à SYS-04).
