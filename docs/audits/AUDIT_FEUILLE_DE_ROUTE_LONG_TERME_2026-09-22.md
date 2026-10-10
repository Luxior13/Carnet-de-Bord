**Audit de la feuille de route et de l'organisation du site — 22 septembre 2026**

> Rapport historique : résultats valables pour la passe décrite, non rejoués par
> la correction documentaire. Voir [l’index](README.md) et les [suivis courants](../qualite/pages/README.md).
> Les chemins indiqués comme historiques peuvent désigner des fichiers retirés.

> Photographie avant refonte. La nouvelle organisation adoptée après cet audit est décrite dans la [feuille de route courante](../references/FEUILLE_DE_ROUTE.md) et la [matrice de préparation](../../features/pages/MATRICE_PREPARATION.md). Les constats ci-dessous sur les anciens nombres d’entrées et documents restent historiques.

**Avis général**

La base du site est cohérente pour commencer : répertoire unique, comptes séparés des personnes, permissions, journal, notifications, navigation par pôles et séparation entre fonctionnalités livrées et prévues. En revanche, le plan métier actuel ne suffit pas encore pour gérer durablement une structure esport professionnalisée. Il faut corriger certaines frontières fonctionnelles avant de développer les modules financiers, contractuels et sportifs.

Le principe directeur recommandé est : **une interface simple, des objets métier distincts et un historique fiable**. Réduire le nombre d'entrées du menu ne doit pas conduire à réduire des adhésions à un statut, des contrats à un PDF ou des factures à une pièce jointe de paiement.

Ce rapport contient des recommandations, pas des décisions déjà adoptées. Il ne modifie ni le site, ni les données, ni les documents de référence existants.

**Périmètre et méthode**

Audit du dépôt local : page `/feuille-de-route`, catalogue de navigation, registre des fonctionnalités, tous les fichiers de page de l'application, composants déterminant leur fonction et leur placement, schéma actuel des données, 68 fichiers de `features/pages` (66 fiches et deux documents d'index/cadrage), descriptions métier de `features`, plans détaillés Personnes/Réunions/Partenaires, navigation, structure juridique, permissions et exploitation.

Les mentions « développé » ou « présent » décrivent le code disponible. La disponibilité de la base, les migrations et les secrets de l'environnement déployé n'ont pas été vérifiés. Ce n'est pas une recette visuelle dans un navigateur connecté, ni un audit exhaustif de sécurité. Le site public n'est pas présent dans ce périmètre ; ses capacités sont annoncées dans les documents, pas confirmées ici.

Hypothèse de travail : structure établie en France, association aujourd'hui, société possible demain, avec possibilité de coexistence. Les recommandations produit restent applicables à une petite équipe ; les fonctions dépendant de salariés, ventes ou compétitions particulières s'activent selon les besoins réels.

**1. État exact constaté**

La navigation déclare **54 entrées : 8 actives et 46 planifiées**. La feuille de route regroupe ces 46 entrées en **23 cartes principales**, les 23 autres étant des sous-entrées affichées sous forme de badges.

| Pôle actuel | Cartes planifiées | Entrées planifiées, enfants compris |
| --- | ---: | ---: |
| Aujourd'hui | 4 | 4 |
| Personnes | 3 | 3 |
| Activité | 4 | 4 |
| Relations | 3 | 6 |
| Équipe | 3 | 8 |
| Finances | 4 | 14 |
| Système | 2 | 7 |
| Total | 23 | 46 |

Le registre contient également la recherche ; le compte personnel et la connexion existent hors de ces huit entrées de menu. Avec les créations et fiches de personnes/utilisateurs, cela représente 15 destinations de page développées, plus trois alias de redirection. Les fichiers spéciaux d'erreur et de chargement ne sont pas des pages métier supplémentaires.

Les 46 entrées planifiées ne constituent pas 46 écrans vides déjà disponibles. Le code du tableau de bord rejette les sous-routes non livrées ; celui de Système ne rend que les paramètres et le journal. Les routes métier des pôles Finances, Relations et Équipe n'ont pas encore de page applicative. La matrice qualifie donc à tort plusieurs destinations de « présentes, à connecter ».

Le module Partenaires a été volontairement retiré. Son historique de conception reste précieux, mais son ancien schéma ne figure plus dans le schéma courant. Des migrations historiques ne prouvent pas l'existence actuelle d'une fonctionnalité.

**2. Corrections prioritaires du cadrage**

| Priorité | Constat | Conséquence | Recommandation |
| --- | --- | --- | --- |
| Avant les prochains modules métier | `STRUCTURE.md` présente surtout association/société comme une configuration de vocabulaire. | Risque de réinterpréter les anciens contrats, adhésions et opérations lors d'un changement. | Introduire une identité juridique durable et des règles datées ; prévoir nouvelle entité et coexistence sans les imposer immédiatement à l'interface. |
| Avant la finance | Facture, justificatif, paiement, cotisation et remboursement sont trop souvent ramenés à une opération. | Impayés, acomptes, avoirs, paiements partiels et demandes non réglées deviennent difficiles à gérer correctement. | Distinguer créance/dette, document commercial, paiement et affectation du paiement. |
| Avant l'espace joueur | Les rôles métier sont réduits à des statuts ; aucun lien Personne/Compte n'existe actuellement. | Impossible de déduire de façon fiable « mes documents », « mon planning » ou « mes cotisations ». | Définir une attribution explicite des ressources personnelles ; conserver les identités séparées. |
| Dès le prochain découpage | L'esport est globalement repoussé en dernière phase, comme liaison au public. | Le produit risque de rester longtemps un outil administratif sans répondre au quotidien des joueurs et coachs. | Avancer planning, disponibilités, rosters datés et convocations ; différer statistiques avancées et synchronisation complexe. |
| Avant l'activation des modules | Menu, matrice, fiches anciennes et plans détaillés divergent. | On peut implémenter la mauvaise route, le mauvais propriétaire de donnée ou une fonction déjà retirée. | Choisir un catalogue de référence et qualifier chaque fiche : courante, remplacée ou historique. |
| Avant les données confidentielles | Les portées prévues `self/team/all` restent insuffisamment définies par ressource. | Un rôle technique ou l'appartenance à une saison pourrait donner une visibilité métier excessive. | Autorisation = action + entité juridique + périmètre + confidentialité + période pertinente. |

