'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global Error Boundary
 * Catches errors in the root layout
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log to error reporting service
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center' }}>
            <div style={{
              width: '4rem',
              height: '4rem',
              margin: '0 auto 1.5rem',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle style={{ width: '2rem', height: '2rem', color: '#ef4444' }} />
            </div>

            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#0f172a',
              marginBottom: '0.5rem'
            }}>
              Erreur critique
            </h1>

            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Une erreur inattendue s&apos;est produite. Veuillez recharger la page.
            </p>

            {error.digest && (
              <p style={{
                fontSize: '0.75rem',
                color: '#94a3b8',
                marginBottom: '1.5rem',
                fontFamily: 'monospace'
              }}>
                Code: {error.digest}
              </p>
            )}

            <button
              onClick={reset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '0.75rem',
                border: 'none',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <RefreshCw style={{ width: '1rem', height: '1rem' }} />
              Recharger la page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
