# Références et responsabilités documentaires

## Choisir la bonne source

Les instructions explicites de la tâche définissent le périmètre et les décisions
autorisées. [AGENTS.md](../../AGENTS.md) et le référentiel organisent le travail.
Les politiques du projet portent les règles partagées ; le suivi d’une page porte
ses adaptations locales justifiées. Le code et les tests décrivent l’implémentation.

En cas de contradiction, vérifier statut, périmètre et décision d’origine. La date
la plus récente ne suffit pas à transformer une intention en fonction livrée.
Corriger le document propriétaire avec le changement plutôt qu’ajouter une règle
contraire dans une fiche secondaire.

## Références du dépôt

| Sujet | Source principale | Comment l’utiliser |
| --- | --- | --- |
| Méthode de revue | [Revue générale](REVUE_GENERALE.md) | Entrée conditionnelle ; aucune obligation d’ajouter les capacités listées |
| Périmètre produit | [Feuille de route](../FEUILLE_DE_ROUTE.md) | Priorités et distinctions entre actuel et futur |
| Préparation des pages | [Matrice](../../features/pages/MATRICE_PREPARATION.md) | Les anciennes fiches ne prouvent pas l’existence d’une route |
| Navigation | [NAVIGATION](../NAVIGATION.md) | Emplacements, parcours et compatibilité des routes |
| Architecture | [FEATURE_ARCHITECTURE](../FEATURE_ARCHITECTURE.md) | Responsabilités et contrats de fonctionnalité |
| Apparence commune | [DESIGN_SYSTEM](../DESIGN_SYSTEM.md) | Jetons et conventions ; adaptations de page documentées séparément |
| Permissions effectives | [PERMISSIONS](../PERMISSIONS.md) | Règles actives et source exécutable associée |
| Responsabilités métier futures | [ROLES_ET_PERMISSIONS](../ROLES_ET_PERMISSIONS.md) | Cible ; ne pas l’interpréter comme protection déjà livrée |
| Retours et messages | [FEEDBACK](../FEEDBACK.md) | Choix entre retour local, toast, notification, alerte et rappel |
| Association/société | [STRUCTURE](../STRUCTURE.md) | Entités, relations datées et histoire des engagements |
| Exploitation | [OPERATIONS](../OPERATIONS.md) | Architecture actuelle, déploiement, maintenance, secrets et reprise |
| Base | [Guide Prisma](../../packages/database/prisma/README.md) | Procédures du projet, particularités SQL et sauvegardes |
| Modèle implémenté | [schema.prisma](../../packages/database/prisma/schema.prisma) | Compléter par les migrations/contraintes SQL |
| Fonctionnalités actives | [Registre](../../apps/web/src/shared/constants/feature-registry.constants.ts) | État livré/planned, capacités et routes |
| Routes | [Constantes de routes](../../apps/web/src/shared/constants/routes.constants.ts) | Source pour destinations, constructeurs et compatibilité |
| Vérifications disponibles | [package.json](../../package.json) et [web](../../apps/web/package.json) | Commandes réellement disponibles |
| Décisions locales | [Suivis de pages](pages/README.md) | Choix actuels et limites, sans copier une politique commune |
| Audits datés | Par exemple [Utilisateurs](../AUDIT_UI_UTILISATEURS_2026-09-26.md) | Constat historique ; ne pas prétendre que les tests y sont rejoués |

## Références externes

Consultation de cadrage : 26 septembre 2026. Vérifier version et portée avant
d’appliquer une exigence à un nouveau module.

- [W3C — WCAG 2.2, référence pratique](https://www.w3.org/WAI/WCAG22/quickref/) :
  référence des critères d’accessibilité, à sélectionner selon les composants.
- [OWASP — Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) :
  refus par défaut et contrôle des accès sur chaque requête et ressource.
- [OWASP — Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) :
  événements utiles et protection des journaux, sans journaliser les secrets.
- [OWASP — File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) :
  contrôles d’entrée, de stockage et d’accès aux fichiers.
- [CNIL — Durées de conservation](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees) :
  justification par finalité et distinction entre conservation active et archivage.

Pour Prisma, Next.js et les autres outils : partir des versions installées,
résoudre la bibliothèque dans Context7, puis consulter le sujet précis. Une
documentation récente peut décrire une autre version majeure ; ses commandes ne
remplacent pas automatiquement les scripts du dépôt.

Pour une règle juridique, fiscale, contractuelle ou de compétition : consigner
source officielle ou règlement, date, juridiction, entité/compétition concernée
et personne qui a qualifié son application. Aucun délai universel ni régime de
société n’est déduit du seul projet d’évolution de la structure.
