const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    duration: { type: Number, default: 0 }, // seconds
    resources: [{ name: String, url: String, type: String }],
    isPreview: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
});

const sectionSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
    lectures: [lectureSchema],
});

const courseSchema = new mongoose.Schema(
    {
        title: { type: String, required: [true, 'Course title is required'], trim: true, maxlength: [120, 'Title cannot exceed 120 characters'] },
        subtitle: { type: String, trim: true, maxlength: [200, 'Subtitle cannot exceed 200 characters'], default: '' },
        description: { type: String, default: '' },
        instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
        categoryName: { type: String, default: '' },
        subcategory: { type: String, default: '' },
        level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'all-levels'], default: 'all-levels' },
        price: { type: Number, default: 0, min: 0 },
        discountPrice: { type: Number, default: 0, min: 0 },
        isFree: { type: Boolean, default: false },
        thumbnail: { type: String, default: '' },
        previewVideo: { type: String, default: '' },
        curriculum: [sectionSchema],
        requirements: [{ type: String }],
        whatYouWillLearn: [{ type: String }],
        targetAudience: [{ type: String }],
        language: { type: String, default: 'English' },
        totalStudents: { type: Number, default: 0 },
        totalLectures: { type: Number, default: 0 },
        totalDuration: { type: Number, default: 0 }, // seconds
        avgRating: { type: Number, default: 0, min: 0, max: 5 },
        totalReviews: { type: Number, default: 0 },
        status: { type: String, enum: ['draft', 'pending', 'published', 'archived'], default: 'draft' },
        isBestSeller: { type: Boolean, default: false },
        isFeatured: { type: Boolean, default: false },
        tags: [{ type: String }],
        rejectionReason: { type: String, default: '' },
    },
    { timestamps: true }
);

// Indexes
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });
courseSchema.index({ status: 1, avgRating: -1 });
courseSchema.index({ instructor: 1 });
courseSchema.index({ category: 1 });

// Virtual for total lectures count
courseSchema.virtual('lectureCount').get(function () {
    return this.curriculum.reduce((total, section) => total + section.lectures.length, 0);
});

module.exports = mongoose.model('Course', courseSchema);
