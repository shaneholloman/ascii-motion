import type { Cell } from '../types';
import { getBoundsFromMask } from './selectionUtils';

/**
 * Crop canvas data to the bounds of a selection
 * Returns new canvas dimensions and repositioned cell data
 */
export interface CropResult {
  newWidth: number;
  newHeight: number;
  croppedCells: Map<string, Cell>;
}

export function cropCanvasToSelection(
  cells: Map<string, Cell>,
  selectedCells: Set<string>
): CropResult | null {
  // Get bounds from selection
  const bounds = getBoundsFromMask(selectedCells);
  
  if (!bounds) {
    return null;
  }

  const { minX, minY, maxX, maxY } = bounds;
  
  // Calculate new canvas dimensions
  const newWidth = maxX - minX + 1;
  const newHeight = maxY - minY + 1;
  
  // Create new cell map with repositioned cells
  const croppedCells = new Map<string, Cell>();
  
  // Only copy cells that are within the selection
  selectedCells.forEach((key) => {
    const [x, y] = key.split(',').map(Number);
    const cell = cells.get(key);
    
    if (cell) {
      // Reposition cell relative to new origin (minX, minY)
      const newX = x - minX;
      const newY = y - minY;
      const newKey = `${newX},${newY}`;
      croppedCells.set(newKey, { ...cell });
    }
  });
  
  return {
    newWidth,
    newHeight,
    croppedCells
  };
}

/**
 * Crop all frames in an animation to match selection bounds
 * Returns array of cropped frame data
 */
export function cropAllFramesToSelection(
  frames: Array<{ data: Map<string, Cell> }>,
  selectedCells: Set<string>
): Array<Map<string, Cell>> | null {
  const bounds = getBoundsFromMask(selectedCells);
  
  if (!bounds) {
    return null;
  }

  const { minX, minY, maxX, maxY } = bounds;
  
  return frames.map((frame) => {
    const croppedCells = new Map<string, Cell>();
    
    // Reposition all cells in this frame
    frame.data.forEach((cell, key) => {
      const [x, y] = key.split(',').map(Number);
      
      // Only keep cells within the crop bounds
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        const newX = x - minX;
        const newY = y - minY;
        const newKey = `${newX},${newY}`;
        croppedCells.set(newKey, { ...cell });
      }
    });
    
    return croppedCells;
  });
}
