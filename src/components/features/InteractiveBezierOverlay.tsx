/**
 * Interactive Bezier Overlay
 * 
 * SVG overlay for drawing and editing bezier shapes with handles.
 * Handles all mouse interactions for creating anchor points, dragging
 * points/handles, and manipulating the entire shape.
 */

import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { useBezierStore } from '../../stores/bezierStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { useCharacterPaletteStore } from '../../stores/characterPaletteStore';
import { useAnimationStore } from '../../stores/animationStore';
import { usePaletteStore } from '../../stores/paletteStore';
import { generateBezierPreview } from '../../utils/bezierFillUtils';
import type { CanvasHistoryAction } from '../../types';

export const InteractiveBezierOverlay: React.FC = () => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const svgOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const prevToolRef = useRef<string>('beziershape');
  const { activeTool, pushToHistory } = useToolStore();
  const { cellWidth, cellHeight, zoom, panOffset } = useCanvasContext();
  
  // Track if we just placed a new point and should be creating handles on drag
  const [placingPointId, setPlacingPointId] = useState<string | null>(null);
  const [placementStartPos, setPlacementStartPos] = useState<{ x: number; y: number } | null>(null);
  
  // Track Alt+click on point without handles (to differentiate click vs drag)
  const [altClickPointId, setAltClickPointId] = useState<string | null>(null);
  const [altClickStartPos, setAltClickStartPos] = useState<{ x: number; y: number } | null>(null);
  
  // Track Cmd key state and hover for add/delete point functionality
  const [cmdKeyPressed, setCmdKeyPressed] = useState(false);
  const [hoverState, setHoverState] = useState<
    | { type: 'point'; pointId: string }
    | { type: 'path'; afterIndex: number; position: { x: number; y: number }; t: number }
    | null
  >(null);
  
  const {
    anchorPoints,
    isClosed,
    isDrawing,
    isDraggingPoint,
    isDraggingHandle,
    isDraggingShape,
    fillMode,
    autofillPaletteId,
    fillColorMode,
    strokeWidth,
    strokeTaperStart,
    strokeTaperEnd,
    previewCells,
    addAnchorPoint,
    closeShape,
    togglePointHandles,
    enableHandlesForDrag,
    breakHandleSymmetry,
    selectPoint,
    clearSelection,
    startDragPoint,
    startDragHandle,
    startDragShape,
    updateDrag,
    endDrag,
    insertPointOnSegment,
    removePoint,
    updatePreview,
    commitShape,
    cancelShape,
  } = useBezierStore();

  const { width, height, cells, setCanvasData } = useCanvasStore();
  const { selectedChar, selectedColor, selectedBgColor } = useToolStore();
  const { activePalette } = useCharacterPaletteStore();
  const { currentFrameIndex } = useAnimationStore();
  const { getActivePalette, activePaletteId, customPalettes } = usePaletteStore();

  const effectiveCellWidth = cellWidth * zoom;
  const effectiveCellHeight = cellHeight * zoom;

  // Get the active color palette (uses currently selected palette from right toolbar)
  // Re-fetch when palette ID changes OR when custom palettes are edited
  const colorPalette = useMemo(() => {
    return getActivePalette();
  }, [getActivePalette, activePaletteId, customPalettes]);

  /**
   * Commit the bezier shape to the canvas
   */
  const handleCommit = useCallback(() => {
    // Allow committing both closed shapes and open shapes with stroke
    if (!previewCells || previewCells.size === 0) {
      console.warn('[Bezier] Cannot commit: no preview data');
      return;
    }

    try {
      // Store current canvas state for undo
      const originalCells = new Map(cells);

      // Get cells to commit from store
      const cellsToCommit = commitShape();

      // Apply to canvas
      const newCells = new Map(cells);
      cellsToCommit.forEach((cell, key) => {
        if (cell.char === ' ' && cell.color === '#FFFFFF' && cell.bgColor === 'transparent') {
          // Remove empty cells to save memory
          newCells.delete(key);
        } else {
          newCells.set(key, { ...cell });
        }
      });

      setCanvasData(newCells);

      // Add to history for undo/redo
      const historyAction: CanvasHistoryAction = {
        type: 'canvas_edit',
        timestamp: Date.now(),
        description: `Apply bezier shape (${cellsToCommit.size} cells)`,
        data: {
          previousCanvasData: originalCells,
          newCanvasData: newCells,
          frameIndex: currentFrameIndex,
        },
      };

      pushToHistory(historyAction);

      // Reset local component state so user can immediately start a new shape
      setPlacingPointId(null);
      setPlacementStartPos(null);
      setAltClickPointId(null);
      setAltClickStartPos(null);
      setCmdKeyPressed(false);
      setHoverState(null);
    } catch (error) {
      console.error('[Bezier] Error committing shape:', error);
    }
  }, [isClosed, previewCells, cells, currentFrameIndex, commitShape, setCanvasData, pushToHistory]);

  /**
   * Cancel the bezier shape without committing
   */
  const handleCancel = useCallback(() => {
    cancelShape();
    
    // Reset local component state so user can immediately start a new shape
    setPlacingPointId(null);
    setPlacementStartPos(null);
    setAltClickPointId(null);
    setAltClickStartPos(null);
    setCmdKeyPressed(false);
    setHoverState(null);
  }, [cancelShape]);

  /**
   * Ensure local interaction state is cleared any time the bezier store
   * returns to an idle state (no anchor points and not actively editing).
   * This covers commit/cancel flows triggered outside this component and
   * prevents requiring a manual tool reselect to recover.
   */
  useEffect(() => {
    const storeIdle =
      anchorPoints.length === 0 &&
      !isDrawing &&
      !isDraggingPoint &&
      !isDraggingHandle &&
      !isDraggingShape;

    if (!storeIdle) {
      return;
    }

    // Only clear these states when truly idle
    // Don't clear placingPointId/placementStartPos here since they're for the NEXT point
    setAltClickPointId(null);
    setAltClickStartPos(null);
    setCmdKeyPressed(false);
    setHoverState(null);
  }, [
    anchorPoints.length,
    isDrawing,
    isDraggingPoint,
    isDraggingHandle,
    isDraggingShape,
  ]);

  /**
   * Track Cmd/Meta key state for add/delete point functionality
   */
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        setCmdKeyPressed(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) {
        setCmdKeyPressed(false);
        setHoverState(null); // Clear hover state when Cmd is released
      }
    };
    
    // Handle window blur (cmd+tab away)
    const handleBlur = () => {
      setCmdKeyPressed(false);
      setHoverState(null);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  /**
   * Handle Enter (commit) and Escape (cancel) keyboard shortcuts
   */
  React.useEffect(() => {
    // Only handle keys when bezier tool is active and there are anchor points
    if (activeTool !== 'beziershape' || anchorPoints.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // For Enter and Escape, ALWAYS handle them for bezier tool (even if a UI element has focus)
      // This prevents the toggle switch or other UI from intercepting these keys
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Commit the shape in whatever state it's in (open or closed)
        handleCommit();
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Cancel works at any time (closed or not)
        handleCancel();
        return;
      }
      
      // For other keys, ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        // Delete all selected points
        const selectedPoints = anchorPoints.filter(p => p.selected);
        if (selectedPoints.length > 0) {
          // Don't allow deleting all points if it would leave less than 2
          if (anchorPoints.length - selectedPoints.length < 2) {
            console.warn('[Bezier] Cannot delete: would leave less than 2 points');
            return;
          }
          // Delete each selected point
          selectedPoints.forEach(point => {
            removePoint(point.id);
          });
        }
      }
    };

    // Use capture phase to intercept events BEFORE they reach UI elements
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [activeTool, anchorPoints.length, anchorPoints, isClosed, handleCommit, handleCancel, closeShape, removePoint]);

  /**
   * Auto-commit shape when switching away from bezier tool
   */
  useEffect(() => {
    // Check if we're switching away from beziershape tool
    if (prevToolRef.current === 'beziershape' && activeTool !== 'beziershape') {
      // If there's a shape (open or closed) with preview data, commit it
      if (anchorPoints.length >= 2 && previewCells && previewCells.size > 0) {
        handleCommit();
      }
    }
    
    // Update the ref for next time
    prevToolRef.current = activeTool;
  }, [activeTool, anchorPoints.length, isClosed, previewCells, handleCommit]);

  /**
   * Generate and update preview whenever shape changes
   */
  useEffect(() => {
    // Don't generate preview if no points or if not actively drawing/editing
    if (anchorPoints.length < 2) {
      updatePreview(new Map(), 0);
      return;
    }

    // Generate the preview
    const { previewCells, affectedCount } = generateBezierPreview(
      anchorPoints,
      isClosed,
      fillMode,
      width,
      height,
      effectiveCellWidth,
      effectiveCellHeight,
      zoom,
      panOffset,
      selectedChar,
      selectedColor,
      selectedBgColor,
      fillMode === 'palette' ? activePalette.characters : undefined,
      fillMode === 'autofill' ? autofillPaletteId : undefined,
      fillColorMode,
      colorPalette || undefined,
      strokeWidth,
      strokeTaperStart,
      strokeTaperEnd
    );

    // Update the store with the preview
    updatePreview(previewCells, affectedCount);
  }, [
    anchorPoints,
    isClosed,
    fillMode,
    width,
    height,
    effectiveCellWidth,
    effectiveCellHeight,
    zoom,
    panOffset,
    selectedChar,
    selectedColor,
    selectedBgColor,
    activePalette.characters,
    autofillPaletteId,
    fillColorMode,
    colorPalette,
    strokeWidth,
    strokeTaperStart,
    strokeTaperEnd,
    updatePreview,
  ]);

  /**
   * Convert grid coordinates to pixel coordinates
   */
  const gridToPixel = useCallback(
    (gridX: number, gridY: number) => {
      return {
        x: gridX * effectiveCellWidth + panOffset.x + effectiveCellWidth / 2,
        y: gridY * effectiveCellHeight + panOffset.y + effectiveCellHeight / 2,
      };
    },
    [effectiveCellWidth, effectiveCellHeight, panOffset]
  );

  /**
   * Convert pixel coordinates to grid coordinates
   */
  const pixelToGrid = useCallback(
    (pixelX: number, pixelY: number) => {
      return {
        x: (pixelX - panOffset.x - effectiveCellWidth / 2) / effectiveCellWidth,
        y: (pixelY - panOffset.y - effectiveCellHeight / 2) / effectiveCellHeight,
      };
    },
    [effectiveCellWidth, effectiveCellHeight, panOffset]
  );

  /**
   * Hit test to determine what element is under the cursor
   */
  const hitTest = useCallback(
    (mouseX: number, mouseY: number) => {
      // Test handles first (highest priority)
      for (const point of anchorPoints) {
        if (!point.hasHandles) continue;

        const pointPixel = gridToPixel(point.position.x, point.position.y);

        if (point.handleOut) {
          const handlePixel = {
            x: pointPixel.x + point.handleOut.x * effectiveCellWidth,
            y: pointPixel.y + point.handleOut.y * effectiveCellHeight,
          };
          const dist = Math.sqrt(
            Math.pow(mouseX - handlePixel.x, 2) + Math.pow(mouseY - handlePixel.y, 2)
          );
          if (dist <= 6) {
            return { type: 'handle' as const, pointId: point.id, handleType: 'out' as const };
          }
        }

        if (point.handleIn) {
          const handlePixel = {
            x: pointPixel.x + point.handleIn.x * effectiveCellWidth,
            y: pointPixel.y + point.handleIn.y * effectiveCellHeight,
          };
          const dist = Math.sqrt(
            Math.pow(mouseX - handlePixel.x, 2) + Math.pow(mouseY - handlePixel.y, 2)
          );
          if (dist <= 6) {
            return { type: 'handle' as const, pointId: point.id, handleType: 'in' as const };
          }
        }
      }

      // Test anchor points
      for (const point of anchorPoints) {
        const pointPixel = gridToPixel(point.position.x, point.position.y);
        const dist = Math.sqrt(
          Math.pow(mouseX - pointPixel.x, 2) + Math.pow(mouseY - pointPixel.y, 2)
        );
        if (dist <= 8) {
          return { type: 'point' as const, pointId: point.id };
        }
      }

      // No hit on points or handles - allow shape/path dragging
      return null;
    },
    [anchorPoints, gridToPixel, effectiveCellWidth, effectiveCellHeight]
  );

  /**
   * Test if point is inside the closed shape using ray casting algorithm
   */
  const hitTestShapeInterior = useCallback(
    (mouseX: number, mouseY: number): boolean => {
      if (!isClosed || anchorPoints.length < 3) return false;

      // Simple point-in-polygon test using ray casting
      // Cast a ray from the point to the right and count intersections
      let inside = false;
      
      for (let i = 0; i < anchorPoints.length; i++) {
        const p0 = anchorPoints[i];
        const p1 = anchorPoints[(i + 1) % anchorPoints.length];
        
        const p0Pixel = gridToPixel(p0.position.x, p0.position.y);
        const p1Pixel = gridToPixel(p1.position.x, p1.position.y);
        
        // Check if the ray crosses this edge
        if ((p0Pixel.y > mouseY) !== (p1Pixel.y > mouseY)) {
          const intersectX = (p1Pixel.x - p0Pixel.x) * (mouseY - p0Pixel.y) / (p1Pixel.y - p0Pixel.y) + p0Pixel.x;
          if (mouseX < intersectX) {
            inside = !inside;
          }
        }
      }
      
      return inside;
    },
    [anchorPoints, isClosed, gridToPixel]
  );

  /**
   * Hit test for path segments (for Cmd+click to add point)
   * Returns the segment index and parameter t (0-1) along the segment
   */
  const hitTestPath = useCallback(
    (mouseX: number, mouseY: number): { afterIndex: number; position: { x: number; y: number }; t: number } | null => {
      if (anchorPoints.length < 2) return null;
      
      const threshold = 8; // pixels
      const segments = isClosed ? anchorPoints.length : anchorPoints.length - 1;
      
      for (let i = 0; i < segments; i++) {
        const p0 = anchorPoints[i];
        const p1 = anchorPoints[(i + 1) % anchorPoints.length];
        
        const p0Pixel = gridToPixel(p0.position.x, p0.position.y);
        const p1Pixel = gridToPixel(p1.position.x, p1.position.y);
        
        // Check if we have a bezier curve or straight line
        const hasBezier = 
          (p0.hasHandles && p0.handleOut) || 
          (p1.hasHandles && p1.handleIn);
        
        if (hasBezier) {
          // Sample points along bezier curve
          const samples = 20;
          for (let j = 0; j < samples; j++) {
            const t = j / samples;
            const nextT = (j + 1) / samples;
            
            // Calculate point on curve at t
            let curveX: number, curveY: number;
            let nextX: number, nextY: number;
            
            if (p0.hasHandles && p0.handleOut && p1.hasHandles && p1.handleIn) {
              // Cubic bezier
              const cp1X = p0Pixel.x + p0.handleOut.x * effectiveCellWidth;
              const cp1Y = p0Pixel.y + p0.handleOut.y * effectiveCellHeight;
              const cp2X = p1Pixel.x + p1.handleIn.x * effectiveCellWidth;
              const cp2Y = p1Pixel.y + p1.handleIn.y * effectiveCellHeight;
              
              const mt = 1 - t;
              const mt2 = mt * mt;
              const mt3 = mt2 * mt;
              const t2 = t * t;
              const t3 = t2 * t;
              
              curveX = mt3 * p0Pixel.x + 3 * mt2 * t * cp1X + 3 * mt * t2 * cp2X + t3 * p1Pixel.x;
              curveY = mt3 * p0Pixel.y + 3 * mt2 * t * cp1Y + 3 * mt * t2 * cp2Y + t3 * p1Pixel.y;
              
              const mtNext = 1 - nextT;
              const mt2Next = mtNext * mtNext;
              const mt3Next = mt2Next * mtNext;
              const t2Next = nextT * nextT;
              const t3Next = t2Next * nextT;
              
              nextX = mt3Next * p0Pixel.x + 3 * mt2Next * nextT * cp1X + 3 * mtNext * t2Next * cp2X + t3Next * p1Pixel.x;
              nextY = mt3Next * p0Pixel.y + 3 * mt2Next * nextT * cp1Y + 3 * mtNext * t2Next * cp2Y + t3Next * p1Pixel.y;
            } else {
              // Quadratic bezier (one control point)
              const cpX = p0.handleOut 
                ? p0Pixel.x + p0.handleOut.x * effectiveCellWidth
                : p1Pixel.x + p1.handleIn!.x * effectiveCellWidth;
              const cpY = p0.handleOut 
                ? p0Pixel.y + p0.handleOut.y * effectiveCellHeight
                : p1Pixel.y + p1.handleIn!.y * effectiveCellHeight;
              
              const mt = 1 - t;
              const mt2 = mt * mt;
              const t2 = t * t;
              
              curveX = mt2 * p0Pixel.x + 2 * mt * t * cpX + t2 * p1Pixel.x;
              curveY = mt2 * p0Pixel.y + 2 * mt * t * cpY + t2 * p1Pixel.y;
              
              const mtNext = 1 - nextT;
              const mt2Next = mtNext * mtNext;
              const t2Next = nextT * nextT;
              
              nextX = mt2Next * p0Pixel.x + 2 * mtNext * nextT * cpX + t2Next * p1Pixel.x;
              nextY = mt2Next * p0Pixel.y + 2 * mtNext * nextT * cpY + t2Next * p1Pixel.y;
            }
            
            // Check distance from mouse to line segment
            const dist = distanceToSegment(mouseX, mouseY, curveX, curveY, nextX, nextY);
            if (dist <= threshold) {
              // Convert back to grid coordinates
              const gridPos = pixelToGrid(curveX, curveY);
              return { afterIndex: i, position: gridPos, t };
            }
          }
        } else {
          // Straight line segment
          const dist = distanceToSegment(mouseX, mouseY, p0Pixel.x, p0Pixel.y, p1Pixel.x, p1Pixel.y);
          if (dist <= threshold) {
            // Calculate t based on projection
            const dx = p1Pixel.x - p0Pixel.x;
            const dy = p1Pixel.y - p0Pixel.y;
            const lengthSquared = dx * dx + dy * dy;
            const t = lengthSquared === 0 ? 0 : 
              Math.max(0, Math.min(1, ((mouseX - p0Pixel.x) * dx + (mouseY - p0Pixel.y) * dy) / lengthSquared));
            
            const pointX = p0Pixel.x + t * dx;
            const pointY = p0Pixel.y + t * dy;
            const gridPos = pixelToGrid(pointX, pointY);
            
            return { afterIndex: i, position: gridPos, t };
          }
        }
      }
      
      return null;
    },
    [anchorPoints, isClosed, gridToPixel, pixelToGrid, effectiveCellWidth, effectiveCellHeight]
  );
  
  /**
   * Calculate distance from point to line segment
   */
  function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    
    if (lengthSquared === 0) {
      return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
    }
    
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    
    return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
  }

  /**
   * Handle mouse down - start interaction
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!overlayRef.current) return;

      const rect = overlayRef.current.getBoundingClientRect();
      // Adjust for both container position and SVG transform offset
      const mouseX = e.clientX - rect.left - svgOffsetRef.current.x;
      const mouseY = e.clientY - rect.top - svgOffsetRef.current.y;

      const hit = hitTest(mouseX, mouseY);

      if (hit) {
        if (hit.type === 'handle') {
          // Start dragging handle
          if (e.altKey) {
            // Alt + drag = break symmetry
            breakHandleSymmetry(hit.pointId);
          }
          const gridPos = pixelToGrid(mouseX, mouseY);
          startDragHandle(hit.pointId, hit.handleType, gridPos);
        } else if (hit.type === 'point') {
          // Cmd + click = delete point
          if (e.metaKey || e.ctrlKey) {
            removePoint(hit.pointId);
            return;
          }
          
          // Alt + click/drag on point
          if (e.altKey) {
            const point = anchorPoints.find((p) => p.id === hit.pointId);
            if (point) {
              if (point.hasHandles) {
                // Already has handles - toggle them off (Alt+click to remove)
                togglePointHandles(hit.pointId);
                return;
              } else {
                // No handles - track for click vs drag decision
                const gridPos = pixelToGrid(mouseX, mouseY);
                setAltClickPointId(hit.pointId);
                setAltClickStartPos(gridPos);
                return;
              }
            }
          }
          
          // Check if clicking first point while drawing (to close shape)
          if (isDrawing && anchorPoints.length > 2 && hit.pointId === anchorPoints[0].id) {
            closeShape();
            return;
          }

          // Handle selection logic
          const clickedPoint = anchorPoints.find((p) => p.id === hit.pointId);
          if (clickedPoint) {
            // If shift-clicking, add to or remove from selection
            if (e.shiftKey) {
              selectPoint(hit.pointId, true);
            } else {
              // If clicking an already selected point without shift, keep all selections (for multi-drag)
              // If clicking an unselected point, clear selection and select only this one
              if (!clickedPoint.selected) {
                clearSelection();
                selectPoint(hit.pointId, false);
              }
              // If already selected, don't change selection (allows multi-drag to start)
            }
          }
          
          // Start dragging point
          const gridPos = pixelToGrid(mouseX, mouseY);
          startDragPoint(hit.pointId, gridPos);
        }
        return;
      }

      // Check if clicking on path or inside shape to drag entire shape (do this BEFORE adding new points)
      if (anchorPoints.length >= 2) {
        // For closed shapes, check if clicking inside the filled area
        if (isClosed && !isDrawing) {
          const insideShape = hitTestShapeInterior(mouseX, mouseY);
          if (insideShape) {
            const gridPos = pixelToGrid(mouseX, mouseY);
            startDragShape(gridPos);
            return;
          }
        }
        
        // For both open and closed shapes (including during drawing), check if clicking on the path line
        // But NOT if holding Cmd/Ctrl (that's for inserting points)
        if (!(e.metaKey || e.ctrlKey)) {
          const pathHit = hitTestPath(mouseX, mouseY);
          if (pathHit) {
            const gridPos = pixelToGrid(mouseX, mouseY);
            startDragShape(gridPos);
            return;
          }
        }
      }

      // No hit on point/handle/path - check if Cmd+click on path to insert point
      if ((e.metaKey || e.ctrlKey) && anchorPoints.length >= 2) {
        const pathHit = hitTestPath(mouseX, mouseY);
        if (pathHit) {
          insertPointOnSegment(pathHit.afterIndex, pathHit.position, pathHit.t);
          return;
        }
      }

      // No hit - place new anchor point if drawing
      if (isDrawing || anchorPoints.length === 0) {
        const gridPos = pixelToGrid(mouseX, mouseY);
        const withHandles = false; // Will be determined by drag behavior
        
        // addAnchorPoint now returns the ID of the newly created point
        const newPointId = addAnchorPoint(gridPos.x, gridPos.y, withHandles);
        
        // Track that we just placed a point - if mouse moves we'll add handles
        setPlacementStartPos(gridPos);
        setPlacingPointId(newPointId);
      } else if (isClosed) {
        // Click outside closed shape - commit it
        handleCommit();
      }
    },
    [
      hitTest,
      hitTestPath,
      hitTestShapeInterior,
      isDrawing,
      isClosed,
      anchorPoints,
      pixelToGrid,
      addAnchorPoint,
      closeShape,
      togglePointHandles,
      breakHandleSymmetry,
      selectPoint,
      clearSelection,
      startDragPoint,
      startDragHandle,
      startDragShape,
      insertPointOnSegment,
      handleCommit,
      removePoint,
    ]
  );

  /**
   * Handle mouse move - update drag state or hover
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!overlayRef.current) return;

      const rect = overlayRef.current.getBoundingClientRect();
      // Adjust for both container position and SVG transform offset
      const mouseX = e.clientX - rect.left - svgOffsetRef.current.x;
      const mouseY = e.clientY - rect.top - svgOffsetRef.current.y;
      const gridPos = pixelToGrid(mouseX, mouseY);

      // Check if Alt+clicking a point without handles - decide between click (toggle with smart handles) vs drag (zero-length handles)
      if (altClickPointId && altClickStartPos) {
        const deltaX = gridPos.x - altClickStartPos.x;
        const deltaY = gridPos.y - altClickStartPos.y;
        const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // If moved more than 0.1 grid units, it's a drag - enable zero-length handles
        if (dist > 0.1) {
          enableHandlesForDrag(altClickPointId);
          startDragHandle(altClickPointId, 'out', altClickStartPos);
          
          // Clear alt-click state
          setAltClickPointId(null);
          setAltClickStartPos(null);
        }
      }

      // Check if we're dragging from a just-placed point to create handles
      if (placingPointId && placementStartPos) {
        const deltaX = gridPos.x - placementStartPos.x;
        const deltaY = gridPos.y - placementStartPos.y;
        const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // If moved more than 0.1 grid units, add handles and start dragging
        if (dist > 0.1) {
          // Enable handles starting at zero length (cursor position)
          enableHandlesForDrag(placingPointId);
          
          // Start dragging the out handle from the point's position
          startDragHandle(placingPointId, 'out', placementStartPos);
          
          // Clear placement state
          setPlacingPointId(null);
          setPlacementStartPos(null);
        }
      }

      if (isDraggingPoint || isDraggingHandle || isDraggingShape) {
        // Convert pixel coordinates to grid coordinates for the store
        updateDrag(gridPos, e.shiftKey);
      }
      
      // Update hover state for Cmd+hover functionality (add/delete point)
      if (cmdKeyPressed && !isDraggingPoint && !isDraggingHandle && !isDraggingShape) {
        const hit = hitTest(mouseX, mouseY);
        if (hit && hit.type === 'point') {
          // Hovering over a point with Cmd = delete mode
          // Only update if different from current state
          if (hoverState?.type !== 'point' || hoverState.pointId !== hit.pointId) {
            setHoverState({ type: 'point', pointId: hit.pointId });
          }
        } else if (anchorPoints.length >= 2) {
          // Check if hovering over path segment
          const pathHit = hitTestPath(mouseX, mouseY);
          if (pathHit) {
            // Only update if different from current state
            if (hoverState?.type !== 'path' || hoverState.afterIndex !== pathHit.afterIndex) {
              setHoverState({ type: 'path', ...pathHit });
            }
          } else {
            if (hoverState !== null) {
              setHoverState(null);
            }
          }
        } else {
          if (hoverState !== null) {
            setHoverState(null);
          }
        }
      } else {
        if (hoverState !== null) {
          setHoverState(null);
        }
      }
    },
    [
      isDraggingPoint,
      isDraggingHandle,
      isDraggingShape,
      updateDrag,
      pixelToGrid,
      altClickPointId,
      altClickStartPos,
      placingPointId,
      placementStartPos,
      enableHandlesForDrag,
      startDragHandle,
      cmdKeyPressed,
      hitTest,
      hitTestPath,
      anchorPoints.length,
      hoverState,
    ]
  );

  /**
   * Handle mouse up - end interaction
   */
  const handleMouseUp = useCallback(() => {
    // If Alt+clicked point without dragging, use smart handle generation
    if (altClickPointId && altClickStartPos) {
      togglePointHandles(altClickPointId);
      setAltClickPointId(null);
      setAltClickStartPos(null);
    }
    
    // Clear placement tracking
    setPlacingPointId(null);
    setPlacementStartPos(null);
    
    if (isDraggingPoint || isDraggingHandle || isDraggingShape) {
      endDrag();
    }
  }, [
    altClickPointId,
    altClickStartPos,
    isDraggingPoint,
    isDraggingHandle,
    isDraggingShape,
    togglePointHandles,
    endDrag,
  ]);

  /**
   * Render the bezier path (memoized for performance)
   */
  const pathElement = useMemo(() => {
    if (anchorPoints.length === 0) return null;

    let pathD = '';
    const firstPoint = anchorPoints[0];
    const firstPixel = gridToPixel(firstPoint.position.x, firstPoint.position.y);

    pathD += `M ${firstPixel.x} ${firstPixel.y}`;

    for (let i = 1; i < anchorPoints.length; i++) {
      const prevPoint = anchorPoints[i - 1];
      const currPoint = anchorPoints[i];

      const prevPixel = gridToPixel(prevPoint.position.x, prevPoint.position.y);
      const currPixel = gridToPixel(currPoint.position.x, currPoint.position.y);

      // Determine if we can draw a bezier curve
      const prevHasOut = prevPoint.hasHandles && prevPoint.handleOut;
      const currHasIn = currPoint.hasHandles && currPoint.handleIn;
      
      if (prevHasOut && currHasIn) {
        // Both points have handles - use cubic bezier
        const cp1 = {
          x: prevPixel.x + prevPoint.handleOut!.x * effectiveCellWidth,
          y: prevPixel.y + prevPoint.handleOut!.y * effectiveCellHeight,
        };
        const cp2 = {
          x: currPixel.x + currPoint.handleIn!.x * effectiveCellWidth,
          y: currPixel.y + currPoint.handleIn!.y * effectiveCellHeight,
        };
        pathD += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${currPixel.x} ${currPixel.y}`;
      } else if (prevHasOut) {
        // Only previous point has handle out - use quadratic bezier
        const cp = {
          x: prevPixel.x + prevPoint.handleOut!.x * effectiveCellWidth,
          y: prevPixel.y + prevPoint.handleOut!.y * effectiveCellHeight,
        };
        pathD += ` Q ${cp.x} ${cp.y}, ${currPixel.x} ${currPixel.y}`;
      } else if (currHasIn) {
        // Only current point has handle in - use quadratic bezier
        const cp = {
          x: currPixel.x + currPoint.handleIn!.x * effectiveCellWidth,
          y: currPixel.y + currPoint.handleIn!.y * effectiveCellHeight,
        };
        pathD += ` Q ${cp.x} ${cp.y}, ${currPixel.x} ${currPixel.y}`;
      } else {
        // Neither point has handles - straight line
        pathD += ` L ${currPixel.x} ${currPixel.y}`;
      }
    }

    // Close path if needed
    if (isClosed && anchorPoints.length > 2) {
      const lastPoint = anchorPoints[anchorPoints.length - 1];
      const firstPoint = anchorPoints[0];
      
      const lastHasOut = lastPoint.hasHandles && lastPoint.handleOut;
      const firstHasIn = firstPoint.hasHandles && firstPoint.handleIn;

      if (lastHasOut && firstHasIn) {
        // Both points have handles - use cubic bezier
        const lastPixel = gridToPixel(lastPoint.position.x, lastPoint.position.y);
        const firstPixel = gridToPixel(firstPoint.position.x, firstPoint.position.y);

        const cp1 = {
          x: lastPixel.x + lastPoint.handleOut!.x * effectiveCellWidth,
          y: lastPixel.y + lastPoint.handleOut!.y * effectiveCellHeight,
        };
        const cp2 = {
          x: firstPixel.x + firstPoint.handleIn!.x * effectiveCellWidth,
          y: firstPixel.y + firstPoint.handleIn!.y * effectiveCellHeight,
        };
        pathD += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${firstPixel.x} ${firstPixel.y}`;
      } else if (lastHasOut) {
        // Only last point has handle out - use quadratic bezier
        const lastPixel = gridToPixel(lastPoint.position.x, lastPoint.position.y);
        const firstPixel = gridToPixel(firstPoint.position.x, firstPoint.position.y);
        
        const cp = {
          x: lastPixel.x + lastPoint.handleOut!.x * effectiveCellWidth,
          y: lastPixel.y + lastPoint.handleOut!.y * effectiveCellHeight,
        };
        pathD += ` Q ${cp.x} ${cp.y}, ${firstPixel.x} ${firstPixel.y}`;
      } else if (firstHasIn) {
        // Only first point has handle in - use quadratic bezier
        const firstPixel = gridToPixel(firstPoint.position.x, firstPoint.position.y);
        
        const cp = {
          x: firstPixel.x + firstPoint.handleIn!.x * effectiveCellWidth,
          y: firstPixel.y + firstPoint.handleIn!.y * effectiveCellHeight,
        };
        pathD += ` Q ${cp.x} ${cp.y}, ${firstPixel.x} ${firstPixel.y}`;
      }
      // If neither has handles, the Z command will just draw a straight line
      
      pathD += ' Z';
    }

    return (
      <path
        d={pathD}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }, [anchorPoints, isClosed, gridToPixel, effectiveCellWidth, effectiveCellHeight]);

  /**
   * Render anchor points and handles (memoized for performance)
   */
  const controlsElement = useMemo(() => {
    return anchorPoints.map((point) => {
      const pointPixel = gridToPixel(point.position.x, point.position.y);

      return (
        <g key={point.id}>
          {/* Handle lines */}
          {point.hasHandles && (
            <>
              {point.handleIn && (
                <line
                  x1={pointPixel.x}
                  y1={pointPixel.y}
                  x2={pointPixel.x + point.handleIn.x * effectiveCellWidth}
                  y2={pointPixel.y + point.handleIn.y * effectiveCellHeight}
                  stroke="#9ca3af"
                  strokeWidth={1}
                  strokeDasharray="4 2"
                />
              )}
              {point.handleOut && (
                <line
                  x1={pointPixel.x}
                  y1={pointPixel.y}
                  x2={pointPixel.x + point.handleOut.x * effectiveCellWidth}
                  y2={pointPixel.y + point.handleOut.y * effectiveCellHeight}
                  stroke="#9ca3af"
                  strokeWidth={1}
                  strokeDasharray="4 2"
                />
              )}
            </>
          )}

          {/* Handle control points - white fill, black stroke, white outer stroke */}
          {point.hasHandles && (
            <>
              {point.handleIn && (
                <>
                  {/* Outer white stroke */}
                  <circle
                    cx={pointPixel.x + point.handleIn.x * effectiveCellWidth}
                    cy={pointPixel.y + point.handleIn.y * effectiveCellHeight}
                    r={5}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2}
                    style={{ pointerEvents: 'none' }}
                  />
                  {/* Inner handle with black stroke and white fill */}
                  <circle
                    cx={pointPixel.x + point.handleIn.x * effectiveCellWidth}
                    cy={pointPixel.y + point.handleIn.y * effectiveCellHeight}
                    r={4}
                    fill="#ffffff"
                    stroke="#1f2937"
                    strokeWidth={1.5}
                    style={{ cursor: 'pointer' }}
                  />
                </>
              )}
              {point.handleOut && (
                <>
                  {/* Outer white stroke */}
                  <circle
                    cx={pointPixel.x + point.handleOut.x * effectiveCellWidth}
                    cy={pointPixel.y + point.handleOut.y * effectiveCellHeight}
                    r={5}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2}
                    style={{ pointerEvents: 'none' }}
                  />
                  {/* Inner handle with black stroke and white fill */}
                  <circle
                    cx={pointPixel.x + point.handleOut.x * effectiveCellWidth}
                    cy={pointPixel.y + point.handleOut.y * effectiveCellHeight}
                    r={4}
                    fill="#ffffff"
                    stroke="#1f2937"
                    strokeWidth={1.5}
                    style={{ cursor: 'pointer' }}
                  />
                </>
              )}
            </>
          )}

          {/* Anchor point - white fill with black stroke and white outer stroke */}
          {/* Outer white stroke */}
          <circle
            cx={pointPixel.x}
            cy={pointPixel.y}
            r={7}
            fill="none"
            stroke="#ffffff"
            strokeWidth={2}
            style={{ pointerEvents: 'none' }}
          />
          {/* Inner point with selection styling */}
          <circle
            cx={pointPixel.x}
            cy={pointPixel.y}
            r={6}
            fill={point.selected ? '#3b82f6' : '#ffffff'}
            stroke={point.selected ? '#3b82f6' : '#1f2937'}
            strokeWidth={2}
            style={{ 
              cursor: 'pointer',
              filter: point.selected ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.6))' : 'none'
            }}
          />
        </g>
      );
    });
  }, [anchorPoints, gridToPixel, effectiveCellWidth, effectiveCellHeight]);

  // Determine cursor class based on cmd key and hover state (memoized for performance)
  const cursorClass = useMemo(() => {
    if (activeTool !== 'beziershape') return '';
    
    // If dragging anything, show grabbing cursor
    if (isDraggingPoint || isDraggingHandle || isDraggingShape) {
      return 'cursor-grabbing';
    }
    
    // If Cmd key is pressed and hovering over something
    if (cmdKeyPressed && hoverState) {
      if (hoverState.type === 'path') {
        // Hovering over path with Cmd = add point
        return 'cursor-bezier-add';
      } else if (hoverState.type === 'point') {
        // Hovering over point with Cmd = remove point
        return 'cursor-bezier-remove';
      }
    }
    
    // Default bezier cursor
    return 'cursor-bezier';
  }, [activeTool, cmdKeyPressed, hoverState, isDraggingPoint, isDraggingHandle, isDraggingShape]);

  // Only show overlay when bezier tool is active
  if (activeTool !== 'beziershape') {
    return null;
  }

  // Calculate bounds to expand the interactive area for off-screen elements
  // Note: cursor is now handled via CSS classes (getCursorClass)
  let containerStyle: React.CSSProperties = { 
    zIndex: 20,
    position: 'absolute',
    inset: 0
  };

  // Reset offset (will be updated if we expand container)
  svgOffsetRef.current = { x: 0, y: 0 };

  if (anchorPoints.length > 0) {
    // Find bounds of all points and handles in pixel space
    let minX = 0, minY = 0, maxX = 0, maxY = 0;
    
    anchorPoints.forEach(point => {
      const pixel = gridToPixel(point.position.x, point.position.y);
      minX = Math.min(minX, pixel.x);
      minY = Math.min(minY, pixel.y);
      maxX = Math.max(maxX, pixel.x);
      maxY = Math.max(maxY, pixel.y);
      
      // Also consider handles
      if (point.hasHandles) {
        if (point.handleIn) {
          const handleX = pixel.x + point.handleIn.x * effectiveCellWidth;
          const handleY = pixel.y + point.handleIn.y * effectiveCellHeight;
          minX = Math.min(minX, handleX);
          minY = Math.min(minY, handleY);
          maxX = Math.max(maxX, handleX);
          maxY = Math.max(maxY, handleY);
        }
        if (point.handleOut) {
          const handleX = pixel.x + point.handleOut.x * effectiveCellWidth;
          const handleY = pixel.y + point.handleOut.y * effectiveCellHeight;
          minX = Math.min(minX, handleX);
          minY = Math.min(minY, handleY);
          maxX = Math.max(maxX, handleX);
          maxY = Math.max(maxY, handleY);
        }
      }
    });
    
    // Add padding for handles and stroke width
    const padding = 50;
    minX = Math.min(minX - padding, 0);
    minY = Math.min(minY - padding, 0);
    
    // Expand container to cover all points
    if (minX < 0 || minY < 0) {
      containerStyle = {
        ...containerStyle,
        left: minX,
        top: minY,
        right: -Math.max(maxX + padding - (overlayRef.current?.offsetWidth || 0), 0),
        bottom: -Math.max(maxY + padding - (overlayRef.current?.offsetHeight || 0), 0),
      };
      
      // Store offset for mouse coordinate adjustment
      svgOffsetRef.current = { x: -minX, y: -minY };
    }
  }

  return (
    <div
      ref={overlayRef}
      className={`pointer-events-auto ${cursorClass}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={containerStyle}
    >
      <svg 
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none', overflow: 'visible' }}
      >
        <g transform={`translate(${svgOffsetRef.current.x}, ${svgOffsetRef.current.y})`}>
          {pathElement}
          {controlsElement}
        </g>
      </svg>
    </div>
  );
};
