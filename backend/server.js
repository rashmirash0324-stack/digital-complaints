
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "8mb" }));

app.get("/", (req, res) => {
    res.send("Digital Complaint Management API is running");
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        db: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/users", userRoutes);

// Handle unknown routes
app.use((req, res) => {
    res.status(404).json({
        message: "API route not found"
    });
});

// Handle errors
app.use((err, req, res, next) => {
    console.error(err.message);

    if (err.name === "ValidationError") {
        return res.status(400).json({
            message: "Invalid data",
            error: err.message
        });
    }

    if (err.name === "CastError") {
        return res.status(400).json({
            message: "Invalid ID"
        });
    }

    if (err.code === 11000) {
        return res.status(409).json({
            message: "This email is already registered"
        });
    }

    res.status(500).json({
        message: "Internal server error"
    });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
            throw new Error("MONGO_URI and JWT_SECRET must be configured in .env");
        }

        await connectDB();

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();
