# Suivi — Composants partagés

## État courant — clôture du socle du 13 octobre 2026

La [revue finale du socle](../../audits/AUDIT_CLOTURE_SOCLE_2026-10-12.md) est
terminée au périmètre livré, pour poursuivre le développement métier. Ses
preuves et limites ne constituent pas une qualification de déploiement.

Les composants utiles aux pages actuelles restent partagés ; aucune variante ou
abstraction universelle n’est ajoutée sans besoin. UI-C10 est réconcilié par les
preuves complémentaires client, SQL et HTTP de la clôture, sans prétendre que
chaque état de chaque consommateur a été parcouru par HTTP. UI-C11 reste ouvert
pour les moteurs et aides techniques non exercés.

Les décisions et preuves datées ci-dessous restent conservées. Une nouvelle
revue répond à un changement, un défaut constaté ou une règle nouvelle.

## Périmètre et décision courante

Décision utilisateur du 11 octobre 2026 : examiner les composants un par un,
réutiliser ceux qui servent les pages actuelles et préparer leur extension sans
multiplier les variantes. La barre de la fiche Utilisateur sert de référence aux
actions d'enregistrement du site.

Le [catalogue](../../references/COMPOSANTS.md) porte le choix des composants ;
le [design system](../../references/DESIGN_SYSTEM.md) porte leurs règles visuelles.
L'[audit du 11 octobre](../../audits/AUDIT_COMPOSANTS_2026-10-11.md) conserve
les constats, scénarios et limites de cette passe.

## État livré

- `SectionActionBar` commune : création, édition, conflits et réglage inline.
  Soumission native ou callback exclusifs, distinction enregistrement/actualisation,
  explication d'un blocage et conservation des actions contextuelles.
- Sur petit écran ou faible hauteur, la barre reste dans le flux pour laisser
  les champs visibles. Les modales conservent leur pied adapté au dialogue.
- `ListSearchField` et `ListPagination` partagés par les deux annuaires ;
  effacement avec retour du focus, attentes et erreurs cohérentes avec les lignes.
- Primitives : attente des boutons, type explicite pour soumettre, focus commun,
  case à cocher mixte visible, textes longs contenus.
- Le formulaire reste propriétaire de sa validation, de ses droits, de sa version
  serveur et du brouillon. La barre ne lance ni requête ni navigation implicite.
- Les primitives existantes adaptées restent en place. Aucun constructeur
  universel de formulaires ni composant métier rendu artificiellement générique.

## Points ouverts et reprise

Vérification du 11 octobre : 84 scénarios Chromium et 1 084 tests web réussis
(25 ignorés), types/lint, build et budgets réussis. Les scénarios navigateur
utilisent les composants réels avec API/contextes simulés ; les preuves et la
couverture exacte appartiennent à l'audit, sans certification globale du site.

| ID | État et limite | Prochaine vérification | Responsable |
| --- | --- | --- | --- |
| UI-C10 | **Réconcilié le 13 octobre au périmètre livré** : sauvegarde, conflit, révocation et navigation sont éprouvés par des preuves complémentaires client, SQL et HTTP, reliées au rapport de clôture | Lors d'un changement, rejouer les consommateurs touchés ; chaque dialogue et combinaison d'erreur n'est pas déclaré parcouru de bout en bout HTTP | Reprise selon le changement |
| UI-C11 | À vérifier : autres moteurs et lecteur d'écran | Avant qualification accessibilité étendue, vérifier Safari/iOS, annonces, ordre de lecture et zoom réel ; Chromium clavier/tactile ne suffit pas | À attribuer |

UI-C11 reste une limite de qualification, pas un défaut reproduit. Les anciennes
preuves d'intégration gardent leur date ; l'état du 13 octobre et le rapport de
clôture distinguent les contrôles effectivement rejoués des preuves antérieures.

## Pour la prochaine page

Choisir les composants dans le catalogue, vérifier leurs consommateurs, puis
documenter uniquement la composition ou la règle propre à la page. Une nouvelle
variante répond à un besoin observé ; sa vérification couvre au moins l'usage
existant et le nouveau. Les contrôles d'interface n'attestent jamais seuls
l'autorisation serveur.
