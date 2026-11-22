const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

const User = require("../models/User");
const CATEGORIES = require("../config/categories");
const { syncAssignments } = require("../utils/assignment");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.use(protect);

const cleanCategories = (input) => {
    if (!Array.isArray(input)) return null;
    const unique = [...new Set(input.map((c) => String(c).trim()))];
    return unique.every((c) => CATEGORIES.includes(c)) ? unique : null;
};

const safeUser = (u) => ({
    _id: u._id,
    userId: u.userId || null,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    categories: u.categories || [],
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
});

async function generateNextStaffId() {
    const staff = await User.find({ userId: /^STAFF\d+$/ }).select("userId").lean();
    let maxNum = 0;
    for (const s of staff) {
        const num = parseInt(String(s.userId).replace("STAFF", ""), 10);
        if (Number.isFinite(num) && num > maxNum) maxNum = num;
    }
    return `STAFF${String(maxNum + 1).padStart(2, "0")}`;
}

// Admin views all registered users & staff
router.get("/", adminOnly, async (req, res, next) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        next(error);
    }
});

// Admin lists staff (used to assign complaints)
router.get("/staff", adminOnly, async (req, res, next) => {
    try {
        const staff = await User.find({ role: "staff" })
            .select("userId name email phone categories")
            .sort({ userId: 1, name: 1 });
        res.json(staff);
    } catch (error) {
        next(error);
    }
});

// Admin creates a staff account with a predefined Staff User ID & password
router.post("/staff", adminOnly, async (req, res, next) => {
    try {
        const { userId, name, email, password, phone } = req.body;
        const categories = cleanCategories(req.body.categories);

        if (
            typeof name !== "string" || !name.trim() ||
            typeof email !== "string" || !email.trim() ||
            typeof password !== "string" || password.length < 6
        ) {
            return res.status(400).json({
                message: "Enter name, email and a password of at least 6 characters"
            });
        }

        if (typeof phone !== "string" || !/^\d{10}$/.test(phone.trim())) {
            return res.status(400).json({ message: "Enter a valid 10-digit phone number" });
        }

        if (!categories || categories.length === 0) {
            return res.status(400).json({ message: "Choose at least one category" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (await User.findOne({ email: normalizedEmail })) {
            return res.status(409).json({ message: "Email already registered" });
        }

        const cleanStaffId =
            typeof userId === "string" && userId.trim()
                ? userId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "")
                : await generateNextStaffId();

        if (cleanStaffId.length < 3) {
            return res.status(400).json({ message: "User ID must be at least 3 characters (e.g. STAFF04)" });
        }

        if (await User.findOne({ userId: cleanStaffId })) {
            return res.status(409).json({ message: `User ID ${cleanStaffId} is already in use` });
        }

        const staff = await User.create({
            userId: cleanStaffId,
            name: name.trim(),
            email: normalizedEmail,
            phone: phone.trim(),
            password: await bcrypt.hash(password, 12),
            role: "staff",
            categories
        });

        res.status(201).json({ message: `Staff ${cleanStaffId} created`, user: safeUser(staff) });
    } catch (error) {
        next(error);
    }
});

// Admin edits a staff member's categories / role (or converts a user to staff with a Staff ID)
router.put("/:id/role", adminOnly, async (req, res, next) => {
    try {
        const { role, userId } = req.body;

        if (!["user", "staff"].includes(role)) {
            return res.status(400).json({ message: "Role must be user or staff" });
        }

        const target = await User.findById(req.params.id);

        if (!target) {
            return res.status(404).json({ message: "User not found" });
        }

        if (target.role === "admin") {
            return res.status(400).json({ message: "Admin accounts cannot be changed here" });
        }

        if (role === "staff") {
            const categories = cleanCategories(req.body.categories);

            if (!categories || categories.length === 0) {
                return res.status(400).json({ message: "Choose at least one category" });
            }

            target.categories = categories;
            if (typeof userId === "string" && userId.trim()) {
                const normalizedId = userId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
                const conflict = await User.findOne({ userId: normalizedId, _id: { $ne: target._id } });
                if (conflict) {
                    return res.status(409).json({ message: `User ID ${normalizedId} is already in use` });
                }
                target.userId = normalizedId;
            } else if (!target.userId) {
                target.userId = await generateNextStaffId();
            }
        } else {
            target.categories = [];
        }

        target.role = role;
        await target.save();

        await syncAssignments(target);

        res.json({ message: "Staff account updated", user: safeUser(target) });
    } catch (error) {
        next(error);
    }
});

// Admin deletes a staff member (returns open complaints to Admin's Pending queue)
router.delete("/staff/:id", adminOnly, async (req, res, next) => {
    try {
        const target = await User.findById(req.params.id);
        if (!target) {
            return res.status(404).json({ message: "Staff account not found" });
        }
        if (target.role !== "staff") {
            return res.status(400).json({ message: "Only staff accounts can be removed here" });
        }

        target.role = "user";
        await syncAssignments(target);
        await User.findByIdAndDelete(target._id);

        res.json({ message: `Staff ${target.userId || target.name} removed` });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
