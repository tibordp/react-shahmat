import React, { useState, useCallback, useEffect } from 'react';
import { DndProvider, useDrag, useDrop, useDragLayer } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { getEmptyImage } from 'react-dnd-html5-backend';
import './ChessBoard.css';
import { useJSChessEngine } from '../hooks/useJSChessEngine';
import { Piece, Position, PieceType } from '../engine/jsChessEngine';

// Using the JS engine types directly

// Import SVG icons
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
  const colorName = piece.color === 0 ? 'White' : 'Black';
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

interface CustomDragLayerProps {}

const CustomDragLayer: React.FC<CustomDragLayerProps> = () => {
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
          left: x - 30,
          top: y - 30,
          position: 'absolute',
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

interface PromotionDialogProps {
  isOpen: boolean;
  color: number;
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

const Square: React.FC<SquareProps> = ({ file, rank, piece, isSelected, isValidMove, isValidDropTarget, isCapture, isDragCapture, onSquareClick, onDrop, onDragStart, onDragEnd }) => {
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

  // Simple drag preview setup - just connect it immediately
  useEffect(() => {
    preview(getEmptyImage());
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
          style={{ opacity: isDragging ? 0 : 1 }}
        />
      )}
      {(isValidMove || isValidDropTarget) && (
        <div className={`move-indicator ${isCapture || isDragCapture ? 'capture-indicator' : 'normal-indicator'}`} />
      )}
    </div>
  );
};

export const ChessBoard: React.FC = () => {
  const chessEngine = useJSChessEngine();
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [dragValidMoves, setDragValidMoves] = useState<Position[]>([]);
  const [promotionDialog, setPromotionDialog] = useState<{
    isOpen: boolean;
    fromFile: number;
    fromRank: number;
    toFile: number;
    toRank: number;
    color: number;
  }>({
    isOpen: false,
    fromFile: 0,
    fromRank: 0,
    toFile: 0,
    toRank: 0,
    color: 0,
  });

  const attemptMove = useCallback((fromFile: number, fromRank: number, toFile: number, toRank: number) => {
    if (!chessEngine) return false;

    // Check if this is a pawn promotion
    if (chessEngine.isPawnPromotion(fromFile, fromRank, toFile, toRank)) {
      const boardState = chessEngine.getBoardState();
      const piece = boardState[7 - fromRank]?.[fromFile];
      setPromotionDialog({
        isOpen: true,
        fromFile,
        fromRank,
        toFile,
        toRank,
        color: piece?.color || 0,
      });
      return true; // Don't clear selection yet
    }

    // Regular move
    const success = chessEngine.makeMove(fromFile, fromRank, toFile, toRank);
    if (success) {
      setSelectedSquare(null);
      setValidMoves([]);
      setDragValidMoves([]);
    }
    return success;
  }, [chessEngine]);

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
        // Attempt to make a move
        attemptMove(selectedSquare.file, selectedSquare.rank, file, rank);
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

  const resetGame = useCallback(() => {
    if (!chessEngine) return;

    chessEngine.resetGame();
    setSelectedSquare(null);
    setValidMoves([]);
    setDragValidMoves([]);
  }, [chessEngine]);

  if (!chessEngine) {
    return <div>Loading chess engine...</div>;
  }

  const boardState = chessEngine.getBoardState();
  const currentPlayer = chessEngine.getCurrentPlayer();

  return (
    <DndProvider backend={HTML5Backend}>
      <CustomDragLayer />
      <div className="chess-game">
        <div className="game-info">
          <h2>Chess Game</h2>
          <p>Current Player: {currentPlayer === 0 ? 'White' : 'Black'}</p>
          <button onClick={resetGame}>New Game</button>
        </div>
        <div className="chess-board">
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
                  onSquareClick={handleSquareClick}
                  onDrop={handleDrop}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              );
            })
          ))}
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
