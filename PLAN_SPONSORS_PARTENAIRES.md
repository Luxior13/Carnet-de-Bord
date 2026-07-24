# Plan — Sponsors & partenaires

Statut : socle V1 implémenté le 24 juillet 2026 et migration du fil appliquée à
la base actuellement configurée. Les migrations sont versionnées dans le dépôt
et doivent être appliquées par le flux de déploiement avant d'activer la version
correspondante sur tout autre environnement. Les extensions explicitement
marquées « plus tard » dans ce document restent volontairement hors de la
première version.

Ce document évolue avec les décisions prises pendant la discussion. Une case
cochée représente une orientation déjà retenue ; une case vide reste à décider
ou à implémenter.

## État de l'implémentation V1

- [x] Schéma, contraintes, index et migration PostgreSQL.
- [x] Permissions `partners:view`, `partners:manage` et `partners:delete`.
- [x] Registre des fonctionnalités, navigation et ancienne route redirigée.
- [x] Liste paginée avec recherche, filtres et tri.
- [x] Création dédiée avec détection des doublons probables.
- [x] Fiche à rail : informations, contacts, suivi et activité.
- [x] Statuts et périodes successives conservés sur une fiche unique.
- [x] Coordonnées générales et contacts liés au Répertoire sans recopier leur
      identité.
- [x] Fil métier paginé réunissant notes, changements de relation et actions,
      avec projection séparée des actions encore ouvertes.
- [x] Suppression limitée aux fiches vides, avec tombstone d'idempotence.
- [x] Audit, toasts, réponses privées `no-store` et readiness.
- [x] Sauvegarde/restauration au format 7 et suppression cohérente d'une fiche
      du Répertoire liée.
- [x] Tests de fondation, permissions, navigation, contrats et sauvegarde.
- [ ] Extensions futures : contrats, documents, paiements, notifications,
      fusion manuelle et affichage inverse dans le Répertoire.

## Objectif

- [x] Centraliser les organisations qui entretiennent ou pourraient entretenir
      une relation avec la structure.
- [x] Gérer sponsors et partenaires dans un seul module.
- [x] Utiliser « Partenaires » comme nom général du module et de la route.
- [x] Lier les contacts à des fiches du Répertoire sans créer de statut manuel
      « contact sponsor » sur une personne.
- [x] Permettre de suivre simplement la relation, ses contacts et ses
      informations utiles sans dupliquer les contrats ou les opérations
      financières.

## Décisions déjà retenues

- [x] Routes canoniques prévues :
  - `/bureau-juridique/partenaires` ;
  - `/bureau-juridique/partenaires/nouveau` ;
  - `/bureau-juridique/partenaires/[id]`.
- [x] Une même organisation peut être sponsor, partenaire ou cumuler les deux
      catégories.
- [x] Statuts initiaux :
  - `PROSPECT` — Prospect ;
  - `DISCUSSION` — En discussion ;
  - `ACTIVE` — Actif ;
  - `ENDED` — Terminé ;
  - `CLOSED` — Sans suite.
- [x] Une relation terminée utilise le statut « Terminé » et n'est pas
      supprimée.
- [x] La suppression sert uniquement aux erreurs et doublons.
- [x] Les contacts sont sélectionnés depuis le Répertoire.
- [x] Aucun responsable permanent n'est attribué à une fiche partenaire dans
      la première version.
- [x] Tous les utilisateurs possédant `partners:manage` peuvent poursuivre le
      suivi.
- [x] Une organisation conserve la même fiche lorsqu'une relation se termine
      puis reprend plusieurs mois ou années plus tard.
- [x] Chaque période de relation est conservée séparément : une reprise ne
      remplace jamais les anciennes dates.
- [x] Les changements de nom, de contacts ou de comptes utilisateurs ne
      doivent pas casser l'historique métier.
- [x] Les contrats, montants, factures et documents restent gérés dans leurs
      futurs modules respectifs.
- [x] Aucun worker permanent n'est nécessaire pour la première version.

## Périmètre de la première version

- [ ] Liste paginée des sponsors et partenaires.
- [ ] Création d'une organisation.
- [ ] Modification des informations principales.
- [ ] Gestion des catégories et du statut.
- [ ] Historique des périodes de relation, y compris une reprise plusieurs
      années après une relation terminée.
- [ ] Gestion des contacts liés au Répertoire.
- [ ] Contact principal facultatif.
- [ ] Coordonnées générales libellées de l'organisation.
- [x] Journal interne de suivi composé d'entrées chronologiques.
- [x] Action facultative à prévoir sur une entrée de suivi.
- [ ] Activité contextuelle.
- [ ] Suppression contrôlée d'une erreur ou d'un doublon.
- [ ] Affichage inverse des organisations liées sur une fiche du Répertoire,
      uniquement en lecture.

## Hors périmètre initial

- [x] Pas de gestion de contrat dans ce module.
- [x] Pas de montant de sponsoring ni d'opération financière.
- [x] Pas de facture, devis ou justificatif.
- [x] Pas de document ou pièce jointe.
- [x] Pas de rappel ou tâche automatique.
- [x] Pas de synchronisation avec le site public.
- [x] Pas d'envoi automatique d'email.
- [x] Pas de portail accessible au sponsor ou partenaire.
- [x] Pas de logo téléversé dans la première version.
- [x] Pas de permission distincte pour les notes, contacts ou coordonnées.
- [x] Pas d'export métier des partenaires dans la première version.
- [x] Pas de fusion complexe invisible : une éventuelle fusion de doublons est
      une opération explicite, transactionnelle et auditée.

