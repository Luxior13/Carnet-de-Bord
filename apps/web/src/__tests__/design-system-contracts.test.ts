import { describe, expect, it } from 'vitest';

import { badgeVariants } from '$ui/badge';
import { buttonVariants } from '$ui/button';

describe('design system contracts', () => {
  it('uses the accessible destructive fill for filled actions', () => {
    const buttonClasses = buttonVariants({ variant: 'destructive' });
    const badgeClasses = badgeVariants({ variant: 'destructive' });

    expect(buttonClasses).toContain('bg-destructive-fill');
    expect(buttonClasses).toContain('text-destructive-foreground');
    expect(buttonClasses).not.toContain('text-white');
    expect(badgeClasses).toContain('bg-destructive-fill');
    expect(badgeClasses).toContain('text-destructive-foreground');
    expect(badgeClasses).not.toContain('text-white');
  });

  it.each(['success', 'warning', 'info'] as const)(
    'exposes an accessible %s variant',
    (variant) => {
      expect(buttonVariants({ variant })).toContain(
        `text-${variant}-foreground`,
      );
      expect(badgeVariants({ variant })).toContain(
        `text-${variant}-foreground`,
      );
    },
  );

  it('keeps generic actions touch-friendly below the desktop breakpoint', () => {
    expect(buttonVariants()).toContain('h-10');
    expect(buttonVariants({ size: 'icon' })).toContain('size-10');
    expect(buttonVariants({ size: 'sm' })).toContain('h-10');
  });
});
