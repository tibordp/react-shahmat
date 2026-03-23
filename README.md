# react-shahmat

A controlled React chess board component with smooth animations, sound effects, Chess.com-style premoves, and a built-in engine for quick prototyping.

**[Live Demo](https://tibordp.github.io/react-shahmat/)** | **[npm](https://www.npmjs.com/package/react-shahmat)**

## Install

```bash
npm install react-shahmat
```

## Quick Start

Three lines to a working chess board:

```tsx
import { ChessBoard, useChessGame } from 'react-shahmat';

function App() {
  const game = useChessGame();
  return <ChessBoard {...game.boardProps} />;
}
```

The board sizes to its parent by default. Wrap it in a sized container, or pass `size={500}` for a fixed size.

## Controlled Mode

`ChessBoard` is a controlled component -- you provide the position, legal moves, and handle callbacks. This makes it suitable for chess servers, custom engines, puzzles, analysis boards, or chess variants.

```tsx
import { ChessBoard, BoardMove, ValidMovesMap } from 'react-shahmat';

function ServerBoard() {
  const [position, setPosition] = useState(STARTING_FEN);
  const [validMoves, setValidMoves] = useState<ValidMovesMap>(new Map());
  const [lastMove, setLastMove] = useState<BoardMove>();

  const handleMove = (move: BoardMove) => {
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

## Features

- **Controlled component** -- you own game state, the board is a pure view layer
- **Built-in engine** (optional) -- `useChessGame` hook for quick setup with full game logic
- **Premoves** -- Chess.com-style premove queueing with stacking support (off by default)
- **Animations** -- smooth piece movement with configurable easing and duration
- **Sound effects** -- move, capture, check, checkmate, promotion, premove sounds via `useChessGame` or custom handler
- **Arrows & highlights** -- right-click to draw arrows and highlight squares (controlled)
- **Custom pieces** -- swap the piece image set or render pieces with arbitrary React components
- **Theming** -- CSS custom properties for all board colors
- **Touch & mouse** -- drag-and-drop via react-dnd with HTML5 and touch backends
- **Responsive** -- auto-sizes to container, or set fixed size, or `'contain'` to fit parent
- **TypeScript** -- full type definitions

## API Overview

All props at a glance:

```tsx
<ChessBoard
  // Position & state
  position='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  orientation='white'
  turnColor='white'
  lastMove={{ from: 'e2', to: 'e4' }}
  check='e8'
  validMoves={movesMap}
  gameEndOverlay={{ type: 'checkmate', winner: 'white' }}
  // Callbacks
  onMove={move => {}}
  onPremove={move => {}}
  onPremoveClear={() => {}}
  onPlaySound={sound => {}}
  // Interactivity
  whiteMovable={true}
  blackMovable={true}
  readonly={false}
  enablePremoves={false}
  showMoveIndicators={true}
  autoPromotionPiece='queen'
  premoveCandidates={(piece, square) => [...squares]}
  // Annotations (controlled)
  arrows={[{ from: 'e2', to: 'e4' }]}
  onArrowsChange={arrows => {}}
  highlights={['e4', 'd5']}
  onHighlightsChange={highlights => {}}
  // Visual
  size={500} // number | 'contain' | omit for parent width
  showCoordinates={true}
  enableAnimations={true}
  animationDuration={300}
  pieceSet={customPieceSet}
  renderPiece={(piece, size) => <MyPiece />}
  className='my-board'
  style={{ '--light-square': '#f0d9b5' }}
/>
```

## useChessGame

Wraps the built-in chess engine and produces all the props `ChessBoard` needs:

```tsx
const game = useChessGame({
  initialFen?: string,
  whiteMovable?: boolean,          // default: true
  blackMovable?: boolean,          // default: true
  enableSounds?: boolean,          // default: true
  soundManager?: SoundManager,     // custom audio sprite
  onSound?: (sound) => void,       // full custom sound handler
  onPositionChange?: (state, lastMove?) => void,
  onError?: (error) => void,
});

// Spread onto ChessBoard
<ChessBoard {...game.boardProps} />

// Control the game
game.makeMove({ from: 'e2', to: 'e4' });
game.resetGame();
game.setPosition(fen);
game.getGameState();
game.history;                      // GameHistoryEntry[]
game.undo();                       // undo last move
game.undo(toPly);                  // roll back to specific ply
game.endGame(result);              // resign, draw, timeout
game.engine;                       // direct engine access
```

## Theming

Board colors are CSS custom properties. Set them via the `style` prop:

```tsx
<ChessBoard
  {...game.boardProps}
  style={
    {
      '--light-square': '#f0d9b5',
      '--dark-square': '#b58863',
      '--selected-light': '#f7ec74',
      '--selected-dark': '#baca44',
    } as React.CSSProperties
  }
/>
```

Available properties: `--light-square`, `--dark-square`, `--selected-light`, `--selected-dark`, `--highlight-light`, `--highlight-dark`, `--premove-light`, `--premove-dark`, `--check-light`, `--check-dark`, `--coord-light-text`, `--coord-dark-text`.

## Custom Pieces

Use `pieceSet` to swap piece images (maps piece keys like `wK`, `bQ` to image URLs), or `renderPiece` for full custom rendering with React components:

```tsx
import { PieceSet } from 'react-shahmat';

const myPieces: PieceSet = {
  wK: '/pieces/wK.svg',
  wQ: '/pieces/wQ.svg',
  // ... all 12 piece keys
};

<ChessBoard {...game.boardProps} pieceSet={myPieces} />;
```

`renderPiece` takes priority over `pieceSet` and receives the `Piece` object and square size in pixels.

## Custom Sounds

Sounds are handled by `useChessGame`, not `ChessBoard`. Three approaches:

1. **Default** -- built-in sounds play automatically (`enableSounds: true`)
2. **Custom sprite** -- pass a `SoundManager` instance with your own audio sprite URLs
3. **Full control** -- pass `onSound` to handle sound events yourself

```tsx
import { SoundManager } from 'react-shahmat';

// Custom audio sprite
const sounds = new SoundManager({
  ogg: '/sounds/chess.ogg',
  mp3: '/sounds/chess.mp3',
  map: '/sounds/chess.json',
});

const game = useChessGame({ soundManager: sounds });
```

## Key Types

```tsx
type Square = string; // e.g. "e4"
type PlayerColor = 'white' | 'black';
type ValidMovesMap = Map<Square, Square[]>; // from -> destinations
type MoveSound =
  | 'move'
  | 'capture'
  | 'check'
  | 'checkmate'
  | 'promotion'
  | 'draw'
  | 'premove'
  | 'error'
  | 'gamestart';

interface BoardMove {
  from: Square;
  to: Square;
  promotion?: 'queen' | 'rook' | 'bishop' | 'knight';
}

interface BoardArrow {
  from: Square;
  to: Square;
}

interface GameEndOverlay {
  type: 'checkmate' | 'stalemate' | 'draw';
  winner?: PlayerColor;
}
```

Conversion utilities are also exported: `squareToPosition`, `positionToSquare`, `moveToBoardMove`, `boardMoveToInternal`, `fenToPieceArray`, `buildValidMovesMap`.

## Examples

See the **[live demo](https://tibordp.github.io/react-shahmat/)** for interactive examples including two-player boards, custom themes, custom pieces, puzzles, arrows/highlights, premoves, history navigation, and playing against an engine.

## License

MIT
