import React from 'react';

import { cn } from '$utils/css.utils';

type RequiredStarProps = {
  className?: string;
};

const RequiredStar: React.FC<RequiredStarProps> = ({ className = '' }) => {
  return <span className={cn('text-destructive -ml-2', className)}>*</span>;
};

export default RequiredStar;
