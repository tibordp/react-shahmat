import { Piece, Position, PieceType, Color } from '../engine/chessRules';

function inBounds(file: number, rank: number): boolean {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}

/** Returns squares a piece could reach based on its movement pattern,
 *  ignoring blocking pieces, pins, and check. Used for premove candidates. */
export function getPremoveCandidates(
  piece: Piece,
  file: number,
  rank: number
): Position[] {
  const moves: Position[] = [];
  const add = (f: number, r: number) => {
    if (inBounds(f, r)) moves.push({ file: f, rank: r });
  };
  const addRay = (df: number, dr: number) => {
    for (let i = 1; i < 8; i++) {
      const f = file + df * i;
      const r = rank + dr * i;
      if (!inBounds(f, r)) break;
      moves.push({ file: f, rank: r });
    }
  };

  switch (piece.type) {
    case PieceType.Pawn: {
      const dir = piece.color === Color.White ? 1 : -1;
      const startRank = piece.color === Color.White ? 1 : 6;
      // Forward one
      add(file, rank + dir);
      // Forward two from starting position
      if (rank === startRank) add(file, rank + dir * 2);
      // Captures (diagonal) — always shown for premoves since we don't know
      // what the board will look like when the premove executes
      add(file - 1, rank + dir);
      add(file + 1, rank + dir);
      break;
    }
    case PieceType.Knight:
      for (const [df, dr] of [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1],
      ]) {
        add(file + df, rank + dr);
      }
      break;
    case PieceType.Bishop:
      addRay(1, 1);
      addRay(1, -1);
      addRay(-1, 1);
      addRay(-1, -1);
      break;
    case PieceType.Rook:
      addRay(1, 0);
      addRay(-1, 0);
      addRay(0, 1);
      addRay(0, -1);
      break;
    case PieceType.Queen:
      addRay(1, 0);
      addRay(-1, 0);
      addRay(0, 1);
      addRay(0, -1);
      addRay(1, 1);
      addRay(1, -1);
      addRay(-1, 1);
      addRay(-1, -1);
      break;
    case PieceType.King:
      for (const [df, dr] of [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 0],
        [1, 1],
      ]) {
        add(file + df, rank + dr);
      }
      // Castling squares
      add(file + 2, rank);
      add(file - 2, rank);
      break;
  }

  return moves;
}
