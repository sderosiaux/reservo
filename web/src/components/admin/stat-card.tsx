import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: LucideIcon;
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  changeType = 'positive',
  icon: Icon,
  className,
}: StatCardProps) {
  const testId = `stat-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div
      data-testid={testId}
      className={cn(
        'bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-6',
        'hover:border-[var(--text-tertiary)] hover:shadow-sm transition-all',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
            {label}
          </p>
          <p className="text-3xl font-display font-medium tracking-tight">
            {value}
          </p>
          {change && (
            <p
              className={cn(
                'text-xs mt-1',
                changeType === 'positive' && 'text-[var(--success)]',
                changeType === 'negative' && 'text-[var(--error)]',
                changeType === 'neutral' && 'text-[var(--text-tertiary)]'
              )}
            >
              {change}
            </p>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center">
            <Icon className="w-5 h-5 text-[var(--accent)]" />
          </div>
        )}
      </div>
    </div>
  );
}
