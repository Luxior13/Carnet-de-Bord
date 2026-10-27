'use client';

import { Check, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import React, { type MouseEvent, useRef, useState } from 'react';

import { Button } from '$ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '$ui/dropdown-menu';
import { cn } from '$utils/css.utils';

import { type PageSection, SectionCount } from './PageSectionNavigation';

type SectionOverflowMenuProps<SectionId extends string> = {
  activeSection: SectionId;
  dirtySections: readonly SectionId[];
  getSectionHref: (sectionId: SectionId) => string;
  /**
   * `more`: « Plus » next to the tabs that fit, listing the others.
   * `select`: a single section selector replacing the tabs (narrow screens).
   */
  mode: 'more' | 'select';
  onNavigate: (
    event: MouseEvent<HTMLAnchorElement>,
    sectionId: SectionId,
  ) => void;
  replace: boolean;
  sections: readonly PageSection<SectionId>[];
};

const DirtyDot = (): React.JSX.Element => (
  <>
    <span
      aria-hidden="true"
      className="bg-warning size-2 shrink-0 rounded-full"
    />
    <span className="sr-only">Modifications non enregistrées</span>
  </>
);

/**
 * Sections that do not fit (owner decision of 27 October 2026): a « Plus »
 * menu beside the tabs on a computer, a section selector on a phone. Items
 * stay real links and go through the same guarded section navigation.
 */
export const SectionOverflowMenu = <SectionId extends string>({
  activeSection,
  dirtySections,
  getSectionHref,
  mode,
  onNavigate,
  replace,
  sections,
}: SectionOverflowMenuProps<SectionId>): React.JSX.Element => {
  const [open, setOpen] = useState(false);
  const chosenRef = useRef(false);
  const active = sections.find((section) => section.id === activeSection);
  const hiddenDirty = sections.some(
    (section) =>
      section.id !== activeSection && dirtySections.includes(section.id),
  );

  return (
    <DropdownMenu modal={false} onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={
            mode === 'select'
              ? `Section : ${active?.label ?? ''}. Changer de section`
              : `Plus de sections (${sections.length})`
          }
          className={cn(
            'text-muted-foreground hover:text-foreground rounded-t-compact h-auto min-h-11 shrink-0 gap-2 self-stretch rounded-b-none border-x-0 border-t-0 border-b-2 border-transparent px-3 font-medium hover:bg-transparent focus-visible:ring-inset lg:h-auto',
            mode === 'select' &&
              'border-primary text-foreground w-full justify-start',
          )}
          data-slot={mode === 'select' ? 'section-select' : 'section-more'}
          type="button"
          variant="ghost"
        >
          {mode === 'select' && active ? (
            <>
              {active.icon && (
                <span
                  aria-hidden="true"
                  className="text-primary-emphasis shrink-0 [&_svg]:size-4"
                >
                  {active.icon}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-left">
                {active.label}
              </span>
            </>
          ) : (
            'Plus'
          )}
          {hiddenDirty && <DirtyDot />}
          <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={mode === 'select' ? 'start' : 'end'}
        onCloseAutoFocus={(event) => {
          // The chosen tab takes the focus once shown; the selector keeps it.
          if (chosenRef.current && mode === 'more') event.preventDefault();
          chosenRef.current = false;
        }}
        className="w-[min(18rem,calc(100vw-2rem))]"
        collisionPadding={8}
        sideOffset={4}
      >
        {sections.map((section) => {
          const isActive = section.id === activeSection;

          return (
            <DropdownMenuItem asChild key={section.id}>
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={cn(isActive && 'text-foreground font-medium')}
                data-navigation-guard="explicit"
                href={getSectionHref(section.id)}
                onClick={(event) => {
                  chosenRef.current = section.id !== activeSection;
                  onNavigate(event, section.id);
                  setOpen(false);
                }}
                replace={replace}
              >
                {section.icon && (
                  <span aria-hidden="true" className="shrink-0 [&_svg]:size-4">
                    {section.icon}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{section.label}</span>
                {section.count !== undefined && (
                  <SectionCount count={section.count} />
                )}
                {dirtySections.includes(section.id) && <DirtyDot />}
                {isActive && (
                  <Check aria-hidden="true" className="size-4 shrink-0" />
                )}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
