import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

const sizes = {
  sm:  'max-w-sm',
  md:  'max-w-lg',
  lg:  'max-w-2xl',
  xl:  'max-w-4xl',
  full:'max-w-6xl',
};

export default function Modal({
  open, onClose, title, children, footer,
  size = 'md', closeOnBackdrop = true, className = '',
}) {
  const dialogRef = useRef(null);

  // Trap focus & handle Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className={clsx(
          'relative w-full bg-white rounded-2xl shadow-modal flex flex-col max-h-[90vh] animate-slide-up',
          sizes[size], className
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 flex-shrink-0">
            <h2 className="text-lg font-bold text-stone-900">{title}</h2>
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-100 flex-shrink-0 bg-stone-50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
