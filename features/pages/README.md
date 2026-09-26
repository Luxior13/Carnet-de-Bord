# Documentation des pages

La référence courante est la [matrice de préparation](MATRICE_PREPARATION.md), qui distingue les pages livrées, les 37 chantiers et les anciennes destinations.

## À lire avant de développer

- [Revue générale](../../docs/qualite/REVUE_GENERALE.md) : questions de sélection puis fiches utiles au changement ; [suivi courant des pages](../../docs/qualite/pages/README.md).
- [Feuille de route](../../docs/FEUILLE_DE_ROUTE.md) : décisions, six étapes et périmètres.
- [Navigation](../../docs/NAVIGATION.md) : quatre pôles actifs, huit pôles cibles et règles de placement.
- [Structure](../../docs/STRUCTURE.md) : entités juridiques, historique, saisons et objets financiers.
- [Rôles et périmètres](../../docs/ROLES_ET_PERMISSIONS.md) : cible métier et contrôle par ressource.
- [Permissions actives](../../docs/PERMISSIONS.md) : fonctionnement actuellement livré.
- [Catalogue applicatif](../../apps/web/src/features/roadmap/roadmap.constants.ts) : cartes affichées dans `/feuille-de-route`.

## Fiches historiques

Les autres fiches de ce dossier conservent le détail des anciennes intentions. Leurs chemins reflètent l’ancienne arborescence : tableau de bord, vie interne, bureau/juridique, trésorerie, sport et système.

Elles servent à retrouver des besoins et des parcours, sans promettre que leur page existe ni imposer une entrée de menu. Le statut, le placement, la première version et la priorité doivent être repris depuis les références courantes ci-dessus avant toute implémentation.

Les documents plus détaillés d’un module déjà livré restent utiles pour ses règles propres ; une règle nouvelle doit être confrontée au code actuel et à ses tests.
