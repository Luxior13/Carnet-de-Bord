# Feuille de route — priorités de construction

Référence produit révisée le 22 septembre 2026. La page `/feuille-de-route` présente **37 chantiers, 8 pôles cibles et 6 étapes**. Un chantier peut être un module, une extension, une vue partagée ou une intégration ; ce nombre ne représente pas 37 nouvelles pages.

Le catalogue exécutable se trouve dans [features/roadmap](../apps/web/src/features/roadmap/roadmap.constants.ts). Ce document fixe les décisions ; la [matrice](../features/pages/MATRICE_PREPARATION.md) conserve la correspondance avec les anciens projets de pages. Lors d’une modification de priorité ou de périmètre, mettre ces trois références à jour ensemble.

## État réel et lecture du plan

Les comptes et leur sécurité, le répertoire, l’actualité interne, les notifications, le journal d’activité, les paramètres techniques et la recherche de pages existent. Les paramètres actuels ne constituent pas encore un profil juridique métier. La recherche ne parcourt pas encore les futurs dossiers métier.

Le module partenaires a été retiré le 21 septembre 2026 : sa reconstruction est planifiée. Les migrations historiques ne prouvent pas qu’un modèle ou un écran est encore présent.

- **À cadrer** : nouveau périmètre, non livré.
- **À compléter** : une base existe ; la carte précise ce qui reste à construire.
- Les étapes sont un ordre de priorité, sans dates promises. Les prérequis d’une carte doivent être traités, y compris ceux de la même étape.
- Un besoin urgent déjà réel peut modifier cet ordre : échéance documentaire, suivi des mineurs ou paiement à traiter.
- La présente refonte organise le plan et la navigation ; elle ne livre aucun de ces nouveaux modules métier.

## Décisions structurantes

1. **Huit pôles** : Aujourd’hui, Membres, Esport, Activité, Relations, Structure, Finances, Système. Le menu n’affiche que les pôles ayant des fonctions livrées et accessibles.
2. **Esport dès l’étape 2** : équipes, saisons, effectifs, disponibilités et convocations avant les analyses avancées.
3. **Personne et compte restent distincts**. Les adhésions, mandats, contrats et affectations sont des relations datées, pas un statut unique. Aucun rapprochement automatique par email.
4. **Préparer plusieurs entités juridiques**, avec leurs dossiers et historiques propres, tout en commençant par l’association réellement utilisée. Une évolution vers une société ne renomme pas les anciens engagements.
5. **Distinguer facture, paiement, note de frais et budget** : ils ont leurs propres états et liens. Un PDF ne remplace pas le cycle de vie d’une facture.
6. **Une source par donnée, plusieurs vues possibles** : planning personnel et calendrier général consultent les événements du module d’origine ; les validations appliquent ses règles.
7. **Livrer le contrôle d’accès avec chaque module** : politique serveur, confidentialité, audit, états d’erreur et tests pertinents.
8. **L’espace personnel évolue avec les modules**, sans construire un tableau de bord rempli de fonctions indisponibles.

## Regroupements et retraits

| Ancienne présentation | Décision |
| --- | --- |
| Membres, adhérents, contacts, staff | Une identité au Répertoire ; relations et historiques dédiés, vues filtrées |
| Mes tâches et tâches internes | Même source, vues personnelles et collectives |
| Prochaines réunions, rappels, alertes | Vues de Mon travail et notifications ; la source garde son échéance |
| Calendriers interne et esport | Événements métier d’origine, calendrier partagé en projection |
| Préparation match/scrim, stratégie, VOD | Un espace Préparation avec vues adaptées |
| Recettes et dépenses | Filtres des règlements ; factures et demandes de remboursement restent distinctes |
| Cotisations | Adhésion/campagne chez Membres, montant attendu et règlement côté Finances |
| Sponsoring | Accord et livrables chez Relations, factures et règlements côté Finances |
| Validations globales | File personnelle transverse ; décision et permission contrôlées dans le module source |
| Archives, exports, modèles | Dans les modules propriétaires ; outils transverses limités à leur responsabilité |
| Incidents | Structure, dossier confidentiel ; seuls les effets autorisés remontent dans les fiches |
| Matériel et accès confiés | Activité, avec attributions et restitutions ; ne contient pas de mots de passe |
| Accueils de pôle vides | Pas de page autonome sans synthèse utile |
| Messagerie interne | Pas de chantier dédié actuellement ; intégrations de communication en étape 6 |

## 1. Fondations métier

Clarifier la structure, les périmètres d’accès et les règles communes.

- **Identité juridique & périmètres** (Structure) : Entité porteuse, identifiants, règles datées, assurances et responsabilités.
- **Confidentialité, image & mineurs** (Structure) : Finalités, accès, conservation, demandes de droits et preuves d’autorisation selon le besoin.
- **Accès & responsabilités métier** (Système) : Périmètres par entité/équipe, fonctions métier distinctes du rôle technique et attribution explicite des ressources personnelles.

## 2. Quotidien esport

Organiser les équipes, les disponibilités et les convocations.

- **Adhésions et rôles** (Membres) : Adhésions, campagnes, rôles et affectations datés ; distinction avec le compte de connexion.
- **Équipes & saisons** (Esport) : Jeux, saisons, équipes, rosters datés, titulaires, remplaçants et staff.
- **Planning & disponibilités** (Esport) : Entraînements, scrims, disponibilités, convocations et confirmations par équipe.

