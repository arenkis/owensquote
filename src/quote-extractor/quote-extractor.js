import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { pipeline } from '@xenova/transformers';
import { logger } from '../utils/logger.js';

class QuoteExtractor {
  constructor(config) {
    if (!config || !config.provider) {
      throw new Error('AI provider configuration is required');
    }

    // Some providers don't require API keys (ollama, transformers)
    if (!config.apiKey && !['ollama', 'transformers'].includes(config.provider)) {
      throw new Error('API key is required for this provider');
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
      case 'ollama':
        return new OpenAI({
          baseURL: this.config.baseURL || 'http://localhost:11434/v1',
          apiKey: 'ollama' // Ollama doesn't require real API key
        });
      case 'transformers':
        return null; // Will be initialized when needed
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

IMPORTANT: If you cannot find any meaningful quotes in the content, return exactly "ERROR_NO_QUOTE" (without quotes). Do not return explanations like "I was unable to find quotes" or similar text.

Return ONLY the quote itself, without quotation marks, attribution, or additional commentary. The quote should be complete and make sense on its own. If no quote can be found, return exactly "ERROR_NO_QUOTE".`;
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
        case 'ollama':
          response = await this.extractWithOllama(prompt);
          break;
        case 'transformers':
          response = await this.extractWithTransformers(prompt);
          break;
        default:
          throw new Error(`Unsupported provider: ${this.provider}`);
      }

      const cleanedQuote = this.cleanQuote(response);

      if (!cleanedQuote || cleanedQuote === 'ERROR_NO_QUOTE') {
        logger.warn('AI returned error flag or no valid quote found');
        return null; // Return null to indicate no quote found
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

  async extractWithOllama(prompt) {
    const completion = await this.client.chat.completions.create({
      model: this.config.model || 'qwen2.5:1.5b',
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
      max_tokens: this.config.maxTokens || 300,
      temperature: this.config.temperature || 0.7
    });

    return completion.choices[0]?.message?.content;
  }

  async extractWithTransformers(prompt) {
    // Initialize the pipeline if not already done
    if (!this.transformersPipeline) {
      logger.info('Initializing Transformers.js pipeline...');
      this.transformersPipeline = await pipeline(
        'text2text-generation',
        this.config.model || 'Xenova/LaMini-Flan-T5-248M',
        { device: 'cpu' }
      );
    }

    // For the small T5 model, we need a simpler, more direct prompt
    // Extract content from the full prompt since we only have access to prompt here
    const contentMatch = prompt.match(/Interview Content:\s*(.*?)(?:\n\nInstructions:|$)/s);
    const content = contentMatch ? contentMatch[1] : prompt;

    const simplePrompt = `Extract the most meaningful quote from this Rick Owens interview that shows his philosophy or vision:\n\n${content.substring(0, 2000)}\n\nMost meaningful quote:`;

    const result = await this.transformersPipeline(simplePrompt, {
      max_length: this.config.maxTokens || 100,
      temperature: this.config.temperature || 0.7,
      do_sample: true
    });

    return result[0]?.generated_text || '';
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