const asyncHandler = require('express-async-handler');
const { Revenue, Payout } = require('../models/Revenue');
const Course = require('../models/Course');

// ─── REVENUE SUMMARY ───
const getRevenueSummary = asyncHandler(async (req, res) => {
    const instructorId = req.user._id;

    const [revenues, payouts, revenueByMonth, revenueByCourse] = await Promise.all([
        Revenue.find({ instructor: instructorId }),
        Payout.find({ instructor: instructorId }).sort({ createdAt: -1 }),
        Revenue.aggregate([
            { $match: { instructor: instructorId } },
            {
                $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    total: { $sum: '$instructorShare' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            { $limit: 12 },
        ]),
        Revenue.aggregate([
            { $match: { instructor: instructorId } },
            { $group: { _id: '$course', total: { $sum: '$instructorShare' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'courseInfo' } },
            { $unwind: '$courseInfo' },
            { $project: { 'courseInfo.title': 1, 'courseInfo.thumbnail': 1, total: 1, count: 1 } },
        ]),
    ]);

    const totalEarned = revenues.reduce((s, r) => s + r.instructorShare, 0);
    const totalPaidOut = payouts.filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
    const available = totalEarned - totalPaidOut;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData = revenueByMonth.map((m) => ({
        month: `${months[m._id.month - 1]} ${m._id.year}`,
        revenue: Math.round(m.total),
        sales: m.count,
    }));

    res.json({
        success: true,
        summary: {
            totalEarned: Math.round(totalEarned),
            totalPaidOut: Math.round(totalPaidOut),
            available: Math.round(available),
            pendingPayout: payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0),
        },
        chartData,
        revenueByCourse,
        payouts,
    });
});

// ─── REQUEST PAYOUT ───
const requestPayout = asyncHandler(async (req, res) => {
    const { amount, method } = req.body;

    const revenues = await Revenue.find({ instructor: req.user._id, status: 'available' });
    const available = revenues.reduce((s, r) => s + r.instructorShare, 0);

    if (amount > available) {
        res.status(400);
        throw new Error(`Insufficient balance. Available: ₹${Math.round(available)}`);
    }

    if (amount < 100) {
        res.status(400);
        throw new Error('Minimum payout amount is ₹100');
    }

    const revenueIds = revenues.slice(0, Math.ceil(amount / 100)).map((r) => r._id);

    const payout = await Payout.create({
        instructor: req.user._id,
        amount,
        method: method || 'bank_transfer',
        status: 'pending',
        revenueIds,
    });

    res.status(201).json({ success: true, payout, message: 'Payout request submitted!' });
});

module.exports = { getRevenueSummary, requestPayout };
