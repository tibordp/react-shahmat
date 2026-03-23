import React from 'react';
import { ChessBoard, useChessGame, toFigurine } from 'react-shahmat';

// Browse through a game's move history without affecting the live game.
// Uses the readonly prop to prevent interaction while viewing past positions.

export const SOURCE = `import React from 'react';
import { ChessBoard, useChessGame, toFigurine } from 'react-shahmat';

function HistoryNavigation() {
  const game = useChessGame();
  const [viewPly, setViewPly] = React.useState<number | null>(null);

  // Resolve historical position
  const viewedEntry = viewPly !== null && viewPly > 0
    ? game.history[viewPly - 1] : undefined;
  const viewedFen = viewPly === 0
    ? game.engine.getFenHistory()[0]
    : viewedEntry?.fen;

  return (
    <div>
      <ChessBoard
        {...game.boardProps}
        {...(viewPly !== null ? {
          position: viewedFen || game.boardProps.position,
          lastMove: viewedEntry?.move,
          validMoves: undefined,
        } : {})}
        readonly={viewPly !== null}
      />
      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        <button onClick={() => setViewPly(0)}>|&lt;</button>
        <button onClick={() => {
          const cur = viewPly ?? game.history.length;
          if (cur > 0) setViewPly(cur - 1);
        }}>&lt;</button>
        <button onClick={() => {
          if (viewPly !== null) {
            setViewPly(viewPly + 1 >= game.history.length
              ? null : viewPly + 1);
          }
        }}>&gt;</button>
        <button onClick={() => setViewPly(null)}>&gt;|</button>
      </div>
      <div style={{ marginTop: 4 }}>
        {game.history.map((e, i) => (
          <span key={i} onClick={() => setViewPly(i + 1)}
            style={{ cursor: 'pointer', fontWeight: viewPly === i + 1 ? 700 : 400 }}>
            {i % 2 === 0 ? \`\${Math.floor(i/2)+1}. \` : ''}
            {toFigurine(e.algebraic)}{' '}
          </span>
        ))}
      </div>
    </div>
  );
}`;

export const TITLE = 'History Navigation';
export const DESCRIPTION =
  'Browse past positions without affecting the live game. The readonly prop adds a translucent overlay and disables interaction. Use game.history for the move list with figurine algebraic notation.';

export default function HistoryNavigation() {
  const game = useChessGame();
  const [viewPly, setViewPly] = React.useState<number | null>(null);

  const viewedEntry =
    viewPly !== null && viewPly > 0 ? game.history[viewPly - 1] : undefined;
  const viewedFen =
    viewPly === 0 ? game.engine.getFenHistory()[0] : viewedEntry?.fen;

  const boardProps =
    viewPly !== null
      ? {
          ...game.boardProps,
          position: viewedFen || game.boardProps.position,
          lastMove: viewedEntry?.move,
          validMoves: undefined as any,
        }
      : game.boardProps;

  return (
    <div>
      <ChessBoard {...boardProps} readonly={viewPly !== null} />
      <div
        style={{
          display: 'flex',
          gap: 4,
          justifyContent: 'center',
          marginTop: 8,
        }}
      >
        <button
          onClick={() => setViewPly(0)}
          disabled={game.history.length === 0}
        >
          |&lt;
        </button>
        <button
          onClick={() => {
            const cur = viewPly ?? game.history.length;
            if (cur > 0) setViewPly(cur - 1);
          }}
          disabled={game.history.length === 0}
        >
          &lt;
        </button>
        <button
          onClick={() => {
            if (viewPly !== null) {
              setViewPly(
                viewPly + 1 >= game.history.length ? null : viewPly + 1
              );
            }
          }}
          disabled={viewPly === null}
        >
          &gt;
        </button>
        <button onClick={() => setViewPly(null)} disabled={viewPly === null}>
          &gt;|
        </button>
      </div>
      <div
        style={{ marginTop: 8, fontSize: 14, lineHeight: 1.8, color: '#ccc' }}
      >
        {game.history.length === 0 && (
          <span style={{ color: '#666' }}>Play some moves to see history</span>
        )}
        {game.history.map((e, i) => (
          <span
            key={i}
            onClick={() => setViewPly(i + 1)}
            style={{
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: 3,
              fontWeight: viewPly === i + 1 ? 700 : 400,
              background: viewPly === i + 1 ? '#4caf50' : 'transparent',
              color: viewPly === i + 1 ? '#fff' : '#ccc',
            }}
          >
            {i % 2 === 0 ? `${Math.floor(i / 2) + 1}.\u00A0` : ''}
            {toFigurine(e.algebraic)}{' '}
          </span>
        ))}
      </div>
    </div>
  );
}
