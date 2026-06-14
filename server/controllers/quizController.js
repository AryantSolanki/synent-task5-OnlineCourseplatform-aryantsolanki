const asyncHandler = require('express-async-handler');
const Quiz       = require('../models/Quiz');
const Submission = require('../models/Submission');
const Enrollment = require('../models/Enrollment');
const Course     = require('../models/Course');

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */

/** Strip correct-answer data before sending to student */
function sanitizeQuizForStudent(quiz) {
    const q = quiz.toObject ? quiz.toObject() : { ...quiz };
    q.questions = q.questions.map(({ _id, text, type, options, points, order, explanation }) => ({
        _id,
        text,
        type,
        points,
        order,
        explanation, // shown AFTER grading
        // For MCQ remove isCorrect from options
        options: (options || []).map(({ _id, text }) => ({ _id, text })),
        // correctAnswer intentionally omitted
    }));
    return q;
}

/** Auto-grade a quiz submission */
function autoGrade(quiz, answers) {
    let totalPoints = 0;
    let earnedPoints = 0;
    const gradedAnswers = [];

    for (const question of quiz.questions) {
        const qid    = String(question._id);
        const answer = answers.find(a => String(a.questionId) === qid) || {};
        const pts    = question.points || 1;
        totalPoints += pts;

        let isCorrect   = false;
        let pointsEarned = 0;

        if (question.type === 'multiple-choice') {
            const correctIdx = question.options.findIndex(o => o.isCorrect);
            isCorrect   = answer.selectedOption !== undefined && answer.selectedOption === correctIdx;
            pointsEarned = isCorrect ? pts : 0;

        } else if (question.type === 'true-false') {
            const correct = (question.correctAnswer || '').toLowerCase().trim();
            const given   = (answer.textAnswer || '').toLowerCase().trim();
            isCorrect   = correct === given;
            pointsEarned = isCorrect ? pts : 0;

        } else if (question.type === 'short-answer') {
            const correct = (question.correctAnswer || '').toLowerCase().trim();
            const given   = (answer.textAnswer || '').toLowerCase().trim();
            isCorrect   = correct === given || given.includes(correct) || correct.includes(given);
            pointsEarned = isCorrect ? pts : 0;
        }

        earnedPoints += pointsEarned;
        gradedAnswers.push({
            questionId:   question._id,
            selectedOption: answer.selectedOption,
            textAnswer:   answer.textAnswer,
            isCorrect,
            pointsEarned,
        });
    }

    const percentage  = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed      = percentage >= (quiz.passingScore || 70);
    return { score: earnedPoints, maxScore: totalPoints, percentage, passed, gradedAnswers };
}

/* ═══════════════════════════════════════════════════════════
   INSTRUCTOR — Quiz CRUD
═══════════════════════════════════════════════════════════ */

// GET /api/instructor/courses/:courseId/quizzes
const getCourseQuizzes = asyncHandler(async (req, res) => {
    const course = await Course.findOne({ _id: req.params.courseId, instructor: req.user._id });
    if (!course) { res.status(404); throw new Error('Course not found or unauthorized'); }

    const quizzes = await Quiz.find({ course: req.params.courseId }).sort({ createdAt: -1 });

    const withCounts = await Promise.all(
        quizzes.map(async (q) => {
            const submissions = await Submission.countDocuments({ quiz: q._id });
            return { ...q.toObject(), submissionCount: submissions };
        })
    );

    res.json({ success: true, quizzes: withCounts });
});

// POST /api/instructor/courses/:courseId/quizzes
const createQuiz = asyncHandler(async (req, res) => {
    const course = await Course.findOne({ _id: req.params.courseId, instructor: req.user._id });
    if (!course) { res.status(404); throw new Error('Course not found or unauthorized'); }

    const { title, description, questions, timeLimit, passingScore, maxAttempts, isPublished, showAnswers, lectureId } = req.body;

    if (!title) { res.status(400); throw new Error('Title is required'); }
    if (!questions || !questions.length) { res.status(400); throw new Error('At least one question is required'); }

    const quiz = await Quiz.create({
        course:      req.params.courseId,
        instructor:  req.user._id,
        lecture:     lectureId || null,
        title,
        description: description || '',
        questions:   questions.map((q, i) => ({ ...q, order: q.order ?? i })),
        timeLimit:   timeLimit || 0,
        passingScore: passingScore ?? 70,
        maxAttempts:  maxAttempts ?? 3,
        isPublished:  isPublished !== undefined ? isPublished : true,
        showAnswers:  showAnswers !== undefined ? showAnswers : true,
    });

    res.status(201).json({ success: true, quiz });
});

