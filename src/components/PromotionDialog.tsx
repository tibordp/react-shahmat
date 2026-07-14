import React, { useEffect, useRef } from 'react';
import { Piece, PieceType, Color } from '../engine/chessRules';
import { getPieceIconByType, describePiece } from '../utils/pieceIcons';
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
  /** Called on right-click (cancel + clear premoves) */
  onRightClickCancel?: () => void;
  /**
   * Called just before focus is restored to the previously focused element
   * on close (lets the board ignore that programmatic focus event).
   */
  onBeforeRestoreFocus?: () => void;
  pieceSet: PieceSet;
  renderPiece?: (piece: Piece, size: number) => React.ReactNode;
}

const PROMOTION_TYPES = [
  PieceType.Queen,
  PieceType.Rook,
  PieceType.Bishop,
  PieceType.Knight,
];

export const PromotionDialog: React.FC<PromotionDialogProps> = ({
  isOpen,
  color,
  promotionSquare,
  squareSize,
  flipped,
  onSelect,
  onCancel,
  onRightClickCancel,
  onBeforeRestoreFocus,
  pieceSet,
  renderPiece,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Modal focus management: remember the previously focused element, move
  // focus to the first choice on open, and restore focus on close.
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const firstButton = dialogRef.current?.querySelector('button');
    firstButton?.focus();
    return () => {
      onBeforeRestoreFocus?.();
      previousFocusRef.current?.focus?.();
      previousFocusRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callbacks are stable; re-running on their identity would steal focus
  }, [isOpen]);

  if (!isOpen) return null;

  const effectiveSquare = flipped
    ? { file: 7 - promotionSquare.file, rank: 7 - promotionSquare.rank }
    : promotionSquare;

  const squareX = effectiveSquare.file * squareSize;
  const squareY = (7 - effectiveSquare.rank) * squareSize;

  const isVisuallyAtBottom = squareY === 7 * squareSize;

  const orderedTypes = isVisuallyAtBottom
    ? [...PROMOTION_TYPES].reverse()
    : PROMOTION_TYPES;

  const dialogX = squareX;
  const dialogY = isVisuallyAtBottom ? squareY - 3 * squareSize : squareY;

  // The picker is one composite widget: arrow keys move between the choices
  // (with wraparound), Enter/Space activates, Escape cancels, and Tab is
  // inert — there is exactly one place focus can be while the dialog is open.
  const handleDialogKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      return;
    }

    const step =
      e.key === 'ArrowDown' || e.key === 'ArrowRight'
        ? 1
        : e.key === 'ArrowUp' || e.key === 'ArrowLeft'
          ? -1
          : 0;
    if (step !== 0) {
      e.preventDefault();
      e.stopPropagation(); // keep host-page arrow hotkeys from firing
      const buttons = Array.from(
        dialogRef.current?.querySelectorAll('button') ?? []
      );
      if (buttons.length === 0) return;
      const current = buttons.indexOf(
        document.activeElement as HTMLButtonElement
      );
      const next =
        (Math.max(current, 0) + step + buttons.length) % buttons.length;
      buttons[next].focus();
    }
  };

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
        onContextMenu={e => {
          e.preventDefault();
          (onRightClickCancel ?? onCancel)();
        }}
      />
      <div
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-label={`Promote ${color === Color.White ? 'white' : 'black'} pawn`}
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
        onContextMenu={e => e.preventDefault()}
        onKeyDown={handleDialogKeyDown}
      >
        {orderedTypes.map(type => (
          <button
            key={type}
            className={styles.promotionPiece}
            // Name the button itself so it stays accessible when a custom
            // renderPiece provides the visual content
            aria-label={`Promote to ${describePiece({ type, color })}`}
            // Roving focus via arrow keys — the buttons are not tab stops
            tabIndex={-1}
            onClick={() => onSelect(type)}
          >
            {renderPiece ? (
              renderPiece({ type, color }, squareSize)
            ) : (
              <img
                src={getPieceIconByType(color, type, pieceSet)}
                alt=''
                aria-hidden='true'
                className={styles.promotionPieceImg}
              />
            )}
          </button>
        ))}
      </div>
    </>
  );
};
