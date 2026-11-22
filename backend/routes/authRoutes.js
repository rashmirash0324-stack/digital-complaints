const express = require("express");
const router = express.Router();

const User = require("../models/User");
const {
    register,
    login,
    sendResetOtp,
    verifyOtpAndResetPassword
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password/send-otp", sendResetOtp);
router.post("/forgot-password/verify-reset", verifyOtpAndResetPassword);

// Current logged-in user (used by Profile and session refresh)
router.get("/me", protect, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            id: user._id,
            userId: user.userId || null,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            categories: user.categories || [],
            createdAt: user.createdAt
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
