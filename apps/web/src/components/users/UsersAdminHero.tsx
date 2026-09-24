import React, { type FC, type ReactNode } from 'react';

import { PageHero } from '$components/layout/PageHero';
import { getNavigationSpaceToneClasses } from '$constants/navigation-theme.constants';
import { Badge } from '$ui/badge';

type UsersAdminHeroProps = {
  actions?: ReactNode;
  compact?: boolean;
  description?: ReactNode;
  hasNavigation?: boolean;
  icon: ReactNode;
  iconClassName?: string;
  meta?: ReactNode;
  showSpaceBadge?: boolean;
  title: ReactNode;
};

export const UsersAdminHero: FC<UsersAdminHeroProps> = ({
  actions,
  compact = false,
  description,
  hasNavigation,
  icon,
  iconClassName,
  meta,
  showSpaceBadge = false,
  title,
}) => {
  const tone = getNavigationSpaceToneClasses('system');

  return (
    <PageHero
      actions={actions}
      compact={compact}
      description={description}
      hasNavigation={hasNavigation}
      eyebrow={
        showSpaceBadge ? (
          <Badge variant="outline" className={tone.soft}>
            Système
          </Badge>
        ) : undefined
      }
      icon={icon}
      iconClassName={iconClassName}
      meta={meta}
      title={title}
      tone="system"
    />
  );
};
