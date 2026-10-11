# Suivi transverse — Fenêtres modales

## État courant — 11 octobre 2026

Complément demandé après la revue des pages : toutes les modales des parcours
actifs sont inventoriées dans [l’audit](../../audits/AUDIT_MODALES_2026-10-11.md).
Leur présentation et leurs interactions sont exercées dans Chromium isolé, avec
composants réels et API simulées. Ce contrôle ne valide pas les mutations réelles.

Sources partagées : [Dialog](../../../apps/web/src/components/ui/dialog.tsx),
[AlertDialog](../../../apps/web/src/components/ui/alert-dialog.tsx),
[retour du focus](../../../apps/web/src/components/ui/modal-focus.tsx),
[Sheet](../../../apps/web/src/components/ui/sheet.tsx) et
[confirmation de navigation](../../../apps/web/src/components/layout/UnsavedNavigationDialog.tsx).

## Décisions courantes

- Fenêtres standard : `surface-panel`, `border-content`, rayon de 10 px, champs
  communs à 6 px, boutons partagés. La taille et la composition servent le contenu.
  Les coordonnées du Répertoire gardent leur plein écran mobile, avec corps
  défilable et actions séparées ; leurs en-têtes utilisent `surface-panel-header`.
- Recherche rapide et volet de navigation gardent leurs adaptations documentées
  dans le [suivi de navigation](navigation-generale.md), dont le fond de sidebar.
  Une confirmation n’a pas à devenir un grand formulaire pour paraître uniforme.
- Une ouverture depuis un bouton ordinaire restitue le focus à ce bouton même
  sans `DialogTrigger`. Un `onCloseAutoFocus` spécifique reste prioritaire. Une
  transition vers une autre modale ne doit pas renvoyer le focus derrière elle.
- Une confirmation critique ne se ferme pas au clic sur le voile. Échap revient
  au contexte précédent sauf fermeture volontairement bloquée. Mot de passe
  obligatoire et remise de codes de secours conservent leurs protections.
- Lorsqu’une opération est lancée, verrouiller immédiatement la soumission et
  les fermetures incompatibles ; une réponse tardive ne doit pas affecter un autre
  compte ou une autre fiche. Fermer un écran n’annule pas une mutation serveur.
- Les coordonnées conservent leur brouillon et leurs avertissements après mise
  à jour du parent. Une reprise de conflit relit la version de la fiche **et**
  celle de la coordonnée. Si un principal doit être remplacé, faire revérifier ce
  choix avant une nouvelle confirmation de suppression.
- Les échecs d’enregistrement, de suppression et de relecture restent visibles
  dans la fenêtre concernée. Une erreur à la remise de codes ne masque pas les
  codes ; l’annulation MFA attend sa réponse et permet une nouvelle tentative.

## Questions avant modification

- S’agit-il d’un formulaire, d’une confirmation ou d’une navigation ? Le bon
  composant partagé est-il utilisé, avec un titre et une description utiles ?
- Où va le focus à l’ouverture, à Tab/Shift+Tab, à Échap, après erreur, après
  fermeture et lors du passage vers une seconde fenêtre ?
- Le bouton de fermeture chevauche-t-il un titre long ? Les actions restent-elles
  atteignables sur écran étroit, écran bas et avec clavier virtuel ?
- Un clic extérieur ou une fermeture peut-il perdre un brouillon ou des codes
  affichés une seule fois ? La confirmation explique-t-elle exactement la perte ?
- Double clic, attente, échec réseau, changement de compte/droits et démontage
  sont-ils gérés ? Une annulation indique-t-elle ce qu’elle annule réellement ?
- Après conflit, toutes les versions nécessaires sont-elles actualisées sans
  effacer la saisie ? Que devient une ressource déjà supprimée ?
- Les permissions et validations serveur restent-elles indépendantes de
  l’affichage ? Quels autres écrans utilisent le composant modifié ?

## Limites et reprise

| ID | Point | Suite / déclencheur | Responsable / état |
| --- | --- | --- | --- |
| MOD-INT | Mutations, authentification, cookies et audit en base non rejoués dans cette passe de modales | Rejouer les scénarios concernés avec session et base isolées avant conclusion d’intégration complète ; conserver les points de chaque page | À attribuer / à vérifier |
| MOD-A11Y | Lecteur d’écran, zoom natif, Safari/iOS et clavier virtuel physique non exercés | Contrôle sur appareils dédiés lors de la recette d’accessibilité | À attribuer / à vérifier |

Les anciens succès de page restent datés. Les modales d’actualités appartiennent
à un module inactif : code inventorié, mais aucun parcours de publication n’est
réactivé ou déclaré validé par cette passe.

## Autocomplétion — correction du 11 octobre 2026

Tous les champs des modales, y compris mots de passe et MFA, appliquent la règle sans autocomplétion. Lors d’une modification, vérifier aussi formulaires, Textarea et champs invisibles ; aucun opt-in local.

[Règle propriétaire](../../references/DESIGN_SYSTEM.md) ·
[Contrôles et limites des extensions](../../audits/AUDIT_AUTOCOMPLETION_2026-10-11.md).
La présence des attributs d’exclusion ne garantit pas le comportement d’une
extension installée chez l’utilisateur.
