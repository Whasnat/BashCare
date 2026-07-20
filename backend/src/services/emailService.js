import nodemailer from 'nodemailer';

// If SMTP settings are provided in .env, use them. 
// Otherwise, create a test account on Ethereal Email (good for local testing).
let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Generate a test account from Ethereal if no real SMTP configured
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("-----------------------------------------");
    console.log("No SMTP settings found. Using Ethereal Email for testing.");
    console.log("Ethereal credentials:", testAccount.user, testAccount.pass);
    console.log("-----------------------------------------");
  }
  return transporter;
}

export const sendInviteEmail = async (toEmail, tenantName, setupLink, landlordName) => {
  try {
    const tp = await getTransporter();
    const info = await tp.sendMail({
      from: `"${landlordName} (via BashaCare)" <noreply@bashacare.com>`,
      to: toEmail,
      subject: "Invitation to BashaCare Tenant Portal",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #10b981;">Welcome to BashaCare!</h2>
          <p>Hello <strong>${tenantName}</strong>,</p>
          <p><strong>${landlordName}</strong> has invited you to join the BashaCare Tenant Portal. Through the portal, you can view invoices, pay rent online, and submit maintenance requests.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${setupLink}" style="background-color: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
              Activate Your Account
            </a>
          </div>
          <p>If the button above does not work, copy and paste this link into your browser:</p>
          <p><a href="${setupLink}" style="color: #3b82f6; word-break: break-all;">${setupLink}</a></p>
          <br/>
          <p style="color: #6b7280; font-size: 12px;">This is an automated message. Please do not reply directly to this email.</p>
        </div>
      `
    });

    console.log("Message sent: %s", info.messageId);
    
    // For Ethereal, you can log the preview URL:
    if (!process.env.SMTP_HOST) {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error("Error sending invite email:", error);
    return false;
  }
};
