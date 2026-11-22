const Complaint = require("../models/Complaint");

const OPEN = ["Pending", "In Progress"];

// When a staff member is demoted back to a regular user, return their open
// complaints to Admin's unassigned queue so Admin can assign another staff member.
async function syncAssignments(staff) {
    if (staff.role === "staff") return;

    await Complaint.updateMany(
        { assignedTo: staff._id, status: { $in: OPEN } },
        { assignedTo: null, status: "Pending" }
    );
}

module.exports = { syncAssignments, OPEN };
