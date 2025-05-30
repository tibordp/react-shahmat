# Chess Component Refactoring Plan

## Overview
This document outlines a focused refactoring plan to improve the chess component's architecture, prioritizing the reduction of coupling between chess game rules and UI concerns, consolidating scattered logic, and improving code organization.

## Current Architecture Issues

### Core Problems Identified
1. **Logic Scattered Across Files**: Chess rules split between `jsChessEngine.ts` and `pieceMovements.ts`
2. **Massive Component Coupling**: `ChessBoard.tsx` (1,636 lines) handles UI, game logic, animations, and input
3. **Chess Logic/UI Coupling**: UI components directly contain chess rule calculations
4. **Mixed Responsibilities**: Game state, animation state, and UI state intertwined

### Key Issues
- **ChessBoard component**: 1,636 lines with multiple responsibilities
- **Code duplication**: ~40% overlap between engine and piece movement logic  
- **UI calling chess logic**: Components making chess rule decisions
- **Animation/game coupling**: Animation logic mixed with game state management

## Refactoring Plan (7 Phases)

### Phase 1: Chess Logic Consolidation ✅ COMPLETED
**Goal**: Create single source of truth for all chess rules
**Priority**: HIGH - Eliminates core architectural duplication

#### Step 1.1: Analyze Logic Overlap ✅ COMPLETED
- **Files**: `src/engine/jsChessEngine.ts`, `src/utils/pieceMovements.ts`
- **Purpose**: Document overlapping functionality
- **Changes**:
  - ✅ Mapped functions that exist in both files (80% overlap documented)
  - ✅ Identified engine as canonical implementation
  - ✅ Documented pre-move vs regular move differences in OVERLAP_ANALYSIS.md

#### Step 1.2: Extend Chess Engine for UI Needs ✅ COMPLETED
- **File**: `src/engine/jsChessEngine.ts`
- **Purpose**: Make engine handle all chess logic needs
- **Changes**:
  - ✅ Added `getPotentialMoves()` method for pre-move calculations
  - ✅ Added `getBasicMovementPattern()` for UI queries
  - ✅ Created pattern-based internal methods supporting both use cases
  - ✅ Ensured engine can handle "what-if" scenarios for UI

#### Step 1.3: Remove Duplicate Logic ✅ COMPLETED
- **Files**: `src/utils/pieceMovements.ts`, components using it
- **Purpose**: Use single chess logic source
- **Changes**:
  - ✅ Replaced `calculateBasicPieceMovements()` calls with `engine.getPotentialMoves()`
  - ✅ Deleted `src/utils/pieceMovements.ts` (153 lines eliminated)
  - ✅ Updated ChessBoard component to use consolidated logic

### Phase 2: Component Decomposition ✅ COMPLETED
**Goal**: Break down monolithic ChessBoard into focused components
**Priority**: HIGH - Enables clearer separation of concerns

#### Step 2.1: Extract Square Component ✅ COMPLETED
- **File**: `src/components/Square.tsx`
- **Purpose**: Individual square rendering logic
- **Changes**:
  - ✅ Extracted square rendering from ChessBoard component
  - ✅ Moved piece icon rendering logic and helper functions
  - ✅ Created self-contained Square component with all dependencies
  - ✅ Cleaned up unused imports and maintained build stability

#### Step 2.2: Extract UI Overlay Components ✅ COMPLETED
- **File**: `src/components/ArrowOverlay.tsx`
- **Purpose**: Separate visual indicators from board logic
- **Changes**:
  - ✅ Extracted arrow drawing logic and ArrowComponent
  - ✅ Created ArrowOverlay component with coordinate calculation
  - ✅ Simplified ChessBoard by removing ~120 lines of arrow rendering
  - ✅ Maintained all arrow functionality with cleaner separation

#### Step 2.3: Extract Promotion Dialog ✅ COMPLETED
- **File**: `src/components/PromotionDialog.tsx`
- **Purpose**: Isolate promotion UI
- **Changes**:
  - ✅ Extracted promotion dialog component and interface
  - ✅ Created standalone dialog with position calculation logic
  - ✅ Moved piece icon rendering for promotion pieces
  - ✅ Removed ~120 lines from ChessBoard while preserving functionality

### Phase 3: Animation System Separation ✅ COMPLETED
**Goal**: Decouple animations from game logic
**Priority**: MEDIUM - Reduces complexity in game state management

#### Step 3.1: Extract Animation Hook ✅ COMPLETED
- **File**: `src/hooks/usePieceAnimations.ts`
- **Purpose**: Centralize animation logic
- **Changes**:
  - ✅ Extracted animation state management from ChessBoard
  - ✅ Created `usePieceAnimations` hook with startAnimation, interruptAnimation methods
  - ✅ Centralized animation state with pieces, startTime, moveId tracking
  - ✅ Removed animation concerns from main ChessBoard component

#### Step 3.2: Create Animation Component ✅ COMPLETED
- **File**: `src/components/PieceAnimations.tsx`
- **Purpose**: Handle piece movement animations
- **Changes**:
  - ✅ Extracted AnimatingPiece component with easing animations
  - ✅ Created PieceAnimations overlay for multiple simultaneous animations
  - ✅ Removed ~244 lines from ChessBoard (1,636 → 1,392 lines)
  - ✅ Maintained all animation functionality with cleaner separation

