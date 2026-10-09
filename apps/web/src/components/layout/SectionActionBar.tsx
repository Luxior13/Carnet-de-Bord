'use client';

import { Check, Loader2, Undo2 } from 'lucide-react';
import React, { type FC } from 'react';

import { Button } from '$ui/button';

type SectionActionBarProps = {
  conflict?: boolean;
  isSaving?: boolean;
  onCancel: () => void;
  onResolveConflict?: () => void;
  onSave: () => void;
  saveLabel?: string;
};

/**
 * Barre d'action d'une section en édition directe.
 *
 * Elle est `sticky` dans la carte de la section : elle suit le scroll, reste
 * visible tant qu'il y a des modifications, et surtout elle prend
 * automatiquement la largeur de la colonne de contenu — aucun calcul d'offset
 * ni de largeur n'est nécessaire.
 */
export const SectionActionBar: FC<SectionActionBarProps> = ({
  conflict = false,
  isSaving = false,
  onCancel,
  onResolveConflict,
  onSave,
  saveLabel = 'Enregistrer',
}) => (
  <div
    aria-live="polite"
    className="border-border-default bg-surface-panel sticky bottom-4 z-20 m-3 flex flex-col-reverse items-start justify-between gap-2 rounded-lg border px-4 py-3 shadow-[var(--shadow-panel-strong)] sm:flex-row sm:items-center"
  >
    <p className="text-muted-foreground min-w-0 text-xs">
      {conflict
        ? 'La fiche a changé depuis son ouverture. Actualisez la version avant d’enregistrer.'
        : 'Modifications non enregistrées'}
    </p>
    <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
      {conflict && onResolveConflict ? (
        <Button onClick={onResolveConflict} size="sm" variant="outline">
          Actualiser la version
        </Button>
      ) : null}
      <Button
        disabled={isSaving}
        onClick={onCancel}
        size="sm"
        type="button"
        variant="outline"
      >
        <Undo2 className="size-4" />
        Annuler
      </Button>
      <Button
        disabled={isSaving || conflict}
        onClick={onSave}
        size="sm"
        type="button"
      >
        {isSaving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        {isSaving ? 'Enregistrement…' : saveLabel}
      </Button>
    </div>
  </div>
);
