# Bezier Shape Tool - Complete Implementation Plan

## Overview
A sophisticated bezier shape drawing tool inspired by Figma/Illustrator pen tools, with three intelligent fill modes for ASCII art creation. The tool provides vector-like precision with ASCII-specific rendering optimizations.

**Tool ID**: `beziershape`
**Hotkey**: `P` (Pencil will move to `B`)
**Category**: Drawing Tools

---

## 🎯 User Interaction Flow

### Creating the Shape
1. **First Click**: Places first anchor point with no handles
2. **Click (no drag)**: Places straight anchor point with no handles
3. **Click + Drag**: Places smooth anchor point with symmetric bezier handles
4. **Alt + Click** on point: Toggles between handles/no handles
5. **Alt + Click + Drag** handle: Breaks handle symmetry (independent movement)
6. **Shift + Drag** handle: Constrains handle to horizontal or vertical (45° snap)
7. **Click first point**: Closes the shape
8. **Click inside shape + Drag**: Moves entire shape
9. **Shift + Click** multiple points: Multi-select points for group movement

### Committing/Canceling
- **Enter**: Commits shape to canvas
- **Escape**: Cancels and reverts to previous state
- **Click outside shape** (not on control): Commits shape to canvas
- **Frame change during creation**: Auto-commits shape to original frame, clears tool state

### During Creation
- Real-time preview of ASCII fill based on selected mode
- Live cell count in status bar (e.g., "142 cells affected")
- Vector overlay shows bezier curves and control points
- Preview characters at 95% opacity (conceals background completely)

---

## 📊 Data Structures

### Bezier Store State

```typescript
// src/stores/bezierStore.ts

interface BezierAnchorPoint {
  id: string; // Unique ID for each point
  position: { x: number; y: number }; // Grid coordinates
  hasHandles: boolean;
  handleIn: { x: number; y: number } | null; // Relative to position
  handleOut: { x: number; y: number } | null; // Relative to position
  handleSymmetric: boolean; // If false, handles move independently
  selected: boolean; // For multi-select
}

interface BezierShapeState {
  // Core bezier data
  anchorPoints: BezierAnchorPoint[];
  isClosed: boolean;
  
  // Interaction state
  isDrawing: boolean;
  isEditingShape: boolean; // True when shape is closed but not committed
  isDraggingPoint: boolean;
  isDraggingHandle: boolean;
  isDraggingShape: boolean;
  dragStartMousePos: { x: number; y: number } | null;
  dragStartShapePos: { x: number; y: number }[] | null; // Store all point positions
  
  // Dragging details
  draggingPointId: string | null;
  draggingHandleId: { pointId: string; type: 'in' | 'out' } | null;
  
  // Fill configuration
  fillMode: 'constant' | 'palette' | 'autofill';
  autofillPaletteId: string; // 'block' or 'ansi' (or future palettes)
  
  // Preview data
  previewCells: Map<string, Cell> | null;
  affectedCellCount: number;
  
  // Original frame tracking for frame-switch behavior
  originalFrameIndex: number | null;
}

// Actions
interface BezierStoreActions {
  // Shape creation
  addAnchorPoint: (x: number, y: number, withHandles: boolean) => void;
  updateLastAnchorHandles: (handleOut: { x: number; y: number }) => void;
  closeShape: () => void;
  
  // Point manipulation
  togglePointHandles: (pointId: string) => void;
  updatePointPosition: (pointId: string, newPos: { x: number; y: number }) => void;
  updateHandle: (pointId: string, handleType: 'in' | 'out', newPos: { x: number; y: number }) => void;
  breakHandleSymmetry: (pointId: string) => void;
  
  // Selection
  selectPoint: (pointId: string, addToSelection: boolean) => void;
  selectMultiplePoints: (pointIds: string[]) => void;
  clearSelection: () => void;
  
  // Dragging
  startDragPoint: (pointId: string, mousePos: { x: number; y: number }) => void;
  startDragHandle: (pointId: string, handleType: 'in' | 'out', mousePos: { x: number; y: number }) => void;
  startDragShape: (mousePos: { x: number; y: number }) => void;
  updateDrag: (mousePos: { x: number; y: number }, shiftKey: boolean) => void;
  endDrag: () => void;
  
  // Fill modes
  setFillMode: (mode: 'constant' | 'palette' | 'autofill') => void;
  setAutofillPaletteId: (paletteId: string) => void;
  
  // Preview
  updatePreview: (canvasData: Map<string, Cell>, width: number, height: number) => void;
  
  // Commit/cancel
  commitShape: () => Map<string, Cell>;
  cancelShape: () => void;
  reset: () => void;
}
```

---

## 🔧 Fill Mode Implementations

### 1. Constant Fill Mode
**Logic**: Any cell overlapped by bezier shape → fill with selected character

**Performance**: Fast - simple point-in-polygon test
```typescript
// For each cell center point, test if inside bezier shape
const isCellAffected = isPointInsideBezierShape(cellCenterX, cellCenterY, bezierPath);
if (isCellAffected) {
  fillCell(cellX, cellY, selectedChar, selectedColor, selectedBgColor);
}
```

