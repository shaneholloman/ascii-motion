/**
 * Bezier Shape Tool - Zustand Store
 * 
 * Manages all state for the bezier shape drawing tool, including anchor points,
 * handles, drag interactions, fill modes, and preview data.
 * 
 * Architecture follows the pattern established by gradientStore.ts
 */

import { create } from 'zustand';
import type { Cell } from '../types';

/**
 * Bezier Anchor Point
 * Represents a single point on the bezier path with optional handles
 */
export interface BezierAnchorPoint {
  /** Unique identifier for this anchor point */
  id: string;
  
  /** Position in grid coordinates (e.g., {x: 10.5, y: 15.0}) */
  position: { x: number; y: number };
  
  /** Whether this point has bezier handles */
  hasHandles: boolean;
  
  /** Incoming handle position (relative to point position) */
  handleIn: { x: number; y: number } | null;
  
  /** Outgoing handle position (relative to point position) */
  handleOut: { x: number; y: number } | null;
  
  /** If true, handles move symmetrically; if false, independent */
  handleSymmetric: boolean;
  
  /** Whether this point is currently selected (for multi-select) */
  selected: boolean;
}

/**
 * Bezier Store State Interface
 */
interface BezierStore {
  // ========================================
  // CORE BEZIER DATA
  // ========================================
  
  /** Array of anchor points defining the bezier path */
  anchorPoints: BezierAnchorPoint[];
  
  /** Whether the shape is closed (first and last point connected) */
  isClosed: boolean;
  
  // ========================================
  // INTERACTION STATE
  // ========================================
  
  /** True when user is actively placing new anchor points */
  isDrawing: boolean;
  
  /** True when shape is closed but not yet committed */
  isEditingShape: boolean;
  
  /** True when dragging an anchor point */
  isDraggingPoint: boolean;
  
  /** True when dragging a bezier handle */
  isDraggingHandle: boolean;
  
  /** True when dragging the entire shape */
  isDraggingShape: boolean;
  
  /** Mouse position when drag started */
  dragStartMousePos: { x: number; y: number } | null;
  
  /** Original positions of all points when shape drag started */
  dragStartShapePos: Array<{ x: number; y: number }> | null;
  
  /** ID of the point being dragged */
  draggingPointId: string | null;
  
  /** Details of the handle being dragged */
  draggingHandleId: { pointId: string; type: 'in' | 'out' } | null;
  
  // ========================================
  // FILL CONFIGURATION
  // ========================================
  
  /** Selected fill mode */
  fillMode: 'constant' | 'palette' | 'autofill';
  
  /** ID of the autofill palette to use ('block', 'ansi', etc.) */
  autofillPaletteId: string;
  
  // ========================================
  // PREVIEW DATA
  // ========================================
  
  /** Preview cells showing how the shape will look when committed */
  previewCells: Map<string, Cell> | null;
  
  /** Number of cells that will be affected by this shape */
  affectedCellCount: number;
  
  /** Frame index where the shape was originally started (for frame-switch handling) */
  originalFrameIndex: number | null;
  
  // ========================================
  // ACTIONS - SHAPE CREATION
  // ========================================
  
  /**
   * Add a new anchor point to the bezier path
   * @param x - Grid X coordinate
   * @param y - Grid Y coordinate
   * @param withHandles - Whether to create this point with handles
   */
  addAnchorPoint: (x: number, y: number, withHandles: boolean) => void;
  
  /**
   * Update the outgoing handle of the most recently added anchor point
   * Used when user drags while placing a point
   * @param handleOut - Relative handle position
   */
  updateLastAnchorHandles: (handleOut: { x: number; y: number }) => void;
  
  /**
   * Close the bezier shape by connecting last point to first
   * Transitions from drawing mode to editing mode
   */
  closeShape: () => void;
  
  // ========================================
  // ACTIONS - POINT MANIPULATION
  // ========================================
  
