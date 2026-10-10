# Suivi — Mon compte (`/mon-compte`)

## Identité et état

- Route : `/mon-compte`. Page personnelle du compte connecté.
- Statut : alignée le 2026-10-10 sur la fiche `/systeme/utilisateurs/[id]`.
- Vérification : alignement décrit dans le code ; parcours profil/sécurité réels
  non rejoués pendant la réconciliation documentaire du 10 octobre.

## Décisions courantes

- Même gabarit que la fiche utilisateur : hero `PageIdentityHero` compact
  (avatar DiceBear, identifiant, rôle à droite), rail « Vue d'ensemble »
  (`PageAsideLayout` + `UserOverviewCard`) et navigation de sections.
- Onglets conservés : « Profil » et « Sécurité ». L'onglet « Activité » est
  retiré comme sur la fiche, le code restant dormant pour restauration.
- Composants partagés réutilisés : `UserOverviewCard`, `UserAccessBadge`,
  `UserStatusBadge`, `SectionActionBar`.
- Onglet Profil modifiable directement (nom facultatif, aucune
  autocomplétion), avec `SectionActionBar`. Onglet Sécurité en pastilles de
  statut partagées.

## Points ouverts

- COMPTE-01 — Parcours réel (profil, sécurité, conflits) à valider avec session et
  base isolées avant conclusion fonctionnelle complète ; responsable à attribuer,
  état « à vérifier ». Appliquer les [contrôles](../CONTROLES.md) proportionnés au
  prochain changement et consigner sa preuve dans ce suivi.
