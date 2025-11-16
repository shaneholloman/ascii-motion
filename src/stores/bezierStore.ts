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
 * Session-persistent settings for the bezier tool
 * Maintains user preferences across tool switches
 */
export interface BezierSessionSettings {
  fillMode: 'constant' | 'palette' | 'autofill';
  autofillPaletteId: string;
  fillColorMode: 'current' | 'palette';
  strokeWidth: number;
  strokeTaperStart: number;
  strokeTaperEnd: number;
}

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
  
  /** Selected fill color mode */
  fillColorMode: 'current' | 'palette';
  
  // ========================================
  // STROKE CONFIGURATION
  // ========================================
  
  /** Stroke width in grid units (for open paths) */
  strokeWidth: number;
  
  /** Taper amount at start of stroke (0 = no taper, 1 = taper to point) */
  strokeTaperStart: number;
  
  /** Taper amount at end of stroke (0 = no taper, 1 = taper to point) */
  strokeTaperEnd: number;
  
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
  // SESSION PERSISTENCE
  // ========================================
  
  /** Session-persistent settings (maintains user preferences across tool switches) */
  sessionSettings: BezierSessionSettings | null;
  
  // ========================================
  // ACTIONS - SHAPE CREATION
  // ========================================
  
  /**
   * Add a new anchor point to the bezier path
   * @param x - Grid X coordinate
   * @param y - Grid Y coordinate
   * @param withHandles - Whether to create this point with handles
   */
  addAnchorPoint: (x: number, y: number, withHandles: boolean) => string;
  
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

  /**
   * Toggle the shape between closed and open
   */
  toggleClosedShape: () => void;
  
  // ========================================
  // ACTIONS - POINT MANIPULATION
  // ========================================
  
  /**
   * Toggle handles on/off for a specific anchor point (Alt + Click)
   * @param pointId - ID of the point to toggle
   */
  togglePointHandles: (pointId: string) => void;
  
  /**
   * Enable handles for a point with initial zero-length handles (for drag-to-create)
   * @param pointId - ID of the point
   */
  enableHandlesForDrag: (pointId: string) => void;
  
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
  
  /**
   * Insert a new point on a path segment between two existing points
   * @param afterPointIndex - Index of the point before the new point
   * @param position - Grid position for the new point
   * @param t - Parameter along the segment (0-1) for handle calculation
   */
  insertPointOnSegment: (afterPointIndex: number, position: { x: number; y: number }, t: number) => void;
  
  /**
   * Remove an anchor point from the shape
   * @param pointId - ID of the point to remove
   */
  removePoint: (pointId: string) => void;
  
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
  
  /**
   * Set the fill color mode
   * @param mode - 'current' or 'palette'
   */
  setFillColorMode: (mode: 'current' | 'palette') => void;
  
  // ========================================
  // ACTIONS - STROKE SETTINGS
  // ========================================
  
  /**
   * Set the stroke width for open paths
   * @param width - Width in grid units
   */
  setStrokeWidth: (width: number) => void;
  
  /**
   * Set the taper amount at start of stroke
   * @param taper - 0 to 1 (0 = no taper, 1 = taper to point)
   */
  setStrokeTaperStart: (taper: number) => void;
  
  /**
   * Set the taper amount at end of stroke
   * @param taper - 0 to 1 (0 = no taper, 1 = taper to point)
   */
  setStrokeTaperEnd: (taper: number) => void;
  
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
  fillColorMode: 'current' | 'palette';
  strokeWidth: number;
  strokeTaperStart: number;
  strokeTaperEnd: number;
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
  fillMode: 'constant',
  autofillPaletteId: 'block',
  fillColorMode: 'current',
  strokeWidth: 1.0,
  strokeTaperStart: 0.0,
  strokeTaperEnd: 0.0,
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
 * Helper to create session settings from current state
 */
