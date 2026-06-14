export default function CourseCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="aspect-video bg-stone-200" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="h-4 w-16 bg-stone-200 rounded-full" />
          <div className="h-4 w-24 bg-stone-200 rounded-full" />
        </div>
        <div className="space-y-1.5">
          <div className="h-4 bg-stone-200 rounded w-full" />
          <div className="h-4 bg-stone-200 rounded w-4/5" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-stone-200" />
          <div className="h-3 w-24 bg-stone-200 rounded" />
        </div>
        <div className="h-3 w-28 bg-stone-200 rounded" />
        <div className="h-5 w-20 bg-stone-200 rounded mt-2" />
      </div>
    </div>
  );
}
