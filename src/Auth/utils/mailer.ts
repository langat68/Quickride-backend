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
    subject: 'Welcome to Chukuaride!',
    html: `<h2>Hi ${name},</h2><p>Thanks for signing up. Let's get you on the road 🚗</p>`,
  })
}