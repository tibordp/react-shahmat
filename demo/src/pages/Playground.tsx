import React from 'react';
import './Playground.css';
import {
  ChessBoard,
  useChessGame,
  moveToBoardMove,
  toFigurine,
  Color,
} from 'react-shahmat';
import type {
  GameState,
  BoardMove,
  ChessError,
  PromotionPiece,
  GameHistoryEntry,
} from 'react-shahmat';
import { useStockfish } from '../hooks/useStockfish';
import type { AiMode } from '../hooks/useStockfish';

// ============================================================================
// Constants
// ============================================================================

const BOARD_THEMES = {
  green: { light: '#eeeed2', dark: '#769656', name: 'Green (Chess.com)' },
  brown: { light: '#f0d9b5', dark: '#b58863', name: 'Brown (Lichess)' },
  blue: { light: '#dee3e6', dark: '#8ca2ad', name: 'Blue' },
  purple: { light: '#e8d0ff', dark: '#9b72cf', name: 'Purple' },
  red: { light: '#f0d0d0', dark: '#c25050', name: 'Red' },
} as const;

type ThemeKey = keyof typeof BOARD_THEMES;

const TEST_POSITIONS = [
  {
    fen: 'r3k2r/1P6/8/8/8/8/1p6/R3K2R w KQkq - 0 1',
    label: 'Castling & Promotion',
  },
  {
    fen: 'rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
    label: 'Checkmate',
  },
  {
    fen: '5bnr/4p1pq/4Qpkr/7p/2P4P/8/PP1PPPP1/RNB1KBNR b KQ - 0 10',
    label: 'Stalemate',
  },
] as const;

const AI_MOVE_DELAY_MS = 500;

// ============================================================================
// Toggle — reusable checkbox control
// ============================================================================

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className='control-group'>
      <label htmlFor={id}>{label}</label>
      <input
        type='checkbox'
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        id={id}
        className='control-checkbox'
      />
    </div>
  );
}

// ============================================================================
// Select — reusable dropdown control
// ============================================================================