### 2. Palette Fill Mode
**Logic**: Map overlap percentage to character in current palette

**Algorithm**:
1. Calculate percentage of cell overlapped by bezier shape (0-100%)
2. Map percentage to palette index: `index = Math.floor(percentage / 100 * paletteLength)`
3. Fill cell with `palette[index]`

**Performance**: Medium - requires subsampling for accuracy
```typescript
// Subsample cell into 5x5 grid (25 sample points)
const SUBSAMPLE_SIZE = 5;
let overlapCount = 0;

for (let sy = 0; sy < SUBSAMPLE_SIZE; sy++) {
  for (let sx = 0; sx < SUBSAMPLE_SIZE; sx++) {
    const sampleX = cellX + (sx + 0.5) / SUBSAMPLE_SIZE;
    const sampleY = cellY + (sy + 0.5) / SUBSAMPLE_SIZE;
    if (isPointInsideBezierShape(sampleX, sampleY, bezierPath)) {
      overlapCount++;
    }
  }
}

const overlapPercentage = (overlapCount / (SUBSAMPLE_SIZE * SUBSAMPLE_SIZE)) * 100;
const paletteIndex = Math.min(
  Math.floor(overlapPercentage / 100 * palette.length),
  palette.length - 1
);
fillCell(cellX, cellY, palette[paletteIndex], selectedColor, selectedBgColor);
```

**Edge Cases**:
- Empty palette: No fill, show warning in status bar
- Single character palette: Behaves like constant fill mode

### 3. Autofill Mode (Most Complex)
**Logic**: Intelligently select characters that match the overlap pattern

**Performance**: Medium - uses 9-region detection with canvas-based sampling

**Implementation Strategy**: **Canvas-based sampling** (faster and more accurate than pure math)

**Autofill Palettes**: Multiple character sets available for different aesthetic styles

#### Character Mapping System

**9-Region Cell Division**:
```
┌─────┬─────┬─────┐
│ TL  │ TC  │ TR  │  T = Top, M = Middle, B = Bottom
├─────┼─────┼─────┤  L = Left, C = Center, R = Right
│ ML  │ MC  │ MR  │
├─────┼─────┼─────┤
│ BL  │ BC  │ BR  │
└─────┴─────┴─────┘
```

**Character Map Architecture**:

Each autofill palette is a self-contained, human-readable file that can be easily tuned.

```typescript
// src/constants/bezierAutofill/types.ts

export type RegionName = 'TL' | 'TC' | 'TR' | 'ML' | 'MC' | 'MR' | 'BL' | 'BC' | 'BR';

export interface RegionPattern {
  regions: Set<RegionName>;
  character: string;
  priority: number; // Higher = prefer when multiple matches
  description?: string; // Human-readable description
}

export interface AutofillPalette {
  id: string;
  name: string;
  description: string;
  patterns: RegionPattern[];
}
```

**Palette 1: Block Characters** (`src/constants/bezierAutofill/blockCharacters.ts`):
```typescript
import { AutofillPalette, RegionPattern } from './types';

/**
 * Block Characters Palette
 * Uses Unicode block drawing characters for precise shape representation
 * Best for: Technical diagrams, geometric shapes, pixel-art style
 */
export const BLOCK_CHARACTERS_PALETTE: AutofillPalette = {
  id: 'block',
  name: 'Block Characters',
  description: 'Unicode block elements for precise geometric fills',
  patterns: [
    // ========================================
    // FULL COVERAGE
    // ========================================
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC', 'BR']),
      character: '█',
      priority: 100,
      description: 'Full block - all regions covered'
    },
    
    // ========================================
    // HORIZONTAL FILLS
    // ========================================
    {
      regions: new Set(['BL', 'BC', 'BR']),
      character: '▁',
      priority: 90,
      description: 'Bottom third'
    },
    {
      regions: new Set(['TL', 'TC', 'TR']),
      character: '▔',
      priority: 90,
      description: 'Top third'
    },
    {
      regions: new Set(['ML', 'MC', 'MR', 'BL', 'BC', 'BR']),
      character: '▄',
      priority: 85,
      description: 'Bottom half block'
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC', 'MR']),
      character: '▀',
      priority: 85,
      description: 'Top half block'
    },
    
    // ========================================
    // VERTICAL FILLS
    // ========================================
    {
      regions: new Set(['TL', 'ML', 'BL']),
      character: '▌',
      priority: 90,
      description: 'Left half block'
    },
    {
      regions: new Set(['TR', 'MR', 'BR']),
      character: '▐',
      priority: 90,
      description: 'Right half block'
    },
    
    // ========================================
    // QUARTER BLOCKS (CORNERS)
    // ========================================
    {
      regions: new Set(['BL']),
      character: '▖',
      priority: 80,
      description: 'Bottom-left quarter'
    },
    {
      regions: new Set(['BR']),
      character: '▗',
      priority: 80,
      description: 'Bottom-right quarter'
    },
    {
      regions: new Set(['TL']),
      character: '▘',
      priority: 80,
      description: 'Top-left quarter'
    },
    {
      regions: new Set(['TR']),
      character: '▝',
      priority: 80,
      description: 'Top-right quarter'
    },
    
    // ========================================
    // DIAGONAL FILLS
    // ========================================
    {
      regions: new Set(['TL', 'ML', 'MC', 'MR', 'BR']),
      character: '/',
      priority: 75,
      description: 'Diagonal forward slash'
    },
    {
      regions: new Set(['TR', 'MC', 'ML', 'MR', 'BL']),
      character: '\\',
      priority: 75,
      description: 'Diagonal backslash'
    },
    
    // ========================================
    // CENTER & LINE FILLS
    // ========================================
    {
      regions: new Set(['MC']),
      character: '·',
      priority: 70,
      description: 'Center dot'
    },
    {
      regions: new Set(['TC', 'MC', 'BC']),
      character: '│',
      priority: 85,
      description: 'Vertical line'
    },
    {
      regions: new Set(['ML', 'MC', 'MR']),
      character: '─',
      priority: 85,
      description: 'Horizontal line'
    },
    
    // ========================================
    // COMPLEX PATTERNS
    // ========================================
    {
      regions: new Set(['TL', 'TC', 'ML', 'MC']),
      character: '▛',
      priority: 80,
      description: 'Top-left quadrant block'
    },
    {
      regions: new Set(['TC', 'TR', 'MC', 'MR']),
      character: '▜',
      priority: 80,
      description: 'Top-right quadrant block'
    },
    {
      regions: new Set(['ML', 'MC', 'BL', 'BC']),
      character: '▙',
      priority: 80,
      description: 'Bottom-left quadrant block'
    },
    {
      regions: new Set(['MC', 'MR', 'BC', 'BR']),
      character: '▟',
      priority: 80,
      description: 'Bottom-right quadrant block'
    },
    
    // ========================================
    // FALLBACK
    // ========================================
    {
      regions: new Set([]),
      character: ' ',
      priority: 0,
      description: 'Empty - no coverage'
    }
  ]
};
```

