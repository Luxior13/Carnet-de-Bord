# Sujets futurs — fiches à rédiger quand le module devient réel

Ces sujets sont des candidats de fiches transversales. **Ne pas créer la fiche
tant que le module n'existe pas** : ce document garde la liste et les principes
à reprendre. Quand l'un d'eux devient réel, créer sa fiche dans
`docs/qualite/fiches/` et l'ajouter à la table de sélection de
`REVUE_GENERALE.md`.

Principes extraits d'un projet de référence le 10 octobre 2026, à adapter aux
règles de Noctambule — pas de recopie à l'aveugle.

## SEO et référencement public

Déclencheur : page publique, URL, indexation, métadonnées, sitemap, robots,
aperçus de partage ou changement de domaine.

Principes à reprendre :

- Séparer les surfaces indexables (publiques) des non indexables (admin, API,
  outils, aperçus). Un drapeau d'environnement vaut `false` par défaut et `true`
  seulement sur le déploiement public prêt.
- Sitemaps fragmentés et bornés, `robots` indépendant de la base, canoniques
  absolues, filtres/pagination en `noindex`, redirections 301/308 avant rendu,
  historique des slugs pour conserver les anciennes URLs.
- Métadonnées génériques par défaut ; surcharge éditoriale seulement si usage.
- `JSON-LD` uniquement sur du contenu public réel. Une optimisation SEO ne rend
  jamais un contenu privé public.
- Recette de lancement : domaine, HTTPS, www, Search Console, sitemap soumis,
  puis suivi daté. Tests HTTP isolés, pas de simple recherche de chaîne.

## Médias, uploads et stockage

Déclencheur : uploader, média protégé, remplacement, suppression ou restauration.

Principes à reprendre :

- Entité propriétaire + usages publics/privés + droits (importer, lire, remplacer,
  retirer). Une clé de stockage connue n'accorde pas l'accès.
- Séparer import temporaire et rattachement métier ; gérer abandon, expiration
  et reprise.
