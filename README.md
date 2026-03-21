# react-shahmat

A React chess board component with a controlled API, animations, and sound effects. The board is a pure view + interaction layer — you own the game state, whether it comes from a built-in engine, a chess server, or your own logic.

## Installation

```bash
npm install react-shahmat
# or
yarn add react-shahmat
```

## Quick Start

The fastest way to get a working chess board is with the `useChessGame` hook, which wraps the built-in engine and produces all the props `ChessBoard` needs:

```tsx
import { ChessBoard, useChessGame } from 'react-shahmat';

function App() {
  const game = useChessGame();

  return (
    <div style={{ width: 500, height: 500 }}>
      <ChessBoard {...game.boardProps} />
    </div>
  );
}
```

## Controlled API

`ChessBoard` is a controlled component (like `<input value={...} onChange={...}>`). The consumer provides the position, valid moves, and handles move callbacks:

```tsx
import { ChessBoard, BoardMove, ValidMovesMap } from 'react-shahmat';

function ControlledBoard() {
  const [position, setPosition] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [validMoves, setValidMoves] = useState<ValidMovesMap>(new Map());
  const [lastMove, setLastMove] = useState<BoardMove>();

  const handleMove = (move: BoardMove) => {
    // Validate and apply the move with your own engine/server
    sendToServer(move).then(response => {
      setPosition(response.fen);
      setValidMoves(response.validMoves);
      setLastMove(move);
    });
  };

  return (
    <ChessBoard
      position={position}
      validMoves={validMoves}
      lastMove={lastMove}
      onMove={handleMove}
    />
  );
}
```

This makes react-shahmat suitable for:
- **Chess servers** — position and moves come from a remote API
- **Custom engines** — use chess.js, Stockfish, or your own move generator
- **Analysis boards** — navigate through move trees
- **Puzzle trainers** — provide only the correct move(s) as valid
- **Chess variants** — the board doesn't enforce standard chess rules

## Playing Against an AI

Use `useChessGame` with `whiteMovable`/`blackMovable` to control which side is human. Feed AI moves via `game.makeMove()`:

```tsx
import { ChessBoard, useChessGame, GameState, BoardMove } from 'react-shahmat';

function AIGame() {
  const game = useChessGame({
    blackMovable: false, // AI plays black
    onPositionChange: async (gameState: GameState) => {
      if (gameState.currentPlayer === 1 && !gameState.isGameOver) {
        const aiMove = await getAIMove(gameState.fen);
        game.makeMove(aiMove);
      }
    },
  });

  return <ChessBoard {...game.boardProps} orientation="white" />;
}
```

## Features

- **Controlled component** — you own game state, the board is a view layer
- **Built-in engine** (optional) — `useChessGame` hook for quick setup
- **Touch and mouse support** — drag-and-drop with react-dnd
- **Premoves** — queue moves during opponent's turn, with stacking support
- **Piece animations** — smooth movement with easing
- **Sound effects** — move, capture, check, checkmate, promotion, premove sounds
- **Visual indicators** — last move highlight, valid move dots, check highlight, game end badges
- **Right-click interactions** — draw arrows and highlight squares
- **Responsive** — auto-sizes to container, or set a fixed size
- **Themeable** — CSS custom properties for board colors
- **TypeScript** — full type definitions

## ChessBoard Props

### Position & State

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `string` | **(required)** | FEN string for the current position |
| `orientation` | `'white' \| 'black'` | `'white'` | Which side faces the player |
| `turnColor` | `'white' \| 'black'` | from FEN | Whose turn it is |
| `lastMove` | `BoardMove` | — | Last move to highlight (from/to squares) |
| `check` | `string` | — | Square with king in check (e.g. `'e1'`) |
| `validMoves` | `ValidMovesMap` | — | Legal moves: `Map<fromSquare, toSquares[]>` |
| `gameEndOverlay` | `GameEndOverlay` | — | Checkmate/stalemate/draw badge configuration |

### Callbacks

| Prop | Type | Description |
|------|------|-------------|
| `onMove` | `(move: BoardMove) => void` | User completed a move |
| `onPremove` | `(move: BoardMove) => void` | User queued a premove |
| `onPremoveClear` | `() => void` | Premoves were cleared (right-click) |
| `onPlaySound` | `(sound: MoveSound) => void` | Sound event (override built-in sounds) |

