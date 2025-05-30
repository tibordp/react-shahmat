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

### Phase 2: Component Decomposition
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

#### Step 2.2: Extract UI Overlay Components
- **Files**: `src/components/MoveIndicators.tsx`, `src/components/ArrowOverlay.tsx`
- **Purpose**: Separate visual indicators from board logic
- **Changes**:
  - Extract move dots and capture indicators (lines ~1350-1400)
  - Extract arrow drawing logic (lines 1159-1200)
  - Create simple overlay components

#### Step 2.3: Extract Promotion Dialog
- **File**: `src/components/PromotionDialog.tsx`
- **Purpose**: Isolate promotion UI
- **Changes**:
  - Extract promotion dialog (lines 1242-1280)
  - Create standalone dialog component
  - Remove promotion state from ChessBoard

### Phase 3: Animation System Separation  
**Goal**: Decouple animations from game logic
**Priority**: MEDIUM - Reduces complexity in game state management

#### Step 3.1: Extract Animation Hook
- **File**: `src/hooks/usePieceAnimations.ts`
- **Purpose**: Centralize animation logic
- **Changes**:
  - Extract animation state from ChessBoard (lines 860-1001)
  - Create simple animation queue
  - Remove animation concerns from useChessGame

#### Step 3.2: Create Animation Component
- **File**: `src/components/PieceAnimations.tsx`
- **Purpose**: Handle piece movement animations
- **Changes**:
  - Create overlay for animated pieces
  - Simple implementation without complex queuing
  - Remove ~150 lines from ChessBoard

### Phase 4: Input Handling Extraction
**Goal**: Separate input concerns from game logic
**Priority**: MEDIUM - Improves testability and clarity

#### Step 4.1: Extract Drag and Drop Hook
- **File**: `src/hooks/useBoardDragDrop.ts`
- **Purpose**: Handle all drag and drop logic
- **Changes**:
  - Extract drag/drop from ChessBoard (lines 1280-1350)
  - Create clean drag state management
  - Keep drag logic separate from game rules

#### Step 4.2: Extract Click Handling
- **File**: `src/hooks/useBoardClicks.ts`
- **Purpose**: Handle click interactions
- **Changes**:
  - Extract click handling from ChessBoard (lines 1120-1200)
  - Separate selection logic from game logic
  - Create clear input -> action mapping

### Phase 5: State Management Simplification
**Goal**: Consolidate related state management
**Priority**: MEDIUM - Reduces state complexity

#### Step 5.1: Consolidate Chess Game State
- **File**: `src/hooks/useChessGame.ts`
- **Purpose**: Single hook for all game-related state
- **Changes**:
  - Remove animation state from this hook
  - Focus purely on game state and rules
  - Remove sound logic (move to separate concern)

#### Step 5.2: Create Board UI State Hook
- **File**: `src/hooks/useBoardUIState.ts`
- **Purpose**: Handle UI-only state (selections, highlights, etc.)
- **Changes**:
  - Extract UI state from game state
  - Manage selected squares, valid moves display
  - Keep UI state separate from game rules

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