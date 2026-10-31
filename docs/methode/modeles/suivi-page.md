# Modèle de fiche de page ou de section

Copier ce modèle pour **toute nouvelle page ou toute nouvelle section
importante**, dans le dossier de son espace ou de son module sous
[docs/pages](../../pages/README.md), avec un nom stable sans date. Adapter les
chemins relatifs, relier la fiche depuis l’index de son module, puis retirer les
rubriques sans objet. Ce modèle complète le [guide général](../../REFERENCE_GENERALE.md) ;
il ne remplace ni les domaines métier ni un rapport de preuves.

Pour un module ou une page à sections : un `README.md` (vue d’ensemble, routes
et sections, règles communes, points ouverts communs, références), puis une
fiche par page ou section importante. Voir l’[organisation des fiches](../organisation-documentaire.md#fiches-de-page).

```markdown
# <Nom de la page ou de la section>

[Index des pages](…/pages/README.md) · [<Module>](README.md) · [Design](…/design/README.md) · [Guide général](…/REFERENCE_GENERALE.md)

## Identité

| Élément | Valeur |
| --- | --- |
| Route | `/chemin/[param]` |
| Section | `?section=…` |
| Espace | Aujourd’hui / Membres / Système / Compte personnel / Hors cadre |
| Gabarit visé | Lien vers le gabarit dans design/gabarits.md |
| État d’harmonisation | Page de référence / aligné / à harmoniser, lien vers l’harmonisation |
| Point d’entrée | Lien vers page.tsx et le composant principal |
| Contrôle d’accès | Garde de page et permissions effectives |
| Chargement / erreur dédiés | oui / non |

## Rôle et tâches principales

Utilisateurs, tâche principale, ce qui doit être compris ou fait en premier,
critère de réussite.

## Composition actuelle

Zones et sections, champs, actions, états (vide, chargement, erreur, lecture
seule, conflit), mobile, fenêtres. Relevé avec la grille de questions pour une
reprise approfondie ; regrouper les éléments de même comportement.

## Traces dans le journal

Actions de la page et événement écrit pour chacune (`AuditAction`, objet
rattaché, champs libellés), selon la [règle Q15](…/references/audit-historique.md).
« Lecture seule, rien à tracer » si la page ne modifie rien.

## Décisions retenues

Décisions explicites du propriétaire, datées, et adaptations locales aux règles
communes avec leur raison. Une préférence visuelle va aussi dans le journal des
préférences. Séparer décision, fait constaté et proposition.

Variantes choisies : pour chaque élément qui ne suit pas la variante par défaut
(police, hauteur, rayon, badge, tons), indiquer la variante autorisée retenue et
le rôle qui la justifie.

## Points ouverts

| ID | Nature / priorité | État | Point et prochaine vérification |
| --- | --- | --- | --- |
| PRÉFIXE-01 | Défaut P1 / confort P2 / dette / suggestion | Ouvert / corrigé à vérifier / clos avec preuve | Attendu, observé, preuve, impact, prochaine action, responsable ou « à attribuer » |

## Vérifications et prochaine reprise

Scénarios ou commandes exécutés, date, environnement (code examiné, simulation,
base isolée, parcours réel), résultat et limites. Déclencheur de la prochaine passe.

## Références

Domaines, fiches transversales et audits utiles, sans recopier leur contenu.

## Historique

- JJ mois AAAA : changement et raison, liens utiles.

## Revues datées

Comptes rendus des passes successives, du plus récent au plus ancien, chacun
avec sa date, sa sélection de points, ses contrôles et ses limites.
```

Règles :

- La mention « Suivi à compléter » est retirée dès que le rôle et la
  composition sont relevés lors d’une reprise.
- La synthèse en haut de fiche porte l’état courant ; une revue datée plus
  ancienne n’est jamais présentée comme l’état actuel. Une décision remplacée
  est signalée comme telle.
- Un défaut partagé a une fiche propriétaire ; les autres pages y renvoient.
- Une preuve ancienne reste datée ; une recommandation n’est pas une décision.
- La sélection des points du guide suit le [modèle de création ou évolution](creation-evolution.md)
  quand une trace détaillée est utile.
- La fiche [Tests et validation](../../references/tests-validation.md) guide le
  choix des contrôles.
