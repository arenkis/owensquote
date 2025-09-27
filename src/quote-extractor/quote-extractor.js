import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';

class QuoteExtractor {
  constructor(config) {
    if (!config || !config.provider || !config.apiKey) {
      throw new Error('AI provider configuration is required');
    }

    this.config = config;
    this.provider = config.provider;
    this.client = this.initializeClient();
  }

  initializeClient() {
    switch (this.provider) {
      case 'openai':
        return new OpenAI({ apiKey: this.config.apiKey });
      case 'anthropic':
        return new Anthropic({ apiKey: this.config.apiKey });
      case 'gemini':
        return new GoogleGenerativeAI(this.config.apiKey);
      default:
        throw new Error(`Unsupported AI provider: ${this.provider}`);
    }
  }

  buildPrompt(content, title) {
    return `Please extract the most meaningful and impactful quote from this Rick Owens interview. Focus on quotes that capture his philosophy, aesthetic vision, or unique perspective.

Interview Title: "${title}"

Interview Content:
${content}

Instructions:
1. Choose a quote that is authentic to Rick Owens' voice and style
2. Select something philosophically interesting or aesthetically profound
3. Avoid quotes about fashion logistics or business details
4. The quote should be memorable and thought-provoking
5. It should represent his artistic vision

Return ONLY the quote itself, without quotation marks, attribution, or additional commentary. The quote should be complete and make sense on its own.`;
  }

  async extractQuotes(content, title) {
    try {
      logger.info(`Extracting quotes using ${this.provider} from interview: ${title}`);

      const prompt = this.buildPrompt(content, title);
      let response;

      switch (this.provider) {
        case 'openai':
          response = await this.extractWithOpenAI(prompt);
          break;
        case 'anthropic':
          response = await this.extractWithAnthropic(prompt);
          break;
        case 'gemini':
          response = await this.extractWithGemini(prompt);
          break;
        default:
          throw new Error(`Unsupported provider: ${this.provider}`);
      }

      const cleanedQuote = this.cleanQuote(response);

      if (!cleanedQuote) {
        throw new Error('No valid quote extracted from response');
      }

      logger.info(`Successfully extracted quote (${cleanedQuote.length} characters)`);
      logger.debug(`Extracted quote: "${cleanedQuote.substring(0, 100)}..."`);

      // Return as array for compatibility with existing code
      return [{
        text: cleanedQuote,
        source: this.provider,
        extractedAt: new Date().toISOString()
      }];

    } catch (error) {
      logger.error(`Failed to extract quotes using ${this.provider}:`, error);
      throw error;
    }
  }

  async extractWithOpenAI(prompt) {
    const completion = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: `You are an expert at identifying meaningful, thought-provoking quotes from Rick Owens interviews. Extract the most impactful quote that captures Rick's philosophy, aesthetic vision, or unique perspective.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature
    });

    return completion.choices[0]?.message?.content;
  }

  async extractWithAnthropic(prompt) {
    const message = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return message.content[0]?.text;
  }

  async extractWithGemini(prompt) {
    const model = this.client.getGenerativeModel({
      model: this.config.model,
      generationConfig: {
        maxOutputTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  cleanQuote(rawQuote) {
    if (!rawQuote) return null;

    return rawQuote
      .trim()
      .replace(/^["'"'"`]/, '') // Remove starting quotes
      .replace(/["'"'"`]$/, '') // Remove ending quotes
      .replace(/^- /, '') // Remove leading dash
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Legacy method for backwards compatibility
  async extractQuote(interviewData) {
    const quotes = await this.extractQuotes(interviewData.content, interviewData.title);
    return quotes[0]?.text || null;
  }

  // Get provider info for debugging
  getProviderInfo() {
    return {
      provider: this.provider,
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature
    };
  }
}

export { QuoteExtractor };