'use client';

import {
  Activity,
  Building2,
  Handshake,
  History,
  Loader2,
  MessageSquareText,
  RefreshCw,
  UserRound,
} from 'lucide-react';
import React, { type FC, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { ContentState } from '$components/layout/ContentState';
import { EntityDangerZone } from '$components/layout/EntityDangerZone';
import { EntityDetailLayout } from '$components/layout/EntityDetailLayout';
import { AccessDeniedState, PageState } from '$components/layout/PageState';
import type { UserDetailSection } from '$components/users/user-detail/UserDetailNavigation';
import { FEATURES } from '$constants/feature-registry.constants';
import { useFeatureAvailability } from '$context/FeatureAvailabilityContext';
import { useUser } from '$context/UserContext';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '$ui/card';
import { Checkbox } from '$ui/checkbox';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';
import { Tabs, TabsContent } from '$ui/tabs';
import { Textarea } from '$ui/textarea';
import { ApiClientError } from '$utils/api.utils';

import {
  deletePartner,
  getPartner,
  getPartnerActivity,
  updatePartner,
} from '../partner.api';
import { PARTNER_CATEGORY_LABELS } from '../partner.constants';
import { getPartnerCapabilities } from '../partner.permissions';
import type {
  PartnerActivityItem,
  PartnerCategory,
  PartnerDetail,
} from '../types/partner.types';
import { PartnerContactsSection } from './PartnerContactsSection';
import { PartnerFollowUpSection } from './PartnerFollowUpSection';
import { PartnerStatusBadge } from './PartnerStatusBadge';

export type PartnerDetailSection =
  'activite' | 'contacts' | 'information' | 'suivi';

const SECTIONS: readonly UserDetailSection<PartnerDetailSection>[] = [
  {
    icon: <Building2 className="size-4" />,
    id: 'information',
    label: 'Informations',
  },
  {
    icon: <UserRound className="size-4" />,
    id: 'contacts',
    label: 'Contacts',
  },
  {
    icon: <MessageSquareText className="size-4" />,
    id: 'suivi',
    label: 'Suivi',
  },
  {
    icon: <History className="size-4" />,
    id: 'activite',
    label: 'Activité',
  },
];

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const DetailSkeleton: FC = () => (
  <PageShell className="py-0">
    <PageCanvas>
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="mt-3 h-[30rem] rounded-xl" />
    </PageCanvas>
  </PageShell>
);

const InformationSection: FC<{
  canDelete: boolean;
  canManage: boolean;
  onChange: (partner: PartnerDetail) => void;
  partner: PartnerDetail;
  returnHref: string;
}> = ({ canDelete, canManage, onChange, partner, returnHref }) => {
  const [name, setName] = useState(partner.name);
  const [description, setDescription] = useState(partner.description ?? '');
  const [website, setWebsite] = useState(partner.website ?? '');
  const [categories, setCategories] = useState<PartnerCategory[]>(
    partner.categories,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(partner.name);
    setDescription(partner.description ?? '');
    setWebsite(partner.website ?? '');
    setCategories(partner.categories);
  }, [partner]);

  const saveInformation = async (): Promise<void> => {
    if (!categories.length) {
      toast.error('Sélectionnez au moins une catégorie');

      return;
    }
    setSaving(true);
    try {
      const updated = await updatePartner(partner.id, {
        categories,
        description: description || null,
        name,
        version: partner.version,
        website: website || null,
      });
      onChange(updated);
      toast.success('Informations enregistrées');
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : 'La modification a échoué',
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category: PartnerCategory): void =>
    setCategories((items) =>
      items.includes(category)
        ? items.filter((item) => item !== category)
        : [...items, category],
    );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Informations générales</h2>
          <p className="text-muted-foreground text-sm">
            Identité et informations générales de l’organisation.
          </p>
        </CardHeader>
        <form
          autoComplete="off"
          onSubmit={(event) => {
            event.preventDefault();
            void saveInformation();
          }}
        >
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="partner-detail-name">Nom</Label>
              <Input
                autoComplete="off"
                disabled={!canManage}
                id="partner-detail-name"
                maxLength={200}
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Catégories</legend>
              <div className="flex flex-wrap gap-5">
                {(['SPONSOR', 'PARTNER'] as const).map((category) => (
                  <Label className="flex items-center gap-2" key={category}>
                    <Checkbox
                      checked={categories.includes(category)}
                      disabled={!canManage}
                      onCheckedChange={() => toggleCategory(category)}
                    />
                    {
                      // The tuple above is the complete closed category enum.
                      // eslint-disable-next-line security/detect-object-injection
                      PARTNER_CATEGORY_LABELS[category]
                    }
                  </Label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-2">
              <Label htmlFor="partner-detail-description">
                Description courte
              </Label>
              <Textarea
                disabled={!canManage}
                id="partner-detail-description"
                maxLength={500}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                value={description}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner-detail-website">Site internet</Label>
              <Input
                autoComplete="off"
                disabled={!canManage}
                id="partner-detail-website"
                onChange={(event) => setWebsite(event.target.value)}
                type="url"
                value={website}
              />
            </div>
          </CardContent>
          {canManage && (
            <CardFooter className="justify-end">
              <Button disabled={saving} type="submit">
                {saving && <Loader2 className="size-4 animate-spin" />}
                Enregistrer
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Périodes de relation</h2>
          <p className="text-muted-foreground text-sm">
            Une reprise crée une nouvelle période sans effacer les précédentes.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {!partner.periods.length && (
            <p className="text-muted-foreground text-sm">
              Aucune relation active n’a encore été enregistrée.
            </p>
          )}
          {partner.periods.map((period) => (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              key={period.id}
            >
              <div>
                <p>
                  {period.startedOn ?? 'Début inconnu'} →{' '}
                  {period.closedAt
                    ? (period.endedOn ?? 'Fin inconnue')
                    : 'En cours'}
                </p>
                {period.closingNote && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {period.closingNote}
                  </p>
                )}
              </div>
              <Badge variant={period.closedAt ? 'outline' : 'secondary'}>
                {period.closedAt ? 'Terminée' : 'Active'}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {canDelete && (
        <EntityDangerZone
          description="Seule une fiche créée par erreur et encore dépourvue de période, d’interlocuteur ou de suivi peut être supprimée."
          dialogDescription="Cette action est irréversible. Vérifiez qu’il s’agit bien d’une fiche vide créée par erreur avant de confirmer."
          dialogNotice={`La fiche « ${partner.name} » sera effacée immédiatement et définitivement.`}
          onDelete={(version, idempotencyKey) =>
            deletePartner(partner.id, version, idempotencyKey)
          }
          onDeleted={() => window.location.assign(returnHref)}
          onReloadVersion={async () => {
            const fresh = await getPartner(partner.id);
            onChange(fresh);

            return fresh.version;
          }}
          version={partner.version}
        />
      )}
    </div>
  );
};

const ActivitySection: FC<{ partnerId: string }> = ({ partnerId }) => {
  const [items, setItems] = useState<PartnerActivityItem[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    void getPartnerActivity(partnerId)
      .then(setItems)
      .catch((caught) =>
        setError(caught instanceof Error ? caught : new Error('Erreur')),
      );
  }, [partnerId]);

  if (error) {
    return (
      <ContentState
        description={error.message}
        kind="error"
        title="Activité indisponible"
      />
    );
  }
  if (!items) return <Skeleton className="h-72 rounded-xl" />;

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold">Journal d’activité</h2>
        <p className="text-muted-foreground text-sm">
          Modifications réalisées sur cette organisation.
        </p>
      </CardHeader>
      <CardContent className="space-y-1">
        {!items.length && (
          <p className="text-muted-foreground text-sm">
            Aucun événement disponible.
          </p>
        )}
        {items.map((item) => (
          <div
            className="grid gap-2 border-b py-3 last:border-0 md:grid-cols-[1fr_14rem]"
            key={item.id}
          >
            <div className="flex gap-3">
              <span className="bg-surface-muted flex size-8 shrink-0 items-center justify-center rounded-md">
                <Activity className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{item.description}</p>
                <p className="text-muted-foreground text-xs">
                  {item.actor.displayName}
                </p>
              </div>
            </div>
            <time className="text-muted-foreground text-xs md:text-right">
              {formatDateTime(item.at)}
            </time>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const DetailContent: FC<{
  activeSection: PartnerDetailSection;
  partnerId: string;
  returnHref: string;
}> = ({ activeSection, partnerId, returnHref }) => {
  const { userData } = useUser();
  const {
    featureAvailabilityLoaded,
    operationalFeatureIds,
    refreshFeatureAvailability,
  } = useFeatureAvailability();
  const capabilities = getPartnerCapabilities(userData);
  const [partner, setPartner] = useState<PartnerDetail | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPartner(await getPartner(partnerId));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error('Erreur'));
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    if (
      capabilities.canView &&
      featureAvailabilityLoaded &&
      operationalFeatureIds.has(FEATURES.partners.id)
    ) {
      void load();
    } else {
      setLoading(false);
    }
  }, [
    capabilities.canView,
    featureAvailabilityLoaded,
    load,
    operationalFeatureIds,
  ]);

  useEffect(() => {
    const duplicates = sessionStorage.getItem(`partner-duplicate:${partnerId}`);
    if (!duplicates) return;
    sessionStorage.removeItem(`partner-duplicate:${partnerId}`);
    toast.warning(`Doublon possible : ${duplicates}`);
  }, [partnerId]);

  if (!capabilities.canView) {
    return (
      <AccessDeniedState
        actionHref={returnHref}
        actionLabel="Retour aux partenaires"
        description="Vous n’avez pas la permission de consulter cette fiche."
      />
    );
  }
  if (!featureAvailabilityLoaded || loading) return <DetailSkeleton />;
  if (!operationalFeatureIds.has(FEATURES.partners.id)) {
    return (
      <PageState
        actionLabel="Revérifier"
        description="La migration du module n’est pas disponible."
        onAction={() => void refreshFeatureAvailability()}
        title="Module temporairement indisponible"
      />
    );
  }
  if (error || !partner) {
    return (
      <PageState
        actionLabel="Réessayer"
        description={error?.message ?? 'La fiche ne peut pas être chargée.'}
        icon={<RefreshCw className="size-5" />}
        onAction={() => void load()}
        title={
          error instanceof ApiClientError && error.status === 404
            ? 'Fiche introuvable'
            : 'Chargement impossible'
        }
        tone="destructive"
      />
    );
  }

  const sectionHref = (section: PartnerDetailSection): string =>
    `${FEATURES.partners.href}/${encodeURIComponent(partner.id)}?${new URLSearchParams({ returnTo: returnHref, section })}`;

  return (
    <EntityDetailLayout
      activeSection={activeSection}
      ariaLiveLabel={`Section ${SECTIONS.find((section) => section.id === activeSection)?.label ?? activeSection} affichée`}
      backHref={returnHref}
      backLabel="Retour aux partenaires"
      heroIcon={<Handshake className="size-5" />}
      heroMeta={
        <>
          <PartnerStatusBadge status={partner.status} />
          {partner.categories.map((category) => (
            <Badge key={category} variant="outline">
              {
                // Categories are validated by the partner response schema.
                // eslint-disable-next-line security/detect-object-injection
                PARTNER_CATEGORY_LABELS[category]
              }
            </Badge>
          ))}
        </>
      }
      heroTitle={partner.name}
      railAriaLabel="Navigation de la fiche partenaire"
      sectionHref={sectionHref}
      sections={SECTIONS}
      tone="legal"
    >
      <Tabs value={activeSection}>
        <TabsContent value="information">
          <InformationSection
            canDelete={capabilities.canDelete}
            canManage={capabilities.canManage}
            onChange={setPartner}
            partner={partner}
            returnHref={returnHref}
          />
        </TabsContent>
        <TabsContent value="contacts">
          <PartnerContactsSection
            canManage={capabilities.canManage}
            canUpdatePersons={capabilities.canUpdatePersons}
            canViewInterlocutors={capabilities.canViewInterlocutors}
            onChange={setPartner}
            partner={partner}
          />
        </TabsContent>
        <TabsContent value="suivi">
          <PartnerFollowUpSection
            canManage={capabilities.canManage}
            canViewInterlocutors={capabilities.canViewInterlocutors}
            onChange={setPartner}
            partner={partner}
          />
        </TabsContent>
        <TabsContent value="activite">
          <ActivitySection partnerId={partner.id} />
        </TabsContent>
      </Tabs>
      <p className="text-muted-foreground px-1 text-xs">
        Créée le {formatDateTime(partner.createdAt)}
        {partner.createdBy ? ` par ${partner.createdBy.displayName}` : ''} ·
        dernière modification le {formatDateTime(partner.updatedAt)}
        {partner.updatedBy ? ` par ${partner.updatedBy.displayName}` : ''}.
      </p>
    </EntityDetailLayout>
  );
};

export const PartnerDetailPage: FC<{
  activeSection: PartnerDetailSection;
  partnerId: string;
  returnHref: string;
}> = (props) => (
  <AuthenticatedLayout
    breadcrumbs={[
      { label: FEATURES.partners.audit.poleLabel },
      { href: FEATURES.partners.href, label: FEATURES.partners.label },
      { label: 'Fiche' },
    ]}
  >
    <DetailContent {...props} />
  </AuthenticatedLayout>
);
