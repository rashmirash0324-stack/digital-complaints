const Complaint = require("../models/Complaint");
const User = require("../models/User");
const CATEGORIES = require("../config/categories");

const STATUSES = ["Pending", "In Progress", "Resolved", "Failed", "Rejected"];
const OUTCOMES = ["Succeeded", "Failed", "In Progress"];

const isText = (value) => typeof value === "string" && value.trim().length > 0;

// Can this person view this complaint?
// Admin: all. Owner: own. Staff: assigned to them by admin.
const canView = (user, complaint) => {
    if (user.role === "admin") return true;

    const ownerId = complaint.user && (complaint.user._id || complaint.user).toString();
    if (ownerId === user.id) return true;

    if (user.role === "staff") {
        const assigned = complaint.assignedTo && (complaint.assignedTo._id || complaint.assignedTo).toString();
        return Boolean(assigned && assigned === user.id);
    }

    return false;
};

// Can this person resolve / update status on this complaint?
// Strictly the assigned staff member (Admin assigns staff and reviews outcomes, does not resolve).
const canManage = (user, complaint) => {
    if (user.role !== "staff") return false;

    const assigned = complaint.assignedTo && (complaint.assignedTo._id || complaint.assignedTo).toString();
    return Boolean(assigned && assigned === user.id);
};

const ASSIGNEE_FIELDS = "name email phone categories";

const withPhotoFlags = (c) => ({
    ...c,
    hasPhoto: !!c.photo,
    hasReviewPhoto: !!(c.review && c.review.photo)
});

const MAX_PHOTO_CHARS = 4 * 1024 * 1024; // ~3 MB image once base64-decoded

