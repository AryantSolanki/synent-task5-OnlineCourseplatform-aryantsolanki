const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    lecture: { type: mongoose.Schema.Types.ObjectId },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    instructions: { type: String },
    dueDate: { type: Date },
    maxScore: { type: Number, default: 100 },
    allowLateSubmission: { type: Boolean, default: false },
    submissionType: { type: String, enum: ['text', 'file', 'url', 'any'], default: 'any' },
    isPublished: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Assignment', assignmentSchema);
