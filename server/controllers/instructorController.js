const asyncHandler = require('express-async-handler');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { Revenue } = require('../models/Revenue');
const User = require('../models/User');

// ─── DASHBOARD ───
const getDashboard = asyncHandler(async (req, res) => {
    const instructorId = req.user._id;

    const [courses, revenueData, recentEnrollments] = await Promise.all([
        Course.find({ instructor: instructorId }).select('title totalStudents avgRating totalReviews status thumbnail'),
        Revenue.find({ instructor: instructorId }),
        Enrollment.find({ course: { $in: await Course.find({ instructor: instructorId }).distinct('_id') } })
            .populate('student', 'name email profilePicture')
            .populate('course', 'title thumbnail')
            .sort({ createdAt: -1 })
            .limit(8),
    ]);

    const totalStudents = courses.reduce((sum, c) => sum + (c.totalStudents || 0), 0);
    const totalRevenue = revenueData.reduce((sum, r) => sum + (r.instructorShare || 0), 0);
    const avgRating = courses.length > 0
        ? (courses.reduce((sum, c) => sum + (c.avgRating || 0), 0) / courses.filter(c => c.avgRating > 0).length || 0)
        : 0;

    // Monthly revenue for chart (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyRevenue = await Revenue.aggregate([
        { $match: { instructor: instructorId, createdAt: { $gte: sixMonthsAgo } } },
        {
            $group: {
                _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                total: { $sum: '$instructorShare' },
                count: { $sum: 1 },
            },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData = monthlyRevenue.map((m) => ({
        month: months[m._id.month - 1],
        revenue: Math.round(m.total),
        enrollments: m.count,
    }));

    const topCourses = [...courses].sort((a, b) => (b.totalStudents || 0) - (a.totalStudents || 0)).slice(0, 5);

    res.json({
        success: true,
        stats: {
            totalStudents,
            totalRevenue: Math.round(totalRevenue),
            totalCourses: courses.length,
            publishedCourses: courses.filter((c) => c.status === 'published').length,
            avgRating: Math.round(avgRating * 10) / 10,
        },
        chartData,
        recentEnrollments,
        topCourses,
    });
});

// ─── MY COURSES ───
const getMyCourses = asyncHandler(async (req, res) => {
    const { status } = req.query;
    const query = { instructor: req.user._id };
    if (status) query.status = status;

    const courses = await Course.find(query).sort({ createdAt: -1 });

    // Attach revenue per course
    const courseIds = courses.map((c) => c._id);
    const revenues = await Revenue.aggregate([
        { $match: { instructor: req.user._id, course: { $in: courseIds } } },
        { $group: { _id: '$course', total: { $sum: '$instructorShare' } } },
    ]);
    const revenueMap = {};
    revenues.forEach((r) => { revenueMap[r._id.toString()] = Math.round(r.total); });

    const result = courses.map((c) => ({
        ...c.toObject(),
        revenue: revenueMap[c._id.toString()] || 0,
    }));

    res.json({ success: true, courses: result });
});

// ─── DELETE COURSE ───
const deleteCourse = asyncHandler(async (req, res) => {
    const course = await Course.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!course) { res.status(404); throw new Error('Course not found'); }

    const enrollCount = await Enrollment.countDocuments({ course: req.params.id });
    if (enrollCount > 0 && course.status === 'published') {
        res.status(400);
        throw new Error('Cannot delete a published course with enrolled students. Unpublish it first.');
    }

    await Course.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: 'Course deleted' });
});

// ─── DUPLICATE COURSE ───
const duplicateCourse = asyncHandler(async (req, res) => {
    const original = await Course.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!original) { res.status(404); throw new Error('Course not found'); }

    const obj = original.toObject();
    delete obj._id;
    obj.title = `${obj.title} (Copy)`;
    obj.status = 'draft';
    obj.totalStudents = 0;
    obj.totalReviews = 0;
    obj.avgRating = 0;
    obj.isBestSeller = false;
    obj.createdAt = undefined;
    obj.updatedAt = undefined;

    const copy = await Course.create(obj);
    res.json({ success: true, course: copy });
});

// ─── ANALYTICS ───
const getAnalytics = asyncHandler(async (req, res) => {
    const instructorId = req.user._id;
    const days = parseInt(req.query.days) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const myCourseIds = await Course.find({ instructor: instructorId }).distinct('_id');

    const [enrollmentTrend, revenueByMonth] = await Promise.all([
        Enrollment.aggregate([
            { $match: { course: { $in: myCourseIds }, createdAt: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]),
        Revenue.aggregate([
            { $match: { instructor: instructorId, createdAt: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$instructorShare' } } },
            { $sort: { _id: 1 } },
        ]),
    ]);

    res.json({ success: true, enrollmentTrend, revenueByMonth });
});

// ─── COURSE STUDENTS ───
const getCourseStudents = asyncHandler(async (req, res) => {
    const course = await Course.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!course) { res.status(404); throw new Error('Course not found'); }

    const enrollments = await Enrollment.find({ course: req.params.id })
        .populate('student', 'name email profilePicture createdAt')
        .sort({ createdAt: -1 });

    res.json({ success: true, enrollments, totalStudents: enrollments.length });
});

// ─── SEND ANNOUNCEMENT ───
const sendAnnouncement = asyncHandler(async (req, res) => {
    const { title, message } = req.body;
    const course = await Course.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!course) { res.status(404); throw new Error('Course not found'); }

    // Store announcement in course (simplification — no separate model needed)
    if (!course.announcements) course.announcements = [];
    course.announcements.unshift({ title, message, createdAt: new Date(), instructor: req.user._id });
    await course.save();

    res.json({ success: true, message: 'Announcement sent!' });
});

// ─── COURSE ANALYTICS ───
const getCourseAnalytics = asyncHandler(async (req, res) => {
    const course = await Course.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!course) { res.status(404); throw new Error('Course not found'); }

    const enrollments = await Enrollment.find({ course: req.params.id });
    const completedCount = enrollments.filter((e) => e.completed).length;
    const avgProgress = enrollments.length > 0
        ? Math.round(enrollments.reduce((s, e) => s + (e.progress || 0), 0) / enrollments.length)
        : 0;

    const revenue = await Revenue.aggregate([
        { $match: { course: course._id } },
        { $group: { _id: null, total: { $sum: '$instructorShare' }, count: { $sum: 1 } } },
    ]);

    res.json({
        success: true,
        analytics: {
            totalStudents: enrollments.length,
            completedStudents: completedCount,
            completionRate: enrollments.length > 0 ? Math.round((completedCount / enrollments.length) * 100) : 0,
            avgProgress,
            revenue: revenue[0]?.total || 0,
        },
    });
});

module.exports = { getDashboard, getMyCourses, deleteCourse, duplicateCourse, getAnalytics, getCourseStudents, sendAnnouncement, getCourseAnalytics };
