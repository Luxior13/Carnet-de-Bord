# Q22 — Dates, périodes et localisation

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Une date, saison, échéance, récurrence, devise, unité ou comparaison temporelle intervient-elle ?

## Questions

- La valeur est-elle un instant, une date civile, une durée, une période ou une heure locale récurrente ?
- Quel fuseau est source de vérité : lieu du match, organisateur, utilisateur ou structure ?
- Que se passe-t-il au changement d’heure et pour une heure locale inexistante ou répétée ?
- Les limites de période sont-elles inclusives/exclusives et cohérentes entre filtre, calcul et affichage ?
- Saison sportive, campagne d’adhésion, exercice financier et période contractuelle restent-ils distincts ?
- Un changement de saison archive-t-il implicitement des affectations ou modifie-t-il les droits ?
- Une annulation ou modification d’échéance recalcule-t-elle convocations et rappels ?
- Une récurrence est-elle appliquée à toute la série, une occurrence ou les suivantes ?
- Les participants dans plusieurs pays voient-ils une information non ambiguë ?
- Date relative et date complète permettent-elles de comprendre un événement ancien ?
- Formats français, nombres, séparateurs, unités, devises et noms Unicode sont-ils correctement traités ?
- Le tri utilise-t-il la valeur métier et non le texte traduit affiché ?
- Un changement de règle datée altère-t-il les rapports ou documents déjà produits ?

## Vérifier

Minuit, fin de mois/année, année bissextile, changement d’heure, fuseaux différents,
date absente, période chevauchante et historique. Pour une rencontre, distinguer
heure prévue, reportée, réelle et état terminé/annulé.

## Trace attendue

Type temporel, fuseau, règles de bornes, source des périodes et stratégie d’affichage.
Préparer une localisation future par des données non ambiguës ; ne pas ajouter
toutes les langues sans besoin.

## Non-applicabilité et réexamen

Hors impact si aucune interprétation temporelle ni locale n’est modifiée.
Un simple horodatage technique ne justifie pas un moteur de calendrier.

## Références

[Structure](../../STRUCTURE.md) · [Notifications](notifications.md) si échéance ·
[Finances](finance-contrats.md) si exercice ou montant.
