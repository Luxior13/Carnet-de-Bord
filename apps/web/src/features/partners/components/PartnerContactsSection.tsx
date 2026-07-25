'use client';

import React, { type FC } from 'react';

import type { PartnerDetail } from '../types/partner.types';
import { PartnerInterlocutorsSection } from './PartnerInterlocutorsSection';
import { PartnerOrganizationChannelsSection } from './PartnerOrganizationChannelsSection';

export const PartnerContactsSection: FC<{
  canManage: boolean;
  canUpdatePersons: boolean;
  canViewInterlocutors: boolean;
  onChange: (partner: PartnerDetail) => void;
  partner: PartnerDetail;
}> = ({
  canManage,
  canUpdatePersons,
  canViewInterlocutors,
  onChange,
  partner,
}) => (
  <div className="space-y-4">
    <PartnerOrganizationChannelsSection
      canManage={canManage}
      onChange={onChange}
      partner={partner}
    />
    <PartnerInterlocutorsSection
      canManage={canManage}
      canUpdatePersons={canUpdatePersons}
      canViewInterlocutors={canViewInterlocutors}
      onChange={onChange}
      partner={partner}
    />
  </div>
);
