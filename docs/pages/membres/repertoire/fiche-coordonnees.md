# Personne — Coordonnées

[Index des pages](../../../pages/README.md) · [Répertoire](README.md) · [Design](../../../design/README.md) · [Guide général](../../../REFERENCE_GENERALE.md)

## Identité

| Élément | Valeur |
| --- | --- |
| Route | `/membres/repertoire/[id]` |
| Section | `?section=coordonnees` |
| Espace | Membres |
| Gabarit visé | [B. Fiche à sections](../../../design/gabarits.md#b-fiche-à-sections) |
| État d’harmonisation | Aligné ; sélecteurs en variante par défaut depuis le 17 octobre 2026 — voir [Harmonisation](../../../design/harmonisation.md#état-par-page) |
| Point d’entrée | [PersonCollectionsSection](../../../../apps/web/src/features/persons/components/PersonCollectionsSection.tsx) |
| Contrôle d’accès | lecture `persons:view` et `persons:view_contact` ; écriture `persons:update_contact` (routes `emails`, `telephones`, `reseaux-sociaux`) |
| Chargement / erreur dédiés | section chargée à la demande / commune à la fiche |

## Rôle et tâches principales

Tenir à jour les emails, téléphones et réseaux sociaux d’une personne, avec un
contact principal par type, sans écraser une modification concurrente.

## Composition actuelle

Trois collections en une colonne (Emails, Téléphones, Réseaux sociaux), cartes
`CollectionCard` : icône, titre, compteur et « Ajouter », sans sous-titre ;
chaque ligne a une icône de type (enveloppe, téléphone, plateforme), le
numéro est affiché au format international lisible (« +33 6 12 34 56 78 »,
affichage seulement). L’onglet porte le total des coordonnées
(« Coordonnées 4 », chiffre visuel, nom accessible inchangé). Ajout,
modification et suppression en fenêtre (`PersonChildDialog`), alerte de doublon, choix du
contact principal ; plafonds de dix emails et dix téléphones.

## Décisions retenues

- 15 octobre 2026 : lecture et écriture des coordonnées séparées de l’identité ;
  provenance minimale (voir ci-dessous).
- Chaque écriture vérifie la version lue de la coordonnée (REP-19) ; le
  propriétaire d’un profil social est protégé (REP-20).

- 27 octobre 2026 : revue de l’onglet, « ok go » sur cinq points : une
  colonne au lieu de deux (trous selon le nombre d’adresses), sous-titres
  retirés, numéro lisible, compteurs de l’en-tête (✉ 2 · ☎ 1 · partage 1)
  remplacés par le total sur l’onglet, icône de type sur chaque ligne ;
  précisions de ligne qui passent à la ligne au lieu d’être tronquées.
- 27 octobre 2026 : sur demande du propriétaire (« retire toutes les icônes qui au survol montrent qui a renseigné la donnée », puis « aucune page ne devrait avoir ça, on mettra en place les logs plus tard »), l’historique de champ disparaît de toute l’interface : horloges d’Identité, icônes des fenêtres de coordonnées, bouton « Consulter … et son origine » des lecteurs sans droit de modification, composant `PersonFieldProvenanceHint` et appel client. Le même jour (« fais ce que tu veux » du propriétaire), l’autorisation `audit:view_field_history`, la route `/api/personnes/[id]/historique-champ` et son service sont retirés ; la migration `20261027120000_remove_field_history_permission` efface la clé des autorisations individuelles enregistrées (vérifiée sur PostgreSQL local jetable, puis appliquée par le propriétaire sur la base de travail le 27 octobre 2026). Les événements d’audit et les changements de champ sont conservés pour le futur journal d’activité.

- 27 octobre 2026 : fenêtres relues une par une (captures `fenetre-*` du
  banc, 390 et 1 440 px), puis « ok go » sur trois corrections. Sous le titre,
  « Si cette adresse (ce numéro, ce profil) figure déjà sur une autre fiche,
  vous en serez averti. » au lieu d’une phrase sur le système ; pour l’élément
  principal, « C’est l’email principal. Pour en changer, choisissez d’abord un
  autre email comme principal. » (et ses variantes) ; la confirmation nomme
  l’élément, « Supprimer camille@example.test ? », et le choix du nouveau
  principal affiche les numéros au format lisible ; le champ « Libellé »
  montre le chevron des menus au lieu du triangle du navigateur.

## Points ouverts

Aucun point ouvert.

## Références

- [Page Répertoire](../../../domaines/permissions.md#page-répertoire), fiche [Confidentialité](../../../references/confidentialite.md)
- Audits : [12 octobre 2026](../../../audits/2026-10-12-fiche-personne.md), [15 octobre 2026](../../../audits/2026-10-15-autorisations-site.md)

## Historique

- 19 octobre 2026 : fiche propre à la section, créée par découpage du suivi du module.
- 22 octobre 2026 : pied « Dernière modification » retiré, la date est dans le
  bandeau de la fiche ([reprise](fiche-identite.md#reprise--22-octobre-2026)).

## Revues datées

Sections déplacées le 19 octobre 2026 depuis l’ancien suivi du module, sans
modification de leur contenu. Elles conservent leur date, leur portée et leurs
preuves ; la synthèse ci-dessus porte l’état courant.

### Corrections et séparation des coordonnées — 15 octobre 2026

Après accord utilisateur, AUT-S01/S03/S04 sont corrigés et vérifiés ; AUT-S06
est adopté. Ces décisions remplacent les anciennes descriptions couplant
identité et contacts ou mentionnant deux valeurs de provenance.

- `persons:view` permet identité, date de naissance et statut ;
  `persons:update` permet leur modification.
- `persons:view_contact`, dépendant de la lecture du Répertoire, ouvre emails,
  téléphones et profils sociaux. Sans lui : onglet/résumé absents, collections
  vides dans les réponses, compteurs masqués, recherche limitée à l'identité,
  filtre « sans coordonnées » et provenance des coordonnées refusés.
- `persons:update_contact` exige ces deux lectures et autorise ajout,
  modification et retrait des contacts. Une création API avec contacts initiaux
  l'exige aussi ; le formulaire actuel reste identité/statut.
- La provenance appartient au Répertoire, dépend de sa lecture et ne renvoie
  que le dernier auteur autorisé, l'action, la date et l'id de trace, sans valeurs.
- L'auteur racine est présenté comme « Superadmin », sans identifiant,
  aux autres lecteurs de liste, fiche, provenance et retours de mutation.
  Les snapshots d'audit originaux sont conservés.
- Les mutations revalident l'autorité attendue et les droits courants dans
  leur transaction, y compris avant de retourner une fiche projetée.

Migration appliquée après sauvegarde signée : accès effectifs antérieurs aux
contacts conservés, nouveaux choix explicites respectés, compte protégé et
tombstones exclus, aucun audit réécrit. AUT-S07 reste une suggestion non
adoptée : suppression avec confirmation/version, sans nouveau mot de passe.

**82 tests PostgreSQL réussis** (création, fiche, liste, migration), inclus dans
les 1 335 tests web réussis. Cinq parcours Chromium/Next de production/PostgreSQL
à 1440 px, données fictives et sessions préparées ; pas de nouveau parcours
connexion/MFA, de qualification de charge ni de tous les formats.
Le [complément du rapport](../../../audits/2026-10-15-autorisations-site.md#corrections-après-accord--15-octobre-2026)
porte les résultats et limites ; les constats initiaux ci-dessous restent datés.
