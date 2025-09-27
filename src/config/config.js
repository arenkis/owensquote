import dotenv from 'dotenv';
import Joi from 'joi';
import { logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

// Configuration schema for validation
const configSchema = Joi.object({
  // Environment
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly').default('info'),

  // AI Provider Configuration
  AI_PROVIDER: Joi.string().valid('openai', 'anthropic', 'gemini').default('openai').description('AI provider to use'),

  // OpenAI Configuration
  OPENAI_API_KEY: Joi.string().when('AI_PROVIDER', { is: 'openai', then: Joi.required(), otherwise: Joi.optional() }).description('OpenAI API key'),
  OPENAI_MODEL: Joi.string().default('gpt-4o-mini').description('OpenAI model to use'),

  // Anthropic Configuration
  ANTHROPIC_API_KEY: Joi.string().when('AI_PROVIDER', { is: 'anthropic', then: Joi.required(), otherwise: Joi.optional() }).description('Anthropic API key'),
  ANTHROPIC_MODEL: Joi.string().default('claude-3-5-haiku-20241022').description('Anthropic model to use'),

  // Gemini Configuration
  GEMINI_API_KEY: Joi.string().when('AI_PROVIDER', { is: 'gemini', then: Joi.required(), otherwise: Joi.optional() }).description('Gemini API key'),
  GEMINI_MODEL: Joi.string().default('gemini-1.5-flash').description('Gemini model to use'),

  // Common AI Configuration
  AI_MAX_TOKENS: Joi.number().integer().min(100).max(2000).default(500),
  AI_TEMPERATURE: Joi.number().min(0).max(2).default(0.7),

  // Email Configuration
  EMAIL_HOST: Joi.string().required().description('SMTP host for sending emails'),
  EMAIL_PORT: Joi.number().integer().min(1).max(65535).default(587),
  EMAIL_SECURE: Joi.boolean().default(false).description('Use TLS for email'),
  EMAIL_USER: Joi.string().email().required().description('Email username'),
  EMAIL_PASSWORD: Joi.string().required().description('Email password or app password'),
  EMAIL_FROM: Joi.string().email().optional().description('From email address (defaults to EMAIL_USER)'),

  // Recipients Configuration
  EMAIL_RECIPIENTS: Joi.string().required().description('Comma-separated list of email recipients'),

  // Data Configuration
  INTERVIEWS_FILE_PATH: Joi.string().default('./data/interviews.json').description('Path to interviews JSON file'),

  // Scheduling Configuration
  CRON_SCHEDULE: Joi.string().default('0 9 * * *').description('Cron schedule for automated runs'),
  RUN_ONCE: Joi.boolean().default(false).description('Run once then exit (for testing)'),

}).unknown(true); // Allow unknown environment variables

class Config {
  constructor() {
    this.raw = process.env;
    this.validated = null;
    this.isValid = false;

    this.validate();
  }

  validate() {
    const { error, value } = configSchema.validate(process.env);

    if (error) {
      logger.error('Configuration validation failed:', error.details);
      throw new Error(`Configuration validation failed: ${error.message}`);
    }

    this.validated = value;
    this.isValid = true;
    logger.info('Configuration validated successfully');
  }

  get(key) {
    if (!this.isValid) {
      throw new Error('Configuration not validated');
    }
    return this.validated[key];
  }

  getAIConfig() {
    const provider = this.get('AI_PROVIDER');
    const config = {
      provider,
      maxTokens: this.get('AI_MAX_TOKENS'),
      temperature: this.get('AI_TEMPERATURE')
    };

    switch (provider) {
      case 'openai':
        return {
          ...config,
          apiKey: this.get('OPENAI_API_KEY'),
          model: this.get('OPENAI_MODEL')
        };
      case 'anthropic':
        return {
          ...config,
          apiKey: this.get('ANTHROPIC_API_KEY'),
          model: this.get('ANTHROPIC_MODEL')
        };
      case 'gemini':
        return {
          ...config,
          apiKey: this.get('GEMINI_API_KEY'),
          model: this.get('GEMINI_MODEL')
        };
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  getEmailConfig() {
    return {
      host: this.get('EMAIL_HOST'),
      port: this.get('EMAIL_PORT'),
      secure: this.get('EMAIL_SECURE'),
      user: this.get('EMAIL_USER'),
      password: this.get('EMAIL_PASSWORD'),
      from: this.get('EMAIL_FROM') || this.get('EMAIL_USER')
    };
  }

  getEmailRecipients() {
    const recipients = this.get('EMAIL_RECIPIENTS');
    return recipients
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);
  }

  getDataConfig() {
    return {
      interviewsFilePath: this.get('INTERVIEWS_FILE_PATH')
    };
  }

  getScheduleConfig() {
    return {
      cronSchedule: this.get('CRON_SCHEDULE'),
      runOnce: this.get('RUN_ONCE')
    };
  }

  isDevelopment() {
    return this.get('NODE_ENV') === 'development';
  }

  isProduction() {
    return this.get('NODE_ENV') === 'production';
  }

  isTest() {
    return this.get('NODE_ENV') === 'test';
  }

  // Get all configuration for debugging (sanitized)
  getDebugInfo() {
    const sanitized = { ...this.validated };

    // Remove sensitive information
    const sensitiveKeys = [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'GEMINI_API_KEY',
      'EMAIL_PASSWORD',
      'EMAIL_USER'
    ];

    sensitiveKeys.forEach(key => {
      if (sanitized[key]) {
        sanitized[key] = '*'.repeat(8);
      }
    });

    return sanitized;
  }

  // Validate that all required services can be reached
  async validateConnections() {
    const issues = [];

    // Validate API key formats based on provider
    const provider = this.get('AI_PROVIDER');
    switch (provider) {
      case 'openai':
        const openaiKey = this.get('OPENAI_API_KEY');
        if (openaiKey && !openaiKey.startsWith('sk-')) {
          issues.push('OpenAI API key should start with "sk-"');
        }
        break;
      case 'anthropic':
        const anthropicKey = this.get('ANTHROPIC_API_KEY');
        if (anthropicKey && !anthropicKey.startsWith('sk-ant-')) {
          issues.push('Anthropic API key should start with "sk-ant-"');
        }
        break;
      case 'gemini':
        const geminiKey = this.get('GEMINI_API_KEY');
        if (geminiKey && geminiKey.length < 20) {
          issues.push('Gemini API key appears to be invalid');
        }
        break;
    }

    // Validate email recipients format
    const recipients = this.getEmailRecipients();
    if (recipients.length === 0) {
      issues.push('At least one email recipient is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    recipients.forEach(email => {
      if (!emailRegex.test(email)) {
        issues.push(`Invalid email format: ${email}`);
      }
    });

    if (issues.length > 0) {
      logger.error('Configuration validation issues:', issues);
      return { valid: false, issues };
    }

    return { valid: true, issues: [] };
  }

  // Create example .env file content
  static generateExampleEnv() {
    return `# Rick Owens Quote Bot Configuration

# Environment
NODE_ENV=development
LOG_LEVEL=info

# AI Provider Configuration
# Choose one: 'openai', 'anthropic', or 'gemini'
AI_PROVIDER=openai

# OpenAI Configuration (if using OpenAI)
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini

# Anthropic Configuration (if using Anthropic/Claude)
ANTHROPIC_API_KEY=sk-ant-api03-your-anthropic-api-key-here
ANTHROPIC_MODEL=claude-3-5-haiku-20241022

# Gemini Configuration (if using Google Gemini)
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-1.5-flash

# Common AI Configuration
AI_MAX_TOKENS=500
AI_TEMPERATURE=0.7

# Email Configuration (Required)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com

# Recipients (Required - comma-separated)
EMAIL_RECIPIENTS=recipient1@example.com,recipient2@example.com

# Data Configuration (Optional)
INTERVIEWS_FILE_PATH=./data/interviews.json

# Scheduling Configuration (Optional)
CRON_SCHEDULE=0 9 * * *
RUN_ONCE=false
`;
  }
}

// Create and export singleton instance
const config = new Config();

export { config, Config };