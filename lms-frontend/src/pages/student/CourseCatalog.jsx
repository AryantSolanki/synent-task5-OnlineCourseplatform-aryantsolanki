import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, X, ChevronDown, Search } from 'lucide-react';
import { courseApi } from '../../api/courseApi';
import CourseCard from '../../components/course/CourseCard';
import CourseCardSkeleton from '../../components/course/CourseCardSkeleton';
import { useDebounce } from '../../hooks/useDebounce';
import { LEVELS, SORT_OPTIONS, RATING_OPTIONS } from '../../utils/constants';
import clsx from 'clsx';

const PRICE_OPTIONS = [
  { label: 'All',  value: null },
  { label: 'Free', value: 'free' },
  { label: 'Paid', value: 'paid' },
];

export default function CourseCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();

  /* ── Filter state ────────────────────────────────────────── */
  const [search, setSearch]       = useState(searchParams.get('search') || '');
  const [category, setCategory]   = useState(searchParams.get('category') || '');
  const [level, setLevel]         = useState(searchParams.get('level') || '');
  const [minRating, setMinRating] = useState(searchParams.get('minRating') || '');
  const [priceType, setPriceType] = useState('');
  const [sort, setSort]           = useState('-totalStudents');
  const [page, setPage]           = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 450);

  /* ── Sync URL to filters ─────────────────────────────────── */
  useEffect(() => {
    const p = {};
    if (debouncedSearch) p.search   = debouncedSearch;
    if (category)        p.category = category;
    if (level)           p.level    = level;
    if (minRating)       p.minRating = minRating;
    setSearchParams(p, { replace: true });
    setPage(1);
  }, [debouncedSearch, category, level, minRating]);

  /* ── Build query params ──────────────────────────────────── */
  const queryParams = {
    page, limit: 12, sort,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(category  && { category }),
    ...(level     && { level }),
    ...(minRating && { minRating }),
    ...(priceType === 'free' && { free: 'true' }),
    ...(priceType === 'paid' && { minPrice: 1 }),
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['courses', queryParams],
    queryFn: () => courseApi.getAll(queryParams),
    placeholderData: (prev) => prev,
  });

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: courseApi.getCategories,
  });

  const courses    = data?.courses    ?? [];
  const total      = data?.total      ?? 0;
  const totalPages = data?.pages      ?? 1;
  const categories = catData?.categories ?? [];

  const clearFilters = () => {
    setSearch(''); setCategory(''); setLevel('');
    setMinRating(''); setPriceType(''); setSort('-totalStudents'); setPage(1);
  };

  const hasFilters = search || category || level || minRating || priceType;

  /* ── Sidebar Filter Panel ────────────────────────────────── */
  const FilterPanel = (
    <aside className="space-y-6">
      {/* Category */}
      <FilterGroup title="Category">
        <ul className="space-y-1.5">
          <li>
            <button onClick={() => setCategory('')}
              className={clsx('text-sm w-full text-left px-2 py-1 rounded', !category ? 'font-semibold text-brand-700 bg-brand-50' : 'text-stone-600 hover:text-stone-900')}>
              All Categories
            </button>
          </li>
          {categories.map((c) => (
            <li key={c._id}>
              <button onClick={() => setCategory(c.name)}
                className={clsx('text-sm w-full text-left px-2 py-1 rounded', category === c.name ? 'font-semibold text-brand-700 bg-brand-50' : 'text-stone-600 hover:text-stone-900')}>
                {c.icon} {c.name}
              </button>
            </li>
          ))}
        </ul>
      </FilterGroup>

      {/* Level */}
      <FilterGroup title="Level">
        {LEVELS.map((l) => (
          <label key={l.value} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="level" value={l.value}
              checked={level === l.value}
              onChange={() => setLevel(l.value === level ? '' : l.value)}
              className="text-brand-600 focus:ring-brand-500" />
            <span className="text-sm text-stone-700">{l.label}</span>
          </label>
        ))}
      </FilterGroup>

      {/* Rating */}
      <FilterGroup title="Rating">
        {RATING_OPTIONS.map((r) => (
          <label key={r.value} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="rating" value={r.value}
              checked={minRating === String(r.value)}
              onChange={() => setMinRating(minRating === String(r.value) ? '' : String(r.value))}
              className="text-brand-600 focus:ring-brand-500" />
            <span className="text-sm text-stone-700">{r.label}</span>
          </label>
        ))}
      </FilterGroup>

      {/* Price */}
      <FilterGroup title="Price">
        {PRICE_OPTIONS.map((p) => (
          <label key={p.label} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="price"
              checked={priceType === (p.value ?? '')}
              onChange={() => setPriceType(p.value ?? '')}
              className="text-brand-600 focus:ring-brand-500" />
            <span className="text-sm text-stone-700">{p.label}</span>
          </label>
        ))}
      </FilterGroup>

      {hasFilters && (
        <button onClick={clearFilters} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 font-medium">
          <X className="w-3.5 h-3.5" /> Clear all filters
        </button>
      )}
    </aside>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* ── Page header ── */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900">
          {category ? `${category} Courses` : debouncedSearch ? `Results for "${debouncedSearch}"` : 'All Courses'}
        </h1>
        {total > 0 && <p className="text-stone-400 text-sm mt-1">{total.toLocaleString()} courses</p>}
      </div>

      {/* ── Search bar (mobile + desktop supplemental) ── */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          <input type="search" placeholder="Search courses…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 bg-white" />
        </div>

        {/* Sort */}
        <div className="relative">
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="input-field pr-8 bg-white appearance-none cursor-pointer w-auto">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        </div>

        {/* Mobile filter toggle */}
        <button onClick={() => setSidebarOpen(v => !v)}
          className={clsx('lg:hidden btn-secondary flex items-center gap-2', hasFilters && 'border-brand-400 text-brand-600')}>
          <SlidersHorizontal className="w-4 h-4" />
          Filters {hasFilters && <span className="w-2 h-2 rounded-full bg-brand-600" />}
        </button>
      </div>

      {/* ── Main layout ── */}
      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <div className="hidden lg:block w-56 flex-shrink-0">
          {FilterPanel}
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 bg-white p-6 overflow-y-auto shadow-2xl animate-slide-up">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-stone-900">Filters</h3>
                <button onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
              </div>
              {FilterPanel}
            </div>
          </div>
        )}

        {/* Course grid */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array(12).fill(0).map((_, i) => <CourseCardSkeleton key={i} />)}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">🔍</p>
              <h3 className="text-xl font-semibold text-stone-700 mb-2">No courses found</h3>
              <p className="text-stone-400 mb-6">Try adjusting your filters or search terms.</p>
              <button onClick={clearFilters} className="btn-primary">Clear filters</button>
            </div>
          ) : (
            <>
              <div className={clsx(
                'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 transition-opacity',
                isFetching && 'opacity-70'
              )}>
                {courses.map((c) => <CourseCard key={c._id} course={c} />)}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-10">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-4 py-2 disabled:opacity-40">← Prev</button>
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    let p = i + 1;
                    if (totalPages > 7) {
                      if (page <= 4) p = i + 1;
                      else if (page >= totalPages - 3) p = totalPages - 6 + i;
                      else p = page - 3 + i;
                    }
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className={clsx('w-9 h-9 rounded-lg text-sm font-medium transition-colors', p === page ? 'bg-brand-600 text-white' : 'bg-white border border-stone-200 text-stone-700 hover:border-brand-300')}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary px-4 py-2 disabled:opacity-40">Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setOpen(v => !v)} className="flex justify-between items-center w-full font-semibold text-stone-800 text-sm mb-3">
        {title}
        <ChevronDown className={clsx('w-4 h-4 text-stone-400 transition-transform', !open && '-rotate-90')} />
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </div>
  );
}
