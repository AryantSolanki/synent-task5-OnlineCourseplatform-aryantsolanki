import clsx from 'clsx';
import { getInitials } from '../../utils/formatters';
import { resolveUrl } from '../../api/axios';

const sizes = {
  xs:  'w-6 h-6 text-xs',
  sm:  'w-8 h-8 text-sm',
  md:  'w-10 h-10 text-sm',
  lg:  'w-14 h-14 text-xl',
  xl:  'w-20 h-20 text-2xl',
};

const colors = [
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-indigo-100 text-indigo-700',
];

function colorFor(name = '') {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({ src, name = '', size = 'md', className = '' }) {
  const resolved = resolveUrl(src);
  const ring = 'rounded-full overflow-hidden flex-shrink-0';

  if (resolved) {
    return (
      <img
        src={resolved}
        alt={name}
        className={clsx(ring, sizes[size], 'object-cover', className)}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }

  return (
    <span className={clsx(ring, sizes[size], 'flex items-center justify-center font-semibold', colorFor(name), className)}>
      {getInitials(name)}
    </span>
  );
}
