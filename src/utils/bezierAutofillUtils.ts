/**
 * Bezier Autofill Utilities
 * 
 * Canvas-based 9-region detection system for intelligent character selection
 * in bezier shape fills. Uses shared canvas for performance optimization.
 */

import type { RegionName } from '../constants/bezierAutofill';

/**
 * Shared canvas for all point-in-path tests
 * This avoids creating/destroying canvas contexts (GC thrashing)
 */
let sharedCanvas: HTMLCanvasElement | null = null;
let sharedCtx: CanvasRenderingContext2D | null = null;

/**
 * Get or create the shared canvas and context
 * Resizes if needed to accommodate the current test size
 * 
 * @param width - Required canvas width
 * @param height - Required canvas height
 * @returns Object with canvas and 2D rendering context
 */
export function getSharedCanvas(
  width: number,
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  if (!sharedCanvas) {
    sharedCanvas = document.createElement('canvas');
    sharedCtx = sharedCanvas.getContext('2d', { willReadFrequently: true });
    
    if (!sharedCtx) {
      throw new Error('[bezierAutofill] Failed to create 2D rendering context');
    }
  }
  
  // Resize if needed
  if (sharedCanvas.width < width || sharedCanvas.height < height) {
    sharedCanvas.width = Math.max(width, sharedCanvas.width);
    sharedCanvas.height = Math.max(height, sharedCanvas.height);
  }
  
  // Clear for fresh test
  sharedCtx!.clearRect(0, 0, width, height);
  
  return { canvas: sharedCanvas, ctx: sharedCtx! };
}

/**
 * Detect which of the 9 regions in a cell are covered by a bezier path
 * 
 * Cell Division (3x3 grid):
 * ```
 * ┌─────┬─────┬─────┐
 * │ TL  │ TC  │ TR  │
 * ├─────┼─────┼─────┤
 * │ ML  │ MC  │ MR  │
 * ├─────┼─────┼─────┤
 * │ BL  │ BC  │ BR  │
 * └─────┴─────┴─────┘
 * ```
 * 
 * Each region is sampled at its center point to determine coverage.
 * 
 * @param cellX - Cell X coordinate (integer)
 * @param cellY - Cell Y coordinate (integer)
 * @param path - Path2D object to test against
 * @param ctx - Canvas rendering context
 * @param cellWidth - Width of a single cell in pixels (unzoomed)
 * @param cellHeight - Height of a single cell in pixels (unzoomed)
 * @param zoom - Current zoom level (1.0 = 100%)
 * @param panOffset - Pan offset in pixels
 * @returns Set of region names that are covered by the path
 */
export function detectCellRegions(
  cellX: number,
  cellY: number,
  path: Path2D,
  ctx: CanvasRenderingContext2D,
  cellWidth: number,
  cellHeight: number,
  zoom: number,
  panOffset: { x: number; y: number }
): Set<RegionName> {
  const filledRegions = new Set<RegionName>();
  
  // In our coordinate system, grid coordinate n represents the center of cell n.
  // To sample regions within the cell, we offset by fractions from the center.
  // For a cell at position cellX:
  // - cellX - 1/3 is the left third
  // - cellX is the center
  // - cellX + 1/3 is the right third
  
  // Define 9 region centers (in grid coordinates)
  // Each region is 1/3 of the cell width/height offset from cell center
  const regions: Array<{ name: RegionName; x: number; y: number }> = [
    { name: 'TL', x: cellX - 1/3, y: cellY - 1/3 },      // Top-left
    { name: 'TC', x: cellX,      y: cellY - 1/3 },       // Top-center
    { name: 'TR', x: cellX + 1/3, y: cellY - 1/3 },      // Top-right
    { name: 'ML', x: cellX - 1/3, y: cellY      },       // Middle-left
    { name: 'MC', x: cellX,      y: cellY       },       // Middle-center
    { name: 'MR', x: cellX + 1/3, y: cellY      },       // Middle-right
    { name: 'BL', x: cellX - 1/3, y: cellY + 1/3 },      // Bottom-left
    { name: 'BC', x: cellX,      y: cellY + 1/3 },       // Bottom-center
    { name: 'BR', x: cellX + 1/3, y: cellY + 1/3 },      // Bottom-right
  ];
  
  // Test each region center
  for (const region of regions) {
    if (isPointInPath(region.x, region.y, path, ctx, cellWidth, cellHeight, zoom, panOffset)) {
      filledRegions.add(region.name);
    }
  }
  
  return filledRegions;
}