## Garanties d'architecture à long terme

- [x] L'identifiant opaque de l'organisation est stable pendant toute sa vie,
      même après un changement de nom, une fin de relation ou une reprise.
- [x] Une fiche représente l'organisation ; les périodes, contrats, contacts
      et suivis représentent des faits datés qui ne sont jamais écrasés pour
      simuler l'état courant.
- [x] Les futurs contrats peuvent tous référencer la même organisation et,
      facultativement, la période de relation correspondante.
- [x] Le statut courant reste une décision métier explicite ; il n'est jamais
      déduit automatiquement d'un contrat, d'une date ou d'une action.
- [x] Les références futures utilisent l'identifiant canonique et non le nom,
      l'email ou le domaine de l'organisation.
- [x] Toute nouvelle table du module doit être ajoutée au format signé de
      sauvegarde/restauration et à une politique de conservation.
- [x] Les données métier sont conservées sans expiration automatique tant que
      la fiche existe ; les règles générales de rétention continuent de
      s'appliquer aux audits techniques et notifications.
- [x] Aucune note de suivi ni coordonnée privée n'est indexée dans une
      recherche globale, un log technique ou une notification.
- [x] Le module doit pouvoir être masqué seul par la readiness si son schéma ou
      ses secrets requis manquent, sans rendre tout le site indisponible.

## Navigation et registre

- [ ] Ajouter le module au registre canonique des fonctionnalités.
- [ ] Ajouter le pôle « Bureau & juridique » aux pôles réellement disponibles.
- [ ] Remplacer la destination planifiée
      `/bureau-juridique/sponsors` par la route canonique
      `/bureau-juridique/partenaires`.
- [ ] Décider si l'ancienne route planifiée reçoit une redirection de
      compatibilité ou disparaît avant sa mise en production.
- [ ] Ajouter la page à la navigation, à la feuille de route, à la recherche
      globale et aux destinations d'audit.
- [ ] La recherche globale n'indexe que le nom, le domaine public, les
      catégories et le statut ; elle exige `partners:view`.
- [ ] Les noms de contacts ne deviennent recherchables que dans le contexte du
      module et uniquement avec `persons:view`.
- [ ] Ne rendre le pôle et la page visibles qu'avec le schéma, les API et les
      permissions opérationnels.
- [ ] Utiliser le ton visuel du pôle « Bureau & juridique ».

## Page de liste

- [ ] Hero « Sponsors & partenaires ».
- [ ] Description courte centrée sur les relations et contacts.
- [ ] Bouton « Nouveau partenaire ».
- [ ] Résumé compact, sans grille de grosses cartes statistiques.
- [ ] Recherche par nom, site, email général ou contact autorisé.
- [ ] Filtre de catégorie :
  - tous ;
  - sponsors ;
  - partenaires.
- [ ] Filtre de statut.
- [ ] Tri :
  - nom ;
  - dernière modification ;
  - début de relation ;
  - prochaine échéance uniquement lorsqu'elle existera réellement.
- [ ] Une ligne entière cliquable sur ordinateur et mobile.
- [ ] Colonnes envisagées :
  - organisation ;
  - catégories ;
  - statut ;
  - contact principal ;
  - prochaine étape utile si elle existe ;
  - dernière modification ;
  - flèche d'ouverture.
- [ ] Sans `persons:view`, ne montrer ni nom, ni coordonnées, ni résultat de
      recherche provenant d'un contact ; utiliser au besoin « Contact
      restreint » sans fuite d'identité.
- [ ] Pagination serveur stable.
- [ ] Filtres conservés dans l'URL.
- [ ] États chargement, actualisation, erreur, liste vide et accès refusé.

## Création

- [ ] Utiliser une page dédiée plutôt qu'un petit modal.
- [ ] Demander uniquement les informations essentielles :
  - nom obligatoire ;
  - une catégorie au minimum ;
  - statut initial ;
  - description courte facultative ;
  - site internet facultatif ;
  - premier email et téléphone généraux facultatifs ;
  - dates de la première période facultatives ;
  - premier contact facultatif.
- [ ] N'afficher les dates de première période que pour un état impliquant une
      relation réelle ; un Prospect ou un dossier Sans suite ne crée pas de
      période vide.
- [ ] Détecter les doublons probables par nom normalisé, domaine internet et
      coordonnées sans bloquer automatiquement la création.
- [ ] La détection de doublon est un avertissement : ni le nom ni le domaine ne
      sont globalement uniques, car deux entités légitimes peuvent les
      partager.
- [ ] Valider les URL, emails, téléphones et dates côté client et serveur.
- [ ] Rediriger vers la nouvelle fiche après création.
- [ ] Protéger le formulaire contre une navigation accidentelle.

## Fiche détaillée

- [ ] Reprendre la largeur, le rail et le bouton de retour utilisés par les
      fiches du Répertoire et des utilisateurs.
- [ ] Hero compact avec nom, catégories, statut et site principal.
- [ ] Actions contextuelles dans le hero ou la section concernée.
- [x] Quatre onglets initiaux :
  - `Informations` ;
  - `Contacts` ;
  - `Suivi` ;
  - `Activité`.

### Onglet Informations

