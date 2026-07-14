import React from 'react';
import { useDragLayer } from 'react-dnd';
import { Piece } from '../engine/chessRules';
import { getPieceIcon } from '../utils/pieceIcons';
import type { PieceSet } from '../types';

import styles from './ChessBoard.module.css';

interface CustomDragLayerProps {
  squareSize: number;
  boardId: string;
  pieceSet: PieceSet;
  renderPiece?: (piece: Piece, size: number) => React.ReactNode;
}

/** Renders the dragged piece under the cursor (the source square hides its
 *  own piece during a drag). */
export const CustomDragLayer: React.FC<CustomDragLayerProps> = ({
  squareSize,
  boardId,
  pieceSet: ps,
  renderPiece: rp,
}) => {
  const { isDragging, item, currentOffset } = useDragLayer(
    (monitor: unknown) => ({
      item: (
        monitor as { getItem(): { piece?: Piece; boardId?: string } }
      ).getItem(),
      currentOffset: (
        monitor as { getClientOffset(): { x: number; y: number } | null }
      ).getClientOffset(),
      isDragging: (monitor as { isDragging(): boolean }).isDragging(),
    })
  );

  if (!isDragging || !currentOffset || item?.boardId !== boardId) return null;

  const { x, y } = currentOffset;
  const piece = item?.piece;
  if (!piece) return null;

  const shadow = `drop-shadow(${Math.max(1, squareSize * 0.03)}px ${Math.max(
    1,
    squareSize * 0.03
  )}px ${Math.max(2, squareSize * 0.06)}px rgba(0, 0, 0, 0.6))`;

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
          filter: shadow,
        }}
      >
        {rp ? (
          rp(piece, squareSize)
        ) : (
          <img
            src={getPieceIcon(piece, ps)}
            alt=''
            aria-hidden='true'
            className={styles.dragPreviewPieceImg}
          />
        )}
      </div>
    </div>
  );
};
