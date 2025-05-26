import React from 'react';
import './App.css';
import { ChessBoard } from './components/ChessBoard';

function App() {
  return (
    <div className="App">
      <div className="board-container">
        <ChessBoard />
      </div>
    </div>
  );
}

export default App;
