// Usage: npm run seed-accounts
// Ensures predefined Admin & Staff accounts with User IDs exist in MongoDB.
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

dotenv.config();

const User = require("../models/User");

const PREDEFINED = [
    {
        userId: "ADMIN01",
        name: "System Admin",
        email: "admin@digital.com",
        phone: "9876543210",
        password: "Admin@123",
        role: "admin",
        categories: []
    },
    {
        userId: "STAFF01",
        name: "Water & Sanitation Officer",
        email: "staff1@digital.com",
        phone: "9876543211",
        password: "Staff@123",
        role: "staff",
        categories: ["Water", "Sanitation"]
    },
    {
        userId: "STAFF02",
        name: "Electricity & Road Officer",
        email: "staff2@digital.com",
        phone: "9876543212",
        password: "Staff@123",
        role: "staff",
        categories: ["Electricity", "Road"]
    },
    {
        userId: "STAFF03",
        name: "Public Services Officer",
        email: "staff3@digital.com",
        phone: "9876543213",
        password: "Staff@123",
        role: "staff",
        categories: ["Public Services", "Other"]
    }
];

async function run() {
    await mongoose.connect(process.env.MONGO_URI);

    for (const acc of PREDEFINED) {
        const existing = await User.findOne({
            $or: [{ userId: acc.userId }, { email: acc.email }]
        });

        if (existing) {
            existing.userId = acc.userId;
            existing.role = acc.role;
            existing.categories = acc.categories;
            if (!existing.phone) existing.phone = acc.phone;
            await existing.save();
            console.log(`Updated ${acc.role.toUpperCase()}: ${acc.userId} (${acc.email})`);
        } else {
            await User.create({
                ...acc,
                password: await bcrypt.hash(acc.password, 12)
            });
            console.log(`Created ${acc.role.toUpperCase()}: ${acc.userId} (${acc.email})`);
        }
    }

    await mongoose.disconnect();
}

run().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
