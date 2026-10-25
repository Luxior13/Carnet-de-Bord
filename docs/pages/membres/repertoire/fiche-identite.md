# Personne — Identité

[Index des pages](../../../pages/README.md) · [Répertoire](README.md) · [Design](../../../design/README.md) · [Guide général](../../../REFERENCE_GENERALE.md)

## Identité

| Élément | Valeur |
| --- | --- |
| Route | `/membres/repertoire/[id]` |
| Section | Identité, par défaut (`?section=identite`) |
| Espace | Membres |
| Gabarit visé | [B. Fiche à sections](../../../design/gabarits.md#b-fiche-à-sections) |
| État d’harmonisation | Aligné ; champs adoucis du 17 octobre 2026 — voir [Harmonisation](../../../design/harmonisation.md#état-par-page) |
| Point d’entrée | [page.tsx](../../../../apps/web/src/app/membres/repertoire/[id]/page.tsx) → [PersonIdentitySection](../../../../apps/web/src/features/persons/components/PersonIdentitySection.tsx) |
| Contrôle d’accès | `persons:view` ; modification `persons:update` ; suppression `persons:delete` ; historique d’un champ `audit:view_field_history` |
| Chargement / erreur dédiés | oui, squelette de fiche / commune à l’application |

## Rôle et tâches principales

Consulter et corriger l’identité d’une personne : pseudo principal, prénom, nom,
date de naissance civile facultative et statut dans la structure, avec leur
provenance et leur dernière modification.

## Composition actuelle

Carte sans en-tête (titre « Identité » réservé aux lecteurs d’écran) : champs
partagés `PersonIdentityFields`, indications de provenance
(`PersonFieldProvenanceHint`), historique d’un champ, `SectionActionBar` avec
soumission native et reprise de conflit ; puis « Zone dangereuse »
(`PersonDangerZone` sur `EntityDangerZone`). Les dates de la fiche sont dans
le bandeau, pas en pied de carte.

## Décisions retenues

- Revue de la fiche du 12 octobre 2026 : [Fiche personne](README.md#fiche-personne--revue-du-12-octobre-2026).
- Champs : [décision du 17 octobre 2026](README.md#champs--décision-courante-du-17-octobre-2026).
- 22 octobre 2026 : composition alignée sur la fiche utilisateur
  ([reprise](#reprise--22-octobre-2026)).
- 25 octobre 2026 : la suppression exige un mot de passe de 30 minutes au
  plus, comme celle d’un compte. Sans preuve, la zone dangereuse ouvre
  « Confirmer la suppression » puis reprend la même demande, sans nouvelle
  confirmation ([DRT-06](../../../audits/2026-10-25-coherence-des-droits.md)).

## Points ouverts

Aucun point propre à cette section : REP-D01 à REP-D10 sont clos au périmètre vérifié.

## Références

- [Page Répertoire](../../../domaines/permissions.md#page-répertoire), fiche [Confidentialité](../../../references/confidentialite.md)
- Audit : [12 octobre 2026](../../../audits/2026-10-12-fiche-personne.md)

## Historique

- 19 octobre 2026 : création de la fiche lors de la réorganisation documentaire.

## Reprise — 22 octobre 2026

Dernière fiche du gabarit B, après la fiche utilisateur et Mon compte (« ok go
la suite »). Les décisions déjà validées s’appliquent par défaut au même
gabarit.

- **Avant** : banc client du 12 octobre rejoué, 29 scénarios sur 30. L’échec
  (`lecture-seule-copie-coordonnees`) était une attente périmée : le lecteur
  simulé n’avait pas `persons:view_contact`, exigé depuis le 15 octobre pour
  voir les coordonnées.

| ID | Nature / priorité | État | Point et traitement |
| --- | --- | --- | --- |
| REP-D11 | Composition, P2 | Clos | Bandeau « Informations personnelles · Identité civile… » en tête d’Identité : titre réservé aux lecteurs d’écran, la carte commence par ses champs |
| REP-D12 | Composition, P2 | Clos | « Dernière modification … par … » répété en pied d’Identité et sous Coordonnées : remplacé par « Créée le … · Modifiée le … par … » une seule fois dans le bandeau (`heroDescription` d’`EntityDetailLayout`) |
| REP-D13 | Harmonisation, P3 | Clos | Zones de suppression divergentes (« Zone danger » sur la fiche utilisateur, autre en-tête ici) : même libellé « Zone dangereuse », même icône et même en-tête teinté dans `EntityDangerZone` et `UserDeletionCard` |
| REP-D14 | Preuve, P3 | Clos | [Banc client du 22 octobre](../../../audits/fiche-personne-2026-10-22/banc-client/README.md) : attente périmée corrigée, contrôles de la nouvelle composition, 30 scénarios sur 30 |

- **Vérifié** : types, lint, Vitest complet (contrats mis à jour), banc client.
- **Non vérifié** : session et serveur réels, lecteur d’écran réel.
