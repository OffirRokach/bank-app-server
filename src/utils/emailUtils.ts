import nodemailer from "nodemailer";
import { SendMailOptions } from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.APP_PASSWORD,
  },
});

/**
 * Send a verification email to a user
 * @param email - User's email address
 * @param verificationLink - Email verification link
 */
export const sendVerificationEmail = async (
  email: string,
  verificationLink: string
): Promise<void> => {
  const mailOptions: SendMailOptions = {
    from: `"Aurora Bank" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify Your Email Address",
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verify Your Email Address</h2>
      <p>Thank you for signing up! Please verify your email address to activate your account.</p>
      <p><a href="${verificationLink}" style="background-color:#4CAF50;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Verify Email</a></p>
      <p>This link will expire in 24 hours.</p>
    </div>
  `,
  };
  await sendMail(mailOptions);
};

/**
 * Helper to send mail with error handling
 */
const sendMail = async (mailOptions: SendMailOptions) => {
  try {
    console.log("Attempting to send email..");
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
