'use client';

import { Eye, X } from 'lucide-react';
import { cn, formatDate, getInitials } from '@/lib/utils';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  StatusBadge,
} from '@/components/ui';
import type { Reservation } from '@/lib/types';

interface ReservationsTableProps {
  reservations: Reservation[];
  onView?: (reservation: Reservation) => void;
  onCancel?: (reservation: Reservation) => void;
}

// Column definitions with fixed widths
type ColumnDef = { width: string; label: string; align?: 'left' | 'center' | 'right' };

const COLUMNS: Record<string, ColumnDef> = {
  id: { width: '15%', label: 'ID Réservation' },
  client: { width: '20%', label: 'Client' },
  resource: { width: '20%', label: 'Ressource' },
  quantity: { width: '8%', label: 'Qté', align: 'center' },
  status: { width: '12%', label: 'Statut', align: 'center' },
  date: { width: '15%', label: 'Date' },
  actions: { width: '10%', label: 'Actions', align: 'right' },
};

export function ReservationsTable({
  reservations,
  onView,
  onCancel,
}: ReservationsTableProps) {
  if (reservations.length === 0) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {Object.entries(COLUMNS).map(([key, col]) => (
              <TableHead key={key} width={col.width} align={col.align}>
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty message="Aucune réservation" colSpan={Object.keys(COLUMNS).length} />
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {Object.entries(COLUMNS).map(([key, col]) => (
            <TableHead key={key} width={col.width} align={col.align}>
              {col.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {reservations.map((reservation) => (
          <TableRow key={reservation.id}>
            {/* ID */}
            <TableCell>
              <span className="text-xs font-mono text-[var(--text-secondary)]">
                {reservation.id.slice(0, 12)}
              </span>
            </TableCell>

            {/* Client */}
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[11px] font-semibold text-[var(--text-secondary)] shrink-0">
                  {getInitials(reservation.clientId)}
                </div>
                <span className="text-sm truncate">{reservation.clientId}</span>
              </div>
            </TableCell>

            {/* Resource */}
            <TableCell>
              <span className="text-sm truncate block">{reservation.resourceId}</span>
            </TableCell>

            {/* Quantity */}
            <TableCell align="center">
              <span className="text-xs font-mono font-medium bg-[var(--bg-subtle)] px-2 py-0.5 rounded">
                {reservation.quantity}
              </span>
            </TableCell>

            {/* Status */}
            <TableCell align="center">
              <StatusBadge status={reservation.status} />
            </TableCell>

            {/* Date */}
            <TableCell>
              <span className="text-xs font-mono text-[var(--text-tertiary)]">
                {formatDate(reservation.serverTimestamp)}
              </span>
            </TableCell>

            {/* Actions */}
            <TableCell align="right">
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
                {onCancel && reservation.status.toLowerCase() === 'confirmed' && (
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
