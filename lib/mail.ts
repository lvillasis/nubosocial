// lib/mail.ts
import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

const FROM = process.env.EMAIL_FROM || "Nubo <no-reply@nubo.com>";
const NEXT_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

export async function sendResetEmail(to: string, resetUrl: string) {
  // Prefer API provider (SendGrid) in production
  if (process.env.SENDGRID_API_KEY) {
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const msg = {
        to,
        from: FROM,
        subject: "Restablece tu contraseña — Nubo",
        html: `
          <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;line-height:1.4;color:#111">
            <h2>Restablece tu contraseña</h2>
            <p>Haz clic en el botón o pegalo en tu navegador:</p>
            <p><a href="${resetUrl}" style="background:#7c3aed;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Restablecer contraseña</a></p>
            <p style="font-size:12px;color:#666">Si no pediste esto, ignora este correo.</p>
          </div>
        `,
      };
      const res = await sgMail.send(msg);
      return res;
    } catch (_err) {
      console.error("SendGrid error:", err);
      // caemos a fallback abajo
    }
  }

  // Si no hay SendGrid o falla, si hay SMTP configurado lo usamos
  if (process.env.SMTP_HOST) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: FROM,
      to,
      subject: "Restablece tu contraseña — Nubo",
      html: `<p>Haz clic: <a href="${resetUrl}">${resetUrl}</a></p>`,
    });
    return info;
  }

  // Fallback dev: Ethereal (no requiere env)
  const testAccount = await nodemailer.createTestAccount();
  const devTransporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });

  const info = await devTransporter.sendMail({
    from: FROM,
    to,
    subject: "Restablece tu contraseña — Nubo (DEV)",
    html: `<p>Enlace de prueba (DEV): <a href="${resetUrl}">${resetUrl}</a></p>`,
  });

  console.log("Ethereal preview URL:", nodemailer.getTestMessageUrl(info));
  return info;
}
