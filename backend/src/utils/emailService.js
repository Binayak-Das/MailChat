import nodemailer from 'nodemailer';

function createMailTransporter() {
  const emailUser = process.env.EMAIL_USER?.trim();
  const emailPass = process.env.EMAIL_PASS?.trim();

  if (!emailUser || !emailPass) {
    return null;
  }

  if (
    !process.env.EMAIL_SERVICE ||
    process.env.EMAIL_SERVICE.toLowerCase() === 'gmail' ||
    emailUser.endsWith('@gmail.com')
  ) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });
}

export function getOtpEmailTemplate(otp, recipientEmail) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MailChat - Password Recovery OTP</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');
    * {
      font-family: 'Roboto', Arial, sans-serif !important;
    }
    body, table, td, p, a, h1, h2, span, div {
      font-family: 'Roboto', Arial, sans-serif !important;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: transparent !important;
      color: #f8fafc;
    }
    a, a:link, a:visited, a:hover, a:active {
      color: #ffffff !important;
      text-decoration: none !important;
      -webkit-text-fill-color: #ffffff !important;
      font-family: 'Roboto', Arial, sans-serif !important;
    }
    .wrapper {
      max-width: 580px;
      margin: 0 auto;
      background-color: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
    }
    .header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .logo-text {
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .logo-sub {
      color: #dbeafe;
      font-size: 13px;
      margin-top: 4px;
    }
    .content {
      padding: 32px 28px;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 16px 0;
    }
    .text {
      font-size: 15px;
      color: #f8fafc;
      line-height: 1.7;
      margin: 0 0 20px 0;
    }
    .email-badge {
      display: inline-block;
      font-size: 16px;
      font-weight: 700;
      color: #ffffff !important;
      background-color: #1e293b;
      padding: 10px 22px;
      border-radius: 8px;
      border: 1.5px solid #3b82f6;
      text-decoration: none !important;
    }
    .otp-box {
      background-color: #0f172a;
      border: 2px solid #3b82f6;
      border-radius: 12px;
      padding: 24px 16px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #93c5fd;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 42px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #ffffff;
      margin: 0;
      text-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
    }
    .badge {
      display: inline-block;
      margin-top: 12px;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 14px;
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
      border-radius: 20px;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .alert-box {
      background-color: #1e293b;
      border-left: 4px solid #f59e0b;
      padding: 14px 16px;
      border-radius: 6px;
      font-size: 13px;
      color: #e2e8f0;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .footer {
      border-top: 1px solid #1f2937;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      background-color: #0a0e17;
    }
  </style>
</head>
<body style="margin: 0; padding: 16px 0; background-color: transparent; font-family: 'Roboto', Arial, sans-serif; color: #f8fafc;">
  <div class="wrapper" style="max-width: 580px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden;">
    <div class="header" style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 24px; text-align: center;">
      <h1 class="logo-text" style="font-size: 26px; font-weight: 800; color: #ffffff; margin: 0; letter-spacing: -0.5px;">MailChat</h1>
      <div class="logo-sub" style="color: #dbeafe; font-size: 13px; margin-top: 4px;">Unified Real-time Messaging & Communication</div>
    </div>
    <div class="content" style="padding: 32px 28px;">
      <h2 class="title" style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0;">Password Reset Verification</h2>

      <p class="text" style="font-size: 15px; color: #f8fafc; line-height: 1.7; margin: 0 0 16px 0;">
        Hello,<br><br>
        We received a request to reset your password for your MailChat account:
      </p>

      <div style="margin: 16px 0 24px 0; text-align: center;">
        <span class="email-badge" style="display: inline-block; font-size: 16px; font-weight: 700; color: #ffffff !important; background-color: #1e293b; padding: 10px 22px; border-radius: 8px; border: 1.5px solid #3b82f6;">
          <span style="color: #ffffff !important; font-weight: 700;">${recipientEmail.replace('@', '&zwnj;@&zwnj;').replace(/\./g, '&zwnj;.&zwnj;')}</span>
        </span>
      </div>

      <p class="text" style="font-size: 15px; color: #f8fafc; line-height: 1.7; margin: 0 0 20px 0;">
        Use the one-time verification passcode below to confirm your identity:
      </p>

      <div class="otp-box" style="background-color: #0f172a; border: 2px solid #3b82f6; border-radius: 12px; padding: 24px 16px; text-align: center; margin: 24px 0;">
        <div class="otp-label" style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #93c5fd; margin-bottom: 8px;">Your Verification Code</div>
        <div class="otp-code" style="font-size: 42px; font-weight: 900; letter-spacing: 8px; color: #ffffff; margin: 0; text-shadow: 0 0 15px rgba(59, 130, 246, 0.5);">${otp}</div>
        <div class="badge" style="display: inline-block; margin-top: 12px; font-size: 12px; font-weight: 600; padding: 4px 14px; background: rgba(239, 68, 68, 0.15); color: #fca5a5; border-radius: 20px; border: 1px solid rgba(239, 68, 68, 0.3);">Valid for 10 minutes only</div>
      </div>

      <div class="alert-box" style="background-color: #1e293b; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 6px; font-size: 13px; color: #e2e8f0; margin-bottom: 24px; line-height: 1.5;">
        <strong style="color: #fbbf24;">Security Notice:</strong> Never share this code with anyone. MailChat staff will never ask for your verification code. If you did not request this, please ignore this email or change your password if you suspect unauthorized activity.
      </div>

      <p class="text" style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 0;">
        Best regards,<br>
        <strong style="color: #ffffff;">The MailChat Security Team</strong>
      </p>
    </div>
    <div class="footer" style="border-top: 1px solid #1f2937; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; background-color: #0a0e17;">
      &copy; ${new Date().getFullYear()} MailChat. All rights reserved.<br>
      This is an automated message sent to <span style="display: inline-block; color: #ffffff !important; font-weight: 600;">${recipientEmail.replace('@', '&zwnj;@&zwnj;').replace(/\./g, '&zwnj;.&zwnj;')}</span>. Please do not reply.
    </div>
  </div>
</body>
</html>
  `;
}

export function getTwoFactorOtpEmailTemplate(otp, recipientEmail, action = 'Login Verification') {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MailChat - Two-Factor Authentication (2FA)</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0f19;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .wrapper {
      max-width: 580px;
      margin: 20px auto;
      background-color: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .shield-icon {
      font-size: 36px;
      margin-bottom: 8px;
    }
    .logo-text {
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
    }
    .content {
      padding: 32px 28px;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 12px 0;
    }
    .text {
      font-size: 14px;
      color: #cbd5e1;
      line-height: 1.6;
      margin: 0 0 18px 0;
    }
    .otp-box {
      background-color: #0f172a;
      border: 2px solid #3b82f6;
      border-radius: 12px;
      padding: 24px 16px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #93c5fd;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 40px;
      font-weight: 900;
      letter-spacing: 8px;
      color: #60a5fa;
      margin: 0;
    }
    .badge {
      display: inline-block;
      margin-top: 10px;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 12px;
      background: rgba(59, 130, 246, 0.15);
      color: #93c5fd;
      border-radius: 20px;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    .alert-box {
      background-color: #1e293b;
      border-left: 4px solid #3b82f6;
      padding: 14px 16px;
      border-radius: 6px;
      font-size: 13px;
      color: #e2e8f0;
      margin-bottom: 24px;
    }
    .footer {
      border-top: 1px solid #1f2937;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      background-color: #0a0e17;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="shield-icon">🛡️</div>
      <h1 class="logo-text">MailChat 2FA Protection</h1>
      <div style="color: #bfdbfe; font-size: 13px; margin-top: 4px;">Two-Factor Authentication Security Code</div>
    </div>
    <div class="content">
      <h2 class="title">${action}</h2>
      <p class="text">
        Hello,<br><br>
        A request was made to authenticate your MailChat account (${recipientEmail}). Please use the following one-time verification passcode to proceed:
      </p>

      <div class="otp-box">
        <div class="otp-label">Two-Factor Security Passcode</div>
        <div class="otp-code">${otp}</div>
        <div class="badge">Valid for 10 minutes</div>
      </div>

      <div class="alert-box">
        <strong>Notice:</strong> If you did not initiate this authentication request, please change your password immediately and review your active devices.
      </div>

      <p class="text" style="margin-bottom: 0;">
        Stay secure,<br>
        <strong style="color: #ffffff;">The MailChat Security Team</strong>
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} MailChat Unified Workspace &bull; Security Engine
    </div>
  </div>
</body>
</html>
  `;
}

export async function sendPasswordResetOtpEmail(to, otp) {
  const transporter = createMailTransporter();
  const html = getOtpEmailTemplate(otp, to);

  if (!transporter) {
    throw new Error(
      'Email service is not configured. Please set EMAIL_USER and EMAIL_PASS in your backend/.env file.'
    );
  }

  try {
    let fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    if (typeof fromAddress === 'string') {
      fromAddress = fromAddress.replace(/^"(.*)"$/, '$1').trim();
    }
    if (!fromAddress) {
      fromAddress = process.env.EMAIL_USER;
    }

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: `MailChat - Password Reset Verification Code`,
      text: `Your MailChat password reset verification code is: ${otp}. It expires in 10 minutes. If you did not request this, please ignore this email.`,
      html
    });

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    throw new Error(
      `Email delivery failed: ${error.message}. Please check your Gmail App Password and network connection.`
    );
  }
}

export async function sendTwoFactorOtpEmail(to, otp, action = 'Login Verification') {
  const transporter = createMailTransporter();
  const html = getTwoFactorOtpEmailTemplate(otp, to, action);

  if (!transporter) {
    throw new Error(
      'Email service is not configured. Please set EMAIL_USER and EMAIL_PASS in your backend/.env file.'
    );
  }

  try {
    let fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    if (typeof fromAddress === 'string') {
      fromAddress = fromAddress.replace(/^"(.*)"$/, '$1').trim();
    }
    if (!fromAddress) {
      fromAddress = process.env.EMAIL_USER;
    }

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: `MailChat - Two-Factor Verification Code:`,
      text: `Your MailChat 2FA verification code for ${action} is: ${otp}. Valid for 10 minutes.`,
      html
    });

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    throw new Error(
      `Email delivery failed: ${error.message}. Please check your Gmail App Password and network connection.`
    );
  }
}
