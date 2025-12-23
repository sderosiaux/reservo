# Reservo

A reservation engine built with Node.js and TypeScript.

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration
```

### Linting and Formatting

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

## Project Structure

```
src/
├── domain/               # Domain layer (entities, value objects, events)
│   ├── entities/
│   ├── value-objects/
│   └── events/
├── application/          # Application layer (use cases, services)
│   └── services/
├── infrastructure/       # Infrastructure layer (persistence, HTTP)
│   ├── persistence/
│   │   ├── repositories/
│   │   └── schema/
│   └── http/
│       └── routes/
├── config/              # Configuration
└── index.ts            # Entry point

tests/
├── unit/               # Unit tests
└── integration/        # Integration tests
```

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Web Framework**: Fastify
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod
- **Logging**: Pino
- **Testing**: Vitest
- **Code Quality**: ESLint, Prettier
