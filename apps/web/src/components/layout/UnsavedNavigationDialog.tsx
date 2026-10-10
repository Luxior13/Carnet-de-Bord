'use client';

import React, { type FC } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '$ui/alert-dialog';

type UnsavedNavigationDialogProps = {
  cancelLabel?: string;
  confirmDisabled?: boolean;
  confirmLabel?: string;
  contentClassName?: string;
  description: string;
  onCancel: () => void;
  onCloseAutoFocus?: (event: Event) => void;
  onConfirm: () => void;
  open: boolean;
  title?: string;
};

export const UnsavedNavigationDialog: FC<UnsavedNavigationDialogProps> = ({
  cancelLabel = 'Rester',
  confirmDisabled = false,
  confirmLabel = 'Quitter sans enregistrer',
  contentClassName,
  description,
  onCancel,
  onCloseAutoFocus,
  onConfirm,
  open,
  title = 'Quitter sans enregistrer ?',
}) => (
  <AlertDialog
    open={open}
    onOpenChange={(nextOpen) => {
      if (!nextOpen) onCancel();
    }}
  >
    <AlertDialogContent
      className={contentClassName}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
        <AlertDialogAction
          disabled={confirmDisabled}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={onConfirm}
        >
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
