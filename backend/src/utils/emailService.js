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
    
    u + #body a {
      color: #ffffff !important;
      text-decoration: none !important;
    }
    a[x-apple-data-detectors] {
      color: #ffffff !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
    }
    #MessageViewBody a {
      color: #ffffff !important;
      text-decoration: none !important;
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
      font-family: 'Roboto', Arial, sans-serif !important;
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
    .email-badge a, .email-badge a:visited, .email-badge a:hover, .email-badge span, .email-badge * {
      color: #ffffff !important;
      text-decoration: none !important;
      -webkit-text-fill-color: #ffffff !important;
    }
    
    u + #body a {
      color: #ffffff !important;
      text-decoration: none !important;
    }
    .ii a[href] {
      color: #ffffff !important;
      text-decoration: none !important;
    }
    a[x-apple-data-detectors] {
      color: inherit !important;
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
  <div class="wrapper" style="max-width: 580px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; font-family: 'Roboto', Arial, sans-serif;">
    <div class="header" style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 24px; text-align: center; font-family: 'Roboto', Arial, sans-serif;">
      <h1 class="logo-text" style="font-size: 26px; font-weight: 800; color: #ffffff; margin: 0; letter-spacing: -0.5px; font-family: 'Roboto', Arial, sans-serif;">MailChat</h1>
      <div class="logo-sub" style="color: #dbeafe; font-size: 13px; margin-top: 4px; font-family: 'Roboto', Arial, sans-serif;">Unified Real-time Messaging & Communication</div>
    </div>
    <div class="content" style="padding: 32px 28px; font-family: 'Roboto', Arial, sans-serif;">
      <h2 class="title" style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 16px 0; font-family: 'Roboto', Arial, sans-serif;">Password Reset Verification</h2>

      <p class="text" style="font-size: 15px; color: #f8fafc; line-height: 1.7; margin: 0 0 16px 0; font-family: 'Roboto', Arial, sans-serif;">
        Hello,<br><br>
        We received a request to reset your password for your MailChat account:
      </p>

      <div style="margin: 16px 0 24px 0; text-align: center; font-family: 'Roboto', Arial, sans-serif;">
        <span class="email-badge" style="display: inline-block; font-size: 16px; font-weight: 700; color: #ffffff !important; background-color: #1e293b; padding: 10px 22px; border-radius: 8px; border: 1.5px solid #3b82f6; text-decoration: none !important; font-family: 'Roboto', Arial, sans-serif; -webkit-text-fill-color: #ffffff !important;">
          <span style="color: #ffffff !important; text-decoration: none !important; text-decoration-line: none !important; -webkit-text-fill-color: #ffffff !important; font-weight: 700; font-family: 'Roboto', Arial, sans-serif;">${recipientEmail.replace('@', '&zwnj;@&zwnj;').replace(/\./g, '&zwnj;.&zwnj;')}</span>
        </span>
      </div>

      <p class="text" style="font-size: 15px; color: #f8fafc; line-height: 1.7; margin: 0 0 20px 0; font-family: 'Roboto', Arial, sans-serif;">
        Use the one-time verification passcode below to confirm your identity:
      </p>

      <div class="otp-box" style="background-color: #0f172a; border: 2px solid #3b82f6; border-radius: 12px; padding: 24px 16px; text-align: center; margin: 24px 0; font-family: 'Roboto', Arial, sans-serif;">
        <div class="otp-label" style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #93c5fd; margin-bottom: 8px; font-family: 'Roboto', Arial, sans-serif;">Your Verification Code</div>
        <div class="otp-code" style="font-family: 'Roboto', Arial, sans-serif !important; font-size: 42px; font-weight: 900; letter-spacing: 8px; color: #ffffff; margin: 0; text-shadow: 0 0 15px rgba(59, 130, 246, 0.5);">${otp}</div>
        <div class="badge" style="display: inline-block; margin-top: 12px; font-size: 12px; font-weight: 600; padding: 4px 14px; background: rgba(239, 68, 68, 0.15); color: #fca5a5; border-radius: 20px; border: 1px solid rgba(239, 68, 68, 0.3); font-family: 'Roboto', Arial, sans-serif;">Valid for 10 minutes only</div>
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
      This is an automated message sent to <span style="display: inline-block; color: #ffffff !important; font-weight: 600; text-decoration: none !important; -webkit-text-fill-color: #ffffff !important;">${recipientEmail.replace('@', '&zwnj;@&zwnj;').replace(/\./g, '&zwnj;.&zwnj;')}</span>. Please do not reply.
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
