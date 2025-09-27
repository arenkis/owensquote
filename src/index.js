#!/usr/bin/env node

import { CronJob } from 'cron';
import { config } from './config/config.js';
import { logger } from './utils/logger.js';
import { InterviewReader } from './services/interview-reader.js';
import { QuoteExtractor } from './quote-extractor/quote-extractor.js';
import { EmailSender } from './email/email-sender.js';

class RickOwensQuoteBot {
  constructor() {
    this.interviewReader = null;
    this.quoteExtractor = null;
    this.emailSender = null;
    this.isRunning = false;
  }

  async init() {
    try {
      logger.info('Initializing Rick Owens Quote Bot...');

      // Validate configuration
      const validation = await config.validateConnections();
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.issues.join(', ')}`);
      }

      // Initialize services
      this.interviewReader = new InterviewReader(config.getDataConfig());
      this.quoteExtractor = new QuoteExtractor(config.getAIConfig());
      this.emailSender = new EmailSender(config.getEmailConfig());

      logger.info('All services initialized successfully');

      if (config.isDevelopment()) {
        logger.info('Running in development mode');
        logger.debug('Configuration:', config.getDebugInfo());
      }

    } catch (error) {
      logger.error('Failed to initialize bot:', error);
      throw error;
    }
  }

  async processQuote() {
    if (this.isRunning) {
      logger.warn('Quote processing already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting quote processing...');

      // Step 1: Get a random interview from JSON data
      logger.info('Loading random interview from data...');
      const interview = await this.interviewReader.getRandomInterview();

      if (!interview || !interview.content) {
        throw new Error('No interview content available');
      }

      logger.info(`Processing interview: "${interview.title}" from ${interview.source} (${interview.content.length} chars)`);

      // Step 2: Extract meaningful quotes
      logger.info('Extracting quotes using AI...');
      const quotes = await this.quoteExtractor.extractQuotes(interview.content, interview.title);

      if (!quotes || quotes.length === 0) {
        throw new Error('No meaningful quotes extracted');
      }

      logger.info(`Extracted ${quotes.length} quotes`);

      // Step 3: Send email with quotes
      logger.info('Preparing email...');
      const recipients = config.getEmailRecipients();

      const emailContent = this.formatEmail(interview, quotes);

      await this.emailSender.sendQuoteEmail(
        recipients,
        `OWENSQUOTE: ${interview.title}`,
        emailContent.text,
        emailContent.html
      );

      const duration = Math.round((Date.now() - startTime) / 1000);
      logger.info(`Quote processing completed successfully in ${duration}s`);

      return {
        success: true,
        interview: {
          title: interview.title,
          url: interview.url
        },
        quotes: quotes.length,
        recipients: recipients.length,
        duration
      };

    } catch (error) {
      logger.error('Failed to process quote:', error);
      throw error;
    } finally {
      // Cleanup
      this.isRunning = false;
    }
  }

  formatEmail(interview, quotes) {
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Text version
    const textContent = `
OWENSQUOTE - ${date}

From: "${interview.title}"
Source: ${interview.url}

${quotes.map((quote, index) => `"${quote.text}"`).join('\n\n')}

---
OWENSQUOTE
`;

    // HTML version with Rick Owens website aesthetic
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>OWENSQUOTE</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      line-height: 1.5;
      background-color: #ffffff;
      color: #000000;
      padding: 0;
      margin: 0;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
    }

    .header {
      background: #ffffff;
      padding: 40px 30px 30px;
      text-align: left;
      border-bottom: 1px solid #e5e5e5;
    }

    .brand {
      font-size: 14px;
      font-weight: 400;
      letter-spacing: 2px;
      color: #000000;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    .date {
      font-size: 11px;
      font-weight: 400;
      color: #666666;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .content {
      padding: 40px 30px;
    }

    .source-info {
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 1px solid #f0f0f0;
    }

    .source-title {
      font-size: 13px;
      font-weight: 400;
      color: #000000;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .source-url {
      font-size: 11px;
      font-weight: 400;
      color: #999999;
      word-break: break-all;
    }

    .quote-container {
      margin: 40px 0;
    }

    .quote-text {
      font-size: 16px;
      font-weight: 400;
      line-height: 1.6;
      color: #000000;
      margin: 20px 0;
      font-style: italic;
    }

    .quote-attribution {
      font-size: 11px;
      font-weight: 400;
      color: #666666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 20px;
    }

    .footer {
      background: #ffffff;
      padding: 30px;
      text-align: left;
      border-top: 1px solid #e5e5e5;
      margin-top: 40px;
    }

    .footer-text {
      font-size: 10px;
      font-weight: 400;
      letter-spacing: 1px;
      color: #999999;
      text-transform: uppercase;
    }

    /* Clean, minimal spacing like Rick Owens site */
    .product-grid {
      display: block;
      width: 100%;
    }

    @media (max-width: 600px) {
      .container {
        margin: 0;
      }

      .header {
        padding: 30px 20px 20px;
      }

      .content {
        padding: 30px 20px;
      }

      .footer {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">OWENSQUOTE</div>
      <div class="date">${date}</div>
    </div>

    <div class="content">
      <div class="source-info">
        <div class="source-title">${interview.title}</div>
        <div class="source-url">${interview.url}</div>
      </div>

      ${quotes.map((quote, index) => `
        <div class="quote-container">
          <div class="quote-text">"${quote.text}"</div>
          <div class="quote-attribution">Rick Owens</div>
        </div>
      `).join('')}
    </div>

    <div class="footer">
      <div class="footer-text">OWENSQUOTE</div>
    </div>
  </div>
</body>
</html>
`;

    return {
      text: textContent.trim(),
      html: htmlContent.trim()
    };
  }

  async start() {
    try {
      await this.init();

      const scheduleConfig = config.getScheduleConfig();

      if (scheduleConfig.runOnce) {
        logger.info('Running once and exiting...');
        await this.processQuote();
        process.exit(0);
      } else {
        logger.info(`Starting scheduled execution with cron: ${scheduleConfig.cronSchedule}`);

        const job = new CronJob(
          scheduleConfig.cronSchedule,
          async () => {
            try {
              await this.processQuote();
            } catch (error) {
              logger.error('Scheduled job failed:', error);
            }
          },
          null,
          true,
          'America/New_York'
        );

        logger.info('Bot started successfully. Waiting for scheduled execution...');
        logger.info(`Next run scheduled for: ${job.nextDates()}`);

        // Keep the process alive
        process.on('SIGINT', async () => {
          logger.info('Received SIGINT, gracefully shutting down...');
          job.stop();
          process.exit(0);
        });
      }

    } catch (error) {
      logger.error('Failed to start bot:', error);
      process.exit(1);
    }
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the bot if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const bot = new RickOwensQuoteBot();
  bot.start().catch((error) => {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  });
}

export { RickOwensQuoteBot };