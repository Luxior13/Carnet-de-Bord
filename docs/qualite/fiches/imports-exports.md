# Q21 — Imports et exports

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Les données entrent-elles ou sortent-elles en masse, sous forme de fichier ou de synchronisation ?

## Questions

- Quel besoin justifie l’échange, pour quel format, destinataire et volume ?
- Le droit porte-t-il sur l’action et sur chaque ligne/champ inclus ?
- Une exportation de liste respecte-t-elle filtres, portée et ordre, avec une date de référence ?
- Le fichier révèle-t-il coordonnées, notes, champs masqués, identifiants internes ou anciens états ?
- Les cellules ou contenus exportés peuvent-ils être interprétés comme une formule ou un contenu actif ?
- L’import dispose-t-il d’un contrat versionné : colonnes, unités, encodage, dates, valeurs manquantes et limites ?
- Comment détecter doublons, correspondances incertaines et conflits sans fusionner deux personnes par email ?
- Une prévisualisation ou simulation montre-t-elle les effets avant les écritures ?
- Le lot est-il atomique ou partiel ? Peut-on reprendre sans créer des doublons ?
- Quel rapport permet de corriger les lignes rejetées sans exposer des données à un mauvais destinataire ?
- Le traitement doit-il être synchrone borné ou durable, avec quotas et résultat expirant ?
- Un export est-il confondu avec une sauvegarde restaurable ?
- Une réimportation d’un ancien export réintroduit-elle données supprimées, droits obsolètes ou informations historiques invalides ?

## Vérifier

Petit/grand fichier, type invalide, données malformées, champs inconnus, doublons,
panne à mi-parcours, relance et droits insuffisants. Vérifier l’état réel après
traitement et les métadonnées du rapport.

## Trace attendue

Contrat de format, autorisations, bornes, correspondances, stratégie d’erreur/reprise,
conservation des fichiers et provenance des données.

## Non-applicabilité et réexamen

Non applicable sans échange en masse. Un export CSV n’est pas à ajouter simplement
parce qu’une page contient un tableau.

## Références

[Documents](documents-fichiers.md) · [API et concurrence](api-concurrence.md) ·
[Confidentialité](confidentialite.md).