**Palette 2: Classic ANSI** (`src/constants/bezierAutofill/ansiCharacters.ts`):
```typescript
import { AutofillPalette, RegionPattern } from './types';

/**
 * Classic ANSI Characters Palette
 * Uses traditional ASCII characters (letters, numbers, punctuation, math symbols)
 * Best for: Retro terminal aesthetic, text-based art, classic ASCII style
 */
export const ANSI_CHARACTERS_PALETTE: AutofillPalette = {
  id: 'ansi',
  name: 'Classic ANSI',
  description: 'Traditional ASCII characters for retro terminal aesthetics',
  patterns: [
    // ========================================
    // FULL COVERAGE - Dense characters
    // ========================================
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC', 'BR']),
      character: '#',
      priority: 100,
      description: 'Full coverage - hash/pound sign'
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC', 'BR']),
      character: '@',
      priority: 99,
      description: 'Full coverage - at sign (alternative)'
    },
    
    // ========================================
    // HIGH DENSITY (7-8 regions)
    // ========================================
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC']),
      character: '&',
      priority: 90,
      description: 'Very dense - ampersand'
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BC', 'BR']),
      character: '%',
      priority: 90,
      description: 'Very dense - percent'
    },
    
    // ========================================
    // MEDIUM-HIGH DENSITY (5-6 regions)
    // ========================================
    {
      regions: new Set(['ML', 'MC', 'MR', 'BL', 'BC', 'BR']),
      character: '=',
      priority: 80,
      description: 'Bottom two-thirds - equals'
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'ML', 'MC', 'MR']),
      character: '"',
      priority: 80,
      description: 'Top two-thirds - quotes'
    },
    {
      regions: new Set(['TC', 'TR', 'MC', 'MR', 'BC', 'BR']),
      character: '$',
      priority: 80,
      description: 'Right two-thirds - dollar'
    },
    {
      regions: new Set(['TL', 'TC', 'ML', 'MC', 'BL', 'BC']),
      character: 'S',
      priority: 80,
      description: 'Left two-thirds - letter S'
    },
    
    // ========================================
    // MEDIUM DENSITY (4 regions)
    // ========================================
    {
      regions: new Set(['TL', 'TC', 'ML', 'MC']),
      character: 'P',
      priority: 75,
      description: 'Top-left quadrant - letter P'
    },
    {
      regions: new Set(['TC', 'TR', 'MC', 'MR']),
      character: 'D',
      priority: 75,
      description: 'Top-right quadrant - letter D'
    },
    {
      regions: new Set(['ML', 'MC', 'BL', 'BC']),
      character: 'L',
      priority: 75,
      description: 'Bottom-left quadrant - letter L'
    },
    {
      regions: new Set(['MC', 'MR', 'BC', 'BR']),
      character: 'J',
      priority: 75,
      description: 'Bottom-right quadrant - letter J'
    },
    
    // ========================================
    // HORIZONTAL FILLS
    // ========================================
    {
      regions: new Set(['BL', 'BC', 'BR']),
      character: '_',
      priority: 85,
      description: 'Bottom row - underscore'
    },
    {
      regions: new Set(['TL', 'TC', 'TR']),
      character: '^',
      priority: 85,
      description: 'Top row - caret'
    },
    {
      regions: new Set(['ML', 'MC', 'MR']),
      character: '-',
      priority: 85,
      description: 'Middle row - dash'
    },
    
    // ========================================
    // VERTICAL FILLS
    // ========================================
    {
      regions: new Set(['TL', 'ML', 'BL']),
      character: '[',
      priority: 85,
      description: 'Left column - left bracket'
    },
    {
      regions: new Set(['TR', 'MR', 'BR']),
      character: ']',
      priority: 85,
      description: 'Right column - right bracket'
    },
    {
      regions: new Set(['TC', 'MC', 'BC']),
      character: '|',
      priority: 85,
      description: 'Center column - pipe'
    },
    
    // ========================================
    // DIAGONAL FILLS
    // ========================================
    {
      regions: new Set(['TL', 'MC', 'BR']),
      character: '/',
      priority: 80,
      description: 'Diagonal - forward slash'
    },
    {
      regions: new Set(['TR', 'MC', 'BL']),
      character: '\\',
      priority: 80,
      description: 'Diagonal - backslash'
    },
    {
      regions: new Set(['TL', 'ML', 'MC', 'MR', 'BR']),
      character: '/',
      priority: 75,
      description: 'Wide diagonal forward'
    },
    {
      regions: new Set(['TR', 'ML', 'MC', 'MR', 'BL']),
      character: '\\',
      priority: 75,
      description: 'Wide diagonal back'
    },
    
    // ========================================
    // CORNER CHARACTERS
    // ========================================
    {
      regions: new Set(['BL']),
      character: '.',
      priority: 80,
      description: 'Bottom-left corner - period'
    },
    {
      regions: new Set(['BR']),
      character: '.',
      priority: 79,
      description: 'Bottom-right corner - period'
    },
    {
      regions: new Set(['TL']),
      character: "'",
      priority: 80,
      description: 'Top-left corner - apostrophe'
    },
    {
      regions: new Set(['TR']),
      character: "'",
      priority: 79,
      description: 'Top-right corner - apostrophe'
    },
    
    // ========================================
    // CENTER & SMALL FILLS
    // ========================================
    {
      regions: new Set(['MC']),
      character: '·',
      priority: 70,
      description: 'Center only - middle dot'
    },
    {
      regions: new Set(['MC']),
      character: '+',
      priority: 69,
      description: 'Center only - plus (alternative)'
    },
    {
      regions: new Set(['MC']),
      character: 'o',
      priority: 68,
      description: 'Center only - lowercase o (alternative)'
    },
    
    // ========================================
    // LIGHT DENSITY (2-3 regions)
    // ========================================
    {
      regions: new Set(['TL', 'TC']),
      character: '`',
      priority: 65,
      description: 'Top-left duo - backtick'
    },
    {
      regions: new Set(['TR', 'TC']),
      character: "'",
      priority: 65,
      description: 'Top-right duo - apostrophe'
    },
    {
      regions: new Set(['BL', 'ML']),
      character: '(',
      priority: 65,
      description: 'Left duo - left paren'
    },
    {
      regions: new Set(['BR', 'MR']),
      character: ')',
      priority: 65,
      description: 'Right duo - right paren'
    },
    {
      regions: new Set(['BL', 'BC']),
      character: ',',
      priority: 65,
      description: 'Bottom-left duo - comma'
    },
    
    // ========================================
    // NUMBERS (for specific patterns)
    // ========================================
    {
      regions: new Set(['TL', 'TC', 'TR', 'MR', 'BL', 'BC', 'BR']),
      character: '8',
      priority: 75,
      description: 'Dense pattern - number 8'
    },
    {
      regions: new Set(['TC', 'MR', 'BC']),
      character: '1',
      priority: 70,
      description: 'Vertical center - number 1'
    },
    {
      regions: new Set(['TL', 'TC', 'TR', 'MC', 'BL', 'BC', 'BR']),
      character: '0',
      priority: 75,
      description: 'Outline pattern - number 0'
    },
    
    // ========================================
    // FALLBACK
    // ========================================
    {
      regions: new Set([]),
      character: ' ',
      priority: 0,
      description: 'Empty - no coverage'
    }
  ]
};
```

**Palette Registry** (`src/constants/bezierAutofill/index.ts`):
```typescript
import { BLOCK_CHARACTERS_PALETTE } from './blockCharacters';
import { ANSI_CHARACTERS_PALETTE } from './ansiCharacters';
import { AutofillPalette, RegionName } from './types';

