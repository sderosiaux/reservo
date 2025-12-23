'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Download, Calendar } from 'lucide-react';
import { Button, Card, LoadingDots } from '@/components/ui';
import { ReservationsTable } from '@/components/admin/reservations-table';
import { cancelReservation, getReservations } from '@/lib/api';
import type { Reservation } from '@/lib/types';

interface Stats {
  total: number;
  confirmed: number;
  cancelled: number;
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, confirmed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');

  useEffect(() => {
    loadReservations();
  }, []);

  async function loadReservations() {
    try {
      setLoading(true);
      setError(null);

      // Fetch all counts in parallel
      const [allResult, confirmedResult, cancelledResult] = await Promise.all([
        getReservations({ limit: 100 }),
        getReservations({ status: 'confirmed', limit: 1 }),
        getReservations({ status: 'cancelled', limit: 1 }),
      ]);

      setReservations(allResult.data);
      setStats({
        total: allResult.pagination.total,
        confirmed: confirmedResult.pagination.total,
        cancelled: cancelledResult.pagination.total,
      });
    } catch (err) {
      console.error('Failed to load reservations:', err);
      setError('Impossible de charger les réservations');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelReservation(reservation: Reservation) {
    try {
      await cancelReservation(reservation.id);
      setReservations(
        reservations.map((r) =>
          r.id === reservation.id ? { ...r, status: 'cancelled' as const } : r
        )
      );
    } catch (error) {
      console.error('Failed to cancel:', error);
    }
  }

  const filteredReservations = reservations.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.clientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.resourceId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Header */}
      <header className="bg-[var(--bg-elevated)] border-b border-[var(--border)] sticky top-0 z-40">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight">Réservations</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Consultez et gérez toutes les réservations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary">
              <Download className="w-4 h-4" />
              Exporter
            </Button>
            <Button>
              <Calendar className="w-4 h-4" />
              Nouvelle réservation
            </Button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="px-8 py-4 border-b border-[var(--border)] bg-[var(--bg-subtle)]">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            {loading ? (
              <LoadingDots className="text-2xl font-display font-medium text-[var(--text-tertiary)]" />
            ) : (
              <span className="text-2xl font-display font-medium">{stats.total}</span>
            )}
            <span className="text-sm text-[var(--text-secondary)]">Total</span>
          </div>
          <div className="w-px h-8 bg-[var(--border)]" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
            {loading ? (
              <LoadingDots className="text-lg font-medium text-[var(--text-tertiary)]" />
            ) : (
              <span className="text-lg font-medium">{stats.confirmed}</span>
            )}
            <span className="text-sm text-[var(--text-secondary)]">Confirmées</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--cancelled)]" />
            {loading ? (
              <LoadingDots className="text-lg font-medium text-[var(--text-tertiary)]" />
            ) : (
              <span className="text-lg font-medium">{stats.cancelled}</span>
            )}
            <span className="text-sm text-[var(--text-secondary)]">Annulées</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-4 border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Rechercher par ID, client ou ressource..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="flex items-center gap-2">
            {(['all', 'confirmed', 'cancelled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  statusFilter === status
                    ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {status === 'all' ? 'Toutes' : status === 'confirmed' ? 'Confirmées' : 'Annulées'}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm">
            <Filter className="w-4 h-4" />
            Plus de filtres
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {loading ? (
          <Card className="p-8">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-[var(--bg-subtle)] rounded" />
              ))}
            </div>
          </Card>
        ) : filteredReservations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--text-secondary)]">Aucune réservation trouvée</p>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="mt-2 text-sm text-[var(--accent)] hover:underline"
              >
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <Card className="overflow-hidden animate-fade-in-up">
            <ReservationsTable
              reservations={filteredReservations}
              onCancel={handleCancelReservation}
            />
          </Card>
        )}
      </div>
    </div>
  );
}
