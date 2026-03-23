import { useState, useCallback } from 'react';
import { Position, Color } from '../engine/chessRules';
import { BoardMove } from '../types';

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

  // Premove state
  premoves: BoardMove[];
  addPremove: (move: BoardMove) => void;
  clearPremoves: () => void;
  shiftPremove: () => void;

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

  // Premove state
  const [premoves, setPremoves] = useState<BoardMove[]>([]);

  const addPremove = useCallback((move: BoardMove) => {
    setPremoves(prev => [...prev, move]);
  }, []);

  const clearPremoves = useCallback(() => {
    setPremoves([]);
    // Also close the promotion dialog if it was opened for a premove
    setPromotionDialog(prev =>
      prev.isOpen && prev.isPreMove ? { ...prev, isOpen: false } : prev
    );
  }, []);

  const shiftPremove = useCallback(() => {
    setPremoves(prev => prev.slice(1));
  }, []);

  // Clear functions for convenience
  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setValidMoves([]);
  }, []);

  const clearArrowsAndHighlights = useCallback(() => {
    setArrows([]);
    setHighlightedSquares([]);
  }, []);

  const clearAll = useCallback(() => {
    setSelectedSquare(null);
    setValidMoves([]);
    setArrows([]);
    setHighlightedSquares([]);
    setArrowStart(null);
    setKingInCheckHighlight(null);
    setPremoves([]);
    setPromotionDialog({
      isOpen: false,
      color: Color.White,
      fromFile: 0,
      fromRank: 0,
      toFile: 0,
      toRank: 0,
      isPreMove: false,
    });
  }, []);

  return {
    selectedSquare,
    setSelectedSquare,
    validMoves,
    setValidMoves,
    arrows,
    setArrows,
    arrowStart,
    setArrowStart,
    highlightedSquares,
    setHighlightedSquares,
    kingInCheckHighlight,
    setKingInCheckHighlight,
    promotionDialog,
    setPromotionDialog,
    premoves,
    addPremove,
    clearPremoves,
    shiftPremove,
    clearSelection,
    clearArrowsAndHighlights,
    clearAll,
  };
}