## 3. Vie de structure

Suivre les documents, les personnes, les réunions et les actions.

- **Mon travail & espace personnel** (Aujourd’hui) : Tâches, planning personnel, documents attendus, rappels et éléments à valider.
- **Recrutement** (Membres) : Poste ou équipe visée, essais, évaluations confidentielles et décision.
- **Arrivées et départs** (Membres) : Checklists datées, responsables, étapes et vue collective des dossiers ouverts.
- **Compétitions & inscriptions** (Esport) : Tournois, inscriptions, échéances, règlements, éligibilité, roster enregistré, matchs et résultats.
- **Gouvernance & décisions** (Structure) : Instances, mandats, délégations, décisions et pièces liées.
- **Documents & acceptations** (Structure) : Bibliothèque, versions publiées, modèles et demandes de lecture ou d’acceptation.
- **Incidents & sanctions** (Structure) : Signalement, faits, preuves, instruction, décision, recours et durée.
- **À valider** (Aujourd’hui) : File personnelle et vues métier pour documents, dépenses et autres demandes.
- **Projets & tâches** (Activité) : Tâches assignées, échéances, statuts et liens vers le dossier source ; vue personnelle.
- **Calendrier commun** (Activité) : Vues personnelles, équipe et structure des événements et échéances autorisés.
- **Réunions & décisions de séance** (Activité) : Participants du répertoire, ordre du jour, compte rendu, décisions et tâches liées.
- **Débriefs** (Activité) : Points positifs, axes de progrès, audience et tâches liées à l’événement source.
- **Actualité interne & audiences** (Activité) : Audiences adaptées aux équipes et aux contenus liés ; annonces distinctes du journal.

## 4. Relations & finances

Relier les accords, les factures et les règlements.

- **Contrats & obligations** (Structure) : Parties, entité signataire, période, obligations, avenants, échéances et pièces.
- **Ressources & logistique** (Activité) : Inventaire, prêts, retours, maintenance, déplacements, LAN et bootcamps.
- **Organisations & contacts** (Relations) : Identité de l’organisation, interlocuteurs du répertoire et relations datées.
- **Partenariats & opportunités** (Relations) : Opportunités, responsables, engagements, livrables et échéances liés aux contrats.
- **Comptes & rapprochement** (Finances) : Exercices, comptes bancaires et caisses, titulaire, devise, soldes initiaux et relevés.
- **Opérations & règlements** (Finances) : Encaissements, décaissements, virements, justificatifs et affectations aux sommes dues.
- **Facturation & achats** (Finances) : Factures clients/fournisseurs, pièces, échéances et règlements ; émission ou import selon l’outil retenu.
- **Notes de frais & remboursements** (Finances) : Dossier, lignes de frais, justificatifs, décision et règlement.
- **Contrôles & clôtures** (Finances) : Validations, pièces manquantes, historique, exports et clôture d’exercice.
- **Données, imports & sauvegardes** (Système) : Imports contrôlés, exports autorisés, suivi des sauvegardes et procédures de restauration.

## 5. Pilotage & préparation

Exploiter des données fiables pour préparer et décider.

- **Préparation & analyse vidéo** (Esport) : Objectifs de séance, plans de jeu, liens vidéo et annotations.
- **Performance & objectifs** (Esport) : Objectifs par saison, évaluations et indicateurs documentés par jeu.
- **Budget & pilotage** (Finances) : Budgets versionnés, enveloppes par équipe/projet, écarts et prévisions de trésorerie.
- **Gains de compétition & primes** (Finances) : Montants annoncés, confirmés et reçus ; parts contractuelles et versements.
- **Recherche dans les dossiers** (Système) : Recherche métier progressive, extraits limités et liens vers les fiches.

## 6. Extensions selon les besoins

Automatiser et connecter les outils lorsque les usages le justifient.

- **Communication & contenus** (Activité) : Calendrier éditorial, ressources graphiques, audience et validation avant publication.
- **Rappels & automatisations** (Système) : Rappels métier, modèles de notification et règles limitées avec historique d’exécution.
- **Intégrations & publication publique** (Système) : Source officielle par donnée, identifiants stables et publication validée.

## Passage d’un chantier au menu

Avant livraison : préciser le responsable métier, les objets sources, le premier parcours utile, les permissions et périmètres, les documents conservés, les règles d’archivage et les critères de réussite. Les noms de modèles futurs restent indicatifs jusqu’à leur conception.

À la livraison : déclarer la fonctionnalité active, vérifier ses routes et politiques serveur, ajouter sa navigation, couvrir ses états vide/chargement/erreur/refus/conflit et mettre à jour le catalogue. Une ancienne URL planifiée ne devient pas disponible par simple ajout au menu.

Les automatisations, statistiques et connexions externes restent conditionnées aux usages, à la qualité des données et à un mode d’exploitation viable. La feuille de route n’engage aucun fournisseur ni changement d’infrastructure.

## Références

- [Navigation](NAVIGATION.md)
- [Structure et entités juridiques](STRUCTURE.md)
- [Rôles et périmètres](ROLES_ET_PERMISSIONS.md)
- [Permissions actives](PERMISSIONS.md)
- [Audit du 22 septembre](AUDIT_FEUILLE_DE_ROUTE_LONG_TERME_2026-09-22.md), photographie avant cette refonte
