'use client';

import { useEffect, useCallback, useRef, useId } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Optional description for screen readers */
  description?: string;
}

/**
 * Accessible Modal Component
 *
 * Implements WAI-ARIA best practices:
 * - role="dialog" with aria-modal="true"
 * - aria-labelledby pointing to title
 * - aria-describedby for description (if provided)
 * - Focus trap within modal
 * - Escape key closes modal
 * - Click outside closes modal
 */
export function Modal({ open, onClose, title, children, footer, description }: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Focus trap: keep focus within modal
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    // Store currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };

    // Add event listeners
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    // Focus the first input, or fallback to first focusable
    setTimeout(() => {
      const firstInput = modalRef.current?.querySelector<HTMLElement>('input, select, textarea');
      if (firstInput) {
        firstInput.focus();
      } else {
        const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }
    }, 0);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';

      // Restore focus to previous element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-black/40 backdrop-blur-sm',
        'animate-fade-in'
      )}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full max-w-md bg-[var(--bg-elevated)] rounded-2xl shadow-lg',
          'animate-fade-in-up'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <h2 id={titleId} className="text-lg font-medium font-display">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-lg',
              'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]',
              'hover:bg-[var(--bg-subtle)] transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2'
            )}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Description for screen readers */}
        {description && (
          <p id={descriptionId} className="sr-only">
            {description}
          </p>
        )}

        {/* Body */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex justify-end gap-2 p-6 border-t border-[var(--border)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
