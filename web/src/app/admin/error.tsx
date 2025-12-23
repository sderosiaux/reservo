'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Admin section error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--status-error-subtle)] flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-[var(--status-error)]" />
        </div>

        <h1 className="text-2xl font-display font-semibold text-[var(--text-primary)] mb-2">
          Erreur dans l&apos;administration
        </h1>

        <p className="text-[var(--text-secondary)] mb-6">
          Une erreur s&apos;est produite lors du chargement de cette page. Veuillez réessayer.
        </p>

        {error.digest && (
          <p className="text-xs text-[var(--text-tertiary)] mb-6 font-mono">
            Code: {error.digest}
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
            href="/admin"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-xl font-medium hover:bg-[var(--bg-subtle)] transition-colors border border-[var(--border)]"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
