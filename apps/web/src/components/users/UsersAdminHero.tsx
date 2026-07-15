import React, { type FC, type ReactNode } from 'react';

import { PageHero } from '$components/layout/PageHero';
import { getNavigationSpaceToneClasses } from '$constants/navigation-theme.constants';
import { Badge } from '$ui/badge';

type UsersAdminHeroProps = {
  actions?: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  iconClassName?: string;
  meta?: ReactNode;
  title: ReactNode;
};

export const UsersAdminHero: FC<UsersAdminHeroProps> = ({
  actions,
  description,
  icon,
  iconClassName,
  meta,
  title,
}) => {
  const tone = getNavigationSpaceToneClasses('system');

  return (
    <PageHero
      actions={actions}
      description={description}
      eyebrow={
        <Badge variant="outline" className={tone.soft}>
          Système
        </Badge>
      }
      icon={icon}
      iconClassName={iconClassName}
      meta={meta}
      title={title}
      tone="system"
    />
  );
};
