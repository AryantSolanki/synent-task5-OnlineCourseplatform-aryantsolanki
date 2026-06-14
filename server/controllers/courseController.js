const asyncHandler = require('express-async-handler');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Review = require('../models/Review');
const Category = require('../models/Category');

// ─── GET ALL COURSES (with filter/sort/search/pagination) ───
const getAllCourses = asyncHandler(async (req, res) => {
    const {
        page = 1, limit = 12, category, level, minRating,
        minPrice, maxPrice, sort = '-createdAt', search, free,
    } = req.query;

    const query = { status: 'published' };

    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } },
        ];
    }
    if (category) query.categoryName = { $regex: category, $options: 'i' };
    if (level) query.level = level;
    if (minRating) query.avgRating = { $gte: parseFloat(minRating) };
    if (free === 'true') query.isFree = true;
    if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseFloat(minPrice);
        if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Course.countDocuments(query);

    const courses = await Course.find(query)
        .populate('instructor', 'name profilePicture')
        .select('-curriculum -description -requirements -whatYouWillLearn -targetAudience')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

    res.json({
        success: true,
        count: courses.length,
        total,
        pages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page),
        courses,
    });
});

// ─── GET SINGLE COURSE ───
const getCourseById = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id)
        .populate('instructor', 'name profilePicture bio')
        .populate('category', 'name slug');

    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    // Strip unpublished for non-instructor/non-admin
    if (course.status !== 'published') {
        const isOwner = req.user && (
            course.instructor._id.toString() === req.user._id.toString() ||
            req.user.role === 'admin'
        );
        if (!isOwner) {
            res.status(404);
            throw new Error('Course not found');
        }
    }

    // Check if requesting user is enrolled
    let isEnrolled = false;
    let enrollment = null;
    if (req.user) {
        enrollment = await Enrollment.findOne({ student: req.user._id, course: course._id });
        isEnrolled = !!enrollment;
    }

    // Protect non-preview lectures if not enrolled
    const courseObj = course.toObject();
    if (!isEnrolled && (!req.user || req.user.role === 'student')) {
        courseObj.curriculum = courseObj.curriculum.map((section) => ({
            ...section,
            lectures: section.lectures.map((lec) => ({
                ...lec,
                videoUrl: lec.isPreview ? lec.videoUrl : null,
            })),
        }));
    }

    res.json({ success: true, course: courseObj, isEnrolled, enrollment });
});

// ─── GET COURSE REVIEWS ───
const getCourseReviews = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find({ course: req.params.id })
        .populate('student', 'name profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await Review.countDocuments({ course: req.params.id });

    res.json({ success: true, reviews, total, pages: Math.ceil(total / parseInt(limit)) });
});

// ─── ADD REVIEW ───
const addReview = asyncHandler(async (req, res) => {
    const { rating, comment } = req.body;

    // Must be enrolled
    const enrollment = await Enrollment.findOne({ student: req.user._id, course: req.params.id });
    if (!enrollment) {
        res.status(403);
        throw new Error('You must be enrolled to review this course');
    }

    const existing = await Review.findOne({ student: req.user._id, course: req.params.id });
    if (existing) {
        res.status(400);
        throw new Error('You have already reviewed this course');
    }

    const review = await Review.create({
        student: req.user._id,
        course: req.params.id,
        rating,
        comment,
    });

    // Recalculate course avg rating
    const allReviews = await Review.find({ course: req.params.id });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await Course.findByIdAndUpdate(req.params.id, {
        avgRating: Math.round(avgRating * 10) / 10,
        totalReviews: allReviews.length,
    });

    await review.populate('student', 'name profilePicture');
    res.status(201).json({ success: true, review });
});

// ─── GET CATEGORIES ───
const getCategories = asyncHandler(async (req, res) => {
    const categories = await Category.find().sort({ order: 1, name: 1 });
    res.json({ success: true, categories });
});

