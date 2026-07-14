// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { ChessBoard, useChessGame } from '../src/index';
import type { UseChessGameOptions, UseChessGameReturn } from '../src/index';
import type { ChessBoardProps } from '../src/components/ChessBoard';

beforeAll(() => {
  // jsdom has no ResizeObserver (only used in responsive sizing mode)
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(cleanup);

/** Full-integration harness: useChessGame + ChessBoard via the public API. */
function TestGame({
  options,
  board,
  onGame,
}: {
  options?: UseChessGameOptions;
  board?: Partial<ChessBoardProps>;
  onGame?: (game: UseChessGameReturn) => void;
}) {
  const game = useChessGame(options);
  useEffect(() => {
    onGame?.(game);
  });
  return (
    <ChessBoard
      {...game.boardProps}
      size={480}
      enableAnimations={false}
      {...board}
    />
  );
}

function square(name: string) {
  // Labels are "e4" (empty) or "e4, white pawn"
  return screen.getByRole('button', { name: new RegExp(`^${name}(,|$)`) });
}

function board() {
  return screen.getByRole('group', { name: 'Chess board' });
}

describe('rendering', () => {
  it('renders 64 labelled squares with the initial position', () => {
    render(<TestGame />);
    const squares = screen.getAllByRole('button', {
      name: /^[a-h][1-8](,|$)/,
    });
    expect(squares).toHaveLength(64);
    expect(square('e2')).toHaveAccessibleName('e2, white pawn');
    expect(square('e8')).toHaveAccessibleName('e8, black king');
    expect(square('e4')).toHaveAccessibleName('e4');
  });

  it('flips square order for black orientation', () => {
    const { rerender } = render(<TestGame />);
    let squares = screen.getAllByRole('button', { name: /^[a-h][1-8](,|$)/ });
    expect(squares[0]).toHaveAccessibleName(/^a8/);
    rerender(<TestGame board={{ orientation: 'black' }} />);
    squares = screen.getAllByRole('button', { name: /^[a-h][1-8](,|$)/ });
    expect(squares[0]).toHaveAccessibleName(/^h1/);
  });

  it('numeric size prop is reactive', () => {
    const { rerender } = render(<TestGame board={{ size: 400 }} />);
    expect(board().style.width).toBe('400px');
    rerender(<TestGame board={{ size: 500 }} />);
    expect(board().style.width).toBe('500px');
  });
});

describe('click moves', () => {
  it('selects a piece and moves it', async () => {
    const user = userEvent.setup();
    render(<TestGame />);
    await user.click(square('e2'));
    expect(square('e2')).toHaveAttribute('aria-pressed', 'true');
    await user.click(square('e4'));
    expect(square('e4')).toHaveAccessibleName('e4, white pawn');
    expect(square('e2')).toHaveAccessibleName('e2');
    // Turn switched — black can now move
    await user.click(square('e7'));
    await user.click(square('e5'));
    expect(square('e5')).toHaveAccessibleName('e5, black pawn');
  });

  it('clicking the selected square deselects it', async () => {
    const user = userEvent.setup();
    render(<TestGame />);
    await user.click(square('e2'));
    await user.click(square('e2'));
    expect(square('e2')).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not move to an illegal destination', async () => {
    const user = userEvent.setup();
    render(<TestGame />);
    await user.click(square('e2'));
    await user.click(square('e6'));
    expect(square('e6')).toHaveAccessibleName('e6');
    expect(square('e2')).toHaveAccessibleName('e2, white pawn');
  });
});

describe('keyboard interaction', () => {
  it('plays a move with arrow keys and Enter', () => {
    render(<TestGame />);
    const b = board();
    b.focus();
    // First arrow initializes the cursor at e1, then step to e2
    fireEvent.keyDown(b, { key: 'ArrowUp' });
    fireEvent.keyDown(b, { key: 'ArrowUp' });
    fireEvent.keyDown(b, { key: 'Enter' });
    expect(square('e2')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(b, { key: 'ArrowUp' });
    fireEvent.keyDown(b, { key: 'ArrowUp' });
    fireEvent.keyDown(b, { key: 'Enter' });
    expect(square('e4')).toHaveAccessibleName('e4, white pawn');
  });

  it('tracks the cursor via aria-activedescendant', () => {
    render(<TestGame />);
    const b = board();
    b.focus();
    fireEvent.keyDown(b, { key: 'ArrowUp' });
    const id = b.getAttribute('aria-activedescendant');
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)).toHaveAccessibleName(/^e[12]/);
  });

  it('hides the focus cursor on pointer interaction and restores it on keyboard input', async () => {
    const user = userEvent.setup();
    render(<TestGame />);
    const b = board();
    b.focus();
    fireEvent.keyDown(b, { key: 'ArrowUp' });
    expect(b.getAttribute('aria-activedescendant')).toBeTruthy();

    // Playing with the mouse must not leave a keyboard cursor on the board
    await user.click(square('d2'));
    expect(b.getAttribute('aria-activedescendant')).toBeNull();

    // The next keyboard input brings the cursor back at the clicked square
    fireEvent.keyDown(b, { key: 'ArrowUp' });
    const id = b.getAttribute('aria-activedescendant');
    expect(document.getElementById(id!)).toHaveAccessibleName(/^d3/);
  });

  it('Escape clears the selection', () => {
    render(<TestGame />);
    const b = board();
    b.focus();
    fireEvent.keyDown(b, { key: 'ArrowUp' });
    fireEvent.keyDown(b, { key: 'ArrowUp' });
    fireEvent.keyDown(b, { key: 'Enter' });
    expect(square('e2')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(b, { key: 'Escape' });
    expect(square('e2')).toHaveAttribute('aria-pressed', 'false');
  });

  it('announces the last move to screen readers', async () => {
    const user = userEvent.setup();
    const { container } = render(<TestGame />);
    await user.click(square('e2'));
    await user.click(square('e4'));
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).toHaveTextContent('white pawn from e2 to e4');
  });
});

const PROMOTION_FEN = '4k3/P7/8/8/8/8/8/4K3 w - - 0 1';

describe('promotion dialog', () => {
  it('opens as a modal dialog with focus on the first choice', async () => {
    const user = userEvent.setup();
    render(<TestGame options={{ initialFen: PROMOTION_FEN }} />);
    await user.click(square('a7'));
    await user.click(square('a8'));

    const dialog = screen.getByRole('dialog', { name: 'Promote white pawn' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const buttons = screen.getAllByRole('button', { name: /^Promote to/ });
    expect(buttons).toHaveLength(4);
    expect(buttons[0]).toHaveFocus();
  });

  it('navigates choices with arrow keys (wrapping), Tab is inert', async () => {
    const user = userEvent.setup();
    render(<TestGame options={{ initialFen: PROMOTION_FEN }} />);
    await user.click(square('a7'));
    await user.click(square('a8'));

    const buttons = screen.getAllByRole('button', { name: /^Promote to/ });
    expect(buttons[0]).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(buttons[1]).toHaveFocus();
    await user.keyboard('{ArrowUp}{ArrowUp}'); // wraps to the last
    expect(buttons[3]).toHaveFocus();
    await user.keyboard('{ArrowDown}'); // wraps back to the first
    expect(buttons[0]).toHaveFocus();

    // The picker is a single composite widget — Tab does not move focus
    await user.keyboard('{Tab}');
    expect(buttons[0]).toHaveFocus();
  });

  it('selects the focused choice with Enter', async () => {
    const user = userEvent.setup();
    render(<TestGame options={{ initialFen: PROMOTION_FEN }} />);
    await user.click(square('a7'));
    await user.click(square('a8'));

    await user.keyboard('{ArrowDown}'); // queen -> rook
    await user.keyboard('{Enter}');
    expect(square('a8')).toHaveAccessibleName('a8, white rook');
  });

  it('completes an underpromotion', async () => {
    const user = userEvent.setup();
    render(<TestGame options={{ initialFen: PROMOTION_FEN }} />);
    await user.click(square('a7'));
    await user.click(square('a8'));
    await user.click(
      screen.getByRole('button', { name: 'Promote to white knight' })
    );
    expect(square('a8')).toHaveAccessibleName('a8, white knight');
  });

  it('Escape cancels without moving and the board stays inert behind it', async () => {
    const user = userEvent.setup();
    render(<TestGame options={{ initialFen: PROMOTION_FEN }} />);
    await user.click(square('a7'));
    await user.click(square('a8'));

    // Board keyboard handling must not react while the dialog is open
    const b = board();
    const before = b.getAttribute('aria-activedescendant');
    fireEvent.keyDown(b, { key: 'ArrowUp' });
    expect(b.getAttribute('aria-activedescendant')).toBe(before);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(square('a7')).toHaveAccessibleName('a7, white pawn');
    expect(square('a8')).toHaveAccessibleName('a8');
  });

  it('Escape does not flip the board into keyboard mode after a mouse flow', async () => {
    const user = userEvent.setup();
    render(<TestGame options={{ initialFen: PROMOTION_FEN }} />);
    await user.click(square('a7'));
    await user.click(square('a8'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Focus was restored to the board, but no keyboard cursor appears
    expect(board().getAttribute('aria-activedescendant')).toBeNull();
    expect(document.querySelector('[class*="focus-cursor"]')).toBeNull();
  });

  it('buttons stay accessibly named with a custom renderPiece', async () => {
    const user = userEvent.setup();
    render(
      <TestGame
        options={{ initialFen: PROMOTION_FEN }}
        board={{ renderPiece: () => <span>♟</span> }}
      />
    );
    await user.click(square('a7'));
    await user.click(square('a8'));
    expect(
      screen.getByRole('button', { name: 'Promote to white queen' })
    ).toBeInTheDocument();
  });
});

describe('premoves', () => {
  it('queues a premove, shows it visually, and executes it after the opponent moves', async () => {
    const user = userEvent.setup();
    let game: UseChessGameReturn | undefined;
    render(
      <TestGame board={{ enablePremoves: true }} onGame={g => (game = g)} />
    );

    // White plays e4; it is now black's turn
    await user.click(square('e2'));
    await user.click(square('e4'));

    // Queue a white premove Ng1-f3 while black is to move
    await user.click(square('g1'));
    await user.click(square('f3'));
    expect(square('f3')).toHaveAccessibleName('f3, white knight'); // visual only
    expect(game!.getGameState().fen).toContain(' b '); // not actually played

    // Black moves — the premove executes
    act(() => {
      game!.makeMove({ from: 'e7', to: 'e5' });
    });
    expect(square('f3')).toHaveAccessibleName('f3, white knight');
    expect(game!.getGameState().fen).toContain(' b '); // black to move again
  });

  it('right-click cancels a queued premove', async () => {
    const user = userEvent.setup();
    render(<TestGame board={{ enablePremoves: true }} />);
    await user.click(square('e2'));
    await user.click(square('e4'));
    await user.click(square('g1'));
    await user.click(square('f3'));
    expect(square('f3')).toHaveAccessibleName('f3, white knight');

    const target = square('c6');
    fireEvent.mouseDown(target, { button: 2 });
    fireEvent.mouseUp(target, { button: 2 });
    expect(square('f3')).toHaveAccessibleName('f3');
    expect(square('g1')).toHaveAccessibleName('g1, white knight');
  });
});

describe('keyboard navigation opt-out', () => {
  const FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  it('interactive boards are focusable by default', () => {
    render(<TestGame />);
    expect(board()).toHaveAttribute('tabindex', '0');
  });

  it('static diagrams (no move handlers) stay out of the Tab order', () => {
    render(<ChessBoard position={FEN} size={480} />);
    const b = board();
    expect(b).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(b, { key: 'ArrowUp' });
    expect(b.getAttribute('aria-activedescendant')).toBeNull();
  });

  it('readonly boards stay out of the Tab order', () => {
    render(<TestGame board={{ readonly: true }} />);
    expect(board()).toHaveAttribute('tabindex', '-1');
  });

  it('enableKeyboardNavigation={false} opts an interactive board out', () => {
    render(<TestGame board={{ enableKeyboardNavigation: false }} />);
    const b = board();
    expect(b).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(b, { key: 'ArrowUp' });
    expect(b.getAttribute('aria-activedescendant')).toBeNull();
  });

  it('enableKeyboardNavigation={true} forces a static board into the Tab order', () => {
    render(
      <ChessBoard position={FEN} size={480} enableKeyboardNavigation={true} />
    );
    expect(board()).toHaveAttribute('tabindex', '0');
  });
});

describe('uncontrolled annotations', () => {
  it('right-click toggles a highlight when enableHighlights is set', () => {
    render(<TestGame board={{ enableHighlights: true }} />);
    const target = square('h6');
    fireEvent.mouseDown(target, { button: 2 });
    fireEvent.mouseUp(target, { button: 2 });
    expect(target.className).toMatch(/highlighted/);
    fireEvent.mouseDown(target, { button: 2 });
    fireEvent.mouseUp(target, { button: 2 });
    expect(target.className).not.toMatch(/highlighted/);
  });
});
