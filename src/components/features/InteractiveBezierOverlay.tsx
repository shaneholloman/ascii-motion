/**
 * Interactive Bezier Overlay
 * 
 * SVG overlay for drawing and editing bezier shapes with handles.
 * Handles all mouse interactions for creating anchor points, dragging
 * points/handles, and manipulating the entire shape.
 */

import React, { useCallback, useRef, useState } from 'react';
import { useBezierStore } from '../../stores/bezierStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useToolStore } from '../../stores/toolStore';

export const InteractiveBezierOverlay: React.FC = () => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const { activeTool } = useToolStore();
  const { cellWidth, cellHeight, zoom, panOffset } = useCanvasContext();
  
  // Track if we just placed a new point and should be creating handles on drag
  const [placingPointId, setPlacingPointId] = useState<string | null>(null);
  const [placementStartPos, setPlacementStartPos] = useState<{ x: number; y: number } | null>(null);
  
  const {
    anchorPoints,
    isClosed,
    isDrawing,
    isDraggingPoint,
    isDraggingHandle,
    isDraggingShape,
    addAnchorPoint,
    closeShape,
    togglePointHandles,
    breakHandleSymmetry,
    selectPoint,
    clearSelection,
    startDragPoint,
    startDragHandle,
    updateDrag,
    endDrag,
  } = useBezierStore();

  const effectiveCellWidth = cellWidth * zoom;
  const effectiveCellHeight = cellHeight * zoom;

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

      // Test if inside shape (for dragging entire shape)
      if (isClosed && anchorPoints.length > 0) {
        // TODO: Implement proper point-in-polygon test
        // For now, return null to prevent shape dragging
      }

      return null;
    },
    [anchorPoints, isClosed, gridToPixel, effectiveCellWidth, effectiveCellHeight]
  );

  /**
   * Handle mouse down - start interaction
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!overlayRef.current) return;

      const rect = overlayRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

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
          // Alt + click = toggle handles
          if (e.altKey && !isDrawing) {
            togglePointHandles(hit.pointId);
            return;
          }
          
          // Check if clicking first point while drawing (to close shape)
          if (isDrawing && anchorPoints.length > 2 && hit.pointId === anchorPoints[0].id) {
            closeShape();
            return;
          }

          // Start dragging point
          if (!e.shiftKey) {
            clearSelection();
          }
          selectPoint(hit.pointId, e.shiftKey);
          const gridPos = pixelToGrid(mouseX, mouseY);
          startDragPoint(hit.pointId, gridPos);
        }
        return;
      }

      // No hit - place new anchor point if drawing
      if (isDrawing || anchorPoints.length === 0) {
        const gridPos = pixelToGrid(mouseX, mouseY);
        const withHandles = false; // Will be determined by drag behavior
        addAnchorPoint(gridPos.x, gridPos.y, withHandles);
        
        // Track that we just placed a point - if mouse moves we'll add handles
        const newPointId = anchorPoints.length === 0 ? 'anchor-0' : `anchor-${anchorPoints.length}`;
        setPlacingPointId(newPointId);
        setPlacementStartPos(gridPos);
      } else if (isClosed) {
        // Click outside closed shape - commit it
        // TODO: Implement commit logic
      }
    },
    [
      hitTest,
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
    ]
  );

  /**
   * Handle mouse move - update drag state or hover
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!overlayRef.current) return;

      const rect = overlayRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const gridPos = pixelToGrid(mouseX, mouseY);

      // Check if we're dragging from a just-placed point to create handles
      if (placingPointId && placementStartPos) {
        const deltaX = gridPos.x - placementStartPos.x;
        const deltaY = gridPos.y - placementStartPos.y;
        const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // If moved more than 0.1 grid units, add handles and start dragging
        if (dist > 0.1) {
          // Convert point to have handles
          togglePointHandles(placingPointId);
          
          // Start dragging the out handle
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
      
      // TODO: Update cursor based on hover state
    },
    [
      isDraggingPoint,
      isDraggingHandle,
      isDraggingShape,
      updateDrag,
      pixelToGrid,
      placingPointId,
      placementStartPos,
      togglePointHandles,
      startDragHandle,
    ]
  );

  /**
   * Handle mouse up - end interaction
   */
  const handleMouseUp = useCallback(() => {
    // Clear placement tracking
    setPlacingPointId(null);
    setPlacementStartPos(null);
    
    if (isDraggingPoint || isDraggingHandle || isDraggingShape) {
      endDrag();
    }
  }, [isDraggingPoint, isDraggingHandle, isDraggingShape, endDrag]);

  /**
   * Render the bezier path
   */
  const renderPath = () => {
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

      if (
        prevPoint.hasHandles &&
        prevPoint.handleOut &&
        currPoint.hasHandles &&
        currPoint.handleIn
      ) {
        // Bezier curve
        const cp1 = {
          x: prevPixel.x + prevPoint.handleOut.x * effectiveCellWidth,
          y: prevPixel.y + prevPoint.handleOut.y * effectiveCellHeight,
        };
        const cp2 = {
          x: currPixel.x + currPoint.handleIn.x * effectiveCellWidth,
          y: currPixel.y + currPoint.handleIn.y * effectiveCellHeight,
        };
        pathD += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${currPixel.x} ${currPixel.y}`;
      } else {
        // Straight line
        pathD += ` L ${currPixel.x} ${currPixel.y}`;
      }
    }

    // Close path if needed
    if (isClosed && anchorPoints.length > 2) {
      const lastPoint = anchorPoints[anchorPoints.length - 1];
      const firstPoint = anchorPoints[0];

      if (
        lastPoint.hasHandles &&
        lastPoint.handleOut &&
        firstPoint.hasHandles &&
        firstPoint.handleIn
      ) {
        const lastPixel = gridToPixel(lastPoint.position.x, lastPoint.position.y);
        const firstPixel = gridToPixel(firstPoint.position.x, firstPoint.position.y);

        const cp1 = {
          x: lastPixel.x + lastPoint.handleOut.x * effectiveCellWidth,
          y: lastPixel.y + lastPoint.handleOut.y * effectiveCellHeight,
        };
        const cp2 = {
          x: firstPixel.x + firstPoint.handleIn.x * effectiveCellWidth,
          y: firstPixel.y + firstPoint.handleIn.y * effectiveCellHeight,
        };
        pathD += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${firstPixel.x} ${firstPixel.y}`;
      }
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
  };

  /**
   * Render anchor points and handles
   */
  const renderControls = () => {
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

          {/* Handle control points */}
          {point.hasHandles && (
            <>
              {point.handleIn && (
                <circle
                  cx={pointPixel.x + point.handleIn.x * effectiveCellWidth}
                  cy={pointPixel.y + point.handleIn.y * effectiveCellHeight}
                  r={4}
                  fill="#d1d5db"
                  stroke="#1f2937"
                  strokeWidth={1.5}
                  style={{ cursor: 'pointer' }}
                />
              )}
              {point.handleOut && (
                <circle
                  cx={pointPixel.x + point.handleOut.x * effectiveCellWidth}
                  cy={pointPixel.y + point.handleOut.y * effectiveCellHeight}
                  r={4}
                  fill="#d1d5db"
                  stroke="#1f2937"
                  strokeWidth={1.5}
                  style={{ cursor: 'pointer' }}
                />
              )}
            </>
          )}

          {/* Anchor point */}
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
  };

  // Only show overlay when bezier tool is active
  if (activeTool !== 'beziershape') {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 pointer-events-auto"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        cursor: isDraggingPoint || isDraggingHandle || isDraggingShape ? 'grabbing' : 'crosshair',
      }}
    >
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        {renderPath()}
        {renderControls()}
      </svg>
    </div>
  );
};