**3. Vérification de toutes les pages existantes**

| Destination actuelle | État constaté et placement | Avis |
| --- | --- | --- |
| `/` | Accueil « Mon travail », pôle Aujourd'hui ; affiche surtout alertes de sécurité des comptes et activité récente. | Bonne destination d'accueil. L'enrichir en tâches, planning et actions métier par rôle. Pour un joueur sans données administratives, le contenu actuel peut se limiter au message d'accueil. Prévoir un état vide utile. |
| `/login` | Connexion indépendante des pôles. | Cohérent. Ne pas la mélanger au répertoire métier. |
| `/mon-compte` | Profil et sécurité du compte ; accès depuis le menu de compte en bas de sidebar. | Cohérent comme emplacement global. Distinguer à terme paramètres du compte et espace personnel métier ; pas besoin de les confondre. Le document de navigation annonçant un accès dans l'en-tête doit refléter le choix réel. |
| `/mes-notifications` | Boîte personnelle dans Aujourd'hui, aussi accessible par la cloche. | Cohérent : raccourci et boîte complète servent deux usages complémentaires. Les notifications ne doivent pas devenir la liste officielle des tâches. |
| `/recherche` | Recherche globale accessible depuis l'en-tête ; catalogue actuel de destinations. | Bien placé. Elle recherche actuellement des pages, pas les fiches Personne, contrats ou paiements. Qualifier cette limite ; ajouter progressivement une recherche métier autorisée. |
| `/vie-interne/repertoire` | Répertoire, pôle Personnes. | Bon placement malgré le préfixe historique de l'URL. Une seule fiche par personne est une bonne fondation. |
| `/vie-interne/repertoire/nouveau` | Création depuis le répertoire. | Logique. Garder la création minimale et la détection des doublons. |
| `/vie-interne/repertoire/[id]` | Fiche, sections Identité et Coordonnées. | Logique. Les futures adhésions, affectations, contrats et matériel doivent être des relations métier, pas une accumulation de champs dans Identité. |
| `/vie-interne/actualite-interne` | Actualité interne, pôle Activité ; développé. | Bon placement. Bien distinguer annonce partagée, notification personnelle et événement du journal. L'audience future doit suivre la confidentialité de la source. |
| `/administration/utilisateurs` | Gestion des comptes, pôle Système. | Bon placement. « Comptes utilisateurs » serait plus explicite ; conserver la distinction avec Répertoire et Comptes financiers. |
| `/administration/utilisateurs/nouveau` | Création d'un accès. | Cohérent. Ne pas créer automatiquement une adhésion, un contrat ou un rôle sportif. |
| `/administration/utilisateurs/[id]` | Fiche compte, autorisations, sécurité et activité. | Cohérent. La fonction de dirigeant, trésorier ou coach ne doit pas impliquer automatiquement le rôle technique ADMIN. |
| `/systeme/journal-activite` | Journal global, pôle Système. | Bon placement. Conserver des historiques contextuels accessibles selon les droits métier, sans exiger la lecture de tout le journal. |
| `/systeme/parametres` | Écran développé ; taille des listes, conservation des notifications et de l'audit. | Bon placement technique. Le profil juridique, les saisons et les exercices ne sont pas déjà implémentés ici. Prévoir une distinction entre réglages techniques et configuration métier. |
| `/feuille-de-route` | Catalogue informatif, dans Système, accessible aux comptes authentifiés. | Utile pendant la construction. Ce placement fait apparaître Système même à un utilisateur ordinaire pour cette seule page. Un accès « Projet / À venir » global serait plus naturel pour les joueurs. |
| `/administration` | Redirection vers les utilisateurs. | Conserver la compatibilité. Aucun besoin de reconstruire une page d'accueil administrative vide. |
| `/tableau-de-bord` | Redirection vers `/`. | Cohérent, conserver. |
| `/tableau-de-bord/mes-notifications` | Redirection vers `/mes-notifications`. | Cohérent, conserver. |

`/systeme` ne rend actuellement pas d'accueil métier. `/vie-interne`, `/bureau-juridique` et `/tresorerie` ne sont pas des pages vides opérationnelles dans le code actuel. `not-found.tsx`, `error.tsx`, les chargements et les layouts remplissent des fonctions techniques ; leur absence du menu est normale. Les routes `/api/...` sont des services, pas des destinations de navigation à ajouter.

Les anciennes URL ne doivent pas être renommées seulement pour correspondre aux nouveaux intitulés. Leur placement visible, leurs fils d'Ariane et leurs liens de retour comptent davantage ; si une migration d'URL devient utile, maintenir des redirections explicites.

**4. Avis détaillé sur les 46 entrées de la feuille de route**

Une ligne « vue » conserve la fonctionnalité, mais ne recommande pas forcément une entrée de menu autonome. Les URL ci-dessous sont les identifiants actuels du plan, pas une promesse de routes déjà disponibles.

**Aujourd'hui — 4 entrées**

| Entrée et route | Décision conseillée | Contenu durable |
| --- | --- | --- |
| Mes tâches — `/tableau-de-bord/mes-taches` | Conserver comme vraie vue personnelle. | Liste complète avec échéance, responsable, source et état. Un simple petit bloc d'accueil ne suffit plus à volume élevé. Même moteur que les tâches collectives. |
| Prochaines réunions — `/tableau-de-bord/prochaines-reunions` | Intégrer au planning personnel. | Réunions, entraînements, matchs et convocations ; lien vers chaque source. Pas de deuxième base d'événements. |
| Documents à accepter — `/tableau-de-bord/documents-a-accepter` | Conserver dans l'espace personnel. | Documents effectivement adressés à la personne ; version exacte, action attendue, échéance et preuve. Accès personnel sans accès à toute la bibliothèque. |
| Alertes importantes — `/tableau-de-bord/alertes-importantes` | Vue prioritaire de Mon travail. | Alertes issues des modules, gravité, responsable, résolution ; lire une alerte ne résout pas le problème métier. Pas de dossiers copiés manuellement. |

**Personnes — 3 entrées**

