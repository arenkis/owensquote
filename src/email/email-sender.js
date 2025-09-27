import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

class EmailSender {
  constructor(config) {
    this.config = {
      host: config.host,
      port: config.port || 587,
      secure: config.secure || false,
      auth: {
        user: config.user,
        pass: config.password
      },
      from: config.from || config.user,
      ...config
    };

    this.transporter = null;
    this.isConfigured = this.validateConfig();
  }

  validateConfig() {
    const required = ['host', 'user', 'password'];
    const missing = required.filter(key => !this.config[key] && !this.config.auth[key]);

    if (missing.length > 0) {
      logger.error(`Missing required email configuration: ${missing.join(', ')}`);
      return false;
    }

    return true;
  }

  async init() {
    if (!this.isConfigured) {
      throw new Error('Email configuration is incomplete');
    }

    try {
      logger.info('Initializing email transporter...');

      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection
      await this.transporter.verify();
      logger.info('Email transporter initialized and verified successfully');

    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
      throw error;
    }
  }

  async sendQuote(quoteData, recipients) {
    if (!this.transporter) {
      await this.init();
    }

    if (!recipients || recipients.length === 0) {
      throw new Error('No recipients specified');
    }

    try {
      logger.info(`Sending quote to ${recipients.length} recipients`);

      const emailContent = this.buildEmailContent(quoteData);

      const mailOptions = {
        from: this.config.from,
        to: recipients.join(', '),
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`Email sent successfully: ${info.messageId}`);
      logger.info(`Recipients: ${recipients.join(', ')}`);

      return {
        success: true,
        messageId: info.messageId,
        recipients: recipients,
        sentAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  buildEmailContent(quoteData) {
    const { quote, source, extractedAt } = quoteData;

    const subject = `Daily Rick Owens Quote - ${new Date().toLocaleDateString()}`;

    const text = `
Rick Owens Quote of the Day

"${quote}"

Source: ${source.title}
${source.url}

---
Sent by Rick Owens Quote Bot
${new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}
`.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rick Owens Quote</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8f8f8;
    }
    .container {
      background-color: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 300;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin: 0;
      color: #000;
    }
    .quote {
      font-size: 18px;
      font-style: italic;
      text-align: center;
      margin: 40px 0;
      padding: 0 20px;
      color: #222;
      line-height: 1.8;
    }
    .quote::before,
    .quote::after {
      content: '"';
      font-size: 24px;
      color: #666;
    }
    .source {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      text-align: center;
    }
    .source-title {
      font-weight: 600;
      color: #444;
      margin-bottom: 5px;
    }
    .source-link {
      color: #0066cc;
      text-decoration: none;
      font-size: 14px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .date {
      font-weight: 500;
      color: #000;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rick Owens Quote</h1>
    </div>

    <div class="quote">
      ${quote}
    </div>

    <div class="source">
      <div class="source-title">${source.title}</div>
      <a href="${source.url}" class="source-link" target="_blank">View Original Interview</a>
    </div>

    <div class="footer">
      <div class="date">${new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}</div>
      <div style="margin-top: 5px;">
        Sent by Rick Owens Quote Bot
      </div>
    </div>
  </div>
</body>
</html>
`.trim();

    return { subject, text, html };
  }

  async testConnection() {
    try {
      if (!this.transporter) {
        await this.init();
      }

      await this.transporter.verify();
      logger.info('Email connection test successful');
      return true;
    } catch (error) {
      logger.error('Email connection test failed:', error);
      return false;
    }
  }

  // Method expected by main application
  async sendQuoteEmail(recipients, subject, textContent, htmlContent) {
    if (!this.transporter) {
      await this.init();
    }

    if (!recipients || recipients.length === 0) {
      throw new Error('No recipients specified');
    }

    try {
      logger.info(`Sending email to ${recipients.length} recipients`);

      const mailOptions = {
        from: this.config.from,
        to: recipients.join(', '),
        subject: subject,
        text: textContent,
        html: htmlContent
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`Email sent successfully: ${info.messageId}`);
      logger.info(`Recipients: ${recipients.join(', ')}`);

      return {
        success: true,
        messageId: info.messageId,
        recipients: recipients,
        sentAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendTestEmail(recipient) {
    const testQuoteData = {
      quote: "I think there's something beautiful about the decay, something beautiful about the entropy.",
      source: {
        title: "Test Interview",
        url: "https://example.com",
      },
      extractedAt: new Date().toISOString()
    };

    return await this.sendQuote(testQuoteData, [recipient]);
  }
}

export { EmailSender };