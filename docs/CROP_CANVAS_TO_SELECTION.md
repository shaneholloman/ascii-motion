# Crop Canvas to Selection Feature

## Overview
The Crop Canvas to Selection feature allows users to reduce the canvas size to match the bounds of their current selection, removing all content outside the selected area. This works consistently across all animation frames.

## Feature Details

### Supported Selection Tools
- **Rectangular Selection** (M key)
- **Lasso Selection** (L key)  
- **Magic Wand Selection** (W key)

### How to Use

#### Via Button
1. Select any of the selection tools (rectangular, lasso, or magic wand)
2. Make a selection on the canvas
3. A "Crop Canvas to Selection" button appears in the Tool Options panel
4. Click the button to crop
5. The canvas resizes to the selection bounds

#### Via Keyboard Shortcut
- **Mac**: `Cmd + Shift + C`
- **Windows/Linux**: `Ctrl + Shift + C`

### What Gets Cropped

**All Frames:**
- The crop operation applies to **all frames** in the animation
- Each frame is cropped to the same bounds consistently
- Content outside the selection bounds is permanently removed

**Cell Repositioning:**
- All selected cells are repositioned relative to the new canvas origin (0, 0)
- Original positions: If selection starts at (5, 5), cells are shifted by (-5, -5)
- All cell properties are preserved (character, text color, background color)

### Undo/Redo Support

The crop operation is fully integrated with the undo/redo system:
- **Undo** (`Cmd/Ctrl + Z`): Restores original canvas size and all cell data
- **Redo** (`Cmd/Ctrl + Shift + Z`): Reapplies the crop operation

## Implementation Details

### Files Created
1. **src/utils/cropUtils.ts** - Core crop algorithms
   - `cropCanvasToSelection()`: Crops a single frame
   - `cropAllFramesToSelection()`: Crops all animation frames

2. **src/hooks/useCropToSelection.ts** - React hook
   - `canCrop()`: Checks if crop is available
   - `cropToSelection()`: Executes the crop operation

3. **src/__tests__/cropUtils.test.ts** - Unit tests
   - Tests for crop calculations
   - Tests for cell repositioning
   - Tests for edge cases

### Files Modified
1. **src/components/features/ToolPalette.tsx**
   - Added crop button to Tool Options panel
   - Shows for all three selection tools
   - Disabled when no selection is active

2. **src/hooks/useKeyboardShortcuts.ts**
   - Added `Cmd/Ctrl + Shift + C` keyboard shortcut
   - Guards with `canCrop()` check

3. **src/components/features/KeyboardShortcutsDialog.tsx**
   - Added shortcut to reference documentation

### Architecture

#### Crop Algorithm
```typescript
1. Get selection bounds using getBoundsFromMask()
   - Find minX, minY, maxX, maxY from selected cells
   
2. Calculate new canvas dimensions
   - newWidth = maxX - minX + 1
   - newHeight = maxY - minY + 1
   
3. Validate dimensions (4-200 x 4-100)
   
4. Reposition cells
   - For each cell at (x, y) in selection:
     - newX = x - minX
     - newY = y - minY
     - Copy cell to new position
   
5. Apply to all frames
   - Repeat steps 1-4 for each animation frame
   
6. Update canvas size
   - Call setCanvasSize(newWidth, newHeight)
   
7. Add to history
   - Call pushCanvasResizeHistory() for undo/redo
```

#### Selection Type Handling
The hook automatically detects which selection tool is active:
```typescript
if (activeTool === 'select' && selection.active) {
  return selection.selectedCells;
} else if (activeTool === 'lasso' && lassoSelection.active) {
  return lassoSelection.selectedCells;
} else if (activeTool === 'magicwand' && magicWandSelection.active) {
  return magicWandSelection.selectedCells;
}
```

All three selection types store cells in a `Set<string>` format with keys as `"x,y"`, making the crop operation uniform across all selection types.

### Constraints

**Canvas Size Limits:**
- Minimum width: 4 cells
- Maximum width: 200 cells
- Minimum height: 4 cells
- Maximum height: 100 cells

If the cropped selection would result in dimensions outside these limits, the operation is blocked with a console error.

### Edge Cases Handled

1. **Empty Selection**: Crop button disabled, shortcut has no effect
2. **Selection Too Small**: Operation blocked if result would be < 4x4
3. **Selection Too Large**: Operation blocked if result would be > 200x100
4. **Partial Frame Content**: Frames with content outside selection bounds lose that content
5. **Empty Frames**: Empty frames remain empty after crop

## User Experience

### Visual Feedback
- Button is disabled when no selection exists
- Tooltip shows the keyboard shortcut
- Operation is instant (no loading indicator needed)
- Undo/redo works immediately

### Common Workflows

#### Trimming Animation Canvas
1. Draw animation with extra workspace
2. Make a selection around the final content
3. Press `Cmd+Shift+C` to crop away excess space
4. Canvas is now exactly sized to content

#### Creating Square Animations
1. Make rectangular selection of desired size
2. Crop to selection
3. All frames now have consistent square dimensions

#### Removing Background Areas
1. Use magic wand to select wanted content
2. Crop to selection
3. Background areas are removed from all frames

## Testing

### Unit Tests
Located in `src/__tests__/cropUtils.test.ts`:
- ✅ Crop to selection bounds calculation
- ✅ Cell repositioning accuracy
- ✅ Offset selection handling
- ✅ Multiple frame consistency
- ✅ Empty selection handling

### Manual Testing Checklist
- [ ] Rectangular selection crop
- [ ] Lasso selection crop
- [ ] Magic wand selection crop
- [ ] Keyboard shortcut works
- [ ] Button appears/disappears correctly
- [ ] Button disabled when appropriate
- [ ] Undo restores original canvas
- [ ] Redo reapplies crop
- [ ] All frames crop consistently
- [ ] Cell properties preserved
- [ ] Edge selections work (top-left, bottom-right, etc.)
- [ ] Tooltip displays correct shortcut

## Future Enhancements

Potential improvements for future versions:
1. **Crop Preview**: Show preview of cropped canvas before applying
2. **Crop to Content**: Auto-detect content bounds and crop to fit
3. **Crop with Padding**: Add option to include N cells of padding
4. **Crop Individual Frame**: Option to crop only current frame
5. **Crop with Aspect Ratio**: Maintain specific aspect ratio when cropping

## Related Features

- **Canvas Resize**: Manual canvas size adjustment via Canvas Settings
- **Selection Tools**: All three selection types (rectangular, lasso, magic wand)
- **Undo/Redo System**: History tracking for all canvas operations
- **Animation Frames**: Multi-frame support with consistent operations

## See Also

- [COPILOT_INSTRUCTIONS.md](../COPILOT_INSTRUCTIONS.md) - Architecture patterns
- [DEVELOPMENT.md](../DEVELOPMENT.md) - Development workflow
- [Selection Tools Documentation](./SELECTION_TOOLS.md) - Selection tool details (if exists)
