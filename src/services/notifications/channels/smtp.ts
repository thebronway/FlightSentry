import nodemailer from 'nodemailer';
import { Settings } from '@/types';

export const sendSmtpEmail = async (
  settings: Partial<Settings>,
  title: string,
  body: string,
  htmlBody?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!settings.smtpHost || !settings.smtpPort || !settings.smtpTo || !settings.smtpFrom) {
      return { success: false, error: 'Incomplete SMTP configuration (Host, Port, From, and To are required)' };
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpPort === 465,
      auth: (settings.smtpUser && settings.smtpPass)
        ? { user: settings.smtpUser, pass: settings.smtpPass }
        : undefined,
    });

    await transporter.sendMail({
      from: settings.smtpFrom,
      to: settings.smtpTo,
      subject: title,
      text: body,
      html: htmlBody || body.replace(/\n/g, '<br>'),
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'SMTP send failed' };
  }
};