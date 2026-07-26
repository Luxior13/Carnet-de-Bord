import { PARTNER_STATUSES } from '$features/partners/partner.constants';
import type { PartnerStatus } from '$features/partners/types/partner.types';

import type { InternalPartnerNewsItem } from './internal-news.types';

type PartnerNewsEventType = 'RELATIONSHIP_CREATED' | 'STATUS_CHANGED';

type PartnerNewsCopy = Pick<
  InternalPartnerNewsItem,
  'body' | 'statusTransition' | 'title'
>;

const isPartnerStatus = (value: unknown): value is PartnerStatus =>
  typeof value === 'string' &&
  PARTNER_STATUSES.some((status) => status === value);

const readPayloadStatus = (
  payload: unknown,
  key: 'fromStatus' | 'status' | 'toStatus',
): PartnerStatus | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const valueByKey = payload as {
    fromStatus?: unknown;
    status?: unknown;
    toStatus?: unknown;
  };
  const value =
    key === 'fromStatus'
      ? valueByKey.fromStatus
      : key === 'toStatus'
        ? valueByKey.toStatus
        : valueByKey.status;

  return isPartnerStatus(value) ? value : null;
};

const getPartnerStatusLabel = (status: PartnerStatus): string => {
  switch (status) {
    case 'ACTIVE':
      return 'Actif';
    case 'CLOSED':
      return 'Sans suite';
    case 'DISCUSSION':
      return 'En discussion';
    case 'ENDED':
      return 'Terminé';
    case 'PROSPECT':
      return 'Prospect';
  }
};

const getStatusChangeTitle = (
  organizationName: string,
  fromStatus: PartnerStatus | null,
  toStatus: PartnerStatus,
): string => {
  switch (toStatus) {
    case 'ACTIVE':
      return `${organizationName} devient partenaire actif`;
    case 'CLOSED':
      return `Le dossier ${organizationName} est classé sans suite`;
    case 'DISCUSSION':
      return fromStatus === 'ENDED' || fromStatus === 'CLOSED'
        ? `Les échanges reprennent avec ${organizationName}`
        : `Les échanges avancent avec ${organizationName}`;
    case 'ENDED':
      return `La relation avec ${organizationName} est terminée`;
    case 'PROSPECT':
      return `${organizationName} repasse au statut prospect`;
  }
};

export const getPartnerNewsCopy = (
  organizationName: string,
  eventType: PartnerNewsEventType,
  payload: unknown,
): PartnerNewsCopy => {
  if (eventType === 'RELATIONSHIP_CREATED') {
    const status = readPayloadStatus(payload, 'status') ?? 'PROSPECT';

    return {
      body: `${organizationName} entre dans le suivi au statut « ${getPartnerStatusLabel(status)} ».`,
      statusTransition: { from: null, to: status },
      title:
        status === 'DISCUSSION'
          ? `Les échanges démarrent avec ${organizationName}`
          : `Nouvelle relation suivie : ${organizationName}`,
    };
  }

  const fromStatus = readPayloadStatus(payload, 'fromStatus');
  const toStatus = readPayloadStatus(payload, 'toStatus') ?? 'PROSPECT';

  return {
    body: fromStatus
      ? `Statut passé de « ${getPartnerStatusLabel(fromStatus)} » à « ${getPartnerStatusLabel(toStatus)} ».`
      : `Nouveau statut : « ${getPartnerStatusLabel(toStatus)} ».`,
    statusTransition: { from: fromStatus, to: toStatus },
    title: getStatusChangeTitle(organizationName, fromStatus, toStatus),
  };
};
