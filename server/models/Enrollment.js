const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
    {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
        progress: { type: Number, default: 0, min: 0, max: 100 }, // percentage
        completed: { type: Boolean, default: false },
        completedAt: { type: Date },
        currentSection: { type: Number, default: 0 },
        currentLecture: { type: Number, default: 0 },
        currentLectureId: { type: mongoose.Schema.Types.ObjectId },
        lastAccessedAt: { type: Date, default: Date.now },
        certificateIssued: { type: Boolean, default: false },
        certificateUrl: { type: String, default: '' },
        pricePaid: { type: Number, default: 0 },
        paymentId: { type: String, default: '' },
    },
    { timestamps: true }
);

// Compound index — one enrollment per student-course pair
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ student: 1, lastAccessedAt: -1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
