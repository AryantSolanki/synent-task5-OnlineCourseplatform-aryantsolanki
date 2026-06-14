const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    type: { type: String, enum: ['multiple-choice', 'true-false', 'short-answer'], default: 'multiple-choice' },
    options: [{ text: String, isCorrect: Boolean }],
    correctAnswer: { type: String }, // for true-false and short-answer
    explanation: { type: String },
    points: { type: Number, default: 1 },
    order: { type: Number, default: 0 },
});

const quizSchema = new mongoose.Schema({
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    lecture: { type: mongoose.Schema.Types.ObjectId },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    questions: [questionSchema],
    timeLimit: { type: Number, default: 0 }, // minutes, 0 = no limit
    passingScore: { type: Number, default: 70 }, // percentage
    maxAttempts: { type: Number, default: 3 },
    isPublished: { type: Boolean, default: false },
    showAnswers: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);
