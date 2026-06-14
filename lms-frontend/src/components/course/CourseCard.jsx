import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { formatPrice, formatCount } from '../../utils/formatters';
import StarRating from '../common/StarRating';
import Avatar from '../common/Avatar';
import { resolveUrl } from '../../api/axios';

const levelColors = {
  beginner:     'bg-emerald-50 text-emerald-700',
  intermediate: 'bg-amber-50 text-amber-700',
  advanced:     'bg-rose-50 text-rose-700',
  'all-levels': 'bg-sky-50 text-sky-700',
};

export default function CourseCard({ course, progress }) {
  const {
    _id, title, subtitle, thumbnail, instructor,
    price, discountPrice, isFree,
    avgRating, totalStudents, totalReviews,
    level, categoryName, isBestSeller,
  } = course;

  const thumb = resolveUrl(thumbnail);
  const showProgress = progress != null;

  return (
    <Link to={`/courses/${_id}`} className="group block">
      <div className="card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5 h-full flex flex-col">

        {/* Thumbnail */}
        <div className="relative aspect-video bg-stone-100 overflow-hidden">
          {thumb ? (
            <img
              src={thumb}
              alt={title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200">
              <span className="text-4xl">📚</span>
            </div>
          )}

          {isBestSeller && (
            <span className="absolute top-2 left-2 badge bg-amber-400 text-amber-900 text-[10px] font-bold tracking-wide uppercase">
              Bestseller
            </span>
          )}
          {isFree && (
            <span className="absolute top-2 right-2 badge bg-emerald-500 text-white text-[10px] font-bold tracking-wide uppercase">
              Free
            </span>
          )}

          {/* Progress bar */}
          {showProgress && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
              <div
                className="h-full bg-brand-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col flex-1 gap-2">

          {/* Meta row */}
          <div className="flex items-center gap-2">
            <span className={clsx('badge text-[10px] font-semibold capitalize', levelColors[level] ?? 'bg-stone-100 text-stone-600')}>
              {level}
            </span>
            {categoryName && (
              <span className="text-xs text-stone-400 truncate">{categoryName}</span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-stone-900 text-sm leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors flex-1">
            {title}
          </h3>

          {/* Instructor */}
          {instructor && (
            <div className="flex items-center gap-1.5">
              <Avatar src={instructor.profilePicture} name={instructor.name} size="xs" />
              <span className="text-xs text-stone-500 truncate">{instructor.name}</span>
            </div>
          )}

          {/* Rating */}
          {avgRating > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-amber-600">{avgRating.toFixed(1)}</span>
              <StarRating rating={avgRating} size="xs" />
              {totalReviews > 0 && (
                <span className="text-xs text-stone-400">({formatCount(totalReviews)})</span>
              )}
            </div>
          )}

          {/* Progress label */}
          {showProgress && (
            <p className="text-xs text-stone-500">{progress}% complete</p>
          )}

          {/* Price */}
          {!showProgress && (
            <div className="flex items-baseline gap-2 mt-auto pt-1">
              <span className="font-bold text-stone-900">
                {isFree ? 'Free' : formatPrice(discountPrice || price)}
              </span>
              {!isFree && discountPrice > 0 && discountPrice < price && (
                <span className="text-xs text-stone-400 line-through">{formatPrice(price)}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
