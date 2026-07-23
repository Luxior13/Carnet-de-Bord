'use client';

import { AtSign, Clock3, RefreshCw, UserRound } from 'lucide-react';
import React, { type FC, useCallback, useEffect, useState } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { ContentState } from '$components/layout/ContentState';
import { PageBackButton } from '$components/layout/PageBackNavigation';
import { PageHero } from '$components/layout/PageHero';
import { AccessDeniedState, PageState } from '$components/layout/PageState';
import type { UserDetailSection } from '$components/users/user-detail/UserDetailNavigation';
import { UserDetailSectionRail } from '$components/users/user-detail/UserDetailSectionRail';
import { FEATURES } from '$constants/feature-registry.constants';
import { useFeatureAvailability } from '$context/FeatureAvailabilityContext';
import { useUser } from '$context/UserContext';
import { Card, CardFooter } from '$ui/card';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';
import { Tabs, TabsContent } from '$ui/tabs';
import { ApiClientError } from '$utils/api.utils';

import { getPerson } from '../person.api';
import { getPersonCapabilities } from '../person.permissions';
import { formatPersonDateTime, getPersonDisplayName } from '../person.ui';
import type {
  PersonDetail,
  PersonDuplicateWarning,
} from '../types/person.types';
import { PersonAvatar } from './PersonAvatar';
import { PersonCollectionsSection } from './PersonCollectionsSection';
import { PersonDangerZone } from './PersonDangerZone';
import { PersonIdentitySection } from './PersonIdentitySection';
import { PersonStatusBadge } from './PersonStatusBadge';

type PersonDetailPageProps = {
  activeSection: PersonDetailSection;
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
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-[34rem] rounded-xl" />
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

const PersonDetailContent: FC<PersonDetailPageProps> = ({
  activeSection,
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
  const [isLoading, setIsLoading] = useState(true);
  const [person, setPerson] = useState<PersonDetail | null>(null);
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
  }, [canView, featureAvailabilityLoaded, featureOperational, load]);

  useEffect((): void => {
    const key = `person-duplicate-warning:${personId}`;
    const storedWarning = sessionStorage.getItem(key);
    if (!storedWarning) return;
    sessionStorage.removeItem(key);
    setDuplicateWarning(parseStoredDuplicateWarning(storedWarning));
  }, [personId]);

  if (!canView) {
    return (
      <AccessDeniedState
        actionHref={returnHref}
        actionLabel="Retour au répertoire"
        description="Vous n'avez pas la permission de consulter cette fiche."
      />
    );
  }

  if (!featureAvailabilityLoaded) return <DetailSkeleton />;

  if (!featureOperational) {
    return (
      <PageState
        actionLabel="Revérifier"
        description="La migration ou la clé de chiffrement d’audit n’est pas encore prête. La fiche reste masquée jusqu’à la fin de sa configuration."
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
                caught instanceof Error ? caught : new Error('Erreur inconnue'),
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

    return `${FEATURES.persons.href}/${encodeURIComponent(personId)}?${params}`;
  };
  return (
    <PageShell className="py-0">
      <PageCanvas contentClassName="relative space-y-3">
        <div className="private-left-rail">
          <div className="sticky top-4 space-y-2">
            <PageBackButton
              fullWidth
              href={returnHref}
              label="Retour au répertoire"
            />
            <UserDetailSectionRail
              activeSection={activeSection}
              ariaLabel="Navigation de la fiche du répertoire"
              className="!block"
              dirtySections={[]}
              getSectionHref={sectionHref}
              replace
              sections={PERSON_DETAIL_SECTIONS}
            />
          </div>
        </div>
        <div className="2xl:hidden">
          <PageBackButton href={returnHref} label="Retour au répertoire" />
        </div>

        <PageHero
          compact
          icon={
            <PersonAvatar className="size-full rounded-full" person={person} />
          }
          iconClassName="overflow-hidden rounded-full p-0"
          meta={<PersonStatusBadge status={person.structureStatus} />}
          title={getPersonDisplayName(person)}
          tone="internal"
        />

        {duplicateWarning && (
          <ContentState
            description={getDuplicateWarningDescription(duplicateWarning)}
            kind="warning"
            title="Correspondance détectée"
          />
        )}

        <UserDetailSectionRail
          activeSection={activeSection}
          ariaLabel="Navigation de la fiche du répertoire"
          dirtySections={[]}
          getSectionHref={sectionHref}
          layout="mobile"
          replace
          sections={PERSON_DETAIL_SECTIONS}
        />
        <p aria-live="polite" className="sr-only">
          Section {activeSection === 'identite' ? 'Identité' : 'Coordonnées'}{' '}
          affichée
        </p>

        <Tabs className="gap-3" value={activeSection}>
          <TabsContent className="space-y-5" value="identite">
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
          </TabsContent>

          <TabsContent className="space-y-5" value="coordonnees">
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
          </TabsContent>
        </Tabs>
      </PageCanvas>
    </PageShell>
  );
};

export const PersonDetailPage: FC<PersonDetailPageProps> = ({
  activeSection,
  personId,
  returnHref,
}) => (
  <AuthenticatedLayout
    breadcrumbs={[
      { label: FEATURES.persons.audit.poleLabel },
      { href: FEATURES.persons.href, label: FEATURES.persons.label },
      { label: 'Fiche' },
    ]}
  >
    <PersonDetailContent
      activeSection={activeSection}
      personId={personId}
      returnHref={returnHref}
    />
  </AuthenticatedLayout>
);
