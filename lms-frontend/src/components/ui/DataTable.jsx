import clsx from 'clsx';
import Loader from '../common/Loader';

/**
 * columns: [{ key, header, render?, sortable?, className?, width? }]
 * data:    array of row objects
 */
export default function DataTable({
  columns, data = [], loading = false,
  emptyMessage = 'No data found',
  onSort, sortKey, sortDir = 'asc',
  rowKey = '_id',
  onRowClick,
  className = '',
}) {
  const handleSort = (col) => {
    if (!col.sortable || !onSort) return;
    onSort(col.key, sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className={clsx('overflow-x-auto rounded-xl border border-stone-100', className)}>
      <table className="min-w-full divide-y divide-stone-100 text-sm">
        <thead className="bg-stone-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col)}
                className={clsx(
                  'px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider select-none',
                  col.sortable && 'cursor-pointer hover:text-stone-700',
                  col.className,
                )}
                style={col.width ? { width: col.width } : undefined}
              >
                <span className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    <span className="text-brand-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-stone-50">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center">
                <Loader className="mx-auto" />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-14 text-center text-stone-400 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row[rowKey]}
                onClick={() => onRowClick?.(row)}
                className={clsx(
                  'transition-colors',
                  onRowClick ? 'cursor-pointer hover:bg-stone-50' : 'hover:bg-stone-50/50'
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={clsx('px-4 py-3 text-stone-700', col.className)}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
