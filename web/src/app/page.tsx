import Link from 'next/link';
import { CalendarDays, ArrowRight, Shield, Zap, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-lg font-medium">Reservo</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/book/conf-room-a">
              <Button variant="ghost">Réserver</Button>
            </Link>
            <Link href="/admin">
              <Button>Dashboard Admin</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-display font-medium tracking-tight mb-6">
            Réservations sans <br />
            <span className="text-[var(--accent)]">sur-réservation</span>
          </h1>
          <p className="text-xl text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto leading-relaxed">
            Un moteur de réservation moderne avec disponibilité en temps réel
            et garantie anti-overbooking grâce aux transactions PostgreSQL.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/admin">
              <Button size="lg">
                Voir le Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/book/conf-room-a">
              <Button variant="secondary" size="lg">
                Tester une réservation
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-[var(--bg-elevated)] border-y border-[var(--border)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-display font-medium text-center mb-16">
            Conçu pour la fiabilité
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-6 bg-[var(--accent-subtle)] rounded-2xl flex items-center justify-center">
                <Shield className="w-7 h-7 text-[var(--accent)]" />
              </div>
              <h3 className="text-lg font-display font-medium mb-2">
                Zéro overbooking
              </h3>
              <p className="text-[var(--text-secondary)]">
                Verrouillage FOR UPDATE PostgreSQL garantit l&apos;atomicité des réservations,
                même sous 1000+ requêtes concurrentes.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-6 bg-[var(--accent-subtle)] rounded-2xl flex items-center justify-center">
                <Zap className="w-7 h-7 text-[var(--accent)]" />
              </div>
              <h3 className="text-lg font-display font-medium mb-2">
                Temps réel
              </h3>
              <p className="text-[var(--text-secondary)]">
                Disponibilité mise à jour instantanément. Confirmation ou rejet
                en moins de 50ms.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-6 bg-[var(--accent-subtle)] rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-7 h-7 text-[var(--accent)]" />
              </div>
              <h3 className="text-lg font-display font-medium mb-2">
                Dashboard complet
              </h3>
              <p className="text-[var(--text-secondary)]">
                Gérez ressources, réservations et clients depuis une interface
                moderne et intuitive.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Links */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-display font-medium mb-6">
            Testez l&apos;application
          </h2>
          <p className="text-[var(--text-secondary)] mb-10">
            Explorez les deux interfaces : le dashboard admin et le portail client.
          </p>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Link
              href="/admin"
              className="p-6 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)] hover:shadow-lg transition-all group"
            >
              <h3 className="font-display font-medium mb-2 group-hover:text-[var(--accent)] transition-colors">
                Dashboard Admin →
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Gérer les ressources, voir les réservations, statistiques
              </p>
            </Link>
            <Link
              href="/book/conf-room-a"
              className="p-6 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)] hover:shadow-lg transition-all group"
            >
              <h3 className="font-display font-medium mb-2 group-hover:text-[var(--accent)] transition-colors">
                Portail Client →
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Réserver une ressource, voir la disponibilité en temps réel
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--bg-elevated)] border-t border-[var(--border)] px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-[var(--text-tertiary)]">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            <span>Reservo — Moteur de réservation</span>
          </div>
          <span>Construit avec Next.js, Fastify, PostgreSQL</span>
        </div>
      </footer>
    </div>
  );
}
