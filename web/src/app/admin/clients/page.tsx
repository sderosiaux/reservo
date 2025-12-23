'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, Users, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useClients } from '@/lib/hooks';

export default function ClientsPage() {
  // React Query hook
  const {
    data: clients = [],
    isLoading: loading,
    error: queryError,
    refetch
  } = useClients();

  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');

  const error = queryError instanceof Error ? queryError.message : null;

  // Memoize filtered clients and stats
  const { filteredClients, stats } = useMemo(() => {
    const filtered = clients.filter((c) =>
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const statsData = {
      total: clients.length,
      active: clients.filter((c) => c.status === 'active').length,
      totalReservations: clients.reduce((sum, c) => sum + c.totalReservations, 0),
    };

    return { filteredClients: filtered, stats: statsData };
  }, [clients, searchQuery]);

  return (
    <div>
      {/* Header */}
      <header className="bg-[var(--bg-elevated)] border-b border-[var(--border)] sticky top-0 z-40">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight">Clients</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Historique et activité des clients
            </p>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="px-8 py-4 border-b border-[var(--border)] bg-[var(--bg-subtle)]">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center">
              <Users className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)]" />
              ) : (
                <p className="text-2xl font-display font-medium">{stats.total}</p>
              )}
              <p className="text-xs text-[var(--text-tertiary)]">Clients uniques</p>
            </div>
          </div>
          <div className="w-px h-12 bg-[var(--border)]" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--success-bg)] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[var(--success)]" />
            </div>
            <div>
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)]" />
              ) : (
                <p className="text-2xl font-display font-medium">{stats.active}</p>
              )}
              <p className="text-xs text-[var(--text-tertiary)]">Clients actifs</p>
            </div>
          </div>
          <div className="w-px h-12 bg-[var(--border)]" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--warning-bg)] flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[var(--warning)]" />
            </div>
            <div>
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)]" />
              ) : (
                <p className="text-2xl font-display font-medium">{stats.totalReservations}</p>
              )}
              <p className="text-xs text-[var(--text-tertiary)]">Réservations totales</p>
            </div>
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
              placeholder="Rechercher un client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <Button variant="secondary" size="sm">
            <Filter className="w-4 h-4" />
            Filtres
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-subtle)]" />
                  <div className="flex-1">
                    <div className="h-4 bg-[var(--bg-subtle)] rounded w-48 mb-2" />
                    <div className="h-3 bg-[var(--bg-subtle)] rounded w-24" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-[var(--error)]">{error}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 text-sm text-[var(--accent)] hover:underline"
            >
              Réessayer
            </button>
          </Card>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--text-secondary)]">Aucun client trouvé</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-sm text-[var(--accent)] hover:underline"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClients.map((client, i) => (
              <Card
                key={client.id}
                className={cn(
                  'p-4 hover:border-[var(--accent)] transition-colors cursor-pointer',
                  `animate-fade-in-up delay-${Math.min(i + 1, 4)}`
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center">
                      <span className="text-sm font-medium text-[var(--accent)]">
                        {client.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{client.email}</p>
                      <p className="text-sm text-[var(--text-tertiary)]">
                        {formatRelativeTime(client.lastActivity)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">{client.totalReservations}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">réservations</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{client.activeReservations}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">actives</p>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        client.status === 'active'
                          ? 'bg-[var(--success-bg)] text-[var(--success)]'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-tertiary)]'
                      )}
                    >
                      {client.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
