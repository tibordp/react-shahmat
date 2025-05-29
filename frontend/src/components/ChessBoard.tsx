import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { DndProvider, useDrag, useDrop, useDragLayer } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { getEmptyImage } from 'react-dnd-html5-backend';
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
import { useJSChessEngine } from '../hooks/useJSChessEngine';
import { useChessGame } from '../hooks/useChessGame';
import { Piece, Position, PieceType, Color, ChessBoardCallbacks, ChessBoardRef, GameState, Move } from '../engine/jsChessEngine';
import { soundManager } from '../utils/soundManager';
import { calculateBasicPieceMovements } from '../utils/pieceMovements';
import './ChessBoard.css';

// Constants (animationDuration prop will override this)
// const DEFAULT_ANIMATION_DURATION = 300; // Currently unused

const PIECE_ICONS: { [key: string]: string } = {
  'White_Pawn': whitePawn,
  'White_Rook': whiteRook,
  'White_Knight': whiteKnight,
  'White_Bishop': whiteBishop,
  'White_Queen': whiteQueen,
  'White_King': whiteKing,
  'Black_Pawn': blackPawn,
  'Black_Rook': blackRook,
  'Black_Knight': blackKnight,
  'Black_Bishop': blackBishop,
  'Black_Queen': blackQueen,
  'Black_King': blackKing,
};

function getPieceTypeName(pieceType: number): string {
  const types = ['Pawn', 'Rook', 'Knight', 'Bishop', 'Queen', 'King'];
  return types[pieceType] || 'Unknown';
}

function getPieceIcon(piece: Piece): string {
  const colorName = piece.color === Color.White ? 'White' : 'Black';
  const typeName = getPieceTypeName(piece.type);
  return PIECE_ICONS[`${colorName}_${typeName}`];
}

interface SquareProps {
  file: number;
  rank: number;
  piece: Piece | null;
  isSelected: boolean;
  isValidMove: boolean;
  isCapture: boolean;
  isAnimatingFrom: boolean;
  isAnimatingTo: boolean;
  isLastMoveFrom: boolean;
  isLastMoveTo: boolean;
  isHighlighted: boolean;
  isPreMove: boolean;
  flipped?: boolean; // Whether to flip the board for black perspective
  showCoordinates?: boolean; // Whether to show rank and file labels
  onSquareClick: (file: number, rank: number) => void;
  onDrop: (fromFile: number, fromRank: number, toFile: number, toRank: number) => void;
  onDragStart: (file: number, rank: number) => void;
  onDragEnd: (file: number, rank: number) => void;
  onRightMouseDown: (file: number, rank: number) => void;
  onRightMouseUp: (file: number, rank: number) => void;
  canMakePreMoves: boolean;
}

interface DragItem {
  type: 'piece';
  file: number;
  rank: number;
  piece: Piece;
}

interface CustomDragLayerProps {
  squareSize: number;
}

const CustomDragLayer: React.FC<CustomDragLayerProps> = ({ squareSize }) => {
  const { isDragging, item, currentOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    currentOffset: monitor.getClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || !currentOffset) {
    return null;
  }

  const { x, y } = currentOffset;
  const piece = item?.piece;

  if (!piece) {
    return null;
  }

  const pieceIcon = getPieceIcon(piece);

  return (
    <div className="custom-drag-layer">
      <div
        className="drag-preview-piece"
        style={{
          left: x - (squareSize * 0.5),
          top: y - (squareSize * 0.5),
          position: 'absolute',
          width: squareSize,
          height: squareSize,
        }}
      >
        <img
          src={pieceIcon}
          alt="chess piece"
          className="drag-preview-piece-img"
        />
      </div>
    </div>
  );
};

interface AnimatingPieceProps {
  piece: Piece;
  from: Position;
  to: Position;
  startTime: number;
  flipped?: boolean; // Whether to flip the board for black perspective
  onComplete: () => void;
}

const AnimatingPiece: React.FC<AnimatingPieceProps & { squareSize: number; animationDuration: number }> = ({ piece, from, to, startTime, onComplete, squareSize, flipped, animationDuration }) => {
  const effectiveFrom = flipped ? { file: 7 - from.file, rank: 7 - from.rank } : from;
  const effectiveTo = flipped ? { file: 7 - to.file, rank: 7 - to.rank } : to;

  const fromX = effectiveFrom.file * squareSize + squareSize / 2;
  const fromY = (7 - effectiveFrom.rank) * squareSize + squareSize / 2;
  const toX = effectiveTo.file * squareSize + squareSize / 2;
  const toY = (7 - effectiveTo.rank) * squareSize + squareSize / 2;

  const [position, setPosition] = useState({ x: fromX, y: fromY });
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      const currentX = fromX + (toX - fromX) * easeOutQuart;
      const currentY = fromY + (toY - fromY) * easeOutQuart;

      setPosition({ x: currentX, y: currentY });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [fromX, fromY, toX, toY, startTime, onComplete, animationDuration]);

  const pieceIcon = getPieceIcon(piece);
  const scale = squareSize * 0.95; // Scale down to fit within the square
  return (
    <div
      className="animating-piece"
      style={{
        left: position.x - scale / 2,
        top: position.y - scale / 2,
        width: scale,
        height: scale,
      }}
    >
      <img
        src={pieceIcon}
        alt="animating piece"
        className="animating-piece-img"
      />
    </div>
  );
};

interface PromotionDialogProps {
  isOpen: boolean;
  color: Color;
  promotionSquare: { file: number; rank: number };
  squareSize: number;
  flipped?: boolean;
  onSelect: (pieceType: PieceType) => void;
  onCancel: () => void;
}