| Entrée et route | Décision conseillée | Contenu durable |
| --- | --- | --- |
| Candidatures — `/vie-interne/recrutement-tryouts` | Conserver ici et approfondir. | Candidature pour un poste, jeu, équipe et campagne ; plusieurs candidatures possibles pour la même personne. Essais, évaluations restreintes, décision, arrivée ; pas de nouvelle identité lors de l'acceptation. |
| Incidents — `/bureau-juridique/incidents-sanctions` | Déplacer vers Structure, avec liens restreints depuis Personnes et Esport. | Signalement, faits établis, preuves, instruction, décision, sanction, contestation, expiration. Distinguer sanction interne et ban d'un éditeur/organisateur. Pas d'étiquette générale « personne à surveiller ». |
| Matériel — `/bureau-juridique/inventaire-acces` | Déplacer vers Activité, en « Ressources & logistique ». | Matériel, détenteurs successifs, prêts, retours, maintenance, pertes, garanties. Séparer équipements, licences logicielles et accès aux services ; une licence de compétition relève du sportif. |

**Activité — 4 entrées**

| Entrée et route | Décision conseillée | Contenu durable |
| --- | --- | --- |
| Réunions — `/vie-interne/reunions` | Conserver. | Préparation, participants, ordre du jour, compte rendu, décisions et actions. Les assemblées formelles réutilisent l'organisation de réunion mais ajoutent les règles de gouvernance. |
| Calendrier — `/vie-interne/calendrier-interne` | Conserver comme calendrier transversal. | Vues personnelles/équipe/structure, disponibilités, conflits, fuseaux, récurrence et annulations. Les échéances restent détenues par leurs modules sources. |
| Débriefs — `/vie-interne/debriefs` | Conserver un répertoire transversal, avec accès contextuel dans Esport. | Points positifs, améliorations, actions ; source et audience. Compte rendu officiel, note de coaching et débrief ne doivent pas devenir trois copies du même texte. |
| Rappels — `/vie-interne/notifications-rappels` | Répartir les usages. | Rappels personnels dans Mon travail, rappel métier sur sa fiche, règles automatiques dans Système. Une vue collective peut rester dans Activité si elle sert réellement à suivre les relances. |

**Relations — 6 entrées**

| Entrée et route | Décision conseillée | Contenu durable |
| --- | --- | --- |
| Organisations — `/bureau-juridique/partenaires` | Conserver et élargir progressivement. | Sponsors, clients, fournisseurs, prestataires, clubs, organisateurs, institutions ; une identité d'organisation, plusieurs relations. Une organisation peut être fournisseur actif et prospect sponsor simultanément. |
| Documents & contrats — `/bureau-juridique/documents` | Déplacer vers Structure. | Bibliothèque documentaire et accès aux contrats. Commencer avec des vues distinctes ; donner aux contrats leur propre lieu si le suivi contractuel devient fréquent. |
| Documents officiels — `/bureau-juridique/documents-officiels` | Vue de la bibliothèque. | Types, versions, publication, date d'effet, audience, échéances et conservation. Distinguer document vivant, version publiée et preuve conservée. |
| Contrats — `/bureau-juridique/contrats` | Conserver un vrai cycle contractuel dans Structure. | Parties, entité signataire, période, avenants, obligations, montants restreints, signature, renouvellement et résiliation. Le fichier est une pièce du contrat. |
| Acceptation des chartes — `/bureau-juridique/acceptation-chartes` | Vue de suivi dans Documents. | Campagnes d'acceptation par version, destinataires, relances et preuves. Distinguer accusé de lecture, acceptation, approbation interne et signature contractuelle. |
| Décisions — `/bureau-juridique/decisions-bureau` | Déplacer vers Structure → Gouvernance & décisions. | Instances, mandats, réunions décisionnelles, votes lorsque nécessaires, décisions, effets et exécution. Nom neutre compatible bureau, direction ou associés. |

Le nom Relations convient aux relations externes. Il est trop vague pour héberger à lui seul tous les contrats de travail, statuts, procédures internes, incidents et décisions de direction.

**Équipe — 8 entrées ; pôle recommandé : Esport**

| Entrée et route | Décision conseillée | Contenu durable |
| --- | --- | --- |
| Vue d'équipe — `/sport-team-control` | Faire une entrée Équipes & saisons. | Liste des équipes, sélection saison/jeu, effectif, disponibilité et échéances. Prévoir plusieurs équipes sans refaire toute la navigation. |
| Jeux — `/sport-team-control/jeux` | Référentiel/vues sous Équipes. | Identifiants, formats, plateformes et liens utiles selon le jeu. Pas nécessairement un grand module autonome. |
| Rosters — `/sport-team-control/rosters` | Conserver une vraie gestion de composition datée. | Titulaires, remplaçants, coachs, prêts, dates d'entrée/sortie et inscriptions aux compétitions. Une ancienne rencontre garde sa composition historique. |
| Membres esport — `/sport-team-control/membres-esport` | Vue sportive des personnes. | Comptes de jeu, rôles, affectations et éligibilité ; identité civile détenue par Répertoire. Ne pas recréer une seconde liste de personnes indépendante. |
| Matchs & tournois — `/sport-team-control/tournois-matchs` | Conserver dans Compétitions. | Distinguer tournoi, inscription d'équipe, rencontre et résultat. Règlement/version, délais, composition autorisée, check-in, coûts, litiges et gains. |
| Scrims — `/sport-team-control/scrims` | Vue spécialisée de l'activité sportive. | Adversaire, créneau, format, disponibilité, objectifs, résultat privé, débrief et confidentialité. Pas de publication automatique des informations de préparation. |
| Calendrier esport — `/sport-team-control/calendrier-esport` | Vue filtrée du calendrier commun. | Entraînements, scrims, matchs, déplacements et convocations ; source unique et droits sportifs. |
| Performance — `/sport-team-control/performance` | Conserver, développer après les usages quotidiens. | Objectifs, évaluations, contexte du jeu, provenance des indicateurs, période et droits individuels/collectifs. Éviter une note universelle entre jeux ou rôles différents. |

À rendre explicites dans la feuille de route : **disponibilités, présences, convocations, entraînements et préparation**. La préparation est déjà décidée dans `FEUILLE_DE_ROUTE.md`, mais aucune carte ne la représente. Elle peut commencer dans la fiche d'un événement, puis devenir un lieu de travail regroupant plans de jeu et analyses vidéo.

