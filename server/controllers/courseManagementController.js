const asyncHandler = require('express-async-handler');
const Course = require('../models/Course');
const Category = require('../models/Category');

// ─── CREATE COURSE ───
const createCourse = asyncHandler(async (req, res) => {
    const { title, subtitle, categoryName, level, language, price, discountPrice, isFree } = req.body;

    const course = await Course.create({
        title: title || 'Untitled Course',
        subtitle,
        instructor: req.user._id,
        categoryName,
        level: level || 'beginner',
        language: language || 'English',
        price: isFree ? 0 : (price || 0),
        discountPrice: isFree ? 0 : (discountPrice || 0),
        isFree: !!isFree,
        status: 'draft',
        curriculum: [],
    });

    res.status(201).json({ success: true, course });
});

// ─── UPDATE COURSE ───
const updateCourse = asyncHandler(async (req, res) => {
    const course = await Course.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!course) { res.status(404); throw new Error('Course not found'); }

    const allowed = ['title', 'subtitle', 'description', 'categoryName', 'level', 'language',
        'price', 'discountPrice', 'isFree', 'thumbnail', 'previewVideo',
        'whatYouWillLearn', 'requirements', 'targetAudience', 'tags', 'status'];

    allowed.forEach((field) => {
        if (req.body[field] !== undefined) course[field] = req.body[field];
    });

    // Handle curriculum separately — strip client-generated numeric _ids
    if (req.body.curriculum !== undefined) {
        course.curriculum = (req.body.curriculum || []).map((section) => {
            const sec = { ...section };
            // If _id looks like a timestamp (not a 24-char hex), remove it so Mongoose generates a real ObjectId
            if (sec._id && !/^[0-9a-fA-F]{24}$/.test(String(sec._id))) delete sec._id;
            if (Array.isArray(sec.lectures)) {
                sec.lectures = sec.lectures.map((lec) => {
                    const l = { ...lec };
                    if (l._id && !/^[0-9a-fA-F]{24}$/.test(String(l._id))) delete l._id;
                    return l;
                });
            }
            return sec;
        });
    }

    await course.save();
    res.json({ success: true, course });
});

// ─── PUBLISH COURSE ───
const publishCourse = asyncHandler(async (req, res) => {
    const course = await Course.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!course) { res.status(404); throw new Error('Course not found'); }

    // Validate required publish fields
    const errors = [];
    if (!course.title || course.title === 'Untitled Course') errors.push('Title is required');
    if (!course.description) errors.push('Description is required');
    if (!course.categoryName) errors.push('Category is required');
    if (!course.thumbnail) errors.push('Thumbnail image is required');
    const totalLectures = course.curriculum?.reduce((t, s) => t + (s.lectures?.length || 0), 0) || 0;
    if (totalLectures < 1) errors.push('At least one lecture is required');

    if (errors.length > 0) {
        res.status(400);
        throw new Error(`Cannot publish: ${errors.join(', ')}`);
    }

    course.status = 'pending';
    course.rejectionReason = ''; // clear any previous rejection
    await course.save();
    res.json({ success: true, message: 'Course submitted for review! An admin will approve and publish it.', course });
});

// ─── UNPUBLISH COURSE ───
const unpublishCourse = asyncHandler(async (req, res) => {
    const course = await Course.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!course) { res.status(404); throw new Error('Course not found'); }
    course.status = 'draft';
    await course.save();
    res.json({ success: true, message: 'Course unpublished (set to draft)' });
});

// ─── GET SINGLE COURSE (for editing) ───
const getCourseForEdit = asyncHandler(async (req, res) => {
    const course = await Course.findOne({ _id: req.params.id, instructor: req.user._id });
    if (!course) { res.status(404); throw new Error('Course not found or unauthorized'); }
    res.json({ success: true, course });
});

// ─── UPLOAD FILE ───
const uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded');
    }
    let fileUrl;
    if (req.file.mimetype.startsWith('image/')) {
        fileUrl = `/uploads/images/${req.file.filename}`;
    } else if (req.file.mimetype.startsWith('video/')) {
        fileUrl = `/uploads/videos/${req.file.filename}`;
    } else {
        fileUrl = `/uploads/documents/${req.file.filename}`;
    }
    res.json({ success: true, url: fileUrl, message: 'File uploaded successfully' });
});

module.exports = { createCourse, updateCourse, publishCourse, unpublishCourse, getCourseForEdit, uploadFile };
