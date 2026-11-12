import React from 'react';

interface StatusBadgeProps {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  className?: string;
}

const toneClasses = {
  neutral: 'bg-stone-900/90 text-stone-100 border-white/15',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-900 border-amber-200',
  danger: 'bg-rose-50 text-rose-800 border-rose-200'
};

export function StatusBadge({ children, tone = 'neutral', className = '' }: StatusBadgeProps) {
  return (
    <span className={`status-badge inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${toneClasses[tone]} ${className}`}>
      {children}
    </span>
  );
}