/**
 * Test if a point (in grid coordinates) is inside a path
 * 
 * @param x - X coordinate in grid space
 * @param y - Y coordinate in grid space
 * @param path - Path2D object to test against
 * @param ctx - Canvas rendering context
 * @param cellWidth - Width of a single cell in pixels (unzoomed)
 * @param cellHeight - Height of a single cell in pixels (unzoomed)
 * @param zoom - Current zoom level (1.0 = 100%)
 * @param panOffset - Pan offset in pixels
 * @returns True if the point is inside the path
 */
export function isPointInPath(
  x: number,
  y: number,
  path: Path2D,
  ctx: CanvasRenderingContext2D,
  cellWidth: number,
  cellHeight: number,
  zoom: number,
  panOffset: { x: number; y: number }
): boolean {
  // Convert grid coordinates to pixel coordinates
  const pixelX = x * cellWidth * zoom + panOffset.x + (cellWidth * zoom) / 2;
  const pixelY = y * cellHeight * zoom + panOffset.y + (cellHeight * zoom) / 2;
  
  return ctx.isPointInPath(path, pixelX, pixelY);
}

/**
 * Calculate overlap percentage for a cell (used in palette fill mode)
 * 
 * Subsamples the cell into a 5x5 grid (25 sample points) and counts
 * how many points are inside the bezier path.
 * 
 * @param cellX - Cell X coordinate (integer)
 * @param cellY - Cell Y coordinate (integer)
 * @param path - Path2D object to test against
 * @param ctx - Canvas rendering context
 * @param cellWidth - Width of a single cell in pixels (unzoomed)
 * @param cellHeight - Height of a single cell in pixels (unzoomed)
 * @param zoom - Current zoom level (1.0 = 100%)
 * @param panOffset - Pan offset in pixels
 * @returns Overlap percentage (0-100)
 */
export function calculateCellOverlap(
  cellX: number,
  cellY: number,
  path: Path2D,
  ctx: CanvasRenderingContext2D,
  cellWidth: number,
  cellHeight: number,
  zoom: number,
  panOffset: { x: number; y: number }
): number {
  const SUBSAMPLE_SIZE = 5;
  let overlapCount = 0;
  
  // Sample across the cell, centered around cellX, cellY
  // Grid coordinate cellX represents the cell center, so we sample
  // from (cellX - 0.5) to (cellX + 0.5)
  for (let sy = 0; sy < SUBSAMPLE_SIZE; sy++) {
    for (let sx = 0; sx < SUBSAMPLE_SIZE; sx++) {
      // Sample at regular intervals across the cell
      // Map from [0, SUBSAMPLE_SIZE-1] to [-0.4, 0.4] (staying within cell bounds)
      const offsetX = (sx / (SUBSAMPLE_SIZE - 1) - 0.5) * 0.8;
      const offsetY = (sy / (SUBSAMPLE_SIZE - 1) - 0.5) * 0.8;
      
      const sampleX = cellX + offsetX;
      const sampleY = cellY + offsetY;
      
      if (isPointInPath(sampleX, sampleY, path, ctx, cellWidth, cellHeight, zoom, panOffset)) {
        overlapCount++;
      }
    }
  }
  
  const totalSamples = SUBSAMPLE_SIZE * SUBSAMPLE_SIZE;
  return (overlapCount / totalSamples) * 100;
}

/**
 * Simple point-in-polygon test (used for constant fill mode)
 * 
 * Tests the center of the cell to determine if it's inside the bezier path.
 * This is the fastest method and appropriate for simple fills.
 * 
 * Note: In our coordinate system, grid coordinate n represents the center
 * of cell n. So to test cell 10, we test grid coordinate 10, not 10.5.
 * 
 * @param cellX - Cell X coordinate (integer)
 * @param cellY - Cell Y coordinate (integer)
 * @param path - Path2D object to test against
 * @param ctx - Canvas rendering context
 * @param cellWidth - Width of a single cell in pixels (unzoomed)
 * @param cellHeight - Height of a single cell in pixels (unzoomed)
 * @param zoom - Current zoom level (1.0 = 100%)
 * @param panOffset - Pan offset in pixels
 * @returns True if the cell center is inside the path
 */
export function isCellInside(
  cellX: number,
  cellY: number,
  path: Path2D,
  ctx: CanvasRenderingContext2D,
  cellWidth: number,
  cellHeight: number,
  zoom: number,
  panOffset: { x: number; y: number }
): boolean {
  // Test center of cell (grid coordinate = cell index in our coordinate system)
  return isPointInPath(cellX, cellY, path, ctx, cellWidth, cellHeight, zoom, panOffset);
}

/**
 * Cleanup function to release shared canvas resources
 * Should be called when the bezier tool is fully deactivated
 */
export function cleanupSharedCanvas(): void {
  sharedCanvas = null;
  sharedCtx = null;
}
