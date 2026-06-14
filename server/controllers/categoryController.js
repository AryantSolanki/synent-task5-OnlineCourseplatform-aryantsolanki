const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');
const Course = require('../models/Course');
const ActivityLog = require('../models/ActivityLog');

const logActivity = async (req, action, targetId, targetName, details = {}) => {
    try {
        await ActivityLog.create({
            admin: req.user._id,
            action,
            targetType: 'Category',
            targetId,
            targetName,
            details,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || '',
        });
    } catch (err) {
        console.error('Activity log error:', err.message);
    }
};

// GET /api/admin/categories
const getCategories = asyncHandler(async (req, res) => {
    // Aggregate course counts dynamically instead of relying on the stale static field
    const [categories, courseCounts] = await Promise.all([
        Category.find().sort({ order: 1, name: 1 }).populate('parentCategory', 'name'),
        Course.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
        ]),
    ]);

    // Build a map: categoryId -> count
    const countMap = {};
    courseCounts.forEach(({ _id, count }) => {
        if (_id) countMap[_id.toString()] = count;
    });

    // Attach live count to each category
    const result = categories.map((cat) => {
        const obj = cat.toObject();
        obj.courseCount = countMap[cat._id.toString()] || 0;
        return obj;
    });

    res.json({ success: true, data: { categories: result } });
});

// POST /api/admin/categories
const createCategory = asyncHandler(async (req, res) => {
    const { name, description, icon, image, parentCategory, featured, order } = req.body;

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const exists = await Category.findOne({ slug });
    if (exists) { res.status(400); throw new Error('A category with this name already exists'); }

    const category = await Category.create({
        name, slug, description, icon, image,
        parentCategory: parentCategory || null,
        featured: featured || false,
        order: order || 0,
    });

    await logActivity(req, 'CATEGORY_CREATED', category._id, category.name);
    res.status(201).json({ success: true, message: 'Category created', data: { category } });
});

// PUT /api/admin/categories/:id
const updateCategory = asyncHandler(async (req, res) => {
    const { name, description, icon, image, parentCategory, featured, order } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) { res.status(404); throw new Error('Category not found'); }

    if (name && name !== category.name) {
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const exists = await Category.findOne({ slug, _id: { $ne: category._id } });
        if (exists) { res.status(400); throw new Error('A category with this name already exists'); }
        category.name = name;
        category.slug = slug;
    }

    if (description !== undefined) category.description = description;
    if (icon !== undefined) category.icon = icon;
    if (image !== undefined) category.image = image;
    if (parentCategory !== undefined) category.parentCategory = parentCategory || null;
    if (featured !== undefined) category.featured = featured;
    if (order !== undefined) category.order = order;

    await category.save();
    await logActivity(req, 'CATEGORY_UPDATED', category._id, category.name);

    res.json({ success: true, message: 'Category updated', data: { category } });
});

// DELETE /api/admin/categories/:id
const deleteCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) { res.status(404); throw new Error('Category not found'); }

    await logActivity(req, 'CATEGORY_DELETED', category._id, category.name);
    await Category.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Category deleted' });
});

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