- [ ] Nom de l'organisation.
- [ ] Catégories sponsor et partenaire.
- [ ] Description courte.
- [ ] Site internet principal.
- [ ] Plusieurs emails et téléphones généraux facultatifs, avec libellé court
      et un principal par type.
- [ ] Période en cours et périodes terminées, avec dates facultatives.
- [ ] Afficher la chronologie des périodes sans la confondre avec le statut
      courant, qui reste géré dans Suivi et visible dans l'en-tête.
- [ ] Créateur et dernière modification issus des comptes utilisateurs et de
      l'audit.
- [ ] Historique de champ accessible selon la permission d'audit existante.

### Onglet Contacts

- [ ] Recherche et sélection d'une fiche du Répertoire.
- [ ] Plusieurs contacts possibles.
- [ ] Libellé court par contact : direction, commercial, communication,
      technique ou texte libre court.
- [ ] Un seul contact principal par organisation.
- [ ] Une liaison possède une date de début, une date de fin facultative et un
      marqueur technique de clôture indépendant ; l'état courant ne dépend pas
      d'une date métier qui peut être inconnue.
- [ ] « Retirer » un ancien contact termine la liaison au lieu d'effacer son
      existence ; une liaison créée par erreur peut seule être supprimée.
- [ ] Une même personne peut être réactivée plus tard sans écraser sa liaison
      historique.
- [ ] Ouvrir la fiche du contact sans dupliquer son identité ou ses
      coordonnées.
- [ ] Afficher uniquement les informations du Répertoire que l'utilisateur a
      le droit de consulter.
- [ ] Ajouter et retirer une liaison sans modifier la fiche source.
- [ ] Si la fiche du Répertoire est supprimée, conserver la liaison métier
      anonymisée sous « Contact supprimé », sans copie de nom ou de coordonnée.
- [ ] Prévoir l'affichage inverse du partenaire sur la fiche du contact.

### Onglet Suivi

- [x] Afficher le statut courant, la période utile et les seules commandes
      métier possibles ; aucun statut interdit n'est présenté en grisé.
- [x] Formuler les transitions comme des actions compréhensibles :
      commencer ou reprendre les échanges, activer, terminer ou classer sans
      suite.
- [x] Ouvrir un modal uniquement pour activer ou terminer une période, ou pour
      corriger les dates et le motif de la période courante ou de la dernière
      période terminée, avec audit distinct.
- [x] Lors d'une fin, afficher le début existant en lecture seule ; sa
      correction reste une action explicite séparée.
- [x] Aucune « situation actuelle » ne doit être saisie séparément : la
      chronologie suffit et évite toute double saisie ou information périmée.
- [x] Le suivi ressemble visuellement à une suite de messages internes, mais
      aucun message n'est envoyé au partenaire.
- [x] Un bouton « Ajouter une note » ouvre un modal pour écrire ce qui a été
      fait, demandé ou appris et prévoir facultativement une action.
- [x] Présenter un seul « Fil de suivi », sans carte « Situation en bref » ni
      titre artificiel « Historique du suivi ».
- [x] Réunir dans ce fil les notes et les événements métier persistants :
      création, changement de statut, correction de période, réalisation et
      réouverture d'une action.
- [x] Une intention utilisateur produit une seule ligne métier : une activation
      avec ouverture de période n'est jamais affichée comme deux opérations.
- [x] Chronologie affichée de l'entrée la plus récente à la plus ancienne,
      regroupée par jour.
- [x] Chaque entrée affiche :
  - auteur ;
  - date et heure ;
  - texte ;
  - contact concerné facultatif ;
  - date de dernière modification si elle a été corrigée.
- [x] Les dates cibles et périodes sont des dates civiles ; les créations,
      corrections et réalisations sont des horodatages conservés en UTC puis
      affichés dans le fuseau de l'utilisateur.
- [x] Une entrée peut contenir une action facultative à prévoir avec :
  - description courte ;
  - date cible facultative ;
  - état à faire ou fait ;
  - auteur et date de réalisation.
- [x] Les actions encore à prévoir sont résumées en haut de l'onglet comme une
      projection du fil, avec échéance, retard et contexte de la note source.
- [x] Les actions ouvertes sont chargées indépendamment de la limite des suivis
      récents afin qu'une ancienne action ne disparaisse jamais.
- [x] Une action affiche automatiquement le compte qui l'a créée et, lorsqu'elle
      est terminée, le compte qui l'a réalisée.
- [x] Aucune action et aucune fiche ne sont assignées durablement à un
      utilisateur dans la première version.
- [x] Tous les utilisateurs avec `partners:manage` peuvent ajouter un suivi ou
      terminer une action ouverte.
- [x] Marquer une action comme faite ne supprime ni l'entrée ni son historique.
- [x] Une nouvelle entrée peut être ajoutée après la réalisation pour expliquer
      le résultat de l'action.
- [x] Ce module n'est pas un chat :
  - aucune réponse imbriquée ;
  - aucun envoi externe ;
  - aucun statut lu ou non lu ;
  - aucune mention complexe.
- [x] Utiliser un bouton « Ajouter une note » ouvrant un modal compact, avec
      les options d'action facultative dans le même formulaire.
- [x] Paginer le fil par curseur stable et proposer « Afficher les suivis
      précédents » au lieu de masquer les entrées dépassant une limite fixe.
- [x] Refuser la suppression d'une note qui porte une action afin qu'une
      réalisation ou une réouverture ne perde jamais son contexte métier.
