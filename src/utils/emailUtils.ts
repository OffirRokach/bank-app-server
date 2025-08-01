import nodemailer from "nodemailer";

/**
 * Send an email using nodemailer
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param html - HTML content of the email
 * @returns Promise that resolves when email is sent
 */
export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  try {
    // Log email details for debugging
    console.log("==========================================");
    console.log(`📧 Sending email to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log("==========================================");

    // Check if we have environment variables for email configuration
    if (
      process.env.EMAIL_HOST &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASSWORD
    ) {
      // Use configured email service
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || "587"),
        secure: process.env.EMAIL_SECURE === "true",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || "Bank App"}" <${
          process.env.EMAIL_FROM_ADDRESS || "noreply@bankapp.com"
        }>`,
        to,
        subject,
        html,
      });

      console.log(`Email sent to ${to} using configured email service`);
    } else {
      // Create a test account with Ethereal
      console.log("Using Ethereal for email testing...");
      const testAccount = await nodemailer.createTestAccount();

      // Create a transporter using the test account
      const transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      // Send the email
      const info = await transporter.sendMail({
        from: '"Bank App" <noreply@bankapp.com>',
        to,
        subject,
        html,
      });

      console.log(`Email sent to ${to} using Ethereal`);

      // Log the URL where you can see the email
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`📨 Preview URL: ${previewUrl}`);
      console.log("👆 Open this URL in your browser to view the email content");
    }
  } catch (error) {
    console.error("Error sending email:", error);
    // Log the error but don't throw it to prevent app crashes
    console.log("Email sending failed, but continuing execution");
    return;
  }
};

/**
 * Send a verification email to a user
 * @param email - User's email address
 * @param token - Verification token
 */
export const sendVerificationEmail = async (
  email: string,
  verificationLink: string
): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verify Your Email Address</h2>
      <p>Thank you for signing up! Please verify your email address to activate your account.</p>
      <p>Click the button below to verify your email:</p>
     <a href="${verificationLink}">Verify Email</a>
      <p>Or copy and paste this link into your browser:</p>
      <p>This link will expire in 24 hours.</p>
    </div>
  `;

  await sendEmail(email, "Verify Your Email Address", html);
};
