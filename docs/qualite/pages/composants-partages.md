# Suivi — Composants partagés

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
| UI-C10 | À vérifier : intégration complète des parcours modifiés avec session et base réelles | Avant livraison de ces parcours, rejouer sauvegarde, conflit, révocation et navigation dans Next avec une base isolée ; les bancs actuels simulent API et contexte | À attribuer |
| UI-C11 | À vérifier : autres moteurs et lecteur d'écran | Avant qualification accessibilité étendue, vérifier Safari/iOS, annonces, ordre de lecture et zoom réel ; Chromium clavier/tactile ne suffit pas | À attribuer |

Ces limites ne sont pas des défauts reproduits. Les anciennes preuves
d'intégration d'autres audits gardent leur date et ne sont pas présentées comme
rejouées pour cette modification.

## Pour la prochaine page

Choisir les composants dans le catalogue, vérifier leurs consommateurs, puis
documenter uniquement la composition ou la règle propre à la page. Une nouvelle
variante répond à un besoin observé ; sa vérification couvre au moins l'usage
existant et le nouveau. Les contrôles d'interface n'attestent jamais seuls
l'autorisation serveur.
