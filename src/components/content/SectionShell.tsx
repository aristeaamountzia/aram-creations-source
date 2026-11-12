import React from 'react';

interface SectionShellProps extends React.HTMLAttributes<HTMLDivElement> {
  section: 'shop' | 'portfolio';
}

/** Shared page surface for the two public catalogs. */
export function SectionShell({ section, className = '', children, ...props }: SectionShellProps) {
  return (
    <div {...props} data-catalog-section={section} className={`section-shell ${section}-view min-h-screen ${className}`}>
      {children}
    </div>
  );
}
