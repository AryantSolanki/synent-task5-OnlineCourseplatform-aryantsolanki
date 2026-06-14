const asyncHandler = require('express-async-handler');
const Assignment   = require('../models/Assignment');
const Submission   = require('../models/Submission');
const Enrollment   = require('../models/Enrollment');
const Course       = require('../models/Course');

/* ═══════════════════════════════════════════════════════════
   INSTRUCTOR — Assignment CRUD
═══════════════════════════════════════════════════════════ */

// POST /api/instructor/courses/:courseId/assignments
const createAssignment = asyncHandler(async (req, res) => {
    const course = await Course.findOne({ _id: req.params.courseId, instructor: req.user._id });
    if (!course) { res.status(404); throw new Error('Course not found or unauthorized'); }

    const {
        title, description, instructions,
        dueDate, maxScore, allowLateSubmission,
        submissionType, isPublished, expectedAnswer,
        lectureId,
    } = req.body;

    if (!title || !description) {
        res.status(400); throw new Error('Title and description are required');
    }

    const assignment = await Assignment.create({
        course: req.params.courseId,
        instructor: req.user._id,
        lecture: lectureId || null,
        title,
        description,
        instructions: instructions || '',
        dueDate: dueDate || null,
        maxScore: maxScore || 100,
        allowLateSubmission: !!allowLateSubmission,
        submissionType: submissionType || 'any',
        isPublished: isPublished !== undefined ? isPublished : true,
        // store expected answer for auto-grading (optional)
        expectedAnswer: expectedAnswer || '',
    });

    res.status(201).json({ success: true, assignment });
});

// GET /api/instructor/courses/:courseId/assignments
const getCourseAssignments = asyncHandler(async (req, res) => {
    const course = await Course.findOne({ _id: req.params.courseId, instructor: req.user._id });
    if (!course) { res.status(404); throw new Error('Course not found or unauthorized'); }

    const assignments = await Assignment.find({ course: req.params.courseId }).sort({ createdAt: -1 });

    // Attach submission counts
    const withCounts = await Promise.all(
        assignments.map(async (a) => {
            const total   = await Submission.countDocuments({ assignment: a._id });
            const graded  = await Submission.countDocuments({ assignment: a._id, status: 'graded' });
            return { ...a.toObject(), totalSubmissions: total, gradedSubmissions: graded };
        })
    );

    res.json({ success: true, assignments: withCounts });
});

// PUT /api/instructor/assignments/:id
const updateAssignment = asyncHandler(async (req, res) => {
    const assignment = await Assignment.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!assignment) { res.status(404); throw new Error('Assignment not found'); }

    const allowed = [
        'title', 'description', 'instructions', 'dueDate',
        'maxScore', 'allowLateSubmission', 'submissionType',
        'isPublished', 'expectedAnswer', 'lecture',
    ];
    allowed.forEach(f => { if (req.body[f] !== undefined) assignment[f] = req.body[f]; });

    await assignment.save();
    res.json({ success: true, assignment });
});

// DELETE /api/instructor/assignments/:id
const deleteAssignment = asyncHandler(async (req, res) => {
    const assignment = await Assignment.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!assignment) { res.status(404); throw new Error('Assignment not found'); }

    await Submission.deleteMany({ assignment: req.params.id });
    await Assignment.deleteOne({ _id: req.params.id });

    res.json({ success: true, message: 'Assignment deleted' });
});

/* ═══════════════════════════════════════════════════════════
   STUDENT — View assignments + Submit + Instant result
═══════════════════════════════════════════════════════════ */

// GET /api/courses/:courseId/assignments
// Returns published assignments for enrolled student
const getStudentAssignments = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    // Must be enrolled
    const enrollment = await Enrollment.findOne({ student: req.user._id, course: courseId });
    if (!enrollment) { res.status(403); throw new Error('You must be enrolled to view assignments'); }

    const assignments = await Assignment.find({
        course: courseId,
        isPublished: true,
    }).sort({ createdAt: 1 }).select('-expectedAnswer'); // hide expected answer from student

    // Attach student's own submission to each assignment
    const withSubmissions = await Promise.all(
        assignments.map(async (a) => {
            const submission = await Submission.findOne({
                student: req.user._id,
                assignment: a._id,
            }).select('status score percentage passed feedback textContent submissionUrl fileUrl createdAt gradedAt');

            return { ...a.toObject(), mySubmission: submission || null };
        })
    );

    res.json({ success: true, assignments: withSubmissions });
});

