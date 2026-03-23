import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { PieceType, GameState, GameResult } from '../engine/chessRules';
import { ChessRulesAPI } from './useChessRules';
import { useChessRules } from './useChessRules';
import { soundManager, SoundManager } from '../utils/soundManager';
import {
  BoardMove,
  PlayerColor,
  ValidMovesMap,
  GameEndOverlay,
  MoveSound,
  GameHistoryEntry,
  colorToPlayerColor,
  moveToBoardMove,
  pieceTypeToPromotionPiece,
  positionToSquare,
  boardMoveToInternal,
  buildValidMovesMap,
  ChessError,
} from '../types';
import type { ChessBoardProps } from '../components/ChessBoard';

export interface UseChessGameOptions {
  /** Starting position as FEN. Default: standard starting position */
  initialFen?: string;
  /** Whether white pieces are interactive. Default: true */
  whiteMovable?: boolean;
  /** Whether black pieces are interactive. Default: true */
  blackMovable?: boolean;
  /** Enable sound effects. Default: true */
  enableSounds?: boolean;
  /** Custom SoundManager instance (for custom audio sprites). Default: built-in sounds. */
  soundManager?: SoundManager;
  /** Custom sound handler. Overrides soundManager entirely. */
  onSound?: (sound: MoveSound) => void;
  /** Automatic draw rules. Set individual rules to false to disable.
   *  Default: { repetition: 5, moveRule: 75, insufficientMaterial: true } */
  drawRules?: {
    /** Number of position repetitions for automatic draw. Default: 5 (fivefold). false to disable. */
    repetition?: number | false;
    /** Number of moves without capture or pawn move for automatic draw. Default: 75. false to disable. */
    moveRule?: number | false;
    /** Automatically draw when neither side can checkmate. Default: true. */
    insufficientMaterial?: boolean;
  };
  /** Called when the position changes */
  onPositionChange?: (gameState: GameState, lastMove?: BoardMove) => void;
  /** Called on errors */
  onError?: (error: ChessError) => void;
}

export interface UseChessGameReturn {
  /** Props to spread onto <ChessBoard /> */
  boardProps: Pick<
    ChessBoardProps,
    | 'position'
    | 'turnColor'
    | 'lastMove'
    | 'check'
    | 'validMoves'
    | 'gameEndOverlay'
    | 'whiteMovable'
    | 'blackMovable'
    | 'onMove'
    | 'onPlaySound'
  >;
  /** Execute a move (for AI/server moves). Returns true if successful. */
  makeMove: (move: BoardMove) => boolean;
  /** Reset to starting position */
  resetGame: () => void;
  /** Load a position from FEN string */
  setPosition: (fen: string) => boolean;
  /** Get the current game state */
  getGameState: () => GameState;
  /** Full move history with piece/capture/check info and algebraic notation */
  history: GameHistoryEntry[];
  /** Roll back to a specific ply (0 = initial position). No arg = undo last move. */
  undo: (toPly?: number) => boolean;
  /** End the game manually (resignation, draw agreement, timeout/flag) */
  endGame: (result: GameResult) => void;
  /** Export the game as a PGN string */
  toPGN: (headers?: Record<string, string>) => string;
  /** Load a game from a PGN string. Returns true if successful. */
  loadPGN: (pgn: string) => boolean;
  /** Direct access to the chess rules API */
  rules: ChessRulesAPI;
}

