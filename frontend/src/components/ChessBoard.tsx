import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { Piece, Position, PieceType, Color } from '../engine/jsChessEngine';
import { soundManager } from '../utils/soundManager';
import './ChessBoard.css';

// Constants
const ANIMATION_DURATION = 300;

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
  isValidDropTarget: boolean;
  isCapture: boolean;
  isDragCapture: boolean;
  isAnimatingFrom: boolean;
  onSquareClick: (file: number, rank: number) => void;
  onDrop: (fromFile: number, fromRank: number, toFile: number, toRank: number) => void;
  onDragStart: (file: number, rank: number) => void;
  onDragEnd: () => void;
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
          left: x - (squareSize * 0.45),
          top: y - (squareSize * 0.45),
          position: 'absolute',
          width: squareSize * 0.9,
          height: squareSize * 0.9,
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
  onComplete: () => void;
}

const AnimatingPiece: React.FC<AnimatingPieceProps & { squareSize: number }> = ({ piece, from, to, startTime, onComplete, squareSize }) => {
  const fromX = from.file * squareSize + squareSize / 2;
  const fromY = (7 - from.rank) * squareSize + squareSize / 2;
  const toX = to.file * squareSize + squareSize / 2;
  const toY = (7 - to.rank) * squareSize + squareSize / 2;

  const [position, setPosition] = useState({ x: fromX, y: fromY });
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

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
  }, [fromX, fromY, toX, toY, startTime, onComplete]);

  const pieceIcon = getPieceIcon(piece);
  const scale = squareSize * 0.9; // Scale down to fit within the square
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
  onSelect: (pieceType: PieceType) => void;
  onCancel: () => void;
}

