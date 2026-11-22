
const express = require("express");
const router = express.Router();

const Feedback = require("../models/Feedback");
const {
    protect,
    adminOnly
} = require("../middleware/authMiddleware");

router.use(protect);

// Submit feedback
router.post("/", async (req, res, next) => {
    try {
        const { message, rating } = req.body;

        if (
            typeof message !== "string" ||
            !message.trim() ||
            message.length > 2000 ||
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5
        ) {
            return res.status(400).json({
                message: "Enter feedback and a rating from 1 to 5"
            });
        }

        const feedback = await Feedback.create({
            user: req.user.id,
            message: message.trim(),
            rating
        });

        res.status(201).json({
            message: "Feedback submitted successfully",
            feedback
        });
    } catch (error) {
        next(error);
    }
});

// Admin views all feedback
router.get("/", adminOnly, async (req, res, next) => {
    try {
        const feedback = await Feedback.find()
            .populate("user", "name email")
            .sort({ createdAt: -1 });

        res.json(feedback);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
