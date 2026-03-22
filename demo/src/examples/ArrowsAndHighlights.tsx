import React from 'react';
import { ChessBoard, useChessGame } from 'react-shahmat';
import type { BoardArrow } from 'react-shahmat';

// Controlled arrows and highlights: the consumer owns the annotation state.
// Right-click drag draws arrows, right-click on a square toggles highlights.

export const SOURCE = `import React from 'react';
import { ChessBoard, useChessGame } from 'react-shahmat';
import type { BoardArrow } from 'react-shahmat';

function ArrowsAndHighlights() {
  const game = useChessGame();
  const [arrows, setArrows] = React.useState<BoardArrow[]>([]);
  const [highlights, setHighlights] = React.useState<string[]>([]);

  return (
    <ChessBoard
      {...game.boardProps}
      arrows={arrows}
      onArrowsChange={setArrows}
      highlights={highlights}
      onHighlightsChange={setHighlights}
    />
  );
}`;

export const TITLE = 'Arrows & Highlights';
export const DESCRIPTION = 'Right-click drag draws arrows, right-click a square toggles highlights. State is fully controlled — provide arrows/onArrowsChange and highlights/onHighlightsChange. Left-click clears all. Omit the props entirely to disable.';

export default function ArrowsAndHighlights() {
  const game = useChessGame();
  const [arrows, setArrows] = React.useState<BoardArrow[]>([]);
  const [highlights, setHighlights] = React.useState<string[]>([]);

  return (
    <div>
      <ChessBoard
        {...game.boardProps}
        arrows={arrows}
        onArrowsChange={setArrows}
        highlights={highlights}
        onHighlightsChange={setHighlights}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', justifyContent: 'center' }}>
        <button
          onClick={() => { setArrows([]); setHighlights([]); }}
          style={{
            background: '#555', color: '#ddd', border: '1px solid #666',
            borderRadius: 4, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
          }}
        >
          Clear All
        </button>
        <span style={{ color: '#888', fontSize: 12 }}>
          {arrows.length} arrow{arrows.length !== 1 ? 's' : ''}, {highlights.length} highlight{highlights.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
