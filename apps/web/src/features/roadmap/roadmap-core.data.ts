import type { RoadmapItem } from './roadmap.types';

export const CORE_ROADMAP_ITEMS: readonly RoadmapItem[] = [
  {
    area: 'today',
    audience: 'Tous les membres',
    baseline:
      'L’accueil existe ; les vues métier personnelles restent à construire.',
    dependsOn: ['access-scopes', 'sport-planning', 'documents', 'tasks'],
    description:
      'Retrouver ce qui me concerne sans accéder à tous les dossiers.',
    doneWhen:
      'Chaque action renvoie à sa source et respecte les droits du destinataire.',
    firstRelease:
      'Tâches, planning personnel, documents attendus, rappels et éléments à valider.',
    id: 'personal-work',
    kind: 'extension',
    later: 'Mes frais, mon matériel et mes cotisations au fil des modules.',
    legacyHrefs: [
      '/tableau-de-bord/mes-taches',
      '/tableau-de-bord/prochaines-reunions',
      '/tableau-de-bord/documents-a-accepter',
      '/tableau-de-bord/alertes-importantes',
      '/tableau-de-bord/mes-rappels',
    ],
    phase: 3,
    status: 'partial',
    title: 'Mon travail & espace personnel',
  },
  {
    area: 'today',
    audience: 'Tous les membres selon leurs accès',
    baseline:
      'Une première boîte de notifications avait été livrée ; elle a été retirée le temps de clarifier le design et les canaux attendus.',
    dependsOn: ['access-scopes'],
    description:
      'Informer une personne des faits qui la concernent sans multiplier les écrans.',
    doneWhen:
      'Chaque message a une source, des destinataires autorisés et un canal décidé ; aucune donnée confidentielle ne fuit.',
    firstRelease:
      'Boîte personnelle, états lu et archivé, liens vers la source et réglage de conservation.',
    id: 'notifications',
    kind: 'module',
    later:
      'Canaux email ou Discord, préférences par personne et modèles par module.',
    phase: 3,
    status: 'planned',
    title: 'Notifications personnelles',
  },
  {
    area: 'people',
    audience: 'Direction, responsables d’équipe et secrétariat',
    baseline:
      'Le répertoire gère déjà les identités, les coordonnées et la présence dans la structure. Les adhésions et les rôles métier restent à construire.',
    dependsOn: ['legal-entities', 'access-scopes'],
    description:
      'Suivre les engagements et les rôles de chaque membre dans le temps.',
    doneWhen:
      'Changer un rôle conserve son historique et ne crée pas une nouvelle identité.',
    firstRelease:
      'Adhésions, campagnes, rôles et affectations datés, rattachés aux fiches du répertoire et distincts des droits du compte de connexion.',
    id: 'person-relationships',
    kind: 'extension',
    later:
      'Dossiers RH restreints selon les besoins ; liaison à un outil de paie.',
    legacyHrefs: [
      '/vie-interne/membres-adherents',
      '/vie-interne/membres',
      '/vie-interne/adherents',
      '/bureau-juridique/personnes-contacts',
    ],
    phase: 2,
    status: 'partial',
    title: 'Adhésions et rôles',
  },
  {
    area: 'people',
    audience: 'Managers, coachs et recruteurs',
    dependsOn: ['person-relationships', 'sport-teams'],
    description: 'Suivre les candidatures jusqu’à la décision et à l’arrivée.',
    doneWhen:
      'Une personne peut candidater plusieurs fois sans dupliquer son identité.',
    firstRelease:
      'Poste ou équipe visée, essais, évaluations confidentielles et décision.',
    id: 'recruitment',
    kind: 'module',
    later: 'Campagnes et formulaire public avec contrôle des données reçues.',
    legacyHrefs: [
      '/vie-interne/recrutement-tryouts',
      '/sport-team-control/recrutement-tryouts',
    ],
    phase: 3,
    status: 'planned',
    title: 'Recrutement',
  },
  {
    area: 'people',
    audience: 'Responsables des membres et administrateurs habilités',
    dependsOn: ['person-relationships', 'documents', 'tasks'],
    description: 'Éviter les oublis de documents, d’accès ou de matériel.',
    doneWhen:
      'Un départ suit accès et restitutions sans effacer les faits à conserver.',
    firstRelease:
      'Checklists datées, responsables, étapes et vue collective des dossiers ouverts.',
    id: 'onboarding',
    kind: 'module',
    later: 'Actions sur les services connectés après validation.',
    legacyHrefs: ['/vie-interne/onboarding-depart'],
    phase: 3,
    status: 'planned',
    title: 'Arrivées et départs',
  },
  {
    area: 'esport',
    audience: 'Managers et coachs',
    dependsOn: ['person-relationships'],
    description:
      'Connaître les effectifs et conserver leurs compositions dans le temps.',
    doneWhen:
      'Un changement de roster ne modifie pas les anciennes rencontres.',
    firstRelease:
      'Jeux, saisons, équipes, rosters datés, titulaires, remplaçants et staff.',
    id: 'sport-teams',
    kind: 'module',
    later: 'Prêts et règles d’affectation propres aux compétitions.',
    legacyHrefs: [
      '/sport-team-control',
      '/sport-team-control/jeux',
      '/sport-team-control/rosters',
      '/sport-team-control/membres-esport',
    ],
    phase: 2,
    status: 'planned',
    title: 'Équipes & saisons',
  },
  {
    area: 'esport',
    audience: 'Joueurs, coachs et managers',
    dependsOn: ['sport-teams'],
    description: 'Trouver des créneaux et savoir qui participera.',
    doneWhen:
      'Les conflits et fuseaux sont explicites ; chaque convocation reste liée à son événement.',
    firstRelease:
      'Entraînements, scrims, disponibilités, convocations et confirmations par équipe.',
    id: 'sport-planning',
    kind: 'module',
    later: 'Présences, récurrence avancée et vues liées aux compétitions.',
    legacyHrefs: [
      '/sport-team-control/scrims',
      '/sport-team-control/calendrier-esport',
    ],
    phase: 2,
    status: 'planned',
    title: 'Planning & disponibilités',
  },
  {
    area: 'esport',
    audience: 'Managers, coachs et joueurs concernés',
    dependsOn: ['sport-teams', 'sport-planning'],
    description:
      'Préparer les inscriptions et suivre les rencontres officielles.',
    doneWhen:
      'Tournoi, inscription, match et résultat restent distincts et traçables.',
    firstRelease:
      'Tournois, inscriptions, échéances, règlements, éligibilité, roster enregistré, matchs et résultats.',
    id: 'competitions',
    kind: 'module',
    later: 'Liens vers déplacements, frais et gains confirmés.',
    legacyHrefs: ['/sport-team-control/tournois-matchs'],
    phase: 3,
    status: 'planned',
    title: 'Compétitions & inscriptions',
  },
  {
    area: 'esport',
    audience: 'Coachs et joueurs autorisés',
    dependsOn: ['sport-planning', 'debriefs'],
    description:
      'Garder les consignes et analyses privées dans leur contexte sportif.',
    doneWhen:
      'Chaque préparation précise son événement, son audience et les actions à travailler.',
    firstRelease:
      'Objectifs de séance, plans de jeu, liens vidéo et annotations.',
    id: 'preparation',
    kind: 'module',
    later: 'Bibliothèque de stratégies par jeu et modèles de revue.',
    phase: 5,
    status: 'planned',
    title: 'Préparation & analyse vidéo',
  },
  {
    area: 'esport',
    audience: 'Coachs, managers et joueurs concernés',
    dependsOn: ['competitions', 'debriefs'],
    description:
      'Suivre la progression individuelle et collective avec son contexte.',
    doneWhen:
      'Chaque indicateur possède une période, une source et une visibilité définies.',
    firstRelease:
      'Objectifs par saison, évaluations et indicateurs documentés par jeu.',
    id: 'performance',
    kind: 'module',
    later: 'Imports de statistiques fiables et comparaisons contextualisées.',
    legacyHrefs: ['/sport-team-control/performance'],
    phase: 5,
    status: 'planned',
    title: 'Performance & objectifs',
  },
  {
    area: 'structure',
    audience: 'Direction et responsables administratifs',
    dependsOn: [],
    description:
      'Préparer l’évolution de l’association et une éventuelle société.',
    doneWhen:
      'Chaque futur contrat et compte financier a une entité porteuse ; l’historique reste inchangé.',
    firstRelease:
      'Entité porteuse, identifiants, règles datées, assurances et responsabilités.',
    id: 'legal-entities',
    kind: 'module',
    later:
      'Coexistence association/société et transferts documentés quand nécessaires.',
    phase: 1,
    status: 'planned',
    title: 'Identité juridique & périmètres',
  },
  {
    area: 'structure',
    audience: 'Direction, bureau et personnes mandatées',
    dependsOn: ['legal-entities', 'documents', 'meetings'],
    description:
      'Savoir qui peut décider et retrouver les décisions engageant la structure.',
    doneWhen:
      'Les décisions conservent instance, auteur, date, portée et preuve.',
    firstRelease: 'Instances, mandats, délégations, décisions et pièces liées.',
    id: 'governance',
    kind: 'module',
    later: 'Assemblées, votes et registres adaptés à la forme juridique.',
    legacyHrefs: ['/bureau-juridique/decisions-bureau'],
    phase: 3,
    status: 'planned',
    title: 'Gouvernance & décisions',
  },
  {
    area: 'structure',
    audience: 'Responsables documentaires et destinataires',
    dependsOn: ['legal-entities', 'access-scopes'],
    description: 'Publier la bonne version et suivre les actions attendues.',
    doneWhen:
      'Une acceptation vise une version précise et reste distincte d’une signature contractuelle.',
    firstRelease:
      'Bibliothèque, versions publiées, modèles et demandes de lecture ou d’acceptation.',
    id: 'documents',
    kind: 'module',
    later: 'Campagnes de relance et intégration de signature selon le besoin.',
    legacyHrefs: [
      '/bureau-juridique/documents',
      '/bureau-juridique/documents-officiels',
      '/bureau-juridique/acceptation-chartes',
      '/systeme/modeles-documents',
    ],
    phase: 3,
    status: 'planned',
    title: 'Documents & acceptations',
  },
  {
    area: 'structure',
    audience: 'Direction, responsables contractuels et finances',
    dependsOn: ['documents', 'person-relationships'],
    description: 'Suivre les engagements au-delà du fichier signé.',
    doneWhen:
      'Les pièces signées et conditions historiques ne sont pas réécrites après un changement.',
    firstRelease:
      'Parties, entité signataire, période, obligations, avenants, échéances et pièces.',
    id: 'contracts',
    kind: 'module',
    later: 'Signature externe et renouvellements guidés.',
    legacyHrefs: ['/bureau-juridique/contrats'],
    phase: 4,
    status: 'planned',
    title: 'Contrats & obligations',
  },
  {
    area: 'structure',
    audience: 'Responsables habilités et représentants concernés',
    dependsOn: ['legal-entities', 'access-scopes'],
    description:
      'Cadrer les usages des données et les autorisations nécessaires.',
    doneWhen:
      'Les règles précèdent la collecte ; chaque autorisation précise son objet et sa période.',
    firstRelease:
      'Finalités, accès, conservation, demandes de droits et preuves d’autorisation selon le besoin.',
    id: 'compliance',
    kind: 'module',
    later:
      'Représentants habilités, échéances d’autorisation et contrôles documentaires.',
    phase: 1,
    status: 'planned',
    title: 'Confidentialité, image & mineurs',
  },
  {
    area: 'structure',
    audience: 'Personnes expressément habilitées',
    dependsOn: ['person-relationships', 'compliance'],
    description:
      'Traiter les signalements avec confidentialité et traçabilité.',
    doneWhen:
      'Les signalements, sanctions internes et bans externes sont distingués.',
    firstRelease:
      'Signalement, faits, preuves, instruction, décision, recours et durée.',
    id: 'incidents',
    kind: 'module',
    later: 'Liens restreints vers personnes, équipes et compétitions.',
    legacyHrefs: ['/bureau-juridique/incidents-sanctions'],
    phase: 3,
    status: 'planned',
    title: 'Incidents & sanctions',
  },
  {
    area: 'system',
    audience: 'Administrateurs habilités et responsables métier',
    baseline:
      'L’authentification, les permissions et les comptes existent ; les périmètres métier restent à définir.',
    dependsOn: [],
    description:
      'Adapter les droits aux personnes, équipes et dossiers concernés.',
    doneWhen:
      'Le serveur contrôle les périmètres ; aucun lien Personne/Compte n’est déduit d’un email.',
    firstRelease:
      'Périmètres par entité/équipe, fonctions métier distinctes du rôle technique et attribution explicite des ressources personnelles.',
    id: 'access-scopes',
    kind: 'extension',
    later: 'Délégations datées et revue périodique des accès.',
    phase: 1,
    status: 'partial',
    title: 'Accès & responsabilités métier',
  },
  {
    area: 'today',
    audience: 'Approbateurs habilités',
    dependsOn: ['access-scopes'],
    description:
      'Retrouver les décisions attendues dans son travail quotidien.',
    doneWhen:
      'Une modification importante invalide la validation selon les règles du dossier.',
    firstRelease:
      'File personnelle et vues métier pour documents, dépenses et autres demandes.',
    id: 'approvals',
    kind: 'view',
    later: 'Seuils, délégations et remplacement d’un approbateur.',
    legacyHrefs: ['/systeme/validations'],
    phase: 3,
    status: 'planned',
    title: 'À valider',
  },
];
