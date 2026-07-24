import type {
  PartnerDetail,
  PartnerFollowUp,
  PartnerPeriod,
} from './types/partner.types';

const CIVIL_DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeZone: 'UTC',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Paris',
});

export const formatPartnerCivilDate = (value: string): string =>
  CIVIL_DATE_FORMATTER.format(new Date(`${value}T12:00:00.000Z`));

export const formatPartnerDateTime = (value: string): string =>
  DATE_TIME_FORMATTER.format(new Date(value));

const getLatestClosedPeriod = (
  periods: readonly PartnerPeriod[],
): PartnerPeriod | undefined =>
  periods
    .filter((period) => period.closedAt)
    .toSorted((left, right) =>
      (right.closedAt ?? '').localeCompare(left.closedAt ?? ''),
    )[0];

export const getRelationshipStatusDescription = (
  partner: PartnerDetail,
): string => {
  const activePeriod = partner.periods.find((period) => !period.closedAt);
  const latestClosedPeriod = getLatestClosedPeriod(partner.periods);

  if (partner.status === 'ACTIVE') {
    return activePeriod?.startedOn
      ? `Relation active depuis le ${formatPartnerCivilDate(activePeriod.startedOn)}`
      : 'Relation active · date de début non renseignée';
  }

  if (partner.status === 'ENDED') {
    if (!latestClosedPeriod) {
      return 'Relation terminée · période non renseignée';
    }
    if (latestClosedPeriod.startedOn && latestClosedPeriod.endedOn) {
      return `Dernière période : du ${formatPartnerCivilDate(
        latestClosedPeriod.startedOn,
      )} au ${formatPartnerCivilDate(latestClosedPeriod.endedOn)}`;
    }
    if (latestClosedPeriod.startedOn) {
      return `Dernière période : début le ${formatPartnerCivilDate(
        latestClosedPeriod.startedOn,
      )} · fin non renseignée`;
    }
    if (latestClosedPeriod.endedOn) {
      return `Dernière période : début non renseigné · fin le ${formatPartnerCivilDate(
        latestClosedPeriod.endedOn,
      )}`;
    }

    return 'Relation terminée · dates de la période non renseignées';
  }

  if (latestClosedPeriod?.endedOn) {
    return `Dernière relation terminée le ${formatPartnerCivilDate(latestClosedPeriod.endedOn)}`;
  }

  if (partner.status === 'DISCUSSION') {
    return 'Échanges en cours · aucune période active';
  }

  if (partner.status === 'CLOSED') {
    return 'Relation classée sans suite';
  }

  return 'Aucune période de relation commencée';
};

export type PartnerActionDuePresentation = {
  isOverdue: boolean;
  label: string;
};

const getCivilToday = (now: Date): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Europe/Paris',
    year: 'numeric',
  }).formatToParts(now);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${value.year}-${value.month}-${value.day}`;
};

export const getPartnerActionDuePresentation = (
  dueOn: string | null,
  now = new Date(),
): PartnerActionDuePresentation => {
  if (!dueOn) {
    return {
      isOverdue: false,
      label: 'Sans échéance',
    };
  }

  const isOverdue = dueOn < getCivilToday(now);

  return {
    isOverdue,
    label: `${isOverdue ? 'En retard · ' : 'Échéance · '}${formatPartnerCivilDate(dueOn)}`,
  };
};

export const sortOpenPartnerActions = (
  entries: readonly PartnerFollowUp[],
  now = new Date(),
): PartnerFollowUp[] =>
  [...entries].sort((left, right) => {
    const leftDue = getPartnerActionDuePresentation(
      left.action?.dueOn ?? null,
      now,
    );
    const rightDue = getPartnerActionDuePresentation(
      right.action?.dueOn ?? null,
      now,
    );
    if (leftDue.isOverdue !== rightDue.isOverdue) {
      return leftDue.isOverdue ? -1 : 1;
    }
    if (left.action?.dueOn && right.action?.dueOn) {
      return left.action.dueOn.localeCompare(right.action.dueOn);
    }
    if (left.action?.dueOn) return -1;
    if (right.action?.dueOn) return 1;

    return right.occurredAt.localeCompare(left.occurredAt);
  });
