import React from 'react';
import { target as baseTarget } from '../../navigation-sections-2026-10-11/banc/mocks';
export { actor, useUser, useFeatureAvailability, usePathname, useSearchParams, useRouter, Link, AuthenticatedLayout } from '../../navigation-sections-2026-10-11/banc/mocks';
export const target = { ...baseTarget, criticalAccessReady: true, mfaEnabled: true };
