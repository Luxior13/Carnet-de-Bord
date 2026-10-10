# Référentiel de qualité et d’évolution

Ce référentiel organise le travail pendant le développement et après livraison.
Il aide à décider ce qui est utile, correct, maintenable et vérifiable pour une
structure esport. Il ne promet pas une « perfection » permanente : les besoins,
les données, les versions et les règles applicables évoluent.

## Lire dans cet ordre

1. [AGENTS.md](../../AGENTS.md) : instructions de travail du dépôt.
2. [REVUE_GENERALE.md](REVUE_GENERALE.md) : sélectionner les sujets du changement.
3. Les fiches sélectionnées : questions détaillées et contrôles concrets.
4. Le [suivi de la page](pages/README.md) et les références métier utiles.

Pour un audit demandé : [méthode d’audit](AUDITS.md) et
[contrôles disponibles](CONTROLES.md). Pour une petite correction, conserver une
trace courte ; ces guides ne rendent pas tous les contrôles obligatoires.

Une question de sélection se pose systématiquement ; la lecture détaillée est
conditionnelle. Exemple : sans événement à communiquer durablement, marquer
Q08 non applicable et ne pas lire la fiche Notifications.

## Répartition des fichiers

| Emplacement | Responsabilité | Mise à jour |
| --- | --- | --- |
| `AGENTS.md` | Point d’entrée et règles de travail | Quand la méthode de collaboration change |
| `REVUE_GENERALE.md` | Sélection, niveau de risque et fin de revue | Quand un angle de contrôle manque ou devient redondant |
| `fiches/*.md` | Questions et vérifications par sujet | Avec les apprentissages réutilisables |
| `SUJETS_FUTURS.md` | Candidats de fiches à rédiger quand un module devient réel | Avec la création de la fiche correspondante |
| `REFERENCES.md` | Où trouver les règles canoniques et les sources | Quand leur emplacement ou leur autorité change |
| `modeles/revue-page.md` | Trame de suivi d’une page ou d’un module | Quand le suivi doit évoluer |
| `modeles/decision.md` | Trame de décision structurante | Seulement pour les choix durables et contestables |
| [Modèle d’audit](modeles/audit.md) | Périmètre, preuves, constats et verdict datés | Pour une passe qui justifie un rapport |
| `AUDITS.md` et `CONTROLES.md` | Profondeur d’audit, preuve et commandes utiles | Quand la méthode ou les contrôles disponibles changent |
| `pages/*.md` | Périmètre courant, choix et points ouverts d’une page | Avec un changement qui affecte ces choix |
| `decisions/*.md` | Raisons des décisions transverses importantes | Par nouvelle décision, sans effacer l’ancienne raison |
| `docs/references/*.md` | Politiques et guides du projet | Dans le même changement que la règle concernée |
| `docs/audits/*.md` | Preuves et constats datés, indexés | Par nouvelle passe ; ne pas transformer une preuve ancienne en résultat actuel |
| `features/pages/*` et plans | Intentions métier et préparation | Selon leur statut actuel, souvent historique |

Ne pas créer une seconde copie de PERMISSIONS, DESIGN_SYSTEM ou OPERATIONS :
les fiches expliquent quoi examiner et renvoient à ces références.

Trames : [suivi de page](modeles/revue-page.md), [décision](modeles/decision.md),
[audit](modeles/audit.md). Une décision courante reste en tête du suivi ; les anciennes
passes sont identifiées comme historiques. Séparer « livré », « vérifié » et
« reste à faire » : un alignement visuel terminé ne clôt pas un défaut fonctionnel.

## Cycle de vie

Avant : préciser le besoin, les impacts, les sujets applicables et la preuve
attendue. Pendant : réviser la sélection si le périmètre change. À la livraison :
consigner le résultat réel, les limites et les points ouverts. Après : rouvrir la
revue lors d’un incident, changement de rôle, volume, réglementation, fournisseur,
version majeure ou évolution association/société.

Les revues récurrentes ont un responsable et une échéance adaptés au risque.
Éviter une fréquence universelle et des cases cochées automatiquement.

## Ce qui doit rester léger

Une correction de libellé peut se terminer par une vérification ciblée et une note
dans le changement. Une refonte avec permissions, données et notifications mérite
un suivi plus complet. Une fiche dit ce qu’il faut décider ; elle n’impose ni
nouvel outil ni pièce jointe.

Les captures et résultats bruts servent à la revue puis sont supprimables.
Leur conservation n’est pas une condition générale de validation. Garder les
décisions, le périmètre testé et les limites ; respecter la demande de nettoyage.

## Adapter au métier

Prévoir la responsabilité de l’entité, les relations datées, les saisons, les
droits par ressource et la confidentialité. Commencer par les besoins réels de
l’association ; la préparation de la société consiste surtout à préserver les
frontières et l’histoire. Un futur module reste futur tant qu’il n’est pas livré.

Un libellé, une couleur ou une action « professionnelle » ne prouve pas la qualité :
il faut que les personnes puissent effectuer leur travail correctement, retrouver
les décisions et corriger les erreurs.

## Entretenir le référentiel

Avant d’ajouter une fiche : le sujet a-t-il un déclencheur distinct et des questions
qui ne sont pas déjà couvertes ? Sinon, améliorer la fiche propriétaire.
Lors d’une suppression ou d’un renommage : corriger le guide, les modèles, les
liens et les suivis affectés. Les identifiants Q restent stables.

Exécuter `bun run docs:check` après une modification documentaire. Le contrôle
porte aussi sur références, plans, audits et intentions ; relire le fond, car un
lien valide peut encore pointer vers une règle obsolète. Tout nouveau rapport,
plan ou suivi rejoint son index avec son statut et sa portée.

Création : 26 septembre 2026. Responsable : mainteneur de la structure, à nommer
dans chaque suivi lorsqu’un engagement ou une échéance doit être porté.
