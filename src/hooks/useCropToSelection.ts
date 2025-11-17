import { useCallback } from 'react';
import { toast } from 'sonner';
import { useCanvasStore } from '../stores/canvasStore';
import { useToolStore } from '../stores/toolStore';
import { useAnimationStore } from '../stores/animationStore';
import { cropCanvasToSelection, cropAllFramesToSelection } from '../utils/cropUtils';

/**
 * Hook for cropping canvas to selection across all frames
 * Supports rectangular, lasso, and magic wand selections
 */
export function useCropToSelection() {
  const { width: canvasWidth, height: canvasHeight, cells, setCanvasSize, setCanvasData } = useCanvasStore();
  const { selection, lassoSelection, magicWandSelection, activeTool, pushCanvasResizeHistory, clearSelection, clearLassoSelection, clearMagicWandSelection } = useToolStore();
  const { frames, currentFrameIndex, setFrameData } = useAnimationStore();

  /**
   * Get the current active selection's cells based on active tool
   */
  const getActiveSelection = useCallback((): Set<string> | null => {
    // Check which selection tool is active and has a selection
    if (activeTool === 'select' && selection.active && selection.selectedCells.size > 0) {
      return selection.selectedCells;
    } else if (activeTool === 'lasso' && lassoSelection.active && lassoSelection.selectedCells.size > 0) {
      return lassoSelection.selectedCells;
    } else if (activeTool === 'magicwand' && magicWandSelection.active && magicWandSelection.selectedCells.size > 0) {
      return magicWandSelection.selectedCells;
    }
    
    return null;
  }, [activeTool, selection, lassoSelection, magicWandSelection]);

  /**
   * Check if crop is available (has active selection)
   */
  const canCrop = useCallback((): boolean => {
    const activeSelection = getActiveSelection();
    return activeSelection !== null && activeSelection.size > 0;
  }, [getActiveSelection]);

  /**
   * Crop canvas to current selection across all frames
   */
  const cropToSelection = useCallback(() => {
    const selectedCells = getActiveSelection();
    
    if (!selectedCells || selectedCells.size === 0) {
      console.warn('No active selection to crop to');
      return;
    }

    // Crop current frame to get new dimensions
    const cropResult = cropCanvasToSelection(cells, selectedCells);
    
    if (!cropResult) {
      console.warn('Failed to calculate crop dimensions');
      return;
    }

    const { newWidth, newHeight, croppedCells } = cropResult;

    // Validate new dimensions
    if (newWidth < 4 || newWidth > 200 || newHeight < 4 || newHeight > 100) {
      toast.error('Cannot execute crop: minimum canvas size is 4x4 characters.');
      return;
    }

    // Save previous state for undo - including ALL frames
    const previousWidth = canvasWidth;
    const previousHeight = canvasHeight;
    const previousCells = new Map(cells);
    const previousAllFramesData = frames.map(frame => new Map(frame.data));

    // Crop all frames
    const croppedFrames = cropAllFramesToSelection(frames, selectedCells);
    
    if (!croppedFrames) {
      console.warn('Failed to crop frames');
      return;
    }

    // Apply crop to all frames
    croppedFrames.forEach((croppedFrameData, index) => {
      setFrameData(index, croppedFrameData);
    });

    // Apply crop to current canvas
    setCanvasSize(newWidth, newHeight);
    setCanvasData(croppedCells);

    // Add to history - we'll use a custom approach to store all frames
    // We'll create a canvas_resize action but extend it with all frames data
    const action = {
      type: 'canvas_resize' as const,
      timestamp: Date.now(),
      description: `Crop canvas from ${previousWidth}×${previousHeight} to ${newWidth}×${newHeight}`,
      data: {
        previousWidth,
        previousHeight,
        newWidth,
        newHeight,
        previousCanvasData: previousCells,
        frameIndex: currentFrameIndex,
        // Store all frames' previous data for crop operations
        allFramesPreviousData: previousAllFramesData,
        allFramesNewData: croppedFrames,
        isCropOperation: true
      }
    };
    
    // Push to history using the internal method
    useToolStore.getState().pushToHistory(action as any);

    // Clear the selection after crop
    if (activeTool === 'select') {
      clearSelection();
    } else if (activeTool === 'lasso') {
      clearLassoSelection();
    } else if (activeTool === 'magicwand') {
      clearMagicWandSelection();
    }

    console.log(`Canvas cropped from ${previousWidth}×${previousHeight} to ${newWidth}×${newHeight}`);
  }, [
    getActiveSelection,
    cells,
    canvasWidth,
    canvasHeight,
    frames,
    currentFrameIndex,
    activeTool,
    setCanvasSize,
    setCanvasData,
    setFrameData,
    clearSelection,
    clearLassoSelection,
    clearMagicWandSelection
  ]);

  return {
    canCrop,
    cropToSelection
  };
}
