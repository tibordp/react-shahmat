import React, {
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
} from 'react';
import { DndProvider, useDragLayer, useDragDropManager } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { Square } from './Square';
import { ArrowOverlay } from './ArrowOverlay';
import { PromotionDialog } from './PromotionDialog';
import { PieceAnimations } from './PieceAnimations';
import { usePieceAnimations } from '../hooks/usePieceAnimations';
import { useBoardDragDrop } from '../hooks/useBoardDragDrop';
import { useBoardClicks } from '../hooks/useBoardClicks';
import { useBoardUIState } from '../hooks/useBoardUIState';
import {
  Piece,
  Position,
  PieceType,
  Color,
} from '../engine/jsChessEngine';
import { soundManager } from '../utils/soundManager';
import { getPieceIcon, whiteKing } from '../utils/pieceIcons';
import {
  PlayerColor,
  PromotionPiece,
  BoardMove,
  ValidMovesMap,
  GameEndOverlay,
  MoveSound,
  squareToPosition,
  positionToSquare,
  fenToPieceArray,
  promotionPieceToPieceType,
  BoardArrow,
} from '../types';
import type { Square as SquareNotation } from '../types';
import styles from './ChessBoard.module.css';

// ============================================================================
// Internal sub-components
// ============================================================================

interface CustomDragLayerProps {
  squareSize: number;
  boardId: string;
}

const CustomDragLayer: React.FC<CustomDragLayerProps> = ({ squareSize, boardId }) => {
  const { isDragging, item, currentOffset } = useDragLayer((monitor: unknown) => ({
    item: (monitor as { getItem(): { piece?: Piece; boardId?: string } }).getItem(),
    currentOffset: (monitor as { getClientOffset(): { x: number; y: number } | null }).getClientOffset(),
    isDragging: (monitor as { isDragging(): boolean }).isDragging(),
  }));

  // Only render the ghost for drags originating from this board
  if (!isDragging || !currentOffset || item?.boardId !== boardId) return null;

  const { x, y } = currentOffset;
  const piece = item?.piece;
  if (!piece) return null;

  const pieceIcon = getPieceIcon(piece);

  return (
    <div className={styles.customDragLayer}>
      <div
        className={styles.dragPreviewPiece}
        style={{
          left: x - squareSize * 0.5,
          top: y - squareSize * 0.5,
          position: 'absolute',
          width: squareSize,
          height: squareSize,
        }}
      >
        <img
          src={pieceIcon}
          alt='chess piece'
          className={styles.dragPreviewPieceImg}
          style={{
            filter: `drop-shadow(${Math.max(1, squareSize * 0.03)}px ${Math.max(1, squareSize * 0.03)}px ${Math.max(2, squareSize * 0.06)}px rgba(0, 0, 0, 0.6))`,
          }}
        />
      </div>
    </div>
  );
};

/** Provides a programmatic drag cancel function via ref. Must be inside DndProvider. */
function DragCanceller({ cancelRef }: { cancelRef: React.MutableRefObject<() => void> }) {
  const manager = useDragDropManager();
  cancelRef.current = useCallback(() => {
    if (manager.getMonitor().isDragging()) {
      manager.dispatch({ type: 'dnd-core/END_DRAG' });
    }
  }, [manager]);
  return null;
}

interface GameEndBadgeProps {
  kingPosition: Position;
  squareSize: number;
  flipped?: boolean;
  badgeType: 'winner' | 'loser' | 'draw';
}

const GameEndBadge: React.FC<GameEndBadgeProps> = ({
  kingPosition,
  squareSize,
  flipped,
  badgeType,
}) => {
  const effectivePosition = flipped
    ? { file: 7 - kingPosition.file, rank: 7 - kingPosition.rank }
    : kingPosition;

  const kingX = effectivePosition.file * squareSize;
  const kingY = (7 - effectivePosition.rank) * squareSize;

  const badgeSize = squareSize * 0.5;

  let badgeX = kingX + squareSize - badgeSize / 2;
  let badgeY = kingY - badgeSize / 2;

  const boardSize = squareSize * 8;

  if (badgeX + badgeSize > boardSize) {
    badgeX = boardSize - badgeSize;
  }
  if (badgeY < 0) {
    badgeY = 0;
  }

  const getBadgeColor = () => {
    switch (badgeType) {
      case 'winner':
        return '#4CAF50';
      case 'loser':
        return '#f44336';
      case 'draw':
        return '#757575';
    }
  };

  const renderBadgeContent = () => {
    if (badgeType === 'draw') {
      return (
        <span
          style={{
            color: 'white',
            fontSize: badgeSize * 0.6,
            fontWeight: 'bold',
          }}
        >
          ½
        </span>
      );
    } else {
      return (
        <img
          src={whiteKing}
          alt='king'
          style={{
            width: badgeSize * 0.7,
            height: badgeSize * 0.7,
            filter: 'brightness(0) invert(1)',
            transform: badgeType === 'loser' ? 'rotate(90deg)' : 'none',
          }}
        />
      );
    }
  };

  return (
    <div
      className={styles.gameEndBadge}
      style={{
        position: 'absolute',
        left: badgeX,
        top: badgeY,
        width: badgeSize,
        height: badgeSize,
        backgroundColor: getBadgeColor(),
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
        zIndex: 200,
      }}
    >
      {renderBadgeContent()}
    </div>
  );
};

