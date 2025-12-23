'use client';

import { TrendingUp, TrendingDown, Calendar, Users, Box } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { AnalyticsData } from '@/lib/api';

interface AnalyticsContentProps {
  analytics: AnalyticsData;
}

/**
 * Client component for interactive analytics display
 * Separated from Server Component for hydration
 */
export function AnalyticsContent({ analytics }: AnalyticsContentProps) {
  const metrics = [
    {
      label: 'Réservations totales',
      value: analytics.metrics.totalReservations.toString(),
      changeType: 'neutral' as const,
      icon: Calendar,
    },
    {
      label: "Taux d'utilisation",
      value: `${analytics.metrics.utilizationRate}%`,
      changeType: analytics.metrics.utilizationRate > 50 ? ('positive' as const) : ('neutral' as const),
      icon: TrendingUp,
    },
    {
      label: 'Clients uniques',
      value: analytics.metrics.uniqueClients.toString(),
      changeType: 'positive' as const,
      icon: Users,
    },
    {
      label: 'Ressources',
      value: analytics.metrics.totalResources.toString(),
      changeType: 'neutral' as const,
      icon: Box,
    },
    {
      label: 'Confirmées',
      value: analytics.metrics.confirmedReservations.toString(),
      changeType: 'positive' as const,
      icon: TrendingUp,
    },
    {
      label: 'Annulations',
      value: analytics.metrics.cancelledReservations.toString(),
      changeType:
        analytics.metrics.cancelledReservations > 0 ? ('negative' as const) : ('neutral' as const),
      icon: TrendingDown,
    },
  ];

  const resourceUsage = analytics.resourceUsage || [];

  return (
    <>
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, i) => (
          <Card
            key={metric.label}
            className={cn('p-5', `animate-fade-in-up delay-${Math.min(i + 1, 4)}`)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">{metric.label}</p>
                <p className="text-3xl font-display font-medium">{metric.value}</p>
              </div>
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  metric.changeType === 'positive' && 'bg-[var(--success-bg)]',
                  metric.changeType === 'negative' && 'bg-[var(--error-bg)]',
                  metric.changeType === 'neutral' && 'bg-[var(--bg-subtle)]'
                )}
              >
                <metric.icon
                  className={cn(
                    'w-5 h-5',
                    metric.changeType === 'positive' && 'text-[var(--success)]',
                    metric.changeType === 'negative' && 'text-[var(--error)]',
                    metric.changeType === 'neutral' && 'text-[var(--text-tertiary)]'
                  )}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Resource Usage */}
      <Card className="p-6 animate-fade-in-up">
        <h3 className="font-display font-medium mb-6">Utilisation des ressources</h3>
        {resourceUsage.length === 0 ? (
          <p className="text-[var(--text-secondary)] text-center py-4">
            Aucune ressource disponible
          </p>
        ) : (
          <div className="space-y-4">
            {resourceUsage.map((resource) => (
              <div key={resource.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-mono">{resource.name}</span>
                  <span
                    className={cn(
                      'font-medium',
                      resource.usage >= 80 && 'text-[var(--error)]',
                      resource.usage >= 50 && resource.usage < 80 && 'text-[var(--warning)]',
                      resource.usage < 50 && 'text-[var(--success)]'
                    )}
                  >
                    {resource.usage}%
                  </span>
                </div>
                <div className="h-2 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      resource.usage >= 80 && 'bg-[var(--error)]',
                      resource.usage >= 50 && resource.usage < 80 && 'bg-[var(--warning)]',
                      resource.usage < 50 && 'bg-[var(--success)]'
                    )}
                    style={{ width: `${resource.usage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Info Banner */}
      {analytics.metrics.utilizationRate > 0 && (
        <Card className="p-6 bg-[var(--accent-subtle)] border-[var(--accent)] animate-fade-in-up">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-display font-medium text-[var(--accent)]">
                {analytics.metrics.utilizationRate >= 70
                  ? 'Performance excellente'
                  : 'Système opérationnel'}
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Taux d&apos;utilisation moyen de {analytics.metrics.utilizationRate}% sur{' '}
                {analytics.metrics.totalResources} ressources.
              </p>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
