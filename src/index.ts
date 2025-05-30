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
export { useCustomDrag } from './hooks/useCustomDrag';
export { useBoardClicks } from './hooks/useBoardClicks';
export { useBoardDragDrop } from './hooks/useBoardDragDrop';
export { useBoardUIState } from './hooks/useBoardUIState';
export { usePieceAnimations } from './hooks/usePieceAnimations';

// Engine
export { JSChessEngine, PieceType, Color } from './engine/jsChessEngine';

// Types
export type {
  GameState,
  Move,
  ChessError,
  Position,
  Piece,
  ChessBoardRef,
  ChessBoardCallbacks
} from './engine/jsChessEngine';

// Utils
export { soundManager } from './utils/soundManager';
export { PIECE_ICONS, getPieceIcon, getPieceIconByType, getPieceTypeName } from './utils/pieceIcons';

// CSS (consumers will need to import this separately)
// import 'react-shahmat/dist/ChessBoard.css';