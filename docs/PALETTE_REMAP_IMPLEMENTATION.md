# Palette-Based Color Remapping Implementation

## Overview
Added palette-based automatic color remapping to the Remap Colors effect, allowing users to map canvas colors to a selected color palette using different algorithms.

## Implementation Summary

### Architecture
- **Types** (`src/types/effects.ts`):
  - Extended `RemapColorsEffectSettings` with:
    - `paletteMode: 'manual' | 'palette'` - Current mode
    - `selectedPaletteId: string | null` - Selected palette ID
    - `mappingAlgorithm: 'closest' | 'by-index'` - Mapping algorithm

- **Utilities** (`src/utils/effectsProcessing.ts`):
  - `mapCanvasColorsToPalette()`: Computes color mappings
    - **Closest Match**: Uses Euclidean RGB distance (via `ColorMatcher.findClosestColor`)
    - **By Index**: Sequential mapping with overflow to last palette color

- **UI** (`src/components/features/effects/RemapColorsEffectPanel.tsx`):
  - Tab-based interface (Manual vs Use Palette)
  - Full palette editor integration
  - Automatic mapping computation
  - Live preview updates

### User Interface

#### Manual Tab
- **Existing functionality preserved**:
  - From → To color mapping grid
  - Click swatches to open color picker
  - Direct hex input editing
  - Individual and bulk reset buttons
  - Displays all canvas colors sorted by hue/value

#### Use Palette Tab (NEW)
1. **Palette Selection**:
   - Dropdown showing all available palettes (preset + custom)
   - Reset button (clears selection + resets mappings)
   - Manage Palettes button (opens palette management dialog)

2. **Mapping Algorithm**:
   - **Closest Match**: Maps each canvas color to nearest palette color (Euclidean RGB distance)
   - **By Index**: Maps colors sequentially (1st canvas → 1st palette, 2nd → 2nd, etc.)
     - Overflow behavior: Extra canvas colors map to last palette color

3. **Palette Color Editor**:
   - 8-column grid of color swatches
   - **For Preset Palettes**:
     - View-only with "Create Copy to Edit" button
     - Clicking colors shows info
   - **For Custom Palettes**:
     - Click to edit colors (opens color picker)
     - Hover buttons: Remove color (X), Move left/right (arrows)
     - Add color button (+ icon)
     - Reverse palette button (toolbar)
     - Import/Export palette buttons
   - Auto-copy preset on first edit attempt

4. **Info Card**:
   - Shows count of auto-mapped colors
   - Displays current algorithm
   - Explains switch to Manual tab to see computed mappings

5. **Empty State**:
   - Shown when no palette selected
   - Prompts user to select a palette

### Behavior

#### Tab Switching
- **Manual → Palette**: 
  - Computed mappings stay visible until recomputed
  - If palette selected, mappings recompute when tab opens
  - Manual edits are discarded (palette connection restored)
  
- **Palette → Manual**:
  - Shows computed mappings as editable From→To pairs
  - User can modify individual mappings
  - Manual edits break palette connection
  - Switching back to Palette tab will recompute

#### Live Preview
- **Always active** when effect panel is open
- Updates on:
  - Tab switch
  - Palette selection change
  - Mapping algorithm change
  - Palette color edits (add/remove/modify/reorder)
  - Manual mapping edits

#### Reset Behavior
- **Reset All button** (available in both tabs):
  - Resets all mappings to identity (color → same color)
  - Clears palette selection (`selectedPaletteId = null`)
  - Switches to manual mode implicitly (identity mappings)

#### Edge Cases Handled
1. **Empty Canvas**: Shows "No colors found" message
2. **Empty Palette**: User must add colors before effective mapping
3. **Overflow (By Index)**: Extra canvas colors map to last palette color
4. **Preset Palette Edit**: Auto-creates custom copy, switches to it
5. **Color Analysis**: Uses cached canvas analysis for performance

### Integration Points

#### Palette Store (`usePaletteStore`)
- **Read**: `getAllPalettes()` - Gets all available palettes
- **Modify**: 
  - `createCustomCopy()` - Copies preset to custom
  - `updateColor()` - Edits palette color
  - `addColor()` - Adds color to palette
  - `removeColor()` - Removes color from palette
  - `reorderColors()` - Changes color order
  - `reversePalette()` - Reverses palette order

#### Effects Store (`useEffectsStore`)
- **State**: `remapColorsSettings` with new palette fields
- **Actions**:
  - `updateRemapColorsSettings()` - Updates settings
  - `updatePreview()` - Triggers live preview
  - `getUniqueColors()` - Gets canvas colors
  - `analyzeCanvas()` - Analyzes canvas for colors