const parsePhoto = (input) => {
    if (!input || typeof input !== "object") {
        return { error: "Invalid photo" };
    }

    const { data, latitude, longitude, accuracy, capturedAt } = input;

    if (
        typeof data !== "string" ||
        !/^data:image\/(jpeg|png|webp);base64,/.test(data) ||
        data.length > MAX_PHOTO_CHARS
    ) {
        return { error: "Photo must be a JPEG, PNG or WebP image under 3 MB" };
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
        latitude === null || longitude === null ||
        latitude === undefined || longitude === undefined ||
        !Number.isFinite(lat) || !Number.isFinite(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180
    ) {
        return { error: "A photo needs valid GPS coordinates" };
    }

    const acc = Number(accuracy);
    const when = new Date(capturedAt);

    return {
        photo: {
            data,
            latitude: lat,
            longitude: lng,
            accuracy: Number.isFinite(acc) ? acc : null,
            capturedAt: isNaN(when.getTime()) ? new Date() : when
        }
    };
};

// Citizen submits a complaint -> lands in Admin's unassigned queue for staff assignment
exports.addComplaint = async (req, res, next) => {
    try {
        const { title, category, location, description, photo } = req.body;

        if (
            !isText(title) ||
            !isText(category) ||
            !isText(location) ||
            !isText(description)
        ) {
            return res.status(400).json({
                message: "Title, category, location and description are required"
            });
        }

        const cleanCategory = category.trim();
        if (!CATEGORIES.includes(cleanCategory)) {
            return res.status(400).json({
                message: "Choose a valid complaint category"
            });
        }

        const data = {
            user: req.user.id,
            title: title.trim(),
            category: cleanCategory,
            location: location.trim(),
            description: description.trim(),
            status: "Pending",
            assignedTo: null
        };

        if (photo) {
            const parsed = parsePhoto(photo);
            if (parsed.error) {
                return res.status(400).json({ message: parsed.error });
            }
            data.photo = parsed.photo;
        }

        const complaint = await Complaint.create(data);

        res.status(201).json({
            message: "Complaint submitted to admin for staff assignment",
            complaint: { ...complaint.toObject(), photo: undefined, hasPhoto: !!complaint.photo }
        });
    } catch (error) {
        next(error);
    }
};

// Admin gets all complaints; Staff gets complaints assigned to them; Citizen gets their own
exports.getComplaints = async (req, res, next) => {
    try {
        let filter;

        if (req.user.role === "admin") {
            filter = {};
        } else if (req.user.role === "staff") {
            filter = { assignedTo: req.user.id };
        } else {
            filter = { user: req.user.id };
        }

        const complaints = await Complaint.find(filter)
            .select("-photo.data -review.photo.data")
            .populate("user", "name email phone")
            .populate("assignedTo", ASSIGNEE_FIELDS)
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json(complaints.map(withPhotoFlags));
    } catch (error) {
        next(error);
    }
};

// Get one complaint by full 24-char ID OR 6-char short ID (e.g. C8CB65 / #C8CB65)
exports.getComplaintById = async (req, res, next) => {
    try {
        const raw = String(req.params.id || "").trim().replace(/^#/, "");
        let targetId = null;

        if (/^[a-fA-F0-9]{24}$/.test(raw)) {
            targetId = raw;
        } else if (/^[a-fA-F0-9]{6}$/.test(raw)) {
            const scopeFilter =
                req.user.role === "admin"
                    ? {}
                    : req.user.role === "staff"
                    ? { assignedTo: req.user.id }
                    : { user: req.user.id };

            const candidates = await Complaint.find(scopeFilter)
                .select("_id")
                .sort({ createdAt: -1 })
                .lean();

            const suffix = raw.toLowerCase();
            const match = candidates.find((c) =>
                c._id.toString().toLowerCase().endsWith(suffix)
            );
            if (match) targetId = match._id;
        } else {
            return res.status(400).json({
                message: "Enter a 6-character short ID (e.g. #C8CB65) or full 24-character ID"
            });
        }

        if (!targetId) {
            return res.status(404).json({
                message: "Complaint not found"
            });
        }

        const complaint = await Complaint.findById(targetId)
            .select("-photo.data -review.photo.data")
            .populate("user", "name email phone")
            .populate("assignedTo", ASSIGNEE_FIELDS)
            .lean();

        if (!complaint) {
            return res.status(404).json({
                message: "Complaint not found"
            });
        }

        if (!canView(req.user, complaint)) {
            return res.status(403).json({
                message: "You do not have access to this complaint"
            });
        }

        res.status(200).json(withPhotoFlags(complaint));
    } catch (error) {
        next(error);
    }
};

// Update complaint status (admin, or assigned staff)
exports.updateComplaint = async (req, res, next) => {
    try {
        const { status } = req.body;

        if (!STATUSES.includes(status)) {
            return res.status(400).json({
                message: "Invalid complaint status"
            });
        }

        const existing = await Complaint.findById(req.params.id).select("category assignedTo user");

        if (!existing) {
            return res.status(404).json({
                message: "Complaint not found"
            });
        }

        if (!canManage(req.user, existing)) {
            return res.status(403).json({
                message: "This complaint is not assigned to you"
            });
        }

        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        )
            .select("-photo.data -review.photo.data")
            .populate("user", "name email phone")
            .populate("assignedTo", ASSIGNEE_FIELDS)
            .lean();

        res.status(200).json({
            message: "Complaint status updated successfully",
            complaint: withPhotoFlags(complaint)
        });
    } catch (error) {
        next(error);
    }
};

// Admin assigns (or unassigns) a complaint to a staff member
exports.assignComplaint = async (req, res, next) => {
    try {
        const { staffId } = req.body;

        if (staffId) {
            const staff = await User.findById(staffId).select("role");

            if (!staff || staff.role !== "staff") {
                return res.status(400).json({ message: "Choose a valid staff member" });
            }
        }

        const existing = await Complaint.findById(req.params.id).select("status");
        if (!existing) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        const update = { assignedTo: staffId || null };
        if (staffId && existing.status === "Pending") {
            update.status = "In Progress";
        } else if (!staffId && existing.status === "In Progress") {
            update.status = "Pending";
        }

        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true }
        )
            .select("-photo.data -review.photo.data")
            .populate("user", "name email phone")
            .populate("assignedTo", ASSIGNEE_FIELDS)
            .lean();

        res.status(200).json({
            message: staffId ? "Complaint assigned to staff" : "Complaint unassigned",
            complaint: withPhotoFlags(complaint)
        });
    } catch (error) {
        next(error);
    }
};