// PUT /api/instructor/quizzes/:id
const updateQuiz = asyncHandler(async (req, res) => {
    const quiz = await Quiz.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!quiz) { res.status(404); throw new Error('Quiz not found'); }

    const allowed = ['title', 'description', 'questions', 'timeLimit', 'passingScore', 'maxAttempts', 'isPublished', 'showAnswers', 'lecture'];
    allowed.forEach(f => { if (req.body[f] !== undefined) quiz[f] = req.body[f]; });

    await quiz.save();
    res.json({ success: true, quiz });
});

// DELETE /api/instructor/quizzes/:id
const deleteQuiz = asyncHandler(async (req, res) => {
    const quiz = await Quiz.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!quiz) { res.status(404); throw new Error('Quiz not found'); }

    await Submission.deleteMany({ quiz: req.params.id });
    await Quiz.deleteOne({ _id: req.params.id });

    res.json({ success: true, message: 'Quiz deleted' });
});

// GET /api/instructor/quizzes/:id/submissions
const getQuizSubmissions = asyncHandler(async (req, res) => {
    const quiz = await Quiz.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!quiz) { res.status(404); throw new Error('Quiz not found'); }

    const submissions = await Submission.find({ quiz: req.params.id })
        .populate('student', 'name email profilePicture')
        .sort({ createdAt: -1 });

    res.json({ success: true, quiz: { title: quiz.title, passingScore: quiz.passingScore }, submissions });
});

/* ═══════════════════════════════════════════════════════════
   STUDENT — View + Submit quizzes
═══════════════════════════════════════════════════════════ */

// GET /api/courses/:courseId/quizzes
const getStudentQuizzes = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const enrollment = await Enrollment.findOne({ student: req.user._id, course: courseId });
    if (!enrollment) { res.status(403); throw new Error('You must be enrolled to view quizzes'); }

    const quizzes = await Quiz.find({ course: courseId, isPublished: true }).sort({ createdAt: 1 });

    // Attach student's latest submission to each quiz
    const withSubmissions = await Promise.all(
        quizzes.map(async (q) => {
            const sub = await Submission.findOne({ student: req.user._id, quiz: q._id })
                .sort({ createdAt: -1 })
                .select('score maxScore percentage passed attemptNumber status answers gradedAt');

            // Count total attempts
            const attemptCount = await Submission.countDocuments({ student: req.user._id, quiz: q._id });

            return {
                ...sanitizeQuizForStudent(q),
                mySubmission:  sub || null,
                attemptCount,
                attemptsLeft:  Math.max(0, q.maxAttempts - attemptCount),
            };
        })
    );

    res.json({ success: true, quizzes: withSubmissions });
});

