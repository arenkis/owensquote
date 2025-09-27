import puppeteer from 'puppeteer';
import { logger } from '../utils/logger.js';

class InterviewScraper {
  constructor(options = {}) {
    this.baseUrl = 'https://www.rickowens.eu/en/US/interviews';
    this.browser = null;
    this.page = null;
    this.options = {
      headless: true,
      timeout: 30000,
      waitForSelector: 'a[href*="/interviews/"]',
      ...options
    };
  }

  async init() {
    try {
      logger.info('Initializing browser...');
      this.browser = await puppeteer.launch({
        headless: this.options.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      this.page = await this.browser.newPage();

      // Set user agent to avoid bot detection
      await this.page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Set viewport
      await this.page.setViewport({ width: 1366, height: 768 });

      logger.info('Browser initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize browser:', error);
      throw error;
    }
  }

  async getInterviewUrls() {
    try {
      logger.info('Navigating to interviews page...');
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });

      // Wait for the page to load and look for interview links
      await this.page.waitForTimeout(3000);

      // Try different selectors for interview links
      const selectors = [
        'a[href*="/interviews/"]',
        'a[href*="interview"]',
        '.interview-link',
        '.interview a',
        '[data-interview]'
      ];

      let interviewUrls = [];

      for (const selector of selectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });

          interviewUrls = await this.page.evaluate((sel) => {
            const links = Array.from(document.querySelectorAll(sel));
            return links
              .map(link => link.href)
              .filter(href => href && href.includes('interview'))
              .map(href => new URL(href).href); // Normalize URLs
          }, selector);

          if (interviewUrls.length > 0) {
            logger.info(`Found ${interviewUrls.length} interview URLs using selector: ${selector}`);
            break;
          }
        } catch (selectorError) {
          logger.debug(`Selector ${selector} not found, trying next...`);
          continue;
        }
      }

      // If no specific selectors work, try to find all links and filter
      if (interviewUrls.length === 0) {
        logger.info('Trying fallback method to find interview links...');
        interviewUrls = await this.page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href]'));
          return links
            .map(link => link.href)
            .filter(href =>
              href &&
              (href.toLowerCase().includes('interview') ||
               href.includes('/interviews/'))
            )
            .map(href => new URL(href).href);
        });
      }

      // Remove duplicates
      interviewUrls = [...new Set(interviewUrls)];

      logger.info(`Found ${interviewUrls.length} total interview URLs`);
      return interviewUrls;

    } catch (error) {
      logger.error('Failed to get interview URLs:', error);

      // Take a screenshot for debugging
      try {
        await this.page.screenshot({
          path: `logs/debug-${Date.now()}.png`,
          fullPage: true
        });
        logger.info('Debug screenshot saved to logs directory');
      } catch (screenshotError) {
        logger.warn('Could not save debug screenshot:', screenshotError);
      }

      throw error;
    }
  }

  async scrapeInterview(url) {
    try {
      logger.info(`Scraping interview: ${url}`);

      await this.page.goto(url, { waitUntil: 'networkidle2' });
      await this.page.waitForTimeout(2000);

      const interviewData = await this.page.evaluate(() => {
        // Try multiple strategies to extract interview content
        const strategies = [
          // Strategy 1: Look for common interview containers
          () => {
            const containers = [
              '.interview-content',
              '.interview-text',
              '.content',
              '.article-content',
              'article',
              '.main-content'
            ];

            for (const container of containers) {
              const element = document.querySelector(container);
              if (element) {
                return {
                  title: document.querySelector('h1, .title, .interview-title')?.textContent?.trim() || 'Untitled Interview',
                  content: element.textContent?.trim() || '',
                  source: 'container'
                };
              }
            }
            return null;
          },

          // Strategy 2: Look for paragraph content
          () => {
            const paragraphs = Array.from(document.querySelectorAll('p'));
            const content = paragraphs
              .map(p => p.textContent?.trim())
              .filter(text => text && text.length > 50) // Filter out short paragraphs
              .join('\\n\\n');

            if (content) {
              return {
                title: document.querySelector('h1, title')?.textContent?.trim() || 'Untitled Interview',
                content: content,
                source: 'paragraphs'
              };
            }
            return null;
          },

          // Strategy 3: Get all text content as fallback
          () => {
            const bodyText = document.body.textContent?.trim() || '';
            if (bodyText.length > 500) {
              return {
                title: document.querySelector('h1, title')?.textContent?.trim() || 'Untitled Interview',
                content: bodyText,
                source: 'body'
              };
            }
            return null;
          }
        ];

        for (const strategy of strategies) {
          const result = strategy();
          if (result && result.content) {
            return result;
          }
        }

        return null;
      });

      if (!interviewData || !interviewData.content) {
        throw new Error('Could not extract interview content');
      }

      // Clean up the content
      interviewData.content = this.cleanContent(interviewData.content);
      interviewData.url = url;
      interviewData.scrapedAt = new Date().toISOString();

      logger.info(`Successfully scraped interview: ${interviewData.title} (${interviewData.content.length} characters)`);
      return interviewData;

    } catch (error) {
      logger.error(`Failed to scrape interview ${url}:`, error);
      throw error;
    }
  }

  cleanContent(content) {
    return content
      .replace(/\\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\\n\\s*\\n/g, '\\n\\n') // Clean up paragraph breaks
      .replace(/[^\\x20-\\x7E\\n]/g, '') // Remove non-printable characters except newlines
      .trim();
  }

  async getRandomInterview() {
    try {
      const urls = await this.getInterviewUrls();

      if (urls.length === 0) {
        throw new Error('No interview URLs found');
      }

      const randomUrl = urls[Math.floor(Math.random() * urls.length)];
      logger.info(`Selected random interview: ${randomUrl}`);

      const interview = await this.scrapeInterview(randomUrl);
      return interview;

    } catch (error) {
      logger.error('Failed to get random interview:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      logger.info('Browser closed successfully');
    } catch (error) {
      logger.error('Error closing browser:', error);
    }
  }
}

export { InterviewScraper };