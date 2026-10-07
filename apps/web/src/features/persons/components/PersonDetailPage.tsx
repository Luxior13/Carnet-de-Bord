'use client';

import {
  AtSign,
  Clock3,
  Mail,
  Phone,
  RefreshCw,
  Share2,
  UserRound,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { type FC, useCallback, useEffect, useState } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { ContentState } from '$components/layout/ContentState';
import { EntityDetailLayout } from '$components/layout/EntityDetailLayout';
import { PageDetailSkeleton } from '$components/layout/PageDetailSkeleton';
import { AccessDeniedState, PageState } from '$components/layout/PageState';
import type { UserDetailSection } from '$components/users/user-detail/UserDetailNavigation';
import { FEATURES } from '$constants/feature-registry.constants';
import { personDetailPath } from '$constants/routes.constants';
import { useFeatureAvailability } from '$context/FeatureAvailabilityContext';
import { useUser } from '$context/UserContext';
import { Card, CardFooter } from '$ui/card';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { ApiClientError } from '$utils/api.utils';

import { getPerson } from '../person.api';
import { getPersonCapabilities } from '../person.permissions';
import { formatPersonDateTime, getPersonDisplayName } from '../person.ui';
import type {
  PersonDetail,
  PersonDuplicateWarning,
} from '../types/person.types';
import { PersonAvatar } from './PersonAvatar';
import { PersonDangerZone } from './PersonDangerZone';
import { PersonStatusBadge } from './PersonStatusBadge';

const PersonCollectionsSection = dynamic(() =>
  import('./PersonCollectionsSection').then(
    (module) => module.PersonCollectionsSection,
  ),
);
const PersonIdentitySection = dynamic(() =>
  import('./PersonIdentitySection').then(
    (module) => module.PersonIdentitySection,
  ),
);

type PersonDetailPageProps = {
  activeSection: PersonDetailSection;
  initialPerson?: PersonDetail;
  personId: string;
  returnHref: string;
};

export type PersonDetailSection = 'coordonnees' | 'identite';

const PERSON_DETAIL_SECTIONS: readonly UserDetailSection<PersonDetailSection>[] =
  [
    {
      icon: <UserRound className="size-4" />,
      id: 'identite',
      label: 'Identité',
    },
    {
      icon: <AtSign className="size-4" />,
      id: 'coordonnees',
      label: 'Coordonnées',
    },
  ];

const DetailSkeleton: FC = () => (
  <PageShell className="py-0">
    <PageCanvas>
      <PageDetailSkeleton />
    </PageCanvas>
  </PageShell>
);

const PersonLastChangeSummary: FC<{ person: PersonDetail }> = ({ person }) => {
  const actor = person.lastChange?.actor;

  return (
    <p className="text-muted-foreground text-xs">
      Dernière modification le{' '}
      <time dateTime={person.lastChange?.at ?? person.updatedAt}>
        {formatPersonDateTime(person.lastChange?.at ?? person.updatedAt)}
      </time>{' '}
      par {actor?.displayName ?? 'un auteur non disponible'}
      {actor?.loginName ? ` (${actor.loginName})` : ''}.
    </p>
  );
};

const PersonLastChangeFooter: FC<{ person: PersonDetail }> = ({ person }) => (
  <CardFooter>
    <PersonLastChangeSummary person={person} />
  </CardFooter>
);

const PersonContactSummary: FC<{ person: PersonDetail }> = ({ person }) => {
  const items = [
    {
      count: person.emails.length,
      icon: <Mail aria-hidden="true" className="size-3.5" />,
      label: 'email(s)',
    },
    {
      count: person.phones.length,
      icon: <Phone aria-hidden="true" className="size-3.5" />,
      label: 'téléphone(s)',
    },
    {
      count: person.socialProfiles.length,
      icon: <Share2 aria-hidden="true" className="size-3.5" />,
      label: 'profil(s) social(aux)',
    },
  ];

  return (
    <div className="text-muted-foreground flex items-center gap-3 text-xs tabular-nums">
      {items.map((item) => (
        <span
          aria-label={`${item.count} ${item.label}`}
          className={`inline-flex items-center gap-1 ${item.count === 0 ? 'opacity-45' : ''}`}
          key={item.label}
          title={`${item.count} ${item.label}`}
        >
          {item.icon}
          {item.count}
        </span>
      ))}
    </div>
  );
};

const getDuplicateFieldLabel = (field: string): string | null => {
  const match = /^(emails|phones|socialProfiles)\.(\d+)\.(\w+)$/.exec(field);
  if (!match) return null;
  const [, collection, rawIndex, key] = match;
  const index = Number(rawIndex) + 1;
  if (collection === 'emails' && key === 'email') return `email ${index}`;
  if (collection === 'phones' && key === 'phone') return `téléphone ${index}`;
  if (collection === 'socialProfiles' && key === 'identifier') {
    return `identifiant du profil social ${index}`;
  }
  if (collection === 'socialProfiles' && key === 'profileUrl') {
    return `URL du profil social ${index}`;
  }

  return null;
};

const getDuplicateWarningDescription = (
  warning: PersonDuplicateWarning,
): string => {
  const labels = [
    ...new Set(
      (warning.fields ?? [])
        .map(getDuplicateFieldLabel)
        .filter((label): label is string => Boolean(label)),
    ),
  ];

  return labels.length > 0
    ? `Correspondance sur une autre fiche : ${labels.join(', ')}. La création reste valide ; vérifiez simplement la saisie.`
    : "Au moins une coordonnée ou un profil existe aussi sur une autre fiche. La création reste valide ; vérifiez simplement qu'il ne s'agit pas d'une saisie involontaire.";
};

const DUPLICATE_FIELD_KEYS = new Set([
  'email',
  'identifier',
  'phone',
  'profileUrl',
]);

const parseStoredDuplicateWarning = (raw: string): PersonDuplicateWarning => {
  if (raw === '1') return { duplicateFound: true };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return {
        duplicateFound: true,
        fields: parsed.filter(
          (field): field is string => typeof field === 'string',
        ),
      };
    }
    if (!parsed || typeof parsed !== 'object') {
      return { duplicateFound: true };
    }
    const candidate = parsed as {
      fields?: unknown;
      matches?: unknown;
    };
    const fields = Array.isArray(candidate.fields)
      ? candidate.fields.filter(
          (field): field is string => typeof field === 'string',
        )
      : [];
    const matches = Array.isArray(candidate.matches)
      ? candidate.matches.filter(
          (
            match,
          ): match is NonNullable<
            PersonDuplicateWarning['matches']
          >[number] => {
            if (!match || typeof match !== 'object') return false;
            const value = match as { fieldKey?: unknown; recordId?: unknown };

            return (
              typeof value.fieldKey === 'string' &&
              DUPLICATE_FIELD_KEYS.has(value.fieldKey) &&
              typeof value.recordId === 'string'
            );
          },
        )
      : [];

    return {
      duplicateFound: true,
      ...(fields.length > 0 ? { fields } : {}),
      ...(matches.length > 0 ? { matches } : {}),
    };
  } catch {
    return { duplicateFound: true };
  }
};