// ─── SEED DEMO COURSES (dev only) ───
const seedCourses = asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
        res.status(403);
        throw new Error('Only available in development');
    }

    const count = await Course.countDocuments();
    if (count > 0) {
        return res.json({ success: true, message: `${count} courses already exist` });
    }

    const demoCategories = [
        { name: 'Web Development', slug: 'web-development', icon: '💻', featured: true, order: 1 },
        { name: 'Data Science', slug: 'data-science', icon: '📊', featured: true, order: 2 },
        { name: 'Mobile Development', slug: 'mobile-development', icon: '📱', featured: true, order: 3 },
        { name: 'UI/UX Design', slug: 'ui-ux-design', icon: '🎨', featured: true, order: 4 },
        { name: 'Business', slug: 'business', icon: '📈', featured: false, order: 5 },
        { name: 'AI & Machine Learning', slug: 'ai-ml', icon: '🤖', featured: true, order: 6 },
    ];

    await Category.insertMany(demoCategories);

    const instructor = req.user;
    const demoCourses = [
        {
            title: 'Complete Web Development Bootcamp 2024',
            subtitle: 'From HTML to full-stack with React, Node.js, MongoDB',
            description: 'Master web development from scratch. Build real projects, learn industry best practices.',
            instructor: instructor._id,
            categoryName: 'Web Development',
            level: 'beginner',
            price: 1999,
            discountPrice: 499,
            isFree: false,
            thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=600&q=80',
            avgRating: 4.8,
            totalStudents: 12547,
            totalReviews: 3241,
            isBestSeller: true,
            status: 'published',
            whatYouWillLearn: ['Build responsive websites', 'Master React & Node.js', 'Deploy to production', 'REST APIs'],
            requirements: ['Basic computer knowledge', 'No coding experience needed'],
            tags: ['web', 'html', 'css', 'javascript', 'react', 'nodejs'],
            curriculum: [
                {
                    title: 'Getting Started', order: 0,
                    lectures: [
                        { title: 'Course Introduction', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 300, isPreview: true, order: 0 },
                        { title: 'Setup Your Environment', videoUrl: '', duration: 600, isPreview: false, order: 1 },
                    ],
                },
                {
                    title: 'HTML Fundamentals', order: 1,
                    lectures: [
                        { title: 'What is HTML?', videoUrl: '', duration: 480, isPreview: false, order: 0 },
                        { title: 'HTML Elements & Tags', videoUrl: '', duration: 720, isPreview: false, order: 1 },
                        { title: 'Forms and Inputs', videoUrl: '', duration: 900, isPreview: false, order: 2 },
                    ],
                },
            ],
        },
        {
            title: 'Python for Data Science & Machine Learning',
            subtitle: 'Learn Python, Pandas, NumPy, Scikit-Learn and more',
            description: 'Comprehensive data science course covering Python fundamentals through advanced ML algorithms.',
            instructor: instructor._id,
            categoryName: 'Data Science',
            level: 'intermediate',
            price: 2499,
            discountPrice: 699,
            isFree: false,
            thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80',
            avgRating: 4.7,
            totalStudents: 8932,
            totalReviews: 2100,
            isBestSeller: true,
            status: 'published',
            whatYouWillLearn: ['Python programming', 'Data analysis with Pandas', 'Machine Learning basics', 'Data visualization'],
            requirements: ['Basic math knowledge', 'Any operating system'],
            tags: ['python', 'data science', 'machine learning', 'pandas', 'numpy'],
            curriculum: [
                {
                    title: 'Python Basics', order: 0,
                    lectures: [
                        { title: 'Introduction to Python', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 600, isPreview: true, order: 0 },
                        { title: 'Variables & Data Types', videoUrl: '', duration: 800, isPreview: false, order: 1 },
                    ],
                },
            ],
        },
        {
            title: 'React Native - Build Mobile Apps',
            subtitle: 'Create iOS and Android apps with React Native & Expo',
            description: 'Learn to build beautiful, performant mobile applications using React Native.',
            instructor: instructor._id,
            categoryName: 'Mobile Development',
            level: 'intermediate',
            price: 1799,
            discountPrice: 599,
            isFree: false,
            thumbnail: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&q=80',
            avgRating: 4.6,
            totalStudents: 5201,
            totalReviews: 1450,
            status: 'published',
            whatYouWillLearn: ['React Native fundamentals', 'Expo workflow', 'Navigation', 'REST API integration'],
            requirements: ['JavaScript basics', 'React knowledge helpful'],
            tags: ['react native', 'mobile', 'ios', 'android', 'expo'],
            curriculum: [{ title: 'Getting Started', order: 0, lectures: [{ title: 'Setup & Introduction', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 450, isPreview: true, order: 0 }] }],
        },
        {
            title: 'UI/UX Design Masterclass with Figma',
            subtitle: 'Design beautiful interfaces from scratch',
            description: 'Complete UI/UX design course covering design principles, Figma, prototyping, and user research.',
            instructor: instructor._id,
            categoryName: 'UI/UX Design',
            level: 'beginner',
            price: 1599,
            discountPrice: 449,
            isFree: false,
            thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&q=80',
            avgRating: 4.9,
            totalStudents: 7845,
            totalReviews: 2210,
            isBestSeller: true,
            status: 'published',
            whatYouWillLearn: ['UI design principles', 'Figma mastery', 'Prototyping', 'User research'],
            requirements: ['No prior design experience needed'],
            tags: ['ui', 'ux', 'figma', 'design', 'prototyping'],
            curriculum: [{ title: 'Design Fundamentals', order: 0, lectures: [{ title: 'What is UI/UX?', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 360, isPreview: true, order: 0 }] }],
        },
        {
            title: 'ChatGPT & Generative AI Complete Guide',
            subtitle: 'Prompt engineering, AI tools and automation',
            description: 'Master ChatGPT, Midjourney and AI automation tools to boost your productivity.',
            instructor: instructor._id,
            categoryName: 'AI & Machine Learning',
            level: 'beginner',
            price: 0,
            discountPrice: 0,
            isFree: true,
            thumbnail: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80',
            avgRating: 4.5,
            totalStudents: 21000,
            totalReviews: 5400,
            status: 'published',
            whatYouWillLearn: ['Prompt engineering', 'ChatGPT advanced techniques', 'AI image generation', 'Workflow automation'],
            requirements: ['No prior AI experience needed'],
            tags: ['chatgpt', 'ai', 'generative ai', 'prompt engineering'],
            curriculum: [{ title: 'AI Basics', order: 0, lectures: [{ title: 'Introduction to AI', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 420, isPreview: true, order: 0 }] }],
        },
        {
            title: 'Full Stack MERN Development',
            subtitle: 'MongoDB, Express, React, Node.js bootcamp',
            description: 'Build full-stack web applications from scratch using the popular MERN stack.',
            instructor: instructor._id,
            categoryName: 'Web Development',
            level: 'advanced',
            price: 2999,
            discountPrice: 799,
            isFree: false,
            thumbnail: 'https://images.unsplash.com/photo-1537432376769-00f5c2f4c8d2?w=600&q=80',
            avgRating: 4.8,
            totalStudents: 9876,
            totalReviews: 2876,
            status: 'published',
            whatYouWillLearn: ['MERN stack mastery', 'REST APIs', 'Authentication', 'Deployment'],
            requirements: ['JavaScript fundamentals', 'Basic React knowledge'],
            tags: ['mern', 'mongodb', 'express', 'react', 'nodejs', 'fullstack'],
            curriculum: [{ title: 'MERN Overview', order: 0, lectures: [{ title: 'Course Overview', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 540, isPreview: true, order: 0 }] }],
        },
    ];

    await Course.insertMany(demoCourses);
    res.json({ success: true, message: `Seeded ${demoCourses.length} demo courses and ${demoCategories.length} categories` });
});

module.exports = { getAllCourses, getCourseById, getCourseReviews, addReview, getCategories, seedCourses };