- [ ] Autoriser la correction d'une entrée et la suppression d'une entrée
      sans action créée par erreur depuis l'interface, avec confirmation,
      version propre à l'entrée et audit.
- [ ] Une entrée supprimée disparaît de la chronologie, mais l'audit minimal
      conserve l'opération sans recopier son texte.
- [x] Ne pas anticiper les tâches, rappels, livrables, contrats ou paiements
      avant leurs modules respectifs.
- [ ] Prévoir plus tard des liens en lecture seule vers :
  - contrats ;
  - documents ;
  - opérations financières ;
  - rappels ;
  - réunions ;
  - actualités internes.

### Onglet Activité

- [ ] Réutiliser le langage visuel compact du journal d'activité existant.
- [ ] Afficher uniquement les événements concernant l'organisation.
- [ ] Permettre le dépliage des changements utiles sans cartes imbriquées.
- [ ] Lier vers le journal global lorsque l'utilisateur possède
      `audit:view`.
- [ ] Respecter `audit:view_field_history` pour l'historique détaillé d'un
      champ.

## Catégories

- [x] Une organisation peut posséder plusieurs catégories.
- [x] Catégories initiales :
  - `SPONSOR` — Sponsor ;
  - `PARTNER` — Partenaire.
- [x] Utiliser une table de liaison de catégories contrainte par le catalogue
      canonique ; cela permet plusieurs catégories sans champ tableau fragile.
- [ ] Empêcher les catégories inconnues ou vides.
- [ ] Ne pas créer immédiatement fournisseur, prestataire, institution ou
      organisateur tant qu'un besoin réel ne les justifie pas.

## Statuts et cycle de vie

- [x] `PROSPECT`, `DISCUSSION`, `ACTIVE`, `ENDED` et `CLOSED`.
- [x] « Terminé » signifie qu'une relation réelle a existé puis s'est arrêtée.
- [x] « Sans suite » signifie que la prospection ou la discussion n'a jamais
      abouti à une relation active.
- [x] Cycle principal :
  - `PROSPECT` vers `DISCUSSION` ;
  - `DISCUSSION` vers `ACTIVE` ou `CLOSED` ;
  - `ACTIVE` vers `ENDED`.
- [x] Un prospect peut passer directement à « Sans suite ».
- [x] Une fiche « Sans suite » ou « Terminée » peut être réouverte en
      repassant par « En discussion ».
- [x] Le passage à « Actif » ouvre une nouvelle période si aucune période n'est
      ouverte ; le passage à « Terminé » clôt la période courante.
- [x] Ces deux changements sont confirmés dans la même mutation
      transactionnelle : aucun état partiel entre statut et période.
- [x] Réouvrir une fiche en « En discussion » ne crée pas encore une nouvelle
      période active.
- [ ] Définir les éventuelles transitions exceptionnelles autorisées côté
      serveur sans rendre le cycle inutilement rigide.
- [ ] Vérifier la cohérence entre statut et périodes de relation.
- [x] Aucun contrat et aucune date ne modifie automatiquement le statut.
- [ ] Afficher une suggestion non bloquante lorsqu'un contrat ou une date de
      fin semble incohérent avec le statut actuel.
- [ ] Ne pas utiliser un statut « Archivé » comme substitut à « Terminé ».
- [ ] Ne pas supprimer automatiquement les organisations terminées.

## Périodes et reprises de relation

- [x] Une organisation possède zéro, une ou plusieurs périodes de relation.
- [x] Une seule période peut être ouverte à la fois, selon un marqueur
      technique de clôture indépendant des dates métier facultatives.
- [x] Une période terminée devient immuable hors correction explicitement
      auditée.
- [x] Une reprise après plusieurs années crée une nouvelle période sur la même
      fiche.
- [x] Les périodes ne remplacent pas les contrats : elles résument uniquement
      l'existence de la relation.
- [ ] Afficher une chronologie compacte des périodes dans Informations.
- [ ] Proposer la date du jour lors d'une activation ou d'une fin, tout en
      permettant de saisir la date métier réelle.
- [ ] Autoriser une date inconnue sans fabriquer une précision fausse.

## Contacts et Répertoire

- [x] Un contact référence une `Person`, jamais automatiquement un `User`.
- [x] La relation avec l'organisation ne modifie pas le statut de la personne
      dans la structure.
- [x] Une personne peut être contact de plusieurs organisations.
- [ ] Empêcher deux liaisons actives identiques entre la même personne et la
      même organisation.
- [ ] Autoriser un libellé libre court avec suggestions, sans catalogue de
      rôles à administrer.
- [x] Lorsqu'une fiche du Répertoire est supprimée, passer la référence à
      `null`, clôturer la liaison, retirer son statut principal, conserver la
      liaison anonymisée et ne révéler aucune ancienne donnée personnelle.
- [ ] Ne jamais recopier prénom, nom, pseudo, email ou téléphone dans la table
      de liaison.
- [ ] Conserver dans l'audit uniquement l'identifiant de liaison et un libellé
      neutre autorisé, jamais une ancienne coordonnée.
- [ ] Si un contact est inaccessible par permission, appliquer le même
      masquage dans la liste, la fiche, le suivi, l'activité et les API.

## Schéma de données envisagé

- [ ] `PartnerOrganization`
  - identifiant opaque ;
  - nom et nom normalisé ;
  - description courte ;
  - statut ;
  - site et domaine normalisé ;
  - version optimiste ;
  - dates de création et modification ;
  - comptes créateur et dernier modificateur facultatifs pour survivre à la
    suppression future d'un compte.
