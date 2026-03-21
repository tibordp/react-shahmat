// Main exports for react-shahmat component library

// Components
export { ChessBoard } from './components/ChessBoard';
export { ArrowOverlay } from './components/ArrowOverlay';
export { PieceAnimations } from './components/PieceAnimations';
export { PromotionDialog } from './components/PromotionDialog';
export { Square } from './components/Square';

// Hooks
export { useChessGame } from './hooks/useChessGame';
export { useJSChessEngine } from './hooks/useJSChessEngine';
export { useBoardClicks } from './hooks/useBoardClicks';
export { useBoardDragDrop } from './hooks/useBoardDragDrop';
export { useBoardUIState } from './hooks/useBoardUIState';
export { usePieceAnimations } from './hooks/usePieceAnimations';

// Engine
export { JSChessEngine } from './engine/jsChessEngine';

// Types - public API
export type {
  Square as SquareNotation,
  PlayerColor,
  PromotionPiece,
  MoveSound,
  BoardMove,
  ValidMovesMap,
  GameEndOverlay,
} from './types';

// Types - from component
export type { ChessBoardProps } from './components/ChessBoard';
export type { UseChessGameOptions, UseChessGameReturn } from './hooks/useChessGame';

// Types - from engine (re-exported via types.ts)
export {
  PieceType,
  Color,
} from './types';

export type {
  GameState,
  Move,
  ChessError,
  Position,
  Piece,
  MoveResult,
  GameResult,
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
} from './types';

// Utils
export { soundManager } from './utils/soundManager';
export { PIECE_ICONS, getPieceIcon, getPieceIconByType, getPieceTypeName } from './utils/pieceIcons';
