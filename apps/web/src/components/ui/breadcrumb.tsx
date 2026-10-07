'use client';

import { Slot } from '@radix-ui/react-slot';
import { ChevronRight, Home, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '$ui/dropdown-menu';
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
        'text-label flex max-w-full min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap',
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
        'text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex min-h-8 min-w-0 items-center gap-1.5 truncate rounded-sm px-1.5 transition-colors outline-none focus-visible:ring-2',
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
        'text-foreground inline-flex min-h-8 min-w-0 items-center gap-1.5 truncate font-medium',
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

type BreadcrumbEllipsisProps = React.ComponentProps<'button'>;

function BreadcrumbEllipsis({
  className,
  ...props
}: BreadcrumbEllipsisProps): React.ReactNode {
  return (
    <button
      aria-label="Afficher les niveaux intermédiaires"
      className={cn(
        'text-muted-foreground hover:bg-surface-tile-hover hover:text-foreground focus-visible:ring-ring/50 flex size-8 items-center justify-center rounded-sm outline-none focus-visible:ring-2',
        className,
      )}
      type="button"
      {...props}
    >
      <MoreHorizontal aria-hidden="true" className="size-4" />
    </button>
  );
}

type BreadcrumbTrailProps = BreadcrumbProps & {
  compactOnMobile?: boolean;
  items: BreadcrumbEntry[];
  showHome?: boolean;
};

function getDisplayItems(
  items: BreadcrumbEntry[],
  compactOnMobile: boolean,
): Array<BreadcrumbEntry | null> {
  if (items.length <= 3) {
    // The mobile menu keeps ancestors available while prioritizing the current
    // page; it is hidden on desktop when the full short path fits.
    if (compactOnMobile && items.length > 1) {
      return [items[0] ?? null, null, ...items.slice(1)];
    }

    return items;
  }

  return [items[0] ?? null, null, ...items.slice(-2)];
}

function BreadcrumbTrail({
  className,
  compactOnMobile = false,
  items,
  showHome = true,
  ...props
}: BreadcrumbTrailProps): React.ReactNode {
  const [collapsedMenuOpen, setCollapsedMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!compactOnMobile) return;

    const desktopQuery = window.matchMedia('(min-width: 40rem)');
    // The compact trigger may disappear when the full path becomes visible.
    const closeMenu = (): void => setCollapsedMenuOpen(false);
    desktopQuery.addEventListener('change', closeMenu);

    return (): void => desktopQuery.removeEventListener('change', closeMenu);
  }, [compactOnMobile]);

  const normalizedItems =
    showHome && items[0]?.href === '/' ? items.slice(1) : items;
  const allItems = showHome
    ? [{ href: '/', label: 'Accueil' }, ...normalizedItems]
    : items;
  const displayItems = getDisplayItems(allItems, compactOnMobile);
  const collapsedItems = compactOnMobile
    ? allItems.slice(0, -1)
    : allItems.length > 3
      ? allItems.slice(1, -1)
      : [];

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
          const hideOnMobile = compactOnMobile
            ? !isLast && !isCollapsedItem
            : allItems.length > 3 && !isFirst && !isLast && !isCollapsedItem;
          const mobileOnlyCollapsed = isCollapsedItem && allItems.length <= 3;
          const itemKey = isCollapsedItem
            ? 'breadcrumb-collapsed'
            : `${item.href ?? 'current'}-${item.label}-${sourceIndex}`;

          return (
            <React.Fragment key={itemKey}>
              {index > 0 && (
                <BreadcrumbSeparator
                  className={cn(
                    (hideOnMobile || (compactOnMobile && isCollapsedItem)) &&
                      'hidden sm:inline-flex',
                    mobileOnlyCollapsed && 'hidden sm:hidden',
                  )}
                />
              )}
              <BreadcrumbItem
                className={cn(
                  isLast ? 'min-w-0 flex-shrink' : 'shrink-0',
                  hideOnMobile && 'hidden sm:inline-flex',
                  mobileOnlyCollapsed && 'sm:hidden',
                )}
              >
                {isCollapsedItem ? (
                  <DropdownMenu
                    modal={false}
                    open={collapsedMenuOpen}
                    onOpenChange={setCollapsedMenuOpen}
                  >
                    <DropdownMenuTrigger asChild>
                      <BreadcrumbEllipsis
                        className={
                          compactOnMobile
                            ? 'focus-visible:ring-ring size-11 rounded-sm focus-visible:ring-[length:var(--ring-width)] focus-visible:ring-inset sm:size-8'
                            : undefined
                        }
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      aria-label="Niveaux intermédiaires"
                      className="w-[min(18rem,calc(100vw-2rem))]"
                      collisionPadding={8}
                      sideOffset={6}
                    >
                      <DropdownMenuLabel>Chemin complet</DropdownMenuLabel>
                      {collapsedItems.map((collapsedItem, collapsedIndex) =>
                        collapsedItem.href ? (
                          <DropdownMenuItem
                            asChild
                            key={`${collapsedItem.href}-${collapsedIndex}`}
                          >
                            <Link
                              href={collapsedItem.href}
                              onClick={() => setCollapsedMenuOpen(false)}
                            >
                              <span className="truncate">
                                {collapsedItem.label}
                              </span>
                            </Link>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            disabled
                            key={`${collapsedItem.label}-${collapsedIndex}`}
                          >
                            <span className="truncate">
                              {collapsedItem.label}
                            </span>
                          </DropdownMenuItem>
                        ),
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : item.href && !isLast ? (
                  <BreadcrumbLink
                    asChild
                    className={
                      compactOnMobile
                        ? 'focus-visible:ring-ring rounded-sm focus-visible:ring-[length:var(--ring-width)] focus-visible:ring-inset'
                        : undefined
                    }
                  >
                    <Link
                      className={cn(
                        isFirst
                          ? 'size-8 justify-center p-0'
                          : 'max-w-40 sm:max-w-56',
                      )}
                      href={item.href}
                    >
                      {isFirst ? (
                        <>
                          <Home
                            aria-hidden="true"
                            className="size-3.5 shrink-0"
                          />
                          <span className="sr-only">{item.label}</span>
                        </>
                      ) : (
                        item.label
                      )}
                    </Link>
                  </BreadcrumbLink>
                ) : !isLast ? (
                  <span className="text-muted-foreground inline-flex max-w-40 min-w-0 items-center gap-1.5 truncate sm:max-w-56">
                    {item.label}
                  </span>
                ) : (
                  <BreadcrumbPage
                    className={cn(
                      'max-w-40 sm:max-w-64 lg:max-w-80',
                      compactOnMobile && 'font-semibold',
                    )}
                  >
                    {isFirst ? (
                      <>
                        <Home
                          aria-hidden="true"
                          className="size-3.5 shrink-0"
                        />
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