#### Additional Improvement: Piece Icon Utility ✅ COMPLETED
- **File**: `src/utils/pieceIcons.ts`
- **Purpose**: Eliminate code duplication across components
- **Changes**:
  - ✅ Created centralized piece icon utilities (PIECE_ICONS, getPieceIcon, etc.)
  - ✅ Removed duplicated code from 4 components (~150 lines total)
  - ✅ Single source of truth for all piece icon logic
  - ✅ Improved maintainability and consistency

### Phase 4: Input Handling Extraction ✅ COMPLETED
**Goal**: Separate input concerns from game logic
**Priority**: MEDIUM - Improves testability and clarity

#### Step 4.1: Extract Drag and Drop Hook ✅ COMPLETED
- **File**: `src/hooks/useBoardDragDrop.ts`
- **Purpose**: Handle all drag and drop logic
- **Changes**:
  - ✅ Created useBoardDragDrop hook with handleDrop, handleDragStart, handleDragEnd methods
  - ✅ Extracted ~100 lines of drag/drop logic from ChessBoard
  - ✅ Centralized drag state management with proper TypeScript typing
  - ✅ Maintained all drag functionality including castling and pre-move handling

#### Step 4.2: Extract Click Handling ✅ COMPLETED
- **File**: `src/hooks/useBoardClicks.ts`
- **Purpose**: Handle click interactions
- **Changes**:
  - ✅ Created useBoardClicks hook with handleSquareClick, handleRightMouseDown, handleRightMouseUp methods
  - ✅ Extracted ~140 lines of click handling logic from ChessBoard
  - ✅ Separated square selection, arrow creation, and highlight logic
  - ✅ Maintained all click functionality including pre-move selection and arrow drawing

### Phase 5: State Management Simplification ✅ COMPLETED
**Goal**: Consolidate related state management
**Priority**: MEDIUM - Reduces state complexity

#### Step 5.1: Consolidate Chess Game State ✅ COMPLETED
- **File**: `src/hooks/useChessGame.ts`
- **Purpose**: Single hook for all game-related state
- **Changes**:
  - ✅ The useChessGame hook was already well-structured and focused on game logic
  - ✅ No animation or sound logic was found in this hook - it's already properly separated
  - ✅ Hook remains focused purely on game state, moves, and rules

#### Step 5.2: Create Board UI State Hook ✅ COMPLETED
- **File**: `src/hooks/useBoardUIState.ts`
- **Purpose**: Handle UI-only state (selections, highlights, etc.)
- **Changes**:
  - ✅ Created useBoardUIState hook managing all UI-related state
  - ✅ Extracted selectedSquare, validMoves, arrows, highlightedSquares, arrowStart, kingInCheckHighlight, promotionDialog
  - ✅ Added convenience functions: clearSelection(), clearArrowsAndHighlights(), clearAll()
  - ✅ Reduced ChessBoard component by ~45 lines (1,126 → 1,081 lines)
  - ✅ Separated UI concerns from game logic cleanly

### Phase 6: Sound System Separation
**Goal**: Remove sound concerns from game logic
**Priority**: LOW - Simple cleanup for better separation

#### Step 6.1: Extract Sound Hook
- **File**: `src/hooks/useChessSounds.ts`
- **Purpose**: Handle all chess-related sounds
- **Changes**:
  - Extract sound logic from useChessGame
  - Create event-driven sound system
  - Remove sound coupling from game logic

### Phase 7: Final ChessBoard Simplification
**Goal**: Reduce ChessBoard to pure coordination/composition
**Priority**: LOW - Final cleanup

#### Step 7.1: Simplify ChessBoard Component  
- **File**: `src/components/ChessBoard.tsx`
- **Purpose**: Reduce to <300 lines of pure composition
- **Changes**:
  - Remove all extracted logic
  - Focus on composing child components
  - Clean up remaining coupling

#### Step 7.2: Clean Up Imports and Dependencies
- **Files**: All refactored files
- **Purpose**: Remove unused code and clean dependencies
- **Changes**:
  - Remove unused imports
  - Clean up remaining dead code
  - Ensure clean dependency tree

## Success Metrics

### Architecture Targets
- **Component size**: ChessBoard <300 lines (from 1,636)
- **Logic consolidation**: Single chess rules implementation
- **Clear separation**: UI components don't contain chess logic  
- **Reduced coupling**: Each component has single responsibility

### Code Quality Targets
- **Code duplication**: <5% overlap between modules
- **Component complexity**: Each component <200 lines
- **Clear responsibilities**: No component handles >2 concerns
- **Testability**: Components can be tested in isolation

## Implementation Strategy

### Phase Ordering Rationale
1. **Logic consolidation first**: Address core duplication issue
2. **Component extraction**: Enable parallel development of features
3. **System separation**: Clean up remaining coupling
4. **Final cleanup**: Polish and optimize

### Guidelines
- **No premature memoization**: Only memoize when clear need identified
- **Keep it simple**: This is a chess component, not an enterprise system
- **Focus on coupling**: Priority on separating concerns over performance
- **Small steps**: Each step should be independently valuable

### Timeline Estimation
- **Phase 1**: High priority (1 week) - Core logic consolidation
- **Phase 2**: High priority (1 week) - Component extraction  
- **Phase 3-5**: Medium priority (1-2 weeks) - System separation
- **Phase 6-7**: Low priority (1 week) - Final cleanup

**Total estimated time**: 4-5 weeks for focused refactoring

---

*This plan prioritizes architectural clarity and maintainability while keeping the component appropriately sized and simple.*