const PromotionDialog: React.FC<PromotionDialogProps> = ({ isOpen, color, onSelect, onCancel }) => {
  if (!isOpen) return null;

  const pieces = [
    { type: PieceType.Queen, icon: getPieceIcon({ type: PieceType.Queen, color }) },
    { type: PieceType.Rook, icon: getPieceIcon({ type: PieceType.Rook, color }) },
    { type: PieceType.Bishop, icon: getPieceIcon({ type: PieceType.Bishop, color }) },
    { type: PieceType.Knight, icon: getPieceIcon({ type: PieceType.Knight, color }) },
  ];

  return (
    <div className="promotion-overlay">
      <div className="promotion-dialog">
        <h3>Choose promotion piece:</h3>
        <div className="promotion-pieces">
          {pieces.map(({ type, icon }) => (
            <button
              key={type}
              className="promotion-piece"
              onClick={() => onSelect(type)}
            >
              <img src={icon} alt="promotion piece" className="promotion-piece-img" />
            </button>
          ))}
        </div>
        <button className="promotion-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};

const Square: React.FC<SquareProps> = ({ file, rank, piece, isSelected, isValidMove, isValidDropTarget, isCapture, isDragCapture, isAnimatingFrom, onSquareClick, onDrop, onDragStart, onDragEnd }) => {
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
      onDragEnd();
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
    canDrop: () => isValidDropTarget,
    collect: (monitor) => ({
      isOver: monitor.isOver() && monitor.canDrop(),
    }),
  }), [file, rank, onDrop, isValidDropTarget]);

  const isLight = (file + rank) % 2 === 0;
  let squareClass = `square ${isLight ? 'light' : 'dark'}`;

  if (isSelected || isDragging) {
    squareClass += ' selected';
  }

  if (isOver) {
    squareClass += ' drop-target';
  }

  const pieceIcon = piece ? getPieceIcon(piece) : null;

  // Show file label on rank 0 (bottom row)
  const showFileLabel = rank === 0;
  const fileLabel = showFileLabel ? String.fromCharCode(97 + file) : null; // 'a' = 97

  // Show rank label on file 0 (leftmost column)
  const showRankLabel = file === 0;
  const rankLabel = showRankLabel ? (rank + 1).toString() : null;

  const attachRef = (node: HTMLDivElement | null) => {
    drag(drop(node));
  };

  return (
    <div
      ref={attachRef}
      className={`${squareClass} ${isDragging ? 'selected' : ''}`}
      onClick={() => onSquareClick(file, rank)}
    >
      {pieceIcon && (
        <img
          src={pieceIcon}
          alt="chess piece"
          className="piece"
          style={{ opacity: isDragging || isAnimatingFrom ? 0 : 1 }}
        />
      )}
      {(isValidMove || isValidDropTarget) && (
        <div className={`move-indicator ${isCapture || isDragCapture ? 'capture-indicator' : 'normal-indicator'}`} />
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
}

export const ChessBoard: React.FC<ChessBoardProps> = ({ size, className }) => {
  const chessEngine = useJSChessEngine();
  const [boardSize, setBoardSize] = useState(size || 512);
  const boardRef = useRef<HTMLDivElement>(null);

  const squareSize = boardSize / 8;

  // Handle responsive sizing when no size prop is provided
  useEffect(() => {
    if (size) return; // Don't resize if explicit size is provided

    const handleResize = () => {
      if (boardRef.current && boardRef.current.parentElement) {
        const parentWidth = boardRef.current.parentElement.clientWidth;
        const parentHeight = boardRef.current.parentElement.clientHeight;
        const availableSize = Math.min(parentWidth, parentHeight) - 40; // Leave some padding
        setBoardSize(Math.max(256, availableSize)); // Minimum 256px
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size]);
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [dragValidMoves, setDragValidMoves] = useState<Position[]>([]);
  const [animatingPiece, setAnimatingPiece] = useState<{
    piece: Piece;
    from: Position;
    to: Position;
    startTime: number;
    moveData: {
      fromFile: number;
      fromRank: number;
      toFile: number;
      toRank: number;
    };
  } | null>(null);
  const [promotionDialog, setPromotionDialog] = useState<{
    isOpen: boolean;
    fromFile: number;
    fromRank: number;
    toFile: number;
    toRank: number;
    color: Color;
  }>({
    isOpen: false,
    fromFile: 0,
    fromRank: 0,
    toFile: 0,
    toRank: 0,
    color: Color.White,
  });

  const attemptMove = useCallback((fromFile: number, fromRank: number, toFile: number, toRank: number, animate: boolean = false) => {
    if (!chessEngine) return false;

    // First check if the move is valid by checking valid moves
    const piece = chessEngine.getPiece(fromFile, fromRank);
    if (!piece || piece.color !== chessEngine.getCurrentPlayer()) return false;

    const validMoves = chessEngine.getValidMoves(fromFile, fromRank);
    const isValidMove = validMoves.some(move => move.file === toFile && move.rank === toRank);

    if (!isValidMove) return false;

    // Check if this is a pawn promotion
    if (chessEngine.isPawnPromotion(fromFile, fromRank, toFile, toRank)) {
      const boardState = chessEngine.getBoardState();
      const boardPiece = boardState[7 - fromRank]?.[fromFile];
      setPromotionDialog({
        isOpen: true,
        fromFile,
        fromRank,
        toFile,
        toRank,
        color: boardPiece?.color || Color.White,
      });
      return true; // Don't clear selection yet
    }

    // If animation requested, start animation and defer the move until completion
    if (animate) {
      const boardState = chessEngine.getBoardState();
      const boardPiece = boardState[7 - fromRank]?.[fromFile];
      if (boardPiece) {
        setAnimatingPiece({
          piece: boardPiece,
          from: { file: fromFile, rank: fromRank },
          to: { file: toFile, rank: toRank },
          startTime: Date.now(),
          moveData: { fromFile, fromRank, toFile, toRank },
        });

        // Clear selection immediately but don't make the move yet
        setSelectedSquare(null);
        setValidMoves([]);
        setDragValidMoves([]);

        return true;
      }
    }

    // Check if this is a capture before making the move
    const targetSquare = chessEngine.getPiece(toFile, toRank);
    const isCapture = !!targetSquare;
    
    // Regular move (immediate)
    const success = chessEngine.makeMove(fromFile, fromRank, toFile, toRank);
    if (success) {
      setSelectedSquare(null);
      setValidMoves([]);
      setDragValidMoves([]);
      
      // Play appropriate sound effect
      if (isCapture) {
        soundManager.playCaptureSound();
      } else {
        soundManager.playMoveSound();
      }
      
      // Check if the move puts the opponent in check
      const opponentColor = chessEngine.getCurrentPlayer(); // Current player switched after move
      if (chessEngine.isKingInCheck(opponentColor)) {
        setTimeout(() => soundManager.playCheckSound(), 200);
      }
    }
    return success;
  }, [chessEngine]);

  const handleAnimationComplete = useCallback(() => {
    if (animatingPiece && chessEngine) {
      // Check if this is a capture before making the move
      const { fromFile, fromRank, toFile, toRank } = animatingPiece.moveData;
      const targetSquare = chessEngine.getPiece(toFile, toRank);
      const isCapture = !!targetSquare;
      
      // Execute the move now that animation is complete
      const success = chessEngine.makeMove(fromFile, fromRank, toFile, toRank);
      
      if (success) {
        // Play appropriate sound effect
        if (isCapture) {
          soundManager.playCaptureSound();
        } else {
          soundManager.playMoveSound();
        }
        
        // Check if the move puts the opponent in check
        const opponentColor = chessEngine.getCurrentPlayer(); // Current player switched after move
        if (chessEngine.isKingInCheck(opponentColor)) {
          setTimeout(() => soundManager.playCheckSound(), 200);
        }
      }
    }
    setAnimatingPiece(null);
  }, [animatingPiece, chessEngine]);

  const handlePromotion = useCallback((pieceType: PieceType) => {
    if (!chessEngine) return;

    const success = chessEngine.makeMove(
      promotionDialog.fromFile,
      promotionDialog.fromRank,
      promotionDialog.toFile,
      promotionDialog.toRank,
      pieceType
    );

    if (success) {
      setSelectedSquare(null);
      setValidMoves([]);
      setDragValidMoves([]);
      
      // Play promotion sound
      soundManager.playPromotionSound();
      
      // Check if the move puts the opponent in check
      const opponentColor = chessEngine.getCurrentPlayer(); // Current player switched after move
      if (chessEngine.isKingInCheck(opponentColor)) {
        setTimeout(() => soundManager.playCheckSound(), 400);
      }
    }

    setPromotionDialog(prev => ({ ...prev, isOpen: false }));
  }, [chessEngine, promotionDialog]);

  const handlePromotionCancel = useCallback(() => {
    setPromotionDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleSquareClick = useCallback((file: number, rank: number) => {
    if (!chessEngine) return;

    const boardState = chessEngine.getBoardState();
    const piece = boardState[7 - rank]?.[file];

    if (selectedSquare) {
      // Try to make a move
      if (selectedSquare.file === file && selectedSquare.rank === rank) {
        // Deselect if clicking the same square
        setSelectedSquare(null);
        setValidMoves([]);
      } else if (piece && piece.color === chessEngine.getCurrentPlayer()) {
        // Clicking on a different piece of the same player - switch selection
        setSelectedSquare({ file, rank });
        const moves = chessEngine.getValidMoves(file, rank);
        setValidMoves(moves);
      } else {
        // Attempt to make a move with animation
        attemptMove(selectedSquare.file, selectedSquare.rank, file, rank, true);
      }
    } else if (piece && piece.color === chessEngine.getCurrentPlayer()) {
      // Select a piece and show valid moves
      setSelectedSquare({ file, rank });
      const moves = chessEngine.getValidMoves(file, rank);
      setValidMoves(moves);
    }
  }, [chessEngine, selectedSquare, attemptMove]);

  const handleDrop = useCallback((fromFile: number, fromRank: number, toFile: number, toRank: number) => {
    if (!chessEngine) return;
    attemptMove(fromFile, fromRank, toFile, toRank);
  }, [chessEngine, attemptMove]);

  const handleDragStart = useCallback((file: number, rank: number) => {
    if (!chessEngine) return;

    // Clear any existing selection indicators when starting to drag
    setSelectedSquare(null);
    setValidMoves([]);

    const moves = chessEngine.getValidMoves(file, rank);
    setDragValidMoves(moves);
  }, [chessEngine]);

  const handleDragEnd = useCallback(() => {
    setDragValidMoves([]);
  }, []);

  const isSquareSelected = useCallback((file: number, rank: number) => {
    return selectedSquare ? selectedSquare.file === file && selectedSquare.rank === rank : false;
  }, [selectedSquare]);

  const isValidMoveSquare = useCallback((file: number, rank: number) => {
    return validMoves.some(move => move.file === file && move.rank === rank);
  }, [validMoves]);

  const isValidDropTarget = useCallback((file: number, rank: number) => {
    return dragValidMoves.some(move => move.file === file && move.rank === rank);
  }, [dragValidMoves]);

  const isCapture = useCallback((file: number, rank: number) => {
    if (!chessEngine || !isValidMoveSquare(file, rank)) return false;
    const boardState = chessEngine.getBoardState();
    const targetPiece = boardState[7 - rank]?.[file];
    return !!targetPiece;
  }, [chessEngine, isValidMoveSquare]);

  const isDragCapture = useCallback((file: number, rank: number) => {
    if (!chessEngine || !isValidDropTarget(file, rank)) return false;
    const boardState = chessEngine.getBoardState();
    const targetPiece = boardState[7 - rank]?.[file];
    return !!targetPiece;
  }, [chessEngine, isValidDropTarget]);

  const isAnimatingFrom = useCallback((file: number, rank: number) => {
    return animatingPiece?.from.file === file && animatingPiece?.from.rank === rank;
  }, [animatingPiece]);


  if (!chessEngine) {
    return <div>Loading chess engine...</div>;
  }

  const boardState = chessEngine.getBoardState();

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
          {boardState.map((row, rankIndex) => (
            row.map((piece, fileIndex) => {
              const actualRank = 7 - rankIndex;
              return (
                <Square
                  key={`${fileIndex}-${actualRank}`}
                  file={fileIndex}
                  rank={actualRank}
                  piece={piece}
                  isSelected={isSquareSelected(fileIndex, actualRank)}
                  isValidMove={isValidMoveSquare(fileIndex, actualRank)}
                  isValidDropTarget={isValidDropTarget(fileIndex, actualRank)}
                  isCapture={isCapture(fileIndex, actualRank)}
                  isDragCapture={isDragCapture(fileIndex, actualRank)}
                  isAnimatingFrom={isAnimatingFrom(fileIndex, actualRank)}
                  onSquareClick={handleSquareClick}
                  onDrop={handleDrop}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              );
            })
          ))}
          {animatingPiece && (
            <AnimatingPiece
              piece={animatingPiece.piece}
              from={animatingPiece.from}
              to={animatingPiece.to}
              startTime={animatingPiece.startTime}
              squareSize={squareSize}
              onComplete={handleAnimationComplete}
            />
          )}
        </div>
        <PromotionDialog
          isOpen={promotionDialog.isOpen}
          color={promotionDialog.color}
          onSelect={handlePromotion}
          onCancel={handlePromotionCancel}
        />
      </div>
    </DndProvider>
  );
};
