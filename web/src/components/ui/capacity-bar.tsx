import { cn } from '@/lib/utils';
import { getCapacityPercent, getCapacityStatus } from '@/lib/utils';

interface CapacityBarProps {
  current: number;
  total: number;
  showLabel?: boolean;
  className?: string;
}

export function CapacityBar({ current, total, showLabel = true, className }: CapacityBarProps) {
  const percent = getCapacityPercent(current, total);
  const status = getCapacityStatus(current, total);

  return (
    <div className={cn('space-y-1.5', className)}>
      {showLabel && (
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-[var(--text-tertiary)]">Capacité</span>
          <span className="text-sm font-medium font-mono">
            {current} / {total}
          </span>
        </div>
      )}
      <div className="h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            status === 'low' && 'bg-[var(--accent)]',
            status === 'medium' && 'bg-[var(--accent)]',
            status === 'high' && 'bg-[var(--warning)]',
            status === 'full' && 'bg-[var(--error)]'
          )}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}
