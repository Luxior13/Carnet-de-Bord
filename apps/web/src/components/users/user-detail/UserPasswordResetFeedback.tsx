'use client';

import { Check, Clipboard, KeyRound, TriangleAlert } from 'lucide-react';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { Button } from '$ui/button';
import { CardContent, CardFooter } from '$ui/card';
import { Checkbox } from '$ui/checkbox';
import { Label } from '$ui/label';
import { cn } from '$utils/css.utils';

import type { useUserPasswordReset } from './useUserPasswordReset';

type PasswordReset = ReturnType<typeof useUserPasswordReset>;

/** True while the Password card shows a reset result instead of its action. */
export const hasPasswordResetFeedback = (reset: PasswordReset): boolean =>
  Boolean(reset.password || reset.error || reset.expired);

const FOOTER_CLASS =
  'flex-col items-stretch gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4';

/**
 * Result of a password reset, shown inside the Password card in place of its
 * reset action: the temporary password to hand over, or the outcome to check.
 */
export const UserPasswordResetFeedback: FC<{
  controller: PasswordReset;
  onCheck: () => Promise<boolean>;
  onRequestReset: () => void;
}> = ({ controller: reset, onCheck, onRequestReset }) => {
  const [copyMessage, setCopyMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const copyOperation = useRef(0);
  useEffect(() => {
    copyOperation.current += 1;
    setCopyMessage('');
    setCopied(false);

    return (): void => {
      copyOperation.current += 1;
    };
  }, [reset.password]);
  const copy = async (): Promise<void> => {
    if (!reset.password) return;
    const operation = ++copyOperation.current;
    setCopyMessage('');
    setCopied(false);
    try {
      await navigator.clipboard.writeText(reset.password);
      if (operation !== copyOperation.current) return;
      setCopied(true);
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

  if (!reset.password) {
    return (
      <div ref={reset.announcementRef} tabIndex={-1} className="outline-none">
        <CardContent className="border-border-divider border-t p-3 sm:p-4">
          <div className="border-warning/30 bg-warning/10 rounded-control flex items-start gap-2 border p-3">
            <TriangleAlert className="text-warning mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 space-y-1">
              <p
                className="text-foreground text-sm"
                role={reset.error ? 'alert' : 'status'}
              >
                {reset.error ??
                  'Le mot de passe temporaire a été masqué après deux minutes. Si vous ne l’avez pas conservé, vous pouvez en émettre un nouveau.'}
              </p>
              {reset.verification && (
                <p className="text-muted-foreground text-xs" role="status">
                  {reset.verification}
                </p>
              )}
            </div>
          </div>
        </CardContent>
        {(reset.outcomeUnknown || reset.expired) && (
          <CardFooter className={`${FOOTER_CLASS} sm:justify-end`}>
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
          </CardFooter>
        )}
      </div>
    );
  }

  return (
    <div ref={reset.announcementRef} tabIndex={-1} className="outline-none">
      <CardContent className="border-border-divider border-t p-3 sm:p-4">
        <div className="border-warning/30 bg-warning/10 rounded-control space-y-3 border p-3">
          <div className="flex items-start gap-2">
            <KeyRound className="text-warning mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 space-y-0.5">
              <h4 className="text-foreground text-sm font-semibold">
                Mot de passe temporaire à transmettre
              </h4>
              <p className="text-muted-foreground text-xs">
                Les sessions de l’utilisateur ont été fermées. Ce mot de passe
                sera masqué deux minutes après son émission ; la
                réinitialisation reste acquise.
              </p>
            </div>
          </div>
          <div className="flex max-w-md min-w-0 items-center gap-2">
            <code className="bg-input border-border-form rounded-control text-foreground flex h-10 min-w-0 flex-1 items-center overflow-x-auto border px-3 font-mono text-sm tracking-wide whitespace-nowrap select-all">
              {reset.password}
            </code>
            <Button
              aria-label={
                copied
                  ? 'Mot de passe temporaire copié'
                  : 'Copier le mot de passe temporaire'
              }
              className="h-10 shrink-0 gap-2"
              onClick={() => void copy()}
              size="sm"
              type="button"
              variant="outline"
            >
              {copied ? (
                <Check className="text-success size-4" />
              ) : (
                <Clipboard className="size-4" />
              )}
              {copied ? 'Copié' : 'Copier'}
            </Button>
          </div>
          <p
            // Success shows on the button; the sentence stays for screen readers.
            className={cn(
              'text-muted-foreground text-xs empty:hidden',
              copied && 'sr-only',
            )}
            role="status"
          >
            {copyMessage}
          </p>
        </div>
      </CardContent>
      <CardFooter className={FOOTER_CLASS}>
        <div className="flex min-h-10 items-center gap-3">
          <Checkbox
            checked={reset.acknowledged}
            id="reset-password-preserved"
            onCheckedChange={(value) => reset.setAcknowledged(value === true)}
          />
          <Label className="text-xs" htmlFor="reset-password-preserved">
            J’ai conservé ce mot de passe pour le transmettre.
          </Label>
        </div>
        <Button
          className="w-full sm:w-auto"
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
      </CardFooter>
    </div>
  );
};