const PromotionDialog: React.FC<PromotionDialogProps> = ({ isOpen, color, promotionSquare, squareSize, flipped, onSelect, onCancel }) => {
  if (!isOpen) return null;

  // Calculate position based on promotion square
  const effectiveSquare = flipped
    ? { file: 7 - promotionSquare.file, rank: 7 - promotionSquare.rank }
    : promotionSquare;

  const squareX = effectiveSquare.file * squareSize;
  const squareY = (7 - effectiveSquare.rank) * squareSize;

  // Determine visual position based on effective square (accounts for board flipping)
  const isVisuallyAtTop = squareY === 0; // Top of the visual board
  const isVisuallyAtBottom = squareY === 7 * squareSize; // Bottom of the visual board

  let pieces = [
    { type: PieceType.Queen, icon: getPieceIcon({ type: PieceType.Queen, color }) },
    { type: PieceType.Rook, icon: getPieceIcon({ type: PieceType.Rook, color }) },
    { type: PieceType.Bishop, icon: getPieceIcon({ type: PieceType.Bishop, color }) },
    { type: PieceType.Knight, icon: getPieceIcon({ type: PieceType.Knight, color }) },
  ];

  // Reverse piece order for bottom promotions so Queen is closest to promotion square
  if (isVisuallyAtBottom) {
    pieces = pieces.reverse();
  }

  const dialogX = squareX;
  let dialogY;

  if (isVisuallyAtTop) {
    // Visually at top - show dialog going down from promotion square
    dialogY = squareY;
  } else if (isVisuallyAtBottom) {
    // Visually at bottom - show dialog going up (position so it ends at promotion square)
    dialogY = squareY - (3 * squareSize);
  } else {
    // Fallback (shouldn't happen in normal chess)
    dialogY = squareY;
  }

  return (
    <>
      {/* Invisible overlay for click-outside-to-cancel */}
      <div
        className="promotion-board-overlay"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 999,
        }}
        onClick={onCancel}
      />
      <div
        className="promotion-dialog"
        style={{
          position: 'absolute',
          left: dialogX,
          top: dialogY,
          width: squareSize,
          height: squareSize * 4,
          zIndex: 1000,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {pieces.map(({ type, icon }) => (
          <button
            key={type}
            className="promotion-piece"
            style={{
              width: squareSize,
              height: squareSize,
            }}
            onClick={() => onSelect(type)}
          >
            <img src={icon} alt="promotion piece" className="promotion-piece-img" />
          </button>
        ))}
      </div>
    </>
  );
};

interface GameEndBadgeProps {
  kingPosition: Position;
  squareSize: number;
  flipped?: boolean;
  badgeType: 'winner' | 'loser' | 'draw';
}

