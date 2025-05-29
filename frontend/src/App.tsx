import React from 'react';
import './App.css';
import { ChessBoard } from './components/ChessBoard';
import { GameState, Move } from './engine/jsChessEngine';

function App() {
  const [flipped, setFlipped] = React.useState(false);

  const handleBlackMove = React.useCallback(async (gameState: GameState, opponentMove?: Move): Promise<Move> => {
    // Add a small delay to simulate thinking time
    await new Promise(resolve => setTimeout(resolve, 1));

    // Pick a random legal move
    const validMoves = gameState.validMoves;
    if (validMoves.length === 0) {
      throw new Error('No legal moves available');
    }

    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return validMoves[randomIndex];
  }, []);

  const handleError = React.useCallback((error: any) => {
    console.error('Chess engine error:', error);
  }, []);

  return (
    <div className="App">
      <button onClick={() => setFlipped(!flipped)}>
        Flip Board
      </button>
      <div className="board-container">
        <ChessBoard
          flipped={flipped}
          onBlackMove={handleBlackMove}
          onError={handleError}
        />
      </div>
    </div>
  );
}

export default App;
