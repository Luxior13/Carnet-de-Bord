'use client';

import { ShieldCheck } from 'lucide-react';
import React, { type FC, useEffect, useRef } from 'react';

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
  onCloseAutoFocus?: React.ComponentProps<
    typeof DialogContent
  >['onCloseAutoFocus'];
  onComplete: (data: MfaSetupConfirmationData) => Promise<void> | void;
  open: boolean;
};

export const MfaSetupDialog: FC<MfaSetupDialogProps> = ({
  allowCancel = true,
  mode,
  onCancel,
  onCloseAutoFocus,
  onComplete,
  open,
}) => {
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return (): void => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [open]);
  const isReplacing = mode === 'replace';
  const handleCancel = async (): Promise<void> => {
    if (requestRef.current || !open) return;
    const request = new AbortController();
    requestRef.current = request;
    const timeout = setTimeout(() => request.abort(), 30_000);
    try {
      const response = await apiFetch(RoutesApi.mfaChallenge, {
        method: 'DELETE',
        signal: request.signal,
      });
      if (requestRef.current !== request) return;
      if (!response.ok || request.signal.aborted)
        throw new Error('Annulation impossible');
      onCancel?.();
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === request) requestRef.current = null;
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="p-0 sm:max-w-lg"
        hideCloseButton
        onCloseAutoFocus={onCloseAutoFocus}
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
