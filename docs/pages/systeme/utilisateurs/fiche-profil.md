# Utilisateur — Profil

[Index des pages](../../../pages/README.md) · [Utilisateurs](README.md) · [Design](../../../design/README.md) · [Guide général](../../../REFERENCE_GENERALE.md)

## Identité

| Élément | Valeur |
| --- | --- |
| Route | `/systeme/utilisateurs/[id]` |
| Section | Profil, par défaut (`?section=profile`) |
| Espace | Système |
| Gabarit visé | [B. Fiche à sections](../../../design/gabarits.md#b-fiche-à-sections) |
| État d’harmonisation | Référence de la barre d’enregistrement ; champs harmonisés le 17 octobre 2026 — voir [Harmonisation](../../../design/harmonisation.md#état-par-page) |
| Point d’entrée | [page.tsx](../../../../apps/web/src/app/systeme/utilisateurs/[id]/page.tsx) → [UserProfileTab](../../../../apps/web/src/components/users/user-detail/UserProfileTab.tsx) |
| Contrôle d’accès | `users:view` ; profil `users:update_profile`, identifiant `users:update_login` avec preuve récente, contact `users:view_contact` / `users:update_contact` |
| Chargement / erreur dédiés | oui, squelette de fiche / commune à l’application |

## Rôle et tâches principales

Consulter et corriger l’identité administrative d’un compte : prénom, nom
facultatif, identifiant de connexion et email de contact, sans perdre le brouillon.

## Composition actuelle

La section commence directement par la rubrique Identité (titre « Profil »
réservé aux lecteurs d’écran, « Lecture seule » à droite de la rubrique si
aucun champ n’est modifiable), puis Connexion et contact (sous-titres en
petites capitales), primitives de champ communes, `SectionActionBar` avec
soumission native, confirmations de changement d’identifiant et de contact.
Sur sa propre fiche, une liste de descriptions en lecture seule renvoie à Mon
compte.

## Décisions retenues

- Les champs reprennent les primitives communes (police, 40/44 px, rayon 8 px) :
  [harmonisation du 17 octobre 2026](README.md#fiche--harmonisation-des-champs--17-octobre-2026).
- La barre d’enregistrement de cette fiche est la référence du site
  ([composants](../../../design/composants.md)).
- 20 octobre 2026 : pas de titre visible qui répète l’onglet ; l’aide de
  l’identifiant reste grise (« Le modifier déconnectera l’utilisateur de ses
  sessions actives. ») et devient un avertissement seulement quand
  l’identifiant change ([reprise](README.md#fiche--reprise-en-profondeur--20-octobre-2026)).

## Points ouverts

Aucun point propre à cette section ; voir le [README du module](README.md).

## Références

- Revues communes : [README du module](README.md#revues-communes-à-la-fiche)
- Audits : [10 octobre 2026](../../../audits/2026-10-10-fiche-utilisateur.md), [11 octobre 2026](../../../audits/2026-10-11-fiche-utilisateur.md)

## Historique

- 19 octobre 2026 : création de la fiche lors de la réorganisation documentaire.
- 20 octobre 2026 : première revue propre à la section, avec la reprise de la fiche.
