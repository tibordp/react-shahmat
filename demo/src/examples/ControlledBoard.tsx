import React from 'react';
import { ChessBoard } from 'react-shahmat';
import type { BoardMove, ValidMovesMap } from 'react-shahmat';

// A fully controlled board without useChessGame. You manage position,
// valid moves, and move handling yourself — ideal for connecting to
// a chess server or custom engine.

export const SOURCE = `import React from 'react';
import { ChessBoard } from 'react-shahmat';
import type { BoardMove, ValidMovesMap } from 'react-shahmat';

function ControlledBoard() {
  const [position, setPosition] = React.useState(
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  );
  const [lastMove, setLastMove] = React.useState<BoardMove>();

  // In a real app, validMoves would come from your server or engine.
  // Here we allow any move for demonstration.
  const validMoves: ValidMovesMap = React.useMemo(() => {
    // ... compute from your engine/server
    return new Map();
  }, [position]);

  const handleMove = (move: BoardMove) => {
    setLastMove(move);
    // Send move to server, get new position back
    // setPosition(newFenFromServer);
  };

  return (
    <ChessBoard
      position={position}
      validMoves={validMoves}
      lastMove={lastMove}
      onMove={handleMove}
    />
  );
}`;

export const TITLE = 'Controlled Board';
export const DESCRIPTION = 'A board driven entirely by props, without useChessGame. You provide the position (FEN), valid moves, and handle onMove yourself. This is the pattern for connecting to a chess server or custom engine.';

export default function ControlledBoard() {
  const [position] = React.useState(
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  );
  const [lastMove] = React.useState<BoardMove>();

  const validMoves: ValidMovesMap = React.useMemo(() => new Map(), []);

  return (
    <ChessBoard
      position={position}
      validMoves={validMoves}
      lastMove={lastMove}
      onMove={() => {}}
    />
  );
}
