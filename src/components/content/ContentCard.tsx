import React from 'react';

interface ContentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  muted?: boolean;
}

/** Shared interactive card frame; Shop and Portfolio supply their own content and actions. */
export function ContentCard({ className = '', muted = false, children, ...props }: ContentCardProps) {
  return (
    <div
      {...props}
      className={`catalog-card content-card group flex cursor-pointer flex-col justify-between overflow-hidden border bg-white transition-all duration-300 ${muted ? 'opacity-85' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
