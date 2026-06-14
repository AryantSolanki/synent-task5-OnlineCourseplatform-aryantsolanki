import clsx from 'clsx';

const sizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-3',
};

export default function Loader({ size = 'md', className = '', white = false }) {
  return (
    <div
      className={clsx(
        'rounded-full animate-spin border-t-transparent',
        sizes[size],
        white ? 'border-white' : 'border-brand-600',
        className
      )}
      role="status"
      aria-label="Loading…"
    />
  );
}