const GameEndBadge: React.FC<GameEndBadgeProps> = ({ kingPosition, squareSize, flipped, badgeType }) => {
  // Calculate the king's visual position
  const effectivePosition = flipped
    ? { file: 7 - kingPosition.file, rank: 7 - kingPosition.rank }
    : kingPosition;

  const kingX = effectivePosition.file * squareSize;
  const kingY = (7 - effectivePosition.rank) * squareSize;

  // Badge size (about 40% of square size for better visibility)
  const badgeSize = squareSize * 0.5  ;

  // Default position: top-right corner of king's square
  let badgeX = kingX + squareSize - badgeSize / 2;
  let badgeY = kingY - badgeSize / 2;

  // Boundary detection - only shift inward just enough to stay within board
  const boardSize = squareSize * 8;

  // Check right boundary - shift left just enough
  if (badgeX + badgeSize > boardSize) {
    badgeX = boardSize - badgeSize;
  }

  // Check top boundary - shift down just enough
  if (badgeY < 0) {
    badgeY = 0;
  }

  const getBadgeColor = () => {
    switch (badgeType) {
      case 'winner': return '#4CAF50';
      case 'loser': return '#f44336';
      case 'draw': return '#757575';
    }
  };

  const renderBadgeContent = () => {
    if (badgeType === 'draw') {
      return (
        <span style={{ color: 'white', fontSize: badgeSize * 0.6, fontWeight: 'bold' }}>
          ½
        </span>
      );
    } else {
      // Use white king SVG for both winner and loser
      return (
        <img
          src={whiteKing}
          alt="king"
          style={{
            width: badgeSize * 0.7,
            height: badgeSize * 0.7,
            filter: 'brightness(0) invert(1)', // Make it white
            transform: badgeType === 'loser' ? 'rotate(90deg)' : 'none',
          }}
        />
      );
    }
  };

  return (
    <div
      className="game-end-badge"
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

interface ArrowComponentProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isKnightMove: boolean;
  squareSize: number;
}

const ArrowComponent: React.FC<ArrowComponentProps> = ({ fromX, fromY, toX, toY, isKnightMove, squareSize }) => {
  const arrowHeadSize = Math.max(15, squareSize * 0.4);
  const strokeWidth = Math.max(8, squareSize * 0.2);
  const color = "rgba(0, 200, 0, 0.5)";
  const markerId = `arrowhead-${Math.random().toString(36).substr(2, 9)}`;
  const shortenAmount = arrowHeadSize * 0.75;
  const edgeOffset = squareSize * 0.35; // 10% from edge towards center

  // Common marker definition
  const marker = (
    <marker
      id={markerId}
      markerWidth={2}
      markerHeight={3}
      refX={0}
      refY={1.2}
      orient="auto"
      markerUnits="strokeWidth"
    >
      <polygon
        points={`0,0 0,2.4, 1.5,1.2`}
        fill={color}
      />
    </marker>
  );

  let pathElement;

  if (isKnightMove) {
    // Create a right-angled path for knight moves (long leg first, then short leg)
    const deltaFile = Math.abs(toX - fromX);
    const deltaRank = Math.abs(toY - fromY);
    const isHorizontalLonger = deltaFile > deltaRank;

    let cornerX, cornerY;
    if (isHorizontalLonger) {
      cornerX = toX;
      cornerY = fromY;
    } else {
      cornerX = fromX;
      cornerY = toY;
    }

    // Adjust start point
    let adjustedFromX = fromX;
    let adjustedFromY = fromY;
    if (isHorizontalLonger) {
      adjustedFromX = fromX > cornerX ? fromX - edgeOffset : fromX + edgeOffset;
    } else {
      adjustedFromY = fromY > cornerY ? fromY - edgeOffset : fromY + edgeOffset;
    }

    // Adjust end point
    let adjustedToX = toX;
    let adjustedToY = toY;
    if (isHorizontalLonger) {
      adjustedToY = toY > cornerY ? toY - shortenAmount : toY + shortenAmount;
    } else {
      adjustedToX = toX > cornerX ? toX - shortenAmount : toX + shortenAmount;
    }

    pathElement = (
      <path
        d={`M ${adjustedFromX} ${adjustedFromY} L ${cornerX} ${cornerY} L ${adjustedToX} ${adjustedToY}`}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        markerEnd={`url(#${markerId})`}
      />
    );
  } else {
    // Straight arrow
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.sqrt(dx * dx + dy * dy);

    const adjustedFromX = fromX + (dx / length) * edgeOffset;
    const adjustedFromY = fromY + (dy / length) * edgeOffset;
    const adjustedToX = toX - (dx / length) * shortenAmount;
    const adjustedToY = toY - (dy / length) * shortenAmount;

    pathElement = (
      <line
        x1={adjustedFromX}
        y1={adjustedFromY}
        x2={adjustedToX}
        y2={adjustedToY}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
        markerEnd={`url(#${markerId})`}
      />
    );
  }

  return (
    <g>
      <defs>{marker}</defs>
      {pathElement}
    </g>
  );
};

const Square: React.FC<SquareProps> = ({ file, rank, piece, isSelected, isValidMove, isCapture, isAnimatingFrom, isAnimatingTo, isLastMoveFrom, isLastMoveTo, isHighlighted, isPreMove, onSquareClick, onDrop, onDragStart, onDragEnd, onRightMouseDown, onRightMouseUp, flipped, showCoordinates, canMakePreMoves }) => {
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: 'piece',
    item: () => {
      if (piece) {
        onDragStart(file, rank);
        return { type: 'piece', file, rank, piece };
      }
      return null;
    },
    canDrag: () => !!piece,
    end: () => {
      onDragEnd(file, rank);
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [piece, file, rank, onDragStart, onDragEnd]);

  // Setup drag preview to prevent native drag behavior
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'piece',
    drop: (item: DragItem) => {
      onDrop(item.file, item.rank, file, rank);
    },
    canDrop: () => isValidMove || canMakePreMoves,
    collect: (monitor) => ({
      isOver: monitor.isOver() && monitor.canDrop(),
    }),
  }), [file, rank, onDrop, isValidMove, canMakePreMoves]);

  const isLight = (file + rank) % 2 === 1;
  let squareClass = `square ${isLight ? 'light' : 'dark'}`;

  if (isSelected) {
    squareClass += ' selected';
  }

  if (isOver) {
    squareClass += ' drop-target';
  }

  if (isLastMoveFrom || isLastMoveTo) {
    squareClass += ' last-move';
  }

  if (isHighlighted) {
    squareClass += ' highlighted';
  }

  if (isPreMove) {
    squareClass += ' pre-move';
  }

  const pieceIcon = piece ? getPieceIcon(piece) : null;

  // Show file label on rank 0 (bottom row)
  const showFileLabel = showCoordinates && rank === (flipped ? 7 : 0);
  const fileLabel = showFileLabel ? String.fromCharCode(97 + file) : null; // 'a' = 97

  // Show rank label on file 0 (leftmost column)
  const showRankLabel = showCoordinates && file === (flipped ? 7 : 0);
  const rankLabel = showRankLabel ? (rank + 1).toString() : null;

  const attachRef = (node: HTMLDivElement | null) => {
    drag(drop(node));
  };

  return (
    <div
      ref={attachRef}
      className={squareClass}
      onClick={() => onSquareClick(file, rank)}
      onMouseDown={(e) => {
        if (e.button === 2) { // Right mouse button
          e.preventDefault();
          onRightMouseDown(file, rank);
        }
      }}
      onMouseUp={(e) => {
        if (e.button === 2) { // Right mouse button
          e.preventDefault();
          onRightMouseUp(file, rank);
        }
      }}
      onContextMenu={(e) => e.preventDefault()} // Prevent context menu
    >
      {pieceIcon && (
        <img
          src={pieceIcon}
          alt="chess piece"
          className="piece"
          style={{ display: isDragging || isAnimatingFrom || isAnimatingTo ? 'none' : 'block' }}
        />
      )}
      {(isValidMove) && (
        <div className={`move-indicator ${isCapture ? 'capture-indicator' : 'normal-indicator'}`} />
      )}
      {fileLabel && (
        <div className={`file-label-inset ${isLight ? 'dark-text' : 'light-text'}`}>
          {fileLabel}
        </div>
      )}
      {rankLabel && (
        <div className={`rank-label-inset ${isLight ? 'dark-text' : 'light-text'}`}>
          {rankLabel}
        </div>
      )}
    </div>
  );
};

interface ChessBoardProps {
  size?: number; // Board size in pixels (default: fills container)
  className?: string;
  flipped?: boolean; // Whether to flip the board for black perspective
  whiteIsHuman?: boolean; // Whether white player is human (default: true)
  blackIsHuman?: boolean; // Whether black player is human (default: true)
  enablePreMoves?: boolean; // Whether to enable pre-move functionality (default: true)
  autoPromotionPiece?: PieceType; // Auto-promotion piece (Queen, Rook, Bishop, Knight)
  showCoordinates?: boolean; // Whether to show rank and file labels (default: true)
  animationDuration?: number; // Animation duration in milliseconds (default: 300)
  enableAnimations?: boolean; // Whether to enable move animations (default: true)
  enableSounds?: boolean; // Whether to enable sound effects (default: true)
  enableArrows?: boolean; // Whether to enable right-click arrows (default: true)
  enableHighlights?: boolean; // Whether to enable right-click square highlights (default: true)
  onPositionChange?: (gameState: GameState, lastMove?: Move) => void; // Called when position changes
  onError?: ChessBoardCallbacks['onError']; // Called on errors
}