// Delete a complaint (admin)
exports.deleteComplaint = async (req, res, next) => {
    try {
        const complaint = await Complaint.findByIdAndDelete(req.params.id);

        if (!complaint) {
            return res.status(404).json({
                message: "Complaint not found"
            });
        }

        res.status(200).json({
            message: "Complaint deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

// Staff resolution & reply: marks Succeeded or Failed, sends resolution answer to user, and logs reason for Admin
exports.reviewComplaint = async (req, res, next) => {
    try {
        const { outcome, note, reason, photo, status } = req.body;

        if (outcome !== undefined && outcome !== "" && !OUTCOMES.includes(outcome)) {
            return res.status(400).json({ message: "Outcome must be Succeeded, Failed, or In Progress" });
        }

        if (note !== undefined && typeof note !== "string") {
            return res.status(400).json({ message: "Invalid resolution answer" });
        }

        if (reason !== undefined && typeof reason !== "string") {
            return res.status(400).json({ message: "Invalid resolution reason" });
        }

        if (typeof note === "string" && note.length > 2000) {
            return res.status(400).json({ message: "Resolution answer is too long (max 2000 characters)" });
        }

        if (typeof reason === "string" && reason.length > 2000) {
            return res.status(400).json({ message: "Reason is too long (max 2000 characters)" });
        }

        if (status !== undefined && !STATUSES.includes(status)) {
            return res.status(400).json({ message: "Invalid complaint status" });
        }

        const cleanOutcome = typeof outcome === "string" ? outcome.trim() : "";
        const cleanNote = typeof note === "string" ? note.trim() : "";
        const cleanReason = typeof reason === "string" ? reason.trim() : "";
        let parsedPhoto;

        if (photo) {
            const parsed = parsePhoto(photo);
            if (parsed.error) {
                return res.status(400).json({ message: parsed.error });
            }
            parsedPhoto = parsed.photo;
        }

        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        if (!canManage(req.user, complaint)) {
            return res.status(403).json({ message: "This complaint is not assigned to you" });
        }

        if (cleanOutcome === "Succeeded" && !cleanNote) {
            return res.status(400).json({
                message: "Enter the resolution answer to send to the user"
            });
        }

        if (cleanOutcome === "Failed" && !cleanReason) {
            return res.status(400).json({
                message: "Provide an appropriate reason why the resolution failed"
            });
        }

        const existingPhoto = complaint.review && complaint.review.photo;
        if (!cleanNote && !cleanReason && !parsedPhoto && !existingPhoto) {
            return res.status(400).json({
                message: "Add a resolution answer, reason, or GPS photo to save"
            });
        }

        const finalAnswer = cleanNote || cleanReason;
        const finalReason = cleanReason || cleanNote;

        complaint.review = {
            outcome: cleanOutcome || (complaint.review && complaint.review.outcome) || "",
            note: finalAnswer,
            reason: finalReason,
            photo: parsedPhoto || existingPhoto || undefined,
            reviewedBy: req.user.id,
            reviewerName: req.user.name,
            reviewedAt: new Date()
        };

        if (cleanOutcome === "Succeeded") {
            complaint.status = "Resolved";
        } else if (cleanOutcome === "Failed") {
            complaint.status = "Failed";
        } else if (cleanOutcome === "In Progress") {
            complaint.status = "In Progress";
        } else if (status) {
            complaint.status = status;
        }

        await complaint.save();

        const saved = await Complaint.findById(complaint._id)
            .select("-photo.data -review.photo.data")
            .populate("user", "name email phone")
            .populate("assignedTo", ASSIGNEE_FIELDS)
            .lean();

        res.status(200).json({
            message:
                cleanOutcome === "Succeeded"
                    ? "Resolution marked as Succeeded and sent to user"
                    : cleanOutcome === "Failed"
                    ? "Resolution marked as Failed with reason logged for admin"
                    : "Review saved",
            complaint: withPhotoFlags(saved)
        });
    } catch (error) {
        next(error);
    }
};

// Get a complaint photo as JSON payload (owner, assigned staff, or admin). kind: "photo" | "review"
exports.getComplaintPhoto = async (req, res, next) => {
    try {
        const isReview = req.params.kind === "review";
        const projection = isReview
            ? "user assignedTo category review.photo"
            : "user assignedTo category photo";

        const complaint = await Complaint.findById(req.params.id).select(projection).lean();

        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        if (!canView(req.user, complaint)) {
            return res.status(403).json({
                message: "You do not have access to this complaint"
            });
        }

        const photo = isReview
            ? complaint.review && complaint.review.photo
            : complaint.photo;

        if (!photo) {
            return res.status(404).json({ message: "No photo found" });
        }

        res.status(200).json({
            data: photo.data,
            latitude: photo.latitude,
            longitude: photo.longitude,
            accuracy: photo.accuracy,
            capturedAt: photo.capturedAt
        });
    } catch (error) {
        next(error);
    }
};
