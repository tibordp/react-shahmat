import React from 'react';
import { ChessBoard, useChessGame } from 'react-shahmat';
import type { BoardMove, ValidMovesMap } from 'react-shahmat';

// A puzzle where only the correct move is accepted.
// Demonstrates filtering validMoves to restrict which moves are allowed.

export const SOURCE = `import React from 'react';
import { ChessBoard, useChessGame } from 'react-shahmat';
import type { BoardMove, ValidMovesMap } from 'react-shahmat';

// Puzzle: White to play and mate in 1. Only Qxf7# is correct.
const PUZZLE_FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
const CORRECT_MOVE: BoardMove = { from: 'h5', to: 'f7' };

function PuzzleBoard() {
  const [solved, setSolved] = React.useState(false);
  const game = useChessGame({ initialFen: PUZZLE_FEN });

  // Only allow the correct move
  const puzzleMoves: ValidMovesMap = React.useMemo(() => {
    if (solved) return new Map();
    return new Map([[CORRECT_MOVE.from, [CORRECT_MOVE.to]]]);
  }, [solved]);

  const handleMove = (move: BoardMove) => {
    game.makeMove(move);
    setSolved(true);
  };

  return (
    <ChessBoard
      {...game.boardProps}
      validMoves={puzzleMoves}
      onMove={handleMove}
    />
  );
}`;

export const TITLE = 'Puzzle Board';
export const DESCRIPTION =
  'Only the correct move is allowed. Shows how to override validMoves to restrict interaction — useful for puzzle trainers and tutorials.';

const PUZZLE_FEN =
  'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
const CORRECT_MOVE: BoardMove = { from: 'h5', to: 'f7' };

export default function PuzzleBoard() {
  const [solved, setSolved] = React.useState(false);
  const game = useChessGame({ initialFen: PUZZLE_FEN });

  const puzzleMoves: ValidMovesMap = React.useMemo(() => {
    if (solved) return new Map();
    return new Map([[CORRECT_MOVE.from, [CORRECT_MOVE.to]]]);
  }, [solved]);

  const handleMove = React.useCallback(
    (move: BoardMove) => {
      game.makeMove(move);
      setSolved(true);
    },
    [game]
  );

  return (
    <div>
      <ChessBoard
        {...game.boardProps}
        validMoves={puzzleMoves}
        onMove={handleMove}
        showMoveIndicators={false}
      />
      {solved && (
        <p style={{ color: '#4caf50', textAlign: 'center', marginTop: 8 }}>
          Correct! Qxf7#
        </p>
      )}
      {!solved && (
        <p style={{ color: '#aaa', textAlign: 'center', marginTop: 8 }}>
          White to play — mate in 1
        </p>
      )}
    </div>
  );
}
