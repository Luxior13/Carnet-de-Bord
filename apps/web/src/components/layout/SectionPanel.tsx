import React, { type FC, type ReactNode } from 'react';

type SectionPanelProps = {
  children: ReactNode;
  icon: ReactNode;
  title: ReactNode;
};

export const SectionPanel: FC<SectionPanelProps> = ({
  children,
  icon,
  title,
}) => {
  return (
    <section className="border-border/70 bg-card space-y-3 rounded-lg border p-4 shadow-none">
      <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
        <span className="bg-primary/10 text-primary flex size-6 items-center justify-center rounded-md">
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
};