- Valider le contenu réel (type, dimensions, pixels, poids) ; limites source vs
  sortie ; compression dégressive (sans perte d'abord).
- Retirer les métadonnées EXIF sensibles (géolocalisation, appareil).
- Remplacement atomique : garder l'ancien média utilisable jusqu'à validation.
- Suppression via le registre de références, jamais depuis une URL.
- Lecture privée avec cache adapté ; ne pas rendre privé public pour le cache.

## Audience et statistiques

Déclencheur : mesure, écran de statistiques, ressource ou interaction suivie.

Principes à reprendre :

- Surface publique réelle et ID stable ; pas d'audience fictive.
- Distinguer collecte, stockage et consultation ; autoriser côté serveur avant
  toute lecture.
- Réutiliser les registres communs ; séparer vues, clics, partages et intentions ;
  préserver le grain et l'historique lors d'un renommage.
- Minimisation, rétention et requêtes bornées.
- Une nouvelle page ne reçoit pas automatiquement un panneau d'audience.

## Notifications et rappels

Déclencheur : envoi, déclencheur, destinataire, préférence, canal ou lien.

Principes à reprendre :

- Besoin explicite : quel événement, pour qui, à quel moment. Pas de notification
  par défaut.
- Réutiliser les types actifs, modèles, préférences et services.
- Distinguer persistance de la notification et livraison par canal.
- Déduplication, reprise et annulation ; vérifier l'éligibilité au moment de l'envoi.
- Lien utilisable par le destinataire ; pas de données privées dans l'aperçu.
- Une suppression ou un renommage peut affecter les notifications existantes.

## Publication de contenus publics

Déclencheur : route publique, publication, visibilité, URL, métadonnées ou recherche.

Principes à reprendre :

- Projection publique explicite ; ne pas exposer les champs d'administration, les
  données privées ou les brouillons dans le HTML, les métadonnées, le JSON-LD ou
  la recherche.
- Publication indépendante de l'existence (brouillon, archive, privé, programmé).
- IDs stables quand le slug change ; conserver les anciennes URLs.
- Échapper selon le contexte (texte, Markdown, HTML, JSON-LD) ; contrôler les
  protocoles des liens.
- Recherche publique normalisée (casse, accents, séparateurs), filtrée par la
  publication avant classement, avec index maintenu et reprise en file.

## Compétitions et rencontres

Déclencheur : compétitions, matchs, formats, résultats, classements, visibilité.

Principes à reprendre :

- Formats typés via un registre unique (validation, complétude, agrégation) ;
  pas de moteur de plugins ni de formulaire universel.
- Choix explicites, jamais de repli silencieux ; une valeur absente reste
  distincte de zéro.
- Règles et références figées sur le match (snapshot) : un changement de
  catalogue ne réinterprète pas les résultats existants.
- Publication indépendante des horaires : un résultat enregistré est visible
  immédiatement ; « à confirmer » quand un participant manque.
- Visibilité privé / interne / public, avec projection publique explicite.
- Confirmation pour toute opération destructrice (retrait de données, changement
  de format).

## Permissions et délégation

Déclencheur : rôle, permission, page ou action exposée à un membre du staff.

Principes à reprendre :

- Le minimum de permissions nécessaire, par responsabilité, pas par page ni par
  bouton. Avant tout nouveau droit : « cette personne doit pouvoir A, mais pas B ».
- Préférer un périmètre (par jeu, équipe, objet) à des permissions dupliquées.
- Le contrôle existe partout : menu, page, lecture serveur, API, action. Masquer
  un bouton ne suffit jamais.
- Distinguer lecture, rédaction, publication et suppression ; ne séparer que si
  une délégation réelle l'exige.
- IDs stables, versionnement et audit ; une révocation s'applique à la lecture
  suivante ; une migration n'accorde jamais de droits par effet de bord.

## Langage visuel et design

Déclencheur : nouveau composant, nouvelle page ou refonte visuelle.

Principes à reprendre :

- Un seul langage visuel, décliné en densités (public éditorial, admin dense,
  outils = admin). Mêmes couleurs, badges, états et rayons partout.
- Deux niveaux de surfaces maximum (page + surface principale).
- La couleur sert une fonction : l'accent marque l'interaction, les badges le
  sens. Les effets et ombres restent rares.
- Tableau dense : recherche large, sélecteurs sur une ligne, remise à zéro
  seulement si un filtre est actif, chips retirables, compteur + taille de page.
  C'est la forme retenue comme page de référence (`/membres/repertoire`).

## Outils personnels (type notes)

Déclencheur : outil personnel d'un membre authentifié.

Principes à reprendre :

- Lecture et mutation limitées au propriétaire ; le statut administrateur ne
  donne pas accès aux données personnelles d'autrui.
- Contenu portable (Markdown léger), échappement HTML et contrôle des liens.
- Sauvegarde temporisée côté client, gestion des conflits et restauration de
  l'état local en cas de refus.
- Bornes explicites : limite de notes, recherche serveur avec accents, tri
  épinglé puis récent.

## Gouvernance, fondateurs et mandats

Déclencheur : entité juridique, dirigeants, mandats ou fonctions datées.

Principes à reprendre :

- Séparer les fondateurs/dirigeants des fonctions de staff ; une fonction est
  datée (période, historique, visibilité).
- Publier une identité externe seulement avec un accord enregistré.
- Ne jamais déduire une date de mandat de la date de création technique.
- Migration avec simulation (sans écriture) puis application transactionnelle ;
  les anciens mandats ne sont retirés qu'après création de leur destination.
- Distinguer statut métier et statut technique (administrateur).

## Sanctions, bans et éligibilité

Déclencheur : ban d'un jeu ou d'un tournoi, éligibilité à un événement, contrôle
à l'inscription, sanction structurelle.

Principes à reprendre :

- Une sanction ou un ban est une **relation datée** entre une personne, un
  périmètre (jeu, tournoi, structure, saison) et une décision : période, motif,
  auteur, décision de levée. Ne pas écrire « banni » comme booléen sur `Person`.
- L'éligibilité se calcule depuis ces relations datées au moment de l'inscription,
  sans dupliquer l'état sur la fiche.
- Conserver l'historique (qui, quand, pourquoi) ; une levée de sanction ne
  supprime pas l'ancienne décision.
- Séparer la consultation (liste/fiche) de la décision (permission dédiée) ;
  le motif et l'auteur peuvent être sensibles.
- Prévoir des périmètres futurs : tournoi, jeu, équipe, saison, exercice, sans
  figer aujourd'hui le modèle définitif.
