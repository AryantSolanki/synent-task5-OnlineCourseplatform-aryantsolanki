import { AlertTriangle, Trash2, Info } from 'lucide-react';
import Modal from './Modal';
import Loader from '../common/Loader';
import clsx from 'clsx';

const variants = {
  danger:  { icon: <Trash2       className="w-6 h-6 text-red-500" />,    bg: 'bg-red-50',    btn: 'bg-red-600 hover:bg-red-700 text-white' },
  warning: { icon: <AlertTriangle className="w-6 h-6 text-amber-500" />, bg: 'bg-amber-50',  btn: 'bg-amber-600 hover:bg-amber-700 text-white' },
  info:    { icon: <Info          className="w-6 h-6 text-brand-500" />,  bg: 'bg-brand-50',  btn: 'bg-brand-600 hover:bg-brand-700 text-white' },
};

export default function ConfirmDialog({
  open, onClose, onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  const v = variants[variant] ?? variants.danger;

  return (
    <Modal open={open} onClose={onClose} size="sm" closeOnBackdrop={!loading}
      footer={
        <>
          <button onClick={onClose} disabled={loading} className="btn-secondary">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={clsx('px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center gap-2', v.btn)}
          >
            {loading && <Loader size="sm" white />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', v.bg)}>
          {v.icon}
        </div>
        <div>
          <h3 className="font-bold text-stone-900 text-base mb-1">{title}</h3>
          <p className="text-stone-500 text-sm leading-relaxed">{message}</p>
        </div>
      </div>
    </Modal>
  );
}