/**
 * Available autofill palettes
 * Add new palettes here as they are created
 */
export const AUTOFILL_PALETTES: AutofillPalette[] = [
  BLOCK_CHARACTERS_PALETTE,
  ANSI_CHARACTERS_PALETTE,
  // Future palettes can be added here:
  // EMOJI_PALETTE,
  // KAOMOJI_PALETTE,
  // BRAILLE_PALETTE,
  // etc.
];

/**
 * Get palette by ID
 */
export function getPaletteById(id: string): AutofillPalette | null {
  return AUTOFILL_PALETTES.find(p => p.id === id) || null;
}

/**
 * Build lookup map for a specific palette
 */
function buildPatternMap(palette: AutofillPalette): Map<string, string> {
  const map = new Map<string, string>();
  
  // Sort patterns by priority (highest first)
  const sortedPatterns = [...palette.patterns].sort((a, b) => b.priority - a.priority);
  
  sortedPatterns.forEach(pattern => {
    const key = patternKey(pattern.regions);
    // Keep first occurrence (highest priority) for each pattern
    if (!map.has(key)) {
      map.set(key, pattern.character);
    }
  });
  
  return map;
}

/**
 * Convert set to sorted string key for consistent lookup
 */
function patternKey(regions: Set<RegionName>): string {
  return Array.from(regions).sort().join('-');
}

