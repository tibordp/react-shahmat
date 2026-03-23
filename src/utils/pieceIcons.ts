import { Piece, Color, PieceType } from '../engine/jsChessEngine';
import type { PieceSet } from '../types';
import { pieceKey, pieceKeyByType } from '../types';

// Piece icon imports — base64-encoded at build time
import whitePawn from '../icons/pawn-w.svg';
import whiteRook from '../icons/rook-w.svg';
import whiteKnight from '../icons/knight-w.svg';
import whiteBishop from '../icons/bishop-w.svg';
import whiteQueen from '../icons/queen-w.svg';
import whiteKing from '../icons/king-w.svg';
import blackPawn from '../icons/pawn-b.svg';
import blackRook from '../icons/rook-b.svg';
import blackKnight from '../icons/knight-b.svg';
import blackBishop from '../icons/bishop-b.svg';
import blackQueen from '../icons/queen-b.svg';
import blackKing from '../icons/king-b.svg';

/** The built-in piece set (bundled as base64 data URLs) */
export const defaultPieceSet: PieceSet = {
  wP: whitePawn,
  wR: whiteRook,
  wN: whiteKnight,
  wB: whiteBishop,
  wQ: whiteQueen,
  wK: whiteKing,
  bP: blackPawn,
  bR: blackRook,
  bN: blackKnight,
  bB: blackBishop,
  bQ: blackQueen,
  bK: blackKing,
};

/** Get the icon URL for a piece from a given piece set */
export function getPieceIcon(
  piece: Piece,
  set: PieceSet = defaultPieceSet
): string {
  return set[pieceKey(piece)];
}

/** Get the icon URL by color and type from a given piece set */
export function getPieceIconByType(
  color: Color,
  pieceType: PieceType,
  set: PieceSet = defaultPieceSet
): string {
  return set[pieceKeyByType(color, pieceType)];
}

// Re-export individual icons for special cases (game end badges)
export { whiteKing, blackKing, whiteQueen, blackQueen };
