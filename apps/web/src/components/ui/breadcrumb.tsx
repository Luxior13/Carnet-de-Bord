import { Slot } from '@radix-ui/react-slot';
import { ChevronRight, Home, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { cn } from '$utils/css.utils';

export type BreadcrumbEntry = {
  href?: string;
  label: string;
};

type BreadcrumbProps = React.ComponentProps<'nav'>;

function Breadcrumb({
  'aria-label': ariaLabel = "Fil d'Ariane",
  className,
  ...props
}: BreadcrumbProps): React.ReactNode {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn('max-w-full min-w-0', className)}
      {...props}
    />
  );
}

type BreadcrumbListProps = React.ComponentProps<'ol'>;

function BreadcrumbList({
  className,
  ...props
}: BreadcrumbListProps): React.ReactNode {
  return (
    <ol
      className={cn(
        'flex max-w-full min-w-0 items-center gap-1 overflow-hidden text-[13px] whitespace-nowrap',
        className,
      )}
      {...props}
    />
  );
}

type BreadcrumbItemProps = React.ComponentProps<'li'>;

function BreadcrumbItem({
  className,
  ...props
}: BreadcrumbItemProps): React.ReactNode {
  return (
    <li
      className={cn('inline-flex min-w-0 items-center', className)}
      {...props}
    />
  );
}

type BreadcrumbLinkProps = React.ComponentProps<'a'> & {
  asChild?: boolean;
};

function BreadcrumbLink({
  asChild = false,
  className,
  ...props
}: BreadcrumbLinkProps): React.ReactNode {
  const Comp = asChild ? Slot : 'a';

  return (
    <Comp
      className={cn(
        'text-muted-foreground hover:text-foreground inline-flex min-w-0 items-center gap-1.5 truncate transition-colors',
        className,
      )}
      {...props}
    />
  );
}

type BreadcrumbPageProps = React.ComponentProps<'span'>;

function BreadcrumbPage({
  className,
  ...props
}: BreadcrumbPageProps): React.ReactNode {
  return (
    <span
      aria-current="page"
      className={cn(
        'text-foreground inline-flex min-w-0 items-center gap-1.5 truncate font-medium',
        className,
      )}
      {...props}
    />
  );
}

type BreadcrumbSeparatorProps = React.ComponentProps<'li'>;

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: BreadcrumbSeparatorProps): React.ReactNode {
  return (
    <li
      aria-hidden="true"
      className={cn(
        'text-muted-foreground/75 inline-flex shrink-0 items-center',
        className,
      )}
      role="presentation"
      {...props}
    >
      {children ?? <ChevronRight className="size-3.5" />}
    </li>
  );
}

type BreadcrumbEllipsisProps = React.ComponentProps<'span'>;

function BreadcrumbEllipsis({
  className,
  ...props
}: BreadcrumbEllipsisProps): React.ReactNode {
  return (
    <span
      className={cn(
        'text-muted-foreground flex size-6 items-center justify-center rounded-md',
        className,
      )}
      {...props}
    >
      <MoreHorizontal aria-hidden="true" className="size-4" />
      <span className="sr-only">Plus de pages</span>
    </span>
  );
}

type BreadcrumbTrailProps = BreadcrumbProps & {
  items: BreadcrumbEntry[];
  showHome?: boolean;
};

function getDisplayItems(
  items: BreadcrumbEntry[],
): Array<BreadcrumbEntry | null> {
  if (items.length <= 4) return items;

  return [items[0] ?? null, null, ...items.slice(-2)];
}

function BreadcrumbTrail({
  className,
  items,
  showHome = true,
  ...props
}: BreadcrumbTrailProps): React.ReactNode {
  const allItems = showHome
    ? [{ href: '/', label: 'Accueil' }, ...items]
    : items;
  const displayItems = getDisplayItems(allItems);

  return (
    <Breadcrumb className={className} {...props}>
      <BreadcrumbList>
        {displayItems.map((item, index) => {
          const isCollapsedItem = item === null;
          const sourceIndex = isCollapsedItem
            ? 1
            : allItems.findIndex(
                (sourceItem) =>
                  sourceItem.href === item.href &&
                  sourceItem.label === item.label,
              );
          const isLast = index === displayItems.length - 1;
          const isFirst = index === 0 && showHome;
          const hideOnMobile =
            allItems.length > 3 && !isFirst && !isLast && !isCollapsedItem;
          const itemKey = isCollapsedItem
            ? 'breadcrumb-collapsed'
            : `${item.href ?? 'current'}-${item.label}-${sourceIndex}`;

          return (
            <React.Fragment key={itemKey}>
              {index > 0 && (
                <BreadcrumbSeparator
                  className={cn(hideOnMobile && 'hidden sm:inline-flex')}
                />
              )}
              <BreadcrumbItem
                className={cn(
                  isLast ? 'min-w-0 flex-shrink' : 'shrink-0',
                  hideOnMobile && 'hidden sm:inline-flex',
                )}
              >
                {isCollapsedItem ? (
                  <BreadcrumbEllipsis />
                ) : item.href && !isLast ? (
                  <BreadcrumbLink asChild>
                    <Link
                      className={cn(!isFirst && 'max-w-40 sm:max-w-56')}
                      href={item.href}
                    >
                      {isFirst ? (
                        <>
                          <Home className="size-3.5 shrink-0" />
                          <span className="sr-only">{item.label}</span>
                        </>
                      ) : (
                        item.label
                      )}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="max-w-40 sm:max-w-64 lg:max-w-80">
                    {isFirst ? (
                      <>
                        <Home className="size-3.5 shrink-0" />
                        <span className="sr-only">{item.label}</span>
                      </>
                    ) : (
                      item.label
                    )}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbTrail,
};
