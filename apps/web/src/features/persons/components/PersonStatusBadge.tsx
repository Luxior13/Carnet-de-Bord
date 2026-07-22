import React, { type FC } from 'react';

import { Badge } from '$ui/badge';

import { PERSON_STRUCTURE_STATUS_LABELS } from '../person.constants';
import { getStructureStatusTone } from '../person.ui';
import type { PersonStructureStatus } from '../types/person.types';

export const PersonStatusBadge: FC<{
  status: PersonStructureStatus;
}> = ({ status }) => (
  <Badge variant={getStructureStatusTone(status)}>
    <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
    {status === 'IN_STRUCTURE'
      ? PERSON_STRUCTURE_STATUS_LABELS.IN_STRUCTURE
      : PERSON_STRUCTURE_STATUS_LABELS.OUTSIDE_STRUCTURE}
  </Badge>
);
