'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui';
import { CapacityBar } from '@/components/ui';
import type { Resource } from '@/lib/types';

interface ResourceCardProps {
  resource: Resource;
  onClick?: () => void;
}

export function ResourceCard({ resource, onClick }: ResourceCardProps) {
  const isOpen = resource.state === 'OPEN';

  return (
    <Link href={`/admin/resources/${resource.id}`}>
      <Card data-testid={`resource-card-${resource.id}`} hover onClick={onClick} className="p-6">
        <div className="flex items-start justify-between mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded">
            {resource.type}
          </span>
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              isOpen ? 'bg-[var(--success)]' : 'bg-[var(--error)]'
            )}
            title={isOpen ? 'Ouvert' : 'Fermé'}
          />
        </div>

        <h3 className="font-display text-base font-medium mb-1">
          {resource.id}
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] mb-6">
          Capacité: {resource.capacity} places
        </p>

        <CapacityBar current={resource.currentBookings} total={resource.capacity} />
      </Card>
    </Link>
  );
}
