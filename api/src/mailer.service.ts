import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
  }

  async sendMail(options: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    attachments?: nodemailer.SendMailOptions['attachments'];
  }) {
    const { to, subject, html, text, attachments } = options;

    // πολύ απλό "plain text" από το html (ώστε να φαίνεται και στο Plain text tab)
    const autoText = html
      ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : '';

    return this.transporter.sendMail({
      from:
        process.env.MAIL_FROM ||
        process.env.SMTP_USER ||
        '"GoodJobEurope" <noreply@jobmatch.local>',
      to,
      subject,
      html,
      text: text || autoText || undefined,
      attachments,
    });
  }

  // wrapper για legacy κλήσεις: this.mailer.send(...)
  async send(to: string, subject: string, html: string) {
    return this.sendMail({ to, subject, html });
  }
}