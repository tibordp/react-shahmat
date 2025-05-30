import React from 'react';
import { PieceType, Color } from '../engine/jsChessEngine';
import { getPieceIconByType } from '../utils/pieceIcons';

export interface PromotionDialogProps {
  isOpen: boolean;
  color: Color;
  promotionSquare: { file: number; rank: number };
  squareSize: number;
  flipped?: boolean;
  onSelect: (pieceType: PieceType) => void;
  onCancel: () => void;
}

export const PromotionDialog: React.FC<PromotionDialogProps> = ({
  isOpen,
  color,
  promotionSquare,
  squareSize,
  flipped,
  onSelect,
  onCancel,
}) => {
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
    {
      type: PieceType.Queen,
      icon: getPieceIconByType(color, PieceType.Queen),
    },
    {
      type: PieceType.Rook,
      icon: getPieceIconByType(color, PieceType.Rook),
    },
    {
      type: PieceType.Bishop,
      icon: getPieceIconByType(color, PieceType.Bishop),
    },
    {
      type: PieceType.Knight,
      icon: getPieceIconByType(color, PieceType.Knight),
    },
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
    dialogY = squareY - 3 * squareSize;
  } else {
    // Fallback (shouldn't happen in normal chess)
    dialogY = squareY;
  }

  return (
    <>
      {/* Invisible overlay for click-outside-to-cancel */}
      <div
        className='promotion-board-overlay'
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
        className='promotion-dialog'
        style={{
          position: 'absolute',
          left: dialogX,
          top: dialogY,
          width: squareSize,
          height: squareSize * 4,
          zIndex: 1000,
        }}
        onClick={e => e.stopPropagation()}
      >
        {pieces.map(({ type, icon }) => (
          <button
            key={type}
            className='promotion-piece'
            style={{
              width: squareSize,
              height: squareSize,
            }}
            onClick={() => onSelect(type)}
          >
            <img
              src={icon}
              alt='promotion piece'
              className='promotion-piece-img'
            />
          </button>
        ))}
      </div>
    </>
  );
};
