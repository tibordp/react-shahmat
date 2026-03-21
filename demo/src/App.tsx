import React from 'react';
import './App.css';
import {
  ChessBoard,
  useChessGame,
  moveToBoardMove,
} from 'react-shahmat';
import type {
  GameState,
  BoardMove,
  ChessError,
  PromotionPiece,
} from 'react-shahmat';
import { useStockfish } from './hooks/useStockfish';

const BOARD_THEMES: Record<string, { light: string; dark: string; name: string }> = {
  green: { light: '#eeeed2', dark: '#769656', name: 'Green (Chess.com)' },
  brown: { light: '#f0d9b5', dark: '#b58863', name: 'Brown (Lichess)' },
  blue: { light: '#dee3e6', dark: '#8ca2ad', name: 'Blue' },
  purple: { light: '#e8d0ff', dark: '#9b72cf', name: 'Purple' },
  red: { light: '#f0d0d0', dark: '#c25050', name: 'Red' },
};

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

  const stockfish = useStockfish();

  // Use ref for game to avoid circular dependency with handlePositionChange
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

        // Fallback to random move
        if (!move && gameState.validMoves.length > 0) {
          const randomIndex = Math.floor(
            Math.random() * gameState.validMoves.length
          );
          move = moveToBoardMove(gameState.validMoves[randomIndex]);
        }

        if (move) {
          // Ensure minimum delay for visual smoothness
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
  }, [game]);

  const handleLoadPosition = React.useCallback(() => {
    if (fenInput.trim()) {
      const success = game.setPosition(fenInput.trim());
      if (!success) {
        console.error('Invalid FEN string');
      }
    }
  }, [fenInput, game]);

  const handleLoadPreset = React.useCallback(
    (fen: string, description: string) => {
      setFenInput(fen);
      const success = game.setPosition(fen);
      if (!success) {
        console.error(`Failed to load ${description}`);
      }
    },
    [game]
  );

  const theme = BOARD_THEMES[boardTheme] || BOARD_THEMES.green;
  const boardStyle = {
    '--light-square': theme.light,
    '--dark-square': theme.dark,
    '--coord-light-text': theme.light,
    '--coord-dark-text': theme.dark,
  } as React.CSSProperties;

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
        <div className='control-group'>
          <label htmlFor='flipBoard'>Board Orientation:</label>
          <button
            id='flipBoard'
            className='control-button'
            onClick={() =>
              setOrientation(prev => (prev === 'white' ? 'black' : 'white'))
            }
          >
            {orientation === 'white' ? 'White Perspective' : 'Black Perspective'}
          </button>
        </div>

        <div className='control-group'>
          <label htmlFor='boardTheme'>Board Theme:</label>
          <select
            id='boardTheme'
            value={boardTheme}
            onChange={e => setBoardTheme(e.target.value)}
            className='control-select'
          >
            {Object.entries(BOARD_THEMES).map(([key, t]) => (
              <option key={key} value={key}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className='control-group'>
          <input
            type='checkbox'
            checked={enablePreMoves}
            onChange={e => setEnablePreMoves(e.target.checked)}
            id='enablePreMoves'
            className='control-checkbox'
          />
          <label htmlFor='enablePreMoves'>Enable Pre-Moves</label>
        </div>

        <div className='control-group'>
          <input
            type='checkbox'
            checked={blackAi}
            onChange={e => setBlackAi(e.target.checked)}
            id='blackAi'
            className='control-checkbox'
          />
          <label htmlFor='blackAi'>Black AI</label>
        </div>

        <div className='control-group'>
          <input
            type='checkbox'
            checked={whiteAi}
            onChange={e => setWhiteAi(e.target.checked)}
            id='whiteAi'
            className='control-checkbox'
          />
          <label htmlFor='whiteAi'>White AI</label>
        </div>

        <div className='control-group'>
          <label htmlFor='autoPromotion'>Auto-Promotion:</label>
          <select
            id='autoPromotion'
            value={autoPromotionPiece ?? ''}
            onChange={e =>
              setAutoPromotionPiece(
                (e.target.value as PromotionPiece) || undefined
              )
            }
            className='control-select'
          >
            <option value=''>Manual (Show Dialog)</option>
            <option value='queen'>Queen</option>
            <option value='rook'>Rook</option>
            <option value='bishop'>Bishop</option>
            <option value='knight'>Knight</option>
          </select>
        </div>

        <div className='control-group'>
          <button className='control-button reset-button' onClick={handleReset}>
            Reset Game
          </button>
        </div>

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

        <div className='control-group'>
          <input
            type='checkbox'
            checked={showCoordinates}
            onChange={e => setShowCoordinates(e.target.checked)}
            id='showCoordinates'
            className='control-checkbox'
          />
          <label htmlFor='showCoordinates'>Show Coordinates</label>
        </div>

        <div className='control-group'>
          <input
            type='checkbox'
            checked={enableAnimations}
            onChange={e => setEnableAnimations(e.target.checked)}
            id='enableAnimations'
            className='control-checkbox'
          />
          <label htmlFor='enableAnimations'>Enable Animations</label>
        </div>

        <div className='control-group'>
          <label htmlFor='animationDuration'>Animation Speed:</label>
          <select
            id='animationDuration'
            value={animationDuration}
            onChange={e => setAnimationDuration(parseInt(e.target.value))}
            className='control-select-small'
            disabled={!enableAnimations}
          >
            <option value={100}>Very Fast (100ms)</option>
            <option value={200}>Fast (200ms)</option>
            <option value={300}>Normal (300ms)</option>
            <option value={500}>Slow (500ms)</option>
            <option value={800}>Very Slow (800ms)</option>
          </select>
        </div>

        <div className='control-group'>
          <label htmlFor='aiSkillLevel'>Stockfish Skill Level:</label>
          <select
            id='aiSkillLevel'
            value={aiSkillLevel}
            onChange={e => setAiSkillLevel(parseInt(e.target.value))}
            className='control-select-small'
          >
            <option value={1}>Level 1 (1-ply depth)</option>
            <option value={3}>Level 3 (2-ply depth)</option>
            <option value={5}>Level 5 (3-ply depth)</option>
            <option value={8}>Level 8 (500ms time)</option>
            <option value={15}>Level 15 (1000ms time)</option>
            <option value={20}>Level 20 (2000ms time)</option>
          </select>
        </div>

        <div className='control-group'>
          <label>Stockfish Status:</label>
          <span
            className={`stockfish-status ${stockfish.isReady ? 'ready' : 'loading'}`}
            style={{ display: 'inline-block', minWidth: '80px' }}
          >
            {stockfish.isThinking
              ? 'Thinking...'
              : stockfish.isReady
                ? 'Ready'
                : 'Loading...'}
          </span>
        </div>

        <div className='control-group'>
          <input
            type='checkbox'
            checked={enableSounds}
            onChange={e => setEnableSounds(e.target.checked)}
            id='enableSounds'
            className='control-checkbox'
          />
          <label htmlFor='enableSounds'>Enable Sounds</label>
        </div>

        <div className='control-group'>
          <input
            type='checkbox'
            checked={enableArrows}
            onChange={e => setEnableArrows(e.target.checked)}
            id='enableArrows'
            className='control-checkbox'
          />
          <label htmlFor='enableArrows'>Enable Arrows</label>
        </div>

        <div className='control-group'>
          <input
            type='checkbox'
            checked={enableHighlights}
            onChange={e => setEnableHighlights(e.target.checked)}
            id='enableHighlights'
            className='control-checkbox'
          />
          <label htmlFor='enableHighlights'>Enable Highlights</label>
        </div>

        <div className='control-group'>
          <input
            type='checkbox'
            checked={showMoveIndicators}
            onChange={e => setShowMoveIndicators(e.target.checked)}
            id='showMoveIndicators'
            className='control-checkbox'
          />
          <label htmlFor='showMoveIndicators'>Show Move Indicators</label>
        </div>
      </div>
      {controlsOpen && (
        <div
          className='controls-overlay'
          onClick={() => setControlsOpen(false)}
        />
      )}

      <div className='board-container'>
        <ChessBoard
          {...game.boardProps}
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
          className='themed-board'
          style={boardStyle}
        />
      </div>
    </div>
  );
}

export default App;
