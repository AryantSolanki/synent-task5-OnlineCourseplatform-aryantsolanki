const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { Revenue, Payout } = require('../models/Revenue');
const ActivityLog = require('../models/ActivityLog');
const jwt = require('jsonwebtoken');

// ─────────────────────────────────────────────────────────────
// Helper: Log Activity
// ─────────────────────────────────────────────────────────────
const logActivity = async (req, action, targetType, targetId, targetName, details = {}) => {
    try {
        await ActivityLog.create({
            admin: req.user._id,
            action,
            targetType,
            targetId,
            targetName,
            details,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || '',
        });
    } catch (err) {
        // Non-blocking - don't fail the request if logging fails
        console.error('Activity log error:', err.message);
    }
};

// ─────────────────────────────────────────────────────────────
// Dashboard Stats
// ─────────────────────────────────────────────────────────────
const getDashboardStats = asyncHandler(async (req, res) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
        totalUsers,
        totalCourses,
        totalEnrollments,
        publishedCourses,
        pendingInstructors,
        pendingCourses,
        newUsersThisMonth,
        newUsersLastMonth,
        enrollmentsThisMonth,
        enrollmentsLastMonth,
        revenueThisMonth,
        revenueLastMonth,
        totalRevenue,
        pendingPayouts,
        recentUsers,
        recentCourses,
        monthlyRevenue,
        usersByRole,
    ] = await Promise.all([
        User.countDocuments(),
        Course.countDocuments(),
        Enrollment.countDocuments(),
        Course.countDocuments({ status: 'published' }),
        User.countDocuments({ role: 'instructor', approvalStatus: 'pending' }),
        Course.countDocuments({ status: 'pending' }),

        User.countDocuments({ createdAt: { $gte: startOfMonth } }),
        User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),

        Enrollment.countDocuments({ createdAt: { $gte: startOfMonth } }),
        Enrollment.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),

        Revenue.aggregate([
            { $match: { createdAt: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: '$grossAmount' } } },
        ]),
        Revenue.aggregate([
            { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
            { $group: { _id: null, total: { $sum: '$grossAmount' } } },
        ]),
        Revenue.aggregate([{ $group: { _id: null, total: { $sum: '$grossAmount' } } }]),

        Payout.countDocuments({ status: 'pending' }),

        User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt profilePicture isActive'),
        Course.find().sort({ createdAt: -1 }).limit(5).select('title status instructor createdAt totalStudents').populate('instructor', 'name'),

        // Monthly revenue for last 6 months
        Revenue.aggregate([
            {
                $match: {
                    createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
                },
            },
            {
                $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    revenue: { $sum: '$grossAmount' },
                    enrollments: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),

        User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } },
        ]),
    ]);

    const formatChange = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    };

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    res.json({
        success: true,
        data: {
            stats: {
                totalUsers,
                totalCourses,
                totalEnrollments,
                publishedCourses,
                totalRevenue: totalRevenue[0]?.total || 0,
                pendingPayouts,
                pendingInstructors,
                pendingCourses,
                newUsersThisMonth,
                enrollmentsThisMonth,
                revenueThisMonth: revenueThisMonth[0]?.total || 0,
                changes: {
                    users: formatChange(newUsersThisMonth, newUsersLastMonth),
                    enrollments: formatChange(enrollmentsThisMonth, enrollmentsLastMonth),
                    revenue: formatChange(revenueThisMonth[0]?.total || 0, revenueLastMonth[0]?.total || 0),
                },
            },
            charts: {
                monthlyRevenue: monthlyRevenue.map(m => ({
                    month: `${months[m._id.month - 1]} ${m._id.year}`,
                    revenue: m.revenue,
                    enrollments: m.enrollments,
                })),
                usersByRole: usersByRole.reduce((acc, r) => { acc[r._id] = r.count; return acc; }, {}),
            },
            recent: { users: recentUsers, courses: recentCourses },
        },
    });
});

// ─────────────────────────────────────────────────────────────
// User Management
// ─────────────────────────────────────────────────────────────
const getAllUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search = '', role = '', status = '', sort = '-createdAt' } = req.query;

    const filter = {};
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
        ];
    }
    if (role) filter.role = role;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
        User.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(Number(limit))
            .select('-password -verificationToken -resetPasswordToken'),
        User.countDocuments(filter),
    ]);

    res.json({
        success: true,
        data: { users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
});

const getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password -verificationToken -resetPasswordToken');
    if (!user) { res.status(404); throw new Error('User not found'); }

    const [enrollmentCount, courseCount] = await Promise.all([
        Enrollment.countDocuments({ student: user._id }),
        Course.countDocuments({ instructor: user._id }),
    ]);

    res.json({ success: true, data: { user, enrollmentCount, courseCount } });
});

