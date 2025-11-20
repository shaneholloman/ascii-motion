/**
 * RemapColorsEffectPanel - Color remapping controls
 * 
 * Provides intuitive color remapping with automatic canvas color detection
 * and direct From/To color editing interface.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Card, CardContent } from '../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { useEffectsStore } from '../../../stores/effectsStore';
import { useCanvasStore } from '../../../stores/canvasStore';
import { usePaletteStore } from '../../../stores/paletteStore';
import { ColorPickerOverlay } from '../ColorPickerOverlay';
import { mapCanvasColorsToPalette } from '../../../utils/effectsProcessing';
import { 
  RotateCcw, 
  Eye, 
  EyeOff, 
  MoveRight, 
  RotateCcwSquare,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Settings,
  Upload,
  Download,
  AlertCircle,
  Edit
} from 'lucide-react';
import { ManagePalettesDialog } from '../ManagePalettesDialog';
import { ImportPaletteDialog } from '../ImportPaletteDialog';
import { ExportPaletteDialog } from '../ExportPaletteDialog';

// Color utility functions
const hexToHsl = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  let h = 0;
  if (diff !== 0) {
    switch (max) {
      case r: h = ((g - b) / diff) % 6; break;
      case g: h = (b - r) / diff + 2; break;
      case b: h = (r - g) / diff + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  
  const l = (max + min) / 2;
  const s = diff === 0 ? 0 : diff / (1 - Math.abs(2 * l - 1));
  
  return [h, s, l];
};

const sortColorsByHueAndValue = (colors: string[]): string[] => {
  return colors.sort((a, b) => {
    // Handle transparent colors
    if (a === 'transparent') return 1;
    if (b === 'transparent') return -1;
    
    try {
      const [hueA, , lightA] = hexToHsl(a);
      const [hueB, , lightB] = hexToHsl(b);
      
      // Primary sort by hue
      if (Math.abs(hueA - hueB) > 1) {
        return hueA - hueB;
      }
      
      // Secondary sort by lightness (value)
      return lightA - lightB;
    } catch {
      // Fallback for invalid colors
      return a.localeCompare(b);
    }
  });
};

export function RemapColorsEffectPanel() {
  const { 
    remapColorsSettings,
    updateRemapColorsSettings,
    isPreviewActive,
    previewEffect,
    startPreview,
    stopPreview,
    updatePreview,
    getUniqueColors,
    analyzeCanvas,
    canvasAnalysis,
    isAnalyzing,
    clearAnalysisCache
  } = useEffectsStore();

  const { cells } = useCanvasStore();
  
  // Palette store hooks
  const {
    getAllPalettes,
    createCustomCopy,
    updateColor,
    addColor,
    removeColor,
    reorderColors,
    reversePalette
  } = usePaletteStore();

  const isCurrentlyPreviewing = isPreviewActive && previewEffect === 'remap-colors';

  // Color picker state - now supports palette colors too
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState<{ 
    fromColor: string; 
    mode?: 'from' | 'to' | 'palette';
    paletteIndex?: number;
    triggerRef: React.RefObject<HTMLElement | null> | null 
  }>({ fromColor: '', triggerRef: null });
  
  // State for palette management dialogs
  const [showManagePalettes, setShowManagePalettes] = useState(false);
  const [showImportPalette, setShowImportPalette] = useState(false);
  const [showExportPalette, setShowExportPalette] = useState(false);

  // Hex input states for direct editing
  const [hexInputs, setHexInputs] = useState<Record<string, string>>({});

  // Get all unique colors from canvas analysis, sorted by hue and value
  const allCanvasColors = useMemo(() => {
    // Only get colors if analysis is complete (not analyzing and has results)
    if (isAnalyzing || !canvasAnalysis) {
      return [];
    }
    const colors = getUniqueColors().filter(color => color !== 'transparent');
    return sortColorsByHueAndValue(colors);
  }, [getUniqueColors, isAnalyzing, canvasAnalysis]);

  // Auto-start preview when panel opens and analyze canvas
  useEffect(() => {
    // Clear cache and ensure fresh analysis every time panel opens
    clearAnalysisCache();
    analyzeCanvas();
    
    if (!isCurrentlyPreviewing) {
      startPreview('remap-colors');
    }
    
    // Cleanup on unmount
    return () => {
      if (isCurrentlyPreviewing) {
        stopPreview();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-analyze when canvas data changes (e.g., edits made outside the effect)
  useEffect(() => {
    // Clear cache and re-analyze when canvas cells change
    clearAnalysisCache();
    analyzeCanvas();
  }, [cells, clearAnalysisCache, analyzeCanvas]);

  // Initialize color mappings with identity mappings when canvas colors change
  useEffect(() => {
    // Only initialize if we have colors and analysis is complete
    if (allCanvasColors.length > 0 && !isAnalyzing) {
      const currentMappings = remapColorsSettings.colorMappings;
      const identityMappings: Record<string, string> = {};
      
      // Create identity mappings for all current canvas colors
      allCanvasColors.forEach(color => {
        // Preserve existing mapping if it exists, otherwise map to self
        identityMappings[color] = currentMappings[color] || color;
      });
      
      // Only update if the mappings have changed
      const currentKeys = Object.keys(currentMappings).sort();
      const newKeys = Object.keys(identityMappings).sort();
      const keysChanged = JSON.stringify(currentKeys) !== JSON.stringify(newKeys);
      
      if (keysChanged || Object.keys(currentMappings).length === 0) {
        updateRemapColorsSettings({
          colorMappings: identityMappings
        });
      }
    }
  }, [allCanvasColors, remapColorsSettings.colorMappings, updateRemapColorsSettings, isAnalyzing]);

  // Sync hex inputs with current mappings
  useEffect(() => {
    const currentMappings = remapColorsSettings.colorMappings;
    const newHexInputs: Record<string, string> = {};
    
    Object.entries(currentMappings).forEach(([fromColor, toColor]) => {
      newHexInputs[fromColor] = toColor;
    });
    
    setHexInputs(newHexInputs);
  }, [remapColorsSettings.colorMappings]);
  
  // Compute palette-based mappings when in palette mode
  useEffect(() => {
    // Only compute if we're in palette mode, have a palette selected, and have canvas colors
    if (
      remapColorsSettings.paletteMode === 'palette' &&
      remapColorsSettings.selectedPaletteId &&
      allCanvasColors.length > 0 &&
      !isAnalyzing
    ) {
      const selectedPalette = getAllPalettes().find(p => p.id === remapColorsSettings.selectedPaletteId);
      if (selectedPalette && selectedPalette.colors.length > 0) {
        // Extract palette colors as hex strings
        const paletteColors = selectedPalette.colors.map(c => c.value);
        
        // Compute mappings using the selected algorithm
        const computedMappings = mapCanvasColorsToPalette(
          allCanvasColors,
          paletteColors,
          remapColorsSettings.mappingAlgorithm
        );
        
        // Update settings with computed mappings
        updateRemapColorsSettings({
          colorMappings: computedMappings
        });
      }
    }
  }, [
    remapColorsSettings.paletteMode,
    remapColorsSettings.selectedPaletteId,
    remapColorsSettings.mappingAlgorithm,
    allCanvasColors,
    isAnalyzing,
    getAllPalettes,
    updateRemapColorsSettings
  ]);

  // Update preview when settings change
  useEffect(() => {
    if (isCurrentlyPreviewing) {
      updatePreview().catch(error => {
        console.error('Preview update failed:', error);
      });
    }
  }, [remapColorsSettings, isCurrentlyPreviewing, updatePreview]);

  // Update preview when canvas data changes (e.g., frame change)
  useEffect(() => {
    if (isCurrentlyPreviewing) {
      updatePreview().catch(error => {
        console.error('Preview update after canvas change failed:', error);
      });
    }
  }, [cells, isCurrentlyPreviewing, updatePreview]);

  // Toggle preview
  const handleTogglePreview = useCallback(() => {
    if (isCurrentlyPreviewing) {
      stopPreview();
    } else {
      startPreview('remap-colors');
    }
  }, [isCurrentlyPreviewing, startPreview, stopPreview]);

  // Reset all mappings to identity (colors map to themselves)
  const handleResetAllMappings = useCallback(() => {
    const identityMappings: Record<string, string> = {};
    allCanvasColors.forEach(color => {
      identityMappings[color] = color;
    });
    
    updateRemapColorsSettings({
      colorMappings: identityMappings,
      // Reset palette selection per user requirement
      selectedPaletteId: null
    });
  }, [allCanvasColors, updateRemapColorsSettings]);

  // Update a specific color mapping
  const handleColorMappingChange = useCallback((fromColor: string, toColor: string) => {
    const newMappings = {
      ...remapColorsSettings.colorMappings,
      [fromColor]: toColor
    };
    
    updateRemapColorsSettings({
      colorMappings: newMappings
    });
  }, [remapColorsSettings, updateRemapColorsSettings]);

  // Open color picker for a specific color
  const handleOpenColorPicker = useCallback((fromColor: string, _currentToColor: string, triggerRef: React.RefObject<HTMLElement | null>) => {
    setColorPickerTarget({ fromColor, triggerRef });
    setIsColorPickerOpen(true);
  }, []);

  // Handle color picker selection
  const handleColorPickerSelect = useCallback((newColor: string) => {
    // Handle palette color editing
    if (colorPickerTarget.mode === 'palette' && colorPickerTarget.paletteIndex !== undefined) {
      const selectedPalette = getAllPalettes().find(p => p.id === remapColorsSettings.selectedPaletteId);
      if (selectedPalette && !selectedPalette.isPreset) {
        const colorToUpdate = selectedPalette.colors[colorPickerTarget.paletteIndex];
        if (colorToUpdate) {
          updateColor(selectedPalette.id, colorToUpdate.id, newColor);
          updatePreview();
        }
      }
    } 
    // Handle manual mapping color editing
    else if (colorPickerTarget.fromColor) {
      handleColorMappingChange(colorPickerTarget.fromColor, newColor);
      // Update hex input state
      setHexInputs(prev => ({ ...prev, [colorPickerTarget.fromColor]: newColor }));
    }
    setIsColorPickerOpen(false);
  }, [colorPickerTarget, handleColorMappingChange, getAllPalettes, remapColorsSettings.selectedPaletteId, updateColor, updatePreview]);

  // Handle hex input change with sanitization
  const handleHexInputChange = useCallback((fromColor: string, value: string) => {
    // Remove any non-hex characters and convert to uppercase
    let sanitized = value.replace(/[^#0-9A-Fa-f]/g, '').toUpperCase();
    
    // Ensure it starts with # and limit length
    if (!sanitized.startsWith('#')) {
      sanitized = '#' + sanitized.replace(/#/g, ''); // Remove any # that's not at the start
    }
    
    // Limit to 7 characters max (#FFFFFF)
    if (sanitized.length > 7) {
      sanitized = sanitized.slice(0, 7);
    }
    
    // Update hex input state
    setHexInputs(prev => ({ ...prev, [fromColor]: sanitized }));
    
    // Only update color mapping if we have a valid 6-digit hex
    if (/^#[0-9A-F]{6}$/.test(sanitized)) {
      handleColorMappingChange(fromColor, sanitized);
    }
  }, [handleColorMappingChange]);

  // Reset individual color mapping
  const handleResetIndividualMapping = useCallback((fromColor: string) => {
    handleColorMappingChange(fromColor, fromColor);
    setHexInputs(prev => ({ ...prev, [fromColor]: fromColor }));
  }, [handleColorMappingChange]);

  // Get sorted color mappings
  const sortedColorMappings = useMemo(() => {
    const mappings = remapColorsSettings.colorMappings;
    const sortedColors = sortColorsByHueAndValue(Object.keys(mappings));
    return sortedColors.map(fromColor => ({
      fromColor,
      toColor: mappings[fromColor]
    }));
  }, [remapColorsSettings.colorMappings]);

  // Create refs for all color picker buttons (must be at top level)
  const colorPickerButtonRefs = useMemo(() => {
    const refs: Record<string, React.RefObject<HTMLButtonElement | null>> = {};
    sortedColorMappings.forEach(({ fromColor }) => {
      refs[fromColor] = { current: null };
    });
    return refs;
  }, [sortedColorMappings]);

  const mappingCount = Object.keys(remapColorsSettings.colorMappings).length;
  const hasIdenticalMappings = sortedColorMappings.every(({ fromColor, toColor }) => fromColor === toColor);

  return (
    <div className="space-y-4">

      {/* Live Preview Toggle */}
      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-blue-900 dark:text-blue-100">Live Preview</Label>
          <div className="text-xs text-blue-700 dark:text-blue-300">
            {isCurrentlyPreviewing ? 'Changes are shown on canvas' : 'Preview is disabled'}
          </div>
        </div>
        <Button
          onClick={handleTogglePreview}
          variant={isCurrentlyPreviewing ? "default" : "outline"}
          size="sm"
          className="h-8 gap-1"
        >
          {isCurrentlyPreviewing ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {isCurrentlyPreviewing ? 'On' : 'Off'}
        </Button>
      </div>

      {/* Color Mappings with Palette Support */}
      <Tabs 
        value={remapColorsSettings.paletteMode} 
        onValueChange={(value) => {
          updateRemapColorsSettings({ paletteMode: value as 'manual' | 'palette' });
          // Update preview when switching modes
          updatePreview();
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="palette">Use Palette</TabsTrigger>
        </TabsList>

        {/* Manual Tab - existing color mapping UI */}
        <TabsContent value="manual" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">
              Color Mappings ({mappingCount})
            </Label>
            <Button
              onClick={handleResetAllMappings}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs gap-1"
              title="Reset all mappings to original colors"
              disabled={hasIdenticalMappings || isAnalyzing}
            >
              <RotateCcw className="w-3 h-3" />
              Reset All
            </Button>
          </div>
          
          {isAnalyzing ? (
            <div className="p-4 border border-dashed border-muted-foreground/50 rounded text-center text-xs text-muted-foreground">
              Analyzing canvas colors...
            </div>
          ) : mappingCount === 0 ? (
            <div className="p-4 border border-dashed border-muted-foreground/50 rounded text-center text-xs text-muted-foreground">
              No colors found in canvas. Add some colors to see mapping options.
            </div>
          ) : (
            <div className="space-y-1">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 text-xs font-medium text-muted-foreground pb-2">
                <div>From Color</div>
                <div></div>
                <div>To Color</div>
                <div></div>
              </div>
              
              {/* Color mapping rows */}
              {sortedColorMappings.map(({ fromColor, toColor }) => {
                const colorPickerButtonRef = colorPickerButtonRefs[fromColor];
                const currentHexInput = hexInputs[fromColor] || toColor;
                
                return (
                  <div key={fromColor} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_minmax(0,1fr)_auto] gap-0.5 items-center text-xs p-2 bg-background rounded border border-muted/30 hover:bg-muted/50 hover:border-muted/50 transition-colors">
                    {/* From Color Swatch */}
                    <button
                      className="w-6 h-6 rounded border border-muted/30 flex-shrink-0"
                      style={{ backgroundColor: fromColor }}
                      title={fromColor}
                      disabled
                    />
                    
                    {/* From Color Hex */}
                    <span className="font-mono text-[10px] text-muted-foreground truncate px-1">
                      {fromColor}
                    </span>
                    
                    {/* Arrow */}
                    <div className="flex justify-center px-1">
                      <MoveRight className="w-3 h-3 text-muted-foreground" />
                    </div>
                    
                    {/* To Color Swatch */}
                    <button
                      ref={colorPickerButtonRef}
                      onClick={() => handleOpenColorPicker(fromColor, toColor, colorPickerButtonRef)}
                      className="w-6 h-6 rounded border border-muted/30 flex-shrink-0 hover:border-muted/60 transition-colors cursor-pointer"
                      style={{ backgroundColor: toColor }}
                      title="Click to open color picker"
                    />
                    
                    {/* To Color Hex Input */}
                    <Input
                      type="text"
                      value={currentHexInput}
                      onChange={(e) => handleHexInputChange(fromColor, e.target.value)}
                      className="flex-1 h-6 text-[9px] font-mono min-w-0 mx-1 px-1"
                      placeholder="#ffffff"
                    />
                    
                    {/* Individual Reset Button */}
                    <div className="flex justify-center pl-1">
                      <Button
                        onClick={() => handleResetIndividualMapping(fromColor)}
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                        title="Reset this color mapping"
                        disabled={fromColor === toColor}
                      >
                        <RotateCcwSquare className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Use Palette Tab */}
        <TabsContent value="palette" className="space-y-4 mt-4">
          {/* Palette Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Color Palette</Label>
              <div className="flex gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0"
                        onClick={() => setShowManagePalettes(true)}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Manage palettes</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <Select 
              value={remapColorsSettings.selectedPaletteId || ''} 
              onValueChange={(value) => {
                updateRemapColorsSettings({ selectedPaletteId: value });
                updatePreview();
              }}
            >
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Select palette..." />
              </SelectTrigger>
              <SelectContent>
                {/* All palettes */}
                {getAllPalettes().length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    No palettes available
                  </div>
                ) : (
                  getAllPalettes().map((palette) => (
                    <SelectItem key={palette.id} value={palette.id} className="text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate flex-1">{palette.name}</span>
                        <span className="text-muted-foreground flex-shrink-0">
                          ({palette.colors.length} colors)
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Mapping Algorithm Selection */}
          {remapColorsSettings.selectedPaletteId && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Mapping Mode</Label>
              <Select 
                value={remapColorsSettings.mappingAlgorithm} 
                onValueChange={(value) => {
                  updateRemapColorsSettings({ mappingAlgorithm: value as 'closest' | 'by-index' });
                  updatePreview();
                }}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="closest" className="text-xs">
                    <div className="space-y-0.5">
                      <div>Closest Match</div>
                      <div className="text-[10px] text-muted-foreground">
                        Maps each color to the nearest palette color
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="by-index" className="text-xs">
                    <div className="space-y-0.5">
                      <div>By Index</div>
                      <div className="text-[10px] text-muted-foreground">
                        Maps colors sequentially, overflow uses last color
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Palette Editor - show selected palette colors with full editing */}
          {remapColorsSettings.selectedPaletteId && (() => {
            const selectedPalette = getAllPalettes().find(p => p.id === remapColorsSettings.selectedPaletteId);
            if (!selectedPalette) return null;
            
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">
                    Palette Colors ({selectedPalette.colors.length})
                  </Label>
                  <div className="flex gap-0.5">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              if (selectedPalette.isPreset) {
                                const newPaletteId = createCustomCopy(selectedPalette.id);
                                if (newPaletteId) {
                                  updateRemapColorsSettings({ selectedPaletteId: newPaletteId });
                                  updatePreview();
                                }
                              }
                            }}
                            disabled={!selectedPalette.isPreset}
                            title={selectedPalette.isPreset ? "Create custom copy to edit" : "Already editable"}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{selectedPalette.isPreset ? "Create editable copy" : "Already custom"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {!selectedPalette.isPreset && (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  reversePalette(selectedPalette.id);
                                  updatePreview();
                                }}
                              >
                                <ArrowUpDown className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Reverse palette order</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0"
                                onClick={() => setShowImportPalette(true)}
                              >
                                <Upload className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Import palette</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0"
                                onClick={() => setShowExportPalette(true)}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Export palette</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Color swatches grid */}
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="p-3">
                    <div className="grid grid-cols-8 gap-1">
                      {selectedPalette.colors.map((color, index) => (
                        <TooltipProvider key={color.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative group">
                                <button
                                  className="w-full aspect-square rounded border-2 border-border hover:border-border/80 transition-all hover:scale-105 cursor-pointer"
                                  style={{ backgroundColor: color.value }}
                                  onClick={() => {
                                    if (!selectedPalette.isPreset) {
                                      setColorPickerTarget({
                                        fromColor: color.value,
                                        mode: 'palette',
                                        paletteIndex: index,
                                        triggerRef: null
                                      });
                                      setIsColorPickerOpen(true);
                                    }
                                  }}
                                  title={selectedPalette.isPreset ? "Create custom copy to edit" : "Click to edit color"}
                                />
                                
                                {/* Add/Remove buttons for custom palettes */}
                                {!selectedPalette.isPreset && (
                                  <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {selectedPalette.colors.length > 1 && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-3 w-3 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/80 rounded-full"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeColor(selectedPalette.id, color.id);
                                          updatePreview();
                                        }}
                                      >
                                        <Trash2 className="w-2 h-2" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                                
                                {/* Reorder buttons for custom palettes */}
                                {!selectedPalette.isPreset && (
                                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-3 w-3 p-0 bg-background/90 hover:bg-background rounded-full"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const currentIndex = selectedPalette.colors.findIndex(c => c.id === color.id);
                                        if (currentIndex > 0) {
                                          reorderColors(selectedPalette.id, currentIndex, currentIndex - 1);
                                          updatePreview();
                                        }
                                      }}
                                      disabled={index === 0}
                                      title="Move left"
                                    >
                                      <ChevronLeft className="w-2 h-2" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-3 w-3 p-0 bg-background/90 hover:bg-background rounded-full"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const currentIndex = selectedPalette.colors.findIndex(c => c.id === color.id);
                                        if (currentIndex < selectedPalette.colors.length - 1) {
                                          reorderColors(selectedPalette.id, currentIndex, currentIndex + 1);
                                          updatePreview();
                                        }
                                      }}
                                      disabled={index === selectedPalette.colors.length - 1}
                                      title="Move right"
                                    >
                                      <ChevronRight className="w-2 h-2" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{color.name || 'Unnamed'}: {color.value}</p>
                              {selectedPalette.isPreset && <p className="text-xs text-muted-foreground">(Create copy to edit)</p>}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                      
                      {/* Add color button for custom palettes */}
                      {!selectedPalette.isPreset && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="w-full aspect-square rounded border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 transition-colors flex items-center justify-center bg-muted/20 hover:bg-muted/30"
                                onClick={() => {
                                  addColor(selectedPalette.id, '#000000');
                                  updatePreview();
                                }}
                              >
                                <Plus className="w-3 h-3 text-muted-foreground" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Add color</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Info about computed mappings */}
                {!isAnalyzing && mappingCount > 0 && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-100 flex items-start gap-2">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Auto-mapped {mappingCount} canvas colors</div>
                      <div className="text-[10px] text-blue-700 dark:text-blue-300 mt-0.5">
                        Using <span className="font-medium">{remapColorsSettings.mappingAlgorithm === 'closest' ? 'Closest Match' : 'By Index'}</span> algorithm. 
                        Switch to Manual tab to see computed mappings.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          
          {/* Empty state when no palette selected */}
          {!remapColorsSettings.selectedPaletteId && (
            <div className="p-4 border border-dashed border-muted-foreground/50 rounded text-center text-xs text-muted-foreground">
              Select a palette above to automatically remap canvas colors
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Color Picker Overlay */}
      <ColorPickerOverlay
        isOpen={isColorPickerOpen}
        onOpenChange={setIsColorPickerOpen}
        onColorSelect={handleColorPickerSelect}
        initialColor={colorPickerTarget.fromColor ? remapColorsSettings.colorMappings[colorPickerTarget.fromColor] || colorPickerTarget.fromColor : '#000000'}
        title="Select Target Color"
        triggerRef={colorPickerTarget.triggerRef || undefined}
        anchorPosition="bottom-left"
      />
      
      {/* Palette Management Dialogs */}
      <ManagePalettesDialog
        isOpen={showManagePalettes}
        onOpenChange={setShowManagePalettes}
      />
      <ImportPaletteDialog
        isOpen={showImportPalette}
        onOpenChange={setShowImportPalette}
      />
      <ExportPaletteDialog
        isOpen={showExportPalette}
        onOpenChange={setShowExportPalette}
      />
      
    </div>
  );
}