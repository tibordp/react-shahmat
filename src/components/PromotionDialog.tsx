import React from 'react';
import { Piece, PieceType, Color } from '../engine/chessRules';
import { getPieceIconByType } from '../utils/pieceIcons';
import type { PieceSet } from '../types';

import styles from './ChessBoard.module.css';

export interface PromotionDialogProps {
  isOpen: boolean;
  color: Color;
  promotionSquare: { file: number; rank: number };
  squareSize: number;
  flipped?: boolean;
  onSelect: (pieceType: PieceType) => void;
  onCancel: () => void;
  pieceSet: PieceSet;
  renderPiece?: (piece: Piece, size: number) => React.ReactNode;
}

export const PromotionDialog: React.FC<PromotionDialogProps> = ({
  isOpen,
  color,
  promotionSquare,
  squareSize,
  flipped,
  onSelect,
  onCancel,
  pieceSet,
  renderPiece,
}) => {
  if (!isOpen) return null;

  const effectiveSquare = flipped
    ? { file: 7 - promotionSquare.file, rank: 7 - promotionSquare.rank }
    : promotionSquare;

  const squareX = effectiveSquare.file * squareSize;
  const squareY = (7 - effectiveSquare.rank) * squareSize;

  const isVisuallyAtBottom = squareY === 7 * squareSize;

  const promotionTypes = [
    PieceType.Queen,
    PieceType.Rook,
    PieceType.Bishop,
    PieceType.Knight,
  ];
  const orderedTypes = isVisuallyAtBottom
    ? [...promotionTypes].reverse()
    : promotionTypes;

  const dialogX = squareX;
  const dialogY = isVisuallyAtBottom ? squareY - 3 * squareSize : squareY;

  return (
    <>
      <div
        className={styles.promotionBoardOverlay}
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
        className={styles.promotionDialog}
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
        {orderedTypes.map(type => (
          <button
            key={type}
            className={styles.promotionPiece}
            onClick={() => onSelect(type)}
          >
            {renderPiece ? (
              renderPiece({ type, color }, squareSize)
            ) : (
              <img
                src={getPieceIconByType(color, type, pieceSet)}
                alt='promotion piece'
                className={styles.promotionPieceImg}
              />
            )}
          </button>
        ))}
      </div>
    </>
  );
};
