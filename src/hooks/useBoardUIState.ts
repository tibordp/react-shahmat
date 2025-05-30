import React, { useState } from 'react';
import { Position, Color } from '../engine/jsChessEngine';

interface Arrow {
  from: Position;
  to: Position;
}

interface PromotionDialogState {
  isOpen: boolean;
  color: Color;
  fromFile: number;
  fromRank: number;
  toFile: number;
  toRank: number;
  isPreMove: boolean;
}

export interface UseBoardUIStateReturn {
  // Selection state
  selectedSquare: Position | null;
  setSelectedSquare: React.Dispatch<React.SetStateAction<Position | null>>;
  validMoves: Position[];
  setValidMoves: React.Dispatch<React.SetStateAction<Position[]>>;

  // Arrow and highlight state
  arrows: Arrow[];
  setArrows: React.Dispatch<React.SetStateAction<Arrow[]>>;
  arrowStart: Position | null;
  setArrowStart: React.Dispatch<React.SetStateAction<Position | null>>;
  highlightedSquares: Position[];
  setHighlightedSquares: React.Dispatch<React.SetStateAction<Position[]>>;

  // Check highlight state
  kingInCheckHighlight: Position | null;
  setKingInCheckHighlight: React.Dispatch<
    React.SetStateAction<Position | null>
  >;

  // Promotion dialog state
  promotionDialog: PromotionDialogState;
  setPromotionDialog: React.Dispatch<
    React.SetStateAction<PromotionDialogState>
  >;

  // Clear functions for convenience
  clearSelection: () => void;
  clearArrowsAndHighlights: () => void;
  clearAll: () => void;
}

export function useBoardUIState(): UseBoardUIStateReturn {
  // Selection state
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);

  // Arrow and highlight state
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [arrowStart, setArrowStart] = useState<Position | null>(null);
  const [highlightedSquares, setHighlightedSquares] = useState<Position[]>([]);

  // Check highlight state
  const [kingInCheckHighlight, setKingInCheckHighlight] =
    useState<Position | null>(null);

  // Promotion dialog state
  const [promotionDialog, setPromotionDialog] = useState<PromotionDialogState>({
    isOpen: false,
    color: Color.White,
    fromFile: 0,
    fromRank: 0,
    toFile: 0,
    toRank: 0,
    isPreMove: false,
  });

  // Clear functions for convenience
  const clearSelection = () => {
    setSelectedSquare(null);
    setValidMoves([]);
  };

  const clearArrowsAndHighlights = () => {
    setArrows([]);
    setHighlightedSquares([]);
  };

  const clearAll = () => {
    clearSelection();
    clearArrowsAndHighlights();
    setArrowStart(null);
    setKingInCheckHighlight(null);
    setPromotionDialog({
      isOpen: false,
      color: Color.White,
      fromFile: 0,
      fromRank: 0,
      toFile: 0,
      toRank: 0,
      isPreMove: false,
    });
  };

  return {
    // Selection state
    selectedSquare,
    setSelectedSquare,
    validMoves,
    setValidMoves,

    // Arrow and highlight state
    arrows,
    setArrows,
    arrowStart,
    setArrowStart,
    highlightedSquares,
    setHighlightedSquares,

    // Check highlight state
    kingInCheckHighlight,
    setKingInCheckHighlight,

    // Promotion dialog state
    promotionDialog,
    setPromotionDialog,

    // Clear functions
    clearSelection,
    clearArrowsAndHighlights,
    clearAll,
  };
}
