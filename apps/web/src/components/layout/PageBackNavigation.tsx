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
      <Button asChild className={buttonClassName} size="sm" variant="outline">
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
      variant="outline"
    >
      {content}
    </Button>
  );
};

type PageBackNavigationProps = PageBackTarget & {
  label: string;
};

/**
 * Responsive back navigation for a relatively positioned page canvas.
 * It occupies the left rail on 2xl screens and falls back above the hero.
 */
export const PageBackNavigation: FC<PageBackNavigationProps> = (props) => (
  <>
    <nav
      aria-label={props.label}
      className="hidden 2xl:absolute 2xl:top-0 2xl:right-[calc(100%+2.5rem)] 2xl:bottom-0 2xl:block 2xl:w-44"
    >
      <div className="sticky top-4">
        <PageBackButton {...props} fullWidth />
      </div>
    </nav>
    <nav aria-label={props.label} className="2xl:hidden">
      <PageBackButton {...props} />
    </nav>
  </>
);