/**
 * Get character for a region pattern using specified palette
 */
export function getCharacterForPattern(
  regions: Set<RegionName>,
  paletteId: string = 'block'
): string {
  const palette = getPaletteById(paletteId);
  if (!palette) {
    console.warn(`Palette "${paletteId}" not found, falling back to block characters`);
    return getCharacterForPattern(regions, 'block');
  }
  
  const patternMap = buildPatternMap(palette);
  const key = patternKey(regions);
  return patternMap.get(key) || ' '; // Fallback to space
}

// Re-export types for convenience
export type { AutofillPalette, RegionPattern, RegionName } from './types';
```

#### Canvas-Based Region Detection

```typescript
// src/utils/bezierAutofillUtils.ts

/**
 * Detect which 9 regions of a cell are covered by the bezier shape
 * Uses hidden canvas for fast pixel-based sampling
 */
export function detectCellRegions(
  cellX: number,
  cellY: number,
  bezierPath: Path2D,
  canvasWidth: number,
  canvasHeight: number
): Set<'TL' | 'TC' | 'TR' | 'ML' | 'MC' | 'MR' | 'BL' | 'BC' | 'BR'> {
  const regions = new Set<string>();
  
  // Create 3x3 sample grid within the cell
  const regionSize = 1 / 3;
  const regionNames = [
    ['TL', 'TC', 'TR'],
    ['ML', 'MC', 'MR'],
    ['BL', 'BC', 'BR']
  ];
  
  // Sample center point of each region
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const sampleX = cellX + (col + 0.5) * regionSize;
      const sampleY = cellY + (row + 0.5) * regionSize;
      
      if (isPointInPath(sampleX, sampleY, bezierPath, canvasWidth, canvasHeight)) {
        regions.add(regionNames[row][col]);
      }
    }
  }
  
  return regions as Set<'TL' | 'TC' | 'TR' | 'ML' | 'MC' | 'MR' | 'BL' | 'BC' | 'BR'>;
}

// Shared canvas for all point-in-path tests (created once, reused)
let sharedCanvas: HTMLCanvasElement | null = null;
let sharedCtx: CanvasRenderingContext2D | null = null;

function getSharedCanvas(width: number, height: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  if (!sharedCanvas) {
    sharedCanvas = document.createElement('canvas');
    sharedCtx = sharedCanvas.getContext('2d', { willReadFrequently: true })!;
  }
  
  // Resize if needed
  if (sharedCanvas.width !== width || sharedCanvas.height !== height) {
    sharedCanvas.width = width;
    sharedCanvas.height = height;
  }
  
  return { canvas: sharedCanvas, ctx: sharedCtx! };
}

/**
 * Fast point-in-path test using canvas
 */
export function isPointInPath(
  x: number,
  y: number,
  path: Path2D,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  const { ctx } = getSharedCanvas(canvasWidth, canvasHeight);
  return ctx.isPointInPath(path, x, y);
}
```

**Performance Optimization**:
- Single shared canvas for all tests (avoid GC thrashing)
- Batch all cell tests before reading pixel data
- Only test cells in bounding box of bezier shape
- Cache bezier path as Path2D object

---

## 🖼️ Bezier Rendering & Preview

### Bezier Path Construction

```typescript
// src/utils/bezierPathUtils.ts

/**
 * Convert anchor points to Path2D for rendering and hit testing
 */
