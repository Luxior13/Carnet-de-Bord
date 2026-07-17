import React, { type FC, type ReactNode } from 'react';

import { ContentState } from '$components/layout/ContentState';
import { Button } from '$ui/button';

type ResourceStateBoundaryProps = {
  children: ReactNode;
  emptyDescription?: ReactNode;
  emptyTitle?: ReactNode;
  error: Error | null;
  isEmpty: boolean;
  isLoading: boolean;
  loadingFallback: ReactNode;
  onRetry?: () => void;
};

export const ResourceStateBoundary: FC<ResourceStateBoundaryProps> = ({
  children,
  emptyDescription = 'Aucune donnée ne correspond à cette vue.',
  emptyTitle = 'Aucun résultat',
  error,
  isEmpty,
  isLoading,
  loadingFallback,
  onRetry,
}) => {
  if (isLoading) return loadingFallback;

  if (error) {
    return (
      <ContentState
        action={
          onRetry ? (
            <Button onClick={onRetry} size="sm" type="button" variant="outline">
              Réessayer
            </Button>
          ) : undefined
        }
        description={error.message}
        kind="error"
        layout="panel"
        title="Chargement impossible"
      />
    );
  }

  if (isEmpty) {
    return (
      <ContentState
        description={emptyDescription}
        layout="panel"
        title={emptyTitle}
      />
    );
  }

  return children;
};
