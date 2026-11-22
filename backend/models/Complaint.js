const mongoose = require("mongoose");
const CATEGORIES = require("../config/categories");

const gpsPhotoSchema = new mongoose.Schema(
    {
        data: { type: String, required: true },
        latitude: { type: Number, required: true, min: -90, max: 90 },
        longitude: { type: Number, required: true, min: -180, max: 180 },
        accuracy: { type: Number, default: null },
        capturedAt: { type: Date, default: Date.now }
    },
    { _id: false }
);

const complaintSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },
        category: {
            type: String,
            required: true,
            enum: CATEGORIES,
            trim: true
        },
        location: {
            type: String,
            trim: true,
            maxlength: 200,
            default: ""
        },
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000
        },
        status: {
            type: String,
            enum: ["Pending", "In Progress", "Resolved", "Failed", "Rejected"],
            default: "Pending"
        },
        // Staff member assigned by Admin to resolve this complaint
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        // Photo taken by the citizen, tagged with GPS coordinates
        photo: {
            type: gpsPhotoSchema,
            default: undefined
        },
        // Staff resolution & review (outcome Succeeded/Failed, answer to user, reason for admin, optional GPS site photo)
        review: {
            type: new mongoose.Schema(
                {
                    outcome: {
                        type: String,
                        enum: ["Succeeded", "Failed", "In Progress", ""],
                        default: ""
                    },
                    note: { type: String, trim: true, maxlength: 2000, default: "" },
                    reason: { type: String, trim: true, maxlength: 2000, default: "" },
                    photo: { type: gpsPhotoSchema, default: undefined },
                    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                    reviewerName: { type: String, default: "" },
                    reviewedAt: { type: Date, default: Date.now }
                },
                { _id: false }
            ),
            default: undefined
        }
    },
    { timestamps: true }
);

complaintSchema.index({ user: 1, createdAt: -1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ category: 1, assignedTo: 1, status: 1 });

module.exports = mongoose.model("Complaint", complaintSchema);
