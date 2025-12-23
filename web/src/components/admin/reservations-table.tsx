'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Eye, X } from 'lucide-react';
import { cn, formatDate, getInitials } from '@/lib/utils';
import { StatusBadge } from '@/components/ui';
import type { Reservation } from '@/lib/types';

interface ReservationsTableProps {
  reservations: Reservation[];
  onView?: (reservation: Reservation) => void;
  onCancel?: (reservation: Reservation) => void;
  /** Max height for virtual scrolling. Defaults to 600px */
  maxHeight?: number;
}

const ROW_HEIGHT = 57; // Fixed row height for virtualization
const VIRTUALIZATION_THRESHOLD = 50; // Only virtualize if more than 50 rows

export function ReservationsTable({
  reservations,
  onView,
  onCancel,
  maxHeight = 600,
}: ReservationsTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Only use virtualization for large datasets
  const useVirtualization = reservations.length > VIRTUALIZATION_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: reservations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10, // Render 10 extra rows above/below viewport
    enabled: useVirtualization,
  });

  if (reservations.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--text-tertiary)]">
        Aucune réservation
      </div>
    );
  }

  // Header row component
  const TableHeader = () => (
    <thead className="sticky top-0 z-10">
      <tr className="bg-[var(--bg-subtle)]">
        <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          ID Réservation
        </th>
        <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Client
        </th>
        <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Ressource
        </th>
        <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Qté
        </th>
        <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Statut
        </th>
        <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Date
        </th>
        <th className="text-right px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Actions
        </th>
      </tr>
    </thead>
  );

  // Row component
  const ReservationRow = ({ reservation, style }: { reservation: Reservation; style?: React.CSSProperties }) => (
    <tr
      style={style}
      className="group hover:bg-[var(--bg-subtle)] transition-colors"
    >
      <td className="px-6 py-4">
        <span className="text-xs font-mono text-[var(--text-secondary)]">
          {reservation.id.slice(0, 12)}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[11px] font-semibold text-[var(--text-secondary)]">
            {getInitials(reservation.clientId)}
          </div>
          <span className="text-sm">{reservation.clientId}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-sm">
        {reservation.resourceId}
      </td>
      <td className="px-6 py-4">
        <span className="text-xs font-mono font-medium bg-[var(--bg-subtle)] px-2 py-0.5 rounded">
          {reservation.quantity}
        </span>
      </td>
      <td className="px-6 py-4">
        <StatusBadge status={reservation.status} />
      </td>
      <td className="px-6 py-4">
        <span className="text-xs font-mono text-[var(--text-tertiary)]">
          {formatDate(reservation.serverTimestamp)}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onView && (
            <button
              onClick={() => onView(reservation)}
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded',
                'border border-[var(--border)] text-[var(--text-tertiary)]',
                'hover:bg-[var(--bg-elevated)] hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)]',
                'transition-all'
              )}
              title="Voir les détails"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
          {onCancel && reservation.status === 'confirmed' && (
            <button
              onClick={() => onCancel(reservation)}
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded',
                'border border-[var(--border)] text-[var(--text-tertiary)]',
                'hover:bg-[var(--error-bg)] hover:border-[var(--error)] hover:text-[var(--error)]',
                'transition-all'
              )}
              title="Annuler"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  // Virtualized table for large datasets
  if (useVirtualization) {
    const virtualRows = virtualizer.getVirtualItems();

    return (
      <div className="overflow-x-auto">
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ maxHeight }}
        >
          <table className="w-full">
            <TableHeader />
            <tbody
              className="divide-y divide-[var(--border-subtle)]"
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {virtualRows.map((virtualRow) => {
                const reservation = reservations[virtualRow.index];
                return (
                  <ReservationRow
                    key={reservation.id}
                    reservation={reservation}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      display: 'table-row',
                    }}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 text-xs text-[var(--text-tertiary)] border-t border-[var(--border)]">
          {reservations.length} réservations (défilement virtualisé)
        </div>
      </div>
    );
  }

  // Standard table for small datasets
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <TableHeader />
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {reservations.map((reservation) => (
            <ReservationRow key={reservation.id} reservation={reservation} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
