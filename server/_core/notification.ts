// Notification helper (replaces Manus notification service)
import nodemailer from "nodemailer";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
};

// Simple email transport creation based on env variables
function getTransport() {
  if (
    ENV.SMTP_HOST &&
    ENV.SMTP_PORT &&
    ENV.SMTP_USER &&
    ENV.SMTP_PASS
  ) {
    return nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: Number(ENV.SMTP_PORT),
      secure: Number(ENV.SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: ENV.SMTP_USER,
        pass: ENV.SMTP_PASS,
      },
    });
  }
  return null;
}

/** Send notification to project owner. Returns true if sent successfully. */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const { title, content } = payload;

  // If SMTP config is present, send an email
  const transporter = getTransport();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: ENV.SMTP_FROM || "no-reply@example.com",
        to: ENV.NOTIFY_EMAIL || "owner@example.com",
        subject: title,
        text: content,
      });
      console.log("[Notification] Email sent", info.messageId);
      return true;
    } catch (error) {
      console.warn("[Notification] Failed to send email", error);
      return false;
    }
  }

  // Fallback: log to console
  console.info(`[Notification] ${title}\n${content}`);
  return true;
}

