const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        // Predefined login ID for Admin & Staff (e.g., ADMIN01, STAFF01)
        userId: {
            type: String,
            trim: true,
            uppercase: true,
            unique: true,
            sparse: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        phone: {
            type: String,
            trim: true,
            match: [/^\d{10}$/, "Phone number must be exactly 10 digits"]
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
            select: false
        },
        role: {
            type: String,
            enum: ["user", "staff", "admin"],
            default: "user"
        },
        // Complaint categories a staff member handles (only used when role is "staff")
        categories: {
            type: [String],
            default: []
        },
        // Email OTP password reset fields (never returned by default)
        resetOtpHash: {
            type: String,
            select: false
        },
        resetOtpExpires: {
            type: Date,
            select: false
        },
        resetOtpAttempts: {
            type: Number,
            default: 0,
            select: false
        }
    },
    { timestamps: true }
);

userSchema.index({ role: 1, categories: 1 });

module.exports = mongoose.model("User", userSchema);
