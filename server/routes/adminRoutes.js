const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getDashboardStats,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    impersonateUser,
    bulkUpdateUsers,
    getAllCoursesAdmin,
    updateCourseStatus,
    getPendingInstructors,
    approveInstructor,
    rejectInstructor,
    getPayouts,
    updatePayoutStatus,
    getRevenueReport,
    getActivityLogs,
} = require('../controllers/adminController');
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { getSettings, updateSettings, getEmailTemplates, getEmailTemplate, updateEmailTemplate } = require('../controllers/settingsController');

// All routes require authentication + admin role
router.use(protect, authorize('admin'));

// ── Dashboard ────────────────────────────────────────────────
router.get('/dashboard/stats', getDashboardStats);

// ── User Management ──────────────────────────────────────────
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/impersonate', impersonateUser);
router.post('/users/bulk', bulkUpdateUsers);

// ── Course Management ────────────────────────────────────────
router.get('/courses', getAllCoursesAdmin);
router.put('/courses/:id/status', updateCourseStatus);

// ── Payout Management ────────────────────────────────────────
router.get('/payouts', getPayouts);
router.put('/payouts/:id', updatePayoutStatus);

// ── Revenue Reports ──────────────────────────────────────────
router.get('/revenue', getRevenueReport);

// ── Activity Logs ────────────────────────────────────────────
router.get('/activity-logs', getActivityLogs);

// ── Instructor Approval ──────────────────────────────────────
router.get('/instructors/pending',         getPendingInstructors);
router.put('/instructors/:id/approve',     approveInstructor);
router.put('/instructors/:id/reject',      rejectInstructor);

// ── Category Management ──────────────────────────────────────
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// ── Site Settings ────────────────────────────────────────────
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// ── Email Templates ──────────────────────────────────────────
router.get('/email-templates', getEmailTemplates);
router.get('/email-templates/:id', getEmailTemplate);
router.put('/email-templates/:id', updateEmailTemplate);

module.exports = router;
