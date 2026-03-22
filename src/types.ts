import { PieceType, Color, Piece, Position, Move, GameState } from './engine/jsChessEngine';

// ============================================================================
// Public API Types
// ============================================================================

/** Algebraic square notation: "a1" through "h8" */
export type Square = string;

/** Player color as a string union */
export type PlayerColor = 'white' | 'black';

/** Promotion piece type */
export type PromotionPiece = 'queen' | 'rook' | 'bishop' | 'knight';

/** Sound events the board can emit */
export type MoveSound =
  | 'move'
  | 'capture'
  | 'check'
  | 'checkmate'
  | 'promotion'
  | 'draw'
  | 'premove'
  | 'error'
  | 'gamestart';

/** A move expressed in algebraic notation */
export interface BoardMove {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
}

/** An arrow drawn on the board */
export interface BoardArrow {
  from: Square;
  to: Square;
}

/** Map of valid moves: from-square -> list of to-squares */
export type ValidMovesMap = Map<Square, Square[]>;

/** Game end overlay configuration */
export interface GameEndOverlay {
  type: 'checkmate' | 'stalemate' | 'draw';
  winner?: PlayerColor;
}

// ============================================================================
// Notation Conversion Utilities
// ============================================================================

const FILE_LETTERS = 'abcdefgh';

/** Convert algebraic square ("e4") to internal Position ({file: 4, rank: 3}) */
export function squareToPosition(sq: Square): Position {
  const file = sq.charCodeAt(0) - 97; // 'a' = 0
  const rank = parseInt(sq[1]) - 1; // '1' = 0
  return { file, rank };
}

/** Convert internal Position to algebraic square */
export function positionToSquare(pos: Position): Square {
  return FILE_LETTERS[pos.file] + (pos.rank + 1);
}

/** Convert Color enum to PlayerColor string */
export function colorToPlayerColor(c: Color): PlayerColor {
  return c === Color.White ? 'white' : 'black';
}

/** Convert PlayerColor string to Color enum */
export function playerColorToColor(c: PlayerColor): Color {
  return c === 'white' ? Color.White : Color.Black;
}

/** Convert PieceType enum to PromotionPiece string */
export function pieceTypeToPromotionPiece(t: PieceType): PromotionPiece {
  switch (t) {
    case PieceType.Queen:
      return 'queen';
    case PieceType.Rook:
      return 'rook';
    case PieceType.Bishop:
      return 'bishop';
    case PieceType.Knight:
      return 'knight';
    default:
      return 'queen';
  }
}

/** Convert PromotionPiece string to PieceType enum */
export function promotionPieceToPieceType(p: PromotionPiece): PieceType {
  switch (p) {
    case 'queen':
      return PieceType.Queen;
    case 'rook':
      return PieceType.Rook;
    case 'bishop':
      return PieceType.Bishop;
    case 'knight':
      return PieceType.Knight;
  }
}

/** Convert internal Move to public BoardMove */
export function moveToBoardMove(m: Move): BoardMove {
  const result: BoardMove = {
    from: positionToSquare({ file: m.fromFile, rank: m.fromRank }),
    to: positionToSquare({ file: m.toFile, rank: m.toRank }),
  };
  if (m.promotionPiece !== undefined) {
    result.promotion = pieceTypeToPromotionPiece(m.promotionPiece);
  }
  return result;
}

/** Convert public BoardMove to internal Move */
export function boardMoveToInternal(m: BoardMove): Move {
  const from = squareToPosition(m.from);
  const to = squareToPosition(m.to);
  const result: Move = {
    fromFile: from.file,
    fromRank: from.rank,
    toFile: to.file,
    toRank: to.rank,
  };
  if (m.promotion) {
    result.promotionPiece = promotionPieceToPieceType(m.promotion);
  }
  return result;
}

/**
 * Parse the piece placement part of a FEN string into a board array.
 * Returns an 8x8 array indexed [rank][file] where rank 0 = rank 1 (white's back rank).
 */
