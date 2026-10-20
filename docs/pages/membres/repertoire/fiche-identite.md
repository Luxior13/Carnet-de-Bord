# Personne — Identité

[Index des pages](../../../pages/README.md) · [Répertoire](README.md) · [Design](../../../design/README.md) · [Guide général](../../../REFERENCE_GENERALE.md)

> **Suivi à compléter.** Fiche créée le 19 octobre 2026 lors de la
> réorganisation documentaire. Les faits ci-dessous viennent du code et des
> revues du module ; aucune revue propre à cette section n’est encore consignée.

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

Champs partagés `PersonIdentityFields`, indications de provenance
(`PersonFieldProvenanceHint`), historique d’un champ, `SectionActionBar` avec
soumission native et reprise de conflit, zone de suppression
(`PersonDangerZone`).

## Décisions retenues

- Revue de la fiche du 12 octobre 2026 : [Fiche personne](README.md#fiche-personne--revue-du-12-octobre-2026).
- Champs : [décision du 17 octobre 2026](README.md#champs--décision-courante-du-17-octobre-2026).

## Points ouverts

Aucun point propre à cette section : REP-D01 à REP-D10 sont clos au périmètre vérifié.

## Références

- [Page Répertoire](../../../domaines/permissions.md#page-répertoire), fiche [Confidentialité](../../../references/confidentialite.md)
- Audit : [12 octobre 2026](../../../audits/2026-10-12-fiche-personne.md)

## Historique

- 19 octobre 2026 : création de la fiche lors de la réorganisation documentaire.