// POST /api/assignments/:assignmentId/submit
// Student submits + instant auto-grade if expectedAnswer set
const submitAssignment = asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;
    const { textContent, submissionUrl, fileUrl } = req.body;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment || !assignment.isPublished) {
        res.status(404); throw new Error('Assignment not found');
    }

    // Must be enrolled
    const enrollment = await Enrollment.findOne({ student: req.user._id, course: assignment.course });
    if (!enrollment) { res.status(403); throw new Error('You must be enrolled to submit'); }

    // Check due date
    let isLate = false;
    if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
        if (!assignment.allowLateSubmission) {
            res.status(400); throw new Error('Submission deadline has passed');
        }
        isLate = true;
    }

    // Check existing submission
    const existing = await Submission.findOne({ student: req.user._id, assignment: assignmentId });

    // ── AUTO-GRADE LOGIC ─────────────────────────────────────
    // If instructor set an expectedAnswer, compare with student's text answer
    let autoGradeResult = null;
    const hasExpectedAnswer = assignment.expectedAnswer && assignment.expectedAnswer.trim();

    if (hasExpectedAnswer && textContent) {
        const expected  = assignment.expectedAnswer.trim().toLowerCase();
        const submitted = textContent.trim().toLowerCase();

        // Exact or contains match
        const isCorrect = submitted === expected || submitted.includes(expected) || expected.includes(submitted);

        const score       = isCorrect ? assignment.maxScore : Math.round(assignment.maxScore * 0.4);
        const percentage  = Math.round((score / assignment.maxScore) * 100);
        const passed      = percentage >= 50;

        autoGradeResult = {
            score,
            maxScore: assignment.maxScore,
            percentage,
            passed,
            status: 'graded',
            feedback: isCorrect
                ? '✅ Correct! Your answer matches the expected solution.'
                : `❌ Partially correct. Expected answer: "${assignment.expectedAnswer}". You scored ${percentage}%.`,
            gradedAt: new Date(),
        };
    }

    let submission;
    if (existing) {
        // Update existing submission
        existing.textContent    = textContent    || existing.textContent;
        existing.submissionUrl  = submissionUrl  || existing.submissionUrl;
        existing.fileUrl        = fileUrl        || existing.fileUrl;
        existing.attemptNumber  += 1;
        existing.isLate         = isLate;
        existing.status         = autoGradeResult?.status || 'submitted';
        if (autoGradeResult) {
            existing.score      = autoGradeResult.score;
            existing.maxScore   = autoGradeResult.maxScore;
            existing.percentage = autoGradeResult.percentage;
            existing.passed     = autoGradeResult.passed;
            existing.feedback   = autoGradeResult.feedback;
            existing.gradedAt   = autoGradeResult.gradedAt;
        }
        submission = await existing.save();
    } else {
        submission = await Submission.create({
            student:       req.user._id,
            course:        assignment.course,
            assignment:    assignmentId,
            type:          'assignment',
            textContent,
            submissionUrl,
            fileUrl,
            isLate,
            attemptNumber: 1,
            maxScore:      assignment.maxScore,
            status:        autoGradeResult?.status || 'submitted',
            ...(autoGradeResult && {
                score:      autoGradeResult.score,
                percentage: autoGradeResult.percentage,
                passed:     autoGradeResult.passed,
                feedback:   autoGradeResult.feedback,
                gradedAt:   autoGradeResult.gradedAt,
            }),
        });
    }

    res.status(existing ? 200 : 201).json({
        success: true,
        message: autoGradeResult
            ? `Submitted & auto-graded! You scored ${autoGradeResult.percentage}%`
            : 'Assignment submitted successfully!',
        submission,
        autoGraded: !!autoGradeResult,
        result: autoGradeResult,
    });
});

// GET /api/assignments/:assignmentId/my-submission
const getMySubmission = asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;

    const submission = await Submission.findOne({
        student: req.user._id,
        assignment: assignmentId,
    });

    res.json({ success: true, submission: submission || null });
});

module.exports = {
    // Instructor
    createAssignment,
    getCourseAssignments,
    updateAssignment,
    deleteAssignment,
    // Student
    getStudentAssignments,
    submitAssignment,
    getMySubmission,
};
