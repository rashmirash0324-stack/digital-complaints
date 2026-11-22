const crypto = require("crypto");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendOtpEmail } = require("../utils/mailer");

const createToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );
};

const formatUser = (user) => ({
    id: user._id,
    userId: user.userId || null,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    categories: user.categories || [],
    createdAt: user.createdAt
});

const isValidPhone = (phone) =>
    typeof phone === "string" && /^\d{10}$/.test(phone.trim());

const hashOtp = (otp) =>
    crypto.createHash("sha256").update(String(otp)).digest("hex");

const maskEmail = (email) => {
    const [local, domain] = String(email || "").split("@");
    if (!local || !domain) return email;
    const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
    return `${visible}${"*".repeat(Math.max(2, local.length - 2))}@${domain}`;
};

// Simple in-memory rate limiter for OTP requests (6 per 15 min per IP)
const otpAttempts = new Map();
const OTP_LIMIT = 6;
const OTP_WINDOW_MS = 15 * 60 * 1000;

const tooManyAttempts = (ip) => {
    const now = Date.now();
    if (otpAttempts.size > 500) {
        for (const [key, times] of otpAttempts.entries()) {
            const active = times.filter((t) => now - t < OTP_WINDOW_MS);
            if (active.length === 0) otpAttempts.delete(key);
            else otpAttempts.set(key, active);
        }
    }
    const recent = (otpAttempts.get(ip) || []).filter(
        (time) => now - time < OTP_WINDOW_MS
    );
    recent.push(now);
    otpAttempts.set(ip, recent);
    return recent.length > OTP_LIMIT;
};

// Find user by email OR predefined userId (case-insensitive)
const findByIdentifier = async (identifier, extraSelect = "") => {
    const raw = String(identifier || "").trim();
    if (!raw) return null;

    const query = raw.includes("@")
        ? { email: raw.toLowerCase() }
        : { $or: [{ userId: raw.toUpperCase() }, { email: raw.toLowerCase() }] };

    const q = User.findOne(query);
    return extraSelect ? q.select(extraSelect) : q;
};

// Citizen self-registration (always creates role: "user")
exports.register = async (req, res, next) => {
    try {
        const { name, email, password, phone } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            password.length < 6
        ) {
            return res.status(400).json({
                message: "Enter name, valid email and password of at least 6 characters"
            });
        }

        if (!isValidPhone(phone)) {
            return res.status(400).json({
                message: "Enter a valid 10-digit phone number"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            phone: phone.trim(),
            password: hashedPassword,
            role: "user"
        });

        const token = createToken(user);

        res.status(201).json({
            message: "Registration successful",
            token,
            user: formatUser(user)
        });
    } catch (error) {
        next(error);
    }
};

// Login: accepts Email (citizens/all) OR predefined User ID (admin/staff, e.g. ADMIN01, STAFF01)
exports.login = async (req, res, next) => {
    try {
        const identifier = req.body.identifier ?? req.body.email ?? req.body.userId;
        const { password } = req.body;

        if (
            typeof identifier !== "string" ||
            !identifier.trim() ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                message: "Email or User ID and password are required"
            });
        }

        const user = await findByIdentifier(identifier, "+password");

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const token = createToken(user);

        res.json({
            message: "Login successful",
            token,
            user: formatUser(user)
        });
    } catch (error) {
        next(error);
    }
};

// Step 1: Send 6-digit Email OTP (works for ALL 3 roles: user, staff, admin)
exports.sendResetOtp = async (req, res, next) => {
    try {
        if (tooManyAttempts(req.ip)) {
            return res.status(429).json({
                message: "Too many OTP requests. Please try again after 15 minutes"
            });
        }

        const identifier = req.body.identifier ?? req.body.email ?? req.body.userId;

        if (typeof identifier !== "string" || !identifier.trim()) {
            return res.status(400).json({
                message: "Enter your registered email or predefined User ID"
            });
        }

        const user = await findByIdentifier(identifier);

        if (!user || !user.email) {
            return res.status(404).json({
                message: "No account found with that email or User ID"
            });
        }

        const otp = String(crypto.randomInt(100000, 1000000));
        user.resetOtpHash = hashOtp(otp);
        user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
        user.resetOtpAttempts = 0;
        await user.save();

        const mailResult = await sendOtpEmail({
            to: user.email,
            name: user.name,
            otp
        });

        const response = {
            message: mailResult.delivered
                ? `Verification OTP sent to ${maskEmail(user.email)}`
                : `OTP generated for ${maskEmail(user.email)} (configure SMTP in backend/.env to send real emails)`,
            maskedEmail: maskEmail(user.email),
            deliveryMode: mailResult.mode
        };

        // In local dev without SMTP configured, expose devOtp so the full OTP flow can be tested immediately
        if (!mailResult.delivered) {
            response.devOtp = otp;
        }

        res.json(response);
    } catch (error) {
        next(error);
    }
};

// Step 2: Verify Email OTP & set new password (works for ALL 3 roles: user, staff, admin)
exports.verifyOtpAndResetPassword = async (req, res, next) => {
    try {
        const identifier = req.body.identifier ?? req.body.email ?? req.body.userId;
        const { otp, newPassword } = req.body;

        if (
            typeof identifier !== "string" ||
            !identifier.trim() ||
            typeof otp !== "string" ||
            !/^\d{6}$/.test(otp.trim()) ||
            typeof newPassword !== "string" ||
            newPassword.length < 6
        ) {
            return res.status(400).json({
                message: "Enter your email/User ID, 6-digit OTP, and a new password of at least 6 characters"
            });
        }

        const user = await findByIdentifier(
            identifier,
            "+resetOtpHash +resetOtpExpires +resetOtpAttempts"
        );

        if (!user || !user.resetOtpHash || !user.resetOtpExpires) {
            return res.status(400).json({
                message: "No active OTP found. Please request a new OTP"
            });
        }

        if (user.resetOtpExpires.getTime() < Date.now()) {
            user.resetOtpHash = undefined;
            user.resetOtpExpires = undefined;
            user.resetOtpAttempts = 0;
            await user.save();
            return res.status(400).json({
                message: "OTP has expired. Please request a new one"
            });
        }

        if ((user.resetOtpAttempts || 0) >= 5) {
            user.resetOtpHash = undefined;
            user.resetOtpExpires = undefined;
            user.resetOtpAttempts = 0;
            await user.save();
            return res.status(429).json({
                message: "Too many wrong OTP attempts. Please request a new OTP"
            });
        }

        if (hashOtp(otp.trim()) !== user.resetOtpHash) {
            user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
            await user.save();
            return res.status(400).json({
                message: "Invalid OTP. Please check the code and try again"
            });
        }

        user.password = await bcrypt.hash(newPassword, 12);
        user.resetOtpHash = undefined;
        user.resetOtpExpires = undefined;
        user.resetOtpAttempts = 0;
        await user.save();

        res.json({
            message: "Password reset successful. You can now log in with your new password"
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register: exports.register,
    login: exports.login,
    sendResetOtp: exports.sendResetOtp,
    verifyOtpAndResetPassword: exports.verifyOtpAndResetPassword
};
