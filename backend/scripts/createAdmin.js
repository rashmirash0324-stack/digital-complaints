// Usage: npm run create-admin -- "Admin Name" admin@example.com StrongPassword
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

dotenv.config();

const User = require("../models/User");

async function run() {
    const [name, email, password, phone] = process.argv.slice(2);

    if (!name || !email || !password || password.length < 6) {
        console.log('Usage: npm run create-admin -- "Name" email password(min 6 chars) [phone(10 digits)]');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);

    const normalizedEmail = email.trim().toLowerCase();
    const hashed = await bcrypt.hash(password, 12);

    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
        existing.role = "admin";
        if (phone && /^\d{10}$/.test(phone)) existing.phone = phone;
        await existing.save();
        console.log(`Existing user ${normalizedEmail} is now an admin.`);
    } else {
        await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashed,
            phone: phone && /^\d{10}$/.test(phone) ? phone : undefined,
            role: "admin"
        });
        console.log(`Admin ${normalizedEmail} created.`);
    }

    await mongoose.disconnect();
}

run().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
