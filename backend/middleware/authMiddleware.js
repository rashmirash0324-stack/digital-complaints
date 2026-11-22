
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Please log in to continue"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                message: "User no longer exists"
            });
        }

        req.user = {
            id: user._id.toString(),
            role: user.role,
            name: user.name,
            categories: user.categories || []
        };

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

// Admin-only access
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        return next();
    }

    return res.status(403).json({
        message: "Admin access required"
    });
};

// Staff-only access (resolving assigned complaints)
const staffOnly = (req, res, next) => {
    if (req.user && req.user.role === "staff") {
        return next();
    }

    return res.status(403).json({
        message: "Only assigned staff can resolve complaints"
    });
};

// Admin or staff access
const staffOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === "admin" || req.user.role === "staff")) {
        return next();
    }

    return res.status(403).json({
        message: "Staff access required"
    });
};

module.exports = { protect, adminOnly, staffOnly, staffOrAdmin };
