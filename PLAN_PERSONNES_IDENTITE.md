# Plan — Répertoire et identité

Statut : implémenté, validation finale en cours.

## Périmètre fonctionnel

- [x] Une fiche Personne indépendante des comptes utilisateurs.
- [x] Identité : pseudonyme, prénom, nom et date de naissance facultative.
- [x] Statut dans la structure : `IN_STRUCTURE` ou `OUTSIDE_STRUCTURE`.
- [x] Plusieurs emails avec libellé court et un principal.
- [x] Plusieurs téléphones avec libellé court et un principal.
- [x] Plusieurs profils de réseaux sociaux avec réseau, identifiant ou URL,
      libellé court et principal par réseau.
- [x] Aucun genre, compte de plateforme de jeu, ban, adhésion ou liaison métier
      anticipée dans ce module.
- [x] Les futures pages (sponsors, événements, adhésions, sanctions…) pourront
      référencer une Personne et afficher leurs liaisons sur sa fiche sans créer
      de « statut contact » manuel.

## Pages et UX

- [x] `/vie-interne/repertoire` : recherche, filtre de statut, pagination par curseur et
      états vide/chargement/erreur.
- [x] `/vie-interne/repertoire/nouveau` : création avec avertissement de doublon.
- [x] `/vie-interne/repertoire/[id]` : cartes identité, emails, téléphones et réseaux.
- [x] Édition optimiste par version pour éviter l’écrasement concurrent.
- [x] Alerte de navigation en cas de formulaire modifié non enregistré.
- [x] Toasts cohérents pour succès, conflit et erreur.
- [x] Dernière modification affichée sur la fiche.
- [x] Historique complet d’un champ dans un popover avec lien filtré vers le
      journal d’activité.
- [x] La rubrique « Vie interne » pointe vers `/vie-interne/repertoire` lorsqu’elle est la
      première page réellement disponible du pôle.

## Permissions

- [x] `persons:view` — consulter le répertoire et les fiches.
- [x] `persons:create` — créer une fiche.
- [x] `persons:update` — modifier identité, contacts et réseaux.
- [x] `persons:delete` — supprimer définitivement une fiche.
- [x] `audit:view_field_history` — consulter l’historique détaillé d’un champ.
- [x] Pas de permission par champ : les permissions restent stables quand le
      modèle d’identité évolue.
- [x] Toutes les routes contrôlent l’authentification puis la permission côté
      serveur ; l’interface ne constitue jamais la frontière de sécurité.

## Données et cohérence

- [x] Tables `Person`, `PersonEmail`, `PersonPhone`, `PersonSocialProfile`.
- [x] Normalisation et index pour recherche exacte, préfixe et trigramme.
- [x] Unicité des coordonnées normalisées dans une fiche.
- [x] Index partiels garantissant un seul principal pertinent.
- [x] Contraintes de présence minimale d’identité et de cohérence des champs
      normalisés.
- [x] Suppressions en cascade des contacts et profils.
- [x] `PersonDeletionTombstone` minimal et immuable avec
      `deletionOperationId` unique pour l’idempotence.
- [x] Aucun lien avec `User`, aucune demande de suppression en attente et aucune
      file de traitement.

## Suppression définitive

- [x] Confirmation explicite dans la zone dangereuse.
- [x] Clé d’idempotence et version de la fiche obligatoires.
- [x] Transaction PostgreSQL unique :
  1. détecter un tombstone existant pour les nouvelles tentatives ;
  2. verrouiller la fiche avec `FOR UPDATE` ;
  3. vérifier sa version ;
  4. purger les valeurs personnelles de l’historique de champs via la fonction
     SQL contrôlée ;
  5. supprimer la fiche et ses enfants ;
  6. créer le tombstone immuable ;
  7. écrire l’événement `PERSON_DELETE` sans donnée personnelle.
- [x] Réponse HTTP `204` uniquement après validation complète de la transaction.
- [x] Toute erreur annule l’ensemble ; aucun état intermédiaire ni polling.
- [x] Aucun worker, heartbeat, ledger externe, réconciliateur ou endpoint de
      statut de suppression.

## Audit et sécurité

- [x] Événements `PERSON_CREATE`, `PERSON_UPDATE`, `PERSON_DELETE`.
- [x] Snapshots d’acteur pour conserver un journal lisible.
- [x] Valeurs sensibles de champs chiffrées en AES-256-GCM avec AAD.
- [x] Inventaire append-only des versions de clés utilisées.
- [x] Tables d’audit append-only hors procédures SQL contrôlées.
- [x] La suppression d’une fiche efface ses valeurs de champs, mais conserve un
      événement final minimal prouvant l’opération.
- [x] Readiness du répertoire fermée si la migration ou une clé AES requise manque.
- [x] Le reste du site reste disponible et masque seulement la fonctionnalité.

## Conservation et exploitation

- [x] Aucun processus permanent supplémentaire.
- [x] Commande ponctuelle `bun run maintenance` pour appliquer les durées de
      conservation d’audit et de notifications et nettoyer les états expirés.
- [x] Planification quotidienne recommandée sur la plateforme de déploiement.
- [x] Paramètre obsolète `jobs.retentionDays` retiré.
- [x] Readiness réduite à `database`, `schema` et `persons`.
- [x] Format de sauvegarde signé v5 sans table de worker ni état transitoire.
- [x] Restauration signée obligatoire et vérification des clés AES historiques.

## Tests et performance

- [x] Tests de permissions des pages et routes.
- [x] Tests de normalisation, validation, principaux et concurrence optimiste.
- [x] Tests de recherche indexée et pagination stable.
- [x] Tests de chiffrement/déchiffrement et d’historique de champs.
- [x] Tests des gardes SQL de purge contrôlée.
- [x] Tests de suppression synchrone, rollback logique et idempotence.
- [x] Tests de readiness et de catalogue PostgreSQL.
- [x] Tests du format de sauvegarde v5 et de sa signature.
- [x] Scénario E2E prévu sur base dédiée, jamais sur la base applicative.
- [x] Contrôle de plans PostgreSQL sur base de performance explicitement isolée.

## Déploiement restant

- [ ] Déployer les migrations en attente sur la base cible.
- [ ] Configurer `AUDIT_ENCRYPTION_CURRENT_VERSION` et
      `AUDIT_ENCRYPTION_KEY_V1` dans le gestionnaire de secrets.
- [ ] Configurer la paire de signature de sauvegarde.
- [ ] Planifier `bun run maintenance` une fois par jour.
- [ ] Vérifier `/api/health/ready`, puis la visibilité du pôle « Vie interne » et
      de `/vie-interne/repertoire` avec un compte autorisé.
