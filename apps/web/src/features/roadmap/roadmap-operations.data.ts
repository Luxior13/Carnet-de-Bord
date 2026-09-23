import type { RoadmapItem } from './roadmap.types';

export const OPERATIONS_ROADMAP_ITEMS: readonly RoadmapItem[] = [
  {
    area: 'activity',
    audience: 'Tous les responsables d’actions',
    dependsOn: ['access-scopes'],
    description: 'Transformer les décisions et engagements en actions suivies.',
    doneWhen:
      'Une action issue d’une réunion reste la même tâche dans toutes ses vues.',
    firstRelease:
      'Tâches assignées, échéances, statuts et liens vers le dossier source ; vue personnelle.',
    id: 'tasks',
    kind: 'module',
    later: 'Projets, dépendances et suivi du temps si nécessaire.',
    phase: 3,
    status: 'planned',
    title: 'Projets & tâches',
  },
  {
    area: 'activity',
    audience: 'Tous les membres selon leurs accès',
    dependsOn: ['sport-planning'],
    description: 'Voir événements et échéances sans les recopier.',
    doneWhen:
      'Une date modifiée dans son module source se reflète dans le calendrier.',
    firstRelease:
      'Vues personnelles, équipe et structure des événements et échéances autorisés.',
    id: 'calendar',
    kind: 'view',
    later: 'Abonnements externes et récurrence avancée.',
    legacyHrefs: ['/vie-interne/calendrier-interne'],
    phase: 3,
    status: 'planned',
    title: 'Calendrier commun',
  },
  {
    area: 'activity',
    audience: 'Direction, staff et participants autorisés',
    dependsOn: ['person-relationships', 'tasks'],
    description: 'Préparer les réunions et conserver ce qui a été décidé.',
    doneWhen:
      'Les décisions restent reliées à la réunion et les actions à leurs responsables.',
    firstRelease:
      'Participants du répertoire, ordre du jour, compte rendu, décisions et tâches liées.',
    id: 'meetings',
    kind: 'module',
    later: 'Modèles, présences détaillées et export des comptes rendus.',
    legacyHrefs: ['/vie-interne/reunions', '/vie-interne/reunions-suivi'],
    phase: 3,
    status: 'planned',
    title: 'Réunions & décisions de séance',
  },
  {
    area: 'activity',
    audience: 'Coachs, staff et participants autorisés',
    dependsOn: ['tasks', 'sport-planning'],
    description:
      'Retrouver les retours après une séance, un match ou une réunion.',
    doneWhen:
      'Un seul débrief alimente les vues sportives et transversales avec les mêmes droits.',
    firstRelease:
      'Points positifs, axes de progrès, audience et tâches liées à l’événement source.',
    id: 'debriefs',
    kind: 'module',
    later: 'Modèles sportifs et synthèses de saison.',
    legacyHrefs: ['/vie-interne/debriefs', '/sport-team-control/debriefs'],
    phase: 3,
    status: 'planned',
    title: 'Débriefs',
  },
  {
    area: 'activity',
    audience: 'Direction, communication et membres',
    baseline:
      'Le fil d’actualité et les annonces internes sont déjà disponibles.',
    dependsOn: ['access-scopes'],
    description: 'Partager les informations utiles avec les bonnes personnes.',
    doneWhen:
      'Une annonce ne révèle pas un dossier confidentiel à une audience plus large.',
    firstRelease:
      'Audiences adaptées aux équipes et aux contenus liés ; annonces distinctes du journal.',
    id: 'internal-news',
    kind: 'extension',
    later: 'Annonces accompagnant certains événements métier après validation.',
    phase: 3,
    status: 'partial',
    title: 'Actualité interne & audiences',
  },
  {
    area: 'activity',
    audience: 'Managers, responsables matériel et participants',
    dependsOn: ['person-relationships', 'tasks'],
    description: 'Suivre le matériel et organiser les déplacements physiques.',
    doneWhen:
      'Chaque prêt conserve détenteur et dates ; les accès numériques restent distincts.',
    firstRelease:
      'Inventaire, prêts, retours, maintenance, déplacements, LAN et bootcamps.',
    id: 'logistics',
    kind: 'module',
    later: 'Réservations, garanties et liens vers dépenses et assurances.',
    legacyHrefs: ['/bureau-juridique/inventaire-acces'],
    phase: 4,
    status: 'planned',
    title: 'Ressources & logistique',
  },
  {
    area: 'activity',
    audience: 'Communication et responsables partenaires',
    dependsOn: ['tasks', 'compliance', 'partnerships'],
    description: 'Organiser les publications et engagements de visibilité.',
    doneWhen:
      'Chaque contenu a un responsable, les autorisations nécessaires et une validation.',
    firstRelease:
      'Calendrier éditorial, ressources graphiques, audience et validation avant publication.',
    id: 'communication',
    kind: 'module',
    later: 'Mesures de diffusion et connexions aux canaux externes.',
    phase: 6,
    status: 'planned',
    title: 'Communication & contenus',
  },
  {
    area: 'relations',
    audience: 'Direction, partenariats et finances',
    dependsOn: ['person-relationships'],
    description:
      'Retrouver partenaires, sponsors, clients et fournisseurs au même endroit.',
    doneWhen:
      'Une organisation peut être fournisseur et sponsor sans dupliquer sa fiche.',
    firstRelease:
      'Identité de l’organisation, interlocuteurs du répertoire et relations datées.',
    id: 'organizations',
    kind: 'module',
    later:
      'Relations simultanées, demandes de subvention et fusion contrôlée des doublons.',
    legacyHrefs: [
      '/bureau-juridique/partenaires',
      '/bureau-juridique/sponsors',
    ],
    phase: 4,
    status: 'planned',
    title: 'Organisations & contacts',
  },
  {
    area: 'relations',
    audience: 'Direction et responsables partenariats',
    dependsOn: ['organizations', 'contracts', 'tasks'],
    description:
      'Suivre les accords et ce qui est promis, livré ou à renouveler.',
    doneWhen:
      'Une négociation n’écrase pas un accord actif ; chaque livrable est suivi.',
    firstRelease:
      'Opportunités, responsables, engagements, livrables et échéances liés aux contrats.',
    id: 'partnerships',
    kind: 'module',
    later: 'Bilans partenaires, suivi des contreparties et renouvellements.',
    phase: 4,
    status: 'planned',
    title: 'Partenariats & opportunités',
  },
  {
    area: 'finance',
    audience: 'Trésorerie et direction autorisée',
    dependsOn: ['legal-entities'],
    description: 'Connaître les soldes réels et vérifier les mouvements.',
    doneWhen:
      'Un virement entre comptes ne crée pas de recette supplémentaire.',
    firstRelease:
      'Exercices, comptes bancaires et caisses, titulaire, devise, soldes initiaux et relevés.',
    id: 'accounts',
    kind: 'module',
    later: 'Rapprochement assisté avec les paiements importés.',
    legacyHrefs: ['/tresorerie/comptes'],
    phase: 4,
    status: 'planned',
    title: 'Comptes & rapprochement',
  },
  {
    area: 'finance',
    audience: 'Trésorerie',
    dependsOn: ['accounts', 'person-relationships', 'organizations'],
    description: 'Suivre l’argent réellement reçu ou versé et son origine.',
    doneWhen:
      'Engagement, somme due et règlement sont distincts ; les corrections sont tracées.',
    firstRelease:
      'Encaissements, décaissements, virements, justificatifs et affectations aux sommes dues.',
    id: 'payments',
    kind: 'module',
    later:
      'Vues cotisations, sponsoring, dons et subventions ; paiements partiels et relances.',
    legacyHrefs: [
      '/tresorerie/operations',
      '/tresorerie/recettes',
      '/tresorerie/depenses',
      '/tresorerie/cotisations-adherents',
      '/tresorerie/sponsoring-financier',
    ],
    phase: 4,
    status: 'planned',
    title: 'Opérations & règlements',
  },
  {
    area: 'finance',
    audience: 'Finances et responsables commerciaux',
    dependsOn: ['payments', 'contracts'],
    description:
      'Suivre factures, avoirs et échéances indépendamment des paiements.',
    doneWhen:
      'Une facture peut précéder le paiement et être réglée en plusieurs fois.',
    firstRelease:
      'Factures clients/fournisseurs, pièces, échéances et règlements ; émission ou import selon l’outil retenu.',
    id: 'invoices',
    kind: 'module',
    later:
      'Devis, échanges comptables et plateforme de facturation électronique adaptée.',
    legacyHrefs: ['/tresorerie/factures-justificatifs'],
    phase: 4,
    status: 'planned',
    title: 'Facturation & achats',
  },
  {
    area: 'finance',
    audience: 'Demandeurs et approbateurs financiers',
    dependsOn: ['payments', 'approvals'],
    description: 'Demander, approuver et suivre un remboursement.',
    doneWhen:
      'Le demandeur voit son dossier sans recevoir les droits de validation.',
    firstRelease:
      'Dossier, lignes de frais, justificatifs, décision et règlement.',
    id: 'expenses',
    kind: 'module',
    later: 'Barèmes et délégations selon les usages.',
    legacyHrefs: ['/tresorerie/remboursements'],
    phase: 4,
    status: 'planned',
    title: 'Notes de frais & remboursements',
  },
  {
    area: 'finance',
    audience: 'Direction et finances',
    dependsOn: ['payments', 'invoices'],
    description: 'Comparer prévisions, engagements et réalisé par activité.',
    doneWhen:
      'Les synthèses séparent trésorerie, résultat de gestion et états comptables.',
    firstRelease:
      'Budgets versionnés, enveloppes par équipe/projet, écarts et prévisions de trésorerie.',
    id: 'budget',
    kind: 'module',
    later: 'Rapports de gestion et échanges avec le cabinet comptable.',
    legacyHrefs: ['/tresorerie/budget', '/tresorerie/bilans'],
    phase: 5,
    status: 'planned',
    title: 'Budget & pilotage',
  },
  {
    area: 'finance',
    audience: 'Managers et finances',
    dependsOn: ['competitions', 'contracts', 'payments'],
    description: 'Suivre les gains confirmés et leur répartition.',
    doneWhen:
      'Un résultat sportif ne déclenche pas automatiquement un encaissement.',
    firstRelease:
      'Montants annoncés, confirmés et reçus ; parts contractuelles et versements.',
    id: 'prizes',
    kind: 'module',
    later: 'Paiements internationaux et rapports par saison.',
    phase: 5,
    status: 'planned',
    title: 'Gains de compétition & primes',
  },
  {
    area: 'finance',
    audience: 'Approbateurs et finances',
    dependsOn: ['payments', 'approvals'],
    description: 'Vérifier les dossiers et conserver les périodes clôturées.',
    doneWhen:
      'Exports et archives respectent entité, période et autorisations.',
    firstRelease:
      'Validations, pièces manquantes, historique, exports et clôture d’exercice.',
    id: 'finance-controls',
    kind: 'module',
    later: 'Transmissions comptables et contrôles de cohérence renforcés.',
    legacyHrefs: [
      '/tresorerie/validations-finance',
      '/tresorerie/exports-finance',
      '/tresorerie/journal-financier',
      '/tresorerie/archives-finance',
    ],
    phase: 4,
    status: 'planned',
    title: 'Contrôles & clôtures',
  },
  {
    area: 'system',
    audience: 'Responsables habilités',
    dependsOn: ['tasks', 'documents', 'access-scopes'],
    description: 'Exécuter les relances utiles et suivre leurs résultats.',
    doneWhen:
      'Une reprise ne crée pas de doublon et recontrôle les droits avant l’envoi.',
    firstRelease:
      'Rappels métier, modèles de notification et règles limitées avec historique d’exécution.',
    id: 'automations',
    kind: 'module',
    later: 'Canaux externes, reprise après erreur et règles supplémentaires.',
    legacyHrefs: [
      '/vie-interne/notifications-rappels',
      '/systeme/modeles',
      '/systeme/modeles-notifications',
      '/systeme/automatisations',
    ],
    phase: 6,
    status: 'planned',
    title: 'Rappels & automatisations',
  },
  {
    area: 'system',
    audience: 'Administrateurs et responsables d’import/export',
    baseline:
      'Les scripts de sauvegarde/restauration existent ; l’écran de suivi et les imports métier sont à construire.',
    dependsOn: ['legal-entities', 'access-scopes'],
    description: 'Reprendre et récupérer les données de manière fiable.',
    doneWhen:
      'Une restauration vérifie données, pièces et accès ; archives et sauvegardes restent distinctes.',
    firstRelease:
      'Imports contrôlés, exports autorisés, suivi des sauvegardes et procédures de restauration.',
    id: 'data',
    kind: 'extension',
    later: 'Recherche dans les archives avec les droits des modules sources.',
    legacyHrefs: ['/systeme/exports-sauvegardes', '/systeme/archives'],
    phase: 4,
    status: 'partial',
    title: 'Données, imports & sauvegardes',
  },
  {
    area: 'system',
    audience: 'Tous les membres selon leurs droits',
    baseline: 'La recherche globale actuelle retrouve les pages autorisées.',
    dependsOn: ['access-scopes', 'documents'],
    description:
      'Retrouver les personnes et documents autorisés depuis la recherche globale.',
    doneWhen:
      'Résultats, extraits et compteurs respectent les droits des fiches.',
    firstRelease:
      'Recherche métier progressive, extraits limités et liens vers les fiches.',
    id: 'business-search',
    kind: 'extension',
    later: 'Archives et autres dossiers au fil de leur livraison.',
    phase: 5,
    status: 'partial',
    title: 'Recherche dans les dossiers',
  },
  {
    area: 'system',
    audience: 'Responsables des données et administrateurs',
    dependsOn: ['sport-teams', 'organizations', 'data'],
    description: 'Relier le privé au site public et aux outils externes.',
    doneWhen:
      'Rejouer un import ne duplique pas les données et ne publie rien par défaut.',
    firstRelease:
      'Source officielle par donnée, identifiants stables et publication validée.',
    id: 'integrations',
    kind: 'integration',
    later:
      'Synchronisation, connexions comptables et autres outils nécessaires.',
    phase: 6,
    status: 'planned',
    title: 'Intégrations & publication publique',
  },
];
