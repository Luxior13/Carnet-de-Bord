import React, { type FC } from 'react';

import type {
  PersonEmailItem,
  PersonPhoneItem,
} from '$features/persons/types/person.types';
import { Label } from '$ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';

const NONE_VALUE = '__none__';

export const PartnerPersonCoordinateSelect: FC<{
  disabled: boolean;
  items: PersonEmailItem[] | PersonPhoneItem[];
  kind: 'email' | 'phone';
  onChange: (value: string) => void;
  value: string;
}> = ({ disabled, items, kind, onChange, value }) => {
  const isEmail = kind === 'email';
  const label = isEmail ? 'Email à utiliser' : 'Téléphone à utiliser';

  if (items.length === 0) {
    return (
      <div className="grid min-w-0 gap-2">
        <p
          className="text-sm font-medium"
          id={`partner-interlocutor-${kind}-label`}
        >
          {label}
        </p>
        <div
          aria-disabled="true"
          aria-labelledby={`partner-interlocutor-${kind}-label`}
          className="bg-surface-inset text-muted-foreground rounded-lg border px-3 py-2 text-sm"
        >
          {isEmail
            ? 'Aucun email sur cette fiche'
            : 'Aucun téléphone sur cette fiche'}
        </div>
        <p className="text-muted-foreground text-xs">
          Ajoutez cette information dans le Répertoire si elle est utile.
        </p>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={`partner-interlocutor-${kind}`}>{label}</Label>
      <Select
        disabled={disabled}
        onValueChange={(nextValue) =>
          onChange(nextValue === NONE_VALUE ? '' : nextValue)
        }
        value={value || NONE_VALUE}
      >
        <SelectTrigger
          className="w-full min-w-0"
          id={`partner-interlocutor-${kind}`}
        >
          <SelectValue placeholder="Aucun" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>Aucun</SelectItem>
          {items.map((item) => {
            const coordinate = isEmail
              ? (item as PersonEmailItem).email
              : (item as PersonPhoneItem).phone;

            return (
              <SelectItem key={item.id} value={item.id}>
                {item.label} — {coordinate}
                {item.isPrimary ? ' · Principal' : ''}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground text-xs">
        Sélection facultative, conservée comme préférence pour cette liaison.
      </p>
    </div>
  );
};
