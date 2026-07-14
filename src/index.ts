// Main exports for react-shahmat component library

// Components
export { ChessBoard } from './components/ChessBoard';

// Hooks
export { useChessGame } from './hooks/useChessGame';
export { useChessRules } from './hooks/useChessRules';

// Engine
export { ChessRules } from './engine/chessRules';

// Types - public API
export type {
  Square as SquareNotation,
  PlayerColor,
  PromotionPiece,
  MoveSound,
  BoardMove,
  BoardArrow,
  ValidMovesMap,
  GameEndOverlay,
} from './types';

// Types - from component
export type { ChessBoardProps, ChessBoardStyle } from './components/ChessBoard';
export type {
  UseChessGameOptions,
  UseChessGameReturn,
} from './hooks/useChessGame';

// Types - from engine (re-exported via types.ts)
export { PieceType, Color } from './types';

export type {
  GameState,
  Move,
  ChessError,
  Position,
  Piece,
  MoveResult,
  GameResult,
  HistoryEntry,
  MoveType,
  GameHistoryEntry,
} from './types';

// Conversion utilities
export {
  squareToPosition,
  positionToSquare,
  colorToPlayerColor,
  playerColorToColor,
  pieceTypeToPromotionPiece,
  promotionPieceToPieceType,
  moveToBoardMove,
  boardMoveToInternal,
  fenToPieceArray,
  buildValidMovesMap,
  toFigurine,
} from './types';

// Utils
export { soundManager } from './utils/soundManager';
export {
  defaultPieceSet,
  getPieceIcon,
  getPieceIconByType,
} from './utils/pieceIcons';
export type { PieceSet } from './types';
export { pieceKey, pieceKeyByType } from './types';