  /**
   * Toggle handles on/off for a specific anchor point (Alt + Click)
   * @param pointId - ID of the point to toggle
   */
  togglePointHandles: (pointId: string) => void;
  
  /**
   * Update the position of an anchor point
   * @param pointId - ID of the point to move
   * @param newPos - New grid position
   */
  updatePointPosition: (pointId: string, newPos: { x: number; y: number }) => void;
  
  /**
   * Update a bezier handle position
   * @param pointId - ID of the anchor point owning this handle
   * @param handleType - Which handle ('in' or 'out')
   * @param newPos - New relative position
   */
  updateHandle: (
    pointId: string, 
    handleType: 'in' | 'out', 
    newPos: { x: number; y: number }
  ) => void;
  
  /**
   * Break handle symmetry so handles can move independently (Alt + Drag handle)
   * @param pointId - ID of the anchor point
   */
  breakHandleSymmetry: (pointId: string) => void;
  
  // ========================================
  // ACTIONS - SELECTION
  // ========================================
  
  /**
   * Select an anchor point
   * @param pointId - ID of the point to select
   * @param addToSelection - If true, add to existing selection; if false, clear others first
   */
  selectPoint: (pointId: string, addToSelection: boolean) => void;
  
  /**
   * Select multiple anchor points
   * @param pointIds - Array of point IDs to select
   */
  selectMultiplePoints: (pointIds: string[]) => void;
  
  /**
   * Clear all point selections
   */
  clearSelection: () => void;
  
  // ========================================
  // ACTIONS - DRAGGING
  // ========================================
  
  /**
   * Start dragging an anchor point
   * @param pointId - ID of the point to drag
   * @param mousePos - Current mouse position
   */
  startDragPoint: (pointId: string, mousePos: { x: number; y: number }) => void;
  
  /**
   * Start dragging a bezier handle
   * @param pointId - ID of the anchor point owning this handle
   * @param handleType - Which handle ('in' or 'out')
   * @param mousePos - Current mouse position
   */
  startDragHandle: (
    pointId: string, 
    handleType: 'in' | 'out', 
    mousePos: { x: number; y: number }
  ) => void;
  
  /**
   * Start dragging the entire shape
   * @param mousePos - Current mouse position
   */
  startDragShape: (mousePos: { x: number; y: number }) => void;
  
  /**
   * Update drag state as mouse moves
   * @param mousePos - Current mouse position
   * @param shiftKey - Whether Shift is held (for constraints)
   */
  updateDrag: (mousePos: { x: number; y: number }, shiftKey: boolean) => void;
  
  /**
   * End current drag operation
   */
  endDrag: () => void;
  
  // ========================================
  // ACTIONS - FILL MODES
  // ========================================
  
  /**
   * Set the fill mode for this shape
   * @param mode - 'constant', 'palette', or 'autofill'
   */
  setFillMode: (mode: 'constant' | 'palette' | 'autofill') => void;
  
  /**
   * Set the autofill palette ID
   * @param paletteId - 'block', 'ansi', or other registered palette ID
   */
  setAutofillPaletteId: (paletteId: string) => void;
  
  // ========================================
  // ACTIONS - PREVIEW
  // ========================================
  
  /**
   * Update preview data showing how cells will be filled
   * @param previewData - Map of cell keys to Cell objects
   * @param affectedCount - Number of cells affected
   */
  updatePreview: (previewData: Map<string, Cell> | null, affectedCount: number) => void;
  
  // ========================================
  // ACTIONS - COMMIT/CANCEL
  // ========================================
  
  /**
   * Commit the shape to the canvas
   * @returns Map of cells to apply to the current frame
   */
  commitShape: () => Map<string, Cell>;
  
  /**
   * Cancel the current shape and revert to previous state
   */
  cancelShape: () => void;
  
  /**
   * Reset the entire bezier tool state
   */
  reset: () => void;
  