// ============================================================================
// Premove movement patterns
// ============================================================================

function inBounds(file: number, rank: number): boolean {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}

/** Returns squares a piece could reach based on its movement pattern,
 *  ignoring blocking pieces, pins, and check. Used for premove candidates. */
function getPremoveCandidates(piece: Piece, file: number, rank: number): Position[] {
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
      for (const [df, dr] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        add(file + df, rank + dr);
      }
      break;
    case PieceType.Bishop:
      addRay(1, 1); addRay(1, -1); addRay(-1, 1); addRay(-1, -1);
      break;
    case PieceType.Rook:
      addRay(1, 0); addRay(-1, 0); addRay(0, 1); addRay(0, -1);
      break;
    case PieceType.Queen:
      addRay(1, 0); addRay(-1, 0); addRay(0, 1); addRay(0, -1);
      addRay(1, 1); addRay(1, -1); addRay(-1, 1); addRay(-1, -1);
      break;
    case PieceType.King:
      for (const [df, dr] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        add(file + df, rank + dr);
      }
      // Castling squares
      add(file + 2, rank);
      add(file - 2, rank);
      break;
  }

  return moves;
}

// ============================================================================
// ChessBoard Props
// ============================================================================

export interface ChessBoardProps {
  /** FEN string representing the current position */
  position: string;
  /** Which side faces the player. Default: "white" */
  orientation?: PlayerColor;
  /** Whose turn it is (controls interactivity). Default: parsed from FEN */
  turnColor?: PlayerColor;
  /** Last move to highlight */
  lastMove?: BoardMove;
  /** Square with king in check (for highlight) */
  check?: string;
  /** Map of valid moves: from-square -> list of to-squares */
  validMoves?: ValidMovesMap;
  /** Game end overlay configuration */
  gameEndOverlay?: GameEndOverlay;

  /** Called when the user completes a move */
  onMove?: (move: BoardMove) => void;
  /** Called when the user sets a premove */
  onPremove?: (move: BoardMove) => void;
  /** Called when premoves are cleared */
  onPremoveClear?: () => void;
  /** Called to play a sound. If not provided and enableSounds is true, uses built-in sounds. */
  onPlaySound?: (sound: MoveSound) => void;

  /** Board size in pixels, or "contain" to fit the largest square within the parent.
   *  Default: sizes to parent width. */
  size?: number | 'contain';
  /** Additional CSS class */
  className?: string;
  /** Inline styles (useful for CSS custom properties / theming) */
  style?: Record<string, string | number | undefined>;
  /** Show rank and file labels. Default: true */
  showCoordinates?: boolean;
  /** Enable move animations. Default: true */
  enableAnimations?: boolean;
  /** Animation duration in milliseconds. Default: 300 */
  animationDuration?: number;
  /** Enable built-in sound effects (used when onPlaySound is not provided). Default: true */
  enableSounds?: boolean;
  /** Arrows drawn on the board. Provide with onArrowsChange to enable right-click arrow drawing. */
  arrows?: BoardArrow[];
  /** Called when arrows change (added/removed via right-click drag). */
  onArrowsChange?: (arrows: BoardArrow[]) => void;
  /** Highlighted squares. Provide with onHighlightsChange to enable right-click square highlighting. */
  highlights?: SquareNotation[];
  /** Called when highlights change (toggled via right-click). */
  onHighlightsChange?: (highlights: SquareNotation[]) => void;
  /** Enable premove functionality. Default: false */
  enablePremoves?: boolean;
  /** Show valid move indicators (dots/rings) on the board. Default: true */
  showMoveIndicators?: boolean;
  /** Auto-promote pawns to this piece (skip dialog) */
  autoPromotionPiece?: PromotionPiece;
  /** Whether white pieces are interactive. Default: true */
  whiteMovable?: boolean;
  /** Whether black pieces are interactive. Default: true */
  blackMovable?: boolean;
  /** Custom premove candidate generator. Called when the user selects a piece for premove.
   *  Return destination squares the piece could potentially move to (ignoring blocking/check).
   *  Default: standard chess movement patterns. */
  premoveCandidates?: (piece: Piece, square: SquareNotation) => SquareNotation[];
  /** When true, board is non-interactive with a translucent overlay. Default: false */
  readonly?: boolean;
}

// ============================================================================
// ChessBoard Component
// ============================================================================

