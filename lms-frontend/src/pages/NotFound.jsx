import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-extrabold text-stone-200 leading-none select-none">404</div>
        <h1 className="text-2xl font-bold text-stone-800 mt-4">Page not found</h1>
        <p className="text-stone-500 mt-2 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex justify-center gap-3">
          <Link to="/"        className="btn-secondary">Go Home</Link>
          <Link to="/courses" className="btn-primary">Browse Courses</Link>
        </div>
      </div>
    </div>
  );
}
