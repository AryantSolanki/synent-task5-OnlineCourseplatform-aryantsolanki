const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    type: { type: String, enum: ['assignment', 'quiz'], required: true },
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },

    // For assignments
    textContent: { type: String },
    fileUrl: { type: String },
    submissionUrl: { type: String },

    // For quizzes
    answers: [{
        questionId: mongoose.Schema.Types.ObjectId,
        selectedOption: Number,   // index for MCQ
        textAnswer:     String,   // for true-false / short-answer
        isCorrect:      Boolean,  // filled at auto-grade time
        pointsEarned:   { type: Number, default: 0 },
    }],

    // Grading
    score: { type: Number },
    maxScore: { type: Number },
    percentage: { type: Number },
    passed: { type: Boolean },
    feedback: { type: String },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gradedAt: { type: Date },
    status: { type: String, enum: ['submitted', 'graded', 'returned'], default: 'submitted' },

    isLate: { type: Boolean, default: false },
    attemptNumber: { type: Number, default: 1 },
}, { timestamps: true });

submissionSchema.index({ student: 1, assignment: 1 });
submissionSchema.index({ student: 1, quiz: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
