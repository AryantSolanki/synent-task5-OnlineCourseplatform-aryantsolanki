import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ label, value, icon, color = 'brand', trend, trendLabel, className = '' }) {
  const colors = {
    brand:   'bg-brand-50 text-brand-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber:   'bg-amber-50 text-amber-700',
    rose:    'bg-rose-50 text-rose-700',
    violet:  'bg-violet-50 text-violet-700',
    sky:     'bg-sky-50 text-sky-700',
  };

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-stone-400';

  return (
    <div className={clsx('card p-5', className)}>
      <div className="flex items-start justify-between">
        <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', colors[color] ?? colors.brand)}>
          {icon}
        </div>
        {trend != null && (
          <div className={clsx('flex items-center gap-1 text-xs font-semibold', trendColor)}>
            <TrendIcon className="w-3.5 h-3.5" />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-extrabold text-stone-900 leading-tight">{value}</div>
        <div className="text-xs font-medium text-stone-500 mt-0.5">{label}</div>
        {trendLabel && <div className="text-xs text-stone-400 mt-0.5">{trendLabel}</div>}
      </div>
    </div>
  );
}