// POST /api/quizzes/:quizId/submit
const submitQuiz = asyncHandler(async (req, res) => {
    const { quizId } = req.params;
    const { answers = [] } = req.body; // [{ questionId, selectedOption?, textAnswer? }]

    const quiz = await Quiz.findById(quizId);
    if (!quiz || !quiz.isPublished) { res.status(404); throw new Error('Quiz not found'); }

    const enrollment = await Enrollment.findOne({ student: req.user._id, course: quiz.course });
    if (!enrollment) { res.status(403); throw new Error('You must be enrolled to submit'); }

    // Enforce attempt limit
    const attemptCount = await Submission.countDocuments({ student: req.user._id, quiz: quizId });
    if (attemptCount >= quiz.maxAttempts) {
        res.status(400);
        throw new Error(`Maximum attempts (${quiz.maxAttempts}) reached for this quiz`);
    }

    // Auto-grade
    const { score, maxScore, percentage, passed, gradedAnswers } = autoGrade(quiz, answers);

    const submission = await Submission.create({
        student:       req.user._id,
        course:        quiz.course,
        quiz:          quizId,
        type:          'quiz',
        answers:       gradedAnswers,
        score,
        maxScore,
        percentage,
        passed,
        status:        'graded',
        gradedAt:      new Date(),
        attemptNumber: attemptCount + 1,
    });

    // Build result with question breakdown (reveal answers if showAnswers true)
    const questionBreakdown = quiz.questions.map((q) => {
        const ans = gradedAnswers.find(a => String(a.questionId) === String(q._id)) || {};
        return {
            _id:            q._id,
            text:           q.text,
            type:           q.type,
            points:         q.points,
            pointsEarned:   ans.pointsEarned ?? 0,
            isCorrect:      ans.isCorrect ?? false,
            selectedOption: ans.selectedOption,
            textAnswer:     ans.textAnswer,
            explanation:    q.explanation || null,
            // Reveal correct answer if showAnswers is true
            ...(quiz.showAnswers && {
                correctAnswer:    q.correctAnswer,
                correctOptionIdx: q.type === 'multiple-choice' ? q.options.findIndex(o => o.isCorrect) : undefined,
                options:          q.options.map(o => ({ _id: o._id, text: o.text, isCorrect: o.isCorrect })),
            }),
        };
    });

    res.status(201).json({
        success: true,
        message: `Quiz submitted! You scored ${percentage}% — ${passed ? 'Passed 🎉' : 'Not passed — try again!'}`,
        submission,
        result: {
            score,
            maxScore,
            percentage,
            passed,
            passingScore: quiz.passingScore,
            attemptNumber: attemptCount + 1,
            attemptsLeft:  Math.max(0, quiz.maxAttempts - (attemptCount + 1)),
            showAnswers:   quiz.showAnswers,
            questionBreakdown,
        },
    });
});

// GET /api/quizzes/:quizId/my-result
const getMyQuizResult = asyncHandler(async (req, res) => {
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) { res.status(404); throw new Error('Quiz not found'); }

    const submission = await Submission.findOne({ student: req.user._id, quiz: quizId })
        .sort({ createdAt: -1 });

    const attemptCount = await Submission.countDocuments({ student: req.user._id, quiz: quizId });

    if (!submission) {
        return res.json({ success: true, submission: null, attemptCount });
    }

    // Build the question breakdown using stored answers
    const questionBreakdown = quiz.questions.map((q) => {
        const ans = submission.answers.find(a => String(a.questionId) === String(q._id)) || {};
        return {
            _id:            q._id,
            text:           q.text,
            type:           q.type,
            points:         q.points,
            pointsEarned:   ans.pointsEarned ?? 0,
            isCorrect:      ans.isCorrect ?? false,
            selectedOption: ans.selectedOption,
            textAnswer:     ans.textAnswer,
            explanation:    q.explanation || null,
            ...(quiz.showAnswers && {
                correctAnswer:    q.correctAnswer,
                correctOptionIdx: q.type === 'multiple-choice' ? q.options.findIndex(o => o.isCorrect) : undefined,
                options:          q.options.map(o => ({ _id: o._id, text: o.text, isCorrect: o.isCorrect })),
            }),
        };
    });

    res.json({
        success: true,
        attemptCount,
        attemptsLeft: Math.max(0, quiz.maxAttempts - attemptCount),
        submission,
        result: {
            score:         submission.score,
            maxScore:      submission.maxScore,
            percentage:    submission.percentage,
            passed:        submission.passed,
            passingScore:  quiz.passingScore,
            attemptNumber: submission.attemptNumber,
            attemptsLeft:  Math.max(0, quiz.maxAttempts - attemptCount),
            showAnswers:   quiz.showAnswers,
            questionBreakdown,
        },
    });
});

module.exports = {
    // Instructor
    getCourseQuizzes,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    getQuizSubmissions,
    // Student
    getStudentQuizzes,
    submitQuiz,
    getMyQuizResult,
};
