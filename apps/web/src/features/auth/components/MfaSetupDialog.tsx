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
  loginName?: string;
  mode: Exclude<MfaSetupMode, 'bootstrap'>;
  onCancel?: () => void;
  onComplete: (data: MfaSetupConfirmationData) => Promise<void> | void;
  open: boolean;
};

export const MfaSetupDialog: FC<MfaSetupDialogProps> = ({
  allowCancel = true,
  loginName,
  mode,
  onCancel,
  onComplete,
  open,
}) => {
  const isReplacing = mode === 'replace';
  const handleCancel = async (): Promise<void> => {
    try {
      await apiFetch(RoutesApi.mfaChallenge, { method: 'DELETE' });
    } finally {
      onCancel?.();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && allowCancel) void handleCancel();
      }}
    >
      <DialogContent
        className="max-h-[calc(100svh-2rem)] overflow-y-auto p-0 sm:max-w-lg"
        hideCloseButton
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <div className="bg-primary h-1 w-full" />
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ServiceIcon className="bg-primary/10 text-primary">
                <ShieldCheck className="size-4" />
              </ServiceIcon>
              {isReplacing
                ? 'Remplacer l’application'
                : 'Activer la double authentification'}
            </DialogTitle>
            <DialogDescription>
              {isReplacing
                ? 'Préparez la nouvelle application sans désactiver la protection actuelle.'
                : 'Ajoutez une application Authenticator puis conservez vos codes de secours.'}
            </DialogDescription>
          </DialogHeader>
          {open && (
            <div className="mt-4">
              <MfaSetupFlow
                allowCancel={allowCancel}
                loginName={loginName}
                mode={mode}
                onCancel={() => void handleCancel()}
                onComplete={onComplete}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
