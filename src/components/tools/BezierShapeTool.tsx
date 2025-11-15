import React from 'react';
import { useBezierStore } from '../../stores/bezierStore';

/**
 * Bezier Shape Tool Component
 * Handles bezier shape drawing and editing behavior
 */
export const BezierShapeTool: React.FC = () => {
  // The bezier shape logic is handled by InteractiveBezierOverlay
  // This component ensures proper tool lifecycle
  return null;
};

/**
 * Bezier Shape Tool Status Component
 * Provides visual feedback about the bezier shape tool state
 */
export const BezierShapeToolStatus: React.FC = () => {
  const { 
    isDrawing,
    isEditingShape,
    isClosed,
    anchorPoints,
    affectedCellCount,
    fillMode,
    autofillPaletteId,
  } = useBezierStore();
  
  // Get fill mode description
  const getFillModeText = () => {
    switch (fillMode) {
      case 'constant':
        return 'Constant fill';
      case 'palette':
        return 'Palette fill';
      case 'autofill':
        return `Autofill (${autofillPaletteId})`;
      default:
        return 'Constant fill';
    }
  };
  
  // Status messages based on current state
  if (isDrawing && anchorPoints.length === 0) {
    return (
      <span className="text-muted-foreground">
        Bezier Shape: Click to place first point, drag to create handles
      </span>
    );
  }
  
  if (isDrawing && anchorPoints.length > 0 && !isClosed) {
    return (
      <span className="text-muted-foreground">
        Bezier Shape: {anchorPoints.length} point{anchorPoints.length === 1 ? '' : 's'} • Click to add, click first point to close, Alt+Click for handles
      </span>
    );
  }
  
  if (isEditingShape && isClosed) {
    return (
      <span className="text-muted-foreground">
        Bezier Shape: {affectedCellCount} cell{affectedCellCount === 1 ? '' : 's'} • {getFillModeText()} • Press Enter to apply, Escape to cancel
      </span>
    );
  }
  
  // Default state - ready to start drawing
  return (
    <span className="text-muted-foreground">
      Bezier Shape: {getFillModeText()} • Click to start drawing, Cmd+Click path to insert point
    </span>
  );
};
