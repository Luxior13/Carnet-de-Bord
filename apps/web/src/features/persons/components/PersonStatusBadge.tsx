import React, { type FC } from 'react';

import { StatusBadge } from '$ui/status-badge';

import { PERSON_STRUCTURE_STATUS_LABELS } from '../person.constants';
import { getStructureStatusTone } from '../person.ui';
import type { PersonStructureStatus } from '../types/person.types';

/**
 * Structure status shared by the directory and the record hero. Being outside
 * the structure is a neutral category, not an alert (decision of 2026-10-20).
 */
export const PersonStatusBadge: FC<{
  status: PersonStructureStatus;
}> = ({ status }) => (
  <StatusBadge data-status={status} tone={getStructureStatusTone(status)}>
    {status === 'IN_STRUCTURE'
      ? PERSON_STRUCTURE_STATUS_LABELS.IN_STRUCTURE
      : PERSON_STRUCTURE_STATUS_LABELS.OUTSIDE_STRUCTURE}
  </StatusBadge>
);
