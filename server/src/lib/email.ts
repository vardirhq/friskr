import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? 'noreply@friskr.app',
    to,
    subject: `Friskr innlogging: ${code}`,
    text: `Din innloggingskode er: ${code}\n\nKoden gjelder i 10 minutter.`,
    html: `<p>Din innloggingskode er: <strong>${code}</strong></p><p>Koden gjelder i 10 minutter.</p>`,
  });
}
