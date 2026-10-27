# Mon compte — Autorisations

[Index des pages](../../pages/README.md) · [Mon compte](README.md) · [Design](../../design/README.md) · [Guide général](../../REFERENCE_GENERALE.md)

## Identité

| Élément | Valeur |
| --- | --- |
| Route | `/mon-compte` |
| Section | `?section=access` |
| Espace | Compte personnel |
| Gabarit visé | [B. Fiche à sections](../../design/gabarits.md#b-fiche-à-sections) |
| État d’harmonisation | Aligné — voir [Harmonisation](../../design/harmonisation.md#état-par-page) |
| Point d’entrée | [AccessSection](../../../apps/web/src/features/account/components/AccessSection.tsx) |
| Contrôle d’accès | session ; lecture seule, aucune permission propre |
| Chargement / erreur dédiés | section chargée à la demande / commune à l’application |

## Rôle et tâches principales

Savoir ce que son compte permet d’administrer, sans le découvrir par le menu.
La section ne modifie rien ; le serveur reste la seule autorité.

## Composition actuelle

Onglet « Autorisations » (anciennement « Accès », renommé le 27 octobre 2026),
deuxième onglet comme sur la fiche utilisateur. Une carte « Droits
d’administration » (le titre ne répète pas l’onglet) : une phrase de synthèse selon le compte, puis, pour un
Utilisateur délégué, ses autorisations regroupées par catégorie (mêmes
catégories et libellés que l’onglet Autorisations de la fiche utilisateur),
chacune précédée d’une coche. Pied « Pour obtenir un accès supplémentaire,
adressez-vous à un administrateur. », absent pour le superadmin.

| Compte | Synthèse |
| --- | --- |
| Superadmin | Toutes les autorisations, y compris la gestion des administrateurs et des rôles |
| Administrateur | Toutes les autorisations administratives et les paramètres ; seul le superadmin gère les autres administrateurs |
| Utilisateur sans délégation | Aucune autorisation d’administration : espace personnel et pages ouvertes à tous |
| Utilisateur délégué | Liste de ses autorisations accordées |

## Décisions retenues

- 27 octobre 2026 : « Mon compte et utilisateur/id devraient être les mêmes
  idées de pages, donc les mêmes onglets, les mêmes noms, le même ordre » ;
  « ok go » sur Profil · Autorisations · Sécurité. L’onglet prend le nom, la
  place et l’icône (bouclier) de celui de la fiche ; Sécurité prend la clé.
  L’adresse `?section=access` ne change pas.
- 25 octobre 2026 : section créée après l’audit de cohérence des droits
  ([DRT-07](../../audits/2026-10-25-coherence-des-droits.md)), validée par le
  propriétaire (« ok go »). Pas de ligne de rôle : le badge du bandeau la porte
  déjà. Les capacités personnelles garanties (profil, mot de passe, double
  authentification, sessions) ne sont pas listées : elles appartiennent à tout
  compte et ont leurs sections.

## Points ouverts

Aucun.

## Références

- [Permissions](../../domaines/permissions.md)
- [Banc client Mon compte](../../audits/mon-compte-2026-10-11/banc-client/README.md)
  (captures `access-summary-*`)

## Historique

- 25 octobre 2026 : création ; banc Mon compte 28/28, captures relues.
