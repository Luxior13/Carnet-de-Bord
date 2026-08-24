'use client';

import dynamic from 'next/dynamic';

export const AdminMfaResetDialog = dynamic(() =>
  import('./AdminMfaResetDialog').then((module) => module.AdminMfaResetDialog),
);
export const AdminStepUpDialog = dynamic(() =>
  import('./AdminStepUpDialog').then((module) => module.AdminStepUpDialog),
);
export const UserAccessTab = dynamic(() =>
  import('./UserAccessTab').then((module) => module.UserAccessTab),
);
export const UserAccountTab = dynamic(() =>
  import('./UserAccountTab').then((module) => module.UserAccountTab),
);
export const UserHistoryTab = dynamic(() =>
  import('./UserHistoryTab').then((module) => module.UserHistoryTab),
);
export const UserProfileTab = dynamic(() =>
  import('./UserProfileTab').then((module) => module.UserProfileTab),
);
export const UserSecurityTab = dynamic(() =>
  import('./UserSecurityTab').then((module) => module.UserSecurityTab),
);
