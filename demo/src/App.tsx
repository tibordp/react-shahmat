import React from 'react';
import './App.css';
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
import { useStockfish } from './hooks/useStockfish';

const BOARD_THEMES: Record<string, { light: string; dark: string; name: string }> = {
  green: { light: '#eeeed2', dark: '#769656', name: 'Green (Chess.com)' },
  brown: { light: '#f0d9b5', dark: '#b58863', name: 'Brown (Lichess)' },
  blue: { light: '#dee3e6', dark: '#8ca2ad', name: 'Blue' },
  purple: { light: '#e8d0ff', dark: '#9b72cf', name: 'Purple' },
  red: { light: '#f0d0d0', dark: '#c25050', name: 'Red' },
};

// Move history panel component
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

  // Auto-scroll to bottom when new moves arrive (if viewing live)
  React.useEffect(() => {
    if (viewingPly === null && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [history.length, viewingPly]);

  // Group moves into pairs (white, black)
  const movePairs: { number: number; white: GameHistoryEntry; black?: GameHistoryEntry }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1],
    });
  }

  return (
    <div className='move-history'>
      <div className='move-history-header'>Moves</div>
      <div className='move-history-list' ref={listRef}>
        {movePairs.length === 0 && (
          <div className='move-history-empty'>No moves yet</div>
        )}
        {movePairs.map((pair, pairIndex) => (
          <div key={pairIndex} className='move-row'>
            <span className='move-number'>{pair.number}.</span>
            <button
              className={`move-button ${viewingPly === pairIndex * 2 + 1 ? 'active' : ''} ${viewingPly === null && pairIndex * 2 + 1 === history.length ? 'current' : ''}`}
              onClick={() => onNavigate(pairIndex * 2 + 1)}
              title={pair.white.algebraic}
            >
              {toFigurine(pair.white.algebraic)}
            </button>
            {pair.black && (
              <button
                className={`move-button ${viewingPly === pairIndex * 2 + 2 ? 'active' : ''} ${viewingPly === null && pairIndex * 2 + 2 === history.length ? 'current' : ''}`}
                onClick={() => onNavigate(pairIndex * 2 + 2)}
                title={pair.black.algebraic}
              >
                {toFigurine(pair.black.algebraic)}
              </button>
            )}
          </div>
        ))}
      </div>
      {/* Navigation buttons */}
      <div className='move-nav'>
        <button
          className='nav-button'
          onClick={() => onNavigate(0)}
          disabled={history.length === 0}
          title='First position'
        >
          &#x23EE;
        </button>
        <button
          className='nav-button'
          onClick={() => {
            const current = viewingPly ?? history.length;
            if (current > 0) onNavigate(current - 1);
          }}
          disabled={history.length === 0 || (viewingPly !== null && viewingPly <= 0)}
          title='Previous move'
        >
          &#x23F4;
        </button>
        <button
          className='nav-button'
          onClick={() => {
            const current = viewingPly ?? history.length;
            if (current < history.length) onNavigate(current + 1 >= history.length ? null : current + 1);
          }}
          disabled={viewingPly === null}
          title='Next move'
        >
          &#x23F5;
        </button>
        <button
          className='nav-button'
          onClick={() => onNavigate(null)}
          disabled={viewingPly === null}
          title='Live position'
        >
          &#x23ED;
        </button>
      </div>
    </div>
  );
}

