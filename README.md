# OWENSQUOTE

A sophisticated Node.js application that extracts meaningful quotes from Rick Owens interviews using AI and delivers them via beautifully designed emails with a Rick Owens-inspired aesthetic.

## Features

- 🤖 **Multi-AI Provider Support**: Works with OpenAI, Anthropic (Claude), Google Gemini, Ollama, and Transformers.js
- 🏠 **Local LLM Support**: Run completely offline with Ollama or Transformers.js
- 📧 **Rick Owens Aesthetic Emails**: Brutalist-inspired HTML email design
- 📅 **Scheduled Delivery**: Automated daily quotes via cron scheduling
- 🎯 **Smart Quote Extraction**: AI-powered selection of meaningful, philosophical quotes
- 📱 **Responsive Design**: Email templates optimized for all devices
- 🔒 **Privacy-First**: Option to run entirely local with no API calls

## Quick Start

### 1. Installation

```bash
git clone <your-repo-url>
cd rick-owens-quote
npm install
```

### 2. Configuration

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Choose your AI provider
AI_PROVIDER=openai  # or 'anthropic', 'gemini', 'ollama', or 'transformers'

# Optional: Platform-specific overrides
AI_PROVIDER_WINDOWS=ollama
AI_PROVIDER_MACOS=anthropic
AI_PROVIDER_LINUX=

# Add your API key (not needed for local providers)
OPENAI_API_KEY=sk-your-key-here

# Email configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="OWENSQUOTE" <your-email@gmail.com>
EMAIL_RECIPIENTS=recipient@example.com

# Test mode
RUN_ONCE=true
```

### 3. Add Interview Data

Place your interview data in `data/interviews.json`:

```json
[
  {
    "url": "https://example.com/interview",
    "text": "Interview content here..."
  }
]
```

### 4. Test Run

```bash
npm run test-once
```

## AI Provider Setup

### OpenAI
```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini
```

### Anthropic (Claude)
```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-api03-your-key
ANTHROPIC_MODEL=claude-3-5-haiku-20241022
```

### Google Gemini
```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-1.5-flash
```

### Ollama (Local)
```bash
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=qwen2.5:1.5b
```

**Setup Ollama:**
1. Install Ollama from https://ollama.ai/download
2. Pull a model: `ollama pull qwen2.5:1.5b`
3. Ensure Ollama is running: `ollama serve`

**Recommended models:**
- `qwen2.5:0.5b` (394MB) - Ultra lightweight
- `qwen2.5:1.5b` (934MB) - Good balance
- `llama3.1:8b` (4.7GB) - High quality

### Transformers.js (Local, No Dependencies)
```bash
AI_PROVIDER=transformers
TRANSFORMERS_MODEL=Xenova/LaMini-Flan-T5-248M
```

**Features:**
- Runs entirely in Node.js
- No external dependencies required
- Model downloads automatically (~95MB)
- Perfect fallback option

## Platform-Specific Configuration

You can configure different AI providers for different operating systems. This is useful when you want to use local models on some platforms and cloud APIs on others.

### Basic Usage

Add platform-specific overrides to your `.env` file:

```bash
# Default provider for all platforms
AI_PROVIDER=openai

# Platform-specific overrides (optional)
AI_PROVIDER_WINDOWS=ollama
AI_PROVIDER_MACOS=anthropic
AI_PROVIDER_LINUX=
```

### How It Works

- **If a platform-specific setting is provided**, it overrides the default `AI_PROVIDER`
- **If left blank**, the platform uses the default `AI_PROVIDER` setting
- **Validation occurs for the effective provider** on your current platform

### Example Scenarios

**Scenario 1: Local models on Windows, Cloud API on macOS**
```bash
AI_PROVIDER=openai
AI_PROVIDER_WINDOWS=ollama
AI_PROVIDER_MACOS=anthropic
AI_PROVIDER_LINUX=
```

**Scenario 2: Same provider everywhere**
```bash
AI_PROVIDER=anthropic
AI_PROVIDER_WINDOWS=
AI_PROVIDER_MACOS=
AI_PROVIDER_LINUX=
```

**Scenario 3: Different models per platform**
```bash
AI_PROVIDER=openai
AI_PROVIDER_WINDOWS=ollama    # Local Ollama with llama3.1
AI_PROVIDER_MACOS=anthropic   # Claude API for macOS
AI_PROVIDER_LINUX=transformers # Local transformers.js
```

### Platform Detection

The system automatically detects:
- **Windows** (`win32`)
- **macOS** (`darwin`)
- **Linux** (`linux`)

## Email Setup

### Gmail Setup
1. Enable 2-factor authentication
2. Generate an App Password
3. Use the app password (not your regular password)

```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
EMAIL_FROM="OWENSQUOTE" <your-email@gmail.com>
```

### Other Providers
- **Outlook**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **Custom SMTP**: Configure host and port accordingly

## Usage

### One-time Test
```bash
npm run test-once
```

### Development Mode (with file watching)
```bash
npm run dev
```

### Production Mode (scheduled)
```bash
npm start
```

### Custom Schedule
Set `CRON_SCHEDULE` in `.env`:
```bash
# Daily at 9 AM
CRON_SCHEDULE=0 9 * * *

