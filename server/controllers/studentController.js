const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Progress = require('../models/Progress');

// ─── GET STUDENT DASHBOARD ───
const getDashboard = asyncHandler(async (req, res) => {
    const studentId = req.user._id;

    // Parallel queries for efficiency
    const [enrollments, totalCompleted, recentProgress] = await Promise.all([
        Enrollment.find({ student: studentId })
            .populate({ path: 'course', select: 'title thumbnail instructor totalLectures categoryName', populate: { path: 'instructor', select: 'name' } })
            .sort({ lastAccessedAt: -1 })
            .limit(10),
        Enrollment.countDocuments({ student: studentId, completed: true }),
        Progress.find({ student: studentId }).sort({ lastWatchedAt: -1 }).limit(5),
    ]);

    const totalEnrolled = enrollments.length;
    const inProgress = enrollments.filter((e) => e.progress > 0 && !e.completed).length;

    // Continue learning: last 3 accessed, not completed
    const continueLearning = enrollments.filter((e) => !e.completed).slice(0, 3);

    // Recommended: published courses not enrolled
    const enrolledCourseIds = enrollments.map((e) => e.course?._id).filter(Boolean);
    const recommended = await Course.find({
        status: 'published',
        _id: { $nin: enrolledCourseIds },
    })
        .populate('instructor', 'name profilePicture')
        .select('title thumbnail avgRating totalStudents price discountPrice isFree categoryName level isBestSeller')
        .sort({ avgRating: -1, totalStudents: -1 })
        .limit(6);

    res.json({
        success: true,
        stats: { totalEnrolled, totalCompleted, inProgress, certificatesEarned: totalCompleted },
        continueLearning,
        recentProgress,
        recommended,
        allEnrollments: enrollments,
    });
});

// ─── GET STUDENT PROFILE ───
const getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    const [totalEnrolled, totalCompleted] = await Promise.all([
        Enrollment.countDocuments({ student: req.user._id }),
        Enrollment.countDocuments({ student: req.user._id, completed: true }),
    ]);

    res.json({
        success: true,
        profile: {
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            role: user.role,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
        },
        stats: { totalEnrolled, totalCompleted, certificatesEarned: totalCompleted },
    });
});

// ─── UPDATE STUDENT PROFILE ───
const updateProfile = asyncHandler(async (req, res) => {
    const { name, bio, profilePicture } = req.body;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { ...(name && { name }), ...(bio !== undefined && { bio }), ...(profilePicture && { profilePicture }) },
        { new: true, runValidators: true }
    );

    res.json({ success: true, user: { _id: user._id, name: user.name, email: user.email, bio: user.bio, profilePicture: user.profilePicture } });
});

// ─── CONTINUE LEARNING ───
const getContinueLearning = asyncHandler(async (req, res) => {
    const enrollments = await Enrollment.find({ student: req.user._id, completed: false, progress: { $gt: 0 } })
        .populate({ path: 'course', select: 'title thumbnail totalLectures instructor', populate: { path: 'instructor', select: 'name' } })
        .sort({ lastAccessedAt: -1 })
        .limit(5);
    res.json({ success: true, enrollments });
});

module.exports = { getDashboard, getProfile, updateProfile, getContinueLearning };
