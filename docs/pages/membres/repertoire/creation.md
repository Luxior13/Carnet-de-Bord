# Nouvelle fiche personne

[Index des pages](../../../pages/README.md) · [Répertoire](README.md) · [Design](../../../design/README.md) · [Guide général](../../../REFERENCE_GENERALE.md)

## Identité

| Élément | Valeur |
| --- | --- |
| Route | `/membres/repertoire/nouveau` |
| Espace | Membres |
| Gabarit visé | [C. Formulaire de création](../../../design/gabarits.md#c-formulaire-de-création) |
| État d’harmonisation | Aligné : bandeau compact, champs adoucis, barre commune — voir [Harmonisation](../../../design/harmonisation.md#état-par-page) |
| Point d’entrée | [page.tsx](../../../../apps/web/src/app/membres/repertoire/nouveau/page.tsx) → [PersonCreateForm](../../../../apps/web/src/features/persons/components/PersonCreateForm.tsx) |
| Contrôle d’accès | `persons:create` (page et `POST /api/personnes`) |
| Chargement / erreur dédiés | non / commune à l’application |

## Rôle et tâches principales

Créer une fiche personne avec le minimum utile : pseudo principal, ou prénom et
nom, et statut dans la structure. Critère de réussite : une seule fiche créée,
sans doublon involontaire, avec un retour vers la liste ou la fiche.

## Composition actuelle

Bandeau compact ; quatre champs partagés avec la fiche (`PersonIdentityFields`) ;
`SectionActionBar` avec soumission native ; alerte de doublon ; reprise
manuelle après réponse perdue.

## Décisions retenues

- Un pseudo suffit ; sans pseudo, prénom et nom sont nécessaires.
- Brouillon conservé après erreur ; navigation protégée jusque dans le chargement.
- Détails : [Création de fiche — décisions du 12 octobre 2026](#création-de-fiche--décisions-du-12-octobre-2026).

## Points ouverts

Aucun point ouvert : REP-N01 à REP-N06 sont clos ; la reprise manuelle reste sans
garantie d’idempotence (limite documentée).

## Références

- Fiches [Formulaires](../../../references/formulaires-actions.md) et [Personnes et vie esport](../../../references/esport-personnes.md)
- Audit : [12 octobre 2026](../../../audits/2026-10-12-creation-personne.md)

## Historique

- 11 et 12 octobre 2026 : contrôle, décisions et audit de la création.
- 19 octobre 2026 : fiche propre à la création, créée par découpage du suivi du module.

## Revues datées

Sections déplacées le 19 octobre 2026 depuis l’ancien suivi du module, sans
modification de leur contenu. Elles conservent leur date, leur portée et leurs
preuves ; la synthèse ci-dessus porte l’état courant.

### Création de fiche — décisions du 12 octobre 2026

La page conserve quatre champs : pseudo principal, prénom, nom et statut dans
la structure. Un pseudo suffit ; sans pseudo, prénom et nom sont nécessaires.
Une fiche personne n'est ni un compte utilisateur, ni une adhésion, ni un rôle
daté. La date de naissance et les coordonnées se complètent dans la fiche.
Le statut proposé reste « Hors structure ». Aucun nouvel assistant ou champ
métier n'est ajouté par la revue.

- Après succès confirmé, la fiche reste créée même si son ouverture échoue :
  conserver le résultat et son lien, empêcher un nouveau POST, remplacer
  l'entrée de création dans l'historique lors de l'ouverture de la fiche.
- Une réponse perdue ne signifie pas que la création a échoué. Délai de
  30 secondes, conservation du brouillon, vérification du Répertoire dans un
  autre onglet puis confirmation avant nouvelle création sont les reprises
  retenues. Aucun rejeu automatique ni nouvelle table d'idempotence ; cette
  reprise manuelle ne garantit pas l'absence de doublon si la première
  commande a abouti.
- Les homonymes restent autorisés. Les alertes de doublon du service concernent
  seulement les coordonnées, absentes de ce formulaire minimal. Le traitement
  local d'alerte et son stockage sont retirés ; l'API des coordonnées conserve
  son contrat, sans nouvelle unicité du pseudo ou du nom.
- La barre `SectionActionBar` appartient à la page, après la carte dans le
  formulaire. Conserver la validation native, les erreurs liées aux champs,
  le verrou immédiat et le retour du focus après annulation ou erreur. Une
  création vierge reste soumettable pour faire apparaître sa validation ;
  l'état initial de la barre n'est pas en soi une anomalie de brouillon.
- Une indisponibilité technique pendant saisie ne doit pas effacer le
  brouillon ; le retrait de droit ou le changement de compte doit en revanche
  empêcher sa réutilisation dans une autre portée. La perte du pseudo après
  indisponibilité puis retour du service est reproduite avec contexte simulé ;
  le correctif conserve désormais le formulaire, sa saisie et son focus.

Vérification finale : **28 parcours client simulés et onze parcours
Next/session/PostgreSQL réels réussis**. La reproduction HTTP avant correction
créait deux fiches après perte de réponse ; après correction, l'absence de
répétition involontaire et la reprise après vérification sont contrôlées avec
la personne et son audit en base. Le banc serveur compte **16 cas SQL réels
et 53 tests existants réussis**, dont REP-N05 avant/après. La suite web compte
**1 236 réussis, 133 ignorés**, après ajout de la régression du squelette
REP-N06 ; sa transition ralentie est vérifiée en HTTP réel. Build, types,
lint et budgets d'architecture/performance passent. Voir le
[rapport du 12 octobre](../../../audits/2026-10-12-creation-personne.md).

| Point | État et prochaine vérification |
| --- | --- |
| REP-N01 — Résultat inconnu et répétition | Clos côté client et HTTP : attente bornée, réponse perdue après commit sans second POST involontaire, vérification du Répertoire et reprise confirmée après panne avant envoi ; une reprise volontaire reste susceptible de créer un homonyme |
| REP-N02 — Succès et ouverture de fiche | Clos côté client : erreur de navigation, lien de reprise et absence de nouvelle création vérifiés |
| REP-N03 — Barre et retours du formulaire | Clos côté client : barre hors carte, six largeurs/faible hauteur et retours d'erreur vérifiés ; soumission initiale volontairement conservée |
| REP-N04 — Indisponibilité pendant saisie | Clos côté client : saisie et focus conservés après rétablissement, ancien formulaire retiré après changement de compte ou de droit |
| REP-N05 — Indices des coordonnées initiales | Clos après échec puis réussite du même scénario SQL : choix du principal social sans réordonner les entrées ; impact API uniquement, formulaire minimal inchangé |
| REP-N06 — Retour pendant chargement de la fiche | Clos après régression de rendu serveur et transition HTTP ralentie : aucun lien statique dans le squelette, retour filtré correct dès que la fiche est chargée |

### Création de fiche — contrôle historique du 11 octobre 2026

`/membres/repertoire/nouveau` utilise maintenant `PageIdentityHero` compact,
avec les champs et le sélecteur de statut partagés. Le formulaire conserve sa
composition propre ; pseudo seul ou prénom et nom restent les règles métier.

- Le brouillon est comparé aux valeurs initiales : saisir puis effacer ne demande
  plus une confirmation inutile. Une navigation annulée restitue le focus.
- Un verrou synchrone empêche deux créations simultanées. Après succès, il reste
  actif jusqu’au départ vers la fiche ; la confirmation de perte de saisie est
  désactivée. Les réponses après démontage sont ignorées, et un changement de
  compte remonte le formulaire.
- Un refus de `sessionStorage` pour transmettre l’alerte de doublon ne transforme
  plus une création réussie en erreur : avertissement visible puis ouverture de
  la fiche. Le stockage de cette alerte reste facultatif.
- Un échec de création conserve les champs avec un message persistant ; les
  erreurs de validation ciblent le premier champ invalide.

[Preuve du 11 octobre](../../../audits/2026-10-11-pages-restantes.md) : quatre
largeurs, création simulée avec double soumission et stockage bloqué, saisie
effacée, navigation annulée/focus, validation et réponse 500. La suite web passe.
Cette passe simulée ne réauditait pas la liste et la fiche. Complément ultérieur
du même jour : création et trace en base avec session réelle vérifiées dans
l’[intégration Répertoire](../../../audits/repertoire-2026-10-11/banc-integration/README.md).
