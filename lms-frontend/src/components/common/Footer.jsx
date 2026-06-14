import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-lg">LearnHub</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              Learn anything, anywhere. Access thousands of courses taught by expert instructors.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/courses"   className="hover:text-white transition-colors">Browse Courses</Link></li>
              <li><Link to="/register"  className="hover:text-white transition-colors">Become an Instructor</Link></li>
              <li><Link to="/register"  className="hover:text-white transition-colors">Create Account</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="mailto:support@learnhub.com" className="hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-stone-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs">© {new Date().getFullYear()} LearnHub. All rights reserved.</p>
          <p className="text-xs">Built with ❤️ for learners everywhere</p>
        </div>
      </div>
    </footer>
  );
}