export function fenToPieceArray(fen: string): (Piece | null)[][] {
  const piecePlacement = fen.split(' ')[0];
  const rows = piecePlacement.split('/');
  const board: (Piece | null)[][] = [];

  const pieceMap: Record<string, { type: PieceType; color: Color }> = {
    P: { type: PieceType.Pawn, color: Color.White },
    R: { type: PieceType.Rook, color: Color.White },
    N: { type: PieceType.Knight, color: Color.White },
    B: { type: PieceType.Bishop, color: Color.White },
    Q: { type: PieceType.Queen, color: Color.White },
    K: { type: PieceType.King, color: Color.White },
    p: { type: PieceType.Pawn, color: Color.Black },
    r: { type: PieceType.Rook, color: Color.Black },
    n: { type: PieceType.Knight, color: Color.Black },
    b: { type: PieceType.Bishop, color: Color.Black },
    q: { type: PieceType.Queen, color: Color.Black },
    k: { type: PieceType.King, color: Color.Black },
  };

  // FEN rows go from rank 8 (index 0) to rank 1 (index 7)
  for (let rowIdx = 0; rowIdx < 8; rowIdx++) {
    const row: (Piece | null)[] = [];
    const fenRow = rows[rowIdx] || '';
    for (const ch of fenRow) {
      if (ch >= '1' && ch <= '8') {
        for (let i = 0; i < parseInt(ch); i++) {
          row.push(null);
        }
      } else if (pieceMap[ch]) {
        row.push({ ...pieceMap[ch] });
      }
    }
    // Pad to 8 if needed
    while (row.length < 8) {
      row.push(null);
    }
    // FEN row 0 = rank 8, so store at index 7 - rowIdx to get rank-indexed array
    board[7 - rowIdx] = row;
  }

  return board;
}

/**
 * Build a ValidMovesMap from a GameState's validMoves array.
 */
export function buildValidMovesMap(gameState: GameState): ValidMovesMap {
  const map: ValidMovesMap = new Map();
  for (const move of gameState.validMoves) {
    const from = positionToSquare({ file: move.fromFile, rank: move.fromRank });
    let to = positionToSquare({ file: move.toFile, rank: move.toRank });
    // For promotion moves, append promotion suffix to distinguish them
    // But for the valid moves map, we just need the destination square
    const existing = map.get(from);
    if (existing) {
      if (!existing.includes(to)) {
        existing.push(to);
      }
    } else {
      map.set(from, [to]);
    }
  }
  return map;
}

// Re-export engine types that consumers may need
export type { GameState, Move, Piece, Position, GameResult, MoveResult, ValidMoveResult, ChessError, HistoryEntry, MoveType } from './engine/jsChessEngine';
export { PieceType, Color } from './engine/jsChessEngine';

/** Public-facing history entry with algebraic notation */
export interface GameHistoryEntry {
  move: BoardMove;
  piece: { type: PieceType; color: Color };
  moveType: 'normal' | 'capture' | 'castling' | 'enPassant' | 'promotion';
  capturedPiece?: { type: PieceType; color: Color };
  promotionPiece?: PromotionPiece;
  fen: string;
  isCheck: boolean;
  isCheckmate: boolean;
  algebraic: string;
}

/** Piece symbols for figurine algebraic notation */
const FIGURINE_SYMBOLS: Record<number, string> = {
  [PieceType.King]: '\u2654',
  [PieceType.Queen]: '\u2655',
  [PieceType.Rook]: '\u2656',
  [PieceType.Bishop]: '\u2657',
  [PieceType.Knight]: '\u2658',
};

/** Convert algebraic notation to figurine algebraic notation (with piece symbols) */
export function toFigurine(algebraic: string): string {
  // Replace leading piece letter with unicode symbol
  const pieceLetters: Record<string, string> = {
    K: FIGURINE_SYMBOLS[PieceType.King],
    Q: FIGURINE_SYMBOLS[PieceType.Queen],
    R: FIGURINE_SYMBOLS[PieceType.Rook],
    B: FIGURINE_SYMBOLS[PieceType.Bishop],
    N: FIGURINE_SYMBOLS[PieceType.Knight],
  };

  if (algebraic.startsWith('O-')) return algebraic; // castling
  const firstChar = algebraic[0];
  if (pieceLetters[firstChar]) {
    return pieceLetters[firstChar] + algebraic.slice(1);
  }
  return algebraic; // pawn moves don't have a piece letter
}
