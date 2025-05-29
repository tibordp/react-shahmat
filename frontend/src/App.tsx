import React from 'react';
import './App.css';
import { ChessBoard } from './components/ChessBoard';

function App() {
  const [flipped, setFlipped] = React.useState(false);

  return (
    <div className="App">
      <button onClick={() => setFlipped(!flipped)}>
        Flip Board
      </button>
      <div className="board-container">
        <ChessBoard flipped={flipped} />
      </div>
    </div>
  );
}

export default App;