export const ChessBoard = forwardRef<ChessBoardRef, ChessBoardProps>(({
  size,
  className,
  flipped,
  whiteIsHuman = true,
  blackIsHuman = true,
  enablePreMoves = true,
  autoPromotionPiece,
  showCoordinates = true,
  animationDuration = 300,
  enableAnimations = true,
  enableSounds = true,
  enableArrows = true,
  enableHighlights = true,
  onPositionChange,
  onError
}, ref) => {
  const chessEngine = useJSChessEngine();
  const [boardSize, setBoardSize] = useState(size || 512);
  const boardRef = useRef<HTMLDivElement>(null);

  const squareSize = boardSize / 8;

  // Initialize clean chess game hook
  const game = useChessGame({
    chessEngine,
    whiteIsHuman,
    blackIsHuman,
    onPositionChange,
    onError,
  });


  // Handle responsive sizing when no size prop is provided
  useEffect(() => {
    if (size) return; // Don't resize if explicit size is provided

    const handleResize = () => {
      if (boardRef.current && boardRef.current.parentElement) {
        const parentWidth = boardRef.current.parentElement.clientWidth;
        const parentHeight = boardRef.current.parentElement.clientHeight;
        const availableSize = Math.min(parentWidth, parentHeight) - 20; // Leave minimal padding
        setBoardSize(Math.max(200, availableSize)); // Lower minimum for better flexibility
      }
    };

    // Use ResizeObserver for better responsiveness
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
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [arrows, setArrows] = useState<Array<{ from: Position; to: Position }>>([]);
  const [arrowStart, setArrowStart] = useState<Position | null>(null);
  const [highlightedSquares, setHighlightedSquares] = useState<Position[]>([]);

  // Find king positions on the current board
  const findKingPositions = useCallback(() => {
    const boardState = chessEngine.getBoardState();
    const kings: { white?: Position; black?: Position } = {};

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = boardState[7 - rank]?.[file];
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
  }, [chessEngine]);

  // Pre-move squares (both origin and destination to show in red)
  const preMoveSquares = game.preMoves.flatMap(move => [
    { file: move.fromFile, rank: move.fromRank }, // origin square
    { file: move.toFile, rank: move.toRank }       // destination square
  ]);

  // Calculate visual board state with pre-moves applied
  const getVisualBoardState = useCallback(() => {
    const baseBoardState = chessEngine.getBoardState();

    if (game.preMoves.length === 0) {
      return baseBoardState;
    }

    // Create a copy of the board state
    const visualBoard = baseBoardState.map(row => [...row]);

    // Apply pre-moves visually
    for (const preMove of game.preMoves) {
      const piece = visualBoard[7 - preMove.fromRank]?.[preMove.fromFile];
      if (piece) {
        // Remove piece from source
        visualBoard[7 - preMove.fromRank][preMove.fromFile] = null;

        // Place piece at destination - use promoted piece if specified
        if (preMove.promotionPiece !== undefined) {
          // Show promoted piece instead of pawn
          visualBoard[7 - preMove.toRank][preMove.toFile] = {
            type: preMove.promotionPiece,
            color: piece.color
          };
        } else {
          // Regular piece
          visualBoard[7 - preMove.toRank][preMove.toFile] = piece;
        }
      }
    }

    return visualBoard;
  }, [chessEngine, game.preMoves]);

  // Helper function to detect if a move is a pawn promotion
  const isPawnPromotion = useCallback((piece: Piece, fromRank: number, toRank: number): boolean => {
    if (piece.type !== PieceType.Pawn) return false;

    const promotionRank = piece.color === Color.White ? 7 : 0;
    return toRank === promotionRank;
  }, []);

  // Calculate valid moves for a piece at a given position
  const getValidMovesFromVisualBoard = useCallback((file: number, rank: number) => {
    const visualBoard = getVisualBoardState();
    const piece = visualBoard[7 - rank]?.[file];

    if (!piece) return [];

    // If we can make pre-moves (external player's turn) and pre-moves are enabled, use basic movement patterns
    if (game.canMakePreMoves && enablePreMoves) {
      return calculateBasicPieceMovements(piece, file, rank, visualBoard);
    }

    // Otherwise use normal engine calculation which includes all game rules
    return chessEngine.getValidMoves({ file, rank });
  }, [chessEngine, game.canMakePreMoves, getVisualBoardState, enablePreMoves]);

  // Shared function to handle pre-move logic
  const handlePreMoveAttempt = useCallback((fromFile: number, fromRank: number, toFile: number, toRank: number): boolean => {
    // Allow pre-moves when it's external player's turn OR during external move animation
    if (!(game.canMakePreMoves || (game.pendingExternalMove && animatingPieces)) || !enablePreMoves || !chessEngine) return false;

    // Determine human player color (opposite of current player)
    const humanPlayerColor = chessEngine.getCurrentPlayer() === Color.White ? Color.Black : Color.White;
    const visualBoardState = getVisualBoardState();
    const piece = visualBoardState[7 - fromRank]?.[fromFile];

    // Only allow pre-moves with human player's pieces
    if (!piece || piece.color !== humanPlayerColor) return false;

    // Check if this is a valid pre-move destination
    const validMoves = getValidMovesFromVisualBoard(fromFile, fromRank);
    const isValidDestination = validMoves.some(move => move.file === toFile && move.rank === toRank);

    if (!isValidDestination) return false;

    // Check if this is a pawn promotion
    if (isPawnPromotion(piece, fromRank, toRank)) {
      if (autoPromotionPiece) {
        // Auto-promote without showing dialog
        const preMove = {
          fromFile,
          fromRank,
          toFile,
          toRank,
          promotionPiece: autoPromotionPiece,
        };
        game.addPreMove(preMove);

        // Clear UI indicators since the pre-move was successfully added
        setSelectedSquare(null);
        setValidMoves([]);
      } else {
        // Show promotion dialog for pre-move
        setPromotionDialog({
          isOpen: true,
          fromFile,
          fromRank,
          toFile,
          toRank,
          color: piece.color,
          isPreMove: true,
        });
      }
    } else {
      // Regular pre-move
      const preMove = {
        fromFile,
        fromRank,
        toFile,
        toRank
      };
      game.addPreMove(preMove);
    }

    return true; // Indicates pre-move was handled
  }, [enablePreMoves, chessEngine, getVisualBoardState, getValidMovesFromVisualBoard, isPawnPromotion, game, autoPromotionPiece]);

  const [animatingPieces, setAnimatingPieces] = useState<{
    pieces: Array<{
      piece: Piece;
      from: Position;
      to: Position;
    }>;
    startTime: number;
    moveData: {
      fromFile: number;
      fromRank: number;
      toFile: number;
      toRank: number;
      isDragCastling?: boolean;
      isExternalMove?: boolean;
    };
  } | null>(null);
  const [promotionDialog, setPromotionDialog] = useState<{
    isOpen: boolean;
    fromFile: number;
    fromRank: number;
    toFile: number;
    toRank: number;
    color: Color;
    isPreMove?: boolean; // Flag to distinguish pre-move promotions
  }>({
    isOpen: false,
    fromFile: 0,
    fromRank: 0,
    toFile: 0,
    toRank: 0,
    color: Color.White,
    isPreMove: false,
  });

  // Add ref methods
  useImperativeHandle(ref, () => ({
    resetGame: () => {
      game.resetGame();
      setSelectedSquare(null);
      setValidMoves([]);
      setArrows([]);
      setHighlightedSquares([]);
      setAnimatingPieces(null);
    },
    setPosition: (fen: string) => {
      const success = game.setPosition(fen);
      if (success) {
        setSelectedSquare(null);
        setValidMoves([]);
        setArrows([]);
        setHighlightedSquares([]);
        setAnimatingPieces(null);
      }
      return success;
    },
    getGameState: () => chessEngine.getGameState(),
    executeExternalMove: (move: Move) => game.executeExternalMove(move),
  }), [game, chessEngine]);


  const attemptMove = useCallback((fromFile: number, fromRank: number, toFile: number, toRank: number, animate: boolean = false) => {
    if (!chessEngine) return false;

    const from = { file: fromFile, rank: fromRank };
    const to = { file: toFile, rank: toRank };
    const move = { fromFile, fromRank, toFile, toRank };

    // Check if the move is valid and what type it would be
    const validationResult = chessEngine.isValidMove(from, to);

    if (!validationResult.valid) {
      return false;
    }

    // Check if promotion is required
    if (validationResult.promotionRequired) {
      if (autoPromotionPiece) {
        // Auto-promote without showing dialog
        const result = chessEngine.makeMove(from, to, autoPromotionPiece);
        if (result.success) {
          setSelectedSquare(null);
          setValidMoves([]);

          // Play promotion sound
          if (enableSounds) {
            soundManager.playPromotionSound();

            // Check if the move puts the opponent in check
            if (result.checkStatus === 'check') {
              setTimeout(() => soundManager.playCheckSound(), 400);
            }
          }

          return true;
        }
        return false;
      } else {
        setPromotionDialog({
          isOpen: true,
          fromFile,
          fromRank,
          toFile,
          toRank,
          color: chessEngine.getPiece(from)?.color || Color.White,
        });
        return true;
      }
    }

    // Handle animation for human moves
    if (animate) {

      // Start animation
      const boardState = chessEngine.getBoardState();
      const boardPiece = boardState[7 - fromRank]?.[fromFile];
      if (boardPiece) {
        const piecesToAnimate = [{
          piece: boardPiece,
          from: { file: fromFile, rank: fromRank },
          to: { file: toFile, rank: toRank },
        }];

        // Add any additional moves (like castling rook) from validation result
        if (validationResult.additionalMoves) {
          for (const additionalMove of validationResult.additionalMoves) {
            piecesToAnimate.push({
              piece: additionalMove.piece,
              from: additionalMove.from,
              to: additionalMove.to,
            });
          }
        }

        setAnimatingPieces({
          pieces: piecesToAnimate,
          startTime: Date.now(),
          moveData: { fromFile, fromRank, toFile, toRank },
        });

        // Clear selection immediately but don't make the move yet
        setSelectedSquare(null);
        setValidMoves([]);

        return true;
      }
    } else {
      // Immediate move - execute through game hook
      const result = game.makeMove(move);
      if (result) {
        setSelectedSquare(null);
        setValidMoves([]);

        // Play sound effects - for immediate moves we need to check what type it was
        if (enableSounds) soundManager.playMoveSound();
        
        const gameState = chessEngine.getGameState();
        if (gameState.isCheck) {
          setTimeout(() => soundManager.playCheckSound(), 200);
        }
      }
      return result;
    }

    return false;
  }, [chessEngine, game, autoPromotionPiece, enableSounds]);

  // Handle pending external moves with animation
  useEffect(() => {
    if (game.pendingExternalMove && !animatingPieces) {
      const move = game.pendingExternalMove;

      // Set up animation for external move
      const boardState = chessEngine.getBoardState();
      const boardPiece = boardState[7 - move.fromRank]?.[move.fromFile];

      if (boardPiece) {
        const validationResult = chessEngine.isValidMove(
          { file: move.fromFile, rank: move.fromRank },
          { file: move.toFile, rank: move.toRank },
          move.promotionPiece
        );

        // For promotion moves, animate to the promoted piece
        const animationPiece = move.promotionPiece
          ? { type: move.promotionPiece, color: boardPiece.color }
          : boardPiece;

        const piecesToAnimate = [{
          piece: animationPiece,
          from: { file: move.fromFile, rank: move.fromRank },
          to: { file: move.toFile, rank: move.toRank },
        }];

        // Add castling rook if needed
        if (validationResult.additionalMoves) {
          for (const additionalMove of validationResult.additionalMoves) {
            piecesToAnimate.push({
              piece: additionalMove.piece,
              from: additionalMove.from,
              to: additionalMove.to,
            });
          }
        }

        setAnimatingPieces({
          pieces: piecesToAnimate,
          startTime: Date.now(),
          moveData: {
            fromFile: move.fromFile,
            fromRank: move.fromRank,
            toFile: move.toFile,
            toRank: move.toRank,
            isExternalMove: true
          },
        });
      }
    }
  }, [game.pendingExternalMove, animatingPieces, chessEngine]);

  const handleAnimationComplete = useCallback(() => {
    if (animatingPieces) {
      const { isDragCastling, fromFile, fromRank, toFile, toRank, isExternalMove } = animatingPieces.moveData;

      if (isDragCastling) {
        // For drag castling, move is already executed, just clean up
        setAnimatingPieces(null);
        return;
      }

      // Execute the move now that animation is complete
      const move = isExternalMove && game.pendingExternalMove
        ? game.pendingExternalMove
        : { fromFile, fromRank, toFile, toRank };
      const result = game.makeMove(move);

      if (result) {
        // Play sound effects - just play move sound for animations
        if (enableSounds) soundManager.playMoveSound();

        const gameState = chessEngine.getGameState();
        if (gameState.isCheck) {
          setTimeout(() => soundManager.playCheckSound(), 200);
        }

        // If this was an external move, clear the pending external move
        if (isExternalMove) {
          game.clearPendingExternalMove();
        }
      }

      setAnimatingPieces(null);
    }
  }, [animatingPieces, game, chessEngine, enableSounds]);

  const handlePromotion = useCallback((pieceType: PieceType) => {
    if (!chessEngine) return;

    if (promotionDialog.isPreMove) {
      // Handle pre-move promotion
      const preMove = {
        fromFile: promotionDialog.fromFile,
        fromRank: promotionDialog.fromRank,
        toFile: promotionDialog.toFile,
        toRank: promotionDialog.toRank,
        promotionPiece: pieceType
      };
      game.addPreMove(preMove);

      setSelectedSquare(null);
      setValidMoves([]);
    } else {
      // Handle regular promotion
      const from = { file: promotionDialog.fromFile, rank: promotionDialog.fromRank };
      const to = { file: promotionDialog.toFile, rank: promotionDialog.toRank };
      const result = chessEngine.makeMove(from, to, pieceType);

      if (result.success) {
        setSelectedSquare(null);
        setValidMoves([]);

        // Play promotion sound
        if (enableSounds) soundManager.playPromotionSound();

        // Check if the move puts the opponent in check
        if (result.checkStatus === 'check') {
          setTimeout(() => soundManager.playCheckSound(), 400);
        }
      }
    }

    setPromotionDialog(prev => ({ ...prev, isOpen: false }));
  }, [chessEngine, promotionDialog, game, enableSounds]);

  const handlePromotionCancel = useCallback(() => {
    setPromotionDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleSquareClick = useCallback((file: number, rank: number) => {
    if (!chessEngine) return;

    // Clear arrows and highlights on any left click
    setArrows([]);
    setHighlightedSquares([]);

    // Use visual board state to account for pre-moves
    const visualBoardState = getVisualBoardState();
    const piece = visualBoardState[7 - rank]?.[file];

    // Handle normal moves when it's human's turn
    if (game.canHumanMove) {
      if (selectedSquare) {
        // Try to make a move
        if (selectedSquare.file === file && selectedSquare.rank === rank) {
          // Deselect
          setSelectedSquare(null);
          setValidMoves([]);
        } else if (piece && piece.color === chessEngine.getCurrentPlayer()) {
          // Clicking on a different piece of the same player - switch selection
          setSelectedSquare({ file, rank });
          const moves = getValidMovesFromVisualBoard(file, rank);
          setValidMoves(moves);
        } else if (!attemptMove(selectedSquare.file, selectedSquare.rank, file, rank, enableAnimations)) {
          // Attempt to move the selected piece to the clicked square
          setSelectedSquare(null);
          setValidMoves([]);
        }
      } else if (piece && piece.color === chessEngine.getCurrentPlayer()) {
        // Select a piece and show valid moves
        setSelectedSquare({ file, rank });
        const moves = getValidMovesFromVisualBoard(file, rank);
        setValidMoves(moves);
      }
    }
    // Handle pre-moves when it's external player's turn OR during external move animation (and pre-moves are enabled)
    else if ((game.canMakePreMoves || (game.pendingExternalMove && animatingPieces)) && enablePreMoves) {
      // Determine human player color (opposite of current player)
      const humanPlayerColor = chessEngine.getCurrentPlayer() === Color.White ? Color.Black : Color.White;

      if (selectedSquare) {
        // Try to make a pre-move
        if (selectedSquare.file === file && selectedSquare.rank === rank) {
          // Deselect
          setSelectedSquare(null);
          setValidMoves([]);
        } else if (piece && piece.color === humanPlayerColor) {
          // Clicking on own piece - switch selection (for future turn)
          setSelectedSquare({ file, rank });
          // Show valid moves from the visual board position
          const moves = getValidMovesFromVisualBoard(file, rank);
          setValidMoves(moves);
        } else {
          // Try to make a pre-move using shared logic
          handlePreMoveAttempt(selectedSquare.file, selectedSquare.rank, file, rank);
          setSelectedSquare(null);
          setValidMoves([]);
        }
      } else if (piece && piece.color === humanPlayerColor) {
        // Select a piece for future move
        setSelectedSquare({ file, rank });
        // Show valid moves from the visual board position
        const moves = getValidMovesFromVisualBoard(file, rank);
        setValidMoves(moves);
      }
    }
  }, [chessEngine, selectedSquare, attemptMove, game, getValidMovesFromVisualBoard, getVisualBoardState, enablePreMoves, handlePreMoveAttempt, animatingPieces, enableAnimations]);

  const handleDrop = useCallback((fromFile: number, fromRank: number, toFile: number, toRank: number) => {
    if (!chessEngine) return;

    // Handle normal drops when it's human's turn
    if (game.canHumanMove) {

    const from = { file: fromFile, rank: fromRank };
    const to = { file: toFile, rank: toRank };

    // Check if this is a valid move and what type
    const validationResult = chessEngine.isValidMove(from, to);

    if (!validationResult.valid) return;

    // For castling moves during drag, handle specially
    if (validationResult.type === 'castling') {
      // Execute the full castling move immediately (king is already visually positioned)
      const result = chessEngine.makeMove(from, to);

      if (result.success && result.additionalMoves && enableAnimations) {
        // Animate the rook visually (move is already executed)
        const rookMove = result.additionalMoves[0];
        setAnimatingPieces({
          pieces: [{
            piece: rookMove.piece,
            from: rookMove.from,
            to: rookMove.to,
          }],
          startTime: Date.now(),
          moveData: { fromFile, fromRank, toFile, toRank, isDragCastling: true },
        });

        // Clear selection
        setSelectedSquare(null);
        setValidMoves([]);

        // Play sound effects immediately
        if (enableSounds) soundManager.playMoveSound();

        // Check if the move puts the opponent in check
        if (result.checkStatus === 'check') {
          setTimeout(() => soundManager.playCheckSound(), 200);
        }
      }
      return;
    }

      // Regular move (non-castling) - don't animate drag moves since piece is already positioned
      attemptMove(fromFile, fromRank, toFile, toRank, false);
    }
    // Handle pre-move drops when it's external player's turn OR during external move animation (and pre-moves are enabled)
    else if ((game.canMakePreMoves || (game.pendingExternalMove && animatingPieces)) && enablePreMoves) {
      // Use shared pre-move logic
      handlePreMoveAttempt(fromFile, fromRank, toFile, toRank);
      setSelectedSquare(null);
      setValidMoves([]);
    }
  }, [chessEngine, attemptMove, game, handlePreMoveAttempt, enablePreMoves, enableSounds, animatingPieces, enableAnimations]);

  const handleDragStart = useCallback((file: number, rank: number) => {
    if (!chessEngine) return;

    // Allow dragging when it's human's turn OR when making pre-moves OR during external move animation (and pre-moves are enabled)
    if (game.canHumanMove || ((game.canMakePreMoves || (game.pendingExternalMove && animatingPieces)) && enablePreMoves)) {
      // Determine which color can be dragged
      let allowedColor: Color;
      if (game.canHumanMove) {
        allowedColor = chessEngine.getCurrentPlayer();
      } else {
        // Pre-moves: determine human player color (opposite of current player)
        allowedColor = chessEngine.getCurrentPlayer() === Color.White ? Color.Black : Color.White;
      }

      // Use visual board state to account for pre-moves
      const visualBoardState = getVisualBoardState();
      const piece = visualBoardState[7 - rank]?.[file];

      // Only allow dragging allowed color pieces
      if (!piece || piece.color !== allowedColor) {
        return;
      }

      // Clear arrows, highlights, and any existing selection indicators when starting to drag
      setArrows([]);
      setHighlightedSquares([]);
      setSelectedSquare({ file, rank });

      // Show valid moves from the visual board position (works for both normal and pre-moves)
      const moves = getValidMovesFromVisualBoard(file, rank);
      setValidMoves(moves);
    }
  }, [chessEngine, game, getValidMovesFromVisualBoard, getVisualBoardState, enablePreMoves, animatingPieces]);

  const handleDragEnd = useCallback((file: number, rank: number) => {

  }, []);

  const isSquareSelected = useCallback((file: number, rank: number) => {
    return selectedSquare ? selectedSquare.file === file && selectedSquare.rank === rank : false;
  }, [selectedSquare]);

  const isValidMoveSquare = useCallback((file: number, rank: number) => {
    return validMoves.some(move => move.file === file && move.rank === rank);
  }, [validMoves]);

  const isCapture = useCallback((file: number, rank: number) => {
    if (!chessEngine || !isValidMoveSquare(file, rank)) return false;
    const boardState = chessEngine.getBoardState();
    const targetPiece = boardState[7 - rank]?.[file];
    return !!targetPiece;
  }, [chessEngine, isValidMoveSquare]);

  const isPreMoveSquare = useCallback((file: number, rank: number) => {
    return preMoveSquares.some(square => square.file === file && square.rank === rank);
  }, [preMoveSquares]);

  const isAnimatingFrom = useCallback((file: number, rank: number) => {
    return animatingPieces?.pieces.some(p => p.from.file === file && p.from.rank === rank) || false;
  }, [animatingPieces]);

  const isAnimatingTo = useCallback((file: number, rank: number) => {
    // For drag castling, hide the piece at destination during animation
    return (animatingPieces?.moveData.isDragCastling &&
           animatingPieces?.pieces.some(p => p.to.file === file && p.to.rank === rank)) || false;
  }, [animatingPieces]);

  const isLastMoveFrom = useCallback((file: number, rank: number) => {
    const lastMove = chessEngine.getLastMove();
    return lastMove ? lastMove.fromFile === file && lastMove.fromRank === rank : false;
  }, [chessEngine]);

  const isLastMoveTo = useCallback((file: number, rank: number) => {
    const lastMove = chessEngine.getLastMove();
    return lastMove ? lastMove.toFile === file && lastMove.toRank === rank : false;
  }, [chessEngine]);

  const isHighlighted = useCallback((file: number, rank: number) => {
    return highlightedSquares.some(square => square.file === file && square.rank === rank);
  }, [highlightedSquares]);

  const handleRightMouseDown = useCallback((file: number, rank: number) => {
    // Clear pre-moves on any right-click - if pre-moves exist, only clear them and don't start arrow creation
    if (game.preMoves.length > 0) {
      game.clearPreMoves();
      return; // Don't start arrow creation when clearing pre-moves
    }

    // Start arrow creation if arrows are enabled, or set flag for highlights if arrows disabled but highlights enabled
    if (enableArrows || enableHighlights) {
      setArrowStart({ file, rank });
    }
  }, [game, enableArrows, enableHighlights]);

  const handleRightMouseUp = useCallback((file: number, rank: number) => {
    if (arrowStart) {
      if (arrowStart.file === file && arrowStart.rank === rank) {
        // Same square - toggle square highlight instead of creating arrow (if highlights enabled)
        if (enableHighlights) {
          setHighlightedSquares(prev => {
            const existingIndex = prev.findIndex(square =>
              square.file === file && square.rank === rank
            );

            if (existingIndex >= 0) {
              // Remove existing highlight
              return prev.filter((_, index) => index !== existingIndex);
            } else {
              // Add new highlight
              return [...prev, { file, rank }];
            }
          });
        }
      } else if (enableArrows) {
        // Different square - create or toggle arrow (if arrows enabled)
        const newArrow = { from: arrowStart, to: { file, rank } };
        setArrows(prev => {
          // Check if arrow already exists
          const existingIndex = prev.findIndex(arrow =>
            arrow.from.file === newArrow.from.file &&
            arrow.from.rank === newArrow.from.rank &&
            arrow.to.file === newArrow.to.file &&
            arrow.to.rank === newArrow.to.rank
          );

          if (existingIndex >= 0) {
            // Remove existing arrow
            return prev.filter((_, index) => index !== existingIndex);
          } else {
            // Add new arrow
            return [...prev, newArrow];
          }
        });
      }
    }
    setArrowStart(null);
  }, [arrowStart, enableArrows, enableHighlights]);


  if (!chessEngine) {
    return <div>Loading chess engine...</div>;
  }

  let visualBoardState = getVisualBoardState();
  if (flipped) {
    visualBoardState = [...visualBoardState].reverse(); // Flip the board state for black perspective
    visualBoardState = visualBoardState.map(row => [...row].reverse()); // Reverse each row as well
  }

  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <CustomDragLayer squareSize={squareSize} />
      <div className={`chess-board-container ${className || ''}`}>
        <div
          ref={boardRef}
          className="chess-board"
          style={{
            width: boardSize,
            height: boardSize,
            gridTemplateColumns: `repeat(8, ${squareSize}px)`,
            gridTemplateRows: `repeat(8, ${squareSize}px)`,
            fontSize: Math.max(10, squareSize * 0.12),
          }}
        >
          {visualBoardState.map((row, rankIndex) => (

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
                  isValidMove={isValidMoveSquare(actualFile, actualRank)}
                  isCapture={isCapture(actualFile, actualRank)}
                  isAnimatingFrom={isAnimatingFrom(actualFile, actualRank)}
                  isAnimatingTo={isAnimatingTo(actualFile, actualRank)}
                  isLastMoveFrom={isLastMoveFrom(actualFile, actualRank)}
                  isLastMoveTo={isLastMoveTo(actualFile, actualRank)}
                  isHighlighted={isHighlighted(actualFile, actualRank)}
                  isPreMove={isPreMoveSquare(actualFile, actualRank)}
                  canMakePreMoves={(game.canMakePreMoves || (!!game.pendingExternalMove && !!animatingPieces)) && enablePreMoves}
                  onSquareClick={handleSquareClick}
                  onDrop={handleDrop}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onRightMouseDown={handleRightMouseDown}
                  onRightMouseUp={handleRightMouseUp}
                />
              );
            })
          ))}

          {/* Arrow overlay */}
          <svg
            className="arrow-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: boardSize,
              height: boardSize,
              pointerEvents: 'none',
              zIndex: 100,
            }}
          >
            {arrows.map((arrow, index) => {
              const fromX = (flipped ? 7 - arrow.from.file : arrow.from.file) * squareSize + squareSize / 2;
              const fromY = (flipped ? arrow.from.rank : 7 - arrow.from.rank) * squareSize + squareSize / 2;
              const toX = (flipped ? 7 - arrow.to.file : arrow.to.file) * squareSize + squareSize / 2;
              const toY = (flipped ? arrow.to.rank : 7 - arrow.to.rank) * squareSize + squareSize / 2;

              // Check if this is a knight move
              const deltaFile = Math.abs(arrow.to.file - arrow.from.file);
              const deltaRank = Math.abs(arrow.to.rank - arrow.from.rank);
              const isKnightMove = (deltaFile === 2 && deltaRank === 1) || (deltaFile === 1 && deltaRank === 2);

              return (
                <ArrowComponent
                  key={`arrow-${index}`}
                  fromX={fromX}
                  fromY={fromY}
                  toX={toX}
                  toY={toY}
                  isKnightMove={isKnightMove}
                  squareSize={squareSize}
                />
              );
            })}
          </svg>

          {animatingPieces && animatingPieces.pieces.map((animatingPiece, index) => (
            <AnimatingPiece
              key={`${animatingPiece.from.file}-${animatingPiece.from.rank}-${index}`}
              piece={animatingPiece.piece}
              from={animatingPiece.from}
              to={animatingPiece.to}
              startTime={animatingPieces.startTime}
              squareSize={squareSize}
              animationDuration={animationDuration}
              onComplete={index === 0 ? handleAnimationComplete : () => {}} // Only call completion for the first piece
              flipped={flipped}
            />
          ))}

          {/* Promotion dialog overlay */}
          <PromotionDialog
            isOpen={promotionDialog.isOpen}
            color={promotionDialog.color}
            promotionSquare={{ file: promotionDialog.toFile, rank: promotionDialog.toRank }}
            squareSize={squareSize}
            flipped={flipped}
            onSelect={handlePromotion}
            onCancel={handlePromotionCancel}
          />

          {/* Game end badges for checkmate/stalemate */}
          {(() => {
            const gameState = chessEngine.getGameState();
            if (!gameState.isGameOver || !gameState.result) return null;

            const kingPositions = findKingPositions();
            const badges = [];

            if (gameState.result.reason === 'checkmate' && gameState.result.winner !== undefined) {
              // Checkmate: winner gets crown, loser gets fallen king
              if (kingPositions.white) {
                badges.push(
                  <GameEndBadge
                    key="white-king"
                    kingPosition={kingPositions.white}
                    squareSize={squareSize}
                    flipped={flipped}
                    badgeType={gameState.result.winner === Color.White ? 'winner' : 'loser'}
                  />
                );
              }
              if (kingPositions.black) {
                badges.push(
                  <GameEndBadge
                    key="black-king"
                    kingPosition={kingPositions.black}
                    squareSize={squareSize}
                    flipped={flipped}
                    badgeType={gameState.result.winner === Color.Black ? 'winner' : 'loser'}
                  />
                );
              }
            } else if (gameState.result.reason === 'stalemate') {
              // Stalemate: both kings get draw badge
              if (kingPositions.white) {
                badges.push(
                  <GameEndBadge
                    key="white-king"
                    kingPosition={kingPositions.white}
                    squareSize={squareSize}
                    flipped={flipped}
                    badgeType="draw"
                  />
                );
              }
              if (kingPositions.black) {
                badges.push(
                  <GameEndBadge
                    key="black-king"
                    kingPosition={kingPositions.black}
                    squareSize={squareSize}
                    flipped={flipped}
                    badgeType="draw"
                  />
                );
              }
            }

            return badges;
          })()}
        </div>
      </div>
    </DndProvider>
  );
});

ChessBoard.displayName = 'ChessBoard';