La gestion des jeux/rosters/matchs est annoncée comme existante sur le site public. Conserver ses identifiants si cette source reste officielle. Documenter cependant, champ par champ, ce qui vient du public et ce qui reste privé. À long terme, le back-office peut être maître des opérations et publier une sélection validée ; ce changement doit être décidé explicitement. Il ne faut ni recopier deux systèmes complets ni bloquer toute fonction privée tant que la synchronisation n'est pas prête.

**Finances — 14 entrées**

| Entrée et route | Décision conseillée | Contenu durable |
| --- | --- | --- |
| Comptes — `/tresorerie/comptes` | Conserver, intitulé Comptes & rapprochement. | Banque, caisse, prestataires de paiement, devise, titulaire juridique, solde initial, relevés et rapprochement. |
| Opérations — `/tresorerie/operations` | Conserver pour les mouvements et règlements. | Paiements, encaissements, virements entre comptes, frais et annulations/corrections traçables. Séparer prévision et argent réellement disponible. |
| Recettes — `/tresorerie/recettes` | Vue filtrée. | Encaissements avec leur origine ; ne pas assimiler tous les crédits bancaires au chiffre d'affaires. |
| Dépenses — `/tresorerie/depenses` | Vue filtrée. | Décaissements avec catégorie et pièce ; distinguer facture fournisseur, paiement et engagement budgétaire. |
| Cotisations adhérents — `/tresorerie/cotisations-adherents` | Garder une vue dédiée aux sommes dues et réglées. | Campagne, échéance, exonération, paiement partiel, relance, historique. L'adhésion reste dans Personnes. Une adhésion ne crée pas d'argent encaissé. |
| Sponsoring financier — `/tresorerie/sponsoring-financier` | Vue des finances liées aux partenariats. | Engagement contractuel, échéancier, facture, règlements et reste dû ; valorisation distincte des apports en nature. La prospection reste dans Relations. |
| Factures / justificatifs — `/tresorerie/factures-justificatifs` | Revoir la fusion ; créer Facturation & achats. | Factures clients/fournisseurs, devis selon besoin, avoirs, échéances et règlements associés. Justificatifs = pièces liées, pas équivalent d'une facture structurée. |
| Remboursements — `/tresorerie/remboursements` | Conserver un workflow Notes de frais & remboursements. | Demande, lignes de frais, pièces, validation/rejet, paiement et preuve ; accès du demandeur à ses propres dossiers. |
| Budget & bilans — `/tresorerie/budget` | Conserver en Budget & pilotage. | Prévision, versions, enveloppes, engagé/réalisé et écarts par équipe, saison, projet et exercice. |
| Bilans — `/tresorerie/bilans` | Vue de rapports, pas saisie supplémentaire. | Distinguer suivi de gestion, situation de trésorerie et états comptables produits par l'outil/cabinet compétent. Un total de recettes moins dépenses n'est pas un bilan comptable. |
| Contrôles — `/tresorerie/validations-finance` | Conserver comme file métier financière. | Seuils, délégations, séparation demandeur/approbateur lorsque requise, modifications après validation, pièces manquantes et clôture. |
| Exports finance — `/tresorerie/exports-finance` | Vue de Contrôles et actions des listes. | Période, entité juridique, pièces liées, format convenu avec le comptable et état des transmissions. Un CSV générique ne garantit pas un export réglementaire. |
| Journal financier — `/tresorerie/journal-financier` | Vue d'historique financier. | Qui a validé/corrigé quoi ; distinct des écritures comptables et de la preuve bancaire. |
| Archives finance — `/tresorerie/archives-finance` | Vues des périodes clôturées. | Lecture autorisée, dossiers de clôture et règles de conservation ; aucune deuxième copie éditable des opérations. |

Exemple de conception à supporter : un sponsor signe pour 12 000 €, reçoit une facture, puis paie 4 000 € et 8 000 €. Il y a un engagement, une facture, deux encaissements et des affectations. Avant le premier paiement, les 12 000 € ne sont pas le solde bancaire disponible. De même, un transfert entre deux comptes de la structure n'est pas une recette économique supplémentaire.

Pour les gains de compétition : distinguer résultat annoncé, montant confirmé, gain dû, encaissement de la structure, répartition contractuelle et versements aux joueurs. Le classement seul ne déclenche pas automatiquement un revenu acquis ou un paiement.

**Système — 7 entrées**

| Entrée et route | Décision conseillée | Contenu durable |
| --- | --- | --- |
| Modèles — `/systeme/modeles` | Revoir le regroupement. | Une bibliothèque de modèles n'est pas un moteur d'automatisation. Garder des accès métier et une administration technique distincts. |
| Modèles de documents — `/systeme/modeles-documents` | Placer la gestion quotidienne dans Structure → Documents. | Modèles, versions, variables et aperçu ; édition par les responsables métier sans accès global aux paramètres système. |
| Modèles de notifications — `/systeme/modeles-notifications` | Configuration commune dans Système. | Canaux, variables autorisées, variantes, langue et aperçu. Les responsables métier choisissent un modèle depuis leur contexte. |
| Automatisations — `/systeme/automatisations` | Conserver, en explicitant l'exécution. | Déclencheur, conditions, droits, destinataires, test, activation, historique, erreurs et reprise sans doublon. Commencer avec quelques règles concrètes. |
| Données — `/systeme/exports-sauvegardes` | Conserver et distinguer usages. | Imports, exports techniques et état des sauvegardes/restaurations. Les scripts de sauvegarde/restauration existent déjà ; c'est surtout l'écran et le suivi opérationnel qui restent à définir. |
| Validations globales — `/systeme/validations` | Sortir de Données/Système pour le travail quotidien. | Vue « À valider » dans Mon travail ; vues spécialisées dans Finances, Documents, Recrutement. Administration des règles seulement dans Système. |
| Archives globales — `/systeme/archives` | Conserver éventuellement un accès transversal réservé. | Recherche dans les archives de chaque module avec les mêmes autorisations ; pas un lieu où toutes les anciennes données deviennent visibles au même administrateur. |

Les sauvegardes techniques, archives métier et exports ne sont pas interchangeables. Une sauvegarde sert à reprendre après incident ; une archive conserve un dossier selon ses règles ; un export répond à un usage et à un destinataire.

**5. Anciennes fiches à réconcilier avec la cible**

Ces pages sont documentées mais ne figurent pas comme entrées indépendantes dans la feuille de route actuelle.

