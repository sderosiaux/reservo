'use client';

import { Sidebar } from '@/components/admin/sidebar';
import { SidebarProvider, useSidebar } from '@/components/admin/sidebar-context';
import { cn } from '@/lib/utils';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <main
        className={cn(
          'transition-all duration-300',
          collapsed ? 'ml-[72px]' : 'ml-[240px]'
        )}
      >
        {children}
      </main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </SidebarProvider>
  );
}