#### Color Picker Overlay
- Extended to support 3 modes:
  - `from`: Manual tab color picker (existing)
  - `to`: Manual tab mapping target (existing)
  - `palette`: Palette tab color editing (NEW)

### Testing Checklist

#### Core Functionality
- [x] ✅ Types compile without errors
- [x] ✅ Tabs render and switch correctly
- [ ] Manual tab preserves all existing functionality
- [ ] Palette tab renders palette selector
- [ ] Algorithm selector shows and updates
- [ ] Palette colors display in grid
- [ ] Color picker opens when clicking palette colors

#### Mapping Computation
- [ ] **Closest Match algorithm**:
  - [ ] Maps red canvas color to nearest red palette color
  - [ ] Handles grayscale colors correctly
  - [ ] Uses Euclidean RGB distance
  
- [ ] **By Index algorithm**:
  - [ ] Maps 1st canvas color to 1st palette color
  - [ ] Maps 2nd canvas color to 2nd palette color
  - [ ] Overflow: 10 canvas colors + 5 palette colors → last 5 map to palette color #5

#### Live Preview
- [ ] Preview updates when selecting palette
- [ ] Preview updates when changing algorithm
- [ ] Preview updates when editing palette colors
- [ ] Preview updates when adding/removing palette colors
- [ ] Preview updates when switching tabs
- [ ] ColorPickerOverlay cancel reverts temporary changes

#### Palette Editing
- [ ] Clicking preset palette color shows "create copy" info
- [ ] Clicking Edit button creates custom copy
- [ ] Clicking custom palette color opens color picker
- [ ] Add button adds new color
- [ ] Remove button (X) removes color
- [ ] Move left/right buttons reorder colors
- [ ] Reverse button reverses palette
- [ ] Import dialog works
- [ ] Export dialog works

#### Edge Cases
- [ ] Empty canvas shows "No colors found"
- [ ] Empty palette (0 colors) shows appropriate message
- [ ] Overflow colors handled correctly (by-index algorithm)
- [ ] Very large canvas (1000+ colors) performs well
- [ ] Preset palette auto-copy on edit works
- [ ] Tab switching preserves state correctly

#### Reset Behavior
- [ ] Reset All in Manual tab clears palette selection
- [ ] Reset All in Manual tab resets mappings to identity
- [ ] Reset button in Palette tab clears palette selection
- [ ] Reset button in Palette tab resets mappings
- [ ] Reset button disabled when nothing to reset

#### UI/UX
- [ ] Tooltips show helpful information
- [ ] Info card explains computed mappings
- [ ] Empty state is clear
- [ ] Buttons are appropriately disabled
- [ ] Color grid is responsive
- [ ] Hover states work correctly

### Known Limitations
1. **No Manual Override in Palette Mode**: When in palette mode, all mappings are auto-computed. User must switch to Manual tab to override individual mappings.
2. **Preset Palette Protection**: Preset palettes cannot be edited directly (must create custom copy first).
3. **No Palette Merge**: Cannot combine multiple palettes.

### Future Enhancements (Not Implemented)
1. **Dithering**: Apply dithering when mapping to palette (requires dithering implementation in effect processing)
2. **Custom Color Spaces**: Support LAB/HSL color distance metrics
3. **Per-Mapping Algorithm**: Allow different algorithms for different colors
4. **Palette Suggestions**: AI-suggested palettes based on canvas analysis
5. **Undo/Redo**: Fine-grained undo for palette edits

## Commits
1. `3ddc94c` - Infrastructure (types, utils, defaults)
2. `5df731e` - Tab structure 
3. `a89c497` - Complete Use Palette tab UI
4. `082f20d` - Reset button in Palette tab

## Files Changed
- `src/types/effects.ts` - Type extensions
- `src/constants/effectsDefaults.ts` - Default settings
- `src/utils/effectsProcessing.ts` - Mapping utility
- `src/components/features/effects/RemapColorsEffectPanel.tsx` - Main UI

## Dependencies
- `shadcn/ui` components: Tabs, Select, Card, Tooltip
- `usePaletteStore` - Palette management
- `ColorMatcher` - Color distance calculation
- `lucide-react` icons - UI icons

## Performance Considerations
- Canvas color analysis is cached by `effectsStore`
- Palette mapping computation runs on-demand via `useEffect`
- Color picker overlay uses ref-based positioning for smooth UX
- Drag-and-drop for palette reordering (inherited from palette store UI)
