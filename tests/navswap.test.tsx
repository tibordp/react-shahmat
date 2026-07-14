// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { ChessBoard, BoardDndProvider } from '../src/index';

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function Playground() {
  return <ChessBoard position={START} size={480} />;
}

function Examples() {
  return (
    <>
      <ChessBoard position={START} size={480} />
      <ChessBoard position={START} size={480} />
      <BoardDndProvider>
        <ChessBoard position={START} size={480} />
      </BoardDndProvider>
    </>
  );
}

describe('page swaps with multiple boards', () => {
  it("never engages react-dnd's fragile global singleton", () => {
    // react-dnd's refcounted global singleton is torn down when its provider
    // refcount transiently hits zero during route swaps, after which a second
    // manager (and second touch backend) gets created → crash. The library
    // must always pass an explicit shared manager instead, leaving the
    // singleton slot untouched.
    const INSTANCE_SYM = Symbol.for('__REACT_DND_CONTEXT_INSTANCE__');
    const { rerender } = render(<Playground />);
    rerender(<Examples />);
    rerender(<Examples />);
    rerender(<Playground />);
    rerender(<Examples />);
    expect(
      (window as unknown as Record<symbol, unknown>)[INSTANCE_SYM]
    ).toBeUndefined();
    expect(
      document.querySelectorAll('[role="group"][aria-label="Chess board"]')
    ).toHaveLength(3);
  });
});
