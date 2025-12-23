import { Card } from '@/components/ui';

/**
 * Loading skeleton for analytics page
 * Shows while server-side data is being fetched
 */
export function AnalyticsSkeleton() {
  return (
    <>
      {/* Metrics Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="p-5 animate-pulse">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-4 bg-[var(--bg-subtle)] rounded w-24 mb-2" />
                <div className="h-8 bg-[var(--bg-subtle)] rounded w-16" />
              </div>
              <div className="w-10 h-10 bg-[var(--bg-subtle)] rounded-lg" />
            </div>
          </Card>
        ))}
      </div>

      {/* Resource Usage Skeleton */}
      <Card className="p-6 animate-pulse">
        <div className="h-5 bg-[var(--bg-subtle)] rounded w-48 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <div className="h-4 bg-[var(--bg-subtle)] rounded w-32" />
                <div className="h-4 bg-[var(--bg-subtle)] rounded w-12" />
              </div>
              <div className="h-2 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--bg-hover)] rounded-full"
                  style={{ width: `${Math.random() * 80 + 20}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
