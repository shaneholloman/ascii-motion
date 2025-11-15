/**
 * Bezier Fill Utilities
 * 
 * Implements the three fill modes for bezier shapes:
 * 1. Constant Fill - Simple point-in-path test
 * 2. Palette Fill - Overlap percentage mapped to palette characters
 * 3. Autofill - 9-region detection with intelligent character selection
 */

import type { Cell } from '../types';
import type { BezierAnchorPoint } from '../stores/bezierStore';
import { createBezierPath, getIntegerBounds } from './bezierPathUtils';
import {
  getSharedCanvas,
  isCellInside,
  calculateCellOverlap,
  detectCellRegions,
} from './bezierAutofillUtils';
import { getCharacterForPattern } from '../constants/bezierAutofill';

/**
 * Fill cells using constant fill mode
 * Any cell whose center is inside the bezier shape gets filled with the selected character
 * 
 * @param anchorPoints - Bezier anchor points defining the shape
 * @param isClosed - Whether the shape is closed
 * @param canvasWidth - Width of the canvas in cells
 * @param canvasHeight - Height of the canvas in cells
 * @param cellWidth - Width of a single cell in pixels
 * @param cellHeight - Height of a single cell in pixels
 * @param zoom - Current zoom level
 * @param panOffset - Pan offset in pixels
 * @param selectedChar - Character to fill with
 * @param selectedColor - Text color to apply
 * @param selectedBgColor - Background color to apply
 * @returns Map of cell keys to Cell objects
 */
export function fillConstant(
  anchorPoints: BezierAnchorPoint[],
  isClosed: boolean,
  canvasWidth: number,
  canvasHeight: number,
  cellWidth: number,
  cellHeight: number,
  zoom: number,
  panOffset: { x: number; y: number },
  selectedChar: string,
  selectedColor: string,
  selectedBgColor: string
): Map<string, Cell> {
  const filledCells = new Map<string, Cell>();

  if (!isClosed || anchorPoints.length < 3) {
    return filledCells; // Need closed shape with at least 3 points
  }

  // Get bounding box to limit iterations
  const bounds = getIntegerBounds(anchorPoints, canvasWidth, canvasHeight);

  // Create Path2D for hit testing
  const path = createBezierPath(
    anchorPoints,
    isClosed,
    cellWidth,
    cellHeight,
    zoom,
    panOffset
  );

  // Get shared canvas for point-in-path testing
  const { ctx } = getSharedCanvas(canvasWidth * cellWidth, canvasHeight * cellHeight);

  // Test each cell in bounding box
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      if (isCellInside(x, y, path, ctx, cellWidth, cellHeight, zoom, panOffset)) {
        const key = `${x},${y}`;
        filledCells.set(key, {
          char: selectedChar,
          color: selectedColor,
          bgColor: selectedBgColor,
        });
      }
    }
  }

  return filledCells;
}

/**
 * Fill cells using palette fill mode
 * Maps overlap percentage to character in the current palette
 * 
 * @param anchorPoints - Bezier anchor points defining the shape
 * @param isClosed - Whether the shape is closed
 * @param canvasWidth - Width of the canvas in cells
 * @param canvasHeight - Height of the canvas in cells
 * @param cellWidth - Width of a single cell in pixels
 * @param cellHeight - Height of a single cell in pixels
 * @param zoom - Current zoom level
 * @param panOffset - Pan offset in pixels
 * @param palette - Array of characters to use (ordered from empty to full)
 * @param selectedColor - Text color to apply
 * @param selectedBgColor - Background color to apply
 * @returns Map of cell keys to Cell objects
 */
export function fillPalette(
  anchorPoints: BezierAnchorPoint[],
  isClosed: boolean,
  canvasWidth: number,
  canvasHeight: number,
  cellWidth: number,
  cellHeight: number,
  zoom: number,
  panOffset: { x: number; y: number },
  palette: string[],
  selectedColor: string,
  selectedBgColor: string
): Map<string, Cell> {
  const filledCells = new Map<string, Cell>();

  if (!isClosed || anchorPoints.length < 3) {
    return filledCells;
  }

  if (palette.length === 0) {
    console.warn('[bezierFill] Empty palette provided, no fill applied');
    return filledCells;
  }

  // Get bounding box
  const bounds = getIntegerBounds(anchorPoints, canvasWidth, canvasHeight);

  // Create Path2D
  const path = createBezierPath(
    anchorPoints,
    isClosed,
    cellWidth,
    cellHeight,
    zoom,
    panOffset
  );

  // Get shared canvas
  const { ctx } = getSharedCanvas(canvasWidth * cellWidth, canvasHeight * cellHeight);

  // Test each cell
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const overlapPercentage = calculateCellOverlap(
        x,
        y,
        path,
        ctx,
        cellWidth,
        cellHeight,
        zoom,
        panOffset
      );

      if (overlapPercentage > 0) {
        // Map percentage to palette index
        const paletteIndex = Math.min(
          Math.floor((overlapPercentage / 100) * palette.length),
          palette.length - 1
        );

        const key = `${x},${y}`;
        filledCells.set(key, {
          char: palette[paletteIndex],
          color: selectedColor,
          bgColor: selectedBgColor,
        });
      }
    }
  }

  return filledCells;
}

