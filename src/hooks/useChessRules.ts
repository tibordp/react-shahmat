import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ChessRules,
  Piece,
  Position,
  PieceType,
  Color,
  Move,
  MoveResult,
  ValidMoveResult,
  GameState,
  HistoryEntry,
} from '../engine/chessRules';

export interface ChessRulesAPI {
  getBoardState: () => (Piece | null)[][];
  getCurrentPlayer: () => Color;
  getValidMoves: (from: Position) => Position[];
  getPotentialMoves: (
    from: Position,
    options?: {
      ignorePieceBlocking?: boolean;
      includeIllegalMoves?: boolean;
      forPreMove?: boolean;
      forAnyColor?: boolean;
      boardState?: (Piece | null)[][];
    }
  ) => Position[];
  getPiece: (position: Position) => Piece | null;
  makeMove: (
    from: Position,
    to: Position,
    promotionPiece?: PieceType
  ) => MoveResult;
  isValidMove: (
    from: Position,
    to: Position,
    promotionPiece?: PieceType
  ) => ValidMoveResult;
  isKingInCheck: (color: Color) => boolean;
  getLastMove: () => Move | null;
  getGameState: () => GameState;
  setPosition: (fen: string) => boolean;
  resetGame: () => void;
  getHistory: () => HistoryEntry[];
  getFenHistory: () => string[];
  undoToFen: (fen: string, plyCount: number) => boolean;
  parseSAN: (san: string) => Move | null;
}

export const useChessRules = (): ChessRulesAPI => {
  const [engine] = useState(() => new ChessRules());
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

  const getValidMoves = useCallback(
    (from: Position): Position[] => {
      return engine.getValidMoves(from);
    },
    [engine]
  );

  const getPotentialMoves = useCallback(
    (
      from: Position,
      options: {
        ignorePieceBlocking?: boolean;
        includeIllegalMoves?: boolean;
        forPreMove?: boolean;
        forAnyColor?: boolean;
      } = {}
    ): Position[] => {
      return engine.getPotentialMoves(from, options);
    },
    [engine]
  );

  const getPiece = useCallback(
    (position: Position): Piece | null => {
      return engine.getPiece(position);
    },
    [engine]
  );

  const makeMove = useCallback(
    (from: Position, to: Position, promotionPiece?: PieceType): MoveResult => {
      const result = engine.makeMove(from, to, promotionPiece);
      if (result.success) {
        triggerUpdate();
      }
      return result;
    },
    [engine, triggerUpdate]
  );

  const isValidMove = useCallback(
    (
      from: Position,
      to: Position,
      promotionPiece?: PieceType
    ): ValidMoveResult => {
      return engine.isValidMove(from, to, promotionPiece);
    },
    [engine]
  );

  const isKingInCheck = useCallback(
    (color: Color): boolean => {
      return engine.isKingInCheck(color);
    },
    [engine]
  );

  const getLastMove = useCallback((): Move | null => {
    return engine.getLastMove();
  }, [engine]);

  const resetGame = useCallback(() => {
    engine.resetGame();
    triggerUpdate();
  }, [engine, triggerUpdate]);

  const getGameState = useCallback((): GameState => {
    return engine.getGameState();
  }, [engine]);

  const setPosition = useCallback(
    (fen: string): boolean => {
      const success = engine.setPosition(fen);
      if (success) {
        triggerUpdate();
      }
      return success;
    },
    [engine, triggerUpdate]
  );

  const getHistory = useCallback((): HistoryEntry[] => {
    return engine.getHistory();
  }, [engine]);

  const getFenHistory = useCallback((): string[] => {
    return engine.getFenHistory();
  }, [engine]);

  const undoToFen = useCallback(
    (fen: string, plyCount: number): boolean => {
      const success = engine.undoToFen(fen, plyCount);
      if (success) {
        triggerUpdate();
      }
      return success;
    },
    [engine, triggerUpdate]
  );

  const parseSAN = useCallback(
    (san: string): Move | null => {
      return engine.parseSAN(san);
    },
    [engine]
  );

  // Trigger initial update to ensure React knows about the initial board state
  useEffect(() => {
    triggerUpdate();
  }, [triggerUpdate]);

  return useMemo(
    () => ({
      getBoardState,
      getCurrentPlayer,
      getValidMoves,
      getPotentialMoves,
      getPiece,
      makeMove,
      isValidMove,
      isKingInCheck,
      getLastMove,
      getGameState,
      setPosition,
      resetGame,
      getHistory,
      getFenHistory,
      undoToFen,
      parseSAN,
    }),
    [
      getBoardState,
      getCurrentPlayer,
      getValidMoves,
      getPotentialMoves,
      getPiece,
      makeMove,
      isValidMove,
      isKingInCheck,
      getLastMove,
      getGameState,
      setPosition,
      resetGame,
      getHistory,
      getFenHistory,
      undoToFen,
      parseSAN,
    ]
  );
};
