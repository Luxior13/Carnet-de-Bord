'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { type FC } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { PageDetailSkeleton } from '$components/layout/PageDetailSkeleton';
import { AccessDeniedState, PageState } from '$components/layout/PageState';
import { FEATURES } from '$constants/feature-registry.constants';
import { PAGE_PATHS } from '$constants/routes.constants';
import { Button } from '$ui/button';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { getSafeCollectionReturnHref } from '$utils/navigation.utils';

const recordBreadcrumbs = (
  returnHref: string,
): { href?: string; label: string }[] => [
  { label: FEATURES.users.audit.poleLabel },
  { href: returnHref, label: FEATURES.users.label },
  { label: 'Fiche' },
];

export const UserDetailPageSkeleton: FC<{ returnHref?: string }> = ({
  returnHref,
}) => {
  const searchParams = useSearchParams();
  const resolvedReturnHref =
    returnHref ??
    getSafeCollectionReturnHref(searchParams.get('returnTo'), PAGE_PATHS.users);

  return (
    <AuthenticatedLayout breadcrumbs={recordBreadcrumbs(resolvedReturnHref)}>
      <PageShell className="py-0">
        <PageCanvas contentClassName="relative space-y-4">
          <PageDetailSkeleton />
        </PageCanvas>
      </PageShell>
    </AuthenticatedLayout>
  );
};

/**
 * The record cannot be shown: no right to read it (403, also used when the
 * actor cannot view users at all), missing account (404) or a failed read.
 */
export const UserDetailUnavailable: FC<{
  errorMessage: string | null;
  errorStatus: number | null;
  onRetry: () => void;
  returnHref: string;
}> = ({ errorMessage, errorStatus, onRetry, returnHref }) => {
  const isNotFound = errorStatus === 404;

  return (
    <AuthenticatedLayout breadcrumbs={recordBreadcrumbs(returnHref)}>
      {errorStatus === 403 ? (
        <AccessDeniedState
          actionHref={returnHref}
          actionLabel="Retour aux utilisateurs"
          description="Vous n'avez pas la permission de consulter cet utilisateur."
        />
      ) : (
        <PageState
          actionHref={isNotFound ? returnHref : undefined}
          actionLabel={isNotFound ? 'Retour aux utilisateurs' : 'Réessayer'}
          description={
            isNotFound
              ? "Ce compte n'existe pas ou a été supprimé."
              : errorMessage || "Impossible de charger l'utilisateur."
          }
          onAction={isNotFound ? undefined : onRetry}
          secondaryActionHref={isNotFound ? undefined : returnHref}
          secondaryActionLabel={
            isNotFound ? undefined : 'Retour aux utilisateurs'
          }
          title={
            isNotFound
              ? 'Utilisateur introuvable'
              : 'Impossible de charger la fiche'
          }
          tone="destructive"
        />
      )}
    </AuthenticatedLayout>
  );
};

/** Notices above the sections: protected system account, or one's own record. */
export const UserDetailNotices: FC<{
  isSelf: boolean;
  isTargetIdentityMasked: boolean;
}> = ({ isSelf, isTargetIdentityMasked }) => (
  <>
    {isTargetIdentityMasked && (
      <div className="border-warning/30 bg-warning/10 text-foreground flex gap-3 rounded-lg border p-3 sm:p-4">
        <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
        <div>
          <p className="text-sm font-medium">Compte système protégé</p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            Ce compte reste visible pour la cohérence administrative, mais son
            identité technique, ses accès, sa sécurité et son activité sont
            réservés à son propriétaire.
          </p>
        </div>
      </div>
    )}
    {isSelf && (
      <div className="border-primary/25 bg-primary/[0.08] flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="min-w-0">
          <p className="text-foreground text-sm font-medium">
            Votre fiche administrative est en lecture seule
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            Consultez ici les informations de gestion. Utilisez Mon compte pour
            modifier vos informations personnelles et votre sécurité.
          </p>
        </div>
        <Button asChild className="shrink-0" size="sm">
          <Link href="/mon-compte">Gérer mon compte</Link>
        </Button>
      </div>
    )}
  </>
);
