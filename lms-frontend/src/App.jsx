import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout components
import Navbar           from './components/common/Navbar';
import Footer           from './components/common/Footer';
import ProtectedRoute   from './components/common/ProtectedRoute';
import InstructorLayout from './components/instructor/InstructorLayout';
import AdminLayout      from './components/admin/AdminLayout';
import Loader           from './components/common/Loader';

// Public / auth pages
import Home            from './pages/Home';
import NotFound        from './pages/NotFound';
import Login           from './pages/auth/Login';
import Register        from './pages/auth/Register';
import { ForgotPassword, ResetPassword } from './pages/auth/PasswordReset';

// Student pages
import CourseCatalog   from './pages/student/CourseCatalog';
import CourseDetail    from './pages/student/CourseDetail';
import Dashboard       from './pages/student/Dashboard';
import MyLearning      from './pages/student/MyLearning';
import CoursePlayer    from './pages/student/CoursePlayer';
import Profile         from './pages/student/Profile';
import Notifications   from './pages/student/Notifications';
import Certificate     from './pages/student/Certificate';

// Instructor pages
import InstructorDashboard  from './pages/instructor/InstructorDashboard';
import MyCourses            from './pages/instructor/MyCourses';
import CourseWizard         from './pages/instructor/CourseWizard';
import InstructorStudents   from './pages/instructor/InstructorStudents';
import Revenue              from './pages/instructor/Revenue';
import Grading              from './pages/instructor/Grading';
import InstructorAnalytics  from './pages/instructor/InstructorAnalytics';
import QuizManager          from './pages/instructor/QuizManager';

// Admin pages
import AdminDashboard    from './pages/admin/AdminDashboard';
import UserManagement    from './pages/admin/UserManagement';
import CourseManagement  from './pages/admin/CourseManagement';
import CategoryManagement from './pages/admin/CategoryManagement';
import PayoutManagement  from './pages/admin/PayoutManagement';
import RevenueReport     from './pages/admin/RevenueReport';
import PlatformSettings  from './pages/admin/PlatformSettings';
import EmailTemplates    from './pages/admin/EmailTemplates';
import ActivityLogs      from './pages/admin/ActivityLogs';
import InstructorApprovals from './pages/admin/InstructorApprovals';

/* ── Layouts ─────────────────────────────────────────────── */
const MainLayout = ({ children }) => (
  <>
    <Navbar />
    <main className="min-h-screen">{children}</main>
    <Footer />
  </>
);

const PlayerLayout = ({ children }) => (
  <div className="h-screen flex flex-col overflow-hidden bg-stone-900">
    {children}
  </div>
);

/* instructor pages wrapped with sidebar layout */
const ILayout = ({ children }) => (
  <ProtectedRoute roles={['instructor', 'admin']}>
    <InstructorLayout>{children}</InstructorLayout>
  </ProtectedRoute>
);

/* admin pages wrapped with admin layout */
const ALayout = ({ children }) => (
  <ProtectedRoute roles={['admin']}>
    <AdminLayout>{children}</AdminLayout>
  </ProtectedRoute>
);

/* ── App ─────────────────────────────────────────────────── */
export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      {/* ── Public ──────────────────────────────────────── */}
      <Route path="/"             element={<MainLayout><Home /></MainLayout>} />
      <Route path="/courses"      element={<MainLayout><CourseCatalog /></MainLayout>} />
      <Route path="/courses/:id"  element={<MainLayout><CourseDetail /></MainLayout>} />

      {/* ── Auth ────────────────────────────────────────── */}
      <Route path="/login"                   element={<MainLayout><Login /></MainLayout>} />
      <Route path="/register"                element={<MainLayout><Register /></MainLayout>} />
      <Route path="/forgot-password"         element={<MainLayout><ForgotPassword /></MainLayout>} />
      <Route path="/reset-password/:token"   element={<MainLayout><ResetPassword /></MainLayout>} />

      {/* ── Student (protected) ─────────────────────────── */}
      <Route path="/student/dashboard"    element={
        <ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>
      } />
      <Route path="/student/my-learning"  element={
        <ProtectedRoute><MainLayout><MyLearning /></MainLayout></ProtectedRoute>
      } />
      <Route path="/student/profile"      element={
        <ProtectedRoute><MainLayout><Profile /></MainLayout></ProtectedRoute>
      } />
      <Route path="/student/notifications" element={
        <ProtectedRoute><MainLayout><Notifications /></MainLayout></ProtectedRoute>
      } />
      <Route path="/student/certificate/:courseId" element={
        <ProtectedRoute><MainLayout><Certificate /></MainLayout></ProtectedRoute>
      } />

      {/* ── Course player (full-screen) ──────────────────── */}
      <Route path="/learn/:courseId" element={
        <ProtectedRoute>
          <PlayerLayout><CoursePlayer /></PlayerLayout>
        </ProtectedRoute>
      } />

      {/* ── Instructor (sidebar layout) ──────────────────── */}
      <Route path="/instructor/dashboard"      element={<ILayout><InstructorDashboard /></ILayout>} />
      <Route path="/instructor/courses"        element={<ILayout><MyCourses /></ILayout>} />
      <Route path="/instructor/courses/new"    element={<ILayout><CourseWizard /></ILayout>} />
      <Route path="/instructor/courses/:id/edit" element={<ILayout><CourseWizard /></ILayout>} />
      <Route path="/instructor/students"       element={<ILayout><InstructorStudents /></ILayout>} />
      <Route path="/instructor/revenue"        element={<ILayout><Revenue /></ILayout>} />
      <Route path="/instructor/grading"        element={<ILayout><Grading /></ILayout>} />
      <Route path="/instructor/analytics"      element={<ILayout><InstructorAnalytics /></ILayout>} />
      <Route path="/instructor/courses/:courseId/quizzes" element={<ILayout><QuizManager /></ILayout>} />

      {/* ── Convenience redirects ────────────────────────── */}
      <Route path="/dashboard"    element={<Navigate to="/student/dashboard" replace />} />
      <Route path="/my-learning"  element={<Navigate to="/student/my-learning" replace />} />
      <Route path="/instructor"   element={<Navigate to="/instructor/dashboard" replace />} />

      {/* ── Admin (admin-only sidebar layout) ───────────── */}
      <Route path="/admin/dashboard"       element={<ALayout><AdminDashboard /></ALayout>} />
      <Route path="/admin/users"           element={<ALayout><UserManagement /></ALayout>} />
      <Route path="/admin/courses"         element={<ALayout><CourseManagement /></ALayout>} />
      <Route path="/admin/instructor-approvals" element={<ALayout><InstructorApprovals /></ALayout>} />
      <Route path="/admin/categories"      element={<ALayout><CategoryManagement /></ALayout>} />
      <Route path="/admin/payouts"         element={<ALayout><PayoutManagement /></ALayout>} />
      <Route path="/admin/revenue"         element={<ALayout><RevenueReport /></ALayout>} />
      <Route path="/admin/settings"        element={<ALayout><PlatformSettings /></ALayout>} />
      <Route path="/admin/email-templates" element={<ALayout><EmailTemplates /></ALayout>} />
      <Route path="/admin/logs"            element={<ALayout><ActivityLogs /></ALayout>} />
      <Route path="/admin"                 element={<Navigate to="/admin/dashboard" replace />} />

      {/* ── 404 ─────────────────────────────────────────── */}
      <Route path="*" element={<MainLayout><NotFound /></MainLayout>} />
    </Routes>
  );
}
