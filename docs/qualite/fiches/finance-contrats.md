# Q26 — Finances, contrats et partenaires

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Y a-t-il un montant, un engagement, une facture, un paiement, une dotation ou un livrable partenaire ?

## Questions

- Quel objet est concerné : budget, engagement, facture, avoir, règlement, frais, cotisation ou dotation ?
- L’entité responsable, la contrepartie et la période sont-elles identifiées ?
- Montant prévu, dû, payé, remboursé et restant ont-ils des définitions distinctes ?
- Devise, précision, arrondi et taux éventuel sont-ils explicites et reproductibles ?
- Une facture peut-elle avoir plusieurs règlements, un paiement plusieurs affectations, une dette un règlement partiel ?
- Qui saisit, justifie, valide et paie ? Quels seuils et règles d’auto-approbation sont réellement nécessaires ?
- Quelle protection empêche double paiement, double validation ou modification d’une période clôturée ?
- Une correction conserve-t-elle la trace de la valeur initiale et sa justification ?
- Le contrat garde-t-il version, signataires, dates d’effet, échéances, livrables et état de renouvellement/résiliation ?
- Un partenariat distingue-t-il relation, engagement, livrable, contrepartie en nature et flux financier ?
- Les prix, remboursements et dotations de joueurs sont-ils rattachés à un accord et à un bénéficiaire vérifié ?
- Les pièces et décisions sont-elles accessibles seulement aux personnes concernées ?
- Quelle source fait autorité si la comptabilité ou le paiement est géré par un outil externe ?
- Quelles exigences de facturation, fiscalité, conservation ou travail doivent être qualifiées selon l’entité et l’activité réelles ?
- Une évolution association/société préserve-t-elle les anciens émetteurs et engagements ?

## Vérifier

Règlement partiel, paiement en double, refus, annulation, correction, concurrence,
devise et période fermée. Rapprocher les totaux avec leurs lignes et sources.
Un état « payé » n’est pas une preuve de transfert si aucune source fiable ne le confirme.

Ne pas fabriquer un moteur comptable, fiscal ou de paie pour anticiper une société.
Distinguer suivi interne et document faisant foi ; faire qualifier les règles
applicables avant leur automatisation.

## Trace attendue

Cycle de chaque objet, source des montants, règles de contrôle, responsable et
frontières avec les outils externes.

## Non-applicabilité et réexamen

Non applicable sans montant ni engagement contractuel. Réouvrir pour nouveau type
de revenu, pays, devise, entité, prestataire ou obligation vérifiée.

## Références

[Structure et objets financiers](../../references/STRUCTURE.md) · [Permissions](permissions.md) ·
[Audit](audit-historique.md) · [API/concurrence](api-concurrence.md).
