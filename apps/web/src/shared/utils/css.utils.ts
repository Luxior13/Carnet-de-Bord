import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]): string => {
  return twMerge(clsx(inputs));
};

export enum AppThemes {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

export enum EntitySize {
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
}

export enum EntityHeight {
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
}
