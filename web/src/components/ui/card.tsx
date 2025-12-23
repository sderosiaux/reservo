import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ className, hover = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl',
        hover && [
          'cursor-pointer transition-all duration-150',
          'hover:border-[var(--accent)] hover:shadow-md hover:-translate-y-0.5',
        ],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6 border-b border-[var(--border)]', className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-4 bg-[var(--bg-subtle)] border-t border-[var(--border)]', className)} {...props}>
      {children}
    </div>
  );
}