- [x] `PartnerOrganizationCategory`
  - organisation ;
  - catégorie canonique ;
  - unicité du couple.
- [ ] `PartnerOrganizationContactChannel`
  - organisation ;
  - type email ou téléphone ;
  - valeur et valeur normalisée ;
  - libellé court ;
  - principal ;
  - version et dates techniques.
- [ ] `PartnerRelationshipPeriod`
  - organisation ;
  - dates métier de début et de fin facultatives ;
  - horodatage technique de clôture facultatif ;
  - motif ou note courte facultative de fin/réouverture ;
  - version et dates techniques ;
  - contrainte d'une seule période ouverte.
- [ ] `PartnerContact`
  - organisation ;
  - personne facultative après suppression de la fiche source ;
  - libellé court ;
  - contact principal ;
  - dates métier de début et de fin facultatives ;
  - horodatage technique de clôture facultatif ;
  - dates de création et modification ;
  - contrainte d'unicité adaptée.
- [x] `PartnerFollowUpEntry`
  - organisation ;
  - texte du suivi ;
  - contact lié facultatif ;
  - date de l'événement ou de l'échange ;
  - compte créateur facultatif et snapshot lisible de son identité interne ;
  - dates de création et modification ;
  - champ de version incrémenté lors des corrections.
- [x] `PartnerFollowUpAction`, facultative et liée à une entrée :
  - description de l'action ;
  - date cible facultative ;
  - date de réalisation facultative ;
  - compte ayant marqué l'action comme faite et snapshot lisible ;
  - version optimiste propre à l'action.
- [x] Utiliser une table enfant `PartnerFollowUpAction` avec une contrainte
      d'une action par entrée dans la première version ; cette contrainte
      pourra évoluer sans réécrire les entrées.
- [x] Une seule action facultative par entrée suffit pour la première version.
- [x] Aucun champ `responsibleUserId`, équipe commerciale ou groupe
      d'assignation dans la première version.
- [x] `PartnerTimelineEvent`, journal métier permanent et append-only tant que
      la fiche existe :
  - type d'événement et version de format ;
  - date métier et date d'enregistrement ;
  - acteur facultatif avec snapshots lisibles ;
  - identifiant d'opération unique ;
  - payload structuré ;
  - références facultatives vers période, action et note, mises à `null` si
    leur source disparaît sans effacer le fait métier ;
  - index chronologique par organisation.
- [x] Ne jamais reconstruire le fil métier depuis `AuditLog`, dont la durée de
      conservation est configurable et volontairement limitée.
- [ ] Déduire la dernière activité et la prochaine action par requête bornée,
      sans les recopier dans plusieurs tables.
- [x] Lier une entrée à `PartnerContact` plutôt que directement à `Person`,
      afin qu'une suppression du Répertoire ne casse pas la chronologie.
- [x] Utiliser des relations utilisateur facultatives avec snapshots lisibles
      pour les notes, réalisations d'action et événements métier afin qu'une
      anonymisation future de compte ne détruise pas leur attribution.
- [ ] Index pour nom, nom normalisé, statut, catégorie, domaine, période,
      prochaine action et dernière modification.
- [ ] Index partiel garantissant un seul contact principal par organisation.
- [ ] Index partiel garantissant une seule période ouverte par organisation.
- [x] Index composite des actions par état, date cible et identifiant pour
      ordonner les prochaines étapes sans parcourir toute la chronologie.
- [ ] Contraintes de cohérence des dates et coordonnées normalisées.
- [x] Version optimiste sur la fiche pour les mutations couplées et version
      propre à l'action pour sa réalisation ou sa réouverture.
- [ ] Faire utiliser la version propre de l'entrée lors de sa future correction
      ou suppression depuis l'interface.
- [x] Longueurs et types SQL bornés ; texte de suivi en texte brut, sans HTML
      ni contenu riche dans la première version.
- [ ] `PartnerOrganizationDeletionTombstone` minimal pour l'idempotence d'une
      suppression autorisée.
- [ ] `PartnerOrganizationMergeRedirect` minimal avant d'activer la fusion,
      afin qu'un ancien identifiant mène encore à la fiche canonique.
- [ ] Ne pas créer de tables de contrat, document, paiement, rappel ou tâche
      avant leurs fonctionnalités.

## Permissions

- [x] Catalogue volontairement court :
  - `partners:view` — consulter la liste et les fiches ;
  - `partners:manage` — créer et modifier les organisations, contacts et
    suivi ;
  - `partners:delete` — supprimer une erreur ou un doublon.
- [x] Aucune permission par champ, contact, catégorie ou onglet.
- [x] Aucun droit spécial d'assignation ou de responsabilité.
- [ ] Ajouter le pôle et la catégorie de permissions uniquement avec les pages
      et API opérationnelles.
- [ ] Exiger `partners:manage` et `persons:view` pour rechercher et associer un
      contact.
- [ ] Exiger `partners:view` et `audit:view_field_history` pour l'historique
      détaillé d'un champ partenaire.
- [ ] `partners:view` sans `persons:view` permet de consulter l'organisation,
      mais masque entièrement l'identité et les coordonnées de ses contacts.
- [ ] `persons:view` sans `partners:view` ne révèle aucune liaison partenaire
      sur la fiche du Répertoire.
