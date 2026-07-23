# Plan — Réunions internes

Statut : conception en cours, aucun schéma ni écran métier implémenté.

Ce document évolue avec les décisions prises pendant la discussion. Une case
cochée représente une orientation déjà retenue ; une case vide reste à décider
ou à implémenter.

## Objectif

- [x] Faire de `/vie-interne/reunions` la page principale de préparation et de
      suivi des réunions internes.
- [x] Réutiliser les fiches du Répertoire pour les participants sans créer de
      liaison entre `Person` et `User`.
- [ ] Permettre de préparer une réunion, suivre les sujets abordés, consigner
      les décisions et conserver un historique fiable.
- [ ] Garder une première version utile et simple, sans reconstruire
      immédiatement un calendrier ou un outil complet de gestion de projet.

## Périmètre de la première version

- [ ] Liste des réunions à venir, passées, terminées et annulées.
- [ ] Création d'une réunion avec les informations essentielles.
- [ ] Modification avec protection contre les écrasements concurrents.
- [ ] Participants sélectionnés depuis le Répertoire.
- [ ] Ordre du jour ordonné.
- [x] Chaque sujet de l'ordre du jour peut être lié à plusieurs éléments de
      contexte.
- [ ] Décisions prises pendant ou après la réunion.
- [ ] Notes générales facultatives.
- [ ] Changement de statut.
- [ ] Activité contextuelle de la réunion.
- [ ] Duplication facultative d'une réunion existante.
- [ ] Suppression réservée aux erreurs et doublons.

## Hors périmètre initial

- [x] Pas de liaison automatique entre une fiche du Répertoire et un compte
      utilisateur.
- [ ] Pas de notifications automatiques aux participants dans la première
      version.
- [ ] Pas de récurrence complexe.
- [ ] Pas de vue calendrier complète.
- [ ] Pas de pièces jointes.
- [ ] Pas de vote, validation ou signature.
- [ ] Pas de gestion de tâches ou d'assignations.
- [ ] Pas de modèles de réunion.
- [ ] Pas de suivi détaillé des présences.
- [ ] Pas d'export PDF du compte rendu.

## Routes et navigation

- [ ] `/vie-interne/reunions` — liste principale.
- [ ] `/vie-interne/reunions/nouveau` — création guidée.
- [ ] `/vie-interne/reunions/[id]` — fiche détaillée.
- [ ] Conserver « Réunions & suivi » comme groupe de navigation et éviter une
      page intermédiaire `/vie-interne/reunions-suivi` sans valeur propre.
- [ ] Ajouter la fonctionnalité au registre canonique des fonctionnalités,
      à la navigation, à la recherche et aux destinations d'audit.
- [ ] Rendre la page visible uniquement lorsque le module et ses permissions
      sont réellement opérationnels.

## Page de liste

- [ ] Hero « Réunions » avec une description courte et le bouton
      « Nouvelle réunion ».
- [ ] Résumé compact, sans grille de grosses cartes statistiques.
- [ ] Recherche par titre et contenu autorisé.
- [ ] Filtre de statut.
- [ ] Filtre de période : à venir, passées ou toutes.
- [ ] Tri par prochaine date, date récente ou dernière modification.
- [ ] Pagination serveur stable.
- [ ] Une ligne entière cliquable sur ordinateur et mobile.
- [ ] Colonnes envisagées :
  - réunion ;
  - date et horaire ;
  - nombre de participants ;
  - statut ;
  - dernière modification ;
  - flèche d'ouverture.
- [ ] États chargement, actualisation, erreur, liste vide et accès refusé.
- [ ] Filtres conservés dans l'URL pour permettre le retour depuis une fiche.

## Création

- [ ] Utiliser une page dédiée plutôt qu'un petit modal.
- [ ] Demander uniquement :
  - titre obligatoire ;
  - courte description facultative ;
  - date et heure de début ;
  - heure de fin facultative ;
  - lieu ou lien en ligne facultatif ;
  - participants facultatifs ;
  - statut initial.
- [ ] Valider la cohérence des dates et horaires côté client et serveur.
- [ ] Utiliser le fuseau horaire configuré pour le site.
- [ ] Détecter les doublons probables de titre et de créneau sans bloquer
      automatiquement la création.
- [ ] Rediriger vers la nouvelle fiche après création.
- [ ] Protéger le formulaire contre une navigation accidentelle.

## Fiche détaillée

- [ ] Reprendre le rail et la largeur utilisés par les fiches du Répertoire et
      des utilisateurs.
- [ ] Bouton de retour placé entre la sidebar et la colonne de contenu.
- [ ] Hero compact avec titre, date, statut et lieu principal.
- [ ] Limiter initialement la fiche à trois onglets :
  - `Réunion` ;
  - `Contenu` ;
  - `Activité`.

