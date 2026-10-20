# Mon compte — Profil

[Index des pages](../../pages/README.md) · [Mon compte](README.md) · [Design](../../design/README.md) · [Guide général](../../REFERENCE_GENERALE.md)

## Identité

| Élément | Valeur |
| --- | --- |
| Route | `/mon-compte` |
| Section | Profil, par défaut |
| Espace | Compte personnel |
| Gabarit visé | [B. Fiche à sections](../../design/gabarits.md#b-fiche-à-sections) |
| État d’harmonisation | Aligné — voir [Harmonisation](../../design/harmonisation.md#état-par-page) |
| Point d’entrée | [page.tsx](../../../apps/web/src/app/mon-compte/page.tsx) → [ProfileSection](../../../apps/web/src/features/account/components/ProfileSection.tsx) |
| Contrôle d’accès | session ; `account:update_profile` (`PATCH /api/auth/me`), `account:update_contact` (`PATCH /api/auth/contact-email`) |
| Chargement / erreur dédiés | section chargée à la demande / commune à l’application |

## Rôle et tâches principales

Corriger son prénom et son nom, consulter son identifiant et changer son adresse
de contact sans perdre sa saisie.

## Composition actuelle

Formulaire de profil soumis par Entrée avec `SectionActionBar` ; adresse de
contact modifiée dans une fenêtre (`ContactEmailDialog`) ; relecture champ par
champ après conflit.

## Décisions retenues

- Barre commune et relecture fusionnant chaque champ : [Barre du profil](#barre-du-profil--11-octobre-2026)
  et [Concurrence et reprise](README.md#concurrence-et-reprise--complément-du-11-octobre-2026).

## Points ouverts

Aucun point ouvert propre au profil.

## Références

- [Socle et autonomie personnelle](../../domaines/permissions.md#socle-et-autonomie-personnelle)
- Audit : [11 octobre 2026](../../audits/2026-10-11-mon-compte.md)

## Historique

- 19 octobre 2026 : fiche propre à la section, créée par découpage du suivi.

## Revues datées

Sections déplacées le 19 octobre 2026 depuis l’ancien suivi du module, sans
modification de leur contenu. Elles conservent leur date, leur portée et leurs
preuves ; la synthèse ci-dessus porte l’état courant.

### Barre du profil — 11 octobre 2026

Le profil utilise `SectionActionBar` et un vrai formulaire soumis par Entrée.
La relecture après conflit affiche Actualisation, avec les mêmes verrous que la
sauvegarde ; le brouillon reste disponible. Annuler restaure les valeurs et rend
le focus à la saisie ou à son titre si le droit a changé. La barre ne masque plus
les champs sur petit écran. Le dialogue de contact garde son pied contextuel.

[Composants communs](../../design/composants.md) et
[audit daté avec limites](../../audits/2026-10-11-composants.md).
