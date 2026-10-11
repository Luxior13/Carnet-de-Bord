'use client';

import { ShieldCheck } from 'lucide-react';
import React, { type FC } from 'react';

import { RoutesApi } from '$types/api.types';
import type { MfaSetupConfirmationData } from '$types/auth.types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '$ui/dialog';
import { ServiceIcon } from '$ui/service-icon';
import { apiFetch } from '$utils/api.utils';

import { MfaSetupFlow, type MfaSetupMode } from './MfaSetupFlow';

type MfaSetupDialogProps = {
  allowCancel?: boolean;
  mode: Exclude<MfaSetupMode, 'bootstrap'>;
  onCancel?: () => void;
  onComplete: (data: MfaSetupConfirmationData) => Promise<void> | void;
  open: boolean;
};

export const MfaSetupDialog: FC<MfaSetupDialogProps> = ({
  allowCancel = true,
  mode,
  onCancel,
  onComplete,
  open,
}) => {
  const isReplacing = mode === 'replace';
  const handleCancel = async (): Promise<void> => {
    const response = await apiFetch(RoutesApi.mfaChallenge, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Annulation impossible');
    onCancel?.();
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="p-0 sm:max-w-lg"
        hideCloseButton
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ServiceIcon className="bg-primary/10 text-primary-emphasis">
                <ShieldCheck className="size-4" />
              </ServiceIcon>
              {isReplacing
                ? 'Remplacer l’application'
                : 'Activer la double authentification'}
            </DialogTitle>
            <DialogDescription>
              {isReplacing
                ? 'Préparez la nouvelle application sans désactiver la protection actuelle.'
                : 'Cette protection est obligatoire. Ajoutez une application Authenticator puis conservez vos codes de secours.'}
            </DialogDescription>
          </DialogHeader>
          {open && (
            <div className="mt-4">
              <MfaSetupFlow
                allowCancel={allowCancel}
                mode={mode}
                onCancel={handleCancel}
                onComplete={onComplete}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
