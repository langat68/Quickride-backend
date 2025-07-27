import nodemailer from 'nodemailer'
import type { SentMessageInfo } from 'nodemailer'

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

// sending a message to the users email
export const sendWelcomeEmail = async (
  to: string,
  name: string
): Promise<SentMessageInfo> => {
  return await transporter.sendMail({
    from: `"Chukuaride" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Welcome to Quickride – Your Journey Begins Here!',
    html: `
      <h2>Hello ${name},</h2>
      <p>Welcome to <strong>Quickride</strong> – we're thrilled to have you on board!</p>
      <p>Whether you're heading to a meeting, a weekend escape, or just cruising through town, we’re here to make every trip smooth, safe, and enjoyable.</p>
      <p>Browse cars, make bookings in seconds, and enjoy the ride – all from one platform.</p>
      <p style="margin-top: 20px;">Need help getting started? Our support team is just a click away.</p>
      <p>Let’s hit the road 🚗</p>
      <p><strong>– The Quickride Team</strong></p>
    `,
  });
};
