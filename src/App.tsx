import React from 'react';
import './App.css';
import { ChessBoard } from './components/ChessBoard';
import { GameState, Move, ChessError, PieceType, ChessBoardRef } from './engine/jsChessEngine';
import { useStockfish } from './hooks/useStockfish';

function App() {
  const [flipped, setFlipped] = React.useState(false);
  const [controlsOpen, setControlsOpen] = React.useState(false);
  const [enablePreMoves, setEnablePreMoves] = React.useState(true);
  const [blackAi, setBlackAi] = React.useState(true);
  const [whiteAi, setWhiteAi] = React.useState(false);
  const [autoPromotionPiece, setAutoPromotionPiece] = React.useState<PieceType | undefined>(undefined);
  const [fenInput, setFenInput] = React.useState('');
  const [showCoordinates, setShowCoordinates] = React.useState(true);
  const [animationDuration, setAnimationDuration] = React.useState(300);
  const [enableAnimations, setEnableAnimations] = React.useState(true);
  const [enableSounds, setEnableSounds] = React.useState(true);
  const [enableArrows, setEnableArrows] = React.useState(true);
  const [enableHighlights, setEnableHighlights] = React.useState(true);
  const [aiSkillLevel, setAiSkillLevel] = React.useState(5);
  const chessBoardRef = React.useRef<ChessBoardRef>(null);
  const stockfish = useStockfish();

  const handlePositionChange = React.useCallback(async (gameState: GameState, lastMove?: Move) => {
    // Determine if current player is AI
    const currentPlayerIsAi = gameState.currentPlayer === 0 ? whiteAi : blackAi;
    console.log('Position changed:', gameState, 'Last move:', lastMove);

    const startTick = performance.now();
    const sendMove = (move: Move) => {
      const took = performance.now() - startTick;
      if (took < 500) {
        setTimeout(() => {
          chessBoardRef.current?.executeExternalMove(move);
        }, 500 - took);
      } else {
        chessBoardRef.current?.executeExternalMove(move);
      }
    };

    if (currentPlayerIsAi && !gameState.isGameOver && chessBoardRef.current) {
        try {
          let move: Move | null = null;

          if (stockfish.isReady && !stockfish.isThinking) {
            // Try to get move from Stockfish
            move = await stockfish.getBestMove(gameState.fen, aiSkillLevel);
          }

          // Fallback to random move if Stockfish fails
          if (!move && gameState.validMoves.length > 0) {
            console.log('Using fallback random move');
            const randomIndex = Math.floor(Math.random() * gameState.validMoves.length);
            move = gameState.validMoves[randomIndex];
          }

          if (move && chessBoardRef.current) {
            sendMove(move);
          }
        } catch (error) {
          console.error('AI move error:', error);
          // Final fallback to random move
          if (gameState.validMoves.length > 0) {
            const randomIndex = Math.floor(Math.random() * gameState.validMoves.length);
            const move = gameState.validMoves[randomIndex];
            sendMove(move);
          }
        }
    }
  }, [whiteAi, blackAi, stockfish, aiSkillLevel]);

  const handleError = React.useCallback((error: ChessError) => {
    console.error('Chess engine error:', error);
  }, []);

  const handleReset = React.useCallback(() => {
    chessBoardRef.current?.resetGame();
  }, []);

  const handleLoadPosition = React.useCallback(() => {
    if (fenInput.trim() && chessBoardRef.current) {
      const success = chessBoardRef.current.setPosition(fenInput.trim());
      if (!success) {
        alert('Invalid FEN string');
      }
    }
  }, [fenInput]);

  const handleLoadPreset = React.useCallback((fen: string, description: string) => {
    setFenInput(fen);
    if (chessBoardRef.current) {
      const success = chessBoardRef.current.setPosition(fen);
      if (!success) {
        alert(`Failed to load ${description}`);
      }
    }
  }, []);

  return (
    <div className="App">
      <button
        className="mobile-menu-toggle"
        onClick={() => setControlsOpen(!controlsOpen)}
        aria-label="Toggle controls"
      >
        ☰
      </button>
      <div className={`controls-panel ${controlsOpen ? 'controls-open' : ''}`}>
        <div className="control-group">
          <label htmlFor="flipBoard">Board Orientation:</label>
          <button
            id="flipBoard"
            className="control-button"
            onClick={() => setFlipped(!flipped)}
          >
            {flipped ? 'Black Perspective' : 'White Perspective'}
          </button>
        </div>

        <div className="control-group">
          <input
            type="checkbox"
            checked={enablePreMoves}
            onChange={(e) => setEnablePreMoves(e.target.checked)}
            id="enablePreMoves"
            className="control-checkbox"
          />
          <label htmlFor="enablePreMoves">Enable Pre-Moves</label>
        </div>

        <div className="control-group">
          <input
            type="checkbox"
            checked={blackAi}
            onChange={(e) => setBlackAi(e.target.checked)}
            id="blackAi"
            className="control-checkbox"
          />
          <label htmlFor="blackAi">Black AI</label>
        </div>

        <div className="control-group">
          <input
            type="checkbox"
            checked={whiteAi}
            onChange={(e) => setWhiteAi(e.target.checked)}
            id="whiteAi"
            className="control-checkbox"
          />
          <label htmlFor="whiteAi">White AI</label>
        </div>

        <div className="control-group">
          <label htmlFor="autoPromotion">Auto-Promotion:</label>
          <select
            id="autoPromotion"
            value={autoPromotionPiece ?? ''}
            onChange={(e) => setAutoPromotionPiece(e.target.value ? parseInt(e.target.value) as PieceType : undefined)}
            className="control-select"
          >
            <option value="">Manual (Show Dialog)</option>
            <option value={PieceType.Queen}>Queen</option>
            <option value={PieceType.Rook}>Rook</option>
            <option value={PieceType.Bishop}>Bishop</option>
            <option value={PieceType.Knight}>Knight</option>
          </select>
        </div>

        <div className="control-group">
          <button
            className="control-button reset-button"
            onClick={handleReset}
          >
            Reset Game
          </button>
        </div>

        <div className="control-group fen-group">
          <label htmlFor="fenInput">Load Position:</label>
          <input
            id="fenInput"
            type="text"
            value={fenInput}
            onChange={(e) => setFenInput(e.target.value)}
            placeholder="Enter FEN string..."
            className="fen-input"
          />
          <button
            className="control-button load-button"
            onClick={handleLoadPosition}
            disabled={!fenInput.trim()}
          >
            Load
          </button>
        </div>

        <div className="control-group">
          <label>Test Positions:</label>
          <div className="preset-buttons">
            <button
              className="preset-button"
              onClick={() => handleLoadPreset(
                'r3k2r/1P6/8/8/8/8/1p6/R3K2R w KQkq - 0 1',
                'Castling & Promotion Test'
              )}
            >
              Castling & Promotion
            </button>
            <button
              className="preset-button"
              onClick={() => handleLoadPreset(
                'rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
                'Checkmate (Fool\'s Mate)'
              )}
            >
              Checkmate
            </button>
            <button
              className="preset-button"
              onClick={() => handleLoadPreset(
                '5bnr/4p1pq/4Qpkr/7p/2P4P/8/PP1PPPP1/RNB1KBNR b KQ - 0 10',
                'Stalemate'
              )}
            >
              Stalemate
            </button>
          </div>
        </div>

        <div className="control-group">
          <input
            type="checkbox"
            checked={showCoordinates}
            onChange={(e) => setShowCoordinates(e.target.checked)}
            id="showCoordinates"
            className="control-checkbox"
          />
          <label htmlFor="showCoordinates">Show Coordinates</label>
        </div>

        <div className="control-group">
          <input
            type="checkbox"
            checked={enableAnimations}
            onChange={(e) => setEnableAnimations(e.target.checked)}
            id="enableAnimations"
            className="control-checkbox"
          />
          <label htmlFor="enableAnimations">Enable Animations</label>
        </div>

        <div className="control-group">
          <label htmlFor="animationDuration">Animation Speed:</label>
          <select
            id="animationDuration"
            value={animationDuration}
            onChange={(e) => setAnimationDuration(parseInt(e.target.value))}
            className="control-select-small"
            disabled={!enableAnimations}
          >
            <option value={100}>Very Fast (100ms)</option>
            <option value={200}>Fast (200ms)</option>
            <option value={300}>Normal (300ms)</option>
            <option value={500}>Slow (500ms)</option>
            <option value={800}>Very Slow (800ms)</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="aiSkillLevel">Stockfish Skill Level:</label>
          <select
            id="aiSkillLevel"
            value={aiSkillLevel}
            onChange={(e) => setAiSkillLevel(parseInt(e.target.value))}
            className="control-select-small"
          >
            <option value={1}>Level 1 (1-ply depth)</option>
            <option value={3}>Level 3 (2-ply depth)</option>
            <option value={5}>Level 5 (3-ply depth)</option>
            <option value={8}>Level 8 (500ms time)</option>
            <option value={15}>Level 15 (1000ms time)</option>
            <option value={20}>Level 20 (2000ms time)</option>
          </select>
        </div>

        <div className="control-group">
          <label>Stockfish Status:</label>
          <span className={`stockfish-status ${stockfish.isReady ? 'ready' : 'loading'}`} style={{display: 'inline-block', minWidth: '80px'}}>
            {stockfish.isThinking ? 'Thinking...' : stockfish.isReady ? 'Ready' : 'Loading...'}
          </span>
        </div>

        <div className="control-group">
          <input
            type="checkbox"
            checked={enableSounds}
            onChange={(e) => setEnableSounds(e.target.checked)}
            id="enableSounds"
            className="control-checkbox"
          />
          <label htmlFor="enableSounds">Enable Sounds</label>
        </div>

        <div className="control-group">
          <input
            type="checkbox"
            checked={enableArrows}
            onChange={(e) => setEnableArrows(e.target.checked)}
            id="enableArrows"
            className="control-checkbox"
          />
          <label htmlFor="enableArrows">Enable Arrows</label>
        </div>

        <div className="control-group">
          <input
            type="checkbox"
            checked={enableHighlights}
            onChange={(e) => setEnableHighlights(e.target.checked)}
            id="enableHighlights"
            className="control-checkbox"
          />
          <label htmlFor="enableHighlights">Enable Highlights</label>
        </div>
      </div>
      {controlsOpen && <div className="controls-overlay" onClick={() => setControlsOpen(false)} />}

      <div className="board-container">
        <ChessBoard
          ref={chessBoardRef}
          flipped={flipped}
          whiteIsHuman={!whiteAi}
          blackIsHuman={!blackAi}
          onPositionChange={handlePositionChange}
          onError={handleError}
          enablePreMoves={enablePreMoves}
          autoPromotionPiece={autoPromotionPiece}
          showCoordinates={showCoordinates}
          animationDuration={animationDuration}
          enableAnimations={enableAnimations}
          enableSounds={enableSounds}
          enableArrows={enableArrows}
          enableHighlights={enableHighlights}
        />
      </div>
    </div>
  );
}

export default App;
