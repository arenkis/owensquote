import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

class InterviewReader {
  constructor(options = {}) {
    this.filePath = options.interviewsFilePath || options.filePath || path.join(process.cwd(), 'data', 'interviews.json');
    this.interviews = null;
    this.lastLoadTime = null;
  }

  async loadInterviews() {
    try {
      logger.info(`Loading interviews from ${this.filePath}`);

      const fileContent = await fs.readFile(this.filePath, 'utf8');
      const data = JSON.parse(fileContent);

      // Expect array format: [{"url": "...", "text": "..."}]
      if (!Array.isArray(data)) {
        throw new Error('Interview data must be an array of objects');
      }

      // Validate and process each interview
      this.interviews = data
        .filter(interview => interview && interview.url && interview.text)
        .map((interview, index) => ({
          id: `interview-${index + 1}`,
          url: interview.url,
          title: this.extractTitle(interview.text, interview.url),
          content: this.cleanContent(interview.text),
          source: this.extractSource(interview.url),
          loadedAt: new Date().toISOString()
        }))
        .filter(interview => interview.content.length > 100); // Filter out very short content

      this.lastLoadTime = Date.now();

      logger.info(`Loaded ${this.interviews.length} interviews successfully`);
      return this.interviews;

    } catch (error) {
      logger.error('Failed to load interviews:', error);
      throw error;
    }
  }

  extractTitle(text, url) {
    // Try to extract title from the beginning of the text
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // Look for title-like content in the first few lines
    for (const line of lines.slice(0, 5)) {
      // Skip very short lines or lines that look like navigation
      if (line.length < 10 || line.toLowerCase().includes('home') || line.toLowerCase().includes('about')) {
        continue;
      }

      // If line looks like a title (reasonable length, not too long)
      if (line.length >= 10 && line.length <= 100 && !line.includes('.com')) {
        return line;
      }
    }

    // Fallback: extract from URL
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.split('/').filter(p => p.length > 0).pop() || 'interview';
      return pathname.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    } catch {
      return 'Interview';
    }
  }

  extractSource(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Unknown Source';
    }
  }

  cleanContent(content) {
    return content
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n\n') // Clean up paragraph breaks
      .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable characters except newlines
      .trim();
  }

  async getRandomInterview() {
    try {
      // Load interviews if not already loaded or if stale
      if (!this.interviews || (Date.now() - this.lastLoadTime > 300000)) { // Reload after 5 minutes
        await this.loadInterviews();
      }

      if (!this.interviews || this.interviews.length === 0) {
        throw new Error('No interviews available');
      }

      const randomInterview = this.interviews[Math.floor(Math.random() * this.interviews.length)];

      logger.info(`Selected random interview: "${randomInterview.title}" from ${randomInterview.source}`);
      logger.debug(`Interview content length: ${randomInterview.content.length} characters`);

      return randomInterview;

    } catch (error) {
      logger.error('Failed to get random interview:', error);
      throw error;
    }
  }

  async getAllInterviews() {
    try {
      if (!this.interviews || (Date.now() - this.lastLoadTime > 300000)) {
        await this.loadInterviews();
      }

      return this.interviews || [];
    } catch (error) {
      logger.error('Failed to get all interviews:', error);
      throw error;
    }
  }

  async getInterviewById(id) {
    try {
      const interviews = await this.getAllInterviews();
      const interview = interviews.find(i => i.id === id);

      if (!interview) {
        throw new Error(`Interview with id "${id}" not found`);
      }

      return interview;
    } catch (error) {
      logger.error(`Failed to get interview by id "${id}":`, error);
      throw error;
    }
  }

  getStats() {
    if (!this.interviews) {
      return { total: 0, averageLength: 0 };
    }

    const totalLength = this.interviews.reduce((sum, interview) => sum + interview.content.length, 0);

    return {
      total: this.interviews.length,
      averageLength: Math.round(totalLength / this.interviews.length),
      sources: [...new Set(this.interviews.map(i => i.source))],
      lastLoaded: new Date(this.lastLoadTime).toISOString()
    };
  }

  // Reload interviews from file (useful for development)
  async reload() {
    this.interviews = null;
    this.lastLoadTime = null;
    return await this.loadInterviews();
  }
}

export { InterviewReader };