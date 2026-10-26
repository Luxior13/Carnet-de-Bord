'use client';

import { Info } from 'lucide-react';
import React, { type FC, type ReactNode } from 'react';

import { Button } from '$ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '$ui/popover';

import styles from './PermissionsEditor.module.css';

/**
 * « (i) » next to a permission title: its description, and an optional
 * footnote (prerequisites), in a popover. Shared by the administrative and
 * personal views so both read the same way.
 */
export const PermissionInfoButton: FC<{
  description: string;
  footnote?: ReactNode;
  label: string;
}> = ({ description, footnote, label }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={styles.infoTrigger}
        aria-label={`Détails : ${label}`}
      >
        <Info className="size-4" aria-hidden="true" />
      </Button>
    </PopoverTrigger>
    <PopoverContent
      align="start"
      aria-label={`Détails : ${label}`}
      className="w-80 space-y-3 p-3 text-xs leading-5"
      collisionPadding={12}
    >
      <p className="text-foreground text-sm font-semibold">{label}</p>
      <p className="text-muted-foreground">{description}</p>
      {footnote && <p className={styles.popoverFootnote}>{footnote}</p>}
    </PopoverContent>
  </Popover>
);
