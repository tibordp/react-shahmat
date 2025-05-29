import { useReducer, useEffect, useCallback } from 'react';
import { Color, Move, PieceType, ChessError, ChessBoardCallbacks } from '../engine/jsChessEngine';

// State machine states
type GameState = 
  | 'idle'
  | 'waitingForHuman'
  | 'waitingForExternal'
  | 'externalThinking'
  | 'animating'
  | 'promotionDialog'
  | 'gameOver';

// State machine actions
type GameAction = 
  | { type: 'GAME_STARTED' }
  | { type: 'HUMAN_MOVE'; move: Move; animate: boolean }
  | { type: 'HUMAN_PROMOTION_MOVE'; move: Move }
  | { type: 'EXTERNAL_MOVE_REQUESTED' }
  | { type: 'EXTERNAL_MOVE_RECEIVED'; move: Move }
  | { type: 'EXTERNAL_ERROR'; error: ChessError }
  | { type: 'ANIMATION_COMPLETE' }
  | { type: 'PROMOTION_SELECTED'; pieceType: PieceType }
  | { type: 'PROMOTION_CANCELLED' }
  | { type: 'GAME_OVER' }
  | { type: 'RESET_GAME' };

interface GameStateMachineState {
  gameState: GameState;
  pendingMove?: Move;
  pendingPromotion?: {
    fromFile: number;
    fromRank: number;
    toFile: number;
    toRank: number;
    color: Color;
  };
  error?: ChessError;
}

interface GameStateMachineConfig {
  chessEngine: any; // ChessEngineAPI
  onWhiteMove?: ChessBoardCallbacks['onWhiteMove'];
  onBlackMove?: ChessBoardCallbacks['onBlackMove'];
  onError?: ChessBoardCallbacks['onError'];
  onGameStateChange?: ChessBoardCallbacks['onGameStateChange'];
}

const initialState: GameStateMachineState = {
  gameState: 'idle',
};

function gameStateMachineReducer(state: GameStateMachineState, action: GameAction): GameStateMachineState {
  switch (state.gameState) {
    case 'idle':
      switch (action.type) {
        case 'GAME_STARTED':
          // Will be determined by effect based on current player
          return { ...state };
        case 'RESET_GAME':
          return initialState;
        default:
          return state;
      }

    case 'waitingForHuman':
      switch (action.type) {
        case 'HUMAN_MOVE':
          if (action.animate) {
            return { 
              ...state, 
              gameState: 'animating',
              pendingMove: action.move 
            };
          } else {
            return { ...state, gameState: 'idle' };
          }
        case 'HUMAN_PROMOTION_MOVE':
          return {
            ...state,
            gameState: 'promotionDialog',
            pendingPromotion: {
              fromFile: action.move.fromFile,
              fromRank: action.move.fromRank,
              toFile: action.move.toFile,
              toRank: action.move.toRank,
              color: Color.White // Will be determined by engine
            }
          };
        case 'GAME_OVER':
          return { ...state, gameState: 'gameOver' };
        case 'RESET_GAME':
          return initialState;
        default:
          return state;
      }

    case 'waitingForExternal':
      switch (action.type) {
        case 'EXTERNAL_MOVE_REQUESTED':
          return { ...state, gameState: 'externalThinking' };
        case 'GAME_OVER':
          return { ...state, gameState: 'gameOver' };
        case 'RESET_GAME':
          return initialState;
        default:
          return state;
      }

    case 'externalThinking':
      switch (action.type) {
        case 'EXTERNAL_MOVE_RECEIVED':
          return { 
            ...state, 
            gameState: 'animating',
            pendingMove: action.move,
            error: undefined
          };
        case 'EXTERNAL_ERROR':
          return { 
            ...state, 
            gameState: 'waitingForExternal',
            error: action.error
          };
        case 'GAME_OVER':
          return { ...state, gameState: 'gameOver' };
        case 'RESET_GAME':
          return initialState;
        default:
          return state;
      }

    case 'animating':
      switch (action.type) {
        case 'ANIMATION_COMPLETE':
          return { 
            ...state, 
            gameState: 'idle',
            pendingMove: undefined
          };
        case 'RESET_GAME':
          return initialState;
        default:
          return state;
      }

    case 'promotionDialog':
      switch (action.type) {
        case 'PROMOTION_SELECTED':
          return { 
            ...state, 
            gameState: 'animating',
            pendingPromotion: undefined
          };
        case 'PROMOTION_CANCELLED':
          return { 
            ...state, 
            gameState: 'waitingForHuman',
            pendingPromotion: undefined
          };
        case 'RESET_GAME':
          return initialState;
        default:
          return state;
      }

    case 'gameOver':
      switch (action.type) {
        case 'RESET_GAME':
          return initialState;
        default:
          return state;
      }

    default:
      return state;
  }
}

