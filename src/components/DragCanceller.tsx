import React, { useCallback } from 'react';
import { useDragDropManager } from 'react-dnd';

/** Provides a programmatic drag cancel function via ref. Must be rendered
 *  inside DndProvider. */
export function DragCanceller({
  cancelRef,
}: {
  cancelRef: React.RefObject<() => void>;
}) {
  const manager = useDragDropManager();
  cancelRef.current = useCallback(() => {
    if (manager.getMonitor().isDragging()) {
      manager.dispatch({ type: 'dnd-core/END_DRAG' });
    }
  }, [manager]);
  return null;
}
