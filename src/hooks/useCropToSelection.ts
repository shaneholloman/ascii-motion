import { useCallback } from 'react';
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
  const { selection, lassoSelection, magicWandSelection, activeTool, pushCanvasResizeHistory } = useToolStore();
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
      console.error('Crop dimensions out of valid range (4-200 x 4-100)');
      return;
    }

    // Save previous state for undo
    const previousWidth = canvasWidth;
    const previousHeight = canvasHeight;
    const previousCells = new Map(cells);

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

    // Add to history
    pushCanvasResizeHistory(
      previousWidth,
      previousHeight,
      newWidth,
      newHeight,
      previousCells,
      currentFrameIndex
    );

    console.log(`Canvas cropped from ${previousWidth}×${previousHeight} to ${newWidth}×${newHeight}`);
  }, [
    getActiveSelection,
    cells,
    canvasWidth,
    canvasHeight,
    frames,
    currentFrameIndex,
    setCanvasSize,
    setCanvasData,
    setFrameData,
    pushCanvasResizeHistory
  ]);

  return {
    canCrop,
    cropToSelection
  };
}
