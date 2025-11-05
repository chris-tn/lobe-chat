# DxAi

A custom AI assistant platform based on LobeChat Community Edition. DxAi provides a streamlined AI chat experience with predefined assistants and enterprise-ready features.

## Features

- **OpenAI Integration**: Seamless integration with OpenAI's GPT models
- **Predefined Assistants**: Ready-to-use AI assistants for common tasks
- **Knowledge Base**: File upload and document processing capabilities
- **Voice Features**: Text-to-Speech (TTS) and Speech-to-Text (STT) support
- **Secure Configuration**: API keys configured via environment variables only
- **Enterprise Ready**: Simplified interface without unnecessary configuration options

## Quick Start

### Prerequisites

- Node.js 18+
- OpenAI API Key
- PostgreSQL database (for production)

### Environment Setup

1. Copy the environment configuration:

```bash
cp env.example .env.local
```

2. Configure your OpenAI API key:

```bash
# Edit .env.local
OPENAI_API_KEY=sk-your-openai-api-key-here
DATABASE_URL=postgresql://username:password@localhost:5432/dxai
```

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Import predefined assistants
npm run import-assistants

# Start development server
npm run dev
```

## Deployment

### Docker Deployment

```bash
# Set environment variables
export OPENAI_API_KEY=sk-your-openai-api-key-here
export DATABASE_URL=postgresql://username:password@host:port/database

# Start with Docker Compose
docker-compose up -d
```

### Vercel Deployment

1. Fork this repository
2. Connect to Vercel
3. Add environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `DATABASE_URL`: Your PostgreSQL database URL
4. Deploy

## Configuration

### Environment Variables

| Variable         | Required | Description                           |
| ---------------- | -------- | ------------------------------------- |
| `OPENAI_API_KEY` | Yes      | OpenAI API key for AI functionality   |
| `DATABASE_URL`   | Yes      | PostgreSQL database connection string |
| `ACCESS_CODE`    | No       | Password to protect your instance     |
| `APP_NAME`       | No       | Application name (default: DxAi)      |
| `APP_URL`        | No       | Application URL for absolute links    |

### Predefined Assistants

DxAi comes with three predefined assistants:

1. **General Assistant** 🤖 - Versatile AI for everyday tasks
2. **Code Assistant** 💻 - Expert programming helper
3. **Writing Assistant** ✍️ - Professional writing and content creation

To customize assistants, edit `config/sample-assistants.json` and run the import script.

## Development

### Project Structure

```
src/
├── app/                    # Next.js app router
├── components/             # React components
├── config/                # Configuration files
├── features/              # Feature modules
├── store/                 # State management
└── styles/                # Styling

config/
├── sample-assistants.json # Predefined assistants
└── featureFlags/          # Feature configuration

scripts/
└── importAssistants.ts    # Assistant import script
```

### Available Scripts

```bash
npm run dev               # Start development server
npm run build             # Build for production
npm run start             # Start production server
npm run db:migrate        # Run database migrations
npm run import-assistants # Import predefined assistants
npm run type-check        # TypeScript type checking
npm run lint              # Run linting
```

## Customization

### Adding New Assistants

1. Edit `config/sample-assistants.json`
2. Add your assistant configuration
3. Run `npm run import-assistants`

### Branding

Update branding in `packages/const/src/branding.ts`:

- `BRANDING_NAME`: Application name
- `BRANDING_EMAIL`: Contact emails
- `BRANDING_LOGO_URL`: Logo URL (when available)

### Feature Flags

Control features in `src/config/featureFlags/schema.ts`:

- `knowledge_base`: Enable/disable knowledge base
- `speech_to_text`: Enable/disable TTS/STT
- `dalle`: Enable/disable image generation

## Security

- API keys are only configurable via environment variables
- No user-facing configuration interfaces for sensitive settings
- Access code protection available
- All external links to LobeHub removed

## Support

For support and questions:

- Email: <support@dxai.com>
- Documentation: \[Add your documentation URL]

## License

MIT License - See LICENSE file for details.

## Acknowledgments

Built on top of [LobeChat Community Edition](https://github.com/lobehub/lobe-chat) - an excellent open-source AI chat framework.