export function useChessGame(
  options: UseChessGameOptions = {}
): UseChessGameReturn {
  const {
    initialFen,
    whiteMovable = true,
    blackMovable = true,
    enableSounds = true,
    soundManager: customSoundManager,
    onSound,
    drawRules,
    onPositionChange,
    onError,
  } = options;

  const repetitionThreshold = drawRules?.repetition ?? 5;
  const moveRuleThreshold = drawRules?.moveRule ?? 75;
  const checkInsufficientMaterial = drawRules?.insufficientMaterial ?? true;

  const sm = customSoundManager || soundManager;

  // Unified sound dispatcher
  const playSound = useCallback(
    (sound: MoveSound) => {
      if (!enableSounds) return;
      if (onSound) {
        onSound(sound);
        return;
      }
      sm.ensureReady();
      switch (sound) {
        case 'move':
          sm.playMove();
          break;
        case 'capture':
          sm.playCapture();
          break;
        case 'check':
          sm.playCheck();
          break;
        case 'checkmate':
          sm.playCheckmate();
          break;
        case 'promotion':
          sm.playPromotion();
          break;
        case 'draw':
          sm.playDraw();
          break;
        case 'premove':
          sm.playPreMove();
          break;
        case 'error':
          sm.playError();
          break;
        case 'gamestart':
          sm.playGameStart();
          break;
      }
    },
    [enableSounds, onSound, sm]
  );

  const chessEngine = useChessRules();

  // Track last move for highlighting and animation
  const [lastMove, setLastMove] = useState<BoardMove | undefined>(undefined);
  // Manual game result (resignation, draw agreement, flag, auto-draw)
  const [manualGameResult, setManualGameResult] = useState<GameResult | null>(
    null
  );
  const manualGameResultRef = useRef(manualGameResult);
  manualGameResultRef.current = manualGameResult;
  // Force re-render counter (engine is mutable)
  const [, setRenderCount] = useState(0);

  const forceUpdate = useCallback(() => setRenderCount(c => c + 1), []);

  // Initialize with custom FEN if provided
  const initialFenRef = useRef(initialFen);
  useEffect(() => {
    if (initialFenRef.current) {
      chessEngine.setPosition(initialFenRef.current);
      forceUpdate();
    }
  }, [chessEngine, forceUpdate]);

  // Compute derived state from engine
  const gameState = chessEngine.getGameState();
  const turnColor: PlayerColor = colorToPlayerColor(
    chessEngine.getCurrentPlayer()
  );

  // Is it a human-movable turn?
  const isHumanTurn = turnColor === 'white' ? whiteMovable : blackMovable;

  const checkSquare = useMemo((): string | undefined => {
    if (!gameState.isCheck) return undefined;
    const board = chessEngine.getBoardState();
    const currentPlayer = chessEngine.getCurrentPlayer();
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank]?.[file];
        if (piece?.type === PieceType.King && piece.color === currentPlayer) {
          return positionToSquare({ file, rank: 7 - rank });
        }
      }
    }
    return undefined;
  }, [gameState.isCheck, chessEngine]);

  const isGameOver = gameState.isGameOver || !!manualGameResult;
  const effectiveResult = manualGameResult || gameState.result;

  // Only provide valid moves when it's a human-movable turn and game isn't over
  const validMoves = useMemo((): ValidMovesMap => {
    if (isGameOver || !isHumanTurn) return new Map();
    return buildValidMovesMap(gameState);
  }, [gameState, isHumanTurn, isGameOver]);

  const gameEndOverlay = useMemo((): GameEndOverlay | undefined => {
    if (!isGameOver || !effectiveResult) return undefined;
    if (
      effectiveResult.reason === 'checkmate' &&
      effectiveResult.winner !== undefined
    ) {
      return {
        type: 'checkmate',
        winner: colorToPlayerColor(effectiveResult.winner),
      };
    } else if (effectiveResult.reason === 'stalemate') {
      return { type: 'stalemate' };
    } else if (
      effectiveResult.reason === 'resignation' &&
      effectiveResult.winner !== undefined
    ) {
      return {
        type: 'checkmate',
        winner: colorToPlayerColor(effectiveResult.winner),
      };
    } else {
      return { type: 'draw' };
    }
  }, [isGameOver, effectiveResult]);

  // Determine what sound(s) to play for a move result
  const playSoundForMove = useCallback(
    (moveResult: { type?: string; capturedPiece?: unknown }) => {
      const state = chessEngine.getGameState();

      if (moveResult.type === 'promotion') {
        playSound('promotion');
      } else if (moveResult.capturedPiece) {
        playSound('capture');
      } else {
        playSound('move');
      }

      if (state.isGameOver && state.result) {
        playSound(state.result.reason === 'checkmate' ? 'checkmate' : 'draw');
      } else if (state.isCheck) {
        playSound('check');
      }
    },
    [chessEngine, playSound]
  );

  // Notify position change
  const notifyPositionChange = useCallback(
    (move?: BoardMove) => {
      if (onPositionChange) {
        onPositionChange(chessEngine.getGameState(), move);
      }
    },
    [onPositionChange, chessEngine]
  );

  // Initial notification
  const hasNotifiedInitial = useRef(false);
  useEffect(() => {
    if (!hasNotifiedInitial.current) {
      hasNotifiedInitial.current = true;
      if (enableSounds && !onSound) sm.ensureReady();
      notifyPositionChange();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally runs once on mount
  }, [notifyPositionChange]);

  // Execute a move internally
  const executeMoveInternal = useCallback(
    (boardMove: BoardMove): boolean => {
      // Refuse moves if the game is already over (manual result or engine)
      if (manualGameResultRef.current) return false;

      const internalMove = boardMoveToInternal(boardMove);
      const from = { file: internalMove.fromFile, rank: internalMove.fromRank };
      const to = { file: internalMove.toFile, rank: internalMove.toRank };

      const result = chessEngine.makeMove(
        from,
        to,
        internalMove.promotionPiece
      );

      if (result.success) {
        setLastMove(boardMove);
        forceUpdate();
        playSoundForMove(result);
        notifyPositionChange(boardMove);

        // Check for automatic draw conditions (only if the game isn't already over)
        const state = chessEngine.getGameState();
        if (!state.isGameOver) {
          if (checkInsufficientMaterial && state.insufficientMaterial) {
            setManualGameResult({ reason: 'insufficient_material' });
            playSound('draw');
          } else if (
            repetitionThreshold !== false &&
            state.repetitionCount >= repetitionThreshold
          ) {
            setManualGameResult({ reason: 'repetition' });
            playSound('draw');
          } else if (
            moveRuleThreshold !== false &&
            state.halfmoveClock >= moveRuleThreshold * 2
          ) {
            setManualGameResult({ reason: 'fifty_moves' });
            playSound('draw');
          }
        }

        return true;
      } else {
        if (result.promotionRequired) {
          return false;
        }
        if (onError) {
          onError({
            type: 'invalid_move',
            player: chessEngine.getCurrentPlayer(),
            move: internalMove,
            message: 'Invalid move',
          });
        }
        return false;
      }
    },
    [
      chessEngine,
      forceUpdate,
      playSoundForMove,
      playSound,
      notifyPositionChange,
      onError,
      checkInsufficientMaterial,
      repetitionThreshold,
      moveRuleThreshold,
    ]
  );

  // onMove handler for the board (human moves)
  const handleBoardMove = useCallback(
    (move: BoardMove) => {
      executeMoveInternal(move);
    },
    [executeMoveInternal]
  );

  // onPlaySound handler for the board — delegates to unified playSound
  const handlePlaySound = playSound;
  // Public API: make a move (for AI/server)
  const makeMove = useCallback(
    (move: BoardMove): boolean => {
      return executeMoveInternal(move);
    },
    [executeMoveInternal]
  );

  // Public API: reset game
  const resetGame = useCallback(() => {
    chessEngine.resetGame();
    setLastMove(undefined);
    setManualGameResult(null);
    forceUpdate();
    notifyPositionChange();
  }, [chessEngine, forceUpdate, notifyPositionChange]);

  // Public API: set position
  const setPosition = useCallback(
    (fen: string): boolean => {
      const success = chessEngine.setPosition(fen);
      if (success) {
        setLastMove(undefined);
        setManualGameResult(null);
        forceUpdate();
        notifyPositionChange();
      }
      return success;
    },
    [chessEngine, forceUpdate, notifyPositionChange]
  );

  // Public API: end the game manually (resignation, draw agreement, flag)
  const endGame = useCallback(
    (result: GameResult) => {
      setManualGameResult(result);
      playSound(
        result.reason === 'resignation' || result.reason === 'checkmate'
          ? 'checkmate'
          : 'draw'
      );
      forceUpdate();
      notifyPositionChange();
    },
    [playSound, forceUpdate, notifyPositionChange]
  );

  // Public API: get game state
  const getGameState = useCallback(
    (): GameState => chessEngine.getGameState(),
    [chessEngine]
  );

  // Public API: history
  const history = useMemo((): GameHistoryEntry[] => {
    return chessEngine.getHistory().map(entry => ({
      move: moveToBoardMove(entry.move),
      piece: { ...entry.piece },
      moveType: entry.moveType,
      capturedPiece: entry.capturedPiece
        ? { ...entry.capturedPiece }
        : undefined,
      promotionPiece:
        entry.promotionPiece !== undefined
          ? pieceTypeToPromotionPiece(entry.promotionPiece)
          : undefined,
      fen: entry.fen,
      isCheck: entry.isCheck,
      isCheckmate: entry.isCheckmate,
      algebraic: entry.algebraic,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- gameState is intentional: triggers recomputation when engine state changes (engine is mutable)
  }, [chessEngine, gameState]);

  // Public API: undo to a specific ply
  const undo = useCallback(
    (toPly?: number): boolean => {
      const fenHist = chessEngine.getFenHistory();
      const targetPly = toPly ?? fenHist.length - 2; // default: undo last move
      if (targetPly < 0 || targetPly >= fenHist.length) return false;

      const targetFen = fenHist[targetPly];
      const success = chessEngine.undoToFen(targetFen, targetPly);
      if (success) {
        setManualGameResult(null);
        if (targetPly > 0) {
          const prevHistory = chessEngine.getHistory();
          const lastEntry = prevHistory[prevHistory.length - 1];
          setLastMove(lastEntry ? moveToBoardMove(lastEntry.move) : undefined);
        } else {
          setLastMove(undefined);
        }
        forceUpdate();
        notifyPositionChange();
      }
      return success;
    },
    [chessEngine, forceUpdate, notifyPositionChange]
  );

  // Public API: export as PGN
  const toPGN = useCallback(
    (headers?: Record<string, string>): string => {
      const h = {
        Event: '?',
        Site: '?',
        Date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
        Round: '?',
        White: '?',
        Black: '?',
        Result: '*',
        ...headers,
      };

      const state = chessEngine.getGameState();
      if (state.isGameOver && state.result) {
        if (state.result.reason === 'checkmate') {
          h.Result = state.result.winner === 0 ? '1-0' : '0-1';
        } else if (state.result.reason === 'stalemate') {
          h.Result = '1/2-1/2';
        }
      }
      if (manualGameResultRef.current) {
        const r = manualGameResultRef.current;
        if (r.reason === 'resignation' && r.winner !== undefined) {
          h.Result = r.winner === 0 ? '1-0' : '0-1';
        } else if (r.reason === 'draw' || r.reason === 'stalemate' ||
                   r.reason === 'repetition' || r.reason === 'fifty_moves' ||
                   r.reason === 'insufficient_material') {
          h.Result = '1/2-1/2';
        }
      }

      const headerStr = Object.entries(h)
        .map(([k, v]) => `[${k} "${v}"]`)
        .join('\n');

      const entries = chessEngine.getHistory();
      let moveText = '';
      for (let i = 0; i < entries.length; i++) {
        if (i % 2 === 0) moveText += `${Math.floor(i / 2) + 1}. `;
        moveText += entries[i].algebraic + ' ';
      }
      moveText += h.Result;

      return headerStr + '\n\n' + moveText.trim();
    },
    [chessEngine]
  );

  // Public API: load from PGN
  const loadPGN = useCallback(
    (pgn: string): boolean => {
      // Strip headers
      const lines = pgn.split('\n');
      const moveLines = lines.filter(l => !l.startsWith('[') && l.trim() !== '');
      const moveText = moveLines.join(' ');

      // Extract individual moves (strip move numbers, results, comments)
      const tokens = moveText
        .replace(/\{[^}]*\}/g, '') // remove comments
        .replace(/\([^)]*\)/g, '') // remove variations
        .split(/\s+/)
        .filter(t =>
          t &&
          !t.match(/^\d+\.+$/) && // move numbers
          t !== '1-0' && t !== '0-1' && t !== '1/2-1/2' && t !== '*'
        );

      // Reset and replay
      chessEngine.resetGame();

      for (const token of tokens) {
        const move = chessEngine.parseSAN(token);
        if (!move) {
          // Parse failed — reset and return false
          chessEngine.resetGame();
          setLastMove(undefined);
          setManualGameResult(null);
          forceUpdate();
          return false;
        }
        const result = chessEngine.makeMove(
          { file: move.fromFile, rank: move.fromRank },
          { file: move.toFile, rank: move.toRank },
          move.promotionPiece
        );
        if (!result.success) {
          chessEngine.resetGame();
          setLastMove(undefined);
          setManualGameResult(null);
          forceUpdate();
          return false;
        }
      }

      // Update state to reflect loaded game
      const hist = chessEngine.getHistory();
      if (hist.length > 0) {
        const last = hist[hist.length - 1];
        setLastMove(moveToBoardMove(last.move));
      } else {
        setLastMove(undefined);
      }
      setManualGameResult(null);
      forceUpdate();
      notifyPositionChange();
      return true;
    },
    [chessEngine, forceUpdate, notifyPositionChange]
  );

  const boardProps = useMemo(
    () => ({
      position: gameState.fen,
      turnColor,
      lastMove,
      check: checkSquare,
      validMoves,
      gameEndOverlay,
      whiteMovable,
      blackMovable,
      onMove: handleBoardMove,
      onPlaySound: handlePlaySound,
    }),
    [
      gameState.fen,
      turnColor,
      lastMove,
      checkSquare,
      validMoves,
      gameEndOverlay,
      whiteMovable,
      blackMovable,
      handleBoardMove,
      handlePlaySound,
    ]
  );

  return {
    boardProps,
    makeMove,
    resetGame,
    setPosition,
    getGameState,
    history,
    undo,
    endGame,
    toPGN,
    loadPGN,
    rules: chessEngine,
  };
}
