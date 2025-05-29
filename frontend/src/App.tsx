import React from 'react';
import './App.css';
import { ChessBoard } from './components/ChessBoard';
import { GameState, Move, ChessError, PieceType, ChessBoardRef } from './engine/jsChessEngine';

function App() {
  const [flipped, setFlipped] = React.useState(false);
  const [enablePreMoves, setEnablePreMoves] = React.useState(true);
  const [blackAi, setBlackAi] = React.useState(true);
  const [whiteAi, setWhiteAi] = React.useState(false);
  const [autoPromotionPiece, setAutoPromotionPiece] = React.useState<PieceType | undefined>(undefined);
  const chessBoardRef = React.useRef<ChessBoardRef>(null);

  const handleQuoteUnquoteAiMove = React.useCallback(async (gameState: GameState, opponentMove?: Move): Promise<Move> => {
    // Add a small delay to simulate thinking time
    await new Promise(resolve => setTimeout(resolve, 500));

    // Pick a random legal move (includes all promotion options)
    const validMoves = gameState.validMoves;
    if (validMoves.length === 0) {
      throw new Error('No legal moves available');
    }

    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return validMoves[randomIndex];
  }, []);

  const handleError = React.useCallback((error: ChessError) => {
    console.error('Chess engine error:', error);
  }, []);

  const handleReset = React.useCallback(() => {
    chessBoardRef.current?.resetGame();
  }, []);

  return (
    <div className="App">
      <h1>Chess Board Demo</h1>

      <div className="controls-panel">
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
      </div>

      <div className="board-container">
        <ChessBoard
          ref={chessBoardRef}
          flipped={flipped}
          onBlackMove={blackAi ? handleQuoteUnquoteAiMove : undefined}
          onWhiteMove={whiteAi ? handleQuoteUnquoteAiMove : undefined}
          onError={handleError}
          disablePreMoves={!enablePreMoves}
          autoPromotionPiece={autoPromotionPiece}
        />
      </div>
    </div>
  );
}

export default App;