function Select<T extends string | number>({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className='control-group'>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={e =>
          onChange(
            (typeof value === 'number'
              ? parseInt(e.target.value)
              : e.target.value) as T
          )
        }
        className='control-select-small'
        disabled={disabled}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================================================
// MoveHistory — scrollable move list with figurine notation and navigation
// ============================================================================

function MoveHistory({
  history,
  viewingPly,
  onNavigate,
}: {
  history: GameHistoryEntry[];
  viewingPly: number | null;
  onNavigate: (ply: number | null) => void;
}) {
  const listRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to latest move when viewing live
  React.useEffect(() => {
    if (viewingPly === null && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [history.length, viewingPly]);

  // Group half-moves into full-move pairs (white, black)
  const movePairs = React.useMemo(() => {
    const pairs: {
      number: number;
      white: GameHistoryEntry;
      black?: GameHistoryEntry;
    }[] = [];
    for (let i = 0; i < history.length; i += 2) {
      pairs.push({
        number: Math.floor(i / 2) + 1,
        white: history[i],
        black: history[i + 1],
      });
    }
    return pairs;
  }, [history]);

  function getMoveClassName(plyIndex: number): string {
    const classes = ['move-button'];
    if (viewingPly === plyIndex) classes.push('active');
    if (viewingPly === null && plyIndex === history.length)
      classes.push('current');
    return classes.join(' ');
  }

  return (
    <div className='move-history'>
      <div className='move-history-header'>Moves</div>

      <div className='move-history-list' ref={listRef}>
        {movePairs.length === 0 ? (
          <div className='move-history-empty'>No moves yet</div>
        ) : (
          movePairs.map((pair, i) => {
            const whitePly = i * 2 + 1;
            const blackPly = i * 2 + 2;
            return (
              <div key={i} className='move-row'>
                <span className='move-number'>{pair.number}.</span>
                <button
                  className={getMoveClassName(whitePly)}
                  onClick={() => onNavigate(whitePly)}
                  title={pair.white.algebraic}
                >
                  {toFigurine(pair.white.algebraic)}
                </button>
                {pair.black && (
                  <button
                    className={getMoveClassName(blackPly)}
                    onClick={() => onNavigate(blackPly)}
                    title={pair.black.algebraic}
                  >
                    {toFigurine(pair.black.algebraic)}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className='move-nav'>
        <HistoryNavButton
          label='&#x23EE;'
          title='First position'
          disabled={history.length === 0}
          onClick={() => onNavigate(0)}
        />
        <HistoryNavButton
          label='&#x23F4;'
          title='Previous move'
          disabled={
            history.length === 0 || (viewingPly !== null && viewingPly <= 0)
          }
          onClick={() => {
            const cur = viewingPly ?? history.length;
            if (cur > 0) onNavigate(cur - 1);
          }}
        />
        <HistoryNavButton
          label='&#x23F5;'
          title='Next move'
          disabled={viewingPly === null}
          onClick={() => {
            if (viewingPly !== null) {
              onNavigate(
                viewingPly + 1 >= history.length ? null : viewingPly + 1
              );
            }
          }}
        />
        <HistoryNavButton
          label='&#x23ED;'
          title='Live position'
          disabled={viewingPly === null}
          onClick={() => onNavigate(null)}
        />
      </div>
    </div>
  );
}

function HistoryNavButton({
  label,
  title,
  disabled,
  onClick,
}: {
  label: string;
  title: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className='nav-button'
      onClick={onClick}
      disabled={disabled}
      title={title}
      dangerouslySetInnerHTML={{ __html: label }}
    />
  );
}

// ============================================================================
// SettingsPanel — all game and board configuration controls
// ============================================================================

function SettingsPanel({
  isOpen,
  settings,
  game,
  stockfish,
}: {
  isOpen: boolean;
  settings: SettingsState;
  game: ReturnType<typeof useChessGame>;
  stockfish: ReturnType<typeof useStockfish>;
}) {
  const s = settings;
  const gameState = game.getGameState();
  const isGameOver = gameState.isGameOver;

  return (
    <div className={`controls-panel ${isOpen ? 'controls-open' : ''}`}>
      {/* ---- Game actions ---- */}
      <div className='controls-section-title'>Game</div>

      <div className='control-group'>
        <button className='control-button reset-button' onClick={s.onReset}>
          Reset Game
        </button>
      </div>

      <div className='control-group' style={{ gap: 6 }}>
        <button
          className='control-button undo-button'
          onClick={() => game.undo()}
          disabled={game.history.length === 0}
        >
          Undo
        </button>
        <button
          className='control-button draw-button'
          onClick={() => game.endGame({ reason: 'draw' })}
          disabled={isGameOver}
        >
          Draw
        </button>
        <button
          className='control-button reset-button'
          style={{ flex: 1 }}
          disabled={isGameOver}
          onClick={() => {
            const current = gameState.currentPlayer;
            game.endGame({
              reason: 'resignation',
              winner: current === Color.White ? Color.Black : Color.White,
            });
          }}
        >
          Resign
        </button>
      </div>

      {/* ---- AI configuration ---- */}
      <Toggle
        id='blackAi'
        label='Black AI'
        checked={s.blackAi}
        onChange={s.setBlackAi}
      />
      <Toggle
        id='whiteAi'
        label='White AI'
        checked={s.whiteAi}
        onChange={s.setWhiteAi}
      />

      <Select
        id='aiMode'
        label='AI Mode'
        value={s.aiMode}
        onChange={v => s.setAiMode(v as AiMode)}
        options={[
          { value: 'random', label: 'Random' },
          { value: 'worstfish', label: 'Worstfish' },
          { value: 'easy', label: 'Easy' },
          { value: 'medium', label: 'Medium' },
          { value: 'hard', label: 'Hard' },
          { value: 'maximum', label: 'Maximum' },
        ]}
      />

      {s.aiMode !== 'random' && (
        <div className='control-group'>
          <label>Engine</label>
          <span
            className={`stockfish-status ${
              stockfish.isReady ? 'ready' : 'loading'
            }`}
          >
            {stockfish.isThinking
              ? 'Thinking...'
              : stockfish.isReady
              ? 'Ready'
              : 'Loading...'}
          </span>
        </div>
      )}

      <Select
        id='autoPromotion'
        label='Auto-Promote'
        value={s.autoPromotionPiece ?? ''}
        onChange={v =>
          s.setAutoPromotionPiece((v as PromotionPiece) || undefined)
        }
        options={[
          { value: '', label: 'Dialog' },
          { value: 'queen', label: 'Queen' },
          { value: 'rook', label: 'Rook' },
          { value: 'bishop', label: 'Bishop' },
          { value: 'knight', label: 'Knight' },
        ]}
      />

      {/* ---- Draw rules ---- */}
      <div className='controls-section-title'>Draw Rules</div>

      <Select
        id='repetitionRule'
        label='Repetition'
        value={s.repetitionRule}
        onChange={s.setRepetitionRule}
        options={[
          { value: 'off', label: 'Off' },
          { value: '3', label: 'Threefold' },
          { value: '5', label: 'Fivefold (FIDE)' },
        ]}
      />

      <Select
        id='moveRule'
        label='Move rule'
        value={s.moveRule}
        onChange={s.setMoveRule}
        options={[
          { value: 'off', label: 'Off' },
          { value: '50', label: '50-move' },
          { value: '75', label: '75-move (FIDE)' },
        ]}
      />

      <Toggle
        id='insufficientMaterial'
        label='Insufficient material'
        checked={s.insufficientMaterial}
        onChange={s.setInsufficientMaterial}
      />

      {/* ---- Board appearance ---- */}
      <div className='controls-section-title'>Board</div>

      <Select
        id='boardTheme'
        label='Theme'
        value={s.boardTheme}
        onChange={v => s.setBoardTheme(v as ThemeKey)}
        options={Object.entries(BOARD_THEMES).map(([key, t]) => ({
          value: key,
          label: t.name,
        }))}
      />

      <div className='control-group'>
        <label>Orientation</label>
        <button
          className='control-button flip-button'
          onClick={() =>
            s.setOrientation(prev => (prev === 'white' ? 'black' : 'white'))
          }
        >
          {s.orientation === 'white' ? 'White' : 'Black'}
        </button>
      </div>

      <Toggle
        id='showCoordinates'
        label='Coordinates'
        checked={s.showCoordinates}
        onChange={s.setShowCoordinates}
      />
      <Toggle
        id='showMoveIndicators'
        label='Move indicators'
        checked={s.showMoveIndicators}
        onChange={s.setShowMoveIndicators}
      />
      <Toggle
        id='enablePreMoves'
        label='Pre-moves'
        checked={s.enablePreMoves}
        onChange={s.setEnablePreMoves}
      />
      <Toggle
        id='enableAnimations'
        label='Animations'
        checked={s.enableAnimations}
        onChange={s.setEnableAnimations}
      />

      <Select
        id='animationDuration'
        label='Anim. speed'
        value={s.animationDuration}
        onChange={s.setAnimationDuration}
        disabled={!s.enableAnimations}
        options={[
          { value: 100, label: '100ms' },
          { value: 200, label: '200ms' },
          { value: 300, label: '300ms' },
          { value: 500, label: '500ms' },
          { value: 800, label: '800ms' },
        ]}
      />

      <Toggle
        id='enableSounds'
        label='Sounds'
        checked={s.enableSounds}
        onChange={s.setEnableSounds}
      />
      <Toggle
        id='enableArrows'
        label='Arrows'
        checked={s.enableArrows}
        onChange={s.setEnableArrows}
      />
      <Toggle
        id='enableHighlights'
        label='Highlights'
        checked={s.enableHighlights}
        onChange={s.setEnableHighlights}
      />

      {/* ---- Position loading ---- */}
      <div className='controls-section-title'>Position</div>

      <div className='control-group fen-group'>
        <label htmlFor='fenInput'>Load Position:</label>
        <input
          id='fenInput'
          type='text'
          value={s.fenInput}
          onChange={e => s.setFenInput(e.target.value)}
          placeholder='Enter FEN string...'
          className='fen-input'
        />
        <button
          className='control-button load-button'
          onClick={s.onLoadFen}
          disabled={!s.fenInput.trim()}
        >
          Load
        </button>
      </div>

      <div className='control-group'>
        <label>Test Positions:</label>
        <div className='preset-buttons'>
          {TEST_POSITIONS.map(pos => (
            <button
              key={pos.label}
              className='preset-button'
              onClick={() => s.onLoadPreset(pos.fen)}
            >
              {pos.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Settings state — all UI configuration for the demo
// ============================================================================

interface SettingsState {
  orientation: 'white' | 'black';
  setOrientation: React.Dispatch<React.SetStateAction<'white' | 'black'>>;
  enablePreMoves: boolean;
  setEnablePreMoves: (v: boolean) => void;
  blackAi: boolean;
  setBlackAi: (v: boolean) => void;
  whiteAi: boolean;
  setWhiteAi: (v: boolean) => void;
  autoPromotionPiece: PromotionPiece | undefined;
  setAutoPromotionPiece: (v: PromotionPiece | undefined) => void;
  fenInput: string;
  setFenInput: (v: string) => void;
  showCoordinates: boolean;
  setShowCoordinates: (v: boolean) => void;
  animationDuration: number;
  setAnimationDuration: (v: number) => void;
  enableAnimations: boolean;
  setEnableAnimations: (v: boolean) => void;
  enableSounds: boolean;
  setEnableSounds: (v: boolean) => void;
  enableArrows: boolean;
  setEnableArrows: (v: boolean) => void;
  enableHighlights: boolean;
  setEnableHighlights: (v: boolean) => void;
  arrows: import('react-shahmat').BoardArrow[];
  setArrows: React.Dispatch<
    React.SetStateAction<import('react-shahmat').BoardArrow[]>
  >;
  highlights: string[];
  setHighlights: React.Dispatch<React.SetStateAction<string[]>>;
  showMoveIndicators: boolean;
  setShowMoveIndicators: (v: boolean) => void;
  aiMode: AiMode;
  setAiMode: (v: AiMode) => void;
  repetitionRule: string;
  setRepetitionRule: (v: string) => void;
  moveRule: string;
  setMoveRule: (v: string) => void;
  insufficientMaterial: boolean;
  setInsufficientMaterial: (v: boolean) => void;
  boardTheme: ThemeKey;
  setBoardTheme: (v: ThemeKey) => void;
  onReset: () => void;
  onLoadFen: () => void;
  onLoadPreset: (fen: string) => void;
  gameRef: React.MutableRefObject<ReturnType<typeof useChessGame>>;
  navRef: React.MutableRefObject<{ setViewingPly: (v: null) => void }>;
}

function useSettings(): SettingsState {
  const [orientation, setOrientation] = React.useState<'white' | 'black'>(
    'white'
  );
  const [enablePreMoves, setEnablePreMoves] = React.useState(true);
  const [blackAi, setBlackAi] = React.useState(true);
  const [whiteAi, setWhiteAi] = React.useState(false);
  const [autoPromotionPiece, setAutoPromotionPiece] = React.useState<
    PromotionPiece | undefined
  >();
  const [fenInput, setFenInput] = React.useState('');
  const [showCoordinates, setShowCoordinates] = React.useState(true);
  const [animationDuration, setAnimationDuration] = React.useState(300);
  const [enableAnimations, setEnableAnimations] = React.useState(true);
  const [enableSounds, setEnableSounds] = React.useState(true);
  const [enableArrows, setEnableArrows] = React.useState(true);
  const [enableHighlights, setEnableHighlights] = React.useState(true);
  const [arrows, setArrows] = React.useState<
    import('react-shahmat').BoardArrow[]
  >([]);
  const [highlights, setHighlights] = React.useState<string[]>([]);
  const [showMoveIndicators, setShowMoveIndicators] = React.useState(true);
  const [aiMode, setAiMode] = React.useState<AiMode>('medium');
  const [repetitionRule, setRepetitionRule] = React.useState('5');
  const [moveRule, setMoveRule] = React.useState('75');
  const [insufficientMaterial, setInsufficientMaterial] = React.useState(true);
  const [boardTheme, setBoardTheme] = React.useState<ThemeKey>('green');

  // These use refs so they don't create a dependency on game/nav
  const gameRef = React.useRef<ReturnType<typeof useChessGame>>(null!);
  const navRef = React.useRef<{ setViewingPly: (v: null) => void }>(null!);

  const onReset = React.useCallback(() => {
    gameRef.current.resetGame();
    navRef.current.setViewingPly(null);
  }, []);

  const onLoadFen = React.useCallback(() => {
    if (fenInput.trim()) {
      gameRef.current.setPosition(fenInput.trim());
      navRef.current.setViewingPly(null);
    }
  }, [fenInput]);

  const onLoadPreset = React.useCallback((fen: string) => {
    setFenInput(fen);
    gameRef.current.setPosition(fen);
    navRef.current.setViewingPly(null);
  }, []);

  return {
    orientation,
    setOrientation,
    enablePreMoves,
    setEnablePreMoves,
    blackAi,
    setBlackAi,
    whiteAi,
    setWhiteAi,
    autoPromotionPiece,
    setAutoPromotionPiece,
    fenInput,
    setFenInput,
    showCoordinates,
    setShowCoordinates,
    animationDuration,
    setAnimationDuration,
    enableAnimations,
    setEnableAnimations,
    enableSounds,
    setEnableSounds,
    enableArrows,
    setEnableArrows,
    enableHighlights,
    setEnableHighlights,
    arrows,
    setArrows,
    highlights,
    setHighlights,
    showMoveIndicators,
    setShowMoveIndicators,
    aiMode,
    setAiMode,
    repetitionRule,
    setRepetitionRule,
    moveRule,
    setMoveRule,
    insufficientMaterial,
    setInsufficientMaterial,
    boardTheme,
    setBoardTheme,
    onReset,
    onLoadFen,
    onLoadPreset,
    gameRef,
    navRef,
  };
}

// ============================================================================
// useAI — handles Stockfish / random move fallback for AI players
// ============================================================================

function useAI(
  game: ReturnType<typeof useChessGame>,
  stockfish: ReturnType<typeof useStockfish>,
  whiteAi: boolean,
  blackAi: boolean,
  aiMode: AiMode
) {
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const gameRef = React.useRef(game);
  gameRef.current = game;

  return React.useCallback(
    async (gameState: GameState, _lastMove?: BoardMove) => {
      const isAiTurn = gameState.currentPlayer === 0 ? whiteAi : blackAi;
      if (
        !isAiTurn ||
        gameState.isGameOver ||
        gameState.validMoves.length === 0
      )
        return;

      const startTick = performance.now();

      try {
        let move: BoardMove | null = null;

        if (aiMode === 'random') {
          const idx = Math.floor(Math.random() * gameState.validMoves.length);
          move = moveToBoardMove(gameState.validMoves[idx]);
        } else {
          move = await stockfish.getMove(gameState.fen, aiMode);
        }

        if (!mountedRef.current) return;

        if (move) {
          const elapsed = performance.now() - startTick;
          if (elapsed < AI_MOVE_DELAY_MS) {
            await new Promise(r => setTimeout(r, AI_MOVE_DELAY_MS - elapsed));
          }
          if (!mountedRef.current) return;
          gameRef.current.makeMove(move);
        }
      } catch (error) {
        if (!mountedRef.current) return;
        console.error('AI move error:', error);
      }
    },
    [whiteAi, blackAi, stockfish, aiMode]
  );
}

// ============================================================================
// useHistoryNavigation — browsing through past positions without mutating state
// ============================================================================

function useHistoryNavigation(game: ReturnType<typeof useChessGame>) {
  // null = viewing the live (current) position
  const [viewingPly, setViewingPly] = React.useState<number | null>(null);
  const isViewingHistory = viewingPly !== null;

  const navigate = React.useCallback(
    (ply: number | null) => {
      if (ply === null || ply >= game.history.length) {
        setViewingPly(null);
      } else {
        setViewingPly(Math.max(0, ply));
      }
    },
    [game.history.length]
  );

  // Keyboard shortcuts: Arrow Left/Right, Home, End
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          {
            const cur = viewingPly ?? game.history.length;
            if (cur > 0) navigate(cur - 1);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (viewingPly !== null) {
            navigate(
              viewingPly + 1 >= game.history.length ? null : viewingPly + 1
            );
          }
          break;
        case 'Home':
          e.preventDefault();
          if (game.history.length > 0) navigate(0);
          break;
        case 'End':
          e.preventDefault();
          navigate(null);
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewingPly, game.history.length, navigate]);

  // Resolve the viewed position and last move for the board
  const viewedEntry =
    isViewingHistory && viewingPly > 0
      ? game.history[viewingPly - 1]
      : undefined;

  const viewedPosition = React.useMemo(() => {
    if (!isViewingHistory) return undefined;
    if (viewingPly === 0) return game.engine.getFenHistory()[0];
    return game.history[viewingPly - 1]?.fen;
  }, [isViewingHistory, viewingPly, game.history, game.engine]);

  // Override board props to show the historical position in readonly mode
  const boardPropsOverride = isViewingHistory
    ? {
        position: viewedPosition || game.boardProps.position,
        lastMove: viewedEntry?.move,
        validMoves: undefined as any,
        gameEndOverlay: undefined,
      }
    : {};

  return {
    viewingPly,
    navigate,
    isViewingHistory,
    boardPropsOverride,
    setViewingPly,
  };
}

// ============================================================================
// Playground — root component, wires everything together
// ============================================================================

function Playground() {
  const [controlsOpen, setControlsOpen] = React.useState(false);

  // Listen for hamburger toggle from the nav bar
  React.useEffect(() => {
    const handler = () => setControlsOpen(prev => !prev);
    document.addEventListener('toggle-settings', handler);
    return () => document.removeEventListener('toggle-settings', handler);
  }, []);

  const stockfish = useStockfish();
  const settings = useSettings();

  const handleError = React.useCallback((error: ChessError) => {
    console.error('Chess error:', error);
  }, []);

  // onPositionChange is wired via ref to avoid circular deps with useAI
  const onPositionChangeRef = React.useRef<
    (gs: GameState, lm?: BoardMove) => void
  >(() => {});
  const handlePositionChange = React.useCallback(
    (gs: GameState, lm?: BoardMove) => onPositionChangeRef.current(gs, lm),
    []
  );

  const game = useChessGame({
    whiteMovable: !settings.whiteAi,
    blackMovable: !settings.blackAi,
    enableSounds: settings.enableSounds,
    drawRules: {
      repetition:
        settings.repetitionRule === 'off'
          ? false
          : parseInt(settings.repetitionRule),
      moveRule:
        settings.moveRule === 'off' ? false : parseInt(settings.moveRule),
      insufficientMaterial: settings.insufficientMaterial,
    },
    onPositionChange: handlePositionChange,
    onError: handleError,
  });

  const nav = useHistoryNavigation(game);

  // Wire refs so settings callbacks can access game/nav without circular deps
  settings.gameRef.current = game;
  settings.navRef.current = nav;

  const handleAIMove = useAI(
    game,
    stockfish,
    settings.whiteAi,
    settings.blackAi,
    settings.aiMode
  );
  onPositionChangeRef.current = handleAIMove;

  // Build board theme as CSS custom properties
  const theme = BOARD_THEMES[settings.boardTheme];
  const boardStyle: Record<string, string> = {
    '--light-square': theme.light,
    '--dark-square': theme.dark,
    '--coord-light-text': theme.light,
    '--coord-dark-text': theme.dark,
  };

  return (
    <div className='Playground'>
      {/* Left sidebar: settings */}
      <SettingsPanel
        isOpen={controlsOpen}
        settings={settings}
        game={game}
        stockfish={stockfish}
      />

      {/* Mobile overlay to close settings */}
      {controlsOpen && (
        <div
          className='controls-overlay'
          onClick={() => setControlsOpen(false)}
        />
      )}

      {/* Center: chess board */}
      <div className='board-area'>
        <div className='board-container'>
          <ChessBoard
            {...game.boardProps}
            {...nav.boardPropsOverride}
            size='contain'
            orientation={settings.orientation}
            enablePremoves={settings.enablePreMoves}
            autoPromotionPiece={settings.autoPromotionPiece}
            showCoordinates={settings.showCoordinates}
            animationDuration={settings.animationDuration}
            enableAnimations={settings.enableAnimations}
            arrows={settings.enableArrows ? settings.arrows : []}
            onArrowsChange={
              settings.enableArrows ? settings.setArrows : undefined
            }
            highlights={settings.enableHighlights ? settings.highlights : []}
            onHighlightsChange={
              settings.enableHighlights ? settings.setHighlights : undefined
            }
            showMoveIndicators={settings.showMoveIndicators}
            readonly={nav.isViewingHistory}
            style={boardStyle}
          />
        </div>
      </div>

      {/* Right sidebar: move history */}
      <MoveHistory
        history={game.history}
        viewingPly={nav.viewingPly}
        onNavigate={nav.navigate}
      />
    </div>
  );
}

export default Playground;