- [ ] Une permission de gestion des partenaires ne donne jamais le droit de
      modifier une fiche du Répertoire.
- [ ] Appliquer toutes les permissions côté serveur.
- [ ] Respecter les règles existantes de délégation et de hiérarchie.
- [ ] Définir les valeurs par défaut des rôles sans donner un accès
      automatiquement trop large.

## API et concurrence

- [ ] API paginée pour la liste.
- [ ] Endpoint de création.
- [ ] Endpoint de lecture d'une fiche.
- [x] Mutations distinctes pour informations, contacts, statut et entrées de
      suivi.
- [x] Mutation transactionnelle pour ouvrir ou clôturer une période avec le
      changement de statut correspondant.
- [x] Mutations dédiées pour créer, corriger et supprimer une entrée ; la
      suppression est refusée si cette entrée porte une action.
- [x] Mutation dédiée pour marquer une action prévue comme faite ou à nouveau
      ouverte.
- [x] Endpoint paginé dédié au fil, protégé par `partners:view`, fusionnant les
      notes et événements métier sans dupliquer une même opération.
- [x] Charger les actions ouvertes indépendamment de la page courante du fil,
      uniquement avec la première page pour ne pas répéter cette requête lors
      du chargement des suivis précédents.
- [x] La création d'une note ne dépend pas de la version globale de la fiche ;
      la réalisation d'une action utilise la version propre de cette action.
- [ ] Endpoint de recherche de contacts protégé par `persons:view`.
- [ ] Validation partagée entre client et serveur.
- [ ] Faire reposer aussi la correction et la suppression d'une note sur la
      version propre de cette note plutôt que sur la version globale de la
      fiche.
- [ ] Clés d'idempotence pour création et suppression.
- [x] Transactions pour les changements de statut, de période ou d'action qui
      créent aussi un événement métier.
- [ ] Vérification serveur de l'existence et de l'autorisation d'une personne
      avant association.
- [ ] Lors de la suppression d'une fiche du Répertoire, anonymiser et clôturer
      ses liaisons partenaires dans la même transaction que la suppression de
      la personne.
- [ ] Réponses d'erreur stables pour validation, conflit, permission, doublon
      et ressource absente.
- [ ] Limiter la fréquence et la taille des recherches et mutations selon les
      garde-fous communs de la plateforme.

## Suppression

- [x] Le statut « Terminé » remplace la suppression d'une relation réellement
      terminée.
- [ ] Réserver la suppression aux fiches créées par erreur et encore dépourvues
      d'historique métier.
- [ ] Confirmation explicite avec le nom de l'organisation.
- [ ] Vérifier la version optimiste et une clé d'idempotence.
- [ ] Refuser la suppression s'il existe une période réelle, un suivi, un
      contrat, un paiement, un document ou toute autre dépendance métier.
- [ ] Supprimer les liaisons de contacts dans la même transaction.
- [ ] Conserver un tombstone minimal si nécessaire pour l'idempotence.
- [ ] Purger les valeurs sensibles de l'historique détaillé selon la politique
      existante.
- [ ] Conserver un événement final sans coordonnées ni notes internes.

## Doublons, fusion et renommage

- [x] Un changement de nom modifie la fiche existante ; il ne crée pas une
      nouvelle organisation.
- [ ] Conserver plus tard des alias ou anciens noms recherchables si un vrai
      besoin de renommage apparaît.
- [ ] Avant l'arrivée des contrats, paiements ou documents, prévoir une fusion
      transactionnelle des doublons possédant déjà un historique.
- [ ] La fusion conserve un identifiant canonique, réaffecte les périodes,
      contacts, suivis et futures dépendances, puis laisse une redirection
      technique depuis l'ancien identifiant.
- [ ] Détecter et résoudre les collisions de catégorie, contact principal et
      période ouverte avant validation d'une fusion.
- [ ] Protéger la fusion par `partners:delete`, confirmation nominative,
      idempotence, version optimiste et événement d'audit dédié.
- [ ] Ne jamais fusionner automatiquement sur la seule base du nom, du domaine
      ou d'une coordonnée.

## Audit et historique

- [x] Séparer le fil métier permanent du journal technique soumis à rétention.
- [x] Créer l'événement métier dans la même transaction que le statut, la
      période ou l'action qu'il décrit.
- [x] Conserver les notes complètes uniquement dans les données métier ; le
      journal global ne reçoit jamais leur texte.

- [x] Événements techniques actifs :
  - `PARTNER_CREATE` ;
  - `PARTNER_UPDATE` ;
  - `PARTNER_STATUS_UPDATE` ;
  - `PARTNER_PERIOD_CREATE` ;
  - `PARTNER_PERIOD_UPDATE` ;
  - `PARTNER_CONTACTS_UPDATE` ;
  - `PARTNER_FOLLOW_UP_CREATE` ;
  - `PARTNER_FOLLOW_UP_UPDATE` ;
  - `PARTNER_FOLLOW_UP_DELETE` ;
  - `PARTNER_FOLLOW_UP_COMPLETE` ;
  - `PARTNER_DELETE`.
- [ ] Activer `PARTNER_MERGE` uniquement avec la future fusion manuelle.
- [x] Enregistrer `poleKey`, `pageKey`, `tabKey` et identifiant
      d'organisation.