export const PersonDetailPage: FC<PersonDetailPageProps> = ({
  activeSection,
  initialPerson,
  personId,
  returnHref,
}) => {
  const {
    featureAvailabilityLoaded,
    operationalFeatureIds,
    refreshFeatureAvailability,
  } = useFeatureAvailability();
  const { userData } = useUser();
  const [duplicateWarning, setDuplicateWarning] =
    useState<PersonDuplicateWarning | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(!initialPerson);
  const [person, setPerson] = useState<PersonDetail | null>(
    initialPerson ?? null,
  );
  const { canDelete, canUpdate, canView, canViewProvenance } =
    getPersonCapabilities(userData);
  const featureOperational = operationalFeatureIds.has(FEATURES.persons.id);

  const load = useCallback(async (): Promise<PersonDetail> => {
    const response = await getPerson(personId);
    setPerson(response);
    setError(null);

    return response;
  }, [personId]);

  useEffect((): (() => void) | undefined => {
    if (initialPerson?.id === personId) {
      setPerson((current) =>
        current?.id === personId ? current : initialPerson,
      );
      setError(null);
      setIsLoading(false);

      return;
    }

    if (!canView || !featureAvailabilityLoaded || !featureOperational) {
      setIsLoading(false);

      return;
    }
    let active = true;
    setIsLoading(true);
    void load()
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error ? caught : new Error('Erreur inconnue'),
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    canView,
    featureAvailabilityLoaded,
    featureOperational,
    initialPerson,
    load,
    personId,
  ]);

  useEffect((): void => {
    const key = `person-duplicate-warning:${personId}`;
    const storedWarning = sessionStorage.getItem(key);
    if (!storedWarning) return;
    sessionStorage.removeItem(key);
    setDuplicateWarning(parseStoredDuplicateWarning(storedWarning));
  }, [personId]);

  const renderContent = (): React.ReactNode => {
    if (!canView) {
      return (
        <AccessDeniedState
          actionHref={returnHref}
          actionLabel="Retour au répertoire"
          description="Vous n'avez pas la permission de consulter cette fiche."
        />
      );
    }

    if (!featureAvailabilityLoaded && !initialPerson) return <DetailSkeleton />;

    if (featureAvailabilityLoaded && !initialPerson && !featureOperational) {
      return (
        <PageState
          actionLabel="Revérifier"
          description="Ce service ne peut pas être confirmé comme disponible pour le moment. Réessayez dans quelques instants."
          onAction={() => void refreshFeatureAvailability()}
          title="Répertoire temporairement indisponible"
        />
      );
    }

    if (isLoading) return <DetailSkeleton />;

    if (error instanceof ApiClientError && error.status === 410) {
      return (
        <PageState
          actionHref={returnHref}
          actionLabel="Retour au répertoire"
          description="Cette fiche est masquée pendant sa suppression définitive. Aucune autre action n'est possible."
          icon={<Clock3 className="size-5" />}
          title="Suppression en cours"
        />
      );
    }

    if (error instanceof ApiClientError && error.status === 404) {
      return (
        <PageState
          actionHref={returnHref}
          actionLabel="Retour au répertoire"
          description="Cette fiche n'existe pas ou a été supprimée."
          title="Fiche introuvable"
        />
      );
    }

    if (error || !person) {
      return (
        <PageState
          actionLabel="Réessayer"
          description={error?.message ?? 'La fiche ne peut pas être chargée.'}
          icon={<RefreshCw className="size-5" />}
          onAction={() => {
            setIsLoading(true);
            void load()
              .catch((caught) =>
                setError(
                  caught instanceof Error
                    ? caught
                    : new Error('Erreur inconnue'),
                ),
              )
              .finally(() => setIsLoading(false));
          }}
          title="Chargement impossible"
          tone="destructive"
        />
      );
    }

    const sectionHref = (section: PersonDetailSection): string => {
      const params = new URLSearchParams({ returnTo: returnHref, section });

      return `${personDetailPath(personId)}?${params}`;
    };

    return (
      <EntityDetailLayout
        activeSection={activeSection}
        afterHero={
          duplicateWarning && (
            <ContentState
              description={getDuplicateWarningDescription(duplicateWarning)}
              kind="warning"
              title="Correspondance détectée"
            />
          )
        }
        ariaLiveLabel={`Section ${activeSection === 'identite' ? 'Identité' : 'Coordonnées'} affichée`}
        heroActions={<PersonContactSummary person={person} />}
        heroIcon={
          <PersonAvatar className="size-full rounded-md" person={person} />
        }
        heroIconClassName="overflow-hidden rounded-md p-0"
        heroMeta={<PersonStatusBadge status={person.structureStatus} />}
        heroTitle={getPersonDisplayName(person)}
        navigationAriaLabel="Navigation de la fiche du répertoire"
        sectionHref={sectionHref}
        sections={PERSON_DETAIL_SECTIONS}
        tone="internal"
      >
        {activeSection === 'identite' ? (
          <section aria-label="Identité" className="space-y-5">
            <Card>
              <PersonIdentitySection
                canUpdate={canUpdate}
                canViewProvenance={canViewProvenance}
                onChange={setPerson}
                onReload={load}
                person={person}
              />
              <PersonLastChangeFooter person={person} />
            </Card>
            {canDelete && <PersonDangerZone onReload={load} person={person} />}
          </section>
        ) : (
          <section aria-label="Coordonnées" className="space-y-5">
            <PersonCollectionsSection
              canUpdate={canUpdate}
              canViewProvenance={canViewProvenance}
              duplicateMatches={duplicateWarning?.matches ?? []}
              onChange={setPerson}
              onReload={load}
              person={person}
            />
            <div className="px-1">
              <PersonLastChangeSummary person={person} />
            </div>
          </section>
        )}
      </EntityDetailLayout>
    );
  };

  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { label: FEATURES.persons.audit.poleLabel },
        { href: returnHref, label: FEATURES.persons.label },
        {
          label:
            canView && person?.id === personId && !error
              ? getPersonDisplayName(person)
              : 'Fiche',
        },
      ]}
    >
      {renderContent()}
    </AuthenticatedLayout>
  );
};
