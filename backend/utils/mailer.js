const nodemailer = require("nodemailer");

function isSmtpConfigured() {
    return Boolean(
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS
    );
}

async function sendOtpEmail({ to, name, otp }) {
    if (!isSmtpConfigured()) {
        console.log(`[Email OTP - Dev Mode] To: ${to} | Name: ${name} | OTP: ${otp} (valid 10 min)`);
        return { delivered: false, mode: "dev" };
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
        from: `"Digital Complaints" <${from}>`,
        to,
        subject: "Password Reset OTP - Digital Complaints",
        text: `Hello ${name},\n\nYour password reset verification code is: ${otp}\n\nThis OTP expires in 10 minutes. If you did not request this, ignore this email.`,
        html: `
            <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;color:#0f172a;">
                <h2 style="margin:0 0 8px;color:#0f2a4a;">Password Reset OTP</h2>
                <p style="margin:0 0 16px;color:#334155;">Hello ${name}, use the code below to verify your email and reset your Digital Complaints password.</p>
                <div style="font-size:28px;font-weight:800;letter-spacing:6px;text-align:center;padding:14px;background:#eff6ff;color:#1d4ed8;border-radius:10px;margin:16px 0;">
                    ${otp}
                </div>
                <p style="margin:12px 0 0;font-size:13px;color:#64748b;">This code expires in 10 minutes. If you did not request a reset, you can safely ignore this message.</p>
            </div>
        `
    });

    return { delivered: true, mode: "smtp" };
}

module.exports = { sendOtpEmail, isSmtpConfigured };
