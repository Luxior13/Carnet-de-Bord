# Q20 — Documents et fichiers

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Une pièce, image, VOD, justificatif, document émis ou version signée est-il manipulé ?

## Questions

- Le fichier est-il une pièce reçue, un modèle, une version émise, une preuve acceptée/signée ou un média esport ?
- Quel module, quelle entité et quel dossier le possèdent ?
- Qui peut déposer, consulter, remplacer, télécharger, partager et supprimer chaque version ?
- Les extensions, types réels, tailles et quotas sont-ils contrôlés côté serveur ?
- Le nom ou contenu peut-il provoquer exécution, parcours de répertoires, script ou décompression excessive ?
- Une analyse ou une quarantaine est-elle nécessaire avant ouverture ou publication ?
- Le stockage et les liens temporaires empêchent-ils un accès anonyme ou réutilisé après révocation ?
- Un aperçu, miniature, OCR ou métadonnée peut-il révéler plus que le fichier autorisé ?
- Peut-on distinguer auteur, version, date d’effet, date de dépôt et état d’acceptation ?
- Modifier un modèle réécrit-il à tort une version déjà émise ou acceptée ?
- Dépôt interrompu, référence sans objet, objet sans référence et nettoyage sont-ils traités ?
- La suppression couvre-t-elle copies, miniatures et traitements dérivés selon la politique retenue ?
- Clés, stockage de fichiers et métadonnées sont-ils restaurables ensemble ?

## Vérifier

Fichier autorisé/interdit, faux type, taille limite, nom atypique, interruption,
accès direct sans droit, ancienne version et lien expiré. Les protections d’upload
incluent validation, stockage et autorisation ; l’extension seule ne suffit pas.
[Référence OWASP](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

Pour les VOD et médias volumineux, vérifier coût, quotas et droits de diffusion ;
un lien externe peut suffire si son usage est approprié.

## Trace attendue

Cycle du document, types acceptés, stockage, contrôles, versions, accès et conservation.

## Non-applicabilité et réexamen

Non applicable sans fichier ni document géré. Une référence externe n’exige pas
automatiquement de copier le fichier dans l’application.

## Références

[Confidentialité](confidentialite.md) · [Imports/exports](imports-exports.md) ·
[Sauvegarde](sauvegarde-restauration.md) si stockage persistant.
