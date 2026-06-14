const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, trim: true, maxlength: [1000, 'Review cannot exceed 1000 characters'], default: '' },
        helpful: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        helpfulCount: { type: Number, default: 0 },
        isVerifiedPurchase: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// One review per student-course
reviewSchema.index({ student: 1, course: 1 }, { unique: true });
reviewSchema.index({ course: 1, rating: -1 });

module.exports = mongoose.model('Review', reviewSchema);
