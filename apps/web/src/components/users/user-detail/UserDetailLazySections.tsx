'use client';

// Load the editor stylesheet with the detail page, before a tab is mounted.
// Its layout must not depend on the CSS chunk of the lazy access section.
import '../PermissionsEditor.module.css';

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
export const UserProfileTab = dynamic(() =>
  import('./UserProfileTab').then((module) => module.UserProfileTab),
);
export const UserSecurityTab = dynamic(() =>
  import('./UserSecurityTab').then((module) => module.UserSecurityTab),
);
