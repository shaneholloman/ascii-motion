import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useGradientStore } from '../../stores/gradientStore';
import { useBezierStore } from '../../stores/bezierStore';
import { useAnimationStore } from '../../stores/animationStore';
import { useCanvasContext } from '../../contexts/CanvasContext';
import { useFlipUtilities } from '../../hooks/useFlipUtilities';
import { useCropToSelection } from '../../hooks/useCropToSelection';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { CollapsibleHeader } from '../common/CollapsibleHeader';
import { PanelSeparator } from '../common/PanelSeparator';
import { GradientIcon } from '../icons';
import { BrushControls } from './BrushControls';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AUTOFILL_PALETTES } from '../../constants/bezierAutofill';
import type { BezierCloseShapeHistoryAction } from '../../types';
import { 
  PenTool,
  Eraser, 
  PaintBucket, 
  Pipette, 
  Square,
  Circle,
  Lasso,
  Type,
  Wand2,
  Palette,
  Wrench,
  MoveHorizontal,
  MoveVertical,
  TypeOutline,
  Grid2x2,
  Brush,
  Crop,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { Tool } from '../../types';
import { getToolTooltipText } from '../../constants/hotkeys';

interface ToolPaletteProps {
  className?: string;
}

// Custom dashed rectangle icon for selection tool
const DashedRectangleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className}
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
  >
    <rect 
      x="3" 
      y="3" 
      width="18" 
      height="18" 
      strokeDasharray="3 3"
      fill="none"
    />
  </svg>
);

// Organized tools by category
const DRAWING_TOOLS: Array<{ id: Tool; name: string; icon: React.ReactNode; description: string }> = [
  { id: 'pencil', name: 'Brush', icon: <Brush className="w-3 h-3" />, description: 'Draw characters' },
  { id: 'beziershape', name: 'Bezier Pen Tool', icon: <PenTool className="w-3 h-3" />, description: 'Draw bezier vector shapes' },
  { id: 'eraser', name: 'Eraser', icon: <Eraser className="w-3 h-3" />, description: 'Remove characters' },
  { id: 'paintbucket', name: 'Fill', icon: <PaintBucket className="w-3 h-3" />, description: 'Fill connected areas' },
  { id: 'gradientfill', name: 'Gradient', icon: <GradientIcon className="w-3 h-3" />, description: 'Apply gradient fills' },
  { id: 'rectangle', name: 'Rectangle', icon: <Square className="w-3 h-3" />, description: 'Draw rectangles' },
  { id: 'ellipse', name: 'Ellipse', icon: <Circle className="w-3 h-3" />, description: 'Draw ellipses/circles' },
  { id: 'text', name: 'Text', icon: <Type className="w-3 h-3" />, description: 'Type text directly' },
  { id: 'asciitype', name: 'ASCII Type', icon: <TypeOutline className="w-3 h-3" />, description: 'Create ASCII text' },
  { id: 'asciibox', name: 'ASCII Box', icon: <Grid2x2 className="w-3 h-3" />, description: 'Draw boxes and tables' },
];

const SELECTION_TOOLS: Array<{ id: Tool; name: string; icon: React.ReactNode; description: string }> = [
  { id: 'select', name: 'Select', icon: <DashedRectangleIcon className="w-3 h-3" />, description: 'Select rectangular areas' },
  { id: 'lasso', name: 'Lasso', icon: <Lasso className="w-3 h-3" />, description: 'Freeform selection tool' },
  { id: 'magicwand', name: 'Magic Wand', icon: <Wand2 className="w-3 h-3" />, description: 'Select matching cells' },
];

const UTILITY_TOOLS: Array<{ id: Tool; name: string; icon: React.ReactNode; description: string }> = [
  { id: 'eyedropper', name: 'Eyedropper', icon: <Pipette className="w-3 h-3" />, description: 'Pick character/color' },
  { id: 'fliphorizontal', name: 'Flip H', icon: <MoveHorizontal className="w-3 h-3" />, description: 'Flip horizontally (Shift+H)' },
  { id: 'flipvertical', name: 'Flip V', icon: <MoveVertical className="w-3 h-3" />, description: 'Flip vertically (Shift+V)' },
];

