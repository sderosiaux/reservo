'use client';

import { cn } from '@/lib/utils';

// Table Root
interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export function Table({ children, className, ...props }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn('w-full border-collapse table-fixed', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

// Table Header
interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function TableHeader({ children, className, ...props }: TableHeaderProps) {
  return (
    <thead
      className={cn('sticky top-0 z-10 bg-[var(--bg-subtle)]', className)}
      {...props}
    >
      {children}
    </thead>
  );
}

// Table Body
interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function TableBody({ children, className, ...props }: TableBodyProps) {
  return (
    <tbody
      className={cn('divide-y divide-[var(--border-subtle)]', className)}
      {...props}
    >
      {children}
    </tbody>
  );
}

// Table Row
interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

export function TableRow({ children, className, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        'group hover:bg-[var(--bg-subtle)] transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

// Table Head Cell
interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

export function TableHead({
  children,
  className,
  width,
  align = 'left',
  style,
  ...props
}: TableHeadProps) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]',
        align === 'left' && 'text-left',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
      style={{ width, ...style }}
      {...props}
    >
      {children}
    </th>
  );
}

// Table Cell
interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export function TableCell({
  children,
  className,
  align = 'left',
  ...props
}: TableCellProps) {
  return (
    <td
      className={cn(
        'px-4 py-3',
        align === 'left' && 'text-left',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}

// Empty state
interface TableEmptyProps {
  message?: string;
  colSpan: number;
}

export function TableEmpty({ message = 'Aucune donnée', colSpan }: TableEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-12 text-[var(--text-tertiary)]">
        {message}
      </td>
    </tr>
  );
}
