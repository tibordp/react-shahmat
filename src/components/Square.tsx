import React, { useRef, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { Piece } from '../engine/jsChessEngine';
import { getPieceIcon } from '../utils/pieceIcons';

import styles from './ChessBoard.module.css';

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
      collect: (monitor: any) => ({
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
      drop: (item: DragItem, monitor: any) => {
        onDrop(item.file, item.rank, file, rank);
      },
      collect: (monitor: any) => ({
        isOver: monitor.isOver() && monitor.canDrop(),
      }),
    }),
    [file, rank, onDrop, isValidMove]
  );

  const isLight = (file + rank) % 2 === 1;
  let squareClass = `${styles.square} ${isLight ? styles.light : styles.dark}`;

  if (isSelected) {
    squareClass += ` ${styles.selected}`;
  }

  if (isOver) {
    squareClass += ` ${styles.dropTarget}`;
  }

  if (isLastMoveFrom || isLastMoveTo) {
    squareClass += ` ${styles.lastMove}`;
  }

  if (isHighlighted) {
    squareClass += ` ${styles.highlighted}`;
  }

  if (isPreMove) {
    squareClass += ` ${styles.preMove}`;
  }

  if (isKingInCheck) {
    squareClass += ` ${styles.kingInCheck}`;
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
          className={styles.piece}
          style={{
            display:
              isDragging || isAnimatingFrom || isAnimatingTo ? 'none' : 'block',
          }}
        />
      )}
      {isValidMove && (
        <div
          className={`${styles.moveIndicator} ${isCapture ? styles.captureIndicator : styles.normalIndicator}`}
        />
      )}
      {fileLabel && (
        <div
          className={`${styles.fileLabelInset} ${isLight ? styles.darkText : styles.lightText}`}
        >
          {fileLabel}
        </div>
      )}
      {rankLabel && (
        <div
          className={`${styles.rankLabelInset} ${isLight ? styles.darkText : styles.lightText}`}
        >
          {rankLabel}
        </div>
      )}
    </div>
  );
};