export function useGameStateMachine(config: GameStateMachineConfig) {
  const { chessEngine, onWhiteMove, onBlackMove, onError, onGameStateChange } = config;
  const [state, dispatch] = useReducer(gameStateMachineReducer, initialState);

  // Main game loop effect
  useEffect(() => {
    if (!chessEngine) return;

    const chessGameState = chessEngine.getGameState();
    
    // Notify about game state changes
    if (onGameStateChange) {
      onGameStateChange(chessGameState);
    }

    // Handle game over
    if (chessGameState.isGameOver && state.gameState !== 'gameOver') {
      dispatch({ type: 'GAME_OVER' });
      return;
    }

    // Handle state transitions from idle
    if (state.gameState === 'idle') {
      const currentPlayer = chessEngine.getCurrentPlayer();
      const hasCallback = currentPlayer === Color.White ? !!onWhiteMove : !!onBlackMove;
      
      if (hasCallback) {
        dispatch({ type: 'EXTERNAL_MOVE_REQUESTED' });
      } else {
        // Transition to waiting for human, but don't dispatch here to avoid loops
        // The component will handle this transition
      }
    }

    // Handle external move requests
    if (state.gameState === 'externalThinking') {
      const currentPlayer = chessEngine.getCurrentPlayer();
      const callback = currentPlayer === Color.White ? onWhiteMove : onBlackMove;
      
      if (callback) {
        const executeExternalMove = async () => {
          try {
            const opponentMove = chessEngine.getLastMove();
            const move = await callback(chessGameState, opponentMove || undefined);
            
            // Validate the move
            const from = { file: move.fromFile, rank: move.fromRank };
            const to = { file: move.toFile, rank: move.toRank };
            const validationResult = chessEngine.isValidMove(from, to);
            
            if (validationResult.valid) {
              dispatch({ type: 'EXTERNAL_MOVE_RECEIVED', move });
            } else {
              const error: ChessError = {
                type: 'invalid_move',
                player: currentPlayer,
                move,
                message: 'Invalid move returned by external callback'
              };
              dispatch({ type: 'EXTERNAL_ERROR', error });
              onError?.(error);
            }
          } catch (error) {
            const chessError: ChessError = {
              type: 'callback_error',
              player: currentPlayer,
              message: `External callback error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              originalError: error instanceof Error ? error : undefined
            };
            dispatch({ type: 'EXTERNAL_ERROR', error: chessError });
            onError?.(chessError);
          }
        };

        executeExternalMove();
      }
    }
  }, [state, chessEngine, onWhiteMove, onBlackMove, onError, onGameStateChange]);

  // Action creators
  const actions = {
    startGame: useCallback(() => dispatch({ type: 'GAME_STARTED' }), []),
    makeHumanMove: useCallback((move: Move, animate: boolean = false) => 
      dispatch({ type: 'HUMAN_MOVE', move, animate }), []),
    requestPromotion: useCallback((move: Move) => 
      dispatch({ type: 'HUMAN_PROMOTION_MOVE', move }), []),
    selectPromotion: useCallback((pieceType: PieceType) => 
      dispatch({ type: 'PROMOTION_SELECTED', pieceType }), []),
    cancelPromotion: useCallback(() => 
      dispatch({ type: 'PROMOTION_CANCELLED' }), []),
    completeAnimation: useCallback(() => 
      dispatch({ type: 'ANIMATION_COMPLETE' }), []),
    resetGame: useCallback(() => 
      dispatch({ type: 'RESET_GAME' }), []),
  };

  return {
    gameState: state.gameState,
    pendingMove: state.pendingMove,
    pendingPromotion: state.pendingPromotion,
    error: state.error,
    actions,
    
    // Computed properties
    isHumanTurn: state.gameState === 'waitingForHuman',
    isExternalTurn: state.gameState === 'waitingForExternal' || state.gameState === 'externalThinking',
    isAnimating: state.gameState === 'animating',
    isPromotionDialogOpen: state.gameState === 'promotionDialog',
    isGameOver: state.gameState === 'gameOver',
  };
}