function createSessionSettings(state: BezierStoreState): BezierSessionSettings {
  return {
    fillMode: state.fillMode,
    autofillPaletteId: state.autofillPaletteId,
    fillColorMode: state.fillColorMode,
    strokeWidth: state.strokeWidth,
    strokeTaperStart: state.strokeTaperStart,
    strokeTaperEnd: state.strokeTaperEnd,
  };
}

/**
 * Bezier Store
 */
export const useBezierStore = create<BezierStore>((set, get) => ({
  ...createDefaultState(),
  
  // Session persistence
  sessionSettings: null, // No session settings stored initially
  
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
    
    // Return the ID of the newly created point
    return newPoint.id;
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

  toggleClosedShape: () => {
    set((state) => ({
      isClosed: !state.isClosed,
    }));
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
      
      let handleIn = null;
      let handleOut = null;
      
      if (newHasHandles) {
        // Auto-generate handles based on neighboring points
        const prevPoint = pointIndex > 0 ? state.anchorPoints[pointIndex - 1] : null;
        const nextPoint = pointIndex < state.anchorPoints.length - 1 ? state.anchorPoints[pointIndex + 1] : null;
        
        // If shape is closed, wrap around
        const prevPointWrapped = prevPoint || (state.isClosed && state.anchorPoints.length > 2 ? state.anchorPoints[state.anchorPoints.length - 1] : null);
        const nextPointWrapped = nextPoint || (state.isClosed && state.anchorPoints.length > 2 ? state.anchorPoints[0] : null);
        
        // Calculate handle direction based on neighboring points
        if (prevPointWrapped && nextPointWrapped) {
          // We have both neighbors - create smooth curve through all three points
          const dx = (nextPointWrapped.position.x - prevPointWrapped.position.x) / 2;
          const dy = (nextPointWrapped.position.y - prevPointWrapped.position.y) / 2;
          const length = Math.sqrt(dx * dx + dy * dy) * 0.25; // 25% of distance
          
          if (length > 0) {
            const angle = Math.atan2(dy, dx);
            handleOut = { x: Math.cos(angle) * length, y: Math.sin(angle) * length };
            handleIn = { x: -handleOut.x, y: -handleOut.y };
          } else {
            handleIn = { x: 0, y: 0 };
            handleOut = { x: 0, y: 0 };
          }
        } else if (nextPointWrapped) {
          // Only have next neighbor
          const dx = nextPointWrapped.position.x - point.position.x;
          const dy = nextPointWrapped.position.y - point.position.y;
          const length = Math.sqrt(dx * dx + dy * dy) * 0.25;
          
          if (length > 0) {
            const angle = Math.atan2(dy, dx);
            handleOut = { x: Math.cos(angle) * length, y: Math.sin(angle) * length };
            handleIn = { x: -handleOut.x, y: -handleOut.y };
          } else {
            handleIn = { x: 0, y: 0 };
            handleOut = { x: 0, y: 0 };
          }
        } else if (prevPointWrapped) {
          // Only have previous neighbor
          const dx = point.position.x - prevPointWrapped.position.x;
          const dy = point.position.y - prevPointWrapped.position.y;
          const length = Math.sqrt(dx * dx + dy * dy) * 0.25;
          
          if (length > 0) {
            const angle = Math.atan2(dy, dx);
            handleOut = { x: Math.cos(angle) * length, y: Math.sin(angle) * length };
            handleIn = { x: -handleOut.x, y: -handleOut.y };
          } else {
            handleIn = { x: 0, y: 0 };
            handleOut = { x: 0, y: 0 };
          }
        } else {
          // No neighbors - default small handles
          handleIn = { x: -0.5, y: 0 };
          handleOut = { x: 0.5, y: 0 };
        }
      }
      
      const updatedPoint: BezierAnchorPoint = {
        ...point,
        hasHandles: newHasHandles,
        handleIn,
        handleOut,
        handleSymmetric: true,
      };
      
      const newPoints = [...state.anchorPoints];
      newPoints[pointIndex] = updatedPoint;
      
      return { anchorPoints: newPoints };
    });
  },
  
  enableHandlesForDrag: (pointId: string) => {
    set((state) => {
      const pointIndex = state.anchorPoints.findIndex((p) => p.id === pointId);
      if (pointIndex === -1) return state;
      
      const point = state.anchorPoints[pointIndex];
      
      // Enable handles starting at zero length (will be dragged out)
      const updatedPoint: BezierAnchorPoint = {
        ...point,
        hasHandles: true,
        handleIn: { x: 0, y: 0 },
        handleOut: { x: 0, y: 0 },
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
  
  insertPointOnSegment: (afterPointIndex: number, position: { x: number; y: number }, t: number) => {
    set((state) => {
      const points = state.anchorPoints;
      if (afterPointIndex < 0 || afterPointIndex >= points.length) return state;
      
      const nextIndex = (afterPointIndex + 1) % points.length;
      if (nextIndex === 0 && !state.isClosed) return state; // Can't insert after last point in open shape
      
      const p0 = points[afterPointIndex];
      const p1 = points[nextIndex];
      
      // Calculate smart handles for the new point based on the curve
      // If both points have handles, we're on a bezier curve
      let handleIn = null;
      let handleOut = null;
      
      if (p0.hasHandles && p0.handleOut && p1.hasHandles && p1.handleIn) {
        // On a cubic bezier curve - calculate tangent at point t
        const p0Out = {
          x: p0.position.x + p0.handleOut.x,
          y: p0.position.y + p0.handleOut.y,
        };
        const p1In = {
          x: p1.position.x + p1.handleIn.x,
          y: p1.position.y + p1.handleIn.y,
        };
        
        // Derivative of cubic bezier: 3(1-t)²(P1-P0) + 6(1-t)t(P2-P1) + 3t²(P3-P2)
        const t2 = t * t;
        const mt = 1 - t;
        const mt2 = mt * mt;
        
        const dx = 3 * mt2 * (p0Out.x - p0.position.x) +
                   6 * mt * t * (p1In.x - p0Out.x) +
                   3 * t2 * (p1.position.x - p1In.x);
        const dy = 3 * mt2 * (p0Out.y - p0.position.y) +
                   6 * mt * t * (p1In.y - p0Out.y) +
                   3 * t2 * (p1.position.y - p1In.y);
        
        const length = Math.sqrt(dx * dx + dy * dy) * 0.15; // Scale down for reasonable handle length
        if (length > 0) {
          const angle = Math.atan2(dy, dx);
          handleOut = { x: Math.cos(angle) * length, y: Math.sin(angle) * length };
          handleIn = { x: -handleOut.x, y: -handleOut.y };
        }
      } else if (p0.hasHandles && p0.handleOut) {
        // Quadratic curve using only p0's out handle
        const p0Out = {
          x: p0.position.x + p0.handleOut.x,
          y: p0.position.y + p0.handleOut.y,
        };
        
        // Derivative of quadratic: 2(1-t)(P1-P0) + 2t(P2-P1)
        const dx = 2 * (1 - t) * (p0Out.x - p0.position.x) + 2 * t * (p1.position.x - p0Out.x);
        const dy = 2 * (1 - t) * (p0Out.y - p0.position.y) + 2 * t * (p1.position.y - p0Out.y);
        
        const length = Math.sqrt(dx * dx + dy * dy) * 0.15;
        if (length > 0) {
          const angle = Math.atan2(dy, dx);
          handleOut = { x: Math.cos(angle) * length, y: Math.sin(angle) * length };
          handleIn = { x: -handleOut.x, y: -handleOut.y };
        }
      } else if (p1.hasHandles && p1.handleIn) {
        // Quadratic curve using only p1's in handle
        const p1In = {
          x: p1.position.x + p1.handleIn.x,
          y: p1.position.y + p1.handleIn.y,
        };
        
        const dx = 2 * (1 - t) * (p1In.x - p0.position.x) + 2 * t * (p1.position.x - p1In.x);
        const dy = 2 * (1 - t) * (p1In.y - p0.position.y) + 2 * t * (p1.position.y - p1In.y);
        
        const length = Math.sqrt(dx * dx + dy * dy) * 0.15;
        if (length > 0) {
          const angle = Math.atan2(dy, dx);
          handleOut = { x: Math.cos(angle) * length, y: Math.sin(angle) * length };
          handleIn = { x: -handleOut.x, y: -handleOut.y };
        }
      } else {
        // Linear segment - create handles along the line
        const dx = p1.position.x - p0.position.x;
        const dy = p1.position.y - p0.position.y;
        const length = Math.sqrt(dx * dx + dy * dy) * 0.15;
        
        if (length > 0) {
          const angle = Math.atan2(dy, dx);
          handleOut = { x: Math.cos(angle) * length, y: Math.sin(angle) * length };
          handleIn = { x: -handleOut.x, y: -handleOut.y };
        }
      }
      
      const newPoint: BezierAnchorPoint = {
        id: generateAnchorId(),
        position: { ...position },
        hasHandles: handleIn !== null && handleOut !== null,
        handleIn,
        handleOut,
        handleSymmetric: true,
        selected: false,
      };
      
      const newPoints = [...points];
      newPoints.splice(afterPointIndex + 1, 0, newPoint);
      
      return { anchorPoints: newPoints };
    });
  },
  
  removePoint: (pointId: string) => {
    set((state) => {
      const pointIndex = state.anchorPoints.findIndex((p) => p.id === pointId);
      if (pointIndex === -1) return state;
      
      // Don't allow removing if we'd have fewer than 2 points
      if (state.anchorPoints.length <= 2) return state;
      
      const newPoints = state.anchorPoints.filter((p) => p.id !== pointId);
      
      // If we removed a point from a closed shape and now have only 2 points, open it and resume drawing
      const shouldOpen = state.isClosed && newPoints.length === 2;
      
      return { 
        anchorPoints: newPoints,
        isClosed: shouldOpen ? false : state.isClosed,
        isDrawing: shouldOpen ? true : state.isDrawing,
        isEditingShape: shouldOpen ? false : state.isEditingShape,
      };
    });
  },
  
  // ========================================
  // SELECTION ACTIONS
  // ========================================
  
  selectPoint: (pointId: string, addToSelection: boolean) => {
    set((state) => {
      const targetPoint = state.anchorPoints.find((p) => p.id === pointId);
      if (!targetPoint) return state;
      
      // If shift+clicking an already selected point, toggle it off
      if (addToSelection && targetPoint.selected) {
        const newPoints = state.anchorPoints.map((point) => ({
          ...point,
          selected: point.id === pointId ? false : point.selected,
        }));
        return { anchorPoints: newPoints };
      }
      
      // Otherwise, select the point (and optionally keep other selections)
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
  
  updateDrag: (gridPos: { x: number; y: number }, shiftKey: boolean) => {
    const state = get();
    
    if (!state.dragStartMousePos) return;
    
    // Calculate delta in grid coordinates
    const deltaX = gridPos.x - state.dragStartMousePos.x;
    const deltaY = gridPos.y - state.dragStartMousePos.y;
    
    // TODO: Implement shift-key constraints (snap to 45 degrees, etc.) using shiftKey parameter
    // For now, just apply raw delta
    void shiftKey; // Acknowledge parameter for future use
    
    if (state.isDraggingPoint && state.draggingPointId) {
      // Move all selected points together
      const selectedPoints = state.anchorPoints.filter((p) => p.selected);
      
      if (selectedPoints.length > 1) {
        // Multi-select drag - move all selected points
        const newPoints = state.anchorPoints.map((point) => {
          if (point.selected) {
            return {
              ...point,
              position: {
                x: point.position.x + deltaX,
                y: point.position.y + deltaY,
              },
            };
          }
          return point;
        });
        
        set({ 
          anchorPoints: newPoints,
          dragStartMousePos: { ...gridPos }
        });
      } else {
        // Single point drag
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
      
      // Don't update dragStartMousePos for shape dragging - we use dragStartShapePos instead
      // Updating it would cause the delta to reset to 0 on the next frame
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
    set((state) => {
      const newState = { ...state, fillMode: mode };
      return {
        fillMode: mode,
        sessionSettings: createSessionSettings(newState)
      };
    });
  },
  
  setAutofillPaletteId: (paletteId: string) => {
    set((state) => {
      const newState = { ...state, autofillPaletteId: paletteId };
      return {
        autofillPaletteId: paletteId,
        sessionSettings: createSessionSettings(newState)
      };
    });
  },
  
  setFillColorMode: (mode: 'current' | 'palette') => {
    set((state) => {
      const newState = { ...state, fillColorMode: mode };
      return {
        fillColorMode: mode,
        sessionSettings: createSessionSettings(newState)
      };
    });
  },
  
  // ========================================
  // STROKE ACTIONS
  // ========================================
  
  setStrokeWidth: (width: number) => {
    set((state) => {
      const newState = { ...state, strokeWidth: Math.max(0.1, Math.min(10, width)) };
      return {
        strokeWidth: newState.strokeWidth,
        sessionSettings: createSessionSettings(newState)
      };
    });
  },
  
  setStrokeTaperStart: (taper: number) => {
    set((state) => {
      const newState = { ...state, strokeTaperStart: Math.max(0, Math.min(1, taper)) };
      return {
        strokeTaperStart: newState.strokeTaperStart,
        sessionSettings: createSessionSettings(newState)
      };
    });
  },
  
  setStrokeTaperEnd: (taper: number) => {
    set((state) => {
      const newState = { ...state, strokeTaperEnd: Math.max(0, Math.min(1, taper)) };
      return {
        strokeTaperEnd: newState.strokeTaperEnd,
        sessionSettings: createSessionSettings(newState)
      };
    });
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
    
    // Save current settings before reset
    const currentSettings = createSessionSettings(state);
    
    // Reset state after commit, but preserve fill settings
    set({
      ...createDefaultState(),
      fillMode: currentSettings.fillMode,
      autofillPaletteId: currentSettings.autofillPaletteId,
      fillColorMode: currentSettings.fillColorMode,
      strokeWidth: currentSettings.strokeWidth,
      strokeTaperStart: currentSettings.strokeTaperStart,
      strokeTaperEnd: currentSettings.strokeTaperEnd,
      sessionSettings: currentSettings,
    });
    
    return cellsToCommit;
  },
  
  cancelShape: () => {
    const state = get();
    
    // Save current settings before reset
    const currentSettings = createSessionSettings(state);
    
    // Reset state but preserve fill settings
    set({
      ...createDefaultState(),
      fillMode: currentSettings.fillMode,
      autofillPaletteId: currentSettings.autofillPaletteId,
      fillColorMode: currentSettings.fillColorMode,
      strokeWidth: currentSettings.strokeWidth,
      strokeTaperStart: currentSettings.strokeTaperStart,
      strokeTaperEnd: currentSettings.strokeTaperEnd,
      sessionSettings: currentSettings,
    });
  },
  
  reset: () => {
    const state = get();
    
    // Restore session settings if available, otherwise use defaults
    const settingsToUse = state.sessionSettings ? {
      fillMode: state.sessionSettings.fillMode,
      autofillPaletteId: state.sessionSettings.autofillPaletteId,
      fillColorMode: state.sessionSettings.fillColorMode,
    } : {
      fillMode: 'constant' as const,
      autofillPaletteId: 'block',
      fillColorMode: 'current' as const,
    };
    
    set({
      ...createDefaultState(),
      ...settingsToUse,
      sessionSettings: state.sessionSettings,
    });
  },
  
  setOriginalFrame: (frameIndex: number) => {
    set({ originalFrameIndex: frameIndex });
  },
}));

/**
 * Type exports for external use
 */
export type { BezierStore };
