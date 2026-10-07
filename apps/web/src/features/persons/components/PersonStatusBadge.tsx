import React, { type FC } from 'react';

import { cn } from '$utils/css.utils';

import { PERSON_STRUCTURE_STATUS_LABELS } from '../person.constants';
import type { PersonStructureStatus } from '../types/person.types';

/**
 * Reference badge for the structure status: tinted surface, thin border and a
 * leading dot. Shared by the directory table and the record hero so both pages
 * render the same status identically.
 */
export const PersonStatusBadge: FC<{
  status: PersonStructureStatus;
}> = ({ status }) => {
  const isInStructure = status === 'IN_STRUCTURE';

  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-[5px] border px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap',
        isInStructure
          ? 'border-success/40 bg-success/15 text-success'
          : 'border-warning/40 bg-warning/15 text-warning',
      )}
      data-status={status}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-current"
      />
      {isInStructure
        ? PERSON_STRUCTURE_STATUS_LABELS.IN_STRUCTURE
        : PERSON_STRUCTURE_STATUS_LABELS.OUTSIDE_STRUCTURE}
    </span>
  );
};
