import React from 'react';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { createDragDropManager } from 'dnd-core';
import type { DragDropManager } from 'dnd-core';

let sharedManager: DragDropManager | undefined;

/**
 * Lazily-created drag-and-drop manager shared by every ChessBoard and
 * SparePiece on the page.
 *
 * We deliberately bypass react-dnd's built-in global singleton
 * (DndProvider without a `manager` prop): that singleton is torn down when
 * its provider refcount transiently hits zero — which happens during route
 * transitions when pages with boards are swapped — and the next render then
 * creates a second manager while the first still has live drag sources,
 * crashing with "Cannot have two Touch backends at the same time". Owning
 * the manager ourselves makes the context stable for the page's lifetime;
 * the underlying backend still attaches/detaches its window listeners
 * automatically based on whether any drag sources are registered.
 */
export function getSharedDndManager(): DragDropManager {
  if (!sharedManager) {
    sharedManager = createDragDropManager(
      TouchBackend,
      typeof window !== 'undefined' ? window : undefined,
      { enableMouseEvents: true }
    );
  }
  return sharedManager;
}

/**
 * Shared drag-and-drop context for composing ChessBoard with external drag
 * sources such as SparePiece (position editors, custom palettes). ChessBoard
 * detects the ambient context and skips creating its own provider, so pieces
 * can be dragged between the palette and the board.
 *
 * Uses the same backend configuration as the board itself (touch backend
 * with mouse events enabled).
 */
export function BoardDndProvider({ children }: { children: React.ReactNode }) {
  return <DndProvider manager={getSharedDndManager()}>{children}</DndProvider>;
}