export const ToolPalette: React.FC<ToolPaletteProps> = ({ className = '' }) => {
  const { activeTool, setActiveTool, rectangleFilled, setRectangleFilled, paintBucketContiguous, setPaintBucketContiguous, magicWandContiguous, setMagicWandContiguous, toolAffectsChar, toolAffectsColor, toolAffectsBgColor, eyedropperPicksChar, eyedropperPicksColor, eyedropperPicksBgColor, setToolAffectsChar, setToolAffectsColor, setToolAffectsBgColor, setEyedropperPicksChar, setEyedropperPicksColor, setEyedropperPicksBgColor, fillMatchChar, fillMatchColor, fillMatchBgColor, setFillMatchChar, setFillMatchColor, setFillMatchBgColor, magicMatchChar, magicMatchColor, magicMatchBgColor, setMagicMatchChar, setMagicMatchColor, setMagicMatchBgColor, pushToHistory } = useToolStore();
  const { contiguous, matchChar, matchColor, matchBgColor, setContiguous, setMatchCriteria } = useGradientStore();
  const { fillMode, autofillPaletteId, setFillMode, setAutofillPaletteId, fillColorMode, setFillColorMode, strokeWidth, strokeTaperStart, strokeTaperEnd, setStrokeWidth, setStrokeTaperStart, setStrokeTaperEnd, isClosed, toggleClosedShape } = useBezierStore();
  const { currentFrameIndex } = useAnimationStore();
  const { altKeyDown, ctrlKeyDown } = useCanvasContext();
  const { flipHorizontal, flipVertical } = useFlipUtilities();
  const { canCrop, cropToSelection } = useCropToSelection();
  const [showOptions, setShowOptions] = React.useState(true);
  const [showTools, setShowTools] = React.useState(true);

  // Calculate effective tool (Alt key overrides with eyedropper for drawing tools, Ctrl overrides pencil with eraser)
  const drawingTools: Tool[] = ['pencil', 'eraser', 'paintbucket', 'gradientfill', 'rectangle', 'ellipse'];
  const shouldAllowEyedropperOverride = drawingTools.includes(activeTool);
  let effectiveTool = activeTool;
  if (ctrlKeyDown && activeTool === 'pencil') {
    effectiveTool = 'eraser';
  } else if (altKeyDown && shouldAllowEyedropperOverride) {
    effectiveTool = 'eyedropper';
  }

  // Tools that actually have configurable options. (Removed 'eraser' and 'text' per layout bug fix.)
  const hasOptions = ['rectangle', 'ellipse', 'paintbucket', 'gradientfill', 'magicwand', 'pencil', 'eraser', 'eyedropper', 'beziershape', 'select', 'lasso'].includes(effectiveTool);

  // Get the current tool's icon
  const getCurrentToolIcon = () => {
    const allTools = [...DRAWING_TOOLS, ...SELECTION_TOOLS, ...UTILITY_TOOLS];
    const currentTool = allTools.find(tool => tool.id === effectiveTool);
    return currentTool?.icon || null;
  };

  const handleToolClick = (tool: { id: Tool; name: string; icon: React.ReactNode; description: string }) => {
    // Handle flip utilities as immediate actions
    if (tool.id === 'fliphorizontal') {
      flipHorizontal();
      return;
    }
    if (tool.id === 'flipvertical') {
      flipVertical();
      return;
    }
    
    // Default tool switching behavior
    setActiveTool(tool.id);
  };

  // Handle close shape toggle with history tracking
  const handleCloseShapeToggle = (checked: boolean) => {
    const wasClosed = isClosed;
    toggleClosedShape();
    
    // Push history for closing/opening shape
    const closeAction: BezierCloseShapeHistoryAction = {
      type: 'bezier_close_shape',
      timestamp: Date.now(),
      description: checked ? 'Close bezier shape' : 'Open bezier shape',
      data: {
        wasClosed,
        nowClosed: checked,
        frameIndex: currentFrameIndex,
      },
    };
    pushToHistory(closeAction);
  };

  const ToolButton: React.FC<{ tool: { id: Tool; name: string; icon: React.ReactNode; description: string } }> = ({ tool }) => {
    // Tools use default tabIndex (0) to come after header and frames but in natural DOM order
    const tabIndex = 0;
    
    return (
      <Tooltip key={tool.id}>
        <TooltipTrigger asChild>
          <Button
            variant={effectiveTool === tool.id ? 'default' : 'outline'}
            size="sm"
            className="h-8 w-8 p-0 touch-manipulation"
            onClick={() => handleToolClick(tool)}
            aria-label={`${tool.name} tool - ${tool.description}`}
            aria-pressed={effectiveTool === tool.id}
            tabIndex={tabIndex}
          >
            {tool.icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="text-xs">{getToolTooltipText(tool.id, tool.name)}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <div className={`space-y-3 ${className}`}>
        <Collapsible open={showTools} onOpenChange={setShowTools}>
          <CollapsibleHeader isOpen={showTools}>
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Tools
            </div>
          </CollapsibleHeader>
          <CollapsibleContent className="collapsible-content">
            <Card className="border-border/50 mt-2">
              <CardContent className="p-3">
                {/* Drawing Tools Section */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Drawing</h4>
                  <div className="grid grid-cols-3 gap-1" role="toolbar" aria-label="Drawing tools">
                    {DRAWING_TOOLS.map((tool) => (
                      <ToolButton key={tool.id} tool={tool} />
                    ))}
                  </div>
                </div>

                {/* Selection Tools Section */}
                <div className="space-y-2 mt-3">
                  <h4 className="text-xs font-medium text-muted-foreground">Selection</h4>
                  <div className="grid grid-cols-3 gap-1" role="toolbar" aria-label="Selection tools">
                    {SELECTION_TOOLS.map((tool) => (
                      <ToolButton key={tool.id} tool={tool} />
                    ))}
                  </div>
                </div>

                {/* Utility Tools Section */}
                <div className="space-y-2 mt-3">
                  <h4 className="text-xs font-medium text-muted-foreground">Utility</h4>
                  <div className="grid grid-cols-3 gap-1" role="toolbar" aria-label="Utility tools">
                    {UTILITY_TOOLS.map((tool) => (
                      <ToolButton key={tool.id} tool={tool} />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Separator between Tools and Tool Options */}
        {hasOptions && <PanelSeparator />}

        {/* Tool Options */}
        {hasOptions && (
          <div>
            <Collapsible open={showOptions} onOpenChange={setShowOptions}>
            <CollapsibleHeader isOpen={showOptions}>
              <div className="flex items-center gap-2">
                {getCurrentToolIcon()}
                <span>Tool Options</span>
              </div>
            </CollapsibleHeader>
            <CollapsibleContent className="collapsible-content">
              <div className="mt-2 space-y-2">
                {effectiveTool === 'rectangle' && (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="filled-rectangle" className="text-xs cursor-pointer">
                        Filled
                      </Label>
                      <Switch
                        id="filled-rectangle"
                        checked={rectangleFilled}
                        onCheckedChange={setRectangleFilled}
                      />
                    </div>
                  )}
                  
                  {effectiveTool === 'ellipse' && (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="filled-ellipse" className="text-xs cursor-pointer">
                        Filled
                      </Label>
                      <Switch
                        id="filled-ellipse"
                        checked={rectangleFilled}
                        onCheckedChange={setRectangleFilled}
                      />
                    </div>
                  )}
                  
                  {effectiveTool === 'paintbucket' && (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="contiguous-fill" className="text-xs cursor-pointer">
                        Contiguous
                      </Label>
                      <Switch
                        id="contiguous-fill"
                        checked={paintBucketContiguous}
                        onCheckedChange={setPaintBucketContiguous}
                      />
                    </div>
                  )}
                  
                  {effectiveTool === 'gradientfill' && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="gradient-contiguous" className="text-xs cursor-pointer">
                          Contiguous
                        </Label>
                        <Switch
                          id="gradient-contiguous"
                          checked={contiguous}
                          onCheckedChange={setContiguous}
                        />
                      </div>
                      <div className="space-y-2 mt-2">
                        <div className="text-xs text-muted-foreground">Selects same:</div>
                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={matchChar ? "default" : "outline"}
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setMatchCriteria({ char: !matchChar, color: matchColor, bgColor: matchBgColor })}
                              >
                                <Type className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Match character</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={matchColor ? "default" : "outline"}
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setMatchCriteria({ char: matchChar, color: !matchColor, bgColor: matchBgColor })}
                              >
                                <Palette className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Match text color</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={matchBgColor ? "default" : "outline"}
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setMatchCriteria({ char: matchChar, color: matchColor, bgColor: !matchBgColor })}
                              >
                                <Square className="h-3 w-3 fill-current" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Match background color</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {effectiveTool === 'magicwand' && (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="contiguous-selection" className="text-xs cursor-pointer">
                        Contiguous
                      </Label>
                      <Switch
                        id="contiguous-selection"
                        checked={magicWandContiguous}
                        onCheckedChange={setMagicWandContiguous}
                      />
                    </div>
                  )}
                  {effectiveTool === 'magicwand' && (
                    <div className="space-y-2 mt-2">
                      <div className="text-xs text-muted-foreground">Selects same:</div>
                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={magicMatchChar ? "default" : "outline"}
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setMagicMatchChar(!magicMatchChar)}
                            >
                              <Type className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Match character</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={magicMatchColor ? "default" : "outline"}
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setMagicMatchColor(!magicMatchColor)}
                            >
                              <Palette className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Match text color</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={magicMatchBgColor ? "default" : "outline"}
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setMagicMatchBgColor(!magicMatchBgColor)}
                            >
                              <Square className="h-3 w-3 fill-current" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Match background color</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  )}
                  
                  {/* Crop to Selection - Available for all selection tools */}
                  {(effectiveTool === 'select' || effectiveTool === 'lasso' || effectiveTool === 'magicwand') && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          onClick={cropToSelection}
                          disabled={!canCrop()}
                        >
                          <Crop className="w-3 h-3 mr-2" />
                          Crop
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Crop canvas to selection (Cmd+Shift+C)</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  {/* Bezier Shape Tool Options */}
                  {effectiveTool === 'beziershape' && (
                    <div className="space-y-3">
                      {/* Character Mode Selector */}
                      <div className="space-y-2">
                        <Label htmlFor="fill-mode" className="text-xs text-muted-foreground">
                          Character Mode:
                        </Label>
                        <Select value={fillMode} onValueChange={(value) => setFillMode(value as 'constant' | 'palette' | 'autofill')}>
                          <SelectTrigger id="fill-mode" className="w-full h-8 text-xs [&>span]:text-left">
                            <SelectValue placeholder="Select character mode...">
                              {fillMode === 'constant' && 'Selection'}
                              {fillMode === 'palette' && 'Palette'}
                              {fillMode === 'autofill' && 'Autofill'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent align="start">
                            <SelectItem value="constant" className="text-xs">
                              <div className="flex flex-col">
                                <span className="font-medium">Selection</span>
                                <span className="text-muted-foreground text-[10px]">Fill with current selected color</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="palette" className="text-xs">
                              <div className="flex flex-col">
                                <span className="font-medium">Palette</span>
                                <span className="text-muted-foreground text-[10px]">Map current character palette to shape</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="autofill" className="text-xs">
                              <div className="flex flex-col">
                                <span className="font-medium">Autofill</span>
                                <span className="text-muted-foreground text-[10px]">Smart character selection from preset</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Autofill Palette Selector - Only shown when autofill mode is active */}
                      {fillMode === 'autofill' && (
                        <div className="space-y-2">
                          <Label htmlFor="autofill-palette" className="text-xs text-muted-foreground">
                            Autofill Palette:
                          </Label>
                          <Select value={autofillPaletteId} onValueChange={setAutofillPaletteId}>
                            <SelectTrigger id="autofill-palette" className="w-full h-8 text-xs [&>span]:text-left">
                              <SelectValue>
                                {AUTOFILL_PALETTES.find(p => p.id === autofillPaletteId)?.name || 'Select palette...'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent align="start">
                              {AUTOFILL_PALETTES.map((palette) => (
                                <SelectItem key={palette.id} value={palette.id} className="text-xs">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{palette.name}</span>
                                    <span className="text-muted-foreground text-[10px]">{palette.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      {/* Color Mode Selector */}
                      <div className="space-y-2">
                        <Label htmlFor="fill-color-mode" className="text-xs text-muted-foreground">
                          Color Mode:
                        </Label>
                        <Select value={fillColorMode} onValueChange={(value) => setFillColorMode(value as 'current' | 'palette')}>
                          <SelectTrigger id="fill-color-mode" className="w-full h-8 text-xs [&>span]:text-left">
                            <SelectValue placeholder="Select color mode...">
                              {fillColorMode === 'current' && 'Current Color'}
                              {fillColorMode === 'palette' && 'Palette'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent align="start">
                            <SelectItem value="current" className="text-xs">
                              <div className="flex flex-col">
                                <span className="font-medium">Current Color</span>
                                <span className="text-muted-foreground text-[10px]">Applies the current color to all cells</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="palette" className="text-xs">
                              <div className="flex flex-col">
                                <span className="font-medium">Palette</span>
                                <span className="text-muted-foreground text-[10px]">Maps palette colors by overlap amount</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Close Shape Toggle */}
                      <div className="space-y-2 pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="close-shape" className="text-xs text-muted-foreground">
                            Close Shape:
                          </Label>
                          <Switch
                            id="close-shape"
                            checked={isClosed}
                            onCheckedChange={handleCloseShapeToggle}
                            tabIndex={-1}
                            onKeyDown={(e) => {
                              // Prevent all keyboard events on this switch
                              // (Enter should commit the bezier shape, not toggle this)
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {isClosed ? 'Shape is closed' : 'Shape is open'}
                        </p>
                      </div>
                      
                      {/* Stroke Controls - Only shown for open paths */}
                      {!isClosed && (
                        <>
                          {/* Stroke Width Slider */}
                          <div className="space-y-2 pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="stroke-width" className="text-xs text-muted-foreground">
                                Stroke Width:
                              </Label>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {strokeWidth.toFixed(1)}
                              </span>
                            </div>
                            <Slider
                              id="stroke-width"
                              min={0.1}
                              max={10}
                              step={0.1}
                              value={strokeWidth}
                              onValueChange={setStrokeWidth}
                              className="w-full"
                            />
                          </div>
                          
                          {/* Taper Start Slider */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="stroke-taper-start" className="text-xs text-muted-foreground">
                                Taper Start:
                              </Label>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {(strokeTaperStart * 100).toFixed(0)}%
                              </span>
                            </div>
                            <Slider
                              id="stroke-taper-start"
                              min={0}
                              max={1}
                              step={0.01}
                              value={strokeTaperStart}
                              onValueChange={setStrokeTaperStart}
                              className="w-full"
                            />
                          </div>
                          
                          {/* Taper End Slider */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="stroke-taper-end" className="text-xs text-muted-foreground">
                                Taper End:
                              </Label>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {(strokeTaperEnd * 100).toFixed(0)}%
                              </span>
                            </div>
                            <Slider
                              id="stroke-taper-end"
                              min={0}
                              max={1}
                              step={0.01}
                              value={strokeTaperEnd}
                              onValueChange={setStrokeTaperEnd}
                              className="w-full"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Tool behavior toggles for drawing tools */}
                  {(['pencil', 'paintbucket'] as Tool[]).includes(effectiveTool) && (
                    <>
                      {/* Paint bucket specific: Selects same criteria */}
                      {effectiveTool === 'paintbucket' && (
                        <div className="space-y-2 mt-2">
                          <div className="text-xs text-muted-foreground">Selects same:</div>
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={fillMatchChar ? "default" : "outline"}
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => setFillMatchChar(!fillMatchChar)}
                                >
                                  <Type className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Match character</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={fillMatchColor ? "default" : "outline"}
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => setFillMatchColor(!fillMatchColor)}
                                >
                                  <Palette className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Match text color</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={fillMatchBgColor ? "default" : "outline"}
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => setFillMatchBgColor(!fillMatchBgColor)}
                                >
                                  <Square className="h-3 w-3 fill-current" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Match background color</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Tool Affects Section */}
                  {(effectiveTool === 'pencil' || effectiveTool === 'eraser' || effectiveTool === 'paintbucket') && (
                    <div className="space-y-2 mt-2">
                      <div className="text-xs text-muted-foreground">Affects:</div>
                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={toolAffectsChar ? "default" : "outline"}
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setToolAffectsChar(!toolAffectsChar)}
                            >
                              <Type className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Affect character</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={toolAffectsColor ? "default" : "outline"}
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setToolAffectsColor(!toolAffectsColor)}
                            >
                              <Palette className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Affect text color</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={toolAffectsBgColor ? "default" : "outline"}
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setToolAffectsBgColor(!toolAffectsBgColor)}
                            >
                              <Square className="h-3 w-3 fill-current" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Affect background color</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  )}
                  
                  {/* Brush controls - Separate container */}
                  {(effectiveTool === 'pencil' || effectiveTool === 'eraser') && (
                    <div className="mt-2">
                      <BrushControls tool={effectiveTool === 'eraser' ? 'eraser' : 'pencil'} />
                    </div>
                  )}
                  
                  {/* Eyedropper behavior toggles */}
                  {effectiveTool === 'eyedropper' && (
                    <>
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">Picks:</div>
                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={eyedropperPicksChar ? "default" : "outline"}
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setEyedropperPicksChar(!eyedropperPicksChar)}
                              >
                                <Type className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Pick character</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={eyedropperPicksColor ? "default" : "outline"}
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setEyedropperPicksColor(!eyedropperPicksColor)}
                              >
                                <Palette className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Pick text color</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={eyedropperPicksBgColor ? "default" : "outline"}
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setEyedropperPicksBgColor(!eyedropperPicksBgColor)}
                              >
                                <Square className="h-3 w-3 fill-current" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Pick background color</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </>
                  )}
              </div>
            </CollapsibleContent>
          </Collapsible>
          </div>
        )}

        {/* Separator after Tool Options */}
        {hasOptions && <PanelSeparator />}
      </div>
    </TooltipProvider>
  );
};
