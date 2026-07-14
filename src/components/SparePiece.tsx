import React, { useId } from 'react';
import { createPortal } from 'react-dom';
import { useDrag, useDragLayer } from 'react-dnd';
import { Piece } from '../engine/chessRules';
import { getPieceIcon, describePiece } from '../utils/pieceIcons';
import { defaultPieceSet } from '../utils/pieceIcons';
import type { PieceSet } from '../types';
import type { DragItem } from './Square';

import styles from './ChessBoard.module.css';

export interface SparePieceProps {
  piece: Piece;
  /** Rendered size in pixels; also the drag preview size. Default: 64 */
  size?: number;
  pieceSet?: PieceSet;
  renderPiece?: (piece: Piece, size: number) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** Drag preview for a spare piece. Mounted only while this SparePiece is
 *  being dragged, and gated on the item's sourceId so several palettes on
 *  one page never render duplicate previews. */
const SparePiecePreview: React.FC<{
  sourceId: string;
  size: number;
  pieceSet: PieceSet;
  renderPiece?: (piece: Piece, size: number) => React.ReactNode;
}> = ({ sourceId, size, pieceSet, renderPiece }) => {
  const { item, currentOffset, isDragging } = useDragLayer(monitor => ({
    item: monitor.getItem() as DragItem | null,
    currentOffset: monitor.getClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (
    !isDragging ||
    !currentOffset ||
    !item?.spare ||
    item.sourceId !== sourceId
  ) {
    return null;
  }

  const { x, y } = currentOffset;
  // Portal to <body>: the preview must not be trapped in an ancestor
  // stacking context (e.g. a palette rendered before the board in DOM order
  // would paint its fixed-position ghost underneath the board).
  return createPortal(
    <div className={styles.customDragLayer}>
      <div
        className={styles.dragPreviewPiece}
        style={{
          left: x - size / 2,
          top: y - size / 2,
          position: 'absolute',
          width: size,
          height: size,
        }}
      >
        {renderPiece ? (
          renderPiece(item.piece, size)
        ) : (
          <img
            src={getPieceIcon(item.piece, pieceSet)}
            alt=''
            aria-hidden='true'
            className={styles.dragPreviewPieceImg}
          />
        )}
      </div>
    </div>,
    document.body
  );
};

/**
 * A draggable chess piece that lives outside any board — the building block
 * for piece palettes in position editors. Must be rendered inside a shared
 * drag-and-drop context (see BoardDndProvider) together with a ChessBoard
 * that provides onPiecePlace; dropping the spare piece on a square calls
 * that callback.
 */
export const SparePiece: React.FC<SparePieceProps> = ({
  piece,
  size = 64,
  pieceSet,
  renderPiece,
  className,
  style,
}) => {
  const sourceId = useId();
  const effectivePieceSet = pieceSet ?? defaultPieceSet;

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'piece',
      item: { type: 'piece' as const, piece, spare: true as const, sourceId },
      collect: monitor => ({ isDragging: monitor.isDragging() }),
    }),
    [piece, sourceId]
  );

  return (
    <div
      ref={node => {
        drag(node);
      }}
      role='img'
      aria-label={describePiece(piece)}
      className={className}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* Dim only the piece content while dragging — opacity on the wrapper
          would create a stacking context (harmless now that the preview is
          portaled, but the dimmed ghost would still look wrong). */}
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDragging ? 0.4 : 1,
        }}
      >
        {renderPiece ? (
          renderPiece(piece, size)
        ) : (
          <img
            src={getPieceIcon(piece, effectivePieceSet)}
            alt=''
            aria-hidden='true'
            style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
            draggable={false}
          />
        )}
      </div>
      {isDragging && (
        <SparePiecePreview
          sourceId={sourceId}
          size={size}
          pieceSet={effectivePieceSet}
          renderPiece={renderPiece}
        />
      )}
    </div>
  );
};
