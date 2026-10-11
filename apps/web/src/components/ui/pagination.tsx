'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { type FC, type ReactNode } from 'react';

import { Button } from '$ui/button';
import directoryStyles from '$ui/directory.module.css';
import { cn } from '$utils/css.utils';

type PaginationProps = {
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  limit: number;
  onPageChange: (page: number) => void;
  page: number;
  total: number;
  totalPages: number;
};

const Pagination: FC<PaginationProps> = ({
  ariaLabel = 'Pagination',
  className,
  disabled = false,
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
      aria-label={ariaLabel}
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
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Page précédente"
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
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
                aria-hidden="true"
                className="text-muted-foreground px-1 text-xs"
              >
                ...
              </span>
            ) : (
              <Button
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p}`}
                key={p}
                variant="navigation"
                size="icon"
                className="size-8 text-xs"
                disabled={disabled}
                onClick={() => onPageChange(p)}
                type="button"
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
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Page suivante"
          type="button"
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

type ListPaginationProps = {
  ariaLabel: string;
  canNext: boolean;
  canPrevious: boolean;
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
  leadingAction?: ReactNode;
  onNext: () => void;
  onPrevious: () => void;
  page: number;
  totalPages?: number;
};

/** Cursor and offset lists share controls, never assumptions about known pages. */
const ListPagination: FC<ListPaginationProps> = ({
  ariaLabel,
  canNext,
  canPrevious,
  className,
  disabled = false,
  isLoading = false,
  leadingAction,
  onNext,
  onPrevious,
  page,
  totalPages,
}) => (
  <nav
    aria-busy={isLoading || undefined}
    aria-label={ariaLabel}
    className={cn(directoryStyles.pagination, className)}
  >
    <p>
      Page <strong>{page.toLocaleString('fr-FR')}</strong>
      {totalPages !== undefined && totalPages > 1 && totalPages >= page && (
        <>
          {' '}
          sur <strong>{totalPages.toLocaleString('fr-FR')}</strong>
        </>
      )}
    </p>
    <div className={directoryStyles.paginationActions}>
      {leadingAction}
      <Button
        aria-label="Page précédente"
        className={directoryStyles.pageButton}
        disabled={disabled || isLoading || !canPrevious}
        onClick={onPrevious}
        size="icon"
        type="button"
        variant="ghost"
      >
        <ChevronLeft aria-hidden="true" />
      </Button>
      <Button
        aria-label="Page suivante"
        className={directoryStyles.pageButton}
        disabled={disabled || isLoading || !canNext}
        onClick={onNext}
        size="icon"
        type="button"
        variant="ghost"
      >
        <ChevronRight aria-hidden="true" />
      </Button>
    </div>
  </nav>
);

export { ListPagination, Pagination };
export type { PaginationProps };
