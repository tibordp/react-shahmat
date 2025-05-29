import React, { useCallback, useRef, useState, useEffect } from 'react';

interface DragState {
  isDragging: boolean;
  dragOffset: { x: number; y: number } | null;
  dragStartPos: { x: number; y: number } | null;
}

interface UseDragOptions {
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragMove?: (offset: { x: number; y: number }) => void;
}

export const useCustomDrag = (options: UseDragOptions = {}) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragOffset: null,
    dragStartPos: null,
  });

  const dragRef = useRef<HTMLElement | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const startPos = {
      x: e.clientX,
      y: e.clientY,
    };
    
    startPosRef.current = startPos;
    
    setDragState({
      isDragging: true,
      dragOffset: { x: 0, y: 0 },
      dragStartPos: startPos,
    });
    
    options.onDragStart?.();
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
  }, [options]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !startPosRef.current) return;
    
    const offset = {
      x: e.clientX - startPosRef.current.x,
      y: e.clientY - startPosRef.current.y,
    };
    
    setDragState(prev => ({
      ...prev,
      dragOffset: offset,
    }));
    
    options.onDragMove?.(offset);
  }, [dragState.isDragging, options]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging) return;
    
    setDragState({
      isDragging: false,
      dragOffset: null,
      dragStartPos: null,
    });
    
    startPosRef.current = null;
    
    // Restore normal behavior
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    
    options.onDragEnd?.();
  }, [dragState.isDragging, options]);

  // Global mouse event listeners
  const attachGlobalListeners = useCallback(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mouseleave', handleMouseUp); // Handle mouse leaving window
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  // Attach/detach global listeners when drag state changes
  useEffect(() => {
    const cleanup = attachGlobalListeners();
    return cleanup;
  }, [attachGlobalListeners]);

  return {
    dragState,
    dragHandlers: {
      onMouseDown: handleMouseDown,
    },
    dragRef,
  };
};