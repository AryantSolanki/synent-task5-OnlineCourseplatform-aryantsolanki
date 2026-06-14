const asyncHandler = require('express-async-handler');
const Submission = require('../models/Submission');
const Course = require('../models/Course');

// ─── GET SUBMISSIONS ───
const getSubmissions = asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;
    const submissions = await Submission.find({ assignment: assignmentId })
        .populate('student', 'name email profilePicture')
        .sort({ createdAt: -1 });

    res.json({ success: true, count: submissions.length, submissions });
});

// ─── GRADE SUBMISSION ───
const gradeSubmission = asyncHandler(async (req, res) => {
    const { id } = req.params; // submission id
    const { score, feedback } = req.body;

    const submission = await Submission.findById(id).populate('assignment');
    if (!submission) { res.status(404); throw new Error('Submission not found'); }

    // Ensure instructor owns this course
    const course = await Course.findOne({ _id: submission.course, instructor: req.user._id });
    if (!course) { res.status(403); throw new Error('Not authorized to grade this submission'); }

    submission.score = parseFloat(score);
    submission.feedback = feedback;
    submission.status = 'graded';
    submission.gradedBy = req.user._id;
    submission.gradedAt = new Date();

    const maxScore = submission.assignment?.maxScore || 100;
    submission.percentage = Math.round((submission.score / maxScore) * 100);
    submission.passed = submission.percentage >= 50;

    await submission.save();

    res.json({ success: true, message: 'Submission graded successfully', submission });
});

module.exports = { getSubmissions, gradeSubmission };