### Interactivity

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `whiteMovable` | `boolean` | `true` | Whether white pieces are interactive |
| `blackMovable` | `boolean` | `true` | Whether black pieces are interactive |
| `enablePremoves` | `boolean` | `true` | Enable premove functionality |
| `showMoveIndicators` | `boolean` | `true` | Show valid move dots/rings |
| `autoPromotionPiece` | `PromotionPiece` | — | Auto-promote pawns (skip dialog) |
| `premoveCandidates` | `(piece, square) => Square[]` | built-in | Custom premove movement patterns |

### Visual

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `number` | responsive | Fixed board size in pixels |
| `showCoordinates` | `boolean` | `true` | Show rank/file labels |
| `enableAnimations` | `boolean` | `true` | Enable piece animations |
| `animationDuration` | `number` | `300` | Animation duration (ms) |
| `enableSounds` | `boolean` | `true` | Enable built-in sounds |
| `enableArrows` | `boolean` | `true` | Enable right-click arrows |
| `enableHighlights` | `boolean` | `true` | Enable right-click highlights |
| `className` | `string` | — | Additional CSS class |
| `style` | `CSSProperties` | — | Inline styles (for CSS custom properties) |

## useChessGame Hook

Wraps the built-in chess engine and produces props for `ChessBoard`:

```tsx
const game = useChessGame({
  initialFen?: string,           // Starting position (default: standard)
  whiteMovable?: boolean,        // White is human (default: true)
  blackMovable?: boolean,        // Black is human (default: true)
  onPositionChange?: (state, lastMove?) => void,
  onError?: (error) => void,
});

// Spread onto ChessBoard
<ChessBoard {...game.boardProps} />

// Control the game
game.makeMove({ from: 'e2', to: 'e4' });  // Execute a move (for AI/server)
game.resetGame();                           // Reset to starting position
game.setPosition(fen);                      // Load a FEN position
game.getGameState();                        // Get current GameState
game.engine;                                // Direct engine access
```

## Theming

Board colors are controlled via CSS custom properties. Set them on the board's `style` prop:

```tsx
<ChessBoard
  {...game.boardProps}
  style={{
    '--light-square': '#f0d9b5',
    '--dark-square': '#b58863',
    '--selected-light': '#f7ec74',
    '--selected-dark': '#baca44',
  } as React.CSSProperties}
/>
```

Available custom properties:

| Property | Default | Description |
|----------|---------|-------------|
| `--light-square` | `#eeeed2` | Light square color |
| `--dark-square` | `#769656` | Dark square color |
| `--selected-light` | `#f7ec74` | Selected/last-move on light squares |
| `--selected-dark` | `#baca44` | Selected/last-move on dark squares |
| `--highlight-light` | `#ff6b6b` | Right-click highlight on light squares |
| `--highlight-dark` | `#e55555` | Right-click highlight on dark squares |
| `--premove-light` | `#dc2626` | Premove highlight on light squares |
| `--premove-dark` | `#b91c1c` | Premove highlight on dark squares |
| `--check-light` | `#ff4444` | Check highlight on light squares |
| `--check-dark` | `#cc3333` | Check highlight on dark squares |
| `--coord-light-text` | light square color | Coordinate label on dark squares |
| `--coord-dark-text` | dark square color | Coordinate label on light squares |

## Types

```tsx
// Algebraic square notation
type Square = string; // e.g. "e4"

// A move in algebraic notation
interface BoardMove {
  from: Square;
  to: Square;
  promotion?: 'queen' | 'rook' | 'bishop' | 'knight';
}

// Valid moves map: from-square → destination squares
type ValidMovesMap = Map<Square, Square[]>;

// Player color
type PlayerColor = 'white' | 'black';

// Game end overlay
interface GameEndOverlay {
  type: 'checkmate' | 'stalemate' | 'draw';
  winner?: PlayerColor;
}

// Sound events
type MoveSound = 'move' | 'capture' | 'check' | 'checkmate'
  | 'promotion' | 'draw' | 'premove' | 'error' | 'gamestart';
```

### Conversion Utilities

For consumers working with the built-in engine's internal types:

```tsx
import {
  squareToPosition,     // "e4" → { file: 4, rank: 3 }
  positionToSquare,     // { file: 4, rank: 3 } → "e4"
  moveToBoardMove,      // internal Move → BoardMove
  boardMoveToInternal,  // BoardMove → internal Move
  fenToPieceArray,      // FEN → Piece[][]
  buildValidMovesMap,   // GameState → ValidMovesMap
} from 'react-shahmat';
```

## License

MIT
