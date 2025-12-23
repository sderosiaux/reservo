import { clsx, type ClassValue } from 'clsx';

// French-only locale by design - update here if i18n is needed in future
const LOCALE = 'fr-FR' as const;

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | number | Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatDateDetailed(timestamp: number): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp));
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return formatDateDetailed(timestamp);
}

export function getInitials(name: string): string {
  return name
    .split(/[-_@.]/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function getCapacityPercent(current: number, total: number): number {
  return Math.round((current / total) * 100);
}

export function getCapacityStatus(current: number, total: number): 'low' | 'medium' | 'high' | 'full' {
  const percent = getCapacityPercent(current, total);
  if (percent >= 100) return 'full';
  if (percent >= 80) return 'high';
  if (percent >= 50) return 'medium';
  return 'low';
}
