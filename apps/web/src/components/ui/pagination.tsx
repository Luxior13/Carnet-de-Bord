'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { type FC } from 'react';

import { Button } from '$ui/button';
import { cn } from '$utils/css.utils';

type PaginationProps = {
  className?: string;
  limit: number;
  onPageChange: (page: number) => void;
  page: number;
  total: number;
  totalPages: number;
};

const Pagination: FC<PaginationProps> = ({
  className,
  limit,
  onPageChange,
  page,
  total,
  totalPages,
}) => {
  if (totalPages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  // Generate page numbers to show
  const pages: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('ellipsis');
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
  }

  return (
    <div
      aria-label="Pagination"
      className={cn(
        'flex items-center justify-between border-t px-3 py-2 sm:px-4 sm:py-3',
        className,
      )}
      role="navigation"
    >
      <p className="text-muted-foreground text-xs">
        {start}-{end} sur {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-10 lg:size-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {/* Page numbers hidden on mobile, show current/total instead */}
        <span
          aria-label={`Page ${page} sur ${totalPages}`}
          aria-live="polite"
          className="text-muted-foreground px-2 text-xs lg:hidden"
        >
          {page}/{totalPages}
        </span>
        <div className="hidden lg:flex lg:items-center lg:gap-1">
          {pages.map((p, i) =>
            p === 'ellipsis' ? (
              <span
                key={`e-${i}`}
                className="text-muted-foreground px-1 text-xs"
              >
                ...
              </span>
            ) : (
              <Button
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p}`}
                key={p}
                variant={p === page ? 'default' : 'ghost'}
                size="icon"
                className="size-8 text-xs"
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            ),
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 lg:size-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Page suivante"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export { Pagination };
export type { PaginationProps };
