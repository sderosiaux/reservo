'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to error reporting service (e.g., Sentry)
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--status-error-subtle)] flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-[var(--status-error)]" />
        </div>

        <h1 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-2">
          Une erreur est survenue
        </h1>

        <p className="text-[var(--text-secondary)] mb-6">
          Nous sommes désolés, quelque chose s&apos;est mal passé. Veuillez réessayer ou retourner à l&apos;accueil.
        </p>

        {error.digest && (
          <p className="text-xs text-[var(--text-tertiary)] mb-6 font-mono">
            Code erreur: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--accent)] text-white rounded-xl font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-xl font-medium hover:bg-[var(--bg-subtle)] transition-colors border border-[var(--border)]"
          >
            <Home className="w-4 h-4" />
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