const updateUser = asyncHandler(async (req, res) => {
    const { name, role, isActive, bio } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404); throw new Error('User not found'); }

    const oldRole = user.role;
    const oldActive = user.isActive;

    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (bio !== undefined) user.bio = bio;
    await user.save();

    const changes = {};
    if (role !== undefined && role !== oldRole) changes.role = { from: oldRole, to: role };
    if (isActive !== undefined && isActive !== oldActive) changes.status = { from: oldActive ? 'active' : 'inactive', to: isActive ? 'active' : 'inactive' };

    await logActivity(req, 'USER_UPDATED', 'User', user._id, user.name, changes);

    res.json({ success: true, message: 'User updated successfully', data: { user } });
});

const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404); throw new Error('User not found'); }
    if (user._id.toString() === req.user._id.toString()) {
        res.status(400); throw new Error('You cannot delete your own account');
    }

    await logActivity(req, 'USER_DELETED', 'User', user._id, user.name, { email: user.email });
    await User.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'User deleted successfully' });
});

const impersonateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404); throw new Error('User not found'); }
    if (user.role === 'admin') { res.status(403); throw new Error('Cannot impersonate another admin'); }

    // Generate short-lived impersonation token (15 min)
    const impersonationToken = jwt.sign(
        { id: user._id, impersonatedBy: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );

    await logActivity(req, 'USER_IMPERSONATED', 'User', user._id, user.name, { adminId: req.user._id });

    res.json({
        success: true,
        message: `Impersonation token generated for ${user.name}`,
        data: { token: impersonationToken, user: { _id: user._id, name: user.name, email: user.email, role: user.role } },
    });
});

const bulkUpdateUsers = asyncHandler(async (req, res) => {
    const { userIds, action } = req.body;
    if (!userIds?.length) { res.status(400); throw new Error('No user IDs provided'); }

    let result;
    switch (action) {
        case 'activate':
            result = await User.updateMany({ _id: { $in: userIds } }, { isActive: true });
            break;
        case 'deactivate':
            result = await User.updateMany({ _id: { $in: userIds }, _id: { $ne: req.user._id } }, { isActive: false });
            break;
        case 'delete':
            result = await User.deleteMany({ _id: { $in: userIds }, _id: { $ne: req.user._id } });
            break;
        default:
            res.status(400); throw new Error('Invalid bulk action');
    }

    await logActivity(req, `BULK_USER_${action.toUpperCase()}`, 'User', null, null, { count: result.modifiedCount || result.deletedCount, userIds });

    res.json({ success: true, message: `Bulk ${action} completed`, data: { affected: result.modifiedCount || result.deletedCount } });
});

