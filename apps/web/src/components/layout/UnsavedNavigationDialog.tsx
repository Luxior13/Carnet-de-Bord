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
  confirmLabel?: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title?: string;
};

export const UnsavedNavigationDialog: FC<UnsavedNavigationDialogProps> = ({
  cancelLabel = 'Rester',
  confirmLabel = 'Quitter sans enregistrer',
  description,
  onCancel,
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
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
        <AlertDialogAction
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={onConfirm}
        >
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
