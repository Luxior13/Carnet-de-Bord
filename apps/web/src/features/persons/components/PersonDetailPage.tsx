'use client';

import { AtSign, Clock3, RefreshCw, UserRound } from 'lucide-react';
import dynamic from 'next/dynamic';
import React, {
  type FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { ContentState } from '$components/layout/ContentState';
import { EntityDetailLayout } from '$components/layout/EntityDetailLayout';
import { PageDetailSkeleton } from '$components/layout/PageDetailSkeleton';
import type { PageSection } from '$components/layout/PageSectionNavigation';
import { AccessDeniedState, PageState } from '$components/layout/PageState';
import { FEATURES } from '$constants/feature-registry.constants';
import { personDetailPath } from '$constants/routes.constants';
import { useFeatureAvailability } from '$context/FeatureAvailabilityContext';
import { useUser } from '$context/UserContext';
import { Button } from '$ui/button';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { ApiClientError } from '$utils/api.utils';

import { getPerson } from '../person.api';
import { getPersonCapabilities } from '../person.permissions';
import {
  formatPersonActor,
  formatPersonDateTime,
  getPersonDisplayName,
} from '../person.ui';
import type { PersonDetail } from '../types/person.types';
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
  initialPersonScope?: string;
  personId: string;
  returnHref: string;
};

export type PersonDetailSection = 'coordonnees' | 'identite';

