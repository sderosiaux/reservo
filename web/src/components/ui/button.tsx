'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Variants
          variant === 'primary' && [
            'bg-[var(--accent)] text-white',
            'hover:bg-[var(--accent-hover)] hover:-translate-y-px hover:shadow-md',
            'active:translate-y-0',
          ],
          variant === 'secondary' && [
            'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)]',
            'hover:bg-[var(--bg-subtle)] hover:border-[var(--text-tertiary)]',
          ],
          variant === 'ghost' && [
            'bg-transparent text-[var(--text-secondary)]',
            'hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
          ],
          variant === 'danger' && [
            'bg-[var(--error)] text-white',
            'hover:bg-[var(--error-hover)] hover:-translate-y-px hover:shadow-md',
          ],
          // Sizes
          size === 'sm' && 'px-3 py-1.5 text-xs rounded-md',
          size === 'md' && 'px-4 py-2 text-sm rounded-lg',
          size === 'lg' && 'px-6 py-3 text-base rounded-lg',
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
