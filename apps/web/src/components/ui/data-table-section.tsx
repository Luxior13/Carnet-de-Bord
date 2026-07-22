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
  headerClassName?: string;
  headerLayout?: 'inline' | 'stacked';
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
  headerClassName,
  headerLayout = 'stacked',
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
      'border-border-default bg-surface overflow-hidden rounded-xl py-0',
      className,
    )}
  >
    <CardHeader
      className={cn(
        'border-border-divider bg-surface-panel-header p-4',
        headerClassName,
      )}
    >
      <div
        className={cn(
          'flex flex-col gap-1',
          headerLayout === 'inline' &&
            'xl:flex-row xl:items-center xl:justify-between xl:gap-4',
        )}
      >
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {toolbar && (
          <div
            className={cn(
              'mt-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between',
              headerLayout === 'inline' && 'xl:mt-0 xl:min-w-0 xl:flex-1',
              toolbarClassName,
            )}
          >
            {toolbar}
          </div>
        )}
      </div>
    </CardHeader>
    <CardContent className={cn('bg-surface p-0', contentClassName)}>
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
      <CardFooter className="border-border-divider bg-surface-inset p-0">
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
  <div className={cn('hidden lg:block', className)}>{children}</div>
);

const DataTableMobileList: FC<DataTableSlotProps> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'divide-border-divider bg-surface [&>*:nth-child(even)]:bg-surface-inset/70 divide-y lg:hidden',
      className,
    )}
  >
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
      'bg-surface-inset/70 flex flex-col items-center justify-center gap-2 px-4 py-10 text-center',
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
