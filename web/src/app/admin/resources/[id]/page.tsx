'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Users, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button, Card, CapacityBar } from '@/components/ui';
import { StatusBadge } from '@/components/ui/status-badge';
import { useResource, useResourceReservations } from '@/lib/hooks';
import type { Reservation } from '@/lib/types';
import { cn, formatDateDetailed, formatRelativeTime } from '@/lib/utils';

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const resourceId = params.id as string;

  // React Query hooks for data fetching
  const {
    data: resource,
    isLoading: resourceLoading,
    error: resourceError,
    refetch: refetchResource
  } = useResource(resourceId);

  const {
    data: reservations = [],
    isLoading: reservationsLoading,
    refetch: refetchReservations
  } = useResourceReservations(resourceId);

  // Local UI state
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'rejected'>('all');

  const loading = resourceLoading || reservationsLoading;
  const error = resourceError instanceof Error ? resourceError.message : null;

  function handleRetry() {
    refetchResource();
    refetchReservations();
  }

  // Single-pass optimized filtering, sorting, and counting with useMemo
  const { filteredReservations, confirmedCount, rejectedCount, cancelledCount } = useMemo(() => {
    const counts = { confirmed: 0, rejected: 0, cancelled: 0 };
    const filtered: Reservation[] = [];

    for (const reservation of reservations) {
      // Normalize status to lowercase to handle API returning uppercase
      const status = reservation.status.toLowerCase();

      // Count by status
      if (status === 'confirmed') counts.confirmed++;
      else if (status === 'rejected') counts.rejected++;
      else if (status === 'cancelled') counts.cancelled++;

      // Filter
      if (filter === 'all' || status === filter) {
        filtered.push(reservation);
      }
    }

    // Sort by timestamp descending (most recent first)
    filtered.sort((a, b) => b.serverTimestamp - a.serverTimestamp);

    return {
      filteredReservations: filtered,
      confirmedCount: counts.confirmed,
      rejectedCount: counts.rejected,
      cancelledCount: counts.cancelled,
    };
  }, [reservations, filter]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="bg-[var(--bg-elevated)] border-b border-[var(--border)] px-8 py-6">
          <div className="h-4 bg-[var(--bg-subtle)] rounded w-24 mb-4" />
          <div className="h-8 bg-[var(--bg-subtle)] rounded w-48" />
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-6 h-48" />
            <Card className="p-6 lg:col-span-2 h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="p-8">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-[var(--error)] mx-auto mb-4" />
          <p className="text-[var(--error)]">{error || 'Ressource non trouvée'}</p>
          <div className="flex gap-2 justify-center mt-4">
            <Button
              variant="primary"
              onClick={handleRetry}
              disabled={loading}
            >
              Réessayer
            </Button>
            <Button variant="secondary" onClick={() => router.back()}>
              Retour
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const isOpen = resource.state === 'OPEN';

  return (
    <div>
      {/* Header */}
      <header className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
        <div className="px-8 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4"
            aria-label="Retour aux ressources"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux ressources
          </button>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded">
                  {resource.type}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 text-xs font-medium',
                    isOpen ? 'text-[var(--success)]' : 'text-[var(--error)]'
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full', isOpen ? 'bg-[var(--success)]' : 'bg-[var(--error)]')} />
                  {isOpen ? 'Ouvert' : 'Fermé'}
                </span>
              </div>
              <h1 className="text-2xl font-display font-medium tracking-tight">{resource.id}</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Resource Info Card */}
          <Card className="p-6">
            <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Informations</h2>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-[var(--text-tertiary)] mb-1">Capacité</div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <span className="font-medium">{resource.capacity}</span>
                </div>
              </div>

              <div>
                <div className="text-xs text-[var(--text-tertiary)] mb-2">Utilisation</div>
                <CapacityBar current={resource.currentBookings} total={resource.capacity} />
              </div>

              <div className="pt-4 border-t border-[var(--border)]">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-semibold text-[var(--success)]">{confirmedCount}</div>
                    <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Confirmées</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-[var(--error)]">{rejectedCount}</div>
                    <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Refusées</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-[var(--cancelled)]">{cancelledCount}</div>
                    <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Annulées</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Reservation History */}
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-[var(--text-secondary)]">
                Historique des réservations
              </h2>
              <div className="flex items-center gap-2" role="group" aria-label="Filtres de réservation">
                <button
                  onClick={() => setFilter('all')}
                  aria-pressed={filter === 'all'}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    filter === 'all'
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                  )}
                >
                  Tout ({reservations.length})
                </button>
                <button
                  onClick={() => setFilter('confirmed')}
                  aria-pressed={filter === 'confirmed'}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    filter === 'confirmed'
                      ? 'bg-[var(--success)] text-white'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                  )}
                >
                  Confirmées ({confirmedCount})
                </button>
                <button
                  onClick={() => setFilter('rejected')}
                  aria-pressed={filter === 'rejected'}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    filter === 'rejected'
                      ? 'bg-[var(--error)] text-white'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                  )}
                >
                  Refusées ({rejectedCount})
                </button>
              </div>
            </div>

            {filteredReservations.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
                <p className="text-[var(--text-secondary)]">Aucune réservation</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">
                  {filter === 'all'
                    ? "Cette ressource n'a pas encore de réservations"
                    : `Aucune réservation ${filter === 'confirmed' ? 'confirmée' : 'refusée'}`}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {filteredReservations.map((reservation) => {
                  // Normalize status to lowercase to handle API returning uppercase
                  const status = reservation.status.toLowerCase();
                  const isRejected = status === 'rejected';
                  const isConfirmed = status === 'confirmed';

                  return (
                    <div
                      key={reservation.id}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-lg border transition-colors',
                        isRejected
                          ? 'bg-[var(--error-bg)] border-[var(--error)]/20'
                          : isConfirmed
                          ? 'bg-[var(--bg-elevated)] border-[var(--border)] hover:border-[var(--accent)]/30'
                          : 'bg-[var(--bg-subtle)] border-[var(--border)]'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            isRejected
                              ? 'bg-[var(--error)]/10'
                              : isConfirmed
                              ? 'bg-[var(--success)]/10'
                              : 'bg-[var(--cancelled)]/10'
                          )}
                          aria-hidden="true"
                        >
                          {isRejected ? (
                            <XCircle className="w-5 h-5 text-[var(--error)]" />
                          ) : isConfirmed ? (
                            <CheckCircle className="w-5 h-5 text-[var(--success)]" />
                          ) : (
                            <XCircle className="w-5 h-5 text-[var(--cancelled)]" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{reservation.clientId}</div>
                          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(reservation.serverTimestamp)}
                            <span className="text-[var(--border)]" aria-hidden="true">·</span>
                            <Users className="w-3 h-3" />
                            {reservation.quantity} place{reservation.quantity > 1 ? 's' : ''}
                          </div>
                          {isRejected && reservation.rejectionReason && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-[var(--error)]">
                              <AlertCircle className="w-3 h-3" />
                              {reservation.rejectionReason === 'RESOURCE_FULL'
                                ? 'Capacité insuffisante'
                                : reservation.rejectionReason === 'RESOURCE_CLOSED'
                                ? 'Ressource fermée'
                                : reservation.rejectionReason}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={reservation.status} />
                        <time
                          className="text-xs text-[var(--text-tertiary)] font-mono"
                          dateTime={new Date(reservation.serverTimestamp).toISOString()}
                        >
                          {formatDateDetailed(reservation.serverTimestamp)}
                        </time>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