- [x] Auditer les catégories, le statut, les dates et les liaisons de contacts.
- [x] Ne pas inclure les notes ou coordonnées dans les toasts, notifications
      ou métadonnées non autorisées.
- [x] L'activité indique qu'une entrée a été créée, corrigée, supprimée ou
      terminée sans recopier son texte complet dans le journal global.
- [x] Conserver un libellé lisible de l'acteur dans l'audit technique, les
      notes, les réalisations d'action et les événements métier.
- [ ] Ajouter l'historique de champs uniquement aux informations pour lesquelles
      il apporte une vraie valeur.
- [ ] Chiffrer les anciennes et nouvelles valeurs sensibles ajoutées à
      l'historique de champs avec le mécanisme AES-256-GCM existant.
- [ ] Les logs techniques structurés conservent identifiants d'opération,
      résultat et durée, mais jamais texte de suivi ni coordonnées.

## Toasts, confirmations et navigation

- [ ] Toasts de succès après création, modification, changement de statut,
      gestion de contact et suppression.
- [ ] Actions rapides contextuelles :
  - commencer les discussions ;
  - activer la relation ;
  - terminer la relation ;
  - classer sans suite ;
  - réouvrir la relation.
- [ ] Messages d'erreur utiles sans divulguer les notes ou coordonnées.
- [ ] Confirmation avant passage au statut « Terminé » si nécessaire.
- [ ] Confirmation renforcée avant suppression.
- [ ] Aucune demande de mot de passe pour une modification ordinaire.
- [ ] Alerte de navigation en cas de changements non enregistrés.
- [ ] Restaurer filtres, tri et pagination au retour depuis une fiche.

## Notifications et liaisons futures

- [x] Aucun envoi automatique dans la première version.
- [ ] Prévoir plus tard des notifications aux comptes utilisateurs explicitement
      choisis, sans liaison `Person`/`User`.
- [x] Une date cible de suivi n'envoie aucune notification dans la première
      version.
- [x] Aucun compte n'est destinataire par défaut au titre d'un rôle de
      responsable.
- [ ] Prévoir les rappels de renouvellement uniquement avec le futur module de
      rappels.
- [ ] Ne jamais inclure de note interne dans une notification.
- [ ] Ajouter progressivement les vues en lecture seule vers contrats,
      documents et finances lorsque leurs permissions deviennent actives.
- [ ] Ne jamais déduire un montant ou un contrat depuis un simple statut de
      partenaire.

## Sécurité et confidentialité

- [ ] Contrôler authentification et permission sur chaque lecture et mutation.
- [ ] Valider et normaliser URL, domaine, email et téléphone côté serveur.
- [ ] Accepter uniquement les protocoles web autorisés pour les liens et ne
      jamais récupérer une URL partenaire côté serveur sans protection SSRF.
- [ ] Normaliser domaines internationaux, casse, espaces, emails et téléphones
      de façon déterministe, tout en conservant la valeur d'affichage.
- [ ] Ne pas permettre l'accès par simple connaissance de l'identifiant.
- [ ] Ne jamais faire confiance aux catégories, statuts ou relations envoyés
      par le client.
- [ ] Échapper ou assainir les notes avant affichage.
- [ ] Ne pas exposer un contact devenu inaccessible à travers une fiche
      partenaire.
- [ ] Garder les notes et coordonnées hors des journaux techniques.
- [ ] Définir les longueurs maximales de tous les champs.
- [ ] Réponses privées en `no-store` et absence de données partenaires dans les
      caches publics ou télémétries client.

## Performance

- [x] Pagination serveur du fil avec ordre déterministe, curseur signé et
      photographie stable pendant le chargement des pages suivantes.
- [ ] Sélection minimale pour la liste.
- [ ] Compteurs et contact principal chargés sans récupérer toutes les fiches.
- [x] Chargement différé du fil uniquement à l'ouverture de l'onglet Suivi.
- [x] Pagination et chargement progressif des anciennes entrées de suivi.
- [x] Charger séparément toutes les actions encore à prévoir lors de la
      première page, afin qu'une action ancienne ne soit jamais masquée.
- [ ] Borner ou paginer la projection des actions ouvertes si un volume réel
      rend sa requête exhaustive mesurablement coûteuse.
- [ ] Calculer la prochaine étape affichée dans la liste sans charger toute la
      chronologie.
- [ ] Recherche indexée, normalisée et bornée.
- [ ] Recherche insensible à la casse et aux accents, avec préfixe et trigramme
      sur les champs réellement recherchés.
- [ ] Résolution des contacts par lots pour éviter une requête par ligne.
- [ ] Index adaptés aux filtres réellement exposés.
- [ ] Contrôle des plans PostgreSQL sur une base dédiée.
- [ ] Mesurer séparément liste, recherche par contact, actions ouvertes et
      chronologie volumineuse ; aucun comptage total obligatoire.

## Tests

- [ ] Tests des schémas, normalisations et contraintes.
- [ ] Tests des catégories multiples et transitions de statut.
- [ ] Tests de plusieurs périodes, reprise après plusieurs années et unicité de
      la période ouverte.
- [ ] Tests des permissions `view`, `manage` et `delete`.
- [x] Tests de contrat empêchant la lecture ou l'association d'un contact non
      autorisé depuis le fil.
- [ ] Tests du contact principal et des doublons.
- [ ] Tests de fin et réactivation d'une liaison contact.
- [ ] Tests de suppression d'une fiche du Répertoire avec anonymisation de la
      liaison partenaire.
