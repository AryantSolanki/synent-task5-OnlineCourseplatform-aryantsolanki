const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
    {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
        lectureId: { type: mongoose.Schema.Types.ObjectId, required: true },
        sectionId: { type: mongoose.Schema.Types.ObjectId, required: true },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date },
        watchTime: { type: Number, default: 0 }, // seconds watched
        lastPosition: { type: Number, default: 0 }, // seconds — resume from here
        lastWatchedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

progressSchema.index({ student: 1, course: 1, lectureId: 1 }, { unique: true });
progressSchema.index({ student: 1, course: 1 });

module.exports = mongoose.model('Progress', progressSchema);
