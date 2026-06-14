const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, unique: true },
        slug: { type: String, required: true, unique: true, lowercase: true },
        description: { type: String, default: '' },
        icon: { type: String, default: '📚' },
        image: { type: String, default: '' },
        parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
        courseCount: { type: Number, default: 0 },
        featured: { type: Boolean, default: false },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

categorySchema.index({ slug: 1 });
categorySchema.index({ featured: 1, order: 1 });

module.exports = mongoose.model('Category', categorySchema);