function App() {
  const [controlsOpen, setControlsOpen] = React.useState(false);
  const [orientation, setOrientation] = React.useState<'white' | 'black'>('white');
  const [enablePreMoves, setEnablePreMoves] = React.useState(true);
  const [blackAi, setBlackAi] = React.useState(true);
  const [whiteAi, setWhiteAi] = React.useState(false);
  const [autoPromotionPiece, setAutoPromotionPiece] = React.useState<
    PromotionPiece | undefined
  >(undefined);
  const [fenInput, setFenInput] = React.useState('');
  const [showCoordinates, setShowCoordinates] = React.useState(true);
  const [animationDuration, setAnimationDuration] = React.useState(300);
  const [enableAnimations, setEnableAnimations] = React.useState(true);
  const [enableSounds, setEnableSounds] = React.useState(true);
  const [enableArrows, setEnableArrows] = React.useState(true);
  const [enableHighlights, setEnableHighlights] = React.useState(true);
  const [showMoveIndicators, setShowMoveIndicators] = React.useState(true);
  const [aiSkillLevel, setAiSkillLevel] = React.useState(5);
  const [boardTheme, setBoardTheme] = React.useState('green');

  // History navigation: null = live position, number = viewing ply N
  const [viewingPly, setViewingPly] = React.useState<number | null>(null);

  const stockfish = useStockfish();

  const gameRef = React.useRef<ReturnType<typeof useChessGame>>(null!);

  const handlePositionChange = React.useCallback(
    async (gameState: GameState, _lastMove?: BoardMove) => {
      const currentPlayerIsAi =
        gameState.currentPlayer === 0 ? whiteAi : blackAi;

      if (!currentPlayerIsAi || gameState.isGameOver) return;

      const startTick = performance.now();

      try {
        let move: BoardMove | null = null;

        if (stockfish.isReady && !stockfish.isThinking) {
          move = await stockfish.getBestMove(gameState.fen, aiSkillLevel);
        }

        if (!move && gameState.validMoves.length > 0) {
          const randomIndex = Math.floor(
            Math.random() * gameState.validMoves.length
          );
          move = moveToBoardMove(gameState.validMoves[randomIndex]);
        }

        if (move) {
          const took = performance.now() - startTick;
          if (took < 500) {
            await new Promise(r => setTimeout(r, 500 - took));
          }
          gameRef.current.makeMove(move);
        }
      } catch (error) {
        console.error('AI move error:', error);
        if (gameState.validMoves.length > 0) {
          const randomIndex = Math.floor(
            Math.random() * gameState.validMoves.length
          );
          gameRef.current.makeMove(moveToBoardMove(gameState.validMoves[randomIndex]));
        }
      }
    },
    [whiteAi, blackAi, stockfish, aiSkillLevel]
  );

  const handleError = React.useCallback((error: ChessError) => {
    console.error('Chess error:', error);
  }, []);

  const game = useChessGame({
    whiteMovable: !whiteAi,
    blackMovable: !blackAi,
    onPositionChange: handlePositionChange,
    onError: handleError,
  });
  gameRef.current = game;

  const handleReset = React.useCallback(() => {
    game.resetGame();
    setViewingPly(null);
  }, [game]);

  const handleLoadPosition = React.useCallback(() => {
    if (fenInput.trim()) {
      const success = game.setPosition(fenInput.trim());
      if (!success) {
        console.error('Invalid FEN string');
      }
      setViewingPly(null);
    }
  }, [fenInput, game]);

  const handleLoadPreset = React.useCallback(
    (fen: string, description: string) => {
      setFenInput(fen);
      const success = game.setPosition(fen);
      if (!success) {
        console.error(`Failed to load ${description}`);
      }
      setViewingPly(null);
    },
    [game]
  );

  // Handle history navigation
  const handleNavigate = React.useCallback((ply: number | null) => {
    if (ply === null || ply >= game.history.length) {
      setViewingPly(null);
    } else {
      setViewingPly(Math.max(0, ply));
    }
  }, [game.history.length]);

  // Keyboard navigation for history
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const current = viewingPly ?? game.history.length;
        if (current > 0) handleNavigate(current - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (viewingPly !== null) {
          handleNavigate(viewingPly + 1 >= game.history.length ? null : viewingPly + 1);
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        if (game.history.length > 0) handleNavigate(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        handleNavigate(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingPly, game.history.length, handleNavigate]);

  // When viewing history, override board props
  const isViewingHistory = viewingPly !== null;
  const viewedEntry = isViewingHistory && viewingPly > 0
    ? game.history[viewingPly - 1]
    : undefined;

  // Get the FEN for the viewed position
  const viewedPosition = React.useMemo(() => {
    if (!isViewingHistory) return undefined;
    if (viewingPly === 0) {
      // Initial position — get from engine's FEN history
      return game.engine.getFenHistory()[0];
    }
    return game.history[viewingPly - 1]?.fen;
  }, [isViewingHistory, viewingPly, game.history, game.engine]);

  const theme = BOARD_THEMES[boardTheme] || BOARD_THEMES.green;
  const boardStyle = {
    '--light-square': theme.light,
    '--dark-square': theme.dark,
    '--coord-light-text': theme.light,
    '--coord-dark-text': theme.dark,
  } as React.CSSProperties;

  // Build board props: use history position if viewing, live otherwise
  const boardProps = isViewingHistory
    ? {
        ...game.boardProps,
        position: viewedPosition || game.boardProps.position,
        lastMove: viewedEntry?.move,
        check: viewedEntry?.isCheck ? undefined : undefined, // TODO: extract check square from history
        validMoves: undefined, // No moves in history view
        gameEndOverlay: undefined,
      }
    : game.boardProps;

  return (
    <div className='App'>
      <button
        className='mobile-menu-toggle'
        onClick={() => setControlsOpen(!controlsOpen)}
        aria-label='Toggle controls'
      >
        ☰
      </button>
      <div className={`controls-panel ${controlsOpen ? 'controls-open' : ''}`}>
        <div className='controls-section-title'>Game</div>

        <div className='control-group'>
          <button className='control-button reset-button' onClick={handleReset}>
            Reset Game
          </button>
        </div>

        <div className='control-group' style={{ gap: 6 }}>
          <button
            className='control-button'
            style={{ background: '#7b6b2e', flex: 1 }}
            onClick={() => game.undo()}
            disabled={game.history.length === 0}
          >
            Undo
          </button>
          <button
            className='control-button'
            style={{ background: '#555', flex: 1 }}
            onClick={() => game.endGame({ reason: 'draw' })}
            disabled={game.getGameState().isGameOver}
          >
            Draw
          </button>
          <button
            className='control-button reset-button'
            style={{ flex: 1 }}
            onClick={() => {
              const current = game.getGameState().currentPlayer;
              game.endGame({
                reason: 'resignation',
                winner: current === Color.White ? Color.Black : Color.White,
              });
            }}
            disabled={game.getGameState().isGameOver}
          >
            Resign
          </button>
        </div>

        <div className='control-group'>
          <label htmlFor='blackAi'>Black AI</label>
          <input
            type='checkbox'
            checked={blackAi}
            onChange={e => setBlackAi(e.target.checked)}
            id='blackAi'
            className='control-checkbox'
          />
        </div>

        <div className='control-group'>
          <label htmlFor='whiteAi'>White AI</label>
          <input
            type='checkbox'
            checked={whiteAi}
            onChange={e => setWhiteAi(e.target.checked)}
            id='whiteAi'
            className='control-checkbox'
          />
        </div>

        <div className='control-group'>
          <label htmlFor='aiSkillLevel'>Stockfish Level</label>
          <select
            id='aiSkillLevel'
            value={aiSkillLevel}
            onChange={e => setAiSkillLevel(parseInt(e.target.value))}
            className='control-select-small'
          >
            <option value={1}>1 (depth 1)</option>
            <option value={3}>3 (depth 2)</option>
            <option value={5}>5 (depth 3)</option>
            <option value={8}>8 (500ms)</option>
            <option value={15}>15 (1s)</option>
            <option value={20}>20 (2s)</option>
          </select>
        </div>

        <div className='control-group'>
          <label>Stockfish</label>
          <span
            className={`stockfish-status ${stockfish.isReady ? 'ready' : 'loading'}`}
          >
            {stockfish.isThinking
              ? 'Thinking...'
              : stockfish.isReady
                ? 'Ready'
                : 'Loading...'}
          </span>
        </div>

        <div className='control-group'>
          <label htmlFor='autoPromotion'>Auto-Promote</label>
          <select
            id='autoPromotion'
            value={autoPromotionPiece ?? ''}
            onChange={e =>
              setAutoPromotionPiece(
                (e.target.value as PromotionPiece) || undefined
              )
            }
            className='control-select-small'
          >
            <option value=''>Dialog</option>
            <option value='queen'>Queen</option>
            <option value='rook'>Rook</option>
            <option value='bishop'>Bishop</option>
            <option value='knight'>Knight</option>
          </select>
        </div>

        <div className='controls-section-title'>Board</div>

        <div className='control-group'>
          <label htmlFor='boardTheme'>Theme</label>
          <select
            id='boardTheme'
            value={boardTheme}
            onChange={e => setBoardTheme(e.target.value)}
            className='control-select-small'
          >
            {Object.entries(BOARD_THEMES).map(([key, t]) => (
              <option key={key} value={key}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className='control-group'>
          <label>Orientation</label>
          <button
            className='control-button'
            onClick={() =>
              setOrientation(prev => (prev === 'white' ? 'black' : 'white'))
            }
            style={{ width: 'auto', padding: '5px 12px', fontSize: '12px' }}
          >
            {orientation === 'white' ? 'White' : 'Black'}
          </button>
        </div>

        <div className='control-group'>
          <label htmlFor='showCoordinates'>Coordinates</label>
          <input
            type='checkbox'
            checked={showCoordinates}
            onChange={e => setShowCoordinates(e.target.checked)}
            id='showCoordinates'
            className='control-checkbox'
          />
        </div>

        <div className='control-group'>
          <label htmlFor='showMoveIndicators'>Move indicators</label>
          <input
            type='checkbox'
            checked={showMoveIndicators}
            onChange={e => setShowMoveIndicators(e.target.checked)}
            id='showMoveIndicators'
            className='control-checkbox'
          />
        </div>

        <div className='control-group'>
          <label htmlFor='enablePreMoves'>Pre-moves</label>
          <input
            type='checkbox'
            checked={enablePreMoves}
            onChange={e => setEnablePreMoves(e.target.checked)}
            id='enablePreMoves'
            className='control-checkbox'
          />
        </div>

        <div className='control-group'>
          <label htmlFor='enableAnimations'>Animations</label>
          <input
            type='checkbox'
            checked={enableAnimations}
            onChange={e => setEnableAnimations(e.target.checked)}
            id='enableAnimations'
            className='control-checkbox'
          />
        </div>

        <div className='control-group'>
          <label htmlFor='animationDuration'>Anim. speed</label>
          <select
            id='animationDuration'
            value={animationDuration}
            onChange={e => setAnimationDuration(parseInt(e.target.value))}
            className='control-select-small'
            disabled={!enableAnimations}
          >
            <option value={100}>100ms</option>
            <option value={200}>200ms</option>
            <option value={300}>300ms</option>
            <option value={500}>500ms</option>
            <option value={800}>800ms</option>
          </select>
        </div>

        <div className='control-group'>
          <label htmlFor='enableSounds'>Sounds</label>
          <input
            type='checkbox'
            checked={enableSounds}
            onChange={e => setEnableSounds(e.target.checked)}
            id='enableSounds'
            className='control-checkbox'
          />
        </div>

        <div className='control-group'>
          <label htmlFor='enableArrows'>Arrows</label>
          <input
            type='checkbox'
            checked={enableArrows}
            onChange={e => setEnableArrows(e.target.checked)}
            id='enableArrows'
            className='control-checkbox'
          />
        </div>

        <div className='control-group'>
          <label htmlFor='enableHighlights'>Highlights</label>
          <input
            type='checkbox'
            checked={enableHighlights}
            onChange={e => setEnableHighlights(e.target.checked)}
            id='enableHighlights'
            className='control-checkbox'
          />
        </div>

        <div className='controls-section-title'>Position</div>

        <div className='control-group fen-group'>
          <label htmlFor='fenInput'>Load Position:</label>
          <input
            id='fenInput'
            type='text'
            value={fenInput}
            onChange={e => setFenInput(e.target.value)}
            placeholder='Enter FEN string...'
            className='fen-input'
          />
          <button
            className='control-button load-button'
            onClick={handleLoadPosition}
            disabled={!fenInput.trim()}
          >
            Load
          </button>
        </div>

        <div className='control-group'>
          <label>Test Positions:</label>
          <div className='preset-buttons'>
            <button
              className='preset-button'
              onClick={() =>
                handleLoadPreset(
                  'r3k2r/1P6/8/8/8/8/1p6/R3K2R w KQkq - 0 1',
                  'Castling & Promotion Test'
                )
              }
            >
              Castling & Promotion
            </button>
            <button
              className='preset-button'
              onClick={() =>
                handleLoadPreset(
                  'rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
                  "Checkmate (Fool's Mate)"
                )
              }
            >
              Checkmate
            </button>
            <button
              className='preset-button'
              onClick={() =>
                handleLoadPreset(
                  '5bnr/4p1pq/4Qpkr/7p/2P4P/8/PP1PPPP1/RNB1KBNR b KQ - 0 10',
                  'Stalemate'
                )
              }
            >
              Stalemate
            </button>
          </div>
        </div>

      </div>
      {controlsOpen && (
        <div
          className='controls-overlay'
          onClick={() => setControlsOpen(false)}
        />
      )}

      <div className='board-area'>
        <div className='board-container'>
          <ChessBoard
            {...boardProps}
            orientation={orientation}
            enablePremoves={enablePreMoves}
            autoPromotionPiece={autoPromotionPiece}
            showCoordinates={showCoordinates}
            animationDuration={animationDuration}
            enableAnimations={enableAnimations}
            enableSounds={enableSounds}
            enableArrows={enableArrows}
            enableHighlights={enableHighlights}
            showMoveIndicators={showMoveIndicators}
            readonly={isViewingHistory}
            className='themed-board'
            style={boardStyle}
          />
        </div>
      </div>
      <MoveHistory
        history={game.history}
        viewingPly={viewingPly}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

export default App;
