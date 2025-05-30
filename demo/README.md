# react-shahmat Demo

This demo application showcases the react-shahmat chess board component with Stockfish engine integration. It demonstrates how to build a complete chess playing interface with AI opponent support.

**Disclaimer:** This demo was entirely created by Claude Code. The code quality and architecture may not meet typical production standards.

## Features

- **Stockfish Integration** - Play against a strong chess engine
- **Multiple Difficulty Levels** - Adjustable engine strength
- **Analysis Mode** - View engine evaluation and best moves
- **Responsive Design** - Works on desktop and mobile
- **Full Game Controls** - Reset, undo, position setup

## Development

### Prerequisites

- Node.js 16 or higher
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm start
```

The demo will be available at http://localhost:3000

### Build

```bash
# Build for production
npm run build
```

## Usage

1. **Playing Against AI**: Select difficulty level and make your moves
2. **Analysis**: Toggle analysis mode to see engine evaluation
3. **Position Setup**: Use FEN input to set custom positions
4. **Game Controls**: Reset game or undo moves as needed

## Stockfish Integration

The demo uses the official Stockfish WASM build for chess analysis and AI moves. Stockfish files are automatically copied to the public directory during build.

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production  
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Technology Stack

- React 19
- TypeScript
- react-shahmat (chess board component)
- Stockfish WASM (chess engine)
- Create React App (build tooling)

## License

MIT