import { useState, useCallback, useEffect } from 'react';
import { JSChessEngine, Piece, Position, PieceType, Color, Move, MoveResult, ValidMoveResult } from '../engine/jsChessEngine';

interface ChessEngineAPI {
  getBoardState: () => (Piece | null)[][];
  getCurrentPlayer: () => Color;
  getValidMoves: (from: Position) => Position[];
  getPiece: (position: Position) => Piece | null;
  makeMove: (from: Position, to: Position, promotionPiece?: PieceType) => MoveResult;
  isValidMove: (from: Position, to: Position, promotionPiece?: PieceType) => ValidMoveResult;
  isKingInCheck: (color: Color) => boolean;
  getLastMove: () => Move | null;
  resetGame: () => void;
}

export const useJSChessEngine = (): ChessEngineAPI => {
  const [engine] = useState(() => new JSChessEngine());
  const [, forceUpdate] = useState({});

  const triggerUpdate = useCallback(() => {
    forceUpdate({});
  }, []);

  const getBoardState = useCallback((): (Piece | null)[][] => {
    const state = engine.getBoardState();
    // Transform to display coordinates (rank 7 at top)
    const displayBoard: (Piece | null)[][] = [];
    for (let rank = 7; rank >= 0; rank--) {
      displayBoard.push(state[rank]);
    }
    return displayBoard;
  }, [engine]);

  const getCurrentPlayer = useCallback((): Color => {
    return engine.getCurrentPlayer();
  }, [engine]);

  const getValidMoves = useCallback((from: Position): Position[] => {
    return engine.getValidMoves(from);
  }, [engine]);

  const getPiece = useCallback((position: Position): Piece | null => {
    return engine.getPiece(position);
  }, [engine]);

  const makeMove = useCallback((from: Position, to: Position, promotionPiece?: PieceType): MoveResult => {
    const result = engine.makeMove(from, to, promotionPiece);
    if (result.success) {
      triggerUpdate();
    }
    return result;
  }, [engine, triggerUpdate]);

  const isValidMove = useCallback((from: Position, to: Position, promotionPiece?: PieceType): ValidMoveResult => {
    return engine.isValidMove(from, to, promotionPiece);
  }, [engine]);

  const isKingInCheck = useCallback((color: Color): boolean => {
    return engine.isKingInCheck(color);
  }, [engine]);

  const getLastMove = useCallback((): Move | null => {
    return engine.getLastMove();
  }, [engine]);

  const resetGame = useCallback(() => {
    engine.resetGame();
    triggerUpdate();
  }, [engine, triggerUpdate]);

  // Trigger initial update to ensure React knows about the initial board state
  useEffect(() => {
    triggerUpdate();
  }, [triggerUpdate]);

  return {
    getBoardState,
    getCurrentPlayer,
    getValidMoves,
    getPiece,
    makeMove,
    isValidMove,
    isKingInCheck,
    getLastMove,
    resetGame
  };
};