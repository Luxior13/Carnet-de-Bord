import React, { type FC } from 'react';

import { Badge } from '$ui/badge';
import { cn } from '$utils/css.utils';

import { PARTNER_STATUS_LABELS } from '../partner.constants';
import type { PartnerStatus } from '../types/partner.types';

export const PartnerStatusBadge: FC<{ status: PartnerStatus }> = ({
  status,
}) => (
  <Badge
    className={cn(
      status === 'ACTIVE' && 'border-success/30 bg-success/15 text-success',
      status === 'DISCUSSION' &&
        'border-info/30 bg-info/15 text-info-foreground',
      status === 'ENDED' && 'border-border-default bg-surface-muted',
      status === 'CLOSED' &&
        'border-destructive/25 bg-destructive/10 text-destructive',
    )}
    variant="outline"
  >
    {PARTNER_STATUS_LABELS[status]}
  </Badge>
);