### Onglet Réunion

- [ ] Informations principales et planning.
- [ ] Lieu physique, lien en ligne ou combinaison des deux.
- [ ] Participants liés aux fiches du Répertoire.
- [ ] Créateur et dernière modification issus des comptes utilisateurs et de
      l'audit, sans les transformer en participants.
- [ ] Actions contextuelles : modifier, terminer, annuler, restaurer,
      dupliquer ou supprimer selon les droits et le statut.

### Onglet Contenu

- [ ] Bloc « Ordre du jour » avec éléments réordonnables.
- [ ] Statut d'un sujet à décider : à aborder, traité ou reporté.
- [ ] Description facultative par sujet.
- [x] Bouton « Associer un élément » sur chaque sujet.
- [x] Un même sujet peut référencer plusieurs éléments et plusieurs types
      d'éléments.
- [x] Types de liaisons prévus à long terme :
  - fiche du Répertoire ;
  - tournoi ;
  - équipe ;
  - roster ;
  - sponsor ;
  - document ;
  - incident.
- [x] Un membre n'est pas une entité distincte : il s'agit d'une fiche du
      Répertoire dont le statut est « Dans la structure ».
- [x] Ne proposer dans le sélecteur que les types réellement opérationnels et
      autorisés pour l'utilisateur.
- [x] Dans la première version, seule la liaison vers une fiche du Répertoire
      est nécessairement disponible.
- [ ] Activer les tournois, équipes et rosters uniquement après la connexion à
      leur source canonique sur le site public.
- [ ] Afficher les liaisons sous forme de badges ou lignes compactes ouvrant la
      fiche source.
- [ ] Prévoir l'affichage inverse des réunions liées sur les fiches sources,
      uniquement en lecture.
- [ ] Bloc « Décisions prises » avec décision courte et sujet lié facultatif.
- [ ] Notes générales facultatives.
- [ ] Déterminer si les décisions deviennent une table dédiée dès la première
      version ou une structure plus simple préparée pour migration.

### Onglet Activité

- [ ] Réutiliser le langage visuel compact du journal d'activité existant.
- [ ] Afficher les événements concernant uniquement la réunion.
- [ ] Permettre le dépliage des changements utiles sans cartes imbriquées.
- [ ] Lier vers le journal global lorsque l'utilisateur possède la permission
      requise.

## Statuts et cycle de vie

- [ ] Valider les statuts initiaux proposés :
  - `DRAFT` — Brouillon ;
  - `SCHEDULED` — Planifiée ;
  - `COMPLETED` — Terminée ;
  - `CANCELLED` — Annulée.
- [ ] Définir les transitions autorisées entre statuts.
- [ ] Décider si une réunion terminée reste librement modifiable ou affiche un
      avertissement avant correction.
- [ ] Utiliser l'annulation pour une vraie réunion annulée et la suppression
      uniquement pour une erreur ou un doublon.
- [ ] Définir les conditions de restauration d'une réunion annulée.

## Participants

- [x] Une participation référence une `Person`, jamais automatiquement un
      `User`.
- [ ] Décider si une réunion peut exister sans participant.
- [ ] Empêcher deux participations identiques dans une réunion.
- [ ] Décider si un rôle simple est utile :
  - organisateur ;
  - animateur ;
  - secrétaire ;
  - participant.
- [ ] Décider si ces rôles doivent exister dès la première version.
- [ ] Préparer l'affichage futur des réunions liées sur une fiche du Répertoire,
      en lecture seule.
- [ ] Ne jamais recopier les coordonnées ou l'identité de la personne dans la
      réunion.

## Schéma de données envisagé

- [ ] `Meeting`
  - identifiant opaque ;
  - titre et description ;
  - début, fin et fuseau de référence ;
  - statut ;
  - lieu et lien en ligne ;
  - notes générales facultatives ;
  - version optimiste ;
  - dates de création et modification ;
  - identifiants des comptes créateur et dernier modificateur.
- [ ] `MeetingParticipant`
  - réunion ;
  - personne ;
  - rôle facultatif ;
  - position ou ordre d'affichage facultatif ;
  - contrainte d'unicité réunion/personne.
- [ ] `MeetingAgendaItem`
  - réunion ;
  - titre et description ;
  - position stable ;
  - statut du sujet ;
  - version ou date de modification.
- [ ] Représentation persistante des liaisons de sujets :
  - plusieurs liaisons par sujet ;
  - plusieurs liaisons du même type ;
  - cible canonique, sans recopier ses données métier ;
  - libellé historique minimal dans l'audit si la cible est renommée ou
    supprimée ;
  - contrainte empêchant une même liaison d'être ajoutée deux fois.
