import React from 'react';
import { Position } from '../engine/chessRules';
import { whiteKing } from '../utils/pieceIcons';

import styles from './ChessBoard.module.css';

interface GameEndBadgeProps {
  kingPosition: Position;
  squareSize: number;
  flipped?: boolean;
  badgeType: 'winner' | 'loser' | 'draw';
}

/** Circular result badge anchored to a king's square at game end. */
export const GameEndBadge: React.FC<GameEndBadgeProps> = ({
  kingPosition,
  squareSize,
  flipped,
  badgeType,
}) => {
  const effectivePosition = flipped
    ? { file: 7 - kingPosition.file, rank: 7 - kingPosition.rank }
    : kingPosition;

  const kingX = effectivePosition.file * squareSize;
  const kingY = (7 - effectivePosition.rank) * squareSize;

  const badgeSize = squareSize * 0.5;

  let badgeX = kingX + squareSize - badgeSize / 2;
  let badgeY = kingY - badgeSize / 2;

  const boardSize = squareSize * 8;

  if (badgeX + badgeSize > boardSize) {
    badgeX = boardSize - badgeSize;
  }
  if (badgeY < 0) {
    badgeY = 0;
  }

  const getBadgeColor = () => {
    switch (badgeType) {
      case 'winner':
        return '#4CAF50';
      case 'loser':
        return '#f44336';
      case 'draw':
        return '#757575';
    }
  };

  const renderBadgeContent = () => {
    if (badgeType === 'draw') {
      return (
        <span
          style={{
            color: 'white',
            fontSize: badgeSize * 0.6,
            fontWeight: 'bold',
          }}
        >
          ½
        </span>
      );
    } else {
      return (
        <img
          src={whiteKing}
          alt={badgeType === 'loser' ? 'defeated king' : 'victorious king'}
          style={{
            width: badgeSize * 0.7,
            height: badgeSize * 0.7,
            filter: 'brightness(0) invert(1)',
            transform: badgeType === 'loser' ? 'rotate(90deg)' : 'none',
          }}
        />
      );
    }
  };

  return (
    <div
      className={styles.gameEndBadge}
      style={{
        position: 'absolute',
        left: badgeX,
        top: badgeY,
        width: badgeSize,
        height: badgeSize,
        backgroundColor: getBadgeColor(),
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
        zIndex: 200,
        pointerEvents: 'none',
      }}
    >
      {renderBadgeContent()}
    </div>
  );
};
