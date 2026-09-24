'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import React, { type FC } from 'react';

import { Button } from '$ui/button';
import { cn } from '$utils/css.utils';

type PageBackTarget =
  { href: string; onClick?: never } | { href?: never; onClick: () => void };

type PageBackButtonProps = PageBackTarget & {
  className?: string;
  fullWidth?: boolean;
  label: string;
};

export const PageBackButton: FC<PageBackButtonProps> = ({
  className,
  fullWidth = false,
  label,
  ...target
}) => {
  const buttonClassName = cn(
    'text-muted-foreground hover:text-foreground -ml-2 min-h-11 justify-start whitespace-normal text-left',
    fullWidth && 'w-full min-w-0 justify-start overflow-hidden px-2.5 text-xs',
    className,
  );
  const content = (
    <>
      <ArrowLeft className="size-4 shrink-0" />
      <span className={cn(fullWidth && 'min-w-0 truncate')}>{label}</span>
    </>
  );

  if (target.href) {
    return (
      <Button asChild className={buttonClassName} size="sm" variant="ghost">
        <Link href={target.href} title={fullWidth ? label : undefined}>
          {content}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      className={buttonClassName}
      onClick={target.onClick}
      size="sm"
      title={fullWidth ? label : undefined}
      type="button"
      variant="ghost"
    >
      {content}
    </Button>
  );
};

type PageBackNavigationProps = PageBackTarget & {
  label: string;
};

/** The parent link stays before the heading at every viewport size. */
export const PageBackNavigation: FC<PageBackNavigationProps> = (props) => (
  <nav aria-label={props.label}>
    <PageBackButton {...props} />
  </nav>
);