- [ ] Choisir avant migration une stratégie conservant l'intégrité
      référentielle :
  - tables de liaison typées par famille de cible ; ou
  - registre transversal de références d'entités avec identifiants stables.
- [x] Ne pas utiliser un simple couple libre `targetType`/`targetId` sans
      contrôle d'existence ni intégrité serveur.
- [ ] Préparer l'ajout progressif de nouveaux types sans créer dès maintenant
      des tables vides pour les modules non implémentés.
- [ ] `MeetingDecision`
  - réunion ;
  - sujet d'ordre du jour facultatif ;
  - texte de la décision ;
  - auteur de l'ajout ;
  - date de décision.
- [ ] Prévoir les index de liste par statut, date de début et dernière
      modification.
- [ ] Prévoir la recherche sans charger les participants ni tout le contenu.
- [ ] Ne pas ajouter de table de notification, tâche, document ou récurrence
      avant que ces fonctions soient réellement implémentées.

## Permissions

- [ ] Valider un catalogue volontairement court :
  - `meetings:view` — consulter les réunions ;
  - `meetings:manage` — créer et modifier les réunions et leur contenu ;
  - `meetings:delete` — supprimer une réunion créée par erreur.
- [ ] Ne pas créer de permission par champ, participant, décision ou onglet.
- [x] Associer un élément exige `meetings:manage` et le droit de consulter la
      cible.
- [x] Une permission de modification de réunion ne donne jamais le droit de
      modifier l'élément lié.
- [ ] Filtrer côté serveur la recherche de cibles selon les permissions
      effectives de l'utilisateur.
- [ ] Si une cible liée n'est plus consultable, ne pas divulguer son libellé ou
      ses données à travers la réunion.
- [ ] Ajouter le pôle et la catégorie uniquement avec la page et les API
      opérationnelles.
- [ ] Appliquer les permissions côté serveur sur chaque lecture et mutation.
- [ ] Respecter la règle de délégation : personne ne peut transmettre une
      permission qu'il ne possède pas.
- [ ] Déterminer les valeurs par défaut des rôles sans rendre la permission
      automatiquement trop large.

## API et concurrence

- [ ] API paginée pour la liste.
- [ ] Endpoint de création.
- [ ] Endpoint de lecture d'une fiche.
- [ ] Mutations distinctes et cohérentes pour les informations, participants,
      ordre du jour, décisions et statut.
- [ ] Mutation dédiée ou atomique pour ajouter et retirer les liaisons d'un
      sujet.
- [ ] Vérifier côté serveur l'existence, la disponibilité et l'autorisation de
      chaque cible au moment de l'association.
- [ ] Validation partagée entre client et serveur.
- [ ] Version optimiste obligatoire sur les mutations sensibles aux conflits.
- [ ] Clés d'idempotence pour création, duplication et suppression.
- [ ] Transactions pour les changements touchant plusieurs tables.
- [ ] Réponses d'erreur stables pour validation, conflit, permission et
      ressource absente.

## Audit et historique

- [ ] Événements envisagés :
  - `MEETING_CREATE` ;
  - `MEETING_UPDATE` ;
  - `MEETING_PARTICIPANTS_UPDATE` ;
  - `MEETING_AGENDA_UPDATE` ;
  - `MEETING_AGENDA_LINK_UPDATE` ;
  - `MEETING_DECISION_CREATE` ;
  - `MEETING_STATUS_UPDATE` ;
  - `MEETING_DUPLICATE` ;
  - `MEETING_DELETE`.
- [ ] Enregistrer `poleKey`, `pageKey`, `tabKey` et identifiant de réunion.
- [ ] Conserver un libellé lisible de l'acteur dans le journal.
- [ ] Ne pas exposer les notes ou décisions dans les notifications, toasts ou
      métadonnées d'audit non autorisées.
- [ ] Auditer l'ajout et le retrait d'une liaison avec son type, son identifiant
      stable et un libellé historique minimal autorisé.
- [ ] Décider quels champs utilisent l'historique détaillé consultable avec
      `audit:view_field_history`.
- [ ] Après suppression, conserver uniquement une trace minimale sans contenu
      sensible.

## Toasts, confirmations et navigation

- [ ] Toast de succès après création, modification, changement de statut,
      duplication et suppression.
- [ ] Messages d'erreur utiles sans divulguer de contenu sensible.
- [ ] Confirmation pour annuler une réunion.
- [ ] Confirmation renforcée pour supprimer une réunion.
- [ ] Aucune demande de mot de passe pour une modification ordinaire.
- [ ] Alerte en cas de navigation avec des changements non enregistrés.
- [ ] Restaurer correctement la liste, ses filtres et sa pagination au retour.

## Notifications et rappels futurs

