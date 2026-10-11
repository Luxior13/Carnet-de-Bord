'use client';

import { Clipboard, KeyRound } from 'lucide-react';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { Button } from '$ui/button';
import { Card, CardContent } from '$ui/card';
import { Checkbox } from '$ui/checkbox';
import { Label } from '$ui/label';

import type { useUserPasswordReset } from './useUserPasswordReset';

export const UserPasswordResetFeedback: FC<{
  controller: ReturnType<typeof useUserPasswordReset>;
  onCheck: () => Promise<boolean>;
  onRequestReset: () => void;
}> = ({ controller: reset, onCheck, onRequestReset }) => {
  const [copyMessage, setCopyMessage] = useState('');
  const copyOperation = useRef(0);
  useEffect(() => {
    copyOperation.current += 1;
    setCopyMessage('');

    return (): void => {
      copyOperation.current += 1;
    };
  }, [reset.password]);
  if (!reset.password && !reset.error && !reset.expired) return null;
  const copy = async (): Promise<void> => {
    if (!reset.password) return;
    const operation = ++copyOperation.current;
    setCopyMessage('');
    try {
      await navigator.clipboard.writeText(reset.password);
      if (operation !== copyOperation.current) return;
      setCopyMessage(
        'Mot de passe copié. Confirmez que vous l’avez conservé pour le transmettre.',
      );
    } catch {
      if (operation !== copyOperation.current) return;
      setCopyMessage(
        'Copie impossible. Sélectionnez et copiez le mot de passe manuellement.',
      );
    }
  };

  return (
    <Card
      className="border-warning/25 bg-warning/10"
      ref={reset.announcementRef}
      tabIndex={-1}
    >
      <CardContent className="space-y-3 p-3 sm:p-4">
        {reset.password ? (
          <>
            <h3 className="text-warning flex items-center gap-2 text-sm font-semibold">
              <KeyRound className="size-4" />
              Nouveau mot de passe temporaire
            </h3>
            <p className="text-muted-foreground text-xs">
              Les sessions ont été fermées. Conservez ce mot de passe pour le
              transmettre. Il sera masqué automatiquement deux minutes après son
              émission ; cela n’annule pas la réinitialisation.
            </p>
            <div className="flex min-w-0 items-center gap-2">
              <code className="bg-surface-inset min-w-0 flex-1 overflow-x-auto rounded-md border px-3 py-2 text-sm">
                {reset.password}
              </code>
              <Button
                aria-label="Copier le mot de passe temporaire"
                onClick={() => void copy()}
                size="icon"
                type="button"
                variant="outline"
              >
                <Clipboard className="size-4" />
              </Button>
            </div>
            <p className="text-muted-foreground text-xs" role="status">
              {copyMessage}
            </p>
            <div className="flex min-h-11 items-center gap-3">
              <Checkbox
                checked={reset.acknowledged}
                id="reset-password-preserved"
                onCheckedChange={(value) =>
                  reset.setAcknowledged(value === true)
                }
              />
              <Label className="text-xs" htmlFor="reset-password-preserved">
                J’ai conservé ce mot de passe pour le transmettre.
              </Label>
            </div>
            <Button
              disabled={!reset.acknowledged}
              onClick={() => {
                reset.clearPassword();
                requestAnimationFrame(() =>
                  document.getElementById('user-reset-password')?.focus(),
                );
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              Terminer et masquer
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm" role={reset.error ? 'alert' : 'status'}>
              {reset.error ??
                'Le mot de passe temporaire a été masqué après deux minutes. Si vous ne l’avez pas conservé, vous pouvez en émettre un nouveau.'}
            </p>
            {reset.verification && (
              <p className="text-muted-foreground text-xs" role="status">
                {reset.verification}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {reset.outcomeUnknown && (
                <Button
                  disabled={reset.isChecking || reset.isResetting}
                  onClick={() => void reset.check(onCheck)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {reset.isChecking
                    ? 'Vérification…'
                    : 'Vérifier l’état du compte'}
                </Button>
              )}
              {(reset.expired || (reset.outcomeUnknown && reset.verified)) && (
                <Button
                  disabled={reset.isResetting}
                  onClick={onRequestReset}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Émettre un nouveau mot de passe
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
