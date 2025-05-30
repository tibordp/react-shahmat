import { Piece, Color, PieceType } from '../engine/jsChessEngine';

// Piece icon imports
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

/**
 * Mapping of piece types to their string names
 */
const PIECE_TYPE_NAMES = ['Pawn', 'Rook', 'Knight', 'Bishop', 'Queen', 'King'];

/**
 * Mapping of piece color and type combinations to their SVG icons
 */
export const PIECE_ICONS: { [key: string]: string } = {
  White_Pawn: whitePawn,
  White_Rook: whiteRook,
  White_Knight: whiteKnight,
  White_Bishop: whiteBishop,
  White_Queen: whiteQueen,
  White_King: whiteKing,
  Black_Pawn: blackPawn,
  Black_Rook: blackRook,
  Black_Knight: blackKnight,
  Black_Bishop: blackBishop,
  Black_Queen: blackQueen,
  Black_King: blackKing,
};

/**
 * Convert a piece type number to its string name
 * @param pieceType - The piece type enum value
 * @returns The string name of the piece type
 */
export function getPieceTypeName(pieceType: PieceType): string {
  return PIECE_TYPE_NAMES[pieceType] || 'Unknown';
}

/**
 * Get the SVG icon path for a given piece
 * @param piece - The piece object containing color and type
 * @returns The path to the SVG icon for this piece
 */
export function getPieceIcon(piece: Piece): string {
  const colorName = piece.color === Color.White ? 'White' : 'Black';
  const typeName = getPieceTypeName(piece.type);
  return PIECE_ICONS[`${colorName}_${typeName}`];
}

/**
 * Get the SVG icon path for a piece by color and type
 * @param color - The piece color
 * @param pieceType - The piece type
 * @returns The path to the SVG icon for this piece
 */
export function getPieceIconByType(color: Color, pieceType: PieceType): string {
  const colorName = color === Color.White ? 'White' : 'Black';
  const typeName = getPieceTypeName(pieceType);
  return PIECE_ICONS[`${colorName}_${typeName}`];
}

/**
 * Export individual piece icons for special cases (like the white king for game end badges)
 */
export { whiteKing, blackKing, whiteQueen, blackQueen };
