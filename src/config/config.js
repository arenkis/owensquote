import dotenv from 'dotenv';
import Joi from 'joi';
import os from 'os';
import { logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

// Configuration schema for validation
const configSchema = Joi.object({
  // Environment
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly').default('info'),

  // AI Provider Configuration
  AI_PROVIDER: Joi.string().valid('openai', 'anthropic', 'gemini', 'ollama', 'transformers').default('openai').description('AI provider to use'),

  // Platform-specific AI Provider Configuration (optional overrides)
  AI_PROVIDER_WINDOWS: Joi.string().valid('', 'openai', 'anthropic', 'gemini', 'ollama', 'transformers').optional().description('AI provider to use on Windows (overrides AI_PROVIDER)'),
  AI_PROVIDER_MACOS: Joi.string().valid('', 'openai', 'anthropic', 'gemini', 'ollama', 'transformers').optional().description('AI provider to use on macOS (overrides AI_PROVIDER)'),
  AI_PROVIDER_LINUX: Joi.string().valid('', 'openai', 'anthropic', 'gemini', 'ollama', 'transformers').optional().description('AI provider to use on Linux (overrides AI_PROVIDER)'),

  // OpenAI Configuration
  OPENAI_API_KEY: Joi.string().optional().description('OpenAI API key'),
  OPENAI_MODEL: Joi.string().default('gpt-4o-mini').description('OpenAI model to use'),

  // Anthropic Configuration
  ANTHROPIC_API_KEY: Joi.string().optional().description('Anthropic API key'),
  ANTHROPIC_MODEL: Joi.string().default('claude-3-5-haiku-20241022').description('Anthropic model to use'),

  // Gemini Configuration
  GEMINI_API_KEY: Joi.string().optional().description('Gemini API key'),
  GEMINI_MODEL: Joi.string().default('gemini-1.5-flash').description('Gemini model to use'),

  // Ollama Configuration
  OLLAMA_BASE_URL: Joi.string().default('http://localhost:11434/v1').description('Ollama server base URL'),
  OLLAMA_MODEL: Joi.string().default('qwen2.5:1.5b').description('Ollama model to use'),

  // Transformers.js Configuration
  TRANSFORMERS_MODEL: Joi.string().default('Xenova/LaMini-Flan-T5-248M').description('Transformers.js model to use'),

  // Common AI Configuration
  AI_MAX_TOKENS: Joi.number().integer().min(100).max(2000).default(500),
  AI_TEMPERATURE: Joi.number().min(0).max(2).default(0.7),

  // Email Configuration
  EMAIL_HOST: Joi.string().required().description('SMTP host for sending emails'),
  EMAIL_PORT: Joi.number().integer().min(1).max(65535).default(587),
  EMAIL_SECURE: Joi.boolean().default(false).description('Use TLS for email'),
  EMAIL_USER: Joi.string().email().required().description('Email username'),
  EMAIL_PASSWORD: Joi.string().required().description('Email password or app password'),
  EMAIL_FROM: Joi.string().optional().description('From email address with optional display name (defaults to EMAIL_USER)'),

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

    // Additional validation for platform-specific provider requirements
    this.validatePlatformSpecificRequirements();

    this.isValid = true;
    logger.info('Configuration validated successfully');
  }

  validatePlatformSpecificRequirements() {
    // Get platform-specific provider directly without using the method that checks isValid
    const platform = os.platform();
    let platformProvider;

    switch (platform) {
      case 'win32':
        platformProvider = this.validated.AI_PROVIDER_WINDOWS;
        break;
      case 'darwin':
        platformProvider = this.validated.AI_PROVIDER_MACOS;
        break;
      case 'linux':
        platformProvider = this.validated.AI_PROVIDER_LINUX;
        break;
      default:
        platformProvider = null;
    }

    const provider = (platformProvider && platformProvider.trim() !== '') ? platformProvider : this.validated.AI_PROVIDER;
    const issues = [];

    // Check if API key is required and present for the selected provider
    switch (provider) {
      case 'openai':
        if (!this.validated.OPENAI_API_KEY) {
          issues.push('OPENAI_API_KEY is required when using OpenAI provider');
        }
        break;
      case 'anthropic':
        if (!this.validated.ANTHROPIC_API_KEY) {
          issues.push('ANTHROPIC_API_KEY is required when using Anthropic provider');
        }
        break;
      case 'gemini':
        if (!this.validated.GEMINI_API_KEY) {
          issues.push('GEMINI_API_KEY is required when using Gemini provider');
        }
        break;
      case 'ollama':
      case 'transformers':
        // No API key required
        break;
    }

    if (issues.length > 0) {
      logger.error('Platform-specific configuration validation failed:', issues);
      throw new Error(`Platform-specific configuration validation failed: ${issues.join(', ')}`);
    }
  }

  get(key) {
    if (!this.isValid) {
      throw new Error('Configuration not validated');
    }
    return this.validated[key];
  }

  getPlatformSpecificProvider() {
    const platform = os.platform();
    let platformProvider;

    switch (platform) {
      case 'win32':
        platformProvider = this.get('AI_PROVIDER_WINDOWS');
        break;
      case 'darwin':
        platformProvider = this.get('AI_PROVIDER_MACOS');
        break;
      case 'linux':
        platformProvider = this.get('AI_PROVIDER_LINUX');
        break;
      default:
        platformProvider = null;
    }

    // Return platform-specific provider if set and not empty, otherwise fall back to general AI_PROVIDER
    const finalProvider = (platformProvider && platformProvider.trim() !== '') ? platformProvider : this.get('AI_PROVIDER');

    logger.debug(`Platform: ${platform}, Provider: ${finalProvider} ${platformProvider ? '(platform-specific)' : '(default)'}`);

    return finalProvider;
  }

  getAIConfig() {
    const provider = this.getPlatformSpecificProvider();
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
      case 'ollama':
        return {
          ...config,
          baseURL: this.get('OLLAMA_BASE_URL'),
          model: this.get('OLLAMA_MODEL')
        };
      case 'transformers':
        return {
          ...config,
          model: this.get('TRANSFORMERS_MODEL')
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

    // Add platform information
    sanitized.CURRENT_PLATFORM = os.platform();
    sanitized.EFFECTIVE_AI_PROVIDER = this.getPlatformSpecificProvider();

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

  // Get platform-specific configuration info
  getPlatformInfo() {
    const platform = os.platform();
    const effectiveProvider = this.getPlatformSpecificProvider();
    const defaultProvider = this.get('AI_PROVIDER');

    return {
      platform: platform,
      architecture: os.arch(),
      osVersion: os.release(),
      defaultProvider: defaultProvider,
      effectiveProvider: effectiveProvider,
      isPlatformSpecific: effectiveProvider !== defaultProvider,
      platformSettings: {
        windows: this.get('AI_PROVIDER_WINDOWS'),
        macos: this.get('AI_PROVIDER_MACOS'),
        linux: this.get('AI_PROVIDER_LINUX')
      }
    };
  }

  // Validate that all required services can be reached
  async validateConnections() {
    const issues = [];

    // Validate API key formats based on provider
    const provider = this.getPlatformSpecificProvider();
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
      case 'ollama':
        // No API key validation needed for Ollama
        break;
      case 'transformers':
        // No API key validation needed for Transformers.js
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
# Choose one: 'openai', 'anthropic', 'gemini', 'ollama', or 'transformers'
AI_PROVIDER=openai

# Platform-specific AI Provider Configuration (optional overrides)
# If left blank, will use AI_PROVIDER setting above
AI_PROVIDER_WINDOWS=
AI_PROVIDER_MACOS=
AI_PROVIDER_LINUX=

# OpenAI Configuration (if using OpenAI)
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini

# Anthropic Configuration (if using Anthropic/Claude)
ANTHROPIC_API_KEY=sk-ant-api03-your-anthropic-api-key-here
ANTHROPIC_MODEL=claude-3-5-haiku-20241022

# Gemini Configuration (if using Google Gemini)
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-1.5-flash

# Ollama Configuration (if using local Ollama)
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=qwen2.5:1.5b

# Transformers.js Configuration (if using local Transformers.js)
TRANSFORMERS_MODEL=Xenova/LaMini-Flan-T5-248M

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