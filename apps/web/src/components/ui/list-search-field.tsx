'use client';

import { Search, X } from 'lucide-react';
import React, { type FC, useId, useRef } from 'react';

import { Button } from '$ui/button';
import directoryStyles from '$ui/directory.module.css';
import { Input } from '$ui/input';

type ListSearchFieldProps = {
  ariaLabel: string;
  disabled?: boolean;
  id?: string;
  maxLength: number;
  onClear: () => void;
  onValueChange: (value: string) => void;
  placeholder: string;
  title?: string;
  value: string;
};

/** Shared directory search; the consumer owns debounce, URL and filters. */
export const ListSearchField: FC<ListSearchFieldProps> = ({
  ariaLabel,
  disabled = false,
  id,
  maxLength,
  onClear,
  onValueChange,
  placeholder,
  title,
  value,
}) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={directoryStyles.search}>
      <Search aria-hidden="true" />
      <Input
        aria-label={ariaLabel}
        autoCapitalize="none"
        autoComplete="off"
        className={directoryStyles.searchInput}
        disabled={disabled}
        enterKeyHint="search"
        id={inputId}
        maxLength={maxLength}
        name="directory-search"
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        ref={inputRef}
        spellCheck={false}
        title={title}
        type="search"
        value={value}
      />
      {value && (
        <Button
          aria-controls={inputId}
          aria-label="Effacer la recherche"
          className={directoryStyles.searchClear}
          disabled={disabled}
          onClick={() => {
            onClear();
            // The button disappears when cleared; keep keyboard users in the field.
            inputRef.current?.focus({ preventScroll: true });
          }}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  );
};