| Ancienne destination | Traitement recommandé |
| --- | --- |
| `/vie-interne/membres-adherents` | Supprimer le hub intermédiaire ; accès par Répertoire et vues Adhésions/Effectifs. |
| `/vie-interne/membres` | Vue de personnes ayant une relation active ; ne pas créer une seconde identité. |
| `/vie-interne/adherents` | Vue des adhésions, avec relation datée, campagne et droits propres. Ne pas supprimer le métier de l'adhésion. |
| `/vie-interne/onboarding-depart` | Processus Arrivées & départs sur chaque personne, plus vue collective des dossiers ouverts. La seule présence d'un onglet ne suffit pas pour superviser plusieurs arrivées. |
| `/vie-interne/reunions-suivi` | Retirer la page de regroupement sans contenu propre ; garder Réunions, Calendrier et Débriefs. |
| `/bureau-juridique/personnes-contacts` | Remplacée par Répertoire ; pointer les fiches et liens de documentation vers la route actuelle. |
| `/bureau-juridique/sponsors` | Historique du module retiré ; ne pas recréer en parallèle de `/bureau-juridique/partenaires`. |
| `/sport-team-control/recrutement-tryouts` | Vue sportive de Candidatures, même dossier et essais liés. |
| `/sport-team-control/debriefs` | Vue sportive du répertoire de débriefs, avec accès depuis les rencontres. |
| `/tableau-de-bord/mes-rappels` | Fonction encore pertinente, absorbée dans Mon travail ; rendre ce rattachement explicite. |
| `/vie-interne`, `/bureau-juridique`, `/systeme` | Aucun besoin de reconstruire un accueil qui répète le menu. |
| `/tresorerie` | Une synthèse financière peut avoir une valeur propre ; la prévoir dans Finances si elle expose situation, échéances et décisions à prendre. |

**6. Ce qu'il faut ajouter ou expliciter pour durer**

« Déjà cité » signifie que le besoin apparaît dans un document, mais n'est pas suffisamment représenté ou spécifié dans le catalogue affiché. Il ne s'agit donc pas toujours d'une idée totalement absente.

| Besoin | Situation actuelle | Placement conseillé | Moment pertinent |
| --- | --- | --- | --- |
| Structure juridique, historique et entité porteuse | Profil global déjà cité, frontières insuffisantes. | Structure → Identité & gouvernance ; réglages techniques séparés. | Avant contrats et finances. |
| Saisons et exercices | Déjà décidés dans le cadrage, sans carte claire. | Saison dans Esport ; exercice dans Finances ; sélection de contexte commune. | Dès les premiers objets dépendants. |
| Espace personnel métier | Décidé, distinct du compte technique actuel. | Aujourd'hui : planning, documents, disponibilités, frais, matériel. | Par étapes, avec les modules sources. |
| Adhésions, engagements et affectations datés | Trop souvent réduits à des statuts. | Personnes ; vues et relations sur la fiche. | Avant cotisations et rosters. |
| Arrivées et départs collectifs | Ancienne fiche, absorption en onglet peu visible. | Personnes. | Avec recrutements et gestion des accès. |
| Tâches collectives et projets simples | `Task` prévu, surtout vue personnelle représentée. | Activité → Projets & tâches, puis vue personnelle. | Avec réunions et engagements sponsors. |
| Disponibilités, présences et convocations | Disponibilités déjà citées, plan sportif peu détaillé. | Esport → Planning, vue individuelle dans Aujourd'hui. | Première tranche esport. |
| Préparation, stratégies et analyse vidéo | Fusion décidée dans le cadrage, absente du catalogue. | Esport → Préparation ou onglet d'événement au début. | Après planning et effectifs. |
| Éligibilité et inscriptions aux compétitions | Tournois cités, cycle administratif peu développé. | Esport → Compétitions. | Dès que les inscriptions sont suivies. |
| Déplacements, LAN et bootcamps | Déplacements cités comme catégorie financière seulement. | Activité → Ressources & logistique, liés à l'événement. | Dès les premiers événements physiques. |
| Opportunités et engagements commerciaux | Ancien module relationnel détaillé, livrables exclus de sa V1. | Relations → Partenariats ; contrats et factures liés. | Avant de suivre plusieurs accords simultanés. |
| Communication et contenus | Déjà cités en P3. | Activité au début, pôle distinct si équipe dédiée. | Avancer si la communication est un usage quotidien ou une obligation sponsor. |
| Facturation, achats et notes de frais | Prévus sous des regroupements trop génériques. | Finances. | Dès le premier besoin réel, y compris associatif. |
| Répartition de gains et primes | Primes/cashprize cités, processus absent. | Finances, liés aux compétitions et contrats. | Avant les premiers versements structurés. |
| Gouvernance, mandats et délégations | Décisions prévues, gouvernance incomplète. | Structure. | Dès les validations engageant la structure. |
| Confidentialité, droits à l'image, mineurs | Déjà cités en P2 ; pas de lieu défini. | Structure → Conformité, dossiers individuels autorisés dans Personnes. | Dès que les traitements/usages concernés existent. |
| RH et rémunérations | Contrats internes cités ; parcours employeur incomplet. | Personnes pour dossiers restreints ; Finances pour paiements ; outil de paie spécialisé. | Si embauche ou prestations, pas seulement au passage en société. |
| Subventions et dons | Natures financières prévues, dossiers peu définis. | Relations pour demandes/engagements ; Finances pour flux et justificatifs. | Si utilisés par l'association. |
| Import, qualité et réversibilité des données | Exports prévus, imports métier peu détaillés. | Système → Données avec permissions dédiées ; import depuis les modules. | Avant reprises importantes depuis tableurs/outils externes. |
| Intégrations et publication publique | Déjà prévues plus tard. | Système pour connexions ; validation dans le module propriétaire. | Après définition des sources et audiences. |

Pour chaque ajout, livrer d'abord le parcours le plus utile. Ne pas construire immédiatement une paie maison, un logiciel comptable complet, une messagerie concurrente de Discord, une boutique, une gestion d'actionnariat avancée ou un système statistique universel. Les interfaces vers des outils spécialisés sont souvent la meilleure limite de périmètre.

**7. Association aujourd'hui, société demain : modèle recommandé**