// ─────────────────────────────────────────────────────────────
// Course Management (Admin)
// ─────────────────────────────────────────────────────────────
const getAllCoursesAdmin = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search = '', status = '', category = '', sort = '-createdAt' } = req.query;
    const filter = {};
    if (search) filter.$or = [{ title: { $regex: search, $options: 'i' } }];
    if (status) filter.status = status;
    if (category) filter.category = category;

    const skip = (Number(page) - 1) * Number(limit);
    const [courses, total] = await Promise.all([
        Course.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(Number(limit))
            .populate('instructor', 'name email')
            .populate('category', 'name'),
        Course.countDocuments(filter),
    ]);

    res.json({
        success: true,
        data: { courses, total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
});

const updateCourseStatus = asyncHandler(async (req, res) => {
    const { status, reason, isFeatured } = req.body;

    const course = await Course.findById(req.params.id);
    if (!course) { res.status(404); throw new Error('Course not found'); }

    // Handle status change
    if (status !== undefined) {
        const validStatuses = ['draft', 'pending', 'published', 'archived'];
        if (!validStatuses.includes(status)) { res.status(400); throw new Error('Invalid status'); }
        const oldStatus = course.status;
        course.status = status;
        // Save rejection reason when rejecting (setting back to draft)
        if (status === 'archived' && reason) {
            course.rejectionReason = reason;
        } else if (status === 'published') {
            course.rejectionReason = '';
        }
        await logActivity(req, 'COURSE_STATUS_CHANGED', 'Course', course._id, course.title, { from: oldStatus, to: status, reason });
    }

    // Handle isFeatured toggle
    if (isFeatured !== undefined) {
        course.isFeatured = isFeatured;
        await logActivity(req, 'COURSE_FEATURED_TOGGLED', 'Course', course._id, course.title, { isFeatured });
    }

    await course.save();

    res.json({ success: true, message: 'Course updated successfully', data: { course } });
});

// ─────────────────────────────────────────────────────────────
// Payout Management
// ─────────────────────────────────────────────────────────────
const getPayouts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status = '', sort = '-createdAt' } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [payouts, total] = await Promise.all([
        Payout.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(Number(limit))
            .populate('instructor', 'name email profilePicture'),
        Payout.countDocuments(filter),
    ]);

    res.json({
        success: true,
        data: { payouts, total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
});

const updatePayoutStatus = asyncHandler(async (req, res) => {
    const { status, notes } = req.body;
    const validStatuses = ['processing', 'completed', 'rejected'];
    if (!validStatuses.includes(status)) { res.status(400); throw new Error('Invalid status'); }

    const payout = await Payout.findById(req.params.id).populate('instructor', 'name email');
    if (!payout) { res.status(404); throw new Error('Payout not found'); }

    const oldStatus = payout.status;
    payout.status = status;
    if (notes) payout.notes = notes;
    if (status === 'completed') payout.processedAt = new Date();
    await payout.save();

    // Mark associated revenues as paid
    if (status === 'completed' && payout.revenueIds?.length) {
        await Revenue.updateMany({ _id: { $in: payout.revenueIds } }, { status: 'paid', payoutId: payout._id });
    }

    await logActivity(req, 'PAYOUT_STATUS_CHANGED', 'Payout', payout._id, payout.instructor?.name, { from: oldStatus, to: status, amount: payout.amount });

    res.json({ success: true, message: `Payout ${status} successfully`, data: { payout } });
});

// ─────────────────────────────────────────────────────────────
// Revenue Reports
// ─────────────────────────────────────────────────────────────
const getRevenueReport = asyncHandler(async (req, res) => {
    const { from, to, groupBy = 'month' } = req.query;

    const matchStage = {};
    if (from || to) {
        matchStage.createdAt = {};
        if (from) matchStage.createdAt.$gte = new Date(from);
        if (to) matchStage.createdAt.$lte = new Date(to);
    }

    const groupStage = groupBy === 'day'
        ? { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } }
        : { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };

    const [overview, timeline, topCourses, topInstructors] = await Promise.all([
        Revenue.aggregate([
            { $match: matchStage },
            { $group: { _id: null, gross: { $sum: '$grossAmount' }, fees: { $sum: '$platformFee' }, instructorShare: { $sum: '$instructorShare' }, count: { $sum: 1 } } },
        ]),
        Revenue.aggregate([
            { $match: matchStage },
            { $group: { _id: groupStage, gross: { $sum: '$grossAmount' }, fees: { $sum: '$platformFee' }, count: { $sum: 1 } } },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        ]),
        Revenue.aggregate([
            { $match: matchStage },
            { $group: { _id: '$course', total: { $sum: '$grossAmount' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
            { $unwind: '$course' },
            { $project: { title: '$course.title', total: 1, count: 1 } },
        ]),
        Revenue.aggregate([
            { $match: matchStage },
            { $group: { _id: '$instructor', total: { $sum: '$instructorShare' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'instructor' } },
            { $unwind: '$instructor' },
            { $project: { name: '$instructor.name', email: '$instructor.email', total: 1, count: 1 } },
        ]),
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    res.json({
        success: true,
        data: {
            overview: overview[0] || { gross: 0, fees: 0, instructorShare: 0, count: 0 },
            timeline: timeline.map(t => ({
                label: groupBy === 'day'
                    ? `${t._id.day} ${months[t._id.month - 1]}`
                    : `${months[t._id.month - 1]} ${t._id.year}`,
                gross: t.gross,
                fees: t.fees,
                count: t.count,
            })),
            topCourses,
            topInstructors,
        },
    });
});

// ─────────────────────────────────────────────────────────────
// Activity Logs
// ─────────────────────────────────────────────────────────────
const getActivityLogs = asyncHandler(async (req, res) => {
    const { page = 1, limit = 30, action = '', targetType = '' } = req.query;
    const filter = {};
    if (action) filter.action = { $regex: action, $options: 'i' };
    if (targetType) filter.targetType = targetType;

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
        ActivityLog.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .populate('admin', 'name email profilePicture'),
        ActivityLog.countDocuments(filter),
    ]);

    res.json({
        success: true,
        data: { logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
});

// ─────────────────────────────────────────────────────────────
// Instructor Approval Management
// ─────────────────────────────────────────────────────────────
const getPendingInstructors = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const filter = { role: 'instructor', approvalStatus: 'pending' };

    const skip = (Number(page) - 1) * Number(limit);
    const [instructors, total] = await Promise.all([
        User.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .select('name email bio profilePicture createdAt approvalStatus approvalReason'),
        User.countDocuments(filter),
    ]);

    res.json({
        success: true,
        data: { instructors, total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
});

const approveInstructor = asyncHandler(async (req, res) => {
    const user = await User.findOne({ _id: req.params.id, role: 'instructor' });
    if (!user) { res.status(404); throw new Error('Instructor not found'); }

    user.approvalStatus = 'approved';
    user.approvalReason = '';
    await user.save();

    await logActivity(req, 'INSTRUCTOR_APPROVED', 'User', user._id, user.name, { email: user.email });

    res.json({ success: true, message: `${user.name}'s instructor account has been approved.`, data: { user } });
});

const rejectInstructor = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const user = await User.findOne({ _id: req.params.id, role: 'instructor' });
    if (!user) { res.status(404); throw new Error('Instructor not found'); }

    user.approvalStatus = 'rejected';
    user.approvalReason = reason || 'Application did not meet our requirements.';
    await user.save();

    await logActivity(req, 'INSTRUCTOR_REJECTED', 'User', user._id, user.name, { email: user.email, reason });

    res.json({ success: true, message: `${user.name}'s instructor application has been rejected.`, data: { user } });
});

module.exports = {
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
};