export const ChessBoard: React.FC<ChessBoardProps> = ({
  position,
  orientation = 'white',
  turnColor: turnColorProp,
  lastMove,
  check,
  validMoves,
  gameEndOverlay,
  onMove,
  onPremove,
  onPremoveClear,
  onPlaySound,
  size,
  className,
  style: styleProp,
  showCoordinates = true,
  enableAnimations = true,
  animationDuration = 300,
  enableSounds = true,
  arrows: arrowsProp,
  onArrowsChange,
  highlights: highlightsProp,
  onHighlightsChange,
  enablePremoves = false,
  showMoveIndicators = true,
  autoPromotionPiece,
  premoveCandidates: premoveCandidatesFn,
  whiteMovable = true,
  blackMovable = true,
  readonly: readonlyMode = false,
}) => {
  const boardId = React.useId();
  const [boardSize, setBoardSize] = useState(typeof size === 'number' ? size : 512);
  const boardRef = useRef<HTMLDivElement>(null);
  const prevPositionRef = useRef<string | null>(null);
  const prevBoardRef = useRef<(Piece | null)[][] | null>(null);
  const wasDragMoveRef = useRef(false);
  // Tracks whether a drag is active — used to suppress click events that fire after drop
  const dragActiveRef = useRef(false);
  // Populated by DragCanceller component inside DndProvider context
  const cancelDragRef = useRef<() => void>(() => {});

  const squareSize = boardSize / 8;
  const flipped = orientation === 'black';

  // Parse turn color from FEN if not provided
  const turnColor: PlayerColor = useMemo(() => {
    if (turnColorProp) return turnColorProp;
    const parts = position.split(' ');
    return parts[1] === 'b' ? 'black' : 'white';
  }, [turnColorProp, position]);

  const movableColor: PlayerColor | 'both' | 'none' =
    whiteMovable && blackMovable ? 'both' :
    whiteMovable ? 'white' :
    blackMovable ? 'black' :
    'none';

  // Parse FEN to board array (memoized)
  const boardState = useMemo(() => fenToPieceArray(position), [position]);

  // Convert validMoves Map to internal format for quick lookup
  const validMovesInternal = useMemo(() => {
    if (!validMoves) return new Map<string, Position[]>();
    const internal = new Map<string, Position[]>();
    for (const [from, tos] of validMoves) {
      const positions = tos.map(to => squareToPosition(to));
      internal.set(from, positions);
    }
    return internal;
  }, [validMoves]);

  // Determine interactivity
  const canMove = !readonlyMode && !gameEndOverlay && !!validMoves && validMoves.size > 0;
  const canPremove = !readonlyMode && !gameEndOverlay && enablePremoves;

  // Sound helper
  const playSound = useCallback(
    (sound: MoveSound) => {
      if (onPlaySound) {
        onPlaySound(sound);
      } else if (enableSounds) {
        soundManager.ensureReady();
        switch (sound) {
          case 'premove':
            soundManager.playPreMove();
            break;
          case 'error':
            soundManager.playError();
            break;
          case 'move':
            soundManager.playMove();
            break;
          case 'capture':
            soundManager.playCapture();
            break;
          case 'check':
            soundManager.playCheck();
            break;
          case 'checkmate':
            soundManager.playCheckmate();
            break;
          case 'promotion':
            soundManager.playPromotion();
            break;
          case 'draw':
            soundManager.playDraw();
            break;
          case 'gamestart':
            soundManager.playGameStart();
            break;
        }
      }
    },
    [onPlaySound, enableSounds]
  );

  // Initialize sounds
  useEffect(() => {
    if (enableSounds && !onPlaySound) {
      soundManager.ensureReady();
    }
  }, [enableSounds, onPlaySound]);

  // UI State
  const uiState = useBoardUIState();

  // Convert controlled arrows/highlights from algebraic to internal Position format.
  const enableArrows = !!onArrowsChange;
  const enableHighlights = !!onHighlightsChange;

  const effectiveArrows = useMemo(() => {
    if (!arrowsProp) return [];
    return arrowsProp.map(a => ({
      from: squareToPosition(a.from),
      to: squareToPosition(a.to),
    }));
  }, [arrowsProp]);

  const effectiveHighlights = useMemo(() => {
    if (!highlightsProp) return [];
    return highlightsProp.map(s => squareToPosition(s));
  }, [highlightsProp]);

  // Setters that convert internal Position back to algebraic and fire callbacks.
  const setArrowsControlled: typeof uiState.setArrows = useCallback(
    (value) => {
      if (!onArrowsChange) return;
      const newArrows = typeof value === 'function' ? value(effectiveArrows) : value;
      onArrowsChange(newArrows.map(a => ({
        from: positionToSquare(a.from),
        to: positionToSquare(a.to),
      })));
    },
    [onArrowsChange, effectiveArrows]
  );

  const setHighlightsControlled: typeof uiState.setHighlightedSquares = useCallback(
    (value) => {
      if (!onHighlightsChange) return;
      const newHighlights = typeof value === 'function' ? value(effectiveHighlights) : value;
      onHighlightsChange(newHighlights.map(p => positionToSquare(p)));
    },
    [onHighlightsChange, effectiveHighlights]
  );

  // Animation system
  const animations = usePieceAnimations({
    enableAnimations,
    animationDuration,
  });

  // Animate on position change. useLayoutEffect ensures animation state is set
  // before the browser paints, so combined with no CSS transitions on squares/pieces,
  // the transitional render is never visible.
  useLayoutEffect(() => {
    if (
      prevPositionRef.current &&
      prevPositionRef.current !== position &&
      lastMove &&
      enableAnimations &&
      prevBoardRef.current
    ) {
      const from = squareToPosition(lastMove.from);
      const to = squareToPosition(lastMove.to);
      const isDragMove = wasDragMoveRef.current;
      const prevPiece = prevBoardRef.current[from.rank]?.[from.file];

      if (prevPiece) {
        type AnimPiece = { piece: Piece; from: Position; to: Position };
        const piecesToAnimate: AnimPiece[] = [];

        // Only animate main piece for non-drag moves
        if (!isDragMove) {
          piecesToAnimate.push({ piece: prevPiece, from, to });
        }

        // Detect castling rook
        if (
          prevPiece.type === PieceType.King &&
          Math.abs(to.file - from.file) === 2
        ) {
          if (to.file > from.file) {
            const rook = boardState[to.rank]?.[5];
            if (rook && rook.type === PieceType.Rook) {
              piecesToAnimate.push({
                piece: rook,
                from: { file: 7, rank: to.rank },
                to: { file: 5, rank: to.rank },
              });
            }
          } else {
            const rook = boardState[to.rank]?.[3];
            if (rook && rook.type === PieceType.Rook) {
              piecesToAnimate.push({
                piece: rook,
                from: { file: 0, rank: to.rank },
                to: { file: 3, rank: to.rank },
              });
            }
          }
        }

        if (piecesToAnimate.length > 0) {
          animations.startAnimation(piecesToAnimate);
        }
      }
    }

    // When position changes, update valid moves for the selected piece
    // instead of clearing selection (preserves user's selection during opponent moves)
    if (prevPositionRef.current && prevPositionRef.current !== position) {
      if (uiState.selectedSquare) {
        const newMoves = validMovesForSquare(
          uiState.selectedSquare.file,
          uiState.selectedSquare.rank
        );
        uiState.setValidMoves(newMoves);
      }
    }

    wasDragMoveRef.current = false;
    prevPositionRef.current = position;
    prevBoardRef.current = boardState;
  }, [position, lastMove, enableAnimations, boardState, animations, uiState]);

  // Handle responsive sizing
  // - No size prop: size to parent width (most common layout)
  // - size="contain": fit the largest square within parent (for full-viewport layouts)
  // - size={number}: fixed pixel size, no observer
  useEffect(() => {
    if (typeof size === 'number') return;

    const useContain = size === 'contain';

    const handleResize = () => {
      if (boardRef.current && boardRef.current.parentElement) {
        const parentWidth = boardRef.current.parentElement.clientWidth;
        const available = useContain
          ? Math.min(parentWidth, boardRef.current.parentElement.clientHeight) - 20
          : parentWidth;
        setBoardSize(Math.max(200, available));
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    handleResize();
    if (boardRef.current && boardRef.current.parentElement) {
      resizeObserver.observe(boardRef.current.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [size]);

  // Apply premoves visually to the board
  const visualBoardState = useMemo(() => {
    if (uiState.premoves.length === 0) return boardState;

    const visualBoard = boardState.map(row => [...row]);
    for (const pm of uiState.premoves) {
      const from = squareToPosition(pm.from);
      const to = squareToPosition(pm.to);
      const piece = visualBoard[from.rank]?.[from.file];
      if (piece) {
        visualBoard[from.rank][from.file] = null;
        if (pm.promotion) {
          visualBoard[to.rank][to.file] = {
            type: promotionPieceToPieceType(pm.promotion),
            color: piece.color,
          };
        } else {
          visualBoard[to.rank][to.file] = piece;
        }
      }
    }
    return visualBoard;
  }, [boardState, uiState.premoves]);

  // Get valid moves for a specific square.
  // For the turn player's pieces: return actual valid moves from props.
  // For the non-turn player's pieces (premoves): return movement pattern candidates.
  const turnColorEnum = useMemo(
    () => (turnColor === 'white' ? Color.White : Color.Black),
    [turnColor]
  );

  const validMovesForSquare = useCallback(
    (file: number, rank: number): Position[] => {
      const piece = visualBoardState[rank]?.[file];
      if (!piece) return [];

      if (piece.color === turnColorEnum && canMove) {
        // Turn player's piece — use actual valid moves
        const sq = positionToSquare({ file, rank });
        return validMovesInternal.get(sq) || [];
      }

      if (piece.color !== turnColorEnum && canPremove) {
        // Non-turn player's piece — use movement pattern for premoves,
        // but only if this color is movable (not AI-controlled)
        const pieceColor: PlayerColor = piece.color === Color.White ? 'white' : 'black';
        if (movableColor === 'both' || movableColor === pieceColor) {
          if (premoveCandidatesFn) {
            const sq = positionToSquare({ file, rank });
            return premoveCandidatesFn(piece, sq).map(s => squareToPosition(s));
          }
          return getPremoveCandidates(piece, file, rank);
        }
      }

      return [];
    },
    [turnColorEnum, canMove, canPremove, validMovesInternal, visualBoardState, movableColor, premoveCandidatesFn]
  );

  // Check if a pawn is promoting
  const isPawnPromotion = useCallback(
    (fromFile: number, fromRank: number, toRank: number): boolean => {
      const piece = visualBoardState[fromRank]?.[fromFile];
      if (!piece || piece.type !== PieceType.Pawn) return false;
      const promotionRank = piece.color === Color.White ? 7 : 0;
      return toRank === promotionRank;
    },
    [visualBoardState]
  );

  // Handle move attempt (from click or drag)
  const handleMoveAttempt = useCallback(
    (fromFile: number, fromRank: number, toFile: number, toRank: number, isDrag: boolean = false) => {
      if (!onMove) return;

      const fromSq = positionToSquare({ file: fromFile, rank: fromRank });
      const toSq = positionToSquare({ file: toFile, rank: toRank });

      // Check if this is a valid move
      const validDests = validMovesInternal.get(fromSq);
      if (!validDests || !validDests.some(p => p.file === toFile && p.rank === toRank)) {
        // Invalid move — show check feedback if applicable
        if (check) {
          const checkPos = squareToPosition(check);
          uiState.setKingInCheckHighlight(checkPos);
          setTimeout(() => uiState.setKingInCheckHighlight(null), 1000);
          playSound('error');
        }
        return;
      }

      wasDragMoveRef.current = isDrag;

      // Check for promotion
      if (isPawnPromotion(fromFile, fromRank, toRank)) {
        if (autoPromotionPiece) {
          onMove({ from: fromSq, to: toSq, promotion: autoPromotionPiece });
        } else {
          const piece = visualBoardState[fromRank]?.[fromFile];
          uiState.setPromotionDialog({
            isOpen: true,
            fromFile,
            fromRank,
            toFile,
            toRank,
            color: piece?.color ?? Color.White,
            isPreMove: false,
          });
        }
      } else {
        onMove({ from: fromSq, to: toSq });
      }

      uiState.clearSelection();
    },
    [
      onMove,
      validMovesInternal,
      check,
      isPawnPromotion,
      autoPromotionPiece,
      visualBoardState,
      uiState,
      playSound,
    ]
  );

  // Handle premove attempt
  const handlePremoveAttempt = useCallback(
    (fromFile: number, fromRank: number, toFile: number, toRank: number) => {
      // Validate against piece movement pattern
      const candidates = validMovesForSquare(fromFile, fromRank);
      if (!candidates.some(p => p.file === toFile && p.rank === toRank)) {
        return;
      }

      const fromSq = positionToSquare({ file: fromFile, rank: fromRank });
      const toSq = positionToSquare({ file: toFile, rank: toRank });

      // Check for promotion
      if (isPawnPromotion(fromFile, fromRank, toRank)) {
        if (autoPromotionPiece) {
          const move: BoardMove = { from: fromSq, to: toSq, promotion: autoPromotionPiece };
          uiState.addPremove(move);
          onPremove?.(move);
          playSound('premove');
        } else {
          const piece = visualBoardState[fromRank]?.[fromFile];
          uiState.setPromotionDialog({
            isOpen: true,
            fromFile,
            fromRank,
            toFile,
            toRank,
            color: piece?.color ?? Color.White,
            isPreMove: true,
          });
        }
      } else {
        const move: BoardMove = { from: fromSq, to: toSq };
        uiState.addPremove(move);
        onPremove?.(move);
        playSound('premove');
      }

      uiState.clearSelection();
    },
    [
      validMovesForSquare,
      isPawnPromotion,
      autoPromotionPiece,
      visualBoardState,
      uiState,
      onPremove,
      playSound,
    ]
  );

  // Handle premoves on position change.
  //
  // Premove lifecycle:
  //   1. User queues premoves during opponent's turn (stored in uiState.premoves)
  //   2. Opponent moves → position changes → first premove executes
  //   3. Our premove changes position again → we must NOT execute the next premove yet
  //   4. Opponent responds → position changes → next premove executes
  //   5. If any premove is invalid (piece captured, blocked, etc.) → clear entire queue
  //
  // Key: only execute premoves when it becomes our turn from the OPPONENT's move,
  // not from our own premove execution. We track this with executedPremoveRef.
  const prevPositionForPremoves = useRef(position);
  const executedPremoveRef = useRef(false);
  useEffect(() => {
    if (prevPositionForPremoves.current === position) return;
    prevPositionForPremoves.current = position;

    if (uiState.premoves.length === 0) {
      executedPremoveRef.current = false;
      return;
    }

    if (!lastMove) {
      // Position changed without a move (reset/load) — clear premoves
      uiState.clearPremoves();
      onPremoveClear?.();
      executedPremoveRef.current = false;
      return;
    }

    // If we just executed a premove ourselves, this position change is from our
    // own move. Don't execute the next premove — wait for the opponent to respond.
    if (executedPremoveRef.current) {
      executedPremoveRef.current = false;

      // However, validate that our premoved piece still exists on the new board.
      // If the queue has remaining premoves, check the NEXT premove's piece.
      // (Our move already happened, so the next premove's piece should be at its
      // premoved destination or original square — but on a real board with opponent
      // responses pending, we can't validate yet. Just leave the queue as is.)
      return;
    }

    // Opponent moved — try to execute our premove if it's now our turn
    if (!onMove || !validMoves || validMoves.size === 0) return;

    const premove = uiState.premoves[0];
    const fromPos = squareToPosition(premove.from);
    const piece = boardState[fromPos.rank]?.[fromPos.file];
    const turnColorEnum = turnColor === 'white' ? Color.White : Color.Black;

    // Piece must exist and belong to the current turn
    if (!piece || piece.color !== turnColorEnum) {
      uiState.clearPremoves();
      return;
    }

    // Validate against current valid moves
    const validDests = validMovesInternal.get(premove.from);
    const toPos = squareToPosition(premove.to);
    const isValid = validDests?.some(
      p => p.file === toPos.file && p.rank === toPos.rank
    ) ?? false;

    if (isValid) {
      executedPremoveRef.current = true;
      wasDragMoveRef.current = true; // suppress animation — piece is already visually at destination
      uiState.shiftPremove();
      onMove(premove);
    } else {
      uiState.clearPremoves();
    }
  }, [position, lastMove, boardState, turnColor, validMoves, validMovesInternal, uiState, onMove, onPremoveClear]);

  // Promotion dialog handlers
  const handlePromotion = useCallback(
    (pieceType: PieceType) => {
      const promotion: PromotionPiece =
        pieceType === PieceType.Queen
          ? 'queen'
          : pieceType === PieceType.Rook
            ? 'rook'
            : pieceType === PieceType.Bishop
              ? 'bishop'
              : 'knight';

      const fromSq = positionToSquare({
        file: uiState.promotionDialog.fromFile,
        rank: uiState.promotionDialog.fromRank,
      });
      const toSq = positionToSquare({
        file: uiState.promotionDialog.toFile,
        rank: uiState.promotionDialog.toRank,
      });

      if (uiState.promotionDialog.isPreMove) {
        const move: BoardMove = { from: fromSq, to: toSq, promotion };
        uiState.addPremove(move);
        onPremove?.(move);
        playSound('premove');
      } else {
        onMove?.({ from: fromSq, to: toSq, promotion });
      }

      uiState.setPromotionDialog(prev => ({ ...prev, isOpen: false }));
      uiState.clearSelection();
    },
    [uiState, onMove, onPremove, playSound]
  );

  const handlePromotionCancel = useCallback(() => {
    uiState.setPromotionDialog(prev => ({ ...prev, isOpen: false }));
  }, [uiState]);

  // Premove squares for highlighting
  const preMoveSquares = useMemo(() => {
    return uiState.premoves.flatMap(pm => {
      const from = squareToPosition(pm.from);
      const to = squareToPosition(pm.to);
      return [from, to];
    });
  }, [uiState.premoves]);

  // Drag and drop handlers
  const dragDropHandlers = useBoardDragDrop({
    boardState: visualBoardState,
    turnColor,
    movableColor,
    validMovesForSquare,
    setSelectedSquare: uiState.setSelectedSquare,
    setValidMoves: uiState.setValidMoves,
    setArrows: setArrowsControlled,
    setHighlightedSquares: setHighlightsControlled,
    onMoveAttempt: handleMoveAttempt,
    onPremoveAttempt: handlePremoveAttempt,
    canMove,
    canPremove,
  });

  // Click handlers
  const clickHandlers = useBoardClicks({
    boardState: visualBoardState,
    turnColor,
    movableColor,
    validMovesForSquare,
    selectedSquare: uiState.selectedSquare,
    setSelectedSquare: uiState.setSelectedSquare,
    setValidMoves: uiState.setValidMoves,
    setArrows: setArrowsControlled,
    setHighlightedSquares: setHighlightsControlled,
    arrowStart: uiState.arrowStart,
    setArrowStart: uiState.setArrowStart,
    onMoveAttempt: handleMoveAttempt,
    onPremoveAttempt: handlePremoveAttempt,
    canMove,
    canPremove,
    enableArrows,
    enableHighlights,
    premoves: uiState.premoves,
    clearPremoves: () => {
      uiState.clearPremoves();
      onPremoveClear?.();
    },
  });

  // Square state helpers
  const isSquareSelected = useCallback(
    (file: number, rank: number) =>
      uiState.selectedSquare
        ? uiState.selectedSquare.file === file && uiState.selectedSquare.rank === rank
        : false,
    [uiState.selectedSquare]
  );

  const isValidMoveSquare = useCallback(
    (file: number, rank: number) =>
      uiState.validMoves.some(move => move.file === file && move.rank === rank),
    [uiState.validMoves]
  );

  const isCapture = useCallback(
    (file: number, rank: number) => {
      if (!isValidMoveSquare(file, rank)) return false;
      const targetPiece = visualBoardState[rank]?.[file];
      return !!targetPiece;
    },
    [isValidMoveSquare, visualBoardState]
  );

  const isPreMoveSquare = useCallback(
    (file: number, rank: number) =>
      preMoveSquares.some(sq => sq.file === file && sq.rank === rank),
    [preMoveSquares]
  );

  const isAnimatingFrom = useCallback(
    (file: number, rank: number) =>
      animations.animatingPieces?.pieces.some(
        p => p.from.file === file && p.from.rank === rank
      ) || false,
    [animations.animatingPieces]
  );

  const isAnimatingTo = useCallback(
    (file: number, rank: number) =>
      animations.animatingPieces?.pieces.some(
        p => p.to.file === file && p.to.rank === rank
      ) || false,
    [animations.animatingPieces]
  );

  // Last move highlight from props
  const lastMoveFrom = useMemo(
    () => (lastMove ? squareToPosition(lastMove.from) : null),
    [lastMove]
  );
  const lastMoveTo = useMemo(
    () => (lastMove ? squareToPosition(lastMove.to) : null),
    [lastMove]
  );

  const isLastMoveFrom = useCallback(
    (file: number, rank: number) =>
      lastMoveFrom ? lastMoveFrom.file === file && lastMoveFrom.rank === rank : false,
    [lastMoveFrom]
  );

  const isLastMoveTo = useCallback(
    (file: number, rank: number) =>
      lastMoveTo ? lastMoveTo.file === file && lastMoveTo.rank === rank : false,
    [lastMoveTo]
  );

  const isHighlighted = useCallback(
    (file: number, rank: number) =>
      effectiveHighlights.some(sq => sq.file === file && sq.rank === rank),
    [effectiveHighlights]
  );

  // Check highlight from props
  const checkPosition = useMemo(
    () => (check ? squareToPosition(check) : null),
    [check]
  );

  const isKingInCheck = useCallback(
    (file: number, rank: number) => {
      // From props
      if (checkPosition && checkPosition.file === file && checkPosition.rank === rank) {
        return true;
      }
      // From invalid move feedback
      if (
        uiState.kingInCheckHighlight &&
        uiState.kingInCheckHighlight.file === file &&
        uiState.kingInCheckHighlight.rank === rank
      ) {
        return true;
      }
      return false;
    },
    [checkPosition, uiState.kingInCheckHighlight]
  );

  // Find king positions for game end overlay
  const findKingPositions = useCallback(() => {
    const kings: { white?: Position; black?: Position } = {};
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = boardState[rank]?.[file];
        if (piece?.type === PieceType.King) {
          if (piece.color === Color.White) {
            kings.white = { file, rank };
          } else {
            kings.black = { file, rank };
          }
        }
      }
    }
    return kings;
  }, [boardState]);

  // Determine if a piece at a given square is draggable
  const isPieceDraggable = useCallback(
    (file: number, rank: number): boolean => {
      const piece = visualBoardState[rank]?.[file];
      if (!piece) return false;
      const pieceColor: PlayerColor = piece.color === Color.White ? 'white' : 'black';
      if (movableColor !== 'both' && movableColor !== pieceColor) return false;
      const isTurn = piece.color === turnColorEnum;
      return (isTurn && canMove) || (!isTurn && canPremove);
    },
    [visualBoardState, movableColor, turnColorEnum, canMove, canPremove]
  );

  // Prepare display board (apply flipping)
  let displayBoard = visualBoardState.map(row => [...row]);
  // Convert from rank-indexed to display-indexed (rank 7 at top)
  displayBoard = [...displayBoard].reverse();
  if (flipped) {
    displayBoard = [...displayBoard].reverse();
    displayBoard = displayBoard.map(row => [...row].reverse());
  }

  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <CustomDragLayer squareSize={squareSize} boardId={boardId} />
      <DragCanceller cancelRef={cancelDragRef} />
      <div
        ref={boardRef}
        className={`${styles.chessBoard}${className ? ` ${className}` : ''}`}
        style={{
          ...styleProp,
          width: boardSize,
          height: boardSize,
          gridTemplateColumns: `repeat(8, ${squareSize}px)`,
          gridTemplateRows: `repeat(8, ${squareSize}px)`,
          fontSize: Math.max(10, squareSize * 0.12),
        }}
      >
        {displayBoard.map((row, rankIndex) =>
          row.map((piece, fileIndex) => {
            const actualRank = flipped ? rankIndex : 7 - rankIndex;
            const actualFile = flipped ? 7 - fileIndex : fileIndex;

            return (
              <Square
                key={`${actualFile}-${actualRank}`}
                file={actualFile}
                rank={actualRank}
                piece={piece}
                flipped={flipped}
                showCoordinates={showCoordinates}
                isSelected={isSquareSelected(actualFile, actualRank)}
                isValidMove={showMoveIndicators && isValidMoveSquare(actualFile, actualRank)}
                isCapture={isCapture(actualFile, actualRank)}
                isAnimatingFrom={isAnimatingFrom(actualFile, actualRank)}
                isAnimatingTo={isAnimatingTo(actualFile, actualRank)}
                isLastMoveFrom={isLastMoveFrom(actualFile, actualRank)}
                isLastMoveTo={isLastMoveTo(actualFile, actualRank)}
                isHighlighted={isHighlighted(actualFile, actualRank)}
                isPreMove={isPreMoveSquare(actualFile, actualRank)}
                isKingInCheck={isKingInCheck(actualFile, actualRank)}
                onSquareClick={(f, r) => {
                  if (dragActiveRef.current) return;
                  clickHandlers.handleSquareClick(f, r);
                }}
                onDrop={dragDropHandlers.handleDrop}
                onDragStart={(f, r) => {
                  dragActiveRef.current = true;
                  dragDropHandlers.handleDragStart(f, r);
                }}
                onDragEnd={(f, r) => {
                  dragDropHandlers.handleDragEnd(f, r);
                  // Clear on next frame — after any click events that fire on mouseup
                  requestAnimationFrame(() => { dragActiveRef.current = false; });
                }}
                onRightMouseDown={(f, r) => {
                  if (dragActiveRef.current) {
                    cancelDragRef.current();
                    return;
                  }
                  clickHandlers.handleRightMouseDown(f, r);
                }}
                onRightMouseUp={(f, r) => {
                  if (dragActiveRef.current) return;
                  clickHandlers.handleRightMouseUp(f, r);
                }}
                boardId={boardId}
                draggable={isPieceDraggable(actualFile, actualRank)}
              />
            );
          })
        )}

        {/* Arrow overlay */}
        <ArrowOverlay
          arrows={effectiveArrows}
          boardSize={boardSize}
          squareSize={squareSize}
          flipped={flipped}
        />

        {enableAnimations && (
          <PieceAnimations
            animationState={animations.animatingPieces}
            squareSize={squareSize}
            animationDuration={animationDuration}
            flipped={flipped}
            onAnimationComplete={animations.handleAnimationComplete}
          />
        )}

        {/* Promotion dialog overlay */}
        <PromotionDialog
          isOpen={uiState.promotionDialog.isOpen}
          color={uiState.promotionDialog.color}
          promotionSquare={{
            file: uiState.promotionDialog.toFile,
            rank: uiState.promotionDialog.toRank,
          }}
          squareSize={squareSize}
          flipped={flipped}
          onSelect={handlePromotion}
          onCancel={handlePromotionCancel}
        />

        {/* Game end badges */}
        {gameEndOverlay && (() => {
          const kingPositions = findKingPositions();
          const badges = [];

          if (gameEndOverlay.type === 'checkmate' && gameEndOverlay.winner) {
            if (kingPositions.white) {
              badges.push(
                <GameEndBadge
                  key='white-king'
                  kingPosition={kingPositions.white}
                  squareSize={squareSize}
                  flipped={flipped}
                  badgeType={gameEndOverlay.winner === 'white' ? 'winner' : 'loser'}
                />
              );
            }
            if (kingPositions.black) {
              badges.push(
                <GameEndBadge
                  key='black-king'
                  kingPosition={kingPositions.black}
                  squareSize={squareSize}
                  flipped={flipped}
                  badgeType={gameEndOverlay.winner === 'black' ? 'winner' : 'loser'}
                />
              );
            }
          } else if (gameEndOverlay.type === 'stalemate' || gameEndOverlay.type === 'draw') {
            if (kingPositions.white) {
              badges.push(
                <GameEndBadge
                  key='white-king'
                  kingPosition={kingPositions.white}
                  squareSize={squareSize}
                  flipped={flipped}
                  badgeType='draw'
                />
              );
            }
            if (kingPositions.black) {
              badges.push(
                <GameEndBadge
                  key='black-king'
                  kingPosition={kingPositions.black}
                  squareSize={squareSize}
                  flipped={flipped}
                  badgeType='draw'
                />
              );
            }
          }

          return badges;
        })()}

        {/* Readonly overlay */}
        {readonlyMode && (
          <div className={styles.readonlyOverlay} />
        )}
      </div>
    </DndProvider>
  );
};

ChessBoard.displayName = 'ChessBoard';