  /**
   * Set the original frame index when starting a new shape
   * @param frameIndex - The current frame index
   */
  setOriginalFrame: (frameIndex: number) => void;
}

/**
 * Default state data (non-function properties)
 */
interface BezierStoreState {
  anchorPoints: BezierAnchorPoint[];
  isClosed: boolean;
  isDrawing: boolean;
  isEditingShape: boolean;
  isDraggingPoint: boolean;
  isDraggingHandle: boolean;
  isDraggingShape: boolean;
  dragStartMousePos: { x: number; y: number } | null;
  dragStartShapePos: Array<{ x: number; y: number }> | null;
  draggingPointId: string | null;
  draggingHandleId: { pointId: string; type: 'in' | 'out' } | null;
  fillMode: 'constant' | 'palette' | 'autofill';
  autofillPaletteId: string;
  previewCells: Map<string, Cell> | null;
  affectedCellCount: number;
  originalFrameIndex: number | null;
}

/**
 * Default state factory
 */
const createDefaultState = (): BezierStoreState => ({
  anchorPoints: [],
  isClosed: false,
  isDrawing: false,
  isEditingShape: false,
  isDraggingPoint: false,
  isDraggingHandle: false,
  isDraggingShape: false,
  dragStartMousePos: null,
  dragStartShapePos: null,
  draggingPointId: null,
  draggingHandleId: null,
  fillMode: 'autofill',
  autofillPaletteId: 'block',
  previewCells: null,
  affectedCellCount: 0,
  originalFrameIndex: null,
});

/**
 * Generate unique ID for anchor points
 */
let nextAnchorId = 1;
function generateAnchorId(): string {
  return `bezier-anchor-${nextAnchorId++}`;
}

/**
 * Bezier Store
 */
