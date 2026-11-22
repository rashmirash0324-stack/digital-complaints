const express = require("express");
const router = express.Router();

const {
    addComplaint,
    getComplaints,
    getComplaintById,
    updateComplaint,
    deleteComplaint,
    reviewComplaint,
    assignComplaint,
    getComplaintPhoto
} = require("../controllers/complaintController");

const {
    protect,
    adminOnly,
    staffOnly
} = require("../middleware/authMiddleware");

router.use(protect);

router.post("/", addComplaint);
router.get("/", getComplaints);
router.get("/:id", getComplaintById);

router.get("/:id/photo/:kind", getComplaintPhoto);
router.put("/:id/review", staffOnly, reviewComplaint);
router.put("/:id/assign", adminOnly, assignComplaint);
router.put("/:id", staffOnly, updateComplaint);
router.delete("/:id", adminOnly, deleteComplaint);

module.exports = router;
