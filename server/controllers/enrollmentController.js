const asyncHandler = require('express-async-handler');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Progress = require('../models/Progress');

// ─── ENROLL IN COURSE ───
const enrollInCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course || course.status !== 'published') {
        res.status(404);
        throw new Error('Course not found');
    }

    // Check already enrolled
    const existing = await Enrollment.findOne({ student: req.user._id, course: courseId });
    if (existing) {
        return res.status(200).json({ success: true, message: 'Already enrolled', enrollment: existing });
    }

    const enrollment = await Enrollment.create({
        student: req.user._id,
        course: courseId,
        pricePaid: course.isFree ? 0 : (course.discountPrice || course.price),
    });

    // Increment student count
    await Course.findByIdAndUpdate(courseId, { $inc: { totalStudents: 1 } });

    res.status(201).json({ success: true, message: 'Enrolled successfully!', enrollment });
});

// ─── GET MY ENROLLMENTS ───
const getMyEnrollments = asyncHandler(async (req, res) => {
    const { status } = req.query;

    let query = { student: req.user._id };
    if (status === 'completed') query.completed = true;
    else if (status === 'in-progress') { query.completed = false; query.progress = { $gt: 0 }; }
    else if (status === 'not-started') { query.completed = false; query.progress = 0; }

    const enrollments = await Enrollment.find(query)
        .populate({
            path: 'course',
            select: 'title subtitle thumbnail avgRating totalLectures instructor categoryName level',
            populate: { path: 'instructor', select: 'name profilePicture' },
        })
        .sort({ lastAccessedAt: -1 });

    res.json({ success: true, enrollments });
});

// ─── GET ENROLLMENT BY ID ───
const getEnrollmentById = asyncHandler(async (req, res) => {
    const enrollment = await Enrollment.findById(req.params.id)
        .populate('course')
        .populate('student', 'name email');

    if (!enrollment) {
        res.status(404);
        throw new Error('Enrollment not found');
    }

    if (enrollment.student._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized');
    }

    res.json({ success: true, enrollment });
});

// ─── UPDATE PROGRESS ───
const updateProgress = asyncHandler(async (req, res) => {
    const { courseId, lectureId, sectionId, watchTime, lastPosition } = req.body;

    // Upsert progress record
    const progress = await Progress.findOneAndUpdate(
        { student: req.user._id, course: courseId, lectureId },
        { sectionId, watchTime, lastPosition, lastWatchedAt: Date.now() },
        { upsert: true, new: true }
    );

    // Update lastAccessedAt on enrollment
    await Enrollment.findOneAndUpdate(
        { student: req.user._id, course: courseId },
        { lastAccessedAt: Date.now(), currentLectureId: lectureId }
    );

    res.json({ success: true, progress });
});

// ─── COMPLETE LECTURE ───
const completeLecture = asyncHandler(async (req, res) => {
    const { courseId, lectureId, sectionId } = req.body;

    // Mark lecture complete
    await Progress.findOneAndUpdate(
        { student: req.user._id, course: courseId, lectureId },
        { sectionId, completed: true, completedAt: Date.now() },
        { upsert: true, new: true }
    );

    // Recalculate overall enrollment progress
    const course = await Course.findById(courseId);
    const totalLectures = course.curriculum.reduce((t, s) => t + s.lectures.length, 0);
    const completedCount = await Progress.countDocuments({ student: req.user._id, course: courseId, completed: true });
    const progressPct = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;

    const enrollment = await Enrollment.findOneAndUpdate(
        { student: req.user._id, course: courseId },
        {
            progress: progressPct,
            completed: progressPct === 100,
            ...(progressPct === 100 && { completedAt: Date.now() }),
            lastAccessedAt: Date.now(),
        },
        { new: true }
    );

    res.json({ success: true, progress: progressPct, enrollment });
});

// ─── GET LECTURE PROGRESS ───
const getCourseProgress = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const progressRecords = await Progress.find({ student: req.user._id, course: courseId });
    const enrollment = await Enrollment.findOne({ student: req.user._id, course: courseId });

    res.json({ success: true, progressRecords, enrollment });
});

module.exports = { enrollInCourse, getMyEnrollments, getEnrollmentById, updateProgress, completeLecture, getCourseProgress };
