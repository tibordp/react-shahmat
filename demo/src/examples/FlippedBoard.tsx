import React from 'react';
import { ChessBoard, useChessGame } from 'react-shahmat';

// Toggle the board orientation between white and black perspective.

export const SOURCE = `import React from 'react';
import { ChessBoard, useChessGame } from 'react-shahmat';

function FlippedBoard() {
  const game = useChessGame();
  const [orientation, setOrientation] = React.useState<'white' | 'black'>('white');

  return (
    <div>
      <ChessBoard {...game.boardProps} orientation={orientation} />
      <button onClick={() => setOrientation(o => o === 'white' ? 'black' : 'white')}>
        Flip Board
      </button>
    </div>
  );
}`;

export const TITLE = 'Flipped Board';
export const DESCRIPTION = 'Toggle between white and black perspective using the orientation prop.';

export default function FlippedBoard() {
  const game = useChessGame();
  const [orientation, setOrientation] = React.useState<'white' | 'black'>('white');

  return (
    <div>
      <ChessBoard {...game.boardProps} orientation={orientation} />
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <button
          onClick={() => setOrientation(o => o === 'white' ? 'black' : 'white')}
          style={{
            background: '#4caf50', color: 'white', border: 'none',
            borderRadius: 6, padding: '8px 16px', cursor: 'pointer',
          }}
        >
          Flip Board ({orientation === 'white' ? 'White' : 'Black'})
        </button>
      </div>
    </div>
  );
}
