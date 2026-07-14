// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import {
  ChessBoard,
  BoardDndProvider,
  SparePiece,
  fenToPieceArray,
  pieceArrayToFen,
  PieceType,
  Color,
} from '../src/index';

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(cleanup);

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function square(name: string) {
  return screen.getByRole('button', { name: new RegExp(`^${name}(,|$)`) });
}

function board() {
  return screen.getByRole('group', { name: 'Chess board' });
}

describe('pieceArrayToFen', () => {
  it('round-trips the start position', () => {
    expect(pieceArrayToFen(fenToPieceArray(START))).toBe(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1'
    );
  });

  it('serializes an empty board', () => {
    const empty = fenToPieceArray('8/8/8/8/8/8/8/8 w - - 0 1');
    expect(pieceArrayToFen(empty)).toBe('8/8/8/8/8/8/8/8 w - - 0 1');
  });

  it('run-length-encodes sparse ranks', () => {
    const board = fenToPieceArray('8/8/8/3qK3/8/8/8/8 w - - 0 1');
    expect(pieceArrayToFen(board)).toBe('8/8/8/3qK3/8/8/8/8 w - - 0 1');
  });

  it('emits the requested turn color', () => {
    const empty = fenToPieceArray('8/8/8/8/8/8/8/8 w - - 0 1');
    expect(pieceArrayToFen(empty, 'black')).toBe('8/8/8/8/8/8/8/8 b - - 0 1');
  });
});

describe('SparePiece', () => {
  it('renders with an accessible name inside BoardDndProvider', () => {
    render(
      <BoardDndProvider>
        <SparePiece piece={{ type: PieceType.Queen, color: Color.White }} />
      </BoardDndProvider>
    );
    expect(
      screen.getByRole('img', { name: 'white queen' })
    ).toBeInTheDocument();
  });

  it('respects a custom renderPiece', () => {
    render(
      <BoardDndProvider>
        <SparePiece
          piece={{ type: PieceType.Knight, color: Color.Black }}
          renderPiece={(piece, size) => (
            <span data-testid='custom'>{`${piece.type}-${size}`}</span>
          )}
          size={48}
        />
      </BoardDndProvider>
    );
    expect(screen.getByTestId('custom')).toHaveTextContent('2-48');
    expect(
      screen.getByRole('img', { name: 'black knight' })
    ).toBeInTheDocument();
  });
});

describe('ambient DnD provider', () => {
  it('a board inside BoardDndProvider renders without a nested-provider crash', () => {
    render(
      <BoardDndProvider>
        <ChessBoard position={START} size={480} />
      </BoardDndProvider>
    );
    expect(
      screen.getAllByRole('button', { name: /^[a-h][1-8](,|$)/ })
    ).toHaveLength(64);
  });

  it('two boards share one ambient provider', () => {
    render(
      <BoardDndProvider>
        <ChessBoard position={START} size={480} />
        <ChessBoard position={START} size={480} />
      </BoardDndProvider>
    );
    expect(screen.getAllByRole('group', { name: 'Chess board' })).toHaveLength(
      2
    );
  });
});

describe('freeMove', () => {
  function renderEditor(
    overrides: Partial<React.ComponentProps<typeof ChessBoard>> = {}
  ) {
    const onMove = vi.fn();
    render(
      <ChessBoard
        position={START}
        freeMove
        onMove={onMove}
        size={480}
        enableAnimations={false}
        {...overrides}
      />
    );
    return onMove;
  }

  it('click-moves any piece to any square, ignoring legality', async () => {
    const user = userEvent.setup();
    const onMove = renderEditor();
    await user.click(square('e2'));
    expect(square('e2')).toHaveAttribute('aria-pressed', 'true');
    await user.click(square('e5')); // not a legal pawn move — allowed
    expect(onMove).toHaveBeenCalledWith({ from: 'e2', to: 'e5' });
  });

  it('moves the non-turn color too', async () => {
    const user = userEvent.setup();
    const onMove = renderEditor();
    await user.click(square('e7')); // black piece, white "to move"
    await user.click(square('e5'));
    expect(onMove).toHaveBeenCalledWith({ from: 'e7', to: 'e5' });
  });

  it('moves onto occupied squares (replace semantics)', async () => {
    const user = userEvent.setup();
    const onMove = renderEditor();
    await user.click(square('d1'));
    await user.click(square('d8'));
    expect(onMove).toHaveBeenCalledWith({ from: 'd1', to: 'd8' });
  });

  it('same-square click deselects without firing', async () => {
    const user = userEvent.setup();
    const onMove = renderEditor();
    await user.click(square('e2'));
    await user.click(square('e2'));
    expect(square('e2')).toHaveAttribute('aria-pressed', 'false');
    expect(onMove).not.toHaveBeenCalled();
  });

  it('skips the promotion dialog for pawn moves to the last rank', async () => {
    const user = userEvent.setup();
    const onMove = renderEditor({ position: '8/P7/8/8/8/8/8/8 w - - 0 1' });
    await user.click(square('a7'));
    await user.click(square('a8'));
    expect(onMove).toHaveBeenCalledWith({ from: 'a7', to: 'a8' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is inert when readonly', async () => {
    const user = userEvent.setup();
    const onMove = renderEditor({ readonly: true });
    await user.click(square('e2'));
    await user.click(square('e5'));
    expect(onMove).not.toHaveBeenCalled();
  });

  it('works with the keyboard (arrows + Enter)', () => {
    const onMove = renderEditor();
    const b = board();
    b.focus();
    fireEvent.keyDown(b, { key: 'ArrowUp' }); // cursor e1
    fireEvent.keyDown(b, { key: 'ArrowUp' }); // e2
    fireEvent.keyDown(b, { key: 'Enter' }); // select
    expect(square('e2')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(b, { key: 'ArrowUp' }); // e3
    fireEvent.keyDown(b, { key: 'ArrowUp' }); // e4
    fireEvent.keyDown(b, { key: 'ArrowUp' }); // e5
    fireEvent.keyDown(b, { key: 'Enter' }); // move
    expect(onMove).toHaveBeenCalledWith({ from: 'e2', to: 'e5' });
  });
});
