import React from 'react';
import { Position } from '../engine/jsChessEngine';

interface ArrowComponentProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isKnightMove: boolean;
  squareSize: number;
}

const ArrowComponent: React.FC<ArrowComponentProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  isKnightMove,
  squareSize,
}) => {
  const arrowHeadSize = Math.max(15, squareSize * 0.4);
  const strokeWidth = Math.max(8, squareSize * 0.2);
  const color = 'rgba(0, 200, 0, 0.5)';
  const markerId = `arrowhead-${Math.random().toString(36).substr(2, 9)}`;
  const shortenAmount = arrowHeadSize * 0.75;
  const edgeOffset = squareSize * 0.35; // 10% from edge towards center

  // Common marker definition
  const marker = (
    <marker
      id={markerId}
      markerWidth={2}
      markerHeight={3}
      refX={0}
      refY={1.2}
      orient='auto'
      markerUnits='strokeWidth'
    >
      <polygon points={`0,0 0,2.4, 1.5,1.2`} fill={color} />
    </marker>
  );

  let pathElement;

  if (isKnightMove) {
    // Create a right-angled path for knight moves (long leg first, then short leg)
    const deltaFile = Math.abs(toX - fromX);
    const deltaRank = Math.abs(toY - fromY);
    const isHorizontalLonger = deltaFile > deltaRank;

    let cornerX, cornerY;
    if (isHorizontalLonger) {
      cornerX = toX;
      cornerY = fromY;
    } else {
      cornerX = fromX;
      cornerY = toY;
    }

    // Adjust start point
    let adjustedFromX = fromX;
    let adjustedFromY = fromY;
    if (isHorizontalLonger) {
      adjustedFromX = fromX > cornerX ? fromX - edgeOffset : fromX + edgeOffset;
    } else {
      adjustedFromY = fromY > cornerY ? fromY - edgeOffset : fromY + edgeOffset;
    }

    // Adjust end point
    let adjustedToX = toX;
    let adjustedToY = toY;
    if (isHorizontalLonger) {
      adjustedToY = toY > cornerY ? toY - shortenAmount : toY + shortenAmount;
    } else {
      adjustedToX = toX > cornerX ? toX - shortenAmount : toX + shortenAmount;
    }

    pathElement = (
      <path
        d={`M ${adjustedFromX} ${adjustedFromY} L ${cornerX} ${cornerY} L ${adjustedToX} ${adjustedToY}`}
        stroke={color}
        strokeWidth={strokeWidth}
        fill='none'
        strokeLinecap='butt'
        strokeLinejoin='miter'
        markerEnd={`url(#${markerId})`}
      />
    );
  } else {
    // Straight arrow
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.sqrt(dx * dx + dy * dy);

    const adjustedFromX = fromX + (dx / length) * edgeOffset;
    const adjustedFromY = fromY + (dy / length) * edgeOffset;
    const adjustedToX = toX - (dx / length) * shortenAmount;
    const adjustedToY = toY - (dy / length) * shortenAmount;

    pathElement = (
      <line
        x1={adjustedFromX}
        y1={adjustedFromY}
        x2={adjustedToX}
        y2={adjustedToY}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='butt'
        markerEnd={`url(#${markerId})`}
      />
    );
  }

  return (
    <g>
      <defs>{marker}</defs>
      {pathElement}
    </g>
  );
};

export interface ArrowOverlayProps {
  arrows: Array<{ from: Position; to: Position }>;
  boardSize: number;
  squareSize: number;
  flipped?: boolean;
}

export const ArrowOverlay: React.FC<ArrowOverlayProps> = ({
  arrows,
  boardSize,
  squareSize,
  flipped = false,
}) => {
  return (
    <svg
      className='arrow-overlay'
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: boardSize,
        height: boardSize,
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      {arrows.map((arrow, index) => {
        const fromX =
          (flipped ? 7 - arrow.from.file : arrow.from.file) * squareSize +
          squareSize / 2;
        const fromY =
          (flipped ? arrow.from.rank : 7 - arrow.from.rank) * squareSize +
          squareSize / 2;
        const toX =
          (flipped ? 7 - arrow.to.file : arrow.to.file) * squareSize +
          squareSize / 2;
        const toY =
          (flipped ? arrow.to.rank : 7 - arrow.to.rank) * squareSize +
          squareSize / 2;

        // Check if this is a knight move
        const deltaFile = Math.abs(arrow.to.file - arrow.from.file);
        const deltaRank = Math.abs(arrow.to.rank - arrow.from.rank);
        const isKnightMove =
          (deltaFile === 2 && deltaRank === 1) ||
          (deltaFile === 1 && deltaRank === 2);

        return (
          <ArrowComponent
            key={`arrow-${index}`}
            fromX={fromX}
            fromY={fromY}
            toX={toX}
            toY={toY}
            isKnightMove={isKnightMove}
            squareSize={squareSize}
          />
        );
      })}
    </svg>
  );
};