# Weekly on Monday at 10 AM
CRON_SCHEDULE=0 10 * * 1
```

## Configuration Options

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AI_PROVIDER` | Yes | `openai` | AI provider: `openai`, `anthropic`, `gemini`, `ollama`, or `transformers` |
| `AI_PROVIDER_WINDOWS` | No | - | Windows-specific AI provider (overrides `AI_PROVIDER`) |
| `AI_PROVIDER_MACOS` | No | - | macOS-specific AI provider (overrides `AI_PROVIDER`) |
| `AI_PROVIDER_LINUX` | No | - | Linux-specific AI provider (overrides `AI_PROVIDER`) |
| `OPENAI_API_KEY` | If using OpenAI | - | OpenAI API key |
| `ANTHROPIC_API_KEY` | If using Claude | - | Anthropic API key |
| `GEMINI_API_KEY` | If using Gemini | - | Google Gemini API key |
| `OLLAMA_BASE_URL` | If using Ollama | `http://localhost:11434/v1` | Ollama server URL |
| `OLLAMA_MODEL` | If using Ollama | `qwen2.5:1.5b` | Ollama model name |
| `TRANSFORMERS_MODEL` | If using Transformers.js | `Xenova/LaMini-Flan-T5-248M` | Transformers.js model |
| `AI_MAX_TOKENS` | No | `500` | Maximum tokens for AI response |
| `AI_TEMPERATURE` | No | `0.7` | AI creativity level (0-2) |
| `EMAIL_HOST` | Yes | - | SMTP host |
| `EMAIL_PORT` | No | `587` | SMTP port |
| `EMAIL_USER` | Yes | - | Email username |
| `EMAIL_PASSWORD` | Yes | - | Email password/app password |
| `EMAIL_FROM` | No | Uses `EMAIL_USER` | From address with optional display name |
| `EMAIL_RECIPIENTS` | Yes | - | Comma-separated recipient list |
| `INTERVIEWS_FILE_PATH` | No | `./data/interviews.json` | Path to interview data |
| `CRON_SCHEDULE` | No | `0 9 * * *` | Cron schedule for automation |
| `RUN_ONCE` | No | `false` | Run once then exit (for testing) |
| `LOG_LEVEL` | No | `info` | Logging level |

## Interview Data Format

The `data/interviews.json` file should contain an array of interview objects:

```json
[
  {
    "url": "https://example.com/rick-owens-interview-1",
    "text": "Full interview text content here. This should contain Rick Owens' actual quotes and thoughts about fashion, philosophy, creativity, etc."
  },
  {
    "url": "https://example.com/rick-owens-interview-2",
    "text": "Another interview with more philosophical content..."
  }
]
```

## Copyright Notice

All interviews are copyright of Rick Owens or their respective media outlets and can be found at https://www.rickowens.eu/interviews

## Email Design

The emails feature a Rick Owens-inspired aesthetic:

- **Monochrome palette** (black, white, grays)
- **Bold typography** with Inter font
- **Geometric elements** and linear gradients
- **Minimal brutalism** with sharp edges
- **Dramatic quote presentation** with oversized quote marks
- **Responsive design** for all devices

## Project Structure

```
rick-owens-quote/
├── src/
│   ├── config/           # Configuration management
│   ├── services/         # Interview reading service
│   ├── quote-extractor/  # AI quote extraction
│   ├── email/            # Email sending service
│   ├── utils/            # Logging utilities
│   └── index.js          # Main application
├── data/
│   └── interviews.json   # Interview data
├── logs/                 # Application logs
├── .env.example          # Environment template
└── README.md
```

## Scripts

- `npm start` - Run in production mode (scheduled)
- `npm run dev` - Run in development mode with file watching
- `npm run test-once` - Run once and exit (perfect for testing)

## Troubleshooting

### Common Issues

**Email not sending:**
- Check SMTP credentials in `.env`
- Verify app password setup for Gmail
- Check logs in `logs/` directory

**AI extraction failing:**
- Verify API key is correct and active (for cloud providers)
- Check API quota/billing (for cloud providers)
- For Ollama: ensure Ollama is running and model is pulled
- For Transformers.js: check internet connection for initial download
- Try a different AI provider

**No interviews found:**
- Ensure `data/interviews.json` exists
- Verify JSON format is valid
- Check file path in `INTERVIEWS_FILE_PATH`

### Debug Mode

Set `LOG_LEVEL=debug` in `.env` for detailed logging:

```bash
LOG_LEVEL=debug
npm run test-once
```

### Logs

Check the `logs/` directory for detailed error information and debugging output.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

**OWENSQUOTE** - Bringing Rick Owens' philosophy to your inbox with style.