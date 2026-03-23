import React from 'react';
import { ChessBoard, useChessGame, moveToBoardMove } from 'react-shahmat';
import type { GameState } from 'react-shahmat';

// Play against a "random move" AI. Demonstrates how to feed AI moves
// into the game via game.makeMove() when onPositionChange fires.

export const SOURCE = `import { ChessBoard, useChessGame, moveToBoardMove } from 'react-shahmat';
import type { GameState } from 'react-shahmat';

function PlayAgainstRandom() {
  const game = useChessGame({
    blackMovable: false,
    onPositionChange: (gameState: GameState) => {
      // When it's black's turn, pick a random legal move
      if (gameState.currentPlayer === 1 && !gameState.isGameOver) {
        const moves = gameState.validMoves;
        const pick = moves[Math.floor(Math.random() * moves.length)];
        setTimeout(() => game.makeMove(moveToBoardMove(pick)), 300);
      }
    },
  });

  return <ChessBoard {...game.boardProps} />;
}`;

export const TITLE = 'Play Against Random AI';
export const DESCRIPTION =
  'White is human, black plays random legal moves. Shows how to use onPositionChange to detect AI turns and game.makeMove() to execute moves programmatically.';

export default function PlayAgainstRandom() {
  const gameRef = React.useRef<ReturnType<typeof useChessGame>>(null!);

  const handlePosition = React.useCallback((gameState: GameState) => {
    if (gameState.currentPlayer === 1 && !gameState.isGameOver) {
      const moves = gameState.validMoves;
      const pick = moves[Math.floor(Math.random() * moves.length)];
      setTimeout(() => gameRef.current.makeMove(moveToBoardMove(pick)), 300);
    }
  }, []);

  const game = useChessGame({
    blackMovable: false,
    onPositionChange: handlePosition,
  });
  gameRef.current = game;

  return <ChessBoard {...game.boardProps} />;
}