export function createBezierPath(
  anchorPoints: BezierAnchorPoint[],
  isClosed: boolean,
  cellWidth: number,
  cellHeight: number,
  zoom: number,
  panOffset: { x: number; y: number }
): Path2D {
  if (anchorPoints.length === 0) return new Path2D();
  
  const path = new Path2D();
  
  // Convert first point to pixel coordinates
  const firstPoint = anchorPoints[0];
  const startPixelX = firstPoint.position.x * cellWidth * zoom + panOffset.x + (cellWidth * zoom) / 2;
  const startPixelY = firstPoint.position.y * cellHeight * zoom + panOffset.y + (cellHeight * zoom) / 2;
  
  path.moveTo(startPixelX, startPixelY);
  
  // Draw bezier curves between points
  for (let i = 1; i < anchorPoints.length; i++) {
    const prevPoint = anchorPoints[i - 1];
    const currPoint = anchorPoints[i];
    
    const prevPixel = pointToPixel(prevPoint.position, cellWidth, cellHeight, zoom, panOffset);
    const currPixel = pointToPixel(currPoint.position, cellWidth, cellHeight, zoom, panOffset);
    
    if (prevPoint.hasHandles && prevPoint.handleOut && currPoint.hasHandles && currPoint.handleIn) {
      // Bezier curve
      const cp1 = {
        x: prevPixel.x + prevPoint.handleOut.x * cellWidth * zoom,
        y: prevPixel.y + prevPoint.handleOut.y * cellHeight * zoom
      };
      const cp2 = {
        x: currPixel.x + currPoint.handleIn.x * cellWidth * zoom,
        y: currPixel.y + currPoint.handleIn.y * cellHeight * zoom
      };
      path.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, currPixel.x, currPixel.y);
    } else {
      // Straight line
      path.lineTo(currPixel.x, currPixel.y);
    }
  }
  
  // Close path if needed
  if (isClosed && anchorPoints.length > 2) {
    const lastPoint = anchorPoints[anchorPoints.length - 1];
    const firstPoint = anchorPoints[0];
    
    if (lastPoint.hasHandles && lastPoint.handleOut && firstPoint.hasHandles && firstPoint.handleIn) {
      const lastPixel = pointToPixel(lastPoint.position, cellWidth, cellHeight, zoom, panOffset);
      const firstPixel = pointToPixel(firstPoint.position, cellWidth, cellHeight, zoom, panOffset);
      
      const cp1 = {
        x: lastPixel.x + lastPoint.handleOut.x * cellWidth * zoom,
        y: lastPixel.y + lastPoint.handleOut.y * cellHeight * zoom
      };
      const cp2 = {
        x: firstPixel.x + firstPoint.handleIn.x * cellWidth * zoom,
        y: firstPixel.y + firstPoint.handleIn.y * cellHeight * zoom
      };
      path.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, firstPixel.x, firstPixel.y);
    }
    
    path.closePath();
  }
  
  return path;
}

/**
 * Convert grid coordinates to pixel coordinates
 */
function pointToPixel(
  gridPos: { x: number; y: number },
  cellWidth: number,
  cellHeight: number,
  zoom: number,
  panOffset: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: gridPos.x * cellWidth * zoom + panOffset.x + (cellWidth * zoom) / 2,
    y: gridPos.y * cellHeight * zoom + panOffset.y + (cellHeight * zoom) / 2
  };
}

/**
 * Calculate bounding box of bezier shape
 */