Le logiciel doit permettre de gérer professionnellement une association tout en conservant sa réalité juridique. « Adhérent → client ou associé », « cotisation → facture » et « reçu fiscal → facture » ne sont pas des substitutions de vocabulaire fiables. Une même personne peut être adhérente, joueuse, prestataire ou cliente dans des relations différentes, parfois simultanées.

Une association peut déjà avoir un SIREN/SIRET, employer des salariés ou exercer des activités conduisant à la TVA. Ne pas réserver ces possibilités au mode société. Voir les sources officielles sur [l'immatriculation des associations](https://www.service-public.gouv.fr/particuliers/vosdroits/F34727) et [leurs activités commerciales](https://www.service-public.gouv.fr/particuliers/vosdroits/F31838).

Prévoir trois scénarios techniques, sans présumer du montage juridique futur :

1. L'association continue, avec davantage d'activité et des règles adaptées.
2. Une société distincte prend en charge une activité ; les objets historiques restent attribués à leur entité d'origine.
3. Association et société coexistent, avec contrats, comptes, droits et échanges séparés.

Certaines transformations vers une coopérative ont un cadre spécifique ; cela ne justifie pas un bouton universel « transformer en société ». Le montage effectif déterminera les transferts et formalités. [Présentation Bpifrance des structures de l'ESS](https://bpifrance-creation.fr/moment-de-vie/quelles-structures-juridiques-entreprendre-less).

Conséquences de conception :

- Identité de l'entité juridique propriétaire des contrats, comptes financiers et factures, distincte de la marque esport et des organisations partenaires.
- Paramètres juridiques et fiscaux datés ; ancienne facture ou contrat signé conservant les informations applicables à l'émission/signature.
- Saison sportive distincte de l'exercice comptable et de la campagne d'adhésion. Aucun de ces objets ne remplace l'entité juridique.
- Relations datées : adhésion, mandat, contrat, affectation au roster, responsabilité. Ne pas écraser un ancien rôle quand il change.
- Reprise de données explicite, traçable et vérifiée si l'activité change de porteur ; pas de déplacement silencieux de tous les dossiers.
- Interface à une seule structure tant que cela suffit ; un sélecteur multi-entités n'est utile que lorsque plusieurs entités sont réellement gérées.

La facturation électronique doit figurer dans la conception des échanges, avec un périmètre confirmé selon l'activité. Au 22 septembre 2026, la réforme a commencé pour la réception et certaines émissions ; les PME/micro-entreprises concernées suivent l'échéance d'émission du 1er septembre 2027. Prévoir une liaison à une plateforme agréée et aux outils comptables, sans considérer un PDF généré comme toute la chaîne de facturation. [Calendrier et périmètre officiels](https://entreprendre.service-public.gouv.fr/actualites/A18953).

Pour des joueurs professionnels salariés, le cadre spécifique français concerne des sociétés ou associations agréées. Le logiciel doit pouvoir distinguer amateur, bénévole, prestataire et salarié, et suivre les pièces applicables ; un simple statut « joueur » ne suffit pas. [Règles présentées par le ministère de l'Économie](https://www.economie.gouv.fr/particuliers/numerique-et-cybersecurite/esport-peut-devenir-joueur-professionnel-en-france).

**8. Permissions, confidentialité et conservation**

La séparation actuelle Personne/Compte est saine et explicitement voulue dans les plans. Il ne faut pas associer automatiquement deux fiches sur la base du nom, du pseudo ou de l'email. En revanche, l'espace personnel futur exige une règle d'attribution fiable : liaison explicite vérifiée, ou droits attribués directement aux comptes destinataires. C'est une décision nouvelle à cadrer avant ce module, pas une correction à appliquer silencieusement au répertoire actuel.

Les périmètres métier doivent couvrir la personne, l'équipe, l'entité juridique et les exceptions sensibles. Être dans la même saison ne donne pas accès aux données de toutes les équipes ; être mentionné dans un débrief ne donne pas automatiquement accès à toutes les notes du coach. Les droits de consultation, saisie, approbation, export et publication sont distincts.

Quelques points à corriger avant activation :

- La navigation planifiée de Réunions et Matchs utilise des permissions de modification pour l'entrée principale. Prévoir un véritable accès de consultation pour participants et lecteurs.
- Un demandeur doit pouvoir suivre sa note de frais sans posséder le droit d'approbation financière.
- Un responsable de modèles de contrats n'a pas besoin d'être administrateur technique des paramètres.
- L'appartenance au bureau/direction ne doit pas accorder par défaut l'administration des comptes et de la sécurité. Les fonctions métier et rôles techniques sont deux axes.
- Contrôler également titres, compteurs, résultats de recherche, exports, notifications, fichiers et publications, pas seulement la fiche détaillée.
- Distinguer signalement, instruction et sanction confirmée ; les anciennes idées d'actualité automatique sur les bans/incidents demandent une validation d'audience et de contenu.
- Conserver un historique métier durable séparé de l'audit technique soumis à purge ; ne pas utiliser le journal comme unique preuve d'un contrat ou paiement.

La conformité ne se résume pas à une case « consentement RGPD ». Il faut préciser finalités, base légale, accès, conservation, exercice des droits et destinataires ; les autorisations d'image et les situations des mineurs demandent leurs propres règles. Le consentement n'est qu'une base légale parmi les six possibles. [CNIL : bases légales](https://www.cnil.fr/fr/les-bases-legales/liceite-essentiel-sur-les-bases-legales) ; [guide pour les associations](https://www.cnil.fr/fr/thematiques/la-cnil-publie-un-nouveau-guide-pour-accompagner-les-associations).

Les dossiers mineurs doivent, si nécessaires, relier le représentant habilité, le périmètre de l'autorisation, sa preuve et sa période. Les exigences de participation dépendent aussi du jeu et de la compétition. Une licence/affiliation ne doit pas être imposée uniformément à tout l'esport.

L'archivage n'autorise pas une conservation infinie. Une suppression de compte ne doit pas détruire un contrat à conserver ; inversement, un historique technique ne justifie pas de conserver toutes les anciennes coordonnées. Définir les règles par objet et inclure les pièces jointes et restaurations dans leur mise en œuvre.

**9. Arborescence conseillée à terme**

Huit pôles suffisent pour la cible proposée. Un utilisateur ne voit que ceux qui servent à ses activités autorisées. Les sous-vues ci-dessous ne sont pas toutes des entrées supplémentaires de sidebar.

| Pôle | Lieux de travail | Vues/onglets principaux |
| --- | --- | --- |
| Aujourd'hui | Mon travail | Tâches, planning personnel, à valider, documents attendus, rappels ; notifications via la cloche et la boîte complète. |
| Personnes | Répertoire ; Candidatures ; Arrivées & départs | Adhésions, engagements et affectations ; vue restreinte RH si besoin. |
| Esport | Équipes & saisons ; Planning ; Compétitions ; Préparation ; Performance | Jeux, rosters, entraînements, scrims, disponibilités, convocations, analyses vidéo et objectifs. |
| Activité | Projets & tâches ; Calendrier ; Réunions ; Débriefs ; Actualité ; Ressources & logistique | Événements physiques, matériel, déplacements. Communication dans les projets au départ ; espace dédié si nécessaire. |
| Relations | Organisations ; Partenariats & opportunités | Contacts, relations datées, négociations, livrables, échéances, comptes rendus partenaires ; clients/fournisseurs selon l'activité. |
| Structure | Gouvernance & décisions ; Documents ; Contrats ; Conformité ; Incidents | Identité juridique, mandats, assemblées, assurances, droits et obligations. Documents/Contrats peuvent partager un lieu au début. |
| Finances | Comptes & rapprochement ; Opérations ; Facturation & achats ; Notes de frais ; Budget & pilotage ; Contrôles | Cotisations, sponsoring, gains, validations, exports et périodes clôturées. |
| Système | Comptes utilisateurs ; Journal ; Paramètres techniques ; Automatisations ; Données & intégrations | Connexions, modèles techniques, maintenance, sauvegardes et imports/exports autorisés. |

Recherche et compte restent accessibles globalement. La feuille de route peut rejoindre une entrée globale « Projet / À venir » pendant le développement.

Les règles « jamais de filtre dans le menu » et « six entrées maximum » doivent rester des heuristiques, pas empêcher un bon parcours. Une vue filtrée peut devenir un accès utile si elle correspond à un travail fréquent ; à l'inverse, créer une page pour chaque type de recette n'aide pas. Les liens profonds vers onglets et filtres doivent rester partageables.

**10. Faire de `/feuille-de-route` un outil de décision**

Actuellement, la page présente le catalogue prévu mais pas les priorités, dépendances ni critères de livraison. Deux détails concrets prêtent à confusion :

- Le texte dit « visibles selon vos droits actuels », alors que `getPlannedNavigationSpaces` expose volontairement tout le catalogue aux utilisateurs authentifiés. Ce n'est pas une preuve de fuite de données métier : les cartes sont informatives. Le texte doit expliquer le comportement réel.
- Le compteur mélange les cartes principales et leurs enfants. Afficher « 23 modules, 46 éléments prévus », ou choisir une autre unité clairement définie.

Une carte de feuille de route devrait préciser :

| Information | Exemple |
| --- | --- |
| Problème résolu | Éviter les inscriptions de roster inéligibles ou tardives. |
| Utilisateurs concernés | Manager et coach. |
| Destination cible | Esport → Compétitions. |
| Type | Module, extension d'un module existant, onglet ou intégration. |
| État réel | À cadrer, spécifié, en construction, livré partiellement, livré, reporté ou abandonné. |
| Priorité et déclencheur | Avant la prochaine campagne d'inscriptions. |
| Dépendances | Équipes, saisons, personnes et droits par équipe. |
| Première version | Inscription, échéance, roster enregistré et pièces. |
| Extensions | Import depuis organisateur, synchronisation des résultats. |
| Critères de fin | Parcours utilisable, droits vérifiés, audit, états vides/erreurs et sauvegarde des données. |
| Référence et date | Fiche de conception courante, responsable de la décision et dernière revue. |

La feuille de route doit également montrer les extensions de pages déjà livrées : le répertoire existe, mais pas les adhésions ; Mon compte existe, mais pas l'espace joueur ; la recherche existe, mais pas la recherche des dossiers métier. Un simple état live/planned à l'échelle de la page masque ces différences.

Le catalogue produit doit distinguer explicitement les futures destinations de menu des capacités qui deviendront des onglets ou filtres. Aujourd'hui, les deux sont décrites par les mêmes objets de navigation : passer simplement tous les enfants en « live » risquerait de recréer les sous-menus que les documents veulent absorber. Partager des identifiants est utile ; imposer exactement la même structure au menu et à la feuille de route ne l'est pas.

Les cartes peuvent ouvrir une fiche de cadrage en lecture seule sans créer de fausses pages métier. Priorités et dépendances sont plus utiles qu'une date de livraison arbitraire.

**11. Ordre de construction recommandé**

| Étape | Livrable utile | Pourquoi cet ordre |
| --- | --- | --- |
| 1. Cadrage commun | Catalogue à jour, propriétaires des données, contexte juridique, périodes, permissions et règles de conservation. | Évite les refontes coûteuses de relations et de finances. |
| 2. Quotidien sportif | Équipes/saisons, affectations, planning, disponibilités et convocations ; articulation explicite avec la source publique. | Apporte rapidement une utilité aux joueurs et coachs. |
| 3. Vie de structure | Documents versionnés, acceptations personnelles, candidatures, arrivées/départs, réunions et tâches partagées. | Sécurise les engagements et rend les actions suivables. |
| 4. Relations et finances | Organisations, accords, contrats, comptes, règlements, facturation/import de factures, frais et validations. | À avancer si ces flux existent déjà ; l'argent engagé détermine la priorité réelle. |
| 5. Pilotage | Budget, rapprochement, gains/primes, livrables sponsors, synthèses de direction et préparation sportive. | Les rapports reposent alors sur des données fiables. |
| 6. Extensions | Statistiques avancées, communication dédiée, intégrations, automatisations et coexistence multi-entités. | À déclencher selon volume et usages, sans tout construire à l'avance. |

Ce n'est pas un planning calendaire. Conformité, documents indispensables, obligations existantes et finances déjà actives passent avant l'ordre indicatif. L'espace personnel se remplit au fil des modules : il ne faut pas attendre de concevoir toutes les finances et tout l'esport pour le rendre utile.

Les rappels automatiques doivent préciser leur mode d'exécution. L'architecture actuelle évite un processus permanent supplémentaire mais prévoit déjà une maintenance ponctuelle planifiée ; cela permet de cadrer des traitements programmés sans transformer tout de suite l'infrastructure. Prévoir les reprises après panne, doublons, erreurs et changement de droits avant les envois externes.

**12. Scénarios de validation à conserver pour les futurs modules**

| Scénario | Résultat attendu |
| --- | --- |
| Un joueur change d'équipe en milieu de saison. | Ses anciennes participations restent rattachées à l'ancien roster ; les droits actuels et l'accès historique suivent une règle explicite. |
| Une personne est adhérente, joueuse et prestataire. | Une identité, trois relations indépendantes avec leurs dates et documents. |
| Un candidat revient un an après un refus. | Nouvelle candidature liée à la même identité, historique conservé selon sa politique et accès limité. |
| Un sponsor est aussi fournisseur et négocie un nouvel accord. | Plusieurs relations/opportunités ; la négociation n'efface pas l'accord actif. |
| Une facture est payée en plusieurs fois. | Solde restant exact, paiements rapprochés, pas de duplication du revenu. |
| Une cotisation est exonérée ou partiellement réglée. | Adhésion, somme due et encaissement restent distincts. |
| Un gain annoncé est diminué ou jamais versé. | Prévision et montant effectivement encaissé restent différenciés. |
| Une personne quitte la structure. | Accès révoqués, matériel suivi, contrats traités et données conservées/supprimées selon leur propre règle. |
| Un document accepté reçoit une nouvelle version. | L'ancienne preuve reste attachée à l'ancienne version ; nouvelle demande explicite si nécessaire. |
| Un coach consulte un dossier financier ou disciplinaire d'un joueur. | L'appartenance à l'équipe ne contourne pas les droits spécifiques. |
| Une société est créée pendant que l'association continue. | Chaque contrat, compte et flux a une entité porteuse identifiable ; aucune réécriture de l'historique. |
| Le site public est indisponible ou un import est rejoué. | Les données privées restent exploitables selon le contrat de synchronisation, sans doublons ni publication non validée. |
| Une sauvegarde est restaurée après un départ ou une demande d'effacement. | Vérification des accès, clés, fichiers et règles de suppression/retrait avant remise en service. |

**13. Traçabilité des constats et vérifications**

| Source locale | Constats fondés sur cette source |
| --- | --- |
| `apps/web/src/shared/constants/app.constants.ts` | 54 entrées, 46 planifiées, 23 cartes ; répartition des pôles ; catalogue complet pour tout compte authentifié ; droits planifiés des entrées. |
| `apps/web/src/app/feuille-de-route/page.tsx` | Présentation non interactive, compteur, badges enfants et texte sur les droits. |
| `apps/web/src/shared/constants/feature-registry.constants.ts` | Fonctionnalités développées et libellés ; recherche toujours rattachée dans l'audit au libellé historique « Tableau de bord ». |
| `apps/web/src/app/systeme/[[...slug]]/page.tsx` et `tableau-de-bord/[[...slug]]/page.tsx` | Routes non livrées rejetées, paramètres/journal actifs, ancien accueil redirigé. |
| `apps/web/src/features/dashboard/components/DashboardPageClient.tsx` | Accueil actuellement centré sur sécurité des comptes et activité récente. |
| `apps/web/src/features/search/search-catalog.ts` | Recherche dans le catalogue des pages, pas un moteur de recherche métier. |
| `apps/web/src/features/settings/system-settings-page.helpers.ts` | Trois paramètres exposés ; pas encore de profil juridique/saison/exercice. |
| `apps/web/src/components/Sidebar.tsx` | Compte accessible dans le pied de sidebar. |
| `packages/database/prisma/schema.prisma` | Personne/Compte indépendants ; statut Personne limité à dedans/dehors ; absence des objets juridiques, sportifs et financiers futurs. |
| `docs/NAVIGATION.md` | Cible simplifiée, anciens volumes et correspondances ; mélange persistant des notions de menu, vue et objet métier. |
| `docs/STRUCTURE.md` | Substitutions de vocabulaire et finance unifiée à revoir. |
| `docs/FEUILLE_DE_ROUTE.md` | Préparation et espace personnel déjà décidés ; module partenaire encore présenté comme entité existante ; ordre sportif tardif. |
| `features/pages/MATRICE_PREPARATION.md` | Statuts dépassés d'Actualité et Paramètres, routes inexistantes décrites comme présentes, ancienne nomenclature. |
| `features/pages/bureau-juridique/sponsors-partenaires.md` | Mémoire du module retiré, modèle relationnel détaillé, exclusions V1, limites d'un statut unique à long terme. |
| `PLAN_PERSONNES_IDENTITE.md` et `PLAN_REUNIONS.md` | Absence volontaire de lien Personne/Compte ; décisions déjà cadrées à respecter puis faire évoluer explicitement. |
| `docs/OPERATIONS.md` et scripts de base | Sauvegarde/restauration et maintenance déjà prévues techniquement ; ne pas les présenter comme totalement absentes. |

Vérifications exécutées : extraction directe du catalogue de navigation, inventaire des fichiers de page et deux passages ciblés des tests existants, soit **7 fichiers et 60 tests réussis** : navigation (constantes et utilitaires), contrats de sidebar, route Système, recherche globale, présentation de recherche et présentation des paramètres. Deux noms de tests proposés au premier passage n'existaient pas ; seuls les trois fichiers effectivement exécutés ont été comptabilisés, puis les quatre autres fichiers existants au second passage.

Ces tests confirment les contrats techniques couverts ; ils ne prouvent pas que la future organisation métier est correcte ou que tous les parcours déployés fonctionnent. Aucun test métier n'a été inventé pour des fonctionnalités absentes.

**Décision de synthèse proposée**

Conserver la base existante et la plupart des fonctions prévues. Ajouter un pôle Structure, recentrer Relations sur l'externe, déplacer matériel/logistique vers Activité et validations quotidiennes vers Mon travail. Rendre explicites les parcours esport essentiels, la gouvernance, la conformité, les relations datées et la finance structurée. Supprimer surtout les doublons et les pages intermédiaires ; conserver les métiers qu'ils étaient censés porter. Mettre ensuite les références d'accord avant la construction du prochain module.
