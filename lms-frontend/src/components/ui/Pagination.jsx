import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onChange, className = '' }) {
  if (totalPages <= 1) return null;

  const range = [];
  const delta = 2;
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    range.push(i);
  }

  return (
    <div className={clsx('flex items-center justify-center gap-1', className)}>
      <PageBtn onClick={() => onChange(page - 1)} disabled={page === 1} icon>
        <ChevronLeft className="w-4 h-4" />
      </PageBtn>

      {range[0] > 1 && (
        <>
          <PageBtn onClick={() => onChange(1)} active={page === 1}>1</PageBtn>
          {range[0] > 2 && <span className="px-1 text-stone-300 text-sm">…</span>}
        </>
      )}

      {range.map((p) => (
        <PageBtn key={p} onClick={() => onChange(p)} active={p === page}>{p}</PageBtn>
      ))}

      {range[range.length - 1] < totalPages && (
        <>
          {range[range.length - 1] < totalPages - 1 && <span className="px-1 text-stone-300 text-sm">…</span>}
          <PageBtn onClick={() => onChange(totalPages)} active={page === totalPages}>{totalPages}</PageBtn>
        </>
      )}

      <PageBtn onClick={() => onChange(page + 1)} disabled={page === totalPages} icon>
        <ChevronRight className="w-4 h-4" />
      </PageBtn>
    </div>
  );
}

function PageBtn({ children, onClick, active, disabled, icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'flex items-center justify-center rounded-lg text-sm font-medium transition-colors select-none',
        icon ? 'w-8 h-8' : 'min-w-[2rem] h-8 px-2',
        active
          ? 'bg-brand-600 text-white shadow-sm'
          : 'bg-white border border-stone-200 text-stone-600 hover:border-brand-300 hover:text-brand-600',
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
      )}
    >
      {children}
    </button>
  );
}
