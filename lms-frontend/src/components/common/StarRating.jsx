import clsx from 'clsx';

export default function StarRating({ rating = 0, max = 5, size = 'sm', showValue = false, className = '' }) {
  const sizePx = { xs: 'w-3 h-3', sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' }[size] ?? 'w-4 h-4';

  return (
    <span className={clsx('inline-flex items-center gap-0.5', className)}>
      {Array.from({ length: max }).map((_, i) => {
        const fill = Math.min(Math.max(rating - i, 0), 1);
        return (
          <span key={i} className={clsx('relative inline-block', sizePx)}>
            {/* Empty star */}
            <svg viewBox="0 0 20 20" fill="none" className="absolute inset-0 w-full h-full">
              <path
                d="M10 1l2.39 5.26 5.61.82-4 4.1.94 5.82L10 14.27l-4.94 2.73.94-5.82-4-4.1 5.61-.82L10 1z"
                stroke="#d1d5db" strokeWidth="1.5" strokeLinejoin="round"
              />
            </svg>
            {/* Filled star */}
            <svg viewBox="0 0 20 20" className="absolute inset-0 w-full h-full" style={{ clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` }}>
              <path
                d="M10 1l2.39 5.26 5.61.82-4 4.1.94 5.82L10 14.27l-4.94 2.73.94-5.82-4-4.1 5.61-.82L10 1z"
                fill="#f59e0b" stroke="#f59e0b" strokeWidth="1" strokeLinejoin="round"
              />
            </svg>
          </span>
        );
      })}
      {showValue && (
        <span className="ml-1 text-xs font-semibold text-amber-600">
          {rating.toFixed(1)}
        </span>
      )}
    </span>
  );
}
