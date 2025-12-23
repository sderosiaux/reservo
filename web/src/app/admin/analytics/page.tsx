import { Suspense } from 'react';
import { TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui';
import { AnalyticsContent } from './analytics-content';
import { AnalyticsSkeleton } from './analytics-skeleton';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

/**
 * Server-side data fetching for analytics
 * Nice to Have: Server Components reduce client bundle and improve TTFB
 */
async function fetchAnalytics() {
  try {
    const response = await fetch(`${API_BASE}/analytics`, {
      // Revalidate every 30 seconds for fresh data
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch analytics: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return null;
  }
}

export default async function AnalyticsPage() {
  const analyticsPromise = fetchAnalytics();

  return (
    <div>
      {/* Header - Static content, no JS needed */}
      <header className="bg-[var(--bg-elevated)] border-b border-[var(--border)] sticky top-0 z-40">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight">Analytics</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Statistiques et métriques de performance
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
            <TrendingUp className="w-4 h-4" />
            Données mises à jour toutes les 30s
          </div>
        </div>
      </header>

      {/* Content with Suspense boundary */}
      <div className="p-8 space-y-8">
        <Suspense fallback={<AnalyticsSkeleton />}>
          <AnalyticsData analyticsPromise={analyticsPromise} />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * Async component that awaits the data and renders
 */
async function AnalyticsData({
  analyticsPromise,
}: {
  analyticsPromise: ReturnType<typeof fetchAnalytics>;
}) {
  const analytics = await analyticsPromise;

  if (!analytics) {
    return (
      <Card className="p-8 text-center">
        <p className="text-[var(--error)]">Impossible de charger les analytics</p>
        <a
          href="/admin/analytics"
          className="mt-4 inline-block text-sm text-[var(--accent)] hover:underline"
        >
          Réessayer
        </a>
      </Card>
    );
  }

  return <AnalyticsContent analytics={analytics} />;
}