export const useBezierStore = create<BezierStore>((set, get) => ({
  ...createDefaultState(),
  
  // ========================================
  // SHAPE CREATION ACTIONS
  // ========================================
  
  addAnchorPoint: (x: number, y: number, withHandles: boolean) => {
    const newPoint: BezierAnchorPoint = {
      id: generateAnchorId(),
      position: { x, y },
      hasHandles: withHandles,
      handleIn: withHandles ? { x: 0, y: 0 } : null,
      handleOut: withHandles ? { x: 0, y: 0 } : null,
      handleSymmetric: true,
      selected: false,
    };
    
    set((state) => ({
      anchorPoints: [...state.anchorPoints, newPoint],
      isDrawing: true,
    }));
  },
  
  updateLastAnchorHandles: (handleOut: { x: number; y: number }) => {
    set((state) => {
      if (state.anchorPoints.length === 0) return state;
      
      const lastIndex = state.anchorPoints.length - 1;
      const lastPoint = state.anchorPoints[lastIndex];
      
      if (!lastPoint.hasHandles) return state;
      
      // Update handleOut and mirror to handleIn (symmetric)
      const updatedPoint: BezierAnchorPoint = {
        ...lastPoint,
        handleOut: { ...handleOut },
        handleIn: { x: -handleOut.x, y: -handleOut.y }, // Mirrored
      };
      
      const newPoints = [...state.anchorPoints];
      newPoints[lastIndex] = updatedPoint;
      
      return { anchorPoints: newPoints };
    });
  },
  
  closeShape: () => {
    set({
      isClosed: true,
      isDrawing: false,
      isEditingShape: true,
    });
  },
  
  // ========================================
  // POINT MANIPULATION ACTIONS
  // ========================================
  
  togglePointHandles: (pointId: string) => {
    set((state) => {
      const pointIndex = state.anchorPoints.findIndex((p) => p.id === pointId);
      if (pointIndex === -1) return state;
      
      const point = state.anchorPoints[pointIndex];
      const newHasHandles = !point.hasHandles;
      
      const updatedPoint: BezierAnchorPoint = {
        ...point,
        hasHandles: newHasHandles,
        handleIn: newHasHandles ? { x: 0, y: 0 } : null,
        handleOut: newHasHandles ? { x: 0, y: 0 } : null,
        handleSymmetric: true,
      };
      
      const newPoints = [...state.anchorPoints];
      newPoints[pointIndex] = updatedPoint;
      
      return { anchorPoints: newPoints };
    });
  },
  
  updatePointPosition: (pointId: string, newPos: { x: number; y: number }) => {
    set((state) => {
      const pointIndex = state.anchorPoints.findIndex((p) => p.id === pointId);
      if (pointIndex === -1) return state;
      
      const updatedPoint: BezierAnchorPoint = {
        ...state.anchorPoints[pointIndex],
        position: { ...newPos },
      };
      
      const newPoints = [...state.anchorPoints];
      newPoints[pointIndex] = updatedPoint;
      
      return { anchorPoints: newPoints };
    });
  },
  
  updateHandle: (
    pointId: string,
    handleType: 'in' | 'out',
    newPos: { x: number; y: number }
  ) => {
    set((state) => {
      const pointIndex = state.anchorPoints.findIndex((p) => p.id === pointId);
      if (pointIndex === -1) return state;
      
      const point = state.anchorPoints[pointIndex];
      if (!point.hasHandles) return state;
      
      const updatedPoint: BezierAnchorPoint = { ...point };
      
      if (handleType === 'out') {
        updatedPoint.handleOut = { ...newPos };
        if (point.handleSymmetric) {
          updatedPoint.handleIn = { x: -newPos.x, y: -newPos.y };
        }
      } else {
        updatedPoint.handleIn = { ...newPos };
        if (point.handleSymmetric) {
          updatedPoint.handleOut = { x: -newPos.x, y: -newPos.y };
        }
      }
      
      const newPoints = [...state.anchorPoints];
      newPoints[pointIndex] = updatedPoint;
      
      return { anchorPoints: newPoints };
    });
  },
  
  breakHandleSymmetry: (pointId: string) => {
    set((state) => {
      const pointIndex = state.anchorPoints.findIndex((p) => p.id === pointId);
      if (pointIndex === -1) return state;
      
      const updatedPoint: BezierAnchorPoint = {
        ...state.anchorPoints[pointIndex],
        handleSymmetric: false,
      };
      
      const newPoints = [...state.anchorPoints];
      newPoints[pointIndex] = updatedPoint;
      
      return { anchorPoints: newPoints };
    });
  },
  
  // ========================================
  // SELECTION ACTIONS
  // ========================================
  
  selectPoint: (pointId: string, addToSelection: boolean) => {
    set((state) => {
      const newPoints = state.anchorPoints.map((point) => ({
        ...point,
        selected: point.id === pointId ? true : addToSelection ? point.selected : false,
      }));
      
      return { anchorPoints: newPoints };
    });
  },
  
  selectMultiplePoints: (pointIds: string[]) => {
    set((state) => {
      const idSet = new Set(pointIds);
      const newPoints = state.anchorPoints.map((point) => ({
        ...point,
        selected: idSet.has(point.id),
      }));
      
      return { anchorPoints: newPoints };
    });
  },
  
  clearSelection: () => {
    set((state) => {
      const newPoints = state.anchorPoints.map((point) => ({
        ...point,
        selected: false,
      }));
      
      return { anchorPoints: newPoints };
    });
  },
  
  // ========================================
  // DRAGGING ACTIONS
  // ========================================
  
  startDragPoint: (pointId: string, mousePos: { x: number; y: number }) => {
    set({
      isDraggingPoint: true,
      draggingPointId: pointId,
      dragStartMousePos: { ...mousePos },
    });
  },
  
  startDragHandle: (
    pointId: string,
    handleType: 'in' | 'out',
    mousePos: { x: number; y: number }
  ) => {
    set({
      isDraggingHandle: true,
      draggingHandleId: { pointId, type: handleType },
      dragStartMousePos: { ...mousePos },
    });
  },
  
  startDragShape: (mousePos: { x: number; y: number }) => {
    const state = get();
    const startPositions = state.anchorPoints.map((p) => ({ ...p.position }));
    
    set({
      isDraggingShape: true,
      dragStartMousePos: { ...mousePos },
      dragStartShapePos: startPositions,
    });
  },
  
  updateDrag: (gridPos: { x: number; y: number }, _shiftKey: boolean) => {
    const state = get();
    
    if (!state.dragStartMousePos) return;
    
    // Calculate delta in grid coordinates
    const deltaX = gridPos.x - state.dragStartMousePos.x;
    const deltaY = gridPos.y - state.dragStartMousePos.y;
    
    // TODO: Implement shift-key constraints (snap to 45 degrees, etc.) using _shiftKey parameter
    // For now, just apply raw delta
    
    if (state.isDraggingPoint && state.draggingPointId) {
      const pointIndex = state.anchorPoints.findIndex((p) => p.id === state.draggingPointId);
      if (pointIndex !== -1) {
        const point = state.anchorPoints[pointIndex];
        const newPos = {
          x: point.position.x + deltaX,
          y: point.position.y + deltaY,
        };
        get().updatePointPosition(state.draggingPointId, newPos);
        
        // Update drag start for next frame
        set({ dragStartMousePos: { ...gridPos } });
      }
    } else if (state.isDraggingHandle && state.draggingHandleId) {
      const { pointId, type } = state.draggingHandleId;
      const pointIndex = state.anchorPoints.findIndex((p) => p.id === pointId);
      
      if (pointIndex !== -1) {
        const point = state.anchorPoints[pointIndex];
        const currentHandle = type === 'out' ? point.handleOut : point.handleIn;
        
        if (currentHandle) {
          const newHandle = {
            x: currentHandle.x + deltaX,
            y: currentHandle.y + deltaY,
          };
          get().updateHandle(pointId, type, newHandle);
          
          // Update drag start for next frame
          set({ dragStartMousePos: { ...gridPos } });
        }
      }
    } else if (state.isDraggingShape && state.dragStartShapePos) {
      const newPoints = state.anchorPoints.map((point, index) => ({
        ...point,
        position: {
          x: state.dragStartShapePos![index].x + deltaX,
          y: state.dragStartShapePos![index].y + deltaY,
        },
      }));
      
      set({ anchorPoints: newPoints });
      
      // Update drag start for next frame
      set({ dragStartMousePos: { ...gridPos } });
    }
  },
  
  endDrag: () => {
    set({
      isDraggingPoint: false,
      isDraggingHandle: false,
      isDraggingShape: false,
      draggingPointId: null,
      draggingHandleId: null,
      dragStartMousePos: null,
      dragStartShapePos: null,
    });
  },
  
  // ========================================
  // FILL MODE ACTIONS
  // ========================================
  
  setFillMode: (mode: 'constant' | 'palette' | 'autofill') => {
    set({ fillMode: mode });
  },
  
  setAutofillPaletteId: (paletteId: string) => {
    set({ autofillPaletteId: paletteId });
  },
  
  // ========================================
  // PREVIEW ACTIONS
  // ========================================
  
  updatePreview: (previewData: Map<string, Cell> | null, affectedCount: number) => {
    set({ previewCells: previewData, affectedCellCount: affectedCount });
  },
  
  // ========================================
  // COMMIT/CANCEL ACTIONS
  // ========================================
  
  commitShape: () => {
    const state = get();
    const cellsToCommit = state.previewCells || new Map();
    
    // Reset state after commit
    set(createDefaultState());
    
    return cellsToCommit;
  },
  
  cancelShape: () => {
    set(createDefaultState());
  },
  
  reset: () => {
    set(createDefaultState());
  },
  
  setOriginalFrame: (frameIndex: number) => {
    set({ originalFrameIndex: frameIndex });
  },
}));

/**
 * Type exports for external use
 */
export type { BezierStore };
