import React, { useRef, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import {
  Piece,
  Color,
} from '../engine/jsChessEngine';
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

function getPieceTypeName(pieceType: number): string {
  const types = ['Pawn', 'Rook', 'Knight', 'Bishop', 'Queen', 'King'];
  return types[pieceType] || 'Unknown';
}

function getPieceIcon(piece: Piece): string {
  const colorName = piece.color === Color.White ? 'White' : 'Black';
  const typeName = getPieceTypeName(piece.type);
  return PIECE_ICONS[`${colorName}_${typeName}`];
}

export interface SquareProps {
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
  isKingInCheck: boolean;
  flipped?: boolean; // Whether to flip the board for black perspective
  showCoordinates?: boolean; // Whether to show rank and file labels
  onSquareClick: (file: number, rank: number) => void;
  onDrop: (
    fromFile: number,
    fromRank: number,
    toFile: number,
    toRank: number
  ) => void;
  onDragStart: (file: number, rank: number) => void;
  onDragEnd: (file: number, rank: number) => void;
  onRightMouseDown: (file: number, rank: number) => void;
  onRightMouseUp: (file: number, rank: number) => void;
}

export interface DragItem {
  type: 'piece';
  file: number;
  rank: number;
  piece: Piece;
}

export const Square: React.FC<SquareProps> = ({
  file,
  rank,
  piece,
  isSelected,
  isValidMove,
  isCapture,
  isAnimatingFrom,
  isAnimatingTo,
  isLastMoveFrom,
  isLastMoveTo,
  isHighlighted,
  isPreMove,
  isKingInCheck,
  onSquareClick,
  onDrop,
  onDragStart,
  onDragEnd,
  onRightMouseDown,
  onRightMouseUp,
  flipped,
  showCoordinates,
}) => {
  const squareRef = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
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
      collect: monitor => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [piece, file, rank, onDragStart, onDragEnd]
  );

  // Setup drag preview to prevent native drag behavior
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'piece',
      drop: (item: DragItem, monitor) => {
        onDrop(item.file, item.rank, file, rank);
      },
      collect: monitor => ({
        isOver: monitor.isOver() && monitor.canDrop(),
      }),
    }),
    [file, rank, onDrop, isValidMove]
  );

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

  if (isKingInCheck) {
    squareClass += ' king-in-check';
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
    squareRef.current = node;
  };

  return (
    <div
      ref={attachRef}
      className={squareClass}
      onClick={() => onSquareClick(file, rank)}
      onMouseDown={e => {
        if (e.button === 2) {
          // Right mouse button
          e.preventDefault();
          onRightMouseDown(file, rank);
        }
      }}
      onMouseUp={e => {
        if (e.button === 2) {
          // Right mouse button
          e.preventDefault();
          onRightMouseUp(file, rank);
        }
      }}
      onContextMenu={e => e.preventDefault()} // Prevent context menu
    >
      {pieceIcon && (
        <img
          src={pieceIcon}
          alt='chess piece'
          className='piece'
          style={{
            display:
              isDragging || isAnimatingFrom || isAnimatingTo ? 'none' : 'block',
          }}
        />
      )}
      {isValidMove && (
        <div
          className={`move-indicator ${isCapture ? 'capture-indicator' : 'normal-indicator'}`}
        />
      )}
      {fileLabel && (
        <div
          className={`file-label-inset ${isLight ? 'dark-text' : 'light-text'}`}
        >
          {fileLabel}
        </div>
      )}
      {rankLabel && (
        <div
          className={`rank-label-inset ${isLight ? 'dark-text' : 'light-text'}`}
        >
          {rankLabel}
        </div>
      )}
    </div>
  );
};