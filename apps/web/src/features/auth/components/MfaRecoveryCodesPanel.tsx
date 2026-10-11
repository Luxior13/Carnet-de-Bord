'use client';

import { Check, Copy, Download } from 'lucide-react';
import React, { type FC, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { SITE_CONFIG } from '$constants/app.constants';
import { Button } from '$ui/button';
import { Checkbox } from '$ui/checkbox';
import { Label } from '$ui/label';

type MfaRecoveryCodesPanelProps = {
  codes: string[];
  isFinishing?: boolean;
  onFinish: () => void;
};

const buildRecoveryCodesFile = (codes: string[]): string =>
  [
    `Codes de secours ${SITE_CONFIG.name}`,
    'Chaque code ne peut être utilisé qu’une seule fois.',
    '',
    ...codes,
    '',
  ].join('\n');

export const MfaRecoveryCodesPanel: FC<MfaRecoveryCodesPanelProps> = ({
  codes,
  isFinishing = false,
  onFinish,
}) => {
  const [hasSavedCodes, setHasSavedCodes] = useState(false);
  const copyOperationRef = useRef(0);
  const savedCodesRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setHasSavedCodes(false);
    savedCodesRef.current?.focus();
    copyOperationRef.current++;

    return (): void => {
      // This counter invalidates promises; it is not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      copyOperationRef.current++;
    };
  }, [codes]);
  useEffect(() => {
    const preventLostCodes = (event: BeforeUnloadEvent): void => {
      if (!hasSavedCodes) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', preventLostCodes);

    return (): void =>
      window.removeEventListener('beforeunload', preventLostCodes);
  }, [hasSavedCodes]);

  const handleCopy = async (): Promise<void> => {
    const operation = ++copyOperationRef.current;
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      if (operation !== copyOperationRef.current) return;
      toast.success('Codes de secours copiés');
    } catch {
      if (operation !== copyOperationRef.current) return;
      toast.error('Impossible de copier les codes');
    }
  };

  const handleDownload = (): void => {
    const blob = new Blob([buildRecoveryCodesFile(codes)], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.download = `codes-secours-${SITE_CONFIG.name.toLowerCase()}-${new Date()
      .toISOString()
      .slice(0, 10)}.txt`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div
        className="border-warning/35 bg-warning/10 rounded-md border p-3 text-sm leading-6"
        role="status"
      >
        Ces codes ne seront plus affichés. Enregistrez-les hors de votre
        téléphone avant de terminer.
      </div>

      <ul
        aria-label="Codes de secours"
        className="border-border/70 bg-background grid gap-2 rounded-md border p-3 sm:grid-cols-2"
      >
        {codes.map((code) => (
          <li
            className="bg-surface-inset min-w-0 rounded border px-3 py-2 text-center font-mono text-sm tracking-wider break-all"
            key={code}
          >
            {code}
          </li>
        ))}
      </ul>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          onClick={() => void handleCopy()}
          type="button"
          variant="outline"
        >
          <Copy className="size-4" />
          Copier
        </Button>
        <Button onClick={handleDownload} type="button" variant="outline">
          <Download className="size-4" />
          Télécharger
        </Button>
      </div>

      <div className="flex items-start gap-2 rounded-md border p-3">
        <Checkbox
          checked={hasSavedCodes}
          ref={savedCodesRef}
          disabled={isFinishing}
          id="mfa-recovery-codes-saved"
          onCheckedChange={(checked) => setHasSavedCodes(checked === true)}
        />
        <Label
          className="cursor-pointer text-sm leading-5 font-normal"
          htmlFor="mfa-recovery-codes-saved"
        >
          J’ai enregistré ces codes dans un endroit sûr.
        </Label>
      </div>

      <Button
        className="w-full"
        disabled={!hasSavedCodes || isFinishing}
        loading={isFinishing}
        onClick={onFinish}
        type="button"
      >
        {!isFinishing && <Check className="size-4" />}
        {isFinishing ? 'Finalisation…' : 'Terminer'}
      </Button>
    </div>
  );
};
