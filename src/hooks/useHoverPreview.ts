import { useEffect, useRef, useMemo } from 'react';
import { useToolStore } from '../stores/toolStore';
import { useCanvasContext } from '../contexts/CanvasContext';
import { calculateBrushCells } from '../utils/brushUtils';

/**
 * Hook for calculating and managing hover preview patterns for different tools
 * 
 * This hook monitors the current tool, tool settings, and cursor position to
 * automatically update the canvas hover preview overlay. The preview shows
 * which cells will be affected by the tool action before clicking.
 * 
 * Supported modes:
 * - 'brush': Shows brush pattern based on current size/shape (pencil tool)
 * - 'none': No preview (default for most tools)
 * 
 * Future extensibility:
 * - 'rectangle': Preview rectangle bounds before drawing
 * - 'ellipse': Preview ellipse shape before drawing
 * - 'line': Preview line path from start point to cursor
 * - 'paint-bucket': Preview fill area before applying
 */
export const useHoverPreview = () => {
  const { activeTool, brushSettings } = useToolStore();
  const { hoveredCell, fontMetrics, setHoverPreview, isDrawing, altKeyDown, ctrlKeyDown } = useCanvasContext();
  
  // Calculate effective tool (Ctrl overrides pencil with eraser, Alt overrides drawing tools with eyedropper)
  const drawingTools = ['pencil', 'eraser', 'paintbucket', 'rectangle', 'ellipse'];
  const shouldAllowEyedropperOverride = drawingTools.includes(activeTool);
  let effectiveTool = activeTool;
  if (ctrlKeyDown && activeTool === 'pencil') {
    effectiveTool = 'eraser';
  } else if (altKeyDown && shouldAllowEyedropperOverride) {
    effectiveTool = 'eyedropper';
  }
  
  const activeBrush = effectiveTool === 'eraser' ? brushSettings.eraser : brushSettings.pencil;
  
  // Use RAF to throttle updates
  const rafIdRef = useRef<number | null>(null);
  
  // Memoize brush pattern calculation - only recalculate when brush settings change
  const brushCellsCache = useRef<Map<string, { x: number; y: number }[]>>(new Map());
  
  const getBrushCells = useMemo(() => {
    return (x: number, y: number, size: number, shape: string, aspectRatio: number) => {
      const cacheKey = `${x},${y},${size},${shape},${aspectRatio}`;
      
      if (!brushCellsCache.current.has(cacheKey)) {
        // Limit cache size to prevent memory issues
        if (brushCellsCache.current.size > 100) {
          const firstKey = brushCellsCache.current.keys().next().value;
          if (firstKey) brushCellsCache.current.delete(firstKey);
        }
        
        const cells = calculateBrushCells(x, y, size, shape as any, aspectRatio);
        brushCellsCache.current.set(cacheKey, cells);
      }
      
      return brushCellsCache.current.get(cacheKey)!;
    };
  }, []);
  
  useEffect(() => {
    // Cancel any pending RAF
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    // Throttle updates using RAF
    rafIdRef.current = requestAnimationFrame(() => {
      // Don't show preview while actively drawing
      if (isDrawing) {
        setHoverPreview({ active: false, mode: 'none', cells: [] });
        return;
      }
      
      // Clear preview when mouse leaves canvas
      if (!hoveredCell) {
        setHoverPreview({ active: false, mode: 'none', cells: [] });
        return;
      }
      
      // Calculate preview based on active tool
      switch (effectiveTool) {
        case 'pencil':
        case 'eraser': {
          // Use cached brush pattern calculation
          const brushCells = getBrushCells(
            hoveredCell.x,
            hoveredCell.y,
            activeBrush.size,
            activeBrush.shape,
            fontMetrics.aspectRatio
          );
          
          setHoverPreview({
            active: true,
            mode: effectiveTool === 'eraser' ? 'eraser-brush' : 'brush',
            cells: brushCells
          });
          break;
        }
        
        default:
          // No hover preview for other tools (selection, eyedropper, etc.)
          setHoverPreview({ active: false, mode: 'none', cells: [] });
      }
    });
    
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [
    hoveredCell, 
    effectiveTool,
    activeBrush.size,
    activeBrush.shape,
    fontMetrics.aspectRatio,
    isDrawing,
    setHoverPreview,
    getBrushCells
  ]);
};
