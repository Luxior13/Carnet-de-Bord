import type { NavigationIconName } from '$constants/navigation-icon.constants';
import type { NavigationSpaceTone } from '$constants/navigation-theme.constants';

export type RoadmapAreaId =
  | 'today'
  | 'people'
  | 'esport'
  | 'activity'
  | 'relations'
  | 'structure'
  | 'finance'
  | 'system';
export type RoadmapPhaseId = 1 | 2 | 3 | 4 | 5 | 6;
export type RoadmapStatus = 'planned' | 'partial';
export type RoadmapKind = 'module' | 'extension' | 'view' | 'integration';

export type RoadmapArea = {
  description: string;
  icon: NavigationIconName;
  id: RoadmapAreaId;
  label: string;
  tone: NavigationSpaceTone;
};
export type RoadmapPhase = {
  description: string;
  id: RoadmapPhaseId;
  label: string;
};
export type RoadmapItem = {
  area: RoadmapAreaId;
  audience: string;
  baseline?: string;
  dependsOn: readonly string[];
  description: string;
  doneWhen: string;
  firstRelease: string;
  id: string;
  kind: RoadmapKind;
  later: string;
  /** Historical planning references, never links to operational pages. */
  legacyHrefs?: readonly string[];
  phase: RoadmapPhaseId;
  status: RoadmapStatus;
  title: string;
};
