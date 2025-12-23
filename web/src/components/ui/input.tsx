'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--text-secondary)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-4 py-2.5 text-[15px]',
            'bg-[var(--bg-elevated)] border-[1.5px] border-[var(--border)] rounded-lg',
            'transition-all duration-150',
            'placeholder:text-[var(--text-tertiary)]',
            'hover:border-[var(--text-tertiary)]',
            'focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-subtle)]',
            error && 'border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error-bg)]',
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-[var(--text-tertiary)]">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-[var(--error)]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
