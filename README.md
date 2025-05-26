# Shahist - Online Chess Game

A modern chess game implementation with a React frontend and a Rust chess engine compiled to WebAssembly.

## Features

- **React Frontend**: Built with TypeScript and Create React App
- **Rust Chess Engine**: High-performance chess logic compiled to WebAssembly
- **Drag & Drop Interface**: Intuitive piece movement with React DnD
- **Real-time Validation**: Move validation handled by the Rust engine
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Clean, polished design with smooth animations

## Project Structure

```
shahist/
├── frontend/           # React TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChessBoard.tsx
│   │   │   └── ChessBoard.css
│   │   ├── chess-engine/  # Generated WASM bindings
│   │   └── ...
│   └── ...
├── chess-engine/       # Rust chess engine
│   ├── src/
│   │   ├── lib.rs
│   │   ├── chess.rs    # Core chess logic
│   │   └── utils.rs
│   ├── Cargo.toml
│   └── pkg/           # Generated WASM package
└── README.md
```

## Development

### Prerequisites

- Node.js (v14 or later)
- Rust (latest stable)
- wasm-pack

### Setup

1. **Build the chess engine:**
   ```bash
   cd chess-engine
   wasm-pack build --target web
   ```

2. **Start the frontend:**
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Access the game:**
   Open http://localhost:3000 in your browser

### Building for Production

```bash
# Build the chess engine
cd chess-engine
wasm-pack build --target web

# Build the frontend
cd ../frontend
npm run build
```

## Architecture

### Chess Engine (Rust)

The chess engine is implemented in Rust and provides:

- Complete chess rule implementation
- Move validation and generation
- Board state management
- WebAssembly bindings for JavaScript interop

Key components:
- `ChessBoard`: Main game state and logic
- `Piece`: Piece types and colors
- `Position`: Board coordinates (file/rank)
- `Move`: Move representation with optional promotion

### Frontend (React)

The frontend provides:

- Interactive chess board component
- Drag & drop piece movement
- Visual feedback for valid moves
- Game controls (new game, current player display)
- Responsive design for mobile devices

## Game Features

- **Standard Chess Rules**: Full implementation of chess rules
- **Move Validation**: All moves are validated by the engine
- **Visual Feedback**: Highlighted squares show valid moves
- **Drag & Drop**: Intuitive piece movement
- **Click to Move**: Alternative movement method
- **New Game**: Reset board to starting position
- **Turn Indicator**: Shows current player

## Browser Compatibility

The game works in all modern browsers that support WebAssembly:
- Chrome 57+
- Firefox 52+
- Safari 11+
- Edge 16+

## License

This project is open source and available under the MIT License.