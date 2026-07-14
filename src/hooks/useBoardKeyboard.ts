import { useCallback, useRef, useState } from 'react';
import { Position } from '../engine/chessRules';

export interface UseBoardKeyboardOptions {
  /** Board is non-interactive — ignore all keys */
  readonly: boolean;
  /** Black's perspective — arrow keys are inverted */
  flipped: boolean;
  /** A modal (promotion dialog) owns the keyboard — ignore all keys */
  suspended: boolean;
  selectedSquare: Position | null;
  clearSelection: () => void;
  hasPremoves: boolean;
  clearPremoves: () => void;
  /** Activate the cursor square (same semantics as a left click) */
  onActivateSquare: (file: number, rank: number) => void;
}

export interface UseBoardKeyboardReturn {
  /** Square the keyboard cursor is on, if any */
  focusedSquare: Position | null;
  /** True while the board has keyboard-visible focus (show the cursor) */
  keyboardActive: boolean;
  /** Move the cursor (used to keep it in sync with mouse clicks) */
  syncCursor: (file: number, rank: number) => void;
  /**
   * Ignore the next focus event for cursor activation. Used when a modal
   * (promotion dialog) closes and programmatically restores focus to the
   * board — that restore must not flip the board into keyboard mode.
   */
  suppressNextFocusActivation: () => void;
  handlers: {
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    onFocus: (e: React.FocusEvent<HTMLDivElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLDivElement>) => void;
    onPointerDown: () => void;
  };
}

/**
 * Keyboard interaction for the board: arrow keys move a focus cursor
 * (respecting orientation), Enter/Space acts like a click on the cursor
 * square, Escape dismisses selection then premoves. Handled keys are fully
 * consumed (preventDefault + stopPropagation) so host-page hotkeys — e.g.
 * arrow-key history navigation — don't double-fire while the board is
 * focused.
 */
export function useBoardKeyboard(
  options: UseBoardKeyboardOptions
): UseBoardKeyboardReturn {
  const {
    readonly,
    flipped,
    suspended,
    selectedSquare,
    clearSelection,
    hasPremoves,
    clearPremoves,
    onActivateSquare,
  } = options;

  const [focusedSquare, setFocusedSquare] = useState<Position | null>(null);
  const [keyboardActive, setKeyboardActive] = useState(false);
  const suppressFocusRef = useRef(false);

  const startSquare = useCallback(
    (): Position => ({ file: 4, rank: flipped ? 7 : 0 }), // e1 / e8
    [flipped]
  );

  const syncCursor = useCallback((file: number, rank: number) => {
    setFocusedSquare({ file, rank });
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (readonly || suspended) return;

      const moveCursor = (df: number, dr: number) => {
        e.preventDefault();
        e.stopPropagation();
        setKeyboardActive(true);
        setFocusedSquare(prev => {
          if (!prev) return startSquare();
          return {
            file: Math.min(7, Math.max(0, prev.file + (flipped ? -df : df))),
            rank: Math.min(7, Math.max(0, prev.rank + (flipped ? -dr : dr))),
          };
        });
      };

      switch (e.key) {
        case 'ArrowUp':
          moveCursor(0, 1);
          break;
        case 'ArrowDown':
          moveCursor(0, -1);
          break;
        case 'ArrowLeft':
          moveCursor(-1, 0);
          break;
        case 'ArrowRight':
          moveCursor(1, 0);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          e.stopPropagation();
          setKeyboardActive(true);
          if (focusedSquare) {
            onActivateSquare(focusedSquare.file, focusedSquare.rank);
          } else {
            setFocusedSquare(startSquare());
          }
          break;
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          if (selectedSquare) {
            clearSelection();
          } else if (hasPremoves) {
            clearPremoves();
          }
          break;
      }
    },
    [
      readonly,
      suspended,
      flipped,
      focusedSquare,
      onActivateSquare,
      selectedSquare,
      clearSelection,
      hasPremoves,
      clearPremoves,
      startSquare,
    ]
  );

  const suppressNextFocusActivation = useCallback(() => {
    suppressFocusRef.current = true;
  }, []);

  // Only show the focus cursor for keyboard-driven focus (Tab), not clicks.
  const onFocus = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (suppressFocusRef.current) {
        suppressFocusRef.current = false;
        return;
      }
      let focusVisible = true;
      try {
        focusVisible = e.currentTarget.matches(':focus-visible');
      } catch {
        // Older browsers without :focus-visible — always show the cursor
      }
      if (focusVisible) {
        setKeyboardActive(true);
        setFocusedSquare(prev => prev ?? startSquare());
      }
    },
    [startSquare]
  );

  const onBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    setKeyboardActive(false);
  }, []);

  // The cursor is strictly a keyboard affordance: any pointer interaction
  // hides it (mirroring :focus-visible semantics), and the next keyboard
  // input brings it back — at the position mouse clicks kept in sync.
  const onPointerDown = useCallback(() => {
    setKeyboardActive(false);
  }, []);

  return {
    focusedSquare,
    keyboardActive,
    syncCursor,
    suppressNextFocusActivation,
    handlers: { onKeyDown, onFocus, onBlur, onPointerDown },
  };
}
