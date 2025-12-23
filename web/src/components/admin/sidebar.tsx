'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebar } from './sidebar-context';
import {
  LayoutGrid,
  Box,
  Calendar,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  CalendarDays,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutGrid },
  { name: 'Ressources', href: '/admin/resources', icon: Box },
  { name: 'Réservations', href: '/admin/reservations', icon: Calendar },
  { name: 'Clients', href: '/admin/clients', icon: Users },
];

const secondaryNav = [
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Paramètres', href: '/admin/settings', icon: Settings },
];

export function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-[var(--bg-elevated)] border-r border-[var(--border)]',
        'flex flex-col transition-all duration-300 z-50',
        collapsed ? 'w-[72px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className="p-6">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-display text-lg font-medium tracking-tight">
              Reservo
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-6">
        <div>
          {!collapsed && (
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Aperçu
            </p>
          )}
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'opacity-100' : 'opacity-70')} />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          {!collapsed && (
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Système
            </p>
          )}
          <div className="space-y-1">
            {secondaryNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'opacity-100' : 'opacity-70')} />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Collapse button */}
      <div className="p-3 border-t border-[var(--border)]">
        <button
          onClick={toggle}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
            'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
            'transition-colors'
          )}
        >
          <ChevronLeft
            className={cn(
              'w-5 h-5 transition-transform duration-300',
              collapsed && 'rotate-180'
            )}
          />
          {!collapsed && <span>Réduire</span>}
        </button>
      </div>
    </aside>
  );
}
