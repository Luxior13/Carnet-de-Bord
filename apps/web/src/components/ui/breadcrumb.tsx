import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { cn } from '$utils/css.utils';

export type BreadcrumbItem = {
  href?: string;
  label: string;
};

type BreadcrumbProps = {
  className?: string;
  items: BreadcrumbItem[];
  showHome?: boolean;
};

export function Breadcrumb({
  className,
  items,
  showHome = true,
}: BreadcrumbProps) {
  const allItems = showHome
    ? [{ href: '/', label: 'Accueil' }, ...items]
    : items;

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center', className)}>
      <ol className="flex items-center gap-1.5 text-[13px]">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const isFirst = index === 0 && showHome;

          return (
            <li key={item.label} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                >
                  {isFirst && <Home className="h-3.5 w-3.5" />}
                  {!isFirst && item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    'flex items-center gap-1.5',
                    isLast
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground',
                  )}
                >
                  {isFirst && <Home className="h-3.5 w-3.5" />}
                  {!isFirst && item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
