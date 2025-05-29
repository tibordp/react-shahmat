import { useState, useCallback, useRef, useEffect } from 'react';
import { Color, Move, ChessError, ChessBoardCallbacks } from '../engine/jsChessEngine';
import { ChessEngineAPI } from './useJSChessEngine';

interface UseChessGameProps {
  chessEngine: ChessEngineAPI;
  onWhiteMove?: ChessBoardCallbacks['onWhiteMove'];
  onBlackMove?: ChessBoardCallbacks['onBlackMove'];
  onError?: ChessBoardCallbacks['onError'];
  onGameStateChange?: ChessBoardCallbacks['onGameStateChange'];
}

export function useChessGame({
  chessEngine,
  onWhiteMove,
  onBlackMove,
  onError,
  onGameStateChange,
}: UseChessGameProps) {
  const [pendingExternalMove, setPendingExternalMove] = useState<Move | null>(null);
  const [preMoves, setPreMoves] = useState<Move[]>([]);
  const isProcessingExternal = useRef(false);
  const lastProcessedTurn = useRef<string>('');

  // Determine if current player is external
  const currentPlayer = chessEngine?.getCurrentPlayer();
  const isCurrentPlayerExternal = currentPlayer === Color.White ? !!onWhiteMove : !!onBlackMove;
  const currentCallback = currentPlayer === Color.White ? onWhiteMove : onBlackMove;
  
  const gameState = chessEngine?.getGameState();
  const isGameOver = gameState?.isGameOver || false;
  
  // Simple state calculation
  const canHumanMove = !isGameOver && !isCurrentPlayerExternal;
  const canMakePreMoves = !isGameOver && isCurrentPlayerExternal;

  // Notify about game state changes
  useEffect(() => {
    if (onGameStateChange && chessEngine) {
      onGameStateChange(chessEngine.getGameState());
    }
  }, [onGameStateChange, chessEngine, currentPlayer]);

  // Handle external player moves with proper turn tracking
  useEffect(() => {
    if (!chessEngine || !currentCallback || isProcessingExternal.current || isGameOver) {
      return;
    }

    if (!isCurrentPlayerExternal) {
      return;
    }

    // Create a unique turn identifier to prevent duplicate processing
    const currentTurnId = `${currentPlayer}-${gameState?.moveHistory?.length || 0}`;
    if (lastProcessedTurn.current === currentTurnId) {
      return;
    }

    lastProcessedTurn.current = currentTurnId;
    isProcessingExternal.current = true;
    
    const executeExternalMove = async () => {
      try {
        const gameState = chessEngine.getGameState();
        const opponentMove = chessEngine.getLastMove();
        const move = await currentCallback(gameState, opponentMove || undefined);
        
        // Validate move
        const from = { file: move.fromFile, rank: move.fromRank };
        const to = { file: move.toFile, rank: move.toRank };
        const validationResult = chessEngine.isValidMove(from, to, move.promotionPiece);
        
        if (validationResult.valid) {
          // Set the pending external move for ChessBoard to animate
          setPendingExternalMove(move);
        } else {
          const error: ChessError = {
            type: 'invalid_move',
            player: currentPlayer!,
            move,
            message: 'Invalid move from external player'
          };
          onError?.(error);
        }
      } catch (error) {
        const chessError: ChessError = {
          type: 'callback_error',
          player: currentPlayer!,
          message: `External player error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          originalError: error instanceof Error ? error : undefined
        };
        onError?.(chessError);
      } finally {
        isProcessingExternal.current = false;
      }
    };

    executeExternalMove();
  }, [chessEngine, currentCallback, currentPlayer, isCurrentPlayerExternal, isGameOver, onError, gameState?.moveHistory?.length]);

  // Simple move execution - no animation handling
  const makeMove = useCallback((move: Move) => {
    if (!chessEngine) return false;

    const from = { file: move.fromFile, rank: move.fromRank };
    const to = { file: move.toFile, rank: move.toRank };
    const result = chessEngine.makeMove(from, to, move.promotionPiece);
    
    return result.success;
  }, [chessEngine]);

  // Clear pending external move after it's been handled
  const clearPendingExternalMove = useCallback(() => {
    setPendingExternalMove(null);
    isProcessingExternal.current = false;
  }, []);

  // Game control functions
  const resetGame = useCallback(() => {
    chessEngine?.resetGame();
    setPendingExternalMove(null);
    isProcessingExternal.current = false;
    lastProcessedTurn.current = '';
  }, [chessEngine]);

  const setPosition = useCallback((fen: string) => {
    const success = chessEngine?.setPosition(fen);
    if (success) {
      setPendingExternalMove(null);
      setPreMoves([]);
      isProcessingExternal.current = false;
      lastProcessedTurn.current = '';
    }
    return success || false;
  }, [chessEngine]);

  // Pre-move management
  const addPreMove = useCallback((move: Move) => {
    setPreMoves(prev => [...prev, move]);
  }, []);

  const clearPreMoves = useCallback(() => {
    setPreMoves([]);
  }, []);

  const validateAndExecutePreMoves = useCallback(() => {
    if (preMoves.length === 0 || !chessEngine) return;

    // Validate each pre-move in sequence on a simulated board state
    let currentBoardState = chessEngine;
    const validPreMoves: Move[] = [];

    for (const preMove of preMoves) {
      const from = { file: preMove.fromFile, rank: preMove.fromRank };
      const to = { file: preMove.toFile, rank: preMove.toRank };
      
      const validation = currentBoardState.isValidMove(from, to, preMove.promotionPiece);
      if (!validation.valid) {
        // If any pre-move is invalid, clear all and stop
        setPreMoves([]);
        return;
      }
      
      validPreMoves.push(preMove);
      // For now, just validate the first move - full simulation would require board cloning
      break;
    }

    // Execute the first valid pre-move
    if (validPreMoves.length > 0) {
      const firstMove = validPreMoves[0];
      const result = makeMove(firstMove);
      
      if (result) {
        // Remove the executed move and keep remaining pre-moves
        setPreMoves(prev => prev.slice(1));
      } else {
        // If execution failed, clear all pre-moves
        setPreMoves([]);
      }
    }
  }, [preMoves, chessEngine, makeMove]);

  // Execute pre-moves when it becomes human's turn
  useEffect(() => {
    if (canHumanMove && preMoves.length > 0) {
      validateAndExecutePreMoves();
    }
  }, [canHumanMove, preMoves.length, validateAndExecutePreMoves]);

  return {
    // State
    canHumanMove,
    canMakePreMoves,
    isExternalTurn: !isGameOver && isCurrentPlayerExternal,
    pendingExternalMove,
    preMoves,
    
    // Actions
    makeMove,
    addPreMove,
    clearPreMoves,
    clearPendingExternalMove,
    resetGame,
    setPosition,
    
    // Engine access
    chessEngine,
  };
}