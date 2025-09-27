# OWENSQUOTE

A sophisticated Node.js application that extracts meaningful quotes from Rick Owens interviews using AI and delivers them via beautifully designed emails with a Rick Owens-inspired aesthetic.

## Features

- 🤖 **Multi-AI Provider Support**: Works with OpenAI, Anthropic (Claude), and Google Gemini
- 📧 **Rick Owens Aesthetic Emails**: Brutalist-inspired HTML email design
- 📅 **Scheduled Delivery**: Automated daily quotes via cron scheduling
- 🎯 **Smart Quote Extraction**: AI-powered selection of meaningful, philosophical quotes
- 📱 **Responsive Design**: Email templates optimized for all devices

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
AI_PROVIDER=openai  # or 'anthropic' or 'gemini'

# Add your API key
OPENAI_API_KEY=sk-your-key-here

# Email configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
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
| `AI_PROVIDER` | Yes | `openai` | AI provider: `openai`, `anthropic`, or `gemini` |
| `OPENAI_API_KEY` | If using OpenAI | - | OpenAI API key |
| `ANTHROPIC_API_KEY` | If using Claude | - | Anthropic API key |
| `GEMINI_API_KEY` | If using Gemini | - | Google Gemini API key |
| `AI_MAX_TOKENS` | No | `500` | Maximum tokens for AI response |
| `AI_TEMPERATURE` | No | `0.7` | AI creativity level (0-2) |
| `EMAIL_HOST` | Yes | - | SMTP host |
| `EMAIL_PORT` | No | `587` | SMTP port |
| `EMAIL_USER` | Yes | - | Email username |
| `EMAIL_PASSWORD` | Yes | - | Email password/app password |
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
- Verify API key is correct and active
- Check API quota/billing
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