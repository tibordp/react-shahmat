import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Piece } from '../engine/chessRules';
import { getPieceIcon, describePiece } from '../utils/pieceIcons';
import type { PieceSet } from '../types';

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
  highlightDropTarget: boolean;
  boardId: string;
  draggable: boolean;
  /** DOM id used as the board's aria-activedescendant target */
  squareId: string;
  /** True when the keyboard focus cursor is on this square */
  isFocused: boolean;
  pieceSet: PieceSet;
  renderPiece?: (piece: Piece, size: number) => React.ReactNode;
  squareSize: number;
}

export interface DragItem {
  type: 'piece';
  file: number;
  rank: number;
  piece: Piece;
  boardId: string;
}

export const Square: React.FC<SquareProps> = React.memo(
  ({
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
    highlightDropTarget,
    boardId,
    draggable,
    squareId,
    isFocused,
    pieceSet: ps,
    renderPiece: rp,
    squareSize,
  }) => {
    const squareRef = useRef<HTMLDivElement>(null);
    const [{ isDragging }, drag] = useDrag(
      () => ({
        type: 'piece',
        item: () => {
          if (piece && draggable) {
            onDragStart(file, rank);
            return { type: 'piece', file, rank, piece, boardId };
          }
          return null;
        },
        canDrag: () => !!piece && draggable,
        end: () => {
          onDragEnd(file, rank);
        },
        collect: monitor => ({
          isDragging: monitor.isDragging(),
        }),
      }),
      [piece, file, rank, onDragStart, onDragEnd, boardId, draggable]
    );

    const [{ isOver }, drop] = useDrop(
      () => ({
        accept: 'piece',
        drop: (item: DragItem) => {
          onDrop(item.file, item.rank, file, rank);
        },
        collect: monitor => ({
          isOver: monitor.isOver() && monitor.canDrop(),
        }),
      }),
      [file, rank, onDrop]
    );

    const isLight = (file + rank) % 2 === 1;
    let squareClass = `${styles.square} ${
      isLight ? styles.light : styles.dark
    }`;

    if (isSelected) {
      squareClass += ` ${styles.selected}`;
    }

    if (isOver) {
      squareClass += ` ${styles.dropTarget}`;
      if (highlightDropTarget) {
        squareClass += ` ${styles.dropTargetHighlight}`;
      }
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

    if (draggable) {
      squareClass += ` ${styles.draggable}`;
    }

    if (isDragging) {
      squareClass += ` ${styles.dragging}`;
    }

    if (isKingInCheck) {
      squareClass += ` ${styles.kingInCheck}`;
    }

    if (isFocused) {
      squareClass += ` ${styles.focusCursor}`;
    }

    const pieceIcon = piece && !rp ? getPieceIcon(piece, ps) : null;

    // Accessible name: "e4, white knight" / "e4" for an empty square
    const squareName = String.fromCharCode(97 + file) + (rank + 1);
    const ariaLabel = piece
      ? `${squareName}, ${describePiece(piece)}`
      : squareName;

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
        id={squareId}
        role='button'
        aria-label={ariaLabel}
        aria-pressed={isSelected}
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
        {piece &&
          (isDragging || isAnimatingFrom || isAnimatingTo ? null : rp ? (
            <div className={styles.piece}>{rp(piece, squareSize)}</div>
          ) : pieceIcon ? (
            <img
              src={pieceIcon}
              alt={describePiece(piece)}
              className={styles.piece}
            />
          ) : null)}
        {isValidMove && (
          <div
            className={`${styles.moveIndicator} ${
              isCapture ? styles.captureIndicator : styles.normalIndicator
            }`}
          />
        )}
        {fileLabel && (
          <div
            className={`${styles.fileLabelInset} ${
              isLight ? styles.darkText : styles.lightText
            }`}
          >
            {fileLabel}
          </div>
        )}
        {rankLabel && (
          <div
            className={`${styles.rankLabelInset} ${
              isLight ? styles.darkText : styles.lightText
            }`}
          >
            {rankLabel}
          </div>
        )}
      </div>
    );
  }
);
