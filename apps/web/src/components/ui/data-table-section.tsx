import React, { type FC, type ReactNode } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '$ui/card';
import { Pagination, type PaginationProps } from '$ui/pagination';
import { cn } from '$utils/css.utils';

type DataTableSectionProps = {
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  description?: ReactNode;
  desktopClassName?: string;
  mobileClassName?: string;
  mobileList?: ReactNode;
  pagination?: PaginationProps;
  table?: ReactNode;
  title: ReactNode;
  toolbar?: ReactNode;
  toolbarClassName?: string;
};

type DataTableSlotProps = {
  children: ReactNode;
  className?: string;
};

type DataTableEmptyStateProps = {
  action?: ReactNode;
  className?: string;
  icon?: ReactNode;
  title: ReactNode;
};

const DataTableSection: FC<DataTableSectionProps> = ({
  children,
  className,
  contentClassName,
  description,
  desktopClassName,
  mobileClassName,
  mobileList,
  pagination,
  table,
  title,
  toolbar,
  toolbarClassName,
}) => (
  <Card
    className={cn(
      'border-sidebar-border/70 overflow-hidden rounded-xl py-0',
      className,
    )}
  >
    <CardHeader className="p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
      </div>
      {toolbar && (
        <div
          className={cn(
            'mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between',
            toolbarClassName,
          )}
        >
          {toolbar}
        </div>
      )}
    </CardHeader>
    <CardContent className={cn('p-0', contentClassName)}>
      {children ?? (
        <>
          <DataTableDesktop
            className={cn(mobileList ? undefined : 'block', desktopClassName)}
          >
            {table}
          </DataTableDesktop>
          {mobileList && (
            <DataTableMobileList className={mobileClassName}>
              {mobileList}
            </DataTableMobileList>
          )}
        </>
      )}
    </CardContent>
    {pagination && (
      <CardFooter className="p-0">
        <Pagination
          {...pagination}
          className={cn(
            'w-full rounded-none border-x-0 border-b-0 bg-transparent',
            pagination.className,
          )}
        />
      </CardFooter>
    )}
  </Card>
);

const DataTableDesktop: FC<DataTableSlotProps> = ({ children, className }) => (
  <div className={cn('hidden md:block', className)}>{children}</div>
);

const DataTableMobileList: FC<DataTableSlotProps> = ({
  children,
  className,
}) => (
  <div className={cn('divide-sidebar-border/70 divide-y md:hidden', className)}>
    {children}
  </div>
);

const DataTableEmptyState: FC<DataTableEmptyStateProps> = ({
  action,
  className,
  icon,
  title,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-2 py-10 text-center',
      className,
    )}
  >
    {icon && <div className="text-muted-foreground">{icon}</div>}
    <p className="text-muted-foreground text-sm">{title}</p>
    {action}
  </div>
);

export {
  DataTableDesktop,
  DataTableEmptyState,
  DataTableMobileList,
  DataTableSection,
};
