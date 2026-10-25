import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Named theme values of globals.css: without them, `rounded-panel` or
// `text-caption` would not override a conflicting class passed by a caller.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ['badge', 'compact', 'control', 'option', 'panel', 'tile'],
      text: ['caption', 'label'],
    },
  },
});

export const cn = (...inputs: ClassValue[]): string => {
  return twMerge(clsx(inputs));
};