export function getBezierBounds(
  anchorPoints: BezierAnchorPoint[]
): { minX: number; minY: number; maxX: number; maxY: number } {
  if (anchorPoints.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  anchorPoints.forEach(point => {
    minX = Math.min(minX, point.position.x);
    minY = Math.min(minY, point.position.y);
    maxX = Math.max(maxX, point.position.x);
    maxY = Math.max(maxY, point.position.y);
    
    // Include handles in bounds
    if (point.hasHandles) {
      if (point.handleIn) {
        minX = Math.min(minX, point.position.x + point.handleIn.x);
        minY = Math.min(minY, point.position.y + point.handleIn.y);
        maxX = Math.max(maxX, point.position.x + point.handleIn.x);
        maxY = Math.max(maxY, point.position.y + point.handleIn.y);
      }
      if (point.handleOut) {
        minX = Math.min(minX, point.position.x + point.handleOut.x);
        minY = Math.min(minY, point.position.y + point.handleOut.y);
        maxX = Math.max(maxX, point.position.x + point.handleOut.x);
        maxY = Math.max(maxY, point.position.y + point.handleOut.y);
      }
    }
  });
  
  return {
    minX: Math.floor(minX),
    minY: Math.floor(minY),
    maxX: Math.ceil(maxX),
    maxY: Math.ceil(maxY)
  };
}
```

### Interactive Overlay Component

```typescript
// src/components/features/InteractiveBezierOverlay.tsx

/**
 * Interactive overlay for bezier shape tool
 * Similar to InteractiveGradientOverlay but for bezier curves
 * 
 * Features:
 * - Render bezier curves and control points
 * - Handle mouse interactions for dragging points/handles/shape
 * - Display preview ASCII characters at 95% opacity
 * - Show live cell count in status bar
 */

// Key visual elements:
// - Anchor points: 6px circles (white fill, dark border)
// - Selected anchor points: 6px circles (blue fill, blue glow)
// - Bezier handles: 4px circles (light grey fill)
// - Handle lines: 1px dashed grey lines
// - Bezier curves: 2px solid blue lines
// - Preview characters: 95% opacity, covering background completely
```

---

## 🔄 Undo/Redo Integration

**Single Undo Action**: Entire shape commit is one action
- No per-point undo during creation/editing
- Only committed shape changes hit the undo stack

```typescript
// When committing shape:
const previousCanvasData = new Map(canvasStore.getState().cells);
pushCanvasHistory(previousCanvasData, currentFrameIndex, 'Bezier shape fill');

// Apply the shape fill
const filledCells = bezierStore.commitShape();
canvasStore.applyCells(filledCells);

// Finalize history with new state
finalizeCanvasHistory(canvasStore.getState().cells);
```

---

## 📱 Frame Switching Behavior

```typescript
// In animation store or frame switcher component:
if (bezierStore.isDrawing || bezierStore.isEditingShape) {
  // Commit shape to original frame
  const originalFrame = bezierStore.originalFrameIndex;
  const filledCells = bezierStore.commitShape();
  
  // Apply to correct frame
  if (originalFrame !== null) {
    animationStore.applyCellsToFrame(originalFrame, filledCells);
  }
  
  // Clear bezier tool state
  bezierStore.reset();
}
```

---

## 🎨 UI Components

### Tool Options Panel

```tsx
// src/components/features/BezierToolOptions.tsx

<div className="flex flex-col gap-2 p-2">
  <div className="text-xs font-semibold text-foreground">Fill Mode</div>
  
  <RadioGroup value={fillMode} onValueChange={setFillMode}>
    <div className="flex items-center gap-2">
      <RadioGroupItem value="constant" id="constant" />
      <Label htmlFor="constant" className="text-xs">
        Constant Fill
      </Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-3 h-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>
            Any overlapped cell filled with selected character
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    
    <div className="flex items-center gap-2">
      <RadioGroupItem value="palette" id="palette" />
      <Label htmlFor="palette" className="text-xs">
        Palette Fill
      </Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-3 h-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>
            Characters from palette mapped to overlap percentage
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    
    <div className="flex items-center gap-2">
      <RadioGroupItem value="autofill" id="autofill" />
      <Label htmlFor="autofill" className="text-xs">
        Autofill
      </Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-3 h-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>
            Smart character selection based on overlap pattern
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </RadioGroup>
  
  {/* Autofill Palette Selector - Only show when autofill mode active */}
  {fillMode === 'autofill' && (
    <div className="flex flex-col gap-1 mt-2 pl-6">
      <div className="text-xs text-muted-foreground">Character Set</div>
      <Select value={autofillPaletteId} onValueChange={setAutofillPaletteId}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="block">Block Characters</SelectItem>
          <SelectItem value="ansi">Classic ANSI</SelectItem>
          {/* Future palettes can be added here */}
        </SelectContent>
      </Select>
    </div>
  )}
  
  {/* Status info when shape is active */}
  {(isDrawing || isEditingShape) && (
    <div className="text-xs text-muted-foreground mt-2">
      <div>Points: {anchorPoints.length}</div>
      <div>Cells: {affectedCellCount}</div>
      {!isClosed && <div className="text-yellow-500">Click first point to close</div>}
    </div>
  )}
</div>
```

### Status Bar Integration

```typescript
// In ToolStatusManager or equivalent:
if (activeTool === 'beziershape') {
  const { isDrawing, isClosed, affectedCellCount, fillMode } = bezierStore;
  
  if (isDrawing && !isClosed) {
    return 'Click to add points • Click first point to close • Alt+Click for handles • Escape to cancel';
  } else if (isClosed) {
    return `${affectedCellCount} cells • Enter to commit • Escape to cancel • Click outside to commit`;
  } else {
    return `${fillMode === 'constant' ? 'Constant' : fillMode === 'palette' ? 'Palette' : 'Autofill'} mode • Click to start drawing`;
  }
}
```

---

## 🏗️ Implementation Checklist

### Phase 1: Core Infrastructure
- [x] Add `'beziershape'` to `Tool` type in `src/types/index.ts`
- [x] Add hotkey mapping in `src/constants/hotkeys.ts` (change pencil to 'b', add beziershape as 'p')
- [x] Create `src/stores/bezierStore.ts` with full state and actions
- [x] Create autofill palette architecture:
  - [x] Create `src/constants/bezierAutofill/types.ts` (type definitions)
  - [x] Create `src/constants/bezierAutofill/blockCharacters.ts` (block palette)
  - [x] Create `src/constants/bezierAutofill/ansiCharacters.ts` (ANSI palette)
  - [x] Create `src/constants/bezierAutofill/index.ts` (palette registry)
- [x] Create `src/utils/bezierPathUtils.ts` with path construction utilities
- [x] Create `src/utils/bezierAutofillUtils.ts` with region detection logic

### Phase 2: Bezier Math & Rendering
- [x] Implement bezier curve rendering in `createBezierPath()`
- [x] Implement bounding box calculation in `getBezierBounds()`
- [x] Implement point-to-pixel coordinate conversion
- [ ] Test bezier curve accuracy with various handle configurations

### Phase 3: Fill Mode Implementations
- [x] Implement Constant Fill mode (simplest - good starting point)
- [x] Implement Palette Fill mode with 5x5 subsampling
- [x] Implement Autofill mode with 9-region detection
- [ ] Test performance on large canvases (200x100 cells)
- [ ] Optimize if needed (reduce subsample size, use bounding box culling)

### Phase 4: Interactive Overlay
- [x] Create `src/components/features/InteractiveBezierOverlay.tsx`
- [x] Implement anchor point rendering and hit testing
- [x] Implement handle rendering and hit testing
- [ ] Implement shape dragging (click inside + drag)
- [ ] Implement multi-select (Shift+Click multiple points)
- [x] Implement Alt+Click handle toggle
- [x] Implement Alt+Drag handle symmetry breaking
- [ ] Implement Shift+Drag handle constraining (horizontal/vertical)
- [ ] Implement preview character rendering at 95% opacity

### Phase 5: Tool Integration
- [ ] Create `src/components/tools/BezierShapeTool.tsx`
- [ ] Create `src/components/features/BezierToolOptions.tsx`
- [x] Integrate into `ToolPalette.tsx` (Drawing Tools category)
- [x] Integrate into `ToolManager.tsx` or equivalent (overlay imported in CanvasOverlay.tsx)
- [ ] Add to `useKeyboardShortcuts.ts` for hotkey support
- [ ] Update `ToolStatusManager.tsx` for status messages

### Phase 6: Canvas Integration
- [ ] Connect bezier store to canvas click events
- [ ] Implement shape closing detection (click first point)
- [ ] Implement commit on Enter key
- [ ] Implement commit on click-outside
- [ ] Implement cancel on Escape key
- [ ] Implement auto-commit on frame change
- [ ] Add undo/redo integration

### Phase 7: Testing & Polish
- [ ] Test all fill modes on various shapes
- [ ] Test handle manipulation (Alt+Click, Alt+Drag, Shift+Drag)
- [ ] Test multi-select and group movement
- [ ] Test frame switching during creation
- [ ] Test undo/redo with committed shapes
- [ ] Performance test on large canvases (200x100+)
- [ ] Add loading indicator for expensive autofill calculations (if needed)
- [ ] Polish visual feedback (hover states, selection highlighting)

### Phase 8: Documentation
- [ ] Update `COPILOT_INSTRUCTIONS.md` with bezier tool patterns
- [ ] Update `DEVELOPMENT.md` with completed feature
- [ ] Create user guide in `docs/BEZIER_SHAPE_TOOL_USER_GUIDE.md`
- [ ] Add tooltips to all interactive elements
- [ ] Document character mapping extensibility for autofill mode

---

## 🎯 Success Criteria

✅ **Core Functionality**
- User can create bezier shapes with smooth and sharp points
- Handles can be broken and constrained
- Shape fills correctly in all three modes
- Preview shows real-time ASCII rendering

✅ **Performance**
- No lag on large canvases (200x100 cells)
- Preview updates smoothly during dragging
- Autofill mode completes within 500ms for typical shapes

✅ **Integration**
- Undo/redo works correctly
- Frame switching commits shape to original frame
- Hotkeys work as expected (P for bezier, B for pencil)
- Tool palette shows correct category

✅ **User Experience**
- Status bar provides helpful context
- Visual feedback is clear and professional
- Tool behaves like Figma/Illustrator pen tool
- Character selection is intuitive and accurate

---

## 🚀 Future Enhancements (Post-MVP)

- **Convert to selection**: Right-click committed shape to convert to selection
- **Edit existing shapes**: Click on filled region to re-activate bezier points
- **Path operations**: Boolean operations (union, subtract, intersect)
- **Custom character maps**: Allow users to define their own autofill character sets
- **Bezier shape library**: Save and reuse common shapes
- **Stroke mode**: Draw outline only instead of fill
- **Gradient fill on bezier shapes**: Combine with gradient tool
- **Export bezier data**: Export as SVG path data for use in other tools

---

## 📚 References

- **Figma Pen Tool**: https://help.figma.com/hc/en-us/articles/360040450133-Vector-networks
- **Illustrator Pen Tool**: https://helpx.adobe.com/illustrator/using/drawing-pen-curvature-or-pencil.html
- **Canvas Path2D API**: https://developer.mozilla.org/en-US/docs/Web/API/Path2D
- **Bezier Curve Math**: https://javascript.info/bezier-curve
- **Unicode Block Elements**: https://en.wikipedia.org/wiki/Block_Elements

---

## 🤝 Implementation Notes

**Recommended Implementation Order**:
1. Start with **Constant Fill** mode (simplest, proves concept)
2. Build **Interactive Overlay** with basic point/handle dragging
3. Add **Palette Fill** mode (introduces subsampling concept)
4. Implement **Autofill** mode (most complex, builds on previous work)
5. Polish interaction details (multi-select, constraints, etc.)

**Performance Optimization Strategy**:
- Use bounding box culling to skip cells outside shape
- Batch all point-in-path tests before reading canvas pixel data
- Consider Web Worker for autofill calculations if needed
- Cache Path2D objects when shape isn't changing

**Maintainability**:
- Keep bezier store separate from tool store (like gradient store)
- Use dedicated utils for bezier math (keep components clean)
- Document character mapping format for future extensibility
- Follow existing patterns from gradient tool for consistency

---

**This comprehensive plan provides everything needed to implement a professional-grade bezier shape tool for ASCII Motion. The phased approach ensures steady progress, and the detailed specifications prevent ambiguity during implementation.**
