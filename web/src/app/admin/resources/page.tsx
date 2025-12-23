'use client';

import { useState, useMemo } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, Modal, Input } from '@/components/ui';
import { ResourceCard } from '@/components/admin/resource-card';
import { useResources, useCreateResource } from '@/lib/hooks';
import { logger } from '@/lib/logger';
import { createResourceSchema, validateForm } from '@/lib/validations';

export default function ResourcesPage() {
  // React Query hooks
  const {
    data: resources = [],
    isLoading: loading,
    error: queryError,
    refetch
  } = useResources();

  const createResourceMutation = useCreateResource();

  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newResource, setNewResource] = useState({ id: '', type: '', capacity: '', unlimited: false });

  const error = queryError instanceof Error ? queryError.message : null;

  const UNLIMITED_CAPACITY = 2147483647; // Max int32

  async function handleCreateResource() {
    // Validate input with Zod schema
    const validation = validateForm(createResourceSchema, {
      id: newResource.id.trim().toLowerCase(),
      type: newResource.type.trim(),
      capacity: newResource.unlimited ? UNLIMITED_CAPACITY : (parseInt(newResource.capacity) || 0),
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
      setNewResource({ id: '', type: '', capacity: '', unlimited: false });
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

  // Memoize filtered resources
  const filteredResources = useMemo(() =>
    resources.filter((r) =>
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.type.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [resources, searchQuery]
  );

  return (
    <div>
      {/* Header */}
      <header className="bg-[var(--bg-elevated)] border-b border-[var(--border)] sticky top-0 z-40">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight">Ressources</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Gérez vos salles, équipements et espaces réservables
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4" />
            Nouvelle ressource
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="px-8 py-4 border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Rechercher une ressource..."
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-4 bg-[var(--bg-subtle)] rounded w-16 mb-4" />
                <div className="h-5 bg-[var(--bg-subtle)] rounded w-32 mb-6" />
                <div className="h-2 bg-[var(--bg-subtle)] rounded" />
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
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--text-secondary)]">Aucune ressource trouvée</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((resource, i) => (
              <div key={resource.id} className={`animate-fade-in-up delay-${Math.min(i + 1, 4)}`}>
                <ResourceCard resource={resource} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
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
          <div>
            <Input
              label="Capacité"
              type="number"
              placeholder="Nombre maximum de réservations"
              value={newResource.capacity}
              onChange={(e) => setNewResource({ ...newResource, capacity: e.target.value })}
              disabled={newResource.unlimited}
            />
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newResource.unlimited}
                onChange={(e) => setNewResource({ ...newResource, unlimited: e.target.checked, capacity: '' })}
                className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <span className="text-sm text-[var(--text-secondary)]">Capacité illimitée</span>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
