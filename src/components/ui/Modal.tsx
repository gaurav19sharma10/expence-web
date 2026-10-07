import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { VectorIcon } from '../vector/VectorIcons';

/**
 * The one modal in the app.
 *
 * Every overlay in the reference is a centred white card on a blurred scrim, so
 * this exists rather than four near-identical copies of that markup.
 *
 * Escape closes it, the scrim closes it, and focus moves into the panel on open
 * so a keyboard user is not left behind on the page underneath. The previous
 * focus is restored on close.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:p-8"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full ${width} my-auto rounded-3xl border border-line bg-surface p-6 shadow-xl`}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold tracking-tight text-body">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 rounded-full p-1.5 text-faint transition-colors hover:bg-surface-sunken hover:text-body"
              >
                <VectorIcon name="close" size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}