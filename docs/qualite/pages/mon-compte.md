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
- Avatar de compte : fond selon l'accès via `UserAvatar` partagé (rouge clair,
  ambre ou bleu clair), dessin conservé ; [décision et contrôle](systeme-utilisateurs.md#fond-des-avatars-par-accès--10-octobre-2026).
- Onglet Profil modifiable directement (nom facultatif, aucune
  autocomplétion), avec `SectionActionBar`. Onglet Sécurité en pastilles de
  statut partagées.
- Depuis la liste Utilisateurs, `returnTo` conserve les critères et la page.
  Si l'acteur peut consulter cette liste, le hero propose « Retour aux utilisateurs »
  avec une destination limitée à cette collection. La protection existante des
  saisies non enregistrées reste applicable aux liens de navigation.

## Retour à la liste — 10 octobre 2026

Effet ciblé de la correction USR-15 : Q02/Q04 pour le lien et le focus, Q09/Q10
pour les droits et la validation de destination, Q19/Q27/Q30 pour les composants,
contrôles et suivi. Autres sujets hors impact : aucun changement des données,
mutations, états de sécurité ou règles du profil.

Parcours liste → propre compte → retour dans Next/PostgreSQL isolés avec session
préparée : critères, page et lien focalisé retrouvés. Build, lint et suite web
réussis. [Preuves et limites](../../audits/AUDIT_UTILISATEURS_2026-10-10.md#validation-des-corrections).
La navigation avec brouillon, les sauvegardes et le défi MFA n'ont pas été joués
pendant cette passe ; COMPTE-01 reste ouvert sur ces parcours.

## Points ouverts

- COMPTE-01 — Parcours réel (profil, sécurité, conflits) à valider avec session et
  base isolées avant conclusion fonctionnelle complète ; responsable à attribuer,
  état « à vérifier ». Appliquer les [contrôles](../CONTROLES.md) proportionnés au
  prochain changement et consigner sa preuve dans ce suivi.
