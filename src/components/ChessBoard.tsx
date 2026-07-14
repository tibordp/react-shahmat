import React, {
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
} from 'react';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { Square } from './Square';
import { ArrowOverlay } from './ArrowOverlay';
import { PromotionDialog } from './PromotionDialog';
import { PieceAnimations } from './PieceAnimations';
import { CustomDragLayer } from './CustomDragLayer';
import { DragCanceller } from './DragCanceller';
import { GameEndBadge } from './GameEndBadge';
import { usePieceAnimations } from '../hooks/usePieceAnimations';
import { useBoardDragDrop } from '../hooks/useBoardDragDrop';
import { useBoardClicks } from '../hooks/useBoardClicks';
import { useBoardUIState } from '../hooks/useBoardUIState';
import { useBoardKeyboard } from '../hooks/useBoardKeyboard';
import { getPremoveCandidates } from '../utils/premoveCandidates';
import { Piece, Position, PieceType, Color } from '../engine/chessRules';
import { describePiece, defaultPieceSet } from '../utils/pieceIcons';
import type { PieceSet } from '../types';
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
// ChessBoard Props
// ============================================================================

/** Standard CSS properties plus CSS custom properties for board theming */
export type ChessBoardStyle = React.CSSProperties &
  Record<`--${string}`, string | number>;

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
  /** Called to play a sound. Provided by useChessGame, or implement your own. */
  onPlaySound?: (sound: MoveSound) => void;

  /** Board size in pixels, or "contain" to fit the largest square within the parent.
   *  Default: sizes to parent width. */
  size?: number | 'contain';
  /** Additional CSS class */
  className?: string;
  /** Inline styles; CSS custom properties (--light-square, …) are accepted for theming */
  style?: ChessBoardStyle;
  /** Show rank and file labels. Default: true */
  showCoordinates?: boolean;
  /** Enable move animations. Default: true */
  enableAnimations?: boolean;
  /** Animation duration in milliseconds. Default: 300 */
  animationDuration?: number;
  /** Arrows drawn on the board (controlled). Provide with onArrowsChange to own arrow state. */
  arrows?: BoardArrow[];
  /** Called when arrows change (added/removed via right-click drag). */
  onArrowsChange?: (arrows: BoardArrow[]) => void;
  /** Highlighted squares (controlled). Provide with onHighlightsChange to own highlight state. */
  highlights?: SquareNotation[];
  /** Called when highlights change (toggled via right-click). */
  onHighlightsChange?: (highlights: SquareNotation[]) => void;
  /**
   * Enable right-click arrow drawing. Defaults to true when onArrowsChange is
   * provided (controlled); pass true without onArrowsChange for the board to
   * manage arrow state internally (uncontrolled).
   */
  enableArrows?: boolean;
  /**
   * Enable right-click square highlighting. Defaults to true when
   * onHighlightsChange is provided (controlled); pass true without
   * onHighlightsChange for the board to manage highlight state internally.
   */
  enableHighlights?: boolean;
  /** Enable premove functionality. Default: false */
  enablePremoves?: boolean;
  /** Allow stacking multiple premoves. When false, only one premove at a time
   *  (new premove replaces existing). Default: true */
  stackPremoves?: boolean;
  /** Show valid move indicators (dots/rings) on the board. Default: true */
  showMoveIndicators?: boolean;
  /** Custom piece image set. Maps piece keys (wK, bQ, etc.) to image URLs.
   *  URLs should come from bundler imports, not hardcoded strings. */
  pieceSet?: PieceSet;
  /** Full custom piece rendering. Receives piece info and square size, returns ReactNode.
   *  Takes priority over pieceSet. */
  renderPiece?: (piece: Piece, size: number) => React.ReactNode;
  /** Auto-promote pawns to this piece (skip dialog) */
  autoPromotionPiece?: PromotionPiece;
  /** Allow castling by dragging/clicking the king more than 1 square along the home rank. Default: true */
  looseCastling?: boolean;
  /** Whether white pieces are interactive. Default: true */
  whiteMovable?: boolean;
  /** Whether black pieces are interactive. Default: true */
  blackMovable?: boolean;
  /** Custom premove candidate generator. Called when the user selects a piece for premove.
   *  Return destination squares the piece could potentially move to (ignoring blocking/check).
   *  Default: standard chess movement patterns. */
  premoveCandidates?: (
    piece: Piece,
    square: SquareNotation
  ) => SquareNotation[];
  /** When true, highlights the square under the cursor during piece drag. Default: false */
  highlightDropTarget?: boolean;
  /**
   * Keyboard navigation: arrow keys move a focus cursor, Enter/Space
   * selects and moves, Escape clears. Default: enabled when the board is
   * interactive (an onMove/onPremove handler is provided and the board is
   * not readonly); static diagrams are skipped by the Tab order. Pass false
   * to opt out entirely (e.g. when the host app owns arrow-key bindings).
   */
  enableKeyboardNavigation?: boolean;
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
  arrows: arrowsProp,
  onArrowsChange,
  highlights: highlightsProp,
  onHighlightsChange,
  enableArrows: enableArrowsProp,
  enableHighlights: enableHighlightsProp,
  enablePremoves = false,
  stackPremoves = true,
  showMoveIndicators = true,
  pieceSet,
  renderPiece,
  autoPromotionPiece,
  looseCastling = true,
  premoveCandidates: premoveCandidatesFn,
  whiteMovable = true,
  highlightDropTarget = false,
  enableKeyboardNavigation,
  blackMovable = true,
  readonly: readonlyMode = false,
}) => {
  const boardId = React.useId();
  // A numeric size prop is authoritative and reactive; the measured size is
  // only used in the responsive modes (no size prop, or size="contain").
  const [measuredSize, setMeasuredSize] = useState(512);
  const boardSize = typeof size === 'number' ? size : measuredSize;
  const boardRef = useRef<HTMLDivElement>(null);
  const prevPositionRef = useRef<string | null>(null);
  const prevBoardRef = useRef<(Piece | null)[][] | null>(null);
  const wasDragMoveRef = useRef(false);
  // Tracks whether a drag is active — used to suppress click events that fire after drop
  const dragActiveRef = useRef(false);
  const checkFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Populated by DragCanceller component inside DndProvider context
  const cancelDragRef = useRef<() => void>(() => {});

  // Clear any pending check-flash timer on unmount so it can't set state on
  // an unmounted tree.
  useEffect(() => {
    return () => {
      if (checkFlashTimerRef.current) clearTimeout(checkFlashTimerRef.current);
    };
  }, []);

  const squareSize = boardSize / 8;
  const flipped = orientation === 'black';
  const effectivePieceSet = pieceSet || defaultPieceSet;

  // Parse turn color from FEN if not provided
  const turnColor: PlayerColor = useMemo(() => {
    if (turnColorProp) return turnColorProp;
    const parts = position.split(' ');
    return parts[1] === 'b' ? 'black' : 'white';
  }, [turnColorProp, position]);

  const movableColor: PlayerColor | 'both' | 'none' =
    whiteMovable && blackMovable
      ? 'both'
      : whiteMovable
        ? 'white'
        : blackMovable
          ? 'black'
          : 'none';

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
  const canMove =
    !readonlyMode && !gameEndOverlay && !!validMoves && validMoves.size > 0;
  const canPremove = !readonlyMode && !gameEndOverlay && enablePremoves;

  // Sound helper — just delegates to onPlaySound callback if provided
  const playSound = useCallback(
    (sound: MoveSound) => {
      onPlaySound?.(sound);
    },
    [onPlaySound]
  );

  // UI State
  const uiState = useBoardUIState();
  // Destructure stable setter/action references for use in callback dependency arrays.
  // React useState setters and useCallback([]) functions have stable identities,
  // so using them directly as deps avoids cascading callback recreation.
  const {
    selectedSquare,
    setSelectedSquare,
    validMoves: selectedSquareMoves,
    setValidMoves,
    setKingInCheckHighlight,
    promotionDialog,
    setPromotionDialog,
    premoves,
    addPremove,
    clearPremoves: uiClearPremoves,
    shiftPremove,
    clearSelection,
    arrowStart,
    setArrowStart,
    kingInCheckHighlight,
  } = uiState;

  const squareDomId = useCallback(
    (file: number, rank: number) => `${boardId}-sq-${file}${rank}`,
    [boardId]
  );

  // Arrows/highlights work controlled (props + change callback) or
  // uncontrolled (internal state); enableArrows/enableHighlights can force
  // the uncontrolled mode on without the consumer owning any state.
  const arrowsControlled = !!onArrowsChange;
  const highlightsControlled = !!onHighlightsChange;
  const enableArrows = enableArrowsProp ?? arrowsControlled;
  const enableHighlights = enableHighlightsProp ?? highlightsControlled;

  const controlledArrows = useMemo(() => {
    if (!arrowsProp) return [];
    return arrowsProp.map(a => ({
      from: squareToPosition(a.from),
      to: squareToPosition(a.to),
    }));
  }, [arrowsProp]);

  const controlledHighlights = useMemo(() => {
    if (!highlightsProp) return [];
    return highlightsProp.map(s => squareToPosition(s));
  }, [highlightsProp]);

  const effectiveArrows = arrowsControlled ? controlledArrows : uiState.arrows;
  const effectiveHighlights = highlightsControlled
    ? controlledHighlights
    : uiState.highlightedSquares;

  // Setters that convert internal Position back to algebraic and fire callbacks.
  const { setArrows: setArrowsInternal } = uiState;
  const { setHighlightedSquares: setHighlightsInternal } = uiState;

  const setArrowsControlled: (typeof uiState)['setArrows'] = useCallback(
    value => {
      if (!onArrowsChange) {
        setArrowsInternal(value);
        return;
      }
      const newArrows =
        typeof value === 'function' ? value(controlledArrows) : value;
      onArrowsChange(
        newArrows.map(a => ({
          from: positionToSquare(a.from),
          to: positionToSquare(a.to),
        }))
      );
    },
    [onArrowsChange, controlledArrows, setArrowsInternal]
  );

  const setHighlightsControlled: (typeof uiState)['setHighlightedSquares'] =
    useCallback(
      value => {
        if (!onHighlightsChange) {
          setHighlightsInternal(value);
          return;
        }
        const newHighlights =
          typeof value === 'function' ? value(controlledHighlights) : value;
        onHighlightsChange(newHighlights.map(p => positionToSquare(p)));
      },
      [onHighlightsChange, controlledHighlights, setHighlightsInternal]
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
      if (selectedSquare) {
        const newMoves = validMovesForSquare(
          selectedSquare.file,
          selectedSquare.rank
        );
        setValidMoves(newMoves);
      }
      // Close promotion dialog if the position it was opened for is no longer valid.
      // Non-premove dialogs: always close (position changed, your move was invalidated).
      // Premove dialogs: close if the piece at the source square is gone or changed
      // (e.g. opponent captured it), but stay open if the piece is still there.
      if (promotionDialog.isOpen) {
        if (!promotionDialog.isPreMove) {
          setPromotionDialog(prev => ({ ...prev, isOpen: false }));
        } else {
          const src =
            boardState[promotionDialog.fromRank]?.[promotionDialog.fromFile];
          if (
            !src ||
            src.color !== promotionDialog.color ||
            src.type !== PieceType.Pawn
          ) {
            setPromotionDialog(prev => ({ ...prev, isOpen: false }));
          }
        }
      }
    }

    // Consume the drag flag only when the position actually changed — this
    // effect also re-runs on selection/dialog changes, and resetting the flag
    // there would break animation suppression if the consumer defers onMove.
    if (prevPositionRef.current !== position) {
      wasDragMoveRef.current = false;
    }
    prevPositionRef.current = position;
    prevBoardRef.current = boardState;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- validMovesForSquare intentionally excluded; including it would clear selection on every move
  }, [
    position,
    lastMove,
    enableAnimations,
    boardState,
    animations.startAnimation,
    selectedSquare,
    setValidMoves,
    promotionDialog,
    setPromotionDialog,
  ]);

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
          ? Math.min(parentWidth, boardRef.current.parentElement.clientHeight) -
            20
          : parentWidth;
        // Ignore transient zero/negative measurements (e.g. display:none or
        // pre-layout); otherwise track the parent exactly, however narrow.
        if (available > 0) setMeasuredSize(available);
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
    if (premoves.length === 0) return boardState;

    const visualBoard = boardState.map(row => [...row]);
    for (const pm of premoves) {
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
  }, [boardState, premoves]);

  // Get valid moves for a specific square.
  // For the turn player's pieces: return actual valid moves from props.
  // For the non-turn player's pieces (premoves): return movement pattern candidates.
  const turnColorEnum = useMemo(
    () => (turnColor === 'white' ? Color.White : Color.Black),
    [turnColor]
  );

  // Premove squares for highlighting (must be before validMovesForSquare which uses it)
  const preMoveSquares = useMemo(() => {
    return premoves.flatMap(pm => {
      const from = squareToPosition(pm.from);
      const to = squareToPosition(pm.to);
      return [from, to];
    });
  }, [premoves]);

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
        // In single-premove mode, don't allow selecting pieces at premove destinations
        if (
          !stackPremoves &&
          premoves.length > 0 &&
          preMoveSquares.some(sq => sq.file === file && sq.rank === rank)
        )
          return [];

        // Non-turn player's piece — use movement pattern for premoves,
        // but only if this color is movable (not AI-controlled)
        const pieceColor: PlayerColor =
          piece.color === Color.White ? 'white' : 'black';
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
    [
      turnColorEnum,
      canMove,
      canPremove,
      stackPremoves,
      preMoveSquares,
      premoves.length,
      validMovesInternal,
      visualBoardState,
      movableColor,
      premoveCandidatesFn,
    ]
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
    (
      fromFile: number,
      fromRank: number,
      toFile: number,
      toRank: number,
      isDrag: boolean = false
    ) => {
      if (!onMove) return;

      const fromSq = positionToSquare({ file: fromFile, rank: fromRank });
      let effectiveToFile = toFile;
      let effectiveToRank = toRank;

      // Chess.com-style castling: if the king is dragged/clicked more than 1 square
      // along its home rank, try the castling destination first, fall back to original.
      const piece = visualBoardState[fromRank]?.[fromFile];
      const validDests = validMovesInternal.get(fromSq);
      if (
        looseCastling &&
        piece?.type === PieceType.King &&
        fromRank === toRank &&
        Math.abs(toFile - fromFile) > 1
      ) {
        const castleFile = toFile > fromFile ? 6 : 2;
        if (
          validDests?.some(p => p.file === castleFile && p.rank === fromRank)
        ) {
          effectiveToFile = castleFile;
          effectiveToRank = fromRank;
        }
        // Otherwise keep original destination — it'll fail validation normally
      }

      if (
        !validDests ||
        !validDests.some(
          p => p.file === effectiveToFile && p.rank === effectiveToRank
        )
      ) {
        // Invalid move — show check feedback if applicable
        if (check) {
          const checkPos = squareToPosition(check);
          setKingInCheckHighlight(checkPos);
          if (checkFlashTimerRef.current) {
            clearTimeout(checkFlashTimerRef.current);
          }
          checkFlashTimerRef.current = setTimeout(() => {
            checkFlashTimerRef.current = null;
            setKingInCheckHighlight(null);
          }, 1000);
          playSound('error');
        }
        return;
      }

      const toSq = positionToSquare({
        file: effectiveToFile,
        rank: effectiveToRank,
      });
      wasDragMoveRef.current = isDrag;

      // Check for promotion
      if (isPawnPromotion(fromFile, fromRank, toRank)) {
        if (autoPromotionPiece) {
          onMove({ from: fromSq, to: toSq, promotion: autoPromotionPiece });
        } else {
          const piece = visualBoardState[fromRank]?.[fromFile];
          setPromotionDialog({
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

      clearSelection();
    },
    [
      onMove,
      validMovesInternal,
      check,
      isPawnPromotion,
      autoPromotionPiece,
      looseCastling,
      visualBoardState,
      setKingInCheckHighlight,
      setPromotionDialog,
      clearSelection,
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

      // In single-premove mode, replace existing premove
      if (!stackPremoves) uiClearPremoves();

      // Check for promotion
      if (isPawnPromotion(fromFile, fromRank, toRank)) {
        if (autoPromotionPiece) {
          const move: BoardMove = {
            from: fromSq,
            to: toSq,
            promotion: autoPromotionPiece,
          };
          addPremove(move);
          onPremove?.(move);
          playSound('premove');
        } else {
          const piece = visualBoardState[fromRank]?.[fromFile];
          setPromotionDialog({
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
        addPremove(move);
        onPremove?.(move);
        playSound('premove');
      }

      clearSelection();
    },
    [
      validMovesForSquare,
      isPawnPromotion,
      autoPromotionPiece,
      stackPremoves,
      visualBoardState,
      uiClearPremoves,
      addPremove,
      setPromotionDialog,
      clearSelection,
      onPremove,
      playSound,
    ]
  );

  // Handle premoves on position change.
  //
  // Premove lifecycle:
  //   1. User queues premoves during opponent's turn (stored in premoves)
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

    if (premoves.length === 0) {
      executedPremoveRef.current = false;
      return;
    }

    if (!lastMove) {
      // Position changed without a move, or lastMove cleared (reset/load) — clear premoves
      uiClearPremoves();
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

    const premove = premoves[0];
    const fromPos = squareToPosition(premove.from);
    const piece = boardState[fromPos.rank]?.[fromPos.file];
    const turnColorEnum = turnColor === 'white' ? Color.White : Color.Black;

    // Piece must exist and belong to the current turn
    if (!piece || piece.color !== turnColorEnum) {
      uiClearPremoves();
      return;
    }

    // Validate against current valid moves
    const validDests = validMovesInternal.get(premove.from);
    const toPos = squareToPosition(premove.to);
    const isValid =
      validDests?.some(p => p.file === toPos.file && p.rank === toPos.rank) ??
      false;

    if (isValid) {
      executedPremoveRef.current = true;
      wasDragMoveRef.current = true; // suppress animation — piece is already visually at destination
      shiftPremove();
      onMove(premove);
    } else {
      uiClearPremoves();
    }
  }, [
    position,
    lastMove,
    boardState,
    turnColor,
    validMoves,
    validMovesInternal,
    premoves,
    uiClearPremoves,
    shiftPremove,
    onMove,
    onPremoveClear,
  ]);

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
        file: promotionDialog.fromFile,
        rank: promotionDialog.fromRank,
      });
      const toSq = positionToSquare({
        file: promotionDialog.toFile,
        rank: promotionDialog.toRank,
      });

      // Decide premove vs regular move based on the piece's color at selection time.
      // This handles: h-v-h (both canMove/canPremove true), AI turn changes while
      // dialog was open, and normal premove flow.
      const promotingPiece =
        visualBoardState[promotionDialog.fromRank]?.[promotionDialog.fromFile];
      const isTurnPiece =
        promotingPiece && promotingPiece.color === turnColorEnum;

      if (isTurnPiece && canMove) {
        onMove?.({ from: fromSq, to: toSq, promotion });
      } else if (canPremove) {
        const move: BoardMove = { from: fromSq, to: toSq, promotion };
        if (!stackPremoves) uiClearPremoves();
        addPremove(move);
        onPremove?.(move);
        playSound('premove');
      }

      setPromotionDialog(prev => ({ ...prev, isOpen: false }));
      clearSelection();
    },
    [
      promotionDialog,
      setPromotionDialog,
      clearSelection,
      uiClearPremoves,
      addPremove,
      onMove,
      onPremove,
      playSound,
      stackPremoves,
      canMove,
      canPremove,
      turnColorEnum,
      visualBoardState,
    ]
  );

  const handlePromotionCancel = useCallback(() => {
    setPromotionDialog(prev => ({ ...prev, isOpen: false }));
  }, [setPromotionDialog]);

  const handlePromotionRightClickCancel = useCallback(() => {
    setPromotionDialog(prev => ({ ...prev, isOpen: false }));
    uiClearPremoves();
    onPremoveClear?.();
  }, [setPromotionDialog, uiClearPremoves, onPremoveClear]);

  // Stable wrapper for clearing premoves + notifying parent
  const clearPremovesAndNotify = useCallback(() => {
    uiClearPremoves();
    onPremoveClear?.();
  }, [uiClearPremoves, onPremoveClear]);

  // Drag and drop handlers
  const dragDropHandlers = useBoardDragDrop({
    boardState: visualBoardState,
    turnColor,
    movableColor,
    validMovesForSquare,
    setSelectedSquare: setSelectedSquare,
    setValidMoves: setValidMoves,
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
    selectedSquare: selectedSquare,
    setSelectedSquare: setSelectedSquare,
    setValidMoves: setValidMoves,
    setArrows: setArrowsControlled,
    setHighlightedSquares: setHighlightsControlled,
    arrowStart: arrowStart,
    setArrowStart: setArrowStart,
    onMoveAttempt: handleMoveAttempt,
    onPremoveAttempt: handlePremoveAttempt,
    canMove,
    canPremove,
    enableArrows,
    enableHighlights,
    premoves: premoves,
    clearPremoves: clearPremovesAndNotify,
  });

  // Precompute per-square state as Sets for O(1) lookup.
  // This avoids calling O(n) .some() 64 times per render.
  const sqKey = (file: number, rank: number) => (rank << 3) | file;

  const validMoveSet = useMemo(
    () => new Set(selectedSquareMoves.map(m => sqKey(m.file, m.rank))),
    [selectedSquareMoves]
  );

  const captureSet = useMemo(() => {
    const set = new Set<number>();
    for (const m of selectedSquareMoves) {
      if (visualBoardState[m.rank]?.[m.file]) {
        set.add(sqKey(m.file, m.rank));
      }
    }
    return set;
  }, [selectedSquareMoves, visualBoardState]);

  const preMoveSet = useMemo(
    () => new Set(preMoveSquares.map(sq => sqKey(sq.file, sq.rank))),
    [preMoveSquares]
  );

  const animatingFromSet = useMemo(
    () =>
      new Set(
        animations.animatingPieces?.pieces.map(p =>
          sqKey(p.from.file, p.from.rank)
        ) ?? []
      ),
    [animations.animatingPieces]
  );

  const animatingToSet = useMemo(
    () =>
      new Set(
        animations.animatingPieces?.pieces.map(p =>
          sqKey(p.to.file, p.to.rank)
        ) ?? []
      ),
    [animations.animatingPieces]
  );

  const highlightSet = useMemo(
    () => new Set(effectiveHighlights.map(sq => sqKey(sq.file, sq.rank))),
    [effectiveHighlights]
  );

  const lastMoveFromKey = useMemo(
    () =>
      lastMove
        ? sqKey(
            squareToPosition(lastMove.from).file,
            squareToPosition(lastMove.from).rank
          )
        : -1,
    [lastMove]
  );
  const lastMoveToKey = useMemo(
    () =>
      lastMove
        ? sqKey(
            squareToPosition(lastMove.to).file,
            squareToPosition(lastMove.to).rank
          )
        : -1,
    [lastMove]
  );

  const selectedKey = selectedSquare
    ? sqKey(selectedSquare.file, selectedSquare.rank)
    : -1;

  const checkPosition = useMemo(
    () => (check ? squareToPosition(check) : null),
    [check]
  );
  const checkKey = checkPosition
    ? sqKey(checkPosition.file, checkPosition.rank)
    : -1;
  const checkHighlightKey = kingInCheckHighlight
    ? sqKey(kingInCheckHighlight.file, kingInCheckHighlight.rank)
    : -1;

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
      const pieceColor: PlayerColor =
        piece.color === Color.White ? 'white' : 'black';
      if (movableColor !== 'both' && movableColor !== pieceColor) return false;
      const isTurn = piece.color === turnColorEnum;
      if (isTurn && canMove) return true;
      if (!isTurn && canPremove) {
        // In single-premove mode, don't allow dragging pieces at premove destinations
        // (they're only there visually — dragging them would premove from a phantom position)
        if (!stackPremoves && preMoveSet.has(sqKey(file, rank))) return false;
        return true;
      }
      return false;
    },
    [
      visualBoardState,
      movableColor,
      turnColorEnum,
      canMove,
      canPremove,
      stackPremoves,
      preMoveSet,
    ]
  );

  // Extract individual handler methods for stable deps (avoids depending on handler objects)
  const { handleSquareClick, handleRightMouseDown, handleRightMouseUp } =
    clickHandlers;
  const { handleDrop, handleDragStart, handleDragEnd } = dragDropHandlers;

  // Stable wrapped handlers for Square (avoids inline arrow functions defeating React.memo)
  const wrappedSquareClick = useCallback(
    (f: number, r: number) => {
      if (dragActiveRef.current) return;
      handleSquareClick(f, r);
    },
    [handleSquareClick]
  );

  // Keyboard navigation: a focus cursor moved with arrow keys, activated
  // with Enter/Space. Only rendered while the board has keyboard-visible
  // focus. Defaults to on for interactive boards; a static diagram (no
  // move handlers, or readonly) stays out of the Tab order.
  const keyboardEnabled =
    enableKeyboardNavigation ??
    (!readonlyMode && (!!onMove || (!!onPremove && canPremove)));
  const {
    focusedSquare,
    keyboardActive,
    syncCursor,
    suppressNextFocusActivation,
    handlers: keyboardHandlers,
  } = useBoardKeyboard({
    readonly: readonlyMode || !keyboardEnabled,
    flipped,
    suspended: promotionDialog.isOpen,
    selectedSquare,
    clearSelection,
    hasPremoves: premoves.length > 0,
    clearPremoves: clearPremovesAndNotify,
    onActivateSquare: wrappedSquareClick,
  });

  // Mouse clicks keep the keyboard cursor in sync so keyboard users can
  // continue from the last clicked square
  const handleSquareClickWithCursor = useCallback(
    (f: number, r: number) => {
      syncCursor(f, r);
      wrappedSquareClick(f, r);
    },
    [syncCursor, wrappedSquareClick]
  );

  const wrappedDragStart = useCallback(
    (f: number, r: number) => {
      dragActiveRef.current = true;
      boardRef.current?.classList.add(styles.dragging);
      handleDragStart(f, r);
    },
    [handleDragStart]
  );

  const wrappedDragEnd = useCallback(
    (f: number, r: number) => {
      handleDragEnd(f, r);
      boardRef.current?.classList.remove(styles.dragging);
      requestAnimationFrame(() => {
        dragActiveRef.current = false;
      });
    },
    [handleDragEnd]
  );

  const wrappedRightMouseDown = useCallback(
    (f: number, r: number) => {
      if (dragActiveRef.current) {
        cancelDragRef.current();
        return;
      }
      handleRightMouseDown(f, r);
    },
    [handleRightMouseDown]
  );

  const wrappedRightMouseUp = useCallback(
    (f: number, r: number) => {
      if (dragActiveRef.current) return;
      handleRightMouseUp(f, r);
    },
    [handleRightMouseUp]
  );

  // Keyboard interaction: arrow keys move the focus cursor (respecting board
  // orientation), Enter/Space acts like a click on the cursor square, Escape
  // dismisses the promotion dialog / selection / premoves in that order.
  // Screen-reader announcement for the most recent move
  const moveAnnouncement = useMemo(() => {
    if (!lastMove) return '';
    const to = squareToPosition(lastMove.to);
    const movedPiece = boardState[to.rank]?.[to.file];
    if (!movedPiece) return '';
    return `${describePiece(movedPiece)} from ${lastMove.from} to ${
      lastMove.to
    }${check ? ', check' : ''}`;
  }, [lastMove, boardState, check]);

  // Prepare display board (apply flipping) — memoized
  const displayBoard = useMemo(() => {
    if (flipped) {
      // Black perspective: keep rank order (rank 0 at top), reverse files
      return visualBoardState.map(row => [...row].reverse());
    }
    // White perspective: reverse rank order (rank 7 at top)
    return [...visualBoardState].reverse();
  }, [visualBoardState, flipped]);

  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <CustomDragLayer
        squareSize={squareSize}
        boardId={boardId}
        pieceSet={effectivePieceSet}
        renderPiece={renderPiece}
      />
      <DragCanceller cancelRef={cancelDragRef} />
      <div
        ref={boardRef}
        role='group'
        aria-label='Chess board'
        tabIndex={keyboardEnabled ? 0 : -1}
        aria-activedescendant={
          keyboardEnabled && keyboardActive && focusedSquare
            ? squareDomId(focusedSquare.file, focusedSquare.rank)
            : undefined
        }
        onKeyDown={keyboardEnabled ? keyboardHandlers.onKeyDown : undefined}
        onFocus={keyboardEnabled ? keyboardHandlers.onFocus : undefined}
        onBlur={keyboardEnabled ? keyboardHandlers.onBlur : undefined}
        onPointerDown={
          keyboardEnabled ? keyboardHandlers.onPointerDown : undefined
        }
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
        <div aria-live='polite' className={styles.srOnly}>
          {moveAnnouncement}
        </div>
        {displayBoard.map((row, rankIndex) =>
          row.map((piece, fileIndex) => {
            const actualRank = flipped ? rankIndex : 7 - rankIndex;
            const actualFile = flipped ? 7 - fileIndex : fileIndex;

            const key = sqKey(actualFile, actualRank);
            return (
              <Square
                key={key}
                file={actualFile}
                rank={actualRank}
                piece={piece}
                flipped={flipped}
                showCoordinates={showCoordinates}
                isSelected={selectedKey === key}
                isValidMove={showMoveIndicators && validMoveSet.has(key)}
                isCapture={captureSet.has(key)}
                isAnimatingFrom={animatingFromSet.has(key)}
                isAnimatingTo={animatingToSet.has(key)}
                isLastMoveFrom={lastMoveFromKey === key}
                isLastMoveTo={lastMoveToKey === key}
                isHighlighted={highlightSet.has(key)}
                isPreMove={preMoveSet.has(key)}
                isKingInCheck={checkKey === key || checkHighlightKey === key}
                onSquareClick={handleSquareClickWithCursor}
                onDrop={handleDrop}
                onDragStart={wrappedDragStart}
                onDragEnd={wrappedDragEnd}
                onRightMouseDown={wrappedRightMouseDown}
                onRightMouseUp={wrappedRightMouseUp}
                boardId={boardId}
                draggable={isPieceDraggable(actualFile, actualRank)}
                squareId={squareDomId(actualFile, actualRank)}
                isFocused={
                  keyboardActive &&
                  focusedSquare?.file === actualFile &&
                  focusedSquare?.rank === actualRank
                }
                highlightDropTarget={highlightDropTarget}
                pieceSet={effectivePieceSet}
                renderPiece={renderPiece}
                squareSize={squareSize}
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
            pieceSet={effectivePieceSet}
            renderPiece={renderPiece}
          />
        )}

        {/* Promotion dialog overlay */}
        <PromotionDialog
          isOpen={promotionDialog.isOpen}
          color={promotionDialog.color}
          promotionSquare={{
            file: promotionDialog.toFile,
            rank: promotionDialog.toRank,
          }}
          squareSize={squareSize}
          flipped={flipped}
          onSelect={handlePromotion}
          onCancel={handlePromotionCancel}
          onRightClickCancel={handlePromotionRightClickCancel}
          onBeforeRestoreFocus={suppressNextFocusActivation}
          pieceSet={effectivePieceSet}
          renderPiece={renderPiece}
        />

        {/* Game end badges */}
        {gameEndOverlay &&
          (() => {
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
                    badgeType={
                      gameEndOverlay.winner === 'white' ? 'winner' : 'loser'
                    }
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
                    badgeType={
                      gameEndOverlay.winner === 'black' ? 'winner' : 'loser'
                    }
                  />
                );
              }
            } else if (
              gameEndOverlay.type === 'stalemate' ||
              gameEndOverlay.type === 'draw'
            ) {
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
          <div
            className={styles.readonlyOverlay}
            onContextMenu={e => e.preventDefault()}
          />
        )}
      </div>
    </DndProvider>
  );
};

ChessBoard.displayName = 'ChessBoard';
