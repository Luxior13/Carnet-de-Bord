import type {
  RoadmapArea,
  RoadmapItem,
  RoadmapKind,
  RoadmapPhase,
  RoadmapStatus,
} from './roadmap.types';
import { CORE_ROADMAP_ITEMS } from './roadmap-core.data';
import { OPERATIONS_ROADMAP_ITEMS } from './roadmap-operations.data';

export const ROADMAP_AREAS: readonly RoadmapArea[] = [
  {
    description: 'Mon planning, mes documents et les actions qui m’attendent.',
    icon: 'LayoutDashboard',
    id: 'today',
    label: 'Aujourd’hui',
    tone: 'dashboard',
  },
  {
    description:
      'Répertoire, adhésions, rôles, recrutement et parcours des membres.',
    icon: 'Users',
    id: 'people',
    label: 'Membres',
    tone: 'internal',
  },
  {
    description: 'Équipes, saisons, entraînements et compétitions.',
    icon: 'Activity',
    id: 'esport',
    label: 'Esport',
    tone: 'sport',
  },
  {
    description: 'Travail collectif, réunions, communication et logistique.',
    icon: 'CalendarClock',
    id: 'activity',
    label: 'Activité',
    tone: 'activity',
  },
  {
    description:
      'Organisations externes, partenariats et engagements commerciaux.',
    icon: 'Handshake',
    id: 'relations',
    label: 'Relations',
    tone: 'legal',
  },
  {
    description:
      'Identité juridique, gouvernance, documents et confidentialité.',
    icon: 'ShieldCheck',
    id: 'structure',
    label: 'Structure',
    tone: 'legal',
  },
  {
    description: 'Comptes, factures, paiements, budgets et contrôles.',
    icon: 'Wallet',
    id: 'finance',
    label: 'Finances',
    tone: 'treasury',
  },
  {
    description: 'Accès, configuration, données et intégrations.',
    icon: 'Settings',
    id: 'system',
    label: 'Système',
    tone: 'system',
  },
];
export const ROADMAP_PHASES: readonly RoadmapPhase[] = [
  {
    description:
      'Clarifier la structure, les périmètres d’accès et les règles communes.',
    id: 1,
    label: 'Fondations métier',
  },
  {
    description:
      'Organiser les équipes, les disponibilités et les convocations.',
    id: 2,
    label: 'Quotidien esport',
  },
  {
    description:
      'Suivre les documents, les personnes, les réunions et les actions.',
    id: 3,
    label: 'Vie de structure',
  },
  {
    description: 'Relier les accords, les factures et les règlements.',
    id: 4,
    label: 'Relations & finances',
  },
  {
    description: 'Exploiter des données fiables pour préparer et décider.',
    id: 5,
    label: 'Pilotage & préparation',
  },
  {
    description:
      'Automatiser et connecter les outils lorsque les usages le justifient.',
    id: 6,
    label: 'Extensions selon les besoins',
  },
];
export const ROADMAP_ITEMS: readonly RoadmapItem[] = [
  ...CORE_ROADMAP_ITEMS,
  ...OPERATIONS_ROADMAP_ITEMS,
];
export const ROADMAP_STATUS_LABELS: Record<RoadmapStatus, string> = {
  partial: 'À compléter',
  planned: 'À cadrer',
};
export const ROADMAP_KIND_LABELS: Record<RoadmapKind, string> = {
  extension: 'Extension',
  integration: 'Intégration',
  module: 'Module',
  view: 'Vue partagée',
};

export const getRoadmapItem = (id: string): RoadmapItem | undefined =>
  ROADMAP_ITEMS.find((item) => item.id === id);
