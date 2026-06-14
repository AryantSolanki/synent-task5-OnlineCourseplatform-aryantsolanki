import clsx from 'clsx';

export default function EmptyState({
  icon = '📭',
  title = 'Nothing here yet',
  description,
  action,
  className = '',
  compact = false,
}) {
  return (
    <div className={clsx(
      'flex flex-col items-center justify-center text-center',
      compact ? 'py-10 px-4' : 'py-20 px-6',
      className,
    )}>
      <div className={clsx('text-5xl mb-4', compact && 'text-4xl mb-3')}>{icon}</div>
      <h3 className={clsx('font-bold text-stone-700', compact ? 'text-base mb-1' : 'text-xl mb-2')}>{title}</h3>
      {description && (
        <p className={clsx('text-stone-400 max-w-xs mx-auto', compact ? 'text-xs mb-4' : 'text-sm mb-6')}>
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
