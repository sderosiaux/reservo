import { cn } from '@/lib/utils';
import type { ReservationStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: ReservationStatus | 'processing';
  className?: string;
}

const statusConfig = {
  pending: {
    label: 'En attente',
    className: 'bg-[var(--warning-bg)] text-[var(--warning)]',
    dotClass: 'bg-[var(--warning)] animate-pulse',
  },
  processing: {
    label: 'En cours',
    className: 'bg-[var(--warning-bg)] text-[var(--warning)]',
    dotClass: 'bg-[var(--warning)] animate-pulse',
  },
  confirmed: {
    label: 'Confirmé',
    className: 'bg-[var(--success-bg)] text-[var(--success)]',
    dotClass: 'bg-[var(--success)]',
  },
  cancelled: {
    label: 'Annulé',
    className: 'bg-[var(--cancelled-bg)] text-[var(--cancelled)]',
    dotClass: 'bg-[var(--cancelled)]',
  },
  rejected: {
    label: 'Refusé',
    className: 'bg-[var(--error-bg)] text-[var(--error)]',
    dotClass: 'bg-[var(--error)]',
  },
  expired: {
    label: 'Expiré',
    className: 'bg-[var(--bg-subtle)] text-[var(--text-tertiary)]',
    dotClass: 'bg-[var(--text-tertiary)]',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Normalize status to lowercase to handle API returning uppercase
  const normalizedStatus = status.toLowerCase();

  // Warn in development if unknown status is encountered
  if (process.env.NODE_ENV === 'development' && !(normalizedStatus in statusConfig)) {
    console.warn(`StatusBadge: Unknown status "${status}", falling back to pending`);
  }

  const config = statusConfig[normalizedStatus as keyof typeof statusConfig] ?? statusConfig.pending;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full',
        config.className,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dotClass)} />
      {config.label}
    </span>
  );
}
