# react-shahmat

A React chess board component with built-in game logic, animations, and sound effects. Features include drag-and-drop piece movement, premove support, right-click arrows and square highlighting, and visual game end indicators.

**Disclaimer:** This library was entirely created by Claude Code. The code quality and architecture may not meet typical production standards.

## Installation

```bash
npm install react-shahmat
```

## Basic Usage

```tsx
import React from 'react';
import { ChessBoard } from 'react-shahmat';
import 'react-shahmat/dist/ChessBoard.css';

function App() {
  return (
    <div style={{ width: '500px', height: '500px' }}>
      <ChessBoard />
    </div>
  );
}
```

## Features

- **Built-in chess engine** - Complete game logic with move validation
- **Touch and mouse support** - Works on desktop and mobile devices  
- **Premove functionality** - Queue moves while waiting for opponent
- **Piece animations** - Smooth movement transitions
- **Sound effects** - Audio feedback for moves, captures, check, and game end
- **Visual indicators** - Last move highlighting, valid move dots, game end badges
- **Right-click interactions** - Draw arrows and highlight squares
- **Responsive design** - Automatically sizes to container
- **TypeScript support** - Full type definitions included

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `number` | `undefined` | Fixed board size in pixels (responsive if omitted) |
| `flipped` | `boolean` | `false` | Whether to flip board for black perspective |
| `whiteIsHuman` | `boolean` | `true` | Whether white player is human-controlled |
| `blackIsHuman` | `boolean` | `true` | Whether black player is human-controlled |
| `enablePreMoves` | `boolean` | `true` | Enable premove functionality |
| `autoPromotionPiece` | `PieceType` | `undefined` | Auto-promote pawns to this piece |
| `showCoordinates` | `boolean` | `true` | Show rank and file labels |
| `animationDuration` | `number` | `300` | Animation duration in milliseconds |
| `enableAnimations` | `boolean` | `true` | Enable piece movement animations |
| `enableSounds` | `boolean` | `true` | Enable sound effects |
| `enableArrows` | `boolean` | `true` | Enable right-click arrow drawing |
| `enableHighlights` | `boolean` | `true` | Enable right-click square highlighting |
| `onPositionChange` | `function` | `undefined` | Called when position changes |
| `onError` | `function` | `undefined` | Called on game errors |

## Ref Methods

```tsx
const boardRef = useRef<ChessBoardRef>(null);

// Reset to starting position
boardRef.current?.resetGame();

// Set position from FEN
boardRef.current?.setPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

// Get current game state
const gameState = boardRef.current?.getGameState();

// Execute external move (for AI/online opponents)
boardRef.current?.executeExternalMove({
  fromFile: 4, fromRank: 1, toFile: 4, toRank: 3
});
```

## Example with AI Integration

```tsx
import React, { useRef } from 'react';
import { ChessBoard, ChessBoardRef, GameState, Move } from 'react-shahmat';

function ChessGame() {
  const boardRef = useRef<ChessBoardRef>(null);

  const handlePositionChange = (gameState: GameState, lastMove?: Move) => {
    if (gameState.currentPlayer === 'black' && !gameState.isGameOver) {
      // Trigger AI move
      calculateAIMove(gameState.fen).then(aiMove => {
        boardRef.current?.executeExternalMove(aiMove);
      });
    }
  };

  return (
    <ChessBoard
      ref={boardRef}
      blackIsHuman={false}
      onPositionChange={handlePositionChange}
    />
  );
}
```

## License

MIT