- [x] Tests de contrat du masquage complet des contacts sans `persons:view`.
- [x] Tests de contrat du fil unifié et de sa pagination.
- [ ] Tests fonctionnels de correction et de suppression d'une note depuis la
      future interface dédiée.
- [x] Tests d'action facultative, date cible, réalisation, réouverture et
      version propre à l'action.
- [ ] Tests garantissant qu'aucun responsable permanent n'est nécessaire pour
      consulter ou poursuivre un suivi.
- [ ] Tests garantissant que le texte complet du suivi ne fuit pas dans
      l'audit, les toasts ou les notifications.
- [x] Tests de contrat de concurrence : ajout d'une note indépendant de la
      version globale, action protégée par sa version et répétition du même
      état traitée comme un no-op.
- [ ] Tests d'intégration avec deux requêtes réellement concurrentes sur une
      base dédiée.
- [ ] Tests de suppression, rollback et dépendances futures.
- [ ] Tests de fusion, collisions et redirection d'un ancien identifiant avant
      d'activer cette capacité.
- [ ] Tests des événements d'audit et de l'historique de champs.
- [ ] Tests des filtres d'URL, pagination et retour depuis une fiche.
- [ ] Tests de recherche par nom, domaine et contact.
- [ ] Contrats UX desktop et mobile.
- [ ] Tests d'accessibilité des lignes cliquables et formulaires.
- [ ] Tests d'états vide, chargement, erreur et accès refusé.
- [ ] Scénarios E2E uniquement sur une base dédiée et réinitialisable.
- [x] Tests du contrat de sauvegarde v7 : présence et ordre de toutes les
      tables partenaires, format fermé, compteurs et signature.
- [ ] Test d'intégration d'une restauration v7 complète sur une base isolée.
- [ ] Tests garantissant que recherche globale, logs et erreurs ne contiennent
      aucune note ni coordonnée.

## Documentation et déploiement

- [ ] Mettre à jour le registre des fonctionnalités.
- [ ] Mettre à jour la navigation, la feuille de route et les fiches de
      préparation existantes.
- [ ] Mettre à jour la documentation des permissions.
- [ ] Documenter les événements d'audit.
- [x] Ajouter la migration du fil durable au flux de déploiement.
- [x] Appliquer la migration du fil sur la base actuellement configurée.
- [ ] Appliquer cette migration sur chaque autre environnement avant d'y
      activer cette version de l'onglet Suivi.
- [ ] Étendre la procédure contrôlée de suppression du Répertoire pour
      anonymiser et clôturer les `PartnerContact` atomiquement.
- [x] Ajouter toutes les tables dans l'ordre de dépendance au manifeste de
      sauvegarde/restauration et augmenter le format signé à la version 7.
- [ ] Tester une restauration complète du format 7 sur une base isolée avant
      le déploiement en production.
- [x] Documenter la conservation sans expiration automatique des données
      métier du module et la purge lors d'une suppression autorisée.
- [x] Ajouter `PartnerTimelineEvent` aux contrôles de readiness du module.
- [ ] Vérifier la recherche globale et les liens de notifications.
- [ ] Vérifier la visibilité avec plusieurs profils de permissions.
- [x] Aucun worker ni tâche planifiée requis pour la première version.

## Décisions finales avant le schéma

- [x] Utiliser « Sponsors & partenaires » pour la page, « Partenaire » pour une
      fiche dans l'interface et `PartnerOrganization` dans le modèle.
- [x] Une organisation peut être à la fois sponsor et partenaire.
- [x] Une fiche « Terminée » revient d'abord à « En discussion » avant une
      nouvelle activation.
- [x] Le statut neutre « Sans suite » remplace un statut « Refusé » trop
      restrictif.
- [x] Prévoir plusieurs emails et téléphones généraux libellés, avec un
      principal par type.
- [x] Utiliser un libellé libre court par période de liaison contact ; des
      suggestions UX n'imposent pas de catalogue métier.
- [x] L'onglet Suivi présente directement le statut, les actions ouvertes et
      la liste des suivis, sans carte de synthèse redondante.
- [x] L'ajout d'une entrée se fait dans un modal ouvert depuis un bouton dédié.
- [x] Une action prévue terminée peut être réouverte avec audit.
- [x] Les dates de relation restent facultatives ; l'interface signale les
      incohérences sans inventer de date.
- [x] Une organisation peut exister sans contact, notamment au stade Prospect.
- [x] Une fiche contact supprimée laisse une liaison anonymisée sans identité.
- [x] Une organisation liée à un contrat, paiement ou document ne peut pas
      être supprimée ; un doublon doit alors être fusionné.

## Extensions explicitement préparées mais non anticipées

- [ ] Les futurs contrats gardent leur propre photographie légale immuable
      (raison sociale, adresse, signataire, identifiants légaux) tout en
      référençant l'organisation canonique.
- [ ] Ajouter raison sociale, adresse, pays, SIREN, TVA ou anciens noms à la
      fiche partenaire seulement lorsqu'un module juridique en a réellement
      besoin ; aucun de ces champs n'est requis pour la première version.
- [ ] Ajouter un export métier seulement avec un besoin identifié, une
      permission dédiée, un volume borné et les mêmes masquages de contacts.
- [ ] Ajouter assignations, rappels et notifications seulement si le volume ou
      l'organisation réelle les justifie ; aucun champ dormant n'est créé
      aujourd'hui.
