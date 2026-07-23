# Exploitation

## Architecture d’exécution

L’application utilise un seul processus web. Aucun worker permanent, aucune
file `BackgroundJob`, aucun heartbeat et aucun registre externe de suppression
ne sont nécessaires.

La suppression d’une fiche Personne est exécutée immédiatement dans une seule
transaction PostgreSQL : contrôle de version, purge des valeurs d’historique de
champs, suppression en cascade, création du tombstone immuable et événement
d’audit final. Une erreur annule toute la transaction.

Les purges de conservation sont exécutées par une commande ponctuelle :

```bash
bun run maintenance
```

En production, planifier cette commande une fois par jour avec le scheduler de
la plateforme. Elle se termine après un passage et ne constitue pas un worker.

## Déploiement

1. Sauvegarder la base et conserver ensemble le JSONL, le checksum et la
   signature.
2. Déployer les migrations :

   ```bash
   bun run db:migrate:deploy
   ```

3. Déployer puis démarrer le processus web.
4. Vérifier `/api/health/live`, puis `/api/health/ready`.
5. Remettre le trafic lorsque `status` vaut `healthy` et `checks.schema` vaut
   `ready`.

`checks.persons` peut valoir `schema_not_ready` ou `not_configured` sans rendre
le reste du site indisponible. Dans ce cas, la rubrique Répertoire reste masquée.
Elle devient `ready` lorsque la migration du répertoire est présente et que toutes
les clés AES requises par l’inventaire d’audit sont disponibles.

La migration `20260722120000_remove_background_worker` supprime l’ancienne table
de file et son enum. L’action d’audit historique `BACKGROUND_JOB_UPDATE` reste
lisible afin de ne pas casser l’affichage d’anciens journaux ; aucun code ne la
produit désormais.

## Secrets du répertoire et sauvegardes

Générer le matériel initial sans écrire de secret dans le dépôt :

```bash
bun run --filter web security:secrets:generate
```

La commande produit :

- `AUDIT_ENCRYPTION_CURRENT_VERSION` et `AUDIT_ENCRYPTION_KEY_V<n>` pour les
  valeurs sensibles de l’historique de champs ;
- `DATABASE_BACKUP_SIGNING_CURRENT_VERSION` et la paire Ed25519 de sauvegarde.

Conserver toutes les anciennes clés `AUDIT_ENCRYPTION_KEY_V<n>` tant qu’une
ligne active ou une sauvegarde restaurable les référence. La clé privée de
sauvegarde ne doit être exposée qu’au job de sauvegarde. Les restaurations ont
seulement besoin des clés publiques correspondantes.

## Sauvegarde

Depuis `packages/database` :

```bash
bun run db:backup
```

Le format courant est le format signé v6. Il contient le tombstone immuable des
fiches supprimées, mais aucune file, demande en attente ou donnée de worker.

Une sauvegarde n’est exploitable que si ces trois fichiers sont conservés
ensemble :

- `*.jsonl` ;
- `*.jsonl.sha256` ;
- `*.jsonl.signature.json`.

Copier ces artefacts vers un stockage chiffré, versionné et hors site. Tester
régulièrement la restauration dans une base isolée.

## Restauration

La restauration cible exclusivement une base vide ayant déjà reçu le schéma de
la version applicative correspondante.

Vérification sans écriture :

```bash
bun run db:restore -- --file="C:\secure\backup.jsonl" --dry-run
```

Restauration confirmée :

```bash
bun run db:restore -- --file="C:\secure\backup.jsonl" --confirm-empty-restore=RESTORE-INTO-EMPTY-DATABASE
```

La signature est obligatoire. Les anciens artefacts non signés ne sont pas
acceptés automatiquement. Après restauration, démarrer le web et attendre une
readiness saine.

Attention : une sauvegarde créée avant la suppression d’une fiche contient
encore cette fiche et ne connaît pas son tombstone ultérieur. Puisqu’il n’existe
plus de registre externe de suppression, l’opérateur doit contrôler ce point
avant la remise en trafic et rejouer les suppressions requises. Une politique
de conservation courte et documentée réduit cette fenêtre sans réintroduire de
worker permanent.

## Conservation des données

Les paramètres `audit.retentionDays` et `notifications.retentionDays` sont lus
au début de chaque commande de maintenance et ne sont pas mis en cache. Une
réduction protégée par mot de passe ne prendra effet qu’à la prochaine
exécution planifiée.

La purge d’audit passe exclusivement par la fonction SQL
`purge_expired_audit_logs(integer)`. Les tables d’audit restent append-only pour
les requêtes ordinaires. La purge des valeurs liées à une fiche supprimée passe
exclusivement par `purge_person_audit_field_changes(text)` dans la transaction
de suppression.

Surveiller la sortie et le code de retour de `bun run maintenance`. Une erreur
n’empêche pas le web de servir du trafic, mais doit déclencher une alerte afin
que la conservation ne dérive pas silencieusement.

## Rotation des clés d’audit

1. Générer une nouvelle clé AES de 32 octets en Base64.
2. Distribuer `AUDIT_ENCRYPTION_KEY_V<n+1>` à tous les web, outils de sauvegarde
   et opérateurs de restauration.
3. Définir `AUDIT_ENCRYPTION_CURRENT_VERSION=n+1` sur le web.
4. Vérifier `checks.persons === "ready"`.
5. Ne jamais retirer une ancienne version avant la fin de conservation de toutes
   les données et sauvegardes qui la référencent.

## Retour arrière

Une version antérieure qui dépend de `BackgroundJob` ne doit pas être redéployée
après la migration de suppression de la table. En cas de problème applicatif,
corriger ou redéployer une version compatible avec le schéma courant. Pour un
retour complet vers un schéma ancien, restaurer une sauvegarde cohérente dans
une nouvelle base hors trafic plutôt que recréer manuellement la file supprimée.