const PERSON_DETAIL_SECTIONS: readonly PageSection<PersonDetailSection>[] = [
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

/**
 * Creation and last change, shown once in the hero for the whole record (as
 * on the user record) instead of a footer repeated under each section.
 */
const PersonRecordDates: FC<{ person: PersonDetail }> = ({ person }) => {
  const actor = person.lastChange?.actor;
  const changedAt = person.lastChange?.at ?? person.updatedAt;

  return (
    <>
      Créée le{' '}
      <time dateTime={person.createdAt}>
        {formatPersonDateTime(person.createdAt)}
      </time>
      {' · '}Modifiée le{' '}
      <time dateTime={changedAt}>{formatPersonDateTime(changedAt)}</time> par{' '}
      {actor ? formatPersonActor(actor) : 'un auteur non disponible'}
    </>
  );
};

const PersonDetailContent: FC<PersonDetailPageProps> = ({
  activeSection: requestedSection,
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
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(!initialPerson);
  const [person, setPerson] = useState<PersonDetail | null>(
    initialPerson ?? null,
  );
  const [identityDirty, setIdentityDirty] = useState(false);
  const { canDelete, canUpdate, canUpdateContact, canView, canViewContact } =
    getPersonCapabilities(userData);
  const activeSection = canViewContact ? requestedSection : 'identite';
  const featureOperational = operationalFeatureIds.has(FEATURES.persons.id);
  const available = !featureAvailabilityLoaded || featureOperational;
  const mountedRef = useRef(false);
  const personRef = useRef(person);
  const requestRef = useRef<AbortController | null>(null);
  const retrySequenceRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
      requestRef.current?.abort();
    };
  }, []);

  const acceptPerson = useCallback(
    (next: PersonDetail): void => {
      if (!mountedRef.current || next.id !== personId) return;
      if (personRef.current && next.version < personRef.current.version) return;
      personRef.current = next;
      setPerson(next);
      setError(null);
    },
    [personId],
  );

  const load = useCallback(async (): Promise<PersonDetail> => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await getPerson(personId, controller.signal);
      if (
        !mountedRef.current ||
        controller.signal.aborted ||
        requestRef.current !== controller
      ) {
        throw new DOMException('Lecture interrompue', 'AbortError');
      }
      if (response.id !== personId)
        throw new Error('Réponse inattendue pour cette fiche.');
      acceptPerson(response);

      return personRef.current ?? response;
    } catch (caught) {
      if (
        mountedRef.current &&
        requestRef.current === controller &&
        caught instanceof ApiClientError &&
        [401, 403, 404, 410].includes(caught.status)
      ) {
        personRef.current = null;
        setPerson(null);
        setError(caught);
      }
      if (controller.signal.aborted)
        throw new Error('Le chargement a pris trop de temps. Réessayez.');
      throw caught;
    } finally {
      window.clearTimeout(timer);
      if (requestRef.current === controller) requestRef.current = null;
    }
  }, [acceptPerson, personId]);

  const retry = useCallback(async (): Promise<void> => {
    const sequence = ++retrySequenceRef.current;
    setIsLoading(true);
    try {
      await load();
    } catch (caught) {
      if (mountedRef.current && sequence === retrySequenceRef.current)
        setError(
          caught instanceof Error
            ? caught
            : new Error('Chargement impossible.'),
        );
    } finally {
      if (mountedRef.current && sequence === retrySequenceRef.current)
        setIsLoading(false);
    }
  }, [load]);

  useEffect(() => {
    if (initialPerson?.id === personId) acceptPerson(initialPerson);
  }, [acceptPerson, initialPerson, personId]);

  useEffect(() => {
    // Un changement de disponibilité ne remonte pas les formulaires déjà ouverts.
    if (
      personRef.current ||
      !canView ||
      !featureAvailabilityLoaded ||
      !featureOperational
    )
      return;
    void retry();
  }, [canView, featureAvailabilityLoaded, featureOperational, retry]);

  const renderContent = (): React.ReactNode => {
    if (
      !canView ||
      (error instanceof ApiClientError && [401, 403].includes(error.status))
    ) {
      return (
        <AccessDeniedState
          actionHref={returnHref}
          actionLabel="Retour au répertoire"
          description="Vous n'avez pas la permission de consulter cette fiche."
        />
      );
    }

    if (!featureAvailabilityLoaded && !person && !error)
      return <DetailSkeleton />;

    if (featureAvailabilityLoaded && !person && !error && !featureOperational) {
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
          onAction={() => void retry()}
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
          featureAvailabilityLoaded && !featureOperational ? (
            <ContentState
              action={
                <Button
                  onClick={() => void refreshFeatureAvailability()}
                  size="sm"
                  variant="outline"
                >
                  Revérifier
                </Button>
              }
              description="La disponibilité du service ne peut pas être confirmée. Votre saisie est conservée."
              kind="warning"
              title="Service temporairement indisponible"
            />
          ) : undefined
        }
        condensedAside={<PersonStatusBadge status={person.structureStatus} />}
        dirtySections={identityDirty ? ['identite'] : []}
        ariaLiveLabel={`Section ${activeSection === 'identite' ? 'Identité' : 'Coordonnées'} affichée`}
        heroDescription={<PersonRecordDates person={person} />}
        heroIcon={
          <PersonAvatar className="size-full rounded-md" person={person} />
        }
        heroMeta={<PersonStatusBadge status={person.structureStatus} />}
        heroTitle={getPersonDisplayName(person)}
        navigationAriaLabel="Navigation de la fiche du répertoire"
        sectionHref={sectionHref}
        sections={PERSON_DETAIL_SECTIONS.filter(
          (section) => section.id !== 'coordonnees' || canViewContact,
        ).map((section) =>
          // The tab says how many contacts there are (27 October 2026).
          section.id === 'coordonnees'
            ? {
                ...section,
                count:
                  person.emails.length +
                  person.phones.length +
                  person.socialProfiles.length,
              }
            : section,
        )}
      >
        {activeSection === 'identite' ? (
          <section aria-label="Identité" className="space-y-5">
            <PersonIdentitySection
              key={person.id}
              available={available}
              canUpdate={canUpdate}
              onChange={acceptPerson}
              onDirtyChange={setIdentityDirty}
              onReload={load}
              person={person}
            />
            {canDelete && (
              <PersonDangerZone
                available={available}
                onReload={load}
                person={person}
                returnHref={returnHref}
              />
            )}
          </section>
        ) : (
          <section aria-label="Coordonnées" className="space-y-5">
            <PersonCollectionsSection
              available={available}
              canUpdate={canUpdateContact}
              onChange={acceptPerson}
              onReload={load}
              person={person}
            />
          </section>
        )}

        {/* Barre d'action de la fiche : au niveau de la page, hors des sections. */}
        <div className="contents" id="person-record-action-bar" />
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

export const PersonDetailPage: FC<PersonDetailPageProps> = (props) => {
  const { authorizationRevision, userData } = useUser();
  const capabilities = getPersonCapabilities(userData);
  const scope = [
    props.personId,
    userData?.id ?? '',
    authorizationRevision,
    capabilities.canView,
    capabilities.canUpdate,
    capabilities.canViewContact,
    capabilities.canUpdateContact,
    capabilities.canDelete,
  ].join(':');
  const initialScopeRef = useRef(scope);
  const initialSnapshotAllowedRef = useRef(true);
  if (scope !== initialScopeRef.current)
    initialSnapshotAllowedRef.current = false;

  return (
    <PersonDetailContent
      key={scope}
      {...props}
      initialPerson={
        props.initialPersonScope === userData?.id &&
        initialSnapshotAllowedRef.current &&
        capabilities.canView &&
        props.initialPerson?.id === props.personId
          ? props.initialPerson
          : undefined
      }
    />
  );
};
