import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export default function PageHeader({ title, subtitle, breadcrumbs, actions, className = '' }) {
  return (
    <div className={clsx('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8', className)}>
      <div>
        {breadcrumbs?.length > 0 && (
          <nav className="flex items-center gap-1 text-xs text-stone-400 mb-2">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3 h-3" />}
                {b.href ? (
                  <Link to={b.href} className="hover:text-brand-600 transition-colors">{b.label}</Link>
                ) : (
                  <span className="text-stone-600 font-medium">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold text-stone-900">{title}</h1>
        {subtitle && <p className="text-stone-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>}
    </div>
  );
}
