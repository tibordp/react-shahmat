import { useState, useCallback, useEffect } from 'react';
import { JSChessEngine, Piece, Position, PieceType, Color, Move } from '../engine/jsChessEngine';

interface ChessEngineAPI {
  getBoardState: () => (Piece | null)[][];
  getCurrentPlayer: () => Color;
  getValidMoves: (file: number, rank: number) => Position[];
  getPiece: (file: number, rank: number) => Piece | null;
  makeMove: (fromFile: number, fromRank: number, toFile: number, toRank: number, promotionPiece?: PieceType) => boolean;
  isPawnPromotion: (fromFile: number, fromRank: number, toFile: number, toRank: number) => boolean;
  isKingInCheck: (color: Color) => boolean;
  isCastlingMove: (fromFile: number, fromRank: number, toFile: number, toRank: number) => boolean;
  getCastlingRookMove: (fromFile: number, fromRank: number, toFile: number, toRank: number) => { fromFile: number; fromRank: number; toFile: number; toRank: number } | null;
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

  const getValidMoves = useCallback((file: number, rank: number): Position[] => {
    return engine.getValidMoves(file, rank);
  }, [engine]);

  const getPiece = useCallback((file: number, rank: number): Piece | null => {
    return engine.getPiece(file, rank);
  }, [engine]);

  const makeMove = useCallback((fromFile: number, fromRank: number, toFile: number, toRank: number, promotionPiece?: PieceType): boolean => {
    const success = engine.makeMove(fromFile, fromRank, toFile, toRank, promotionPiece);
    if (success) {
      triggerUpdate();
    }
    return success;
  }, [engine, triggerUpdate]);

  const isPawnPromotion = useCallback((fromFile: number, fromRank: number, toFile: number, toRank: number): boolean => {
    return engine.isPawnPromotion(fromFile, fromRank, toFile, toRank);
  }, [engine]);

  const isKingInCheck = useCallback((color: Color): boolean => {
    return engine.isKingInCheck(color);
  }, [engine]);

  const isCastlingMove = useCallback((fromFile: number, fromRank: number, toFile: number, toRank: number): boolean => {
    return engine.isCastlingMove(fromFile, fromRank, toFile, toRank);
  }, [engine]);

  const getCastlingRookMove = useCallback((fromFile: number, fromRank: number, toFile: number, toRank: number) => {
    return engine.getCastlingRookMove(fromFile, fromRank, toFile, toRank);
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
    isPawnPromotion,
    isKingInCheck,
    isCastlingMove,
    getCastlingRookMove,
    getLastMove,
    resetGame
  };
};