- [x] Une fiche du Répertoire ne permet pas de trouver automatiquement un compte
      à notifier.
- [ ] Ne pas envoyer de notification automatique dans la première version.
- [ ] Étudier plus tard une liste séparée de comptes destinataires, sans créer
      de liaison `Person`/`User`.
- [ ] Prévoir ensuite les notifications de création, changement de date,
      annulation et rappel.
- [ ] Ne jamais inclure les notes ou décisions sensibles dans le corps d'une
      notification.

## Sécurité et confidentialité

- [ ] Valider les longueurs maximales et les URL côté serveur.
- [ ] Nettoyer ou rendre sans danger tout contenu enrichi avant affichage.
- [ ] Ne pas permettre l'accès à une réunion par simple connaissance de son
      identifiant.
- [ ] Ne jamais faire confiance aux permissions ou statuts envoyés par le
      client.
- [ ] Journaliser les changements importants sans dupliquer inutilement les
      contenus sensibles.
- [ ] Définir la politique de conservation avant d'activer une suppression
      automatique éventuelle.

## Performance

- [ ] Liste paginée côté serveur avec sélection de colonnes minimale.
- [ ] Compteurs de participants calculés sans charger leurs fiches complètes.
- [ ] Résoudre les liaisons de sujets par lots afin d'éviter une requête par
      badge.
- [ ] Charger uniquement les types de liaisons visibles et autorisés.
- [ ] Chargement différé du contenu et de l'activité jusqu'à l'ouverture des
      onglets concernés.
- [ ] Index adaptés aux filtres et au tri réellement exposés.
- [ ] Pagination stable et ordre déterministe.
- [ ] Contrôle des requêtes en nombre constant pour la liste.
- [ ] Recherche indexée et bornée.

## Tests

- [ ] Tests unitaires des schémas et transitions de statut.
- [ ] Tests des permissions de lecture, gestion et suppression.
- [ ] Tests d'isolation entre utilisateurs autorisés et non autorisés.
- [ ] Tests de concurrence optimiste et d'idempotence.
- [ ] Tests des participants, doublons et suppression de relation.
- [ ] Tests de réordonnancement de l'ordre du jour.
- [ ] Tests d'ajout, retrait, doublon et pluralité des liaisons d'un sujet.
- [ ] Tests empêchant l'association d'une cible inexistante ou non autorisée.
- [ ] Tests garantissant qu'une liaison ne permet jamais de lire une cible sans
      sa permission.
- [ ] Tests de disparition, renommage ou indisponibilité d'une cible liée.
- [ ] Tests futurs de références publiques pour tournois, équipes et rosters.
- [ ] Tests des décisions et de leur audit.
- [ ] Tests des filtres d'URL, pagination et retour depuis une fiche.
- [ ] Contrats UX desktop et mobile.
- [ ] Tests d'accessibilité des lignes cliquables et formulaires.
- [ ] Tests d'états vide, chargement, erreur et accès refusé.
- [ ] Scénarios E2E uniquement sur une base dédiée et réinitialisable.

## Documentation et déploiement

- [ ] Mettre à jour le registre des fonctionnalités.
- [ ] Mettre à jour la navigation et la feuille de route.
- [ ] Documenter les permissions actives.
- [ ] Documenter les événements d'audit.
- [ ] Ajouter et déployer les migrations.
- [ ] Ajouter la fonctionnalité aux contrôles de readiness si son schéma est
      indispensable à son affichage.
- [ ] Vérifier la visibilité avec plusieurs profils de permissions.
- [ ] Aucun worker permanent requis pour la première version.

## Questions à trancher avant le schéma

- [ ] Les quatre statuts proposés sont-ils suffisants ?
- [ ] Une réunion peut-elle être créée sans participant ?
- [ ] Faut-il des rôles de participants dès la première version ?
- [ ] Le lieu doit-il accepter simultanément une adresse et un lien en ligne ?
- [ ] L'ordre du jour doit-il permettre les statuts « Traité » et « Reporté » ?
- [ ] Quelle stratégie d'intégrité utiliser pour les liaisons de sujets :
      tables typées ou registre transversal de références ?
- [ ] Une liaison devenue inaccessible doit-elle être totalement masquée ou
      remplacée par « Élément restreint » ?
- [ ] Les sponsors, documents et incidents doivent-ils être activés dès leur
      mise en ligne ou seulement après validation page par page ?
- [ ] Les décisions doivent-elles être structurées dès la première version ?
- [ ] Les notes générales sont-elles nécessaires en plus de l'ordre du jour et
      des décisions ?
- [ ] Une réunion terminée peut-elle être modifiée normalement ?
- [ ] Qui peut supprimer une réunion et dans quels statuts ?
- [ ] La duplication doit-elle faire partie de la première version ?
