'use client';

import { History } from 'lucide-react';
import Link from 'next/link';
import React, { type FC } from 'react';

import { FEATURES } from '$constants/feature-registry.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import { Button } from '$ui/button';

import {
  buildJournalParams,
  DEFAULT_JOURNAL_QUERY,
} from './audit-journal.types';

/**
 * « Historique » on a record (30 October 2026): the journal over its whole
 * retention, narrowed to this account or person. It replaces the field
 * provenance hints removed on 27 October and shows only to journal readers.
 */
export const JournalHistoryLink: FC<
  | { person: string; targetProtected?: never; user?: never }
  | { person?: never; targetProtected: boolean; user: string }
> = ({ person, targetProtected = false, user }) => {
  const { userData } = useUser();
  const canView =
    !!userData &&
    (userData.isProtected ||
      hasPermission(
        userData.role,
        PERMISSIONS.AUDIT.VIEW,
        userData.permissions,
      ));
  // The protected account's events stay hidden from every other reader.
  if (!canView || (targetProtected && !userData.isProtected)) return null;
  const params = buildJournalParams({
    ...DEFAULT_JOURNAL_QUERY,
    period: '1y',
    person: person ?? null,
    user: user ?? null,
  });

  return (
    <Button asChild size="sm" variant="outline">
      <Link href={`${FEATURES.systemActivity.href}?${params}`}>
        <History aria-hidden="true" />
        Historique
      </Link>
    </Button>
  );
};
