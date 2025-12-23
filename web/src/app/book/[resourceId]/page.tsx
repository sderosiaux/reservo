'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarDays,
  HelpCircle,
  Users,
  Monitor,
  Wifi,
  Phone,
  Coffee,
  Minus,
  Plus,
  Shield,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Input, Card } from '@/components/ui';
import { getResource, getResourceAvailability, createReservation, getSystemStatus } from '@/lib/api';
import { formatTimestamp } from '@/lib/utils';
import { logger } from '@/lib/logger';
import type { Resource, ResourceAvailability, ReservationResponse } from '@/lib/types';

export default function BookingPage() {
  const params = useParams();
  const resourceId = params.resourceId as string;

  const [resource, setResource] = useState<Resource | null>(null);
  const [availability, setAvailability] = useState<ResourceAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null);

  const [clientId, setClientId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ReservationResponse | null>(null);

  useEffect(() => {
    loadResourceData();
    checkSystemStatus();
  }, [resourceId]);

  async function checkSystemStatus() {
    try {
      const status = await getSystemStatus();
      setMaintenanceMode(status.maintenance.enabled);
      setMaintenanceMessage(status.maintenance.message);
    } catch {
      // Ignore - assume not in maintenance
    }
  }

  async function loadResourceData() {
    try {
      const [resourceData, availabilityData] = await Promise.all([
        getResource(resourceId),
        getResourceAvailability(resourceId),
      ]);
      setResource(resourceData);
      setAvailability(availabilityData);
    } catch (err) {
      logger.error('Failed to load resource', { resourceId, error: err instanceof Error ? err.message : 'Unknown' });
      // Mock data for demo
      const now = Date.now();
      setResource({
        id: resourceId,
        type: 'room',
        capacity: 10,
        currentBookings: 2,
        state: 'OPEN',
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
      setAvailability({
        resourceId,
        capacity: 10,
        currentBookings: 2,
        remainingCapacity: 8,
        isAvailable: true,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await createReservation({
        resourceId,
        clientId: clientId.trim(),
        quantity,
      });

      if (response.status.toLowerCase() === 'confirmed') {
        setSuccess(response);
        // Refresh availability
        loadResourceData();
      } else {
        const reason = response.reason?.toUpperCase();
        if (reason === 'MAINTENANCE_MODE') {
          setMaintenanceMode(true);
          setMaintenanceMessage(response.message ?? null);
          setError('Le système est en maintenance. Veuillez réessayer plus tard.');
        } else if (reason === 'CAPACITY_EXCEEDED' || reason === 'RESOURCE_FULL') {
          setError('Capacité insuffisante. Veuillez réduire le nombre de places.');
        } else if (reason === 'RESOURCE_CLOSED') {
          setError('Cette ressource est actuellement fermée.');
        } else {
          setError(`Réservation refusée: ${response.reason || 'Erreur inconnue'}`);
        }
      }
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSuccess(null);
    setClientId('');
    setQuantity(1);
    setError(null);
  }

  const UNLIMITED_THRESHOLD = 1000000000;
  const isUnlimited = (resource?.capacity ?? 0) >= UNLIMITED_THRESHOLD;
  const remainingCapacity = availability?.remainingCapacity ?? 0;
  const availabilityStatus = isUnlimited
    ? 'available'
    : remainingCapacity === 0 ? 'full' : remainingCapacity <= 3 ? 'limited' : 'available';

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Maintenance Banner */}
      {maintenanceMode && (
        <div className="bg-[var(--warning)] text-white px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              {maintenanceMessage || 'Le système est actuellement en maintenance. Les réservations sont temporairement désactivées.'}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-[var(--bg-elevated)] border-b border-[var(--border)] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-lg font-medium">Reservo</span>
          </Link>
          <Link
            href="#"
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            Besoin d&apos;aide ?
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
            {/* Resource Info */}
            <div>
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-subtle)] px-3 py-1 rounded-full mb-4">
                {resource?.type || 'Ressource'}
              </span>

              <h1 className="text-4xl font-display font-medium tracking-tight mb-4">
                {resourceId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </h1>

              <p className="text-lg text-[var(--text-secondary)] leading-relaxed mb-8">
                {isUnlimited
                  ? "Salle de réunion moderne avec capacité illimitée. Idéale pour les réunions d'équipe, présentations clients et sessions de brainstorming."
                  : `Salle de réunion moderne équipée pour accueillir jusqu'à ${resource?.capacity} personnes. Idéale pour les réunions d'équipe, présentations clients et sessions de brainstorming.`}
              </p>

              {/* Features */}
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: Users, label: isUnlimited ? 'Illimité' : `${resource?.capacity} places` },
                  { icon: Monitor, label: 'Écran 65"' },
                  { icon: Wifi, label: 'WiFi' },
                  { icon: Phone, label: 'Visio' },
                  { icon: Coffee, label: 'Café' },
                ].map((feature) => (
                  <span
                    key={feature.label}
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] bg-[var(--bg-subtle)] px-3 py-1.5 rounded-full"
                  >
                    <feature.icon className="w-3.5 h-3.5 opacity-70" />
                    {feature.label}
                  </span>
                ))}
              </div>

              {/* Gallery placeholder */}
              <div className="mt-12 grid grid-cols-2 gap-4">
                <div className="aspect-[4/3] bg-gradient-to-br from-[#E8E6E1] to-[#D4D2CD] rounded-xl" />
                <div className="grid grid-rows-2 gap-4">
                  <div className="bg-gradient-to-br from-[#E6F3F3] to-[#C5E4E4] rounded-xl" />
                  <div className="bg-gradient-to-br from-[#F5F0E8] to-[#E8DFD0] rounded-xl" />
                </div>
              </div>
            </div>

            {/* Booking Card */}
            <div>
              <Card className="sticky top-8 overflow-hidden shadow-lg">
                {/* Availability Banner */}
                <div
                  className={cn(
                    'px-6 py-4 flex items-center justify-between border-b border-[var(--border)]',
                    availabilityStatus === 'available' && 'bg-[var(--success-bg)]',
                    availabilityStatus === 'limited' && 'bg-[var(--warning-bg)]',
                    availabilityStatus === 'full' && 'bg-[var(--error-bg)]'
                  )}
                >
                  <div
                    data-testid="availability-status"
                    className={cn(
                      'flex items-center gap-2 font-medium',
                      availabilityStatus === 'available' && 'text-[var(--success)]',
                      availabilityStatus === 'limited' && 'text-[var(--warning)]',
                      availabilityStatus === 'full' && 'text-[var(--error)]'
                    )}
                  >
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        availabilityStatus !== 'full' && 'animate-pulse',
                        availabilityStatus === 'available' && 'bg-[var(--success)]',
                        availabilityStatus === 'limited' && 'bg-[var(--warning)]',
                        availabilityStatus === 'full' && 'bg-[var(--error)]'
                      )}
                    />
                    {availabilityStatus === 'available' && 'Disponible'}
                    {availabilityStatus === 'limited' && 'Presque complet'}
                    {availabilityStatus === 'full' && 'Complet'}
                  </div>
                  <span data-testid="availability-count" className="text-sm font-mono text-[var(--text-secondary)]">
                    {isUnlimited ? 'Capacité illimitée' : `${remainingCapacity} place${remainingCapacity !== 1 ? 's' : ''} restante${remainingCapacity !== 1 ? 's' : ''}`}
                  </span>
                </div>

                {!success ? (
                  <>
                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                      {error && (
                        <div data-testid="booking-error" className="flex items-start gap-2 p-4 bg-[var(--error-bg)] border border-[var(--error)] rounded-lg text-sm text-[var(--error)] animate-fade-in">
                          <span className="font-medium">Erreur:</span>
                          <span>{error}</span>
                        </div>
                      )}

                      <Input
                        data-testid="client-id-input"
                        label="Votre identifiant"
                        placeholder="ex: jean.dupont@email.com"
                        hint="Email ou identifiant unique"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        required
                      />

                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">
                          Nombre de places
                        </label>
                        <div className="flex items-center gap-4">
                          <button
                            data-testid="quantity-decrease"
                            type="button"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            disabled={quantity <= 1}
                            className={cn(
                              'w-11 h-11 flex items-center justify-center rounded-lg',
                              'border border-[var(--border)] bg-[var(--bg-subtle)]',
                              'hover:bg-[var(--bg-hover)] hover:border-[var(--text-tertiary)]',
                              'disabled:opacity-40 disabled:cursor-not-allowed',
                              'transition-all'
                            )}
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <span data-testid="quantity-value" className="text-3xl font-display font-medium min-w-[60px] text-center">
                            {quantity}
                          </span>
                          <button
                            data-testid="quantity-increase"
                            type="button"
                            onClick={() => setQuantity(isUnlimited ? quantity + 1 : Math.min(remainingCapacity, quantity + 1))}
                            disabled={!isUnlimited && quantity >= remainingCapacity}
                            className={cn(
                              'w-11 h-11 flex items-center justify-center rounded-lg',
                              'border border-[var(--border)] bg-[var(--bg-subtle)]',
                              'hover:bg-[var(--bg-hover)] hover:border-[var(--text-tertiary)]',
                              'disabled:opacity-40 disabled:cursor-not-allowed',
                              'transition-all'
                            )}
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                        {!isUnlimited && (
                          <p className="text-xs text-[var(--text-tertiary)]">
                            Maximum : {remainingCapacity} places
                          </p>
                        )}
                      </div>

                      <Button
                        data-testid="submit-booking"
                        type="submit"
                        size="lg"
                        className="w-full"
                        loading={submitting}
                        disabled={!clientId.trim() || remainingCapacity === 0 || maintenanceMode}
                      >
                        {maintenanceMode ? 'Réservations désactivées' : 'Réserver maintenant'}
                      </Button>
                    </form>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-[var(--bg-subtle)] border-t border-[var(--border)]">
                      <p className="text-xs text-[var(--text-tertiary)] text-center flex items-center justify-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        Confirmation instantanée • Annulation gratuite
                      </p>
                    </div>
                  </>
                ) : (
                  /* Success State */
                  <div data-testid="booking-confirmation" className="p-8 text-center animate-fade-in">
                    <div className="w-16 h-16 mx-auto mb-6 bg-[var(--success-bg)] rounded-full flex items-center justify-center">
                      <Check className="w-8 h-8 text-[var(--success)]" />
                    </div>

                    <h2 className="text-xl font-display font-medium mb-2">
                      Réservation confirmée !
                    </h2>
                    <p className="text-[var(--text-secondary)] mb-6">
                      Votre réservation a été enregistrée avec succès.
                    </p>

                    <div className="bg-[var(--bg-subtle)] rounded-lg p-4 text-left space-y-3 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--text-tertiary)]">N° de réservation</span>
                        <span data-testid="reservation-id" className="font-mono font-medium">{success.reservationId}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-[var(--border)] pt-3">
                        <span className="text-[var(--text-tertiary)]">Ressource</span>
                        <span className="font-medium">{resourceId}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-[var(--border)] pt-3">
                        <span className="text-[var(--text-tertiary)]">Places réservées</span>
                        <span className="font-medium">{quantity}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-[var(--border)] pt-3">
                        <span className="text-[var(--text-tertiary)]">Horodatage</span>
                        <span className="font-mono text-xs">{formatTimestamp(success.serverTimestamp)}</span>
                      </div>
                    </div>

                    <button
                      onClick={resetForm}
                      className="text-sm text-[var(--accent)] hover:underline underline-offset-2"
                    >
                      Faire une autre réservation
                    </button>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[var(--bg-elevated)] border-t border-[var(--border)] px-6 py-6 mt-auto">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-[var(--text-tertiary)]">
          <span>© 2024 Reservo. Tous droits réservés.</span>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-[var(--accent)] transition-colors">
              Conditions d&apos;utilisation
            </Link>
            <Link href="#" className="hover:text-[var(--accent)] transition-colors">
              Confidentialité
            </Link>
            <Link href="#" className="hover:text-[var(--accent)] transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