/**
 * Fill cells using autofill mode
 * Intelligently selects characters based on 9-region overlap detection
 * 
 * @param anchorPoints - Bezier anchor points defining the shape
 * @param isClosed - Whether the shape is closed
 * @param canvasWidth - Width of the canvas in cells
 * @param canvasHeight - Height of the canvas in cells
 * @param cellWidth - Width of a single cell in pixels
 * @param cellHeight - Height of a single cell in pixels
 * @param zoom - Current zoom level
 * @param panOffset - Pan offset in pixels
 * @param paletteId - ID of the autofill palette to use ('block', 'ansi', etc.)
 * @param selectedColor - Text color to apply
 * @param selectedBgColor - Background color to apply
 * @returns Map of cell keys to Cell objects
 */
export function fillAutofill(
  anchorPoints: BezierAnchorPoint[],
  isClosed: boolean,
  canvasWidth: number,
  canvasHeight: number,
  cellWidth: number,
  cellHeight: number,
  zoom: number,
  panOffset: { x: number; y: number },
  paletteId: string,
  selectedColor: string,
  selectedBgColor: string
): Map<string, Cell> {
  const filledCells = new Map<string, Cell>();

  if (!isClosed || anchorPoints.length < 3) {
    return filledCells;
  }

  // Get bounding box
  const bounds = getIntegerBounds(anchorPoints, canvasWidth, canvasHeight);

  // Create Path2D
  const path = createBezierPath(
    anchorPoints,
    isClosed,
    cellWidth,
    cellHeight,
    zoom,
    panOffset
  );

  // Get shared canvas
  const { ctx } = getSharedCanvas(canvasWidth * cellWidth, canvasHeight * cellHeight);

  // Test each cell with 9-region detection
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const filledRegions = detectCellRegions(
        x,
        y,
        path,
        ctx,
        cellWidth,
        cellHeight,
        zoom,
        panOffset
      );

      // Only fill cells that have at least one region covered
      if (filledRegions.size > 0) {
        const character = getCharacterForPattern(paletteId, filledRegions);

        const key = `${x},${y}`;
        filledCells.set(key, {
          char: character,
          color: selectedColor,
          bgColor: selectedBgColor,
        });
      }
    }
  }

  return filledCells;
}

/**
 * Generate preview cells based on current fill mode and settings
 * This is the main entry point called by the bezier overlay/tool manager
 * 
 * @param anchorPoints - Bezier anchor points
 * @param isClosed - Whether the shape is closed
 * @param fillMode - Fill mode ('constant', 'palette', 'autofill')
 * @param canvasWidth - Canvas width in cells
 * @param canvasHeight - Canvas height in cells
 * @param cellWidth - Cell width in pixels
 * @param cellHeight - Cell height in pixels
 * @param zoom - Zoom level
 * @param panOffset - Pan offset
 * @param selectedChar - Selected character for constant mode
 * @param selectedColor - Text color
 * @param selectedBgColor - Background color
 * @param palette - Character palette for palette mode (optional)
 * @param autofillPaletteId - Palette ID for autofill mode (optional)
 * @returns Object with preview cells and affected cell count
 */
export function generateBezierPreview(
  anchorPoints: BezierAnchorPoint[],
  isClosed: boolean,
  fillMode: 'constant' | 'palette' | 'autofill',
  canvasWidth: number,
  canvasHeight: number,
  cellWidth: number,
  cellHeight: number,
  zoom: number,
  panOffset: { x: number; y: number },
  selectedChar: string,
  selectedColor: string,
  selectedBgColor: string,
  palette?: string[],
  autofillPaletteId?: string
): { previewCells: Map<string, Cell>; affectedCount: number } {
  let previewCells: Map<string, Cell>;

  switch (fillMode) {
    case 'constant':
      previewCells = fillConstant(
        anchorPoints,
        isClosed,
        canvasWidth,
        canvasHeight,
        cellWidth,
        cellHeight,
        zoom,
        panOffset,
        selectedChar,
        selectedColor,
        selectedBgColor
      );
      break;

    case 'palette':
      if (!palette || palette.length === 0) {
        console.warn('[bezierFill] Palette mode selected but no palette provided');
        previewCells = new Map();
      } else {
        previewCells = fillPalette(
          anchorPoints,
          isClosed,
          canvasWidth,
          canvasHeight,
          cellWidth,
          cellHeight,
          zoom,
          panOffset,
          palette,
          selectedColor,
          selectedBgColor
        );
      }
      break;

    case 'autofill':
      const paletteIdToUse = autofillPaletteId || 'block';
      previewCells = fillAutofill(
        anchorPoints,
        isClosed,
        canvasWidth,
        canvasHeight,
        cellWidth,
        cellHeight,
        zoom,
        panOffset,
        paletteIdToUse,
        selectedColor,
        selectedBgColor
      );
      break;

    default:
      console.warn(`[bezierFill] Unknown fill mode: ${fillMode}`);
      previewCells = new Map();
  }

  return {
    previewCells,
    affectedCount: previewCells.size,
  };
}
