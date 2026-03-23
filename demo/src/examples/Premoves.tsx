import React from 'react';
import { ChessBoard, useChessGame, moveToBoardMove } from 'react-shahmat';
import type { GameState } from 'react-shahmat';

// Premoves let you queue moves while waiting for the opponent.
// They execute automatically when your turn arrives.
// Enable with enablePremoves={true}.

export const SOURCE = `import { ChessBoard, useChessGame, moveToBoardMove } from 'react-shahmat';
import type { GameState } from 'react-shahmat';

function Premoves() {
  const game = useChessGame({
    blackMovable: false,
    onPositionChange: (gameState: GameState) => {
      if (gameState.currentPlayer === 1 && !gameState.isGameOver) {
        const moves = gameState.validMoves;
        const pick = moves[Math.floor(Math.random() * moves.length)];
        setTimeout(() => game.makeMove(moveToBoardMove(pick)), 800);
      }
    },
  });

  return (
    <ChessBoard
      {...game.boardProps}
      enablePremoves={true}
    />
  );
}`;

export const TITLE = 'Premoves';
export const DESCRIPTION =
  'Queue your next move while the opponent is thinking. Premoves show in red and execute automatically when your turn arrives. Multiple premoves can be stacked. Right-click to cancel.';

export default function Premoves() {
  const gameRef = React.useRef<ReturnType<typeof useChessGame>>(null!);

  const handlePosition = React.useCallback((gameState: GameState) => {
    if (gameState.currentPlayer === 1 && !gameState.isGameOver) {
      const moves = gameState.validMoves;
      const pick = moves[Math.floor(Math.random() * moves.length)];
      setTimeout(() => gameRef.current.makeMove(moveToBoardMove(pick)), 800);
    }
  }, []);

  const game = useChessGame({
    blackMovable: false,
    onPositionChange: handlePosition,
  });
  gameRef.current = game;

  return <ChessBoard {...game.boardProps} enablePremoves={true} />;
}
