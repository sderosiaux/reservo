'use client';

import { useState, useMemo } from 'react';
import { Plus, Box, Calendar, TrendingUp, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, Modal, Input } from '@/components/ui';
import { StatCard } from '@/components/admin/stat-card';
import { ResourceCard } from '@/components/admin/resource-card';
import { ReservationsTable } from '@/components/admin/reservations-table';
import { useResources, useCreateResource, useReservations, useCancelReservation } from '@/lib/hooks';
import { logger } from '@/lib/logger';
import { createResourceSchema, validateForm } from '@/lib/validations';

export default function AdminDashboard() {
  // React Query hooks for data fetching
  const {
    data: resources = [],
    isLoading: resourcesLoading,
    error: resourcesError,
    refetch: refetchResources
  } = useResources();

  const {
    data: reservations = [],
    isLoading: reservationsLoading
  } = useReservations();

  // Mutations
  const createResourceMutation = useCreateResource();
  const cancelReservationMutation = useCancelReservation();

  // Local UI state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newResource, setNewResource] = useState({ id: '', type: '', capacity: '' });

  const loading = resourcesLoading || reservationsLoading;
  const error = resourcesError instanceof Error ? resourcesError : null;

  async function handleCreateResource() {
    // Validate input with Zod schema
    const validation = validateForm(createResourceSchema, {
      id: newResource.id.trim().toLowerCase(),
      type: newResource.type.trim(),
      capacity: parseInt(newResource.capacity) || 0,
    });

    if (!validation.success) {
      toast.error('Validation échouée', {
        description: validation.errors[0],
      });
      return;
    }

    try {
      const created = await createResourceMutation.mutateAsync({
        id: validation.data.id,
        type: validation.data.type,
        capacity: validation.data.capacity,
      });
      setShowCreateModal(false);
      setNewResource({ id: '', type: '', capacity: '' });
      toast.success('Ressource créée avec succès', {
        description: `${created.id} (${created.type})`,
      });
    } catch (err) {
      logger.error('Failed to create resource', { error: err instanceof Error ? err.message : 'Unknown' });
      toast.error('Échec de la création', {
        description: err instanceof Error ? err.message : 'Une erreur est survenue',
      });
    }
  }

  async function handleCancelReservation(reservation: { id: string }) {
    try {
      await cancelReservationMutation.mutateAsync(reservation.id);
      toast.success('Réservation annulée', {
        description: `Réservation ${reservation.id} annulée avec succès`,
      });
    } catch (err) {
      logger.error('Failed to cancel reservation', { error: err instanceof Error ? err.message : 'Unknown' });
      toast.error('Échec de l\'annulation', {
        description: err instanceof Error ? err.message : 'Une erreur est survenue',
      });
    }
  }

  // Memoize expensive calculations
  const stats = useMemo(() => {
    const totalCapacity = resources.reduce((sum, r) => sum + r.capacity, 0);
    const totalBookings = resources.reduce((sum, r) => sum + r.currentBookings, 0);
    const utilizationPercent = totalCapacity > 0 ? Math.round((totalBookings / totalCapacity) * 100) : 0;
    const confirmedReservations = reservations.filter((r) => r.status.toLowerCase() === 'confirmed').length;
    return { totalCapacity, totalBookings, utilizationPercent, confirmedReservations };
  }, [resources, reservations]);

  const { utilizationPercent, confirmedReservations } = stats;

  return (
    <div>
      {/* Header */}
      <header className="bg-[var(--bg-elevated)] border-b border-[var(--border)] sticky top-0 z-40">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[var(--success)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
              Live
            </div>
            <Button data-testid="create-resource-btn" variant="secondary" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4" />
              Ajouter ressource
            </Button>
            <Button>
              <Calendar className="w-4 h-4" />
              Nouvelle réservation
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-8">
        {/* Error Retry Banner */}
        {error && !loading && (
          <Card className="p-4 mb-6 bg-[var(--error-bg)] border-[var(--error)] animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-[var(--error)]" />
                <div>
                  <p className="font-medium text-[var(--error)]">Erreur de chargement</p>
                  <p className="text-sm text-[var(--text-secondary)]">{error.message}</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => refetchResources()}>
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </Button>
            </div>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Ressources"
            value={resources.length}
            change="+2 cette semaine"
            icon={Box}
            className="animate-fade-in-up delay-1"
          />
          <StatCard
            label="Réservations actives"
            value={confirmedReservations}
            change="+12 aujourd'hui"
            icon={Calendar}
            className="animate-fade-in-up delay-2"
          />
          <StatCard
            label="Utilisation capacité"
            value={`${utilizationPercent}%`}
            change="+5% vs semaine dernière"
            icon={TrendingUp}
            className="animate-fade-in-up delay-3"
          />
          <StatCard
            label="Refusées (capacité)"
            value="23"
            change="Forte demande détectée"
            changeType="negative"
            icon={AlertTriangle}
            className="animate-fade-in-up delay-4"
          />
        </div>

        {/* Resources */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-medium">Ressources</h2>
            <Button variant="ghost" size="sm">
              Voir tout <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-4 bg-[var(--bg-subtle)] rounded w-16 mb-4" />
                    <div className="h-5 bg-[var(--bg-subtle)] rounded w-32 mb-6" />
                    <div className="h-2 bg-[var(--bg-subtle)] rounded" />
                  </Card>
                ))}
              </>
            ) : (
              resources.slice(0, 3).map((resource, i) => (
                <div key={resource.id} className={`animate-fade-in-up delay-${i + 1}`}>
                  <ResourceCard resource={resource} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Reservations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-medium">Réservations récentes</h2>
            <Button variant="ghost" size="sm">
              Voir tout <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <Card className="overflow-hidden animate-fade-in-up">
            <ReservationsTable
              reservations={reservations}
              onCancel={handleCancelReservation}
            />
          </Card>
        </div>
      </div>

      {/* Create Resource Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Créer une ressource"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateResource} loading={createResourceMutation.isPending}>
              Créer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="ID de la ressource"
            placeholder="ex: conf-room-c"
            hint="Identifiant unique pour les appels API"
            value={newResource.id}
            onChange={(e) => setNewResource({ ...newResource, id: e.target.value })}
          />
          <Input
            label="Type"
            placeholder="ex: room, seat, venue"
            value={newResource.type}
            onChange={(e) => setNewResource({ ...newResource, type: e.target.value })}
          />
          <Input
            label="Capacité"
            type="number"
            placeholder="Nombre maximum de réservations"
            value={newResource.capacity}
            onChange={(e) => setNewResource({ ...newResource, capacity: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
