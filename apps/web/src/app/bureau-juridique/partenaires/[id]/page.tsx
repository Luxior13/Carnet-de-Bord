import React from 'react';

import {
  PartnerDetailPage,
  type PartnerDetailSection,
} from '$features/partners/components/PartnerDetailPage';
import { getPartnerCapabilities } from '$features/partners/partner.permissions';
import { getPartner } from '$features/partners/server/partner.service';
import { assertPartnerFeatureReady } from '$features/partners/server/partner-readiness';
import type { PartnerDetail } from '$features/partners/types/partner.types';
import { getPageAuthSession } from '$server/auth';

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    returnTo?: string | string[];
    section?: string | string[];
  }>;
};

const LIST_PATH = '/bureau-juridique/partenaires';

const safeReturnHref = (value: string | string[] | undefined): string => {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate?.startsWith(LIST_PATH)) return LIST_PATH;
  try {
    const url = new URL(candidate, 'https://team-control.local');

    return url.origin === 'https://team-control.local' &&
      url.pathname === LIST_PATH
      ? `${url.pathname}${url.search}`
      : LIST_PATH;
  } catch {
    return LIST_PATH;
  }
};

const sections = new Set<PartnerDetailSection>([
  'activite',
  'contacts',
  'information',
  'suivi',
]);

export default async function PartnerPage({
  params,
  searchParams,
}: Props): Promise<React.ReactNode> {
  const [{ id }, query, { user }]: [
    { id: string },
    {
      returnTo?: string | string[];
      section?: string | string[];
    },
    Awaited<ReturnType<typeof getPageAuthSession>>,
  ] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
    getPageAuthSession(),
  ]);
  const rawSection = Array.isArray(query.section)
    ? query.section[0]
    : query.section;
  const activeSection = sections.has(rawSection as PartnerDetailSection)
    ? (rawSection as PartnerDetailSection)
    : 'information';
  const capabilities = getPartnerCapabilities(user);
  let initialPartner: PartnerDetail | undefined;

  if (user && !user.mustChangePassword && capabilities.canView) {
    try {
      await assertPartnerFeatureReady();
      initialPartner = await getPartner(id, capabilities.canViewInterlocutors);
    } catch {
      // The client preserves the established not-found/unavailable/retry
      // states when the server cannot produce a safe initial snapshot.
    }
  }

  return (
    <PartnerDetailPage
      activeSection={activeSection}
      initialPartner={initialPartner}
      partnerId={id}
      returnHref={safeReturnHref(query.returnTo)}
    />
  );
}
