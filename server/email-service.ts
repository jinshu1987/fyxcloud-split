import nodemailer from "nodemailer";
import { storage } from "./storage";
import { encrypt, decrypt } from "./encryption";

let cachedTransporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter | null> {
  const settings = await storage.getSmtpSettings();
  if (!settings || !settings.enabled) return null;

  try {
    const password = decrypt(settings.passwordEncrypted);
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: {
        user: settings.username,
        pass: password,
      },
    });
    return transporter;
  } catch (err) {
    console.error("Failed to create email transporter:", err);
    return null;
  }
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const transporter = await getTransporter();
  if (!transporter) {
    console.log("SMTP not configured, skipping email send");
    return false;
  }

  const settings = await storage.getSmtpSettings();
  if (!settings) return false;

  try {
    await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("Failed to send email:", err);
    return false;
  }
}

export async function sendVerificationEmail(name: string, email: string, token: string): Promise<boolean> {
  const verifyUrl = `${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : 'http://localhost:5000'}/api/auth/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f8fafc;font-family:'Nunito Sans',Arial,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#007aff,#1d4ed8);padding:32px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">Fyx Cloud</h1>
          <p style="margin:4px 0 0;color:#bfdbfe;font-size:14px;">AI Security Posture Management</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#1e293b;font-size:20px;margin:0 0 16px;">Verify Your Email</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6;">
            Hi ${name},<br><br>
            Welcome to Fyx Cloud! Please verify your email address by clicking the button below.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${verifyUrl}" style="display:inline-block;background:#007aff;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
              Verify Email Address
            </a>
          </div>
          <p style="color:#64748b;font-size:12px;line-height:1.6;">
            This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
          <p style="color:#64748b;font-size:12px;margin-top:8px;">
            Or copy this link: <span style="color:#007aff;word-break:break-all;">${verifyUrl}</span>
          </p>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="color:#94a3b8;font-size:11px;margin:0;">© ${new Date().getFullYear()} Fyx Cloud. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, "Verify your Fyx Cloud account", html);
}

export async function sendPasswordResetEmail(name: string, email: string, token: string): Promise<boolean> {
  const resetUrl = `${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : 'http://localhost:5000'}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f8fafc;font-family:'Nunito Sans',Arial,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#007aff,#1d4ed8);padding:32px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">Fyx Cloud</h1>
          <p style="margin:4px 0 0;color:#bfdbfe;font-size:14px;">AI Security Posture Management</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#1e293b;font-size:20px;margin:0 0 16px;">Reset Your Password</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6;">
            Hi ${name},<br><br>
            We received a request to reset your password. Click the button below to create a new password.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${resetUrl}" style="display:inline-block;background:#007aff;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
              Reset Password
            </a>
          </div>
          <p style="color:#64748b;font-size:12px;line-height:1.6;">
            This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
          </p>
          <p style="color:#64748b;font-size:12px;margin-top:8px;">
            Or copy this link: <span style="color:#007aff;word-break:break-all;">${resetUrl}</span>
          </p>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="color:#94a3b8;font-size:11px;margin:0;">© ${new Date().getFullYear()} Fyx Cloud. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, "Reset your Fyx Cloud password", html);
}

export async function testSmtpConnection(host: string, port: number, secure: boolean, username: string, password: string): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user: username, pass: password },
    });
    await transporter.verify();
    return { success: true, message: "SMTP connection verified successfully" };
  } catch (err: any) {
    return { success: false, message: err.message || "Connection failed" };
  }
}
