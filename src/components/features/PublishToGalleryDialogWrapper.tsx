/**
 * Wrapper component for PublishToGalleryDialog
 * Provides session data from CanvasContext to the dialog
 */

import { useState, useEffect } from 'react';
import { PublishToGalleryDialog } from '@ascii-motion/premium';
import { useExportDataCollector } from '../../utils/exportDataCollector';
import { useProjectMetadataStore } from '../../stores/projectMetadataStore';
import { useCloudProjectActions } from '../../hooks/useCloudProjectActions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { SessionData } from '@ascii-motion/premium';
import type { ExportDataBundle } from '../../types/export';

interface PublishToGalleryDialogWrapperProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPublishSuccess?: (projectId: string) => void;
}

/**
 * Convert ExportDataBundle to SessionData format
 */
function convertToSessionData(data: ExportDataBundle): SessionData {
  return {
    version: '1.0.0',
    name: data.name,
    description: data.description,
    metadata: {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0.0',
    },
    canvas: {
      width: data.canvasDimensions.width,
      height: data.canvasDimensions.height,
      canvasBackgroundColor: data.canvasBackgroundColor,
      showGrid: data.showGrid,
    },
    animation: {
      frames: data.frames.map((frame) => ({
        id: frame.id,
        name: frame.name,
        duration: frame.duration,
        data: Object.fromEntries(frame.data.entries()),
      })),
      currentFrameIndex: data.currentFrameIndex,
      frameRate: data.frameRate,
      looping: data.looping,
    },
    tools: {
      activeTool: data.toolState.activeTool,
      selectedCharacter: data.toolState.selectedCharacter,
      selectedColor: data.toolState.selectedColor,
      selectedBgColor: data.toolState.selectedBgColor,
      paintBucketContiguous: data.toolState.paintBucketContiguous,
      rectangleFilled: data.toolState.rectangleFilled,
    },
    ui: {
      theme: data.uiState.theme,
      zoom: data.uiState.zoom,
      panOffset: data.uiState.panOffset,
      fontMetrics: data.fontMetrics,
    },
    typography: {
      fontSize: data.typography.fontSize,
      characterSpacing: data.typography.characterSpacing,
      lineSpacing: data.typography.lineSpacing,
      selectedFontId: data.typography.selectedFontId,
    },
    palettes: data.paletteState,
    characterPalettes: data.characterPaletteState,
  };
}

export function PublishToGalleryDialogWrapper({
  isOpen,
  onOpenChange,
  onPublishSuccess,
}: PublishToGalleryDialogWrapperProps) {
  const exportData = useExportDataCollector();
  const { currentProjectId } = useProjectMetadataStore();
  const { handleSaveToCloud } = useCloudProjectActions();
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Auto-save before showing publish dialog
  useEffect(() => {
    if (!isOpen || !exportData || !currentProjectId) {
      setIsReady(false);
      return;
    }

    let cancelled = false;

    const autoSave = async () => {
      setIsSaving(true);
      setSaveError(null);
      
      try {
        console.log('[PublishWrapper] Auto-saving project before publish...');
        await handleSaveToCloud(exportData, exportData.name, exportData.description);
        
        if (!cancelled) {
          setIsReady(true);
          setIsSaving(false);
        }
      } catch (err) {
        console.error('[PublishWrapper] Auto-save failed:', err);
        if (!cancelled) {
          setSaveError(err instanceof Error ? err.message : 'Failed to save project');
          setIsSaving(false);
        }
      }
    };

    autoSave();

    return () => {
      cancelled = true;
    };
  }, [isOpen, exportData, currentProjectId, handleSaveToCloud]);

  // Don't render dialog if not open
  if (!isOpen) {
    return null;
  }

  // Don't render if no export data
  if (!exportData) {
    console.warn('[PublishToGalleryDialogWrapper] No export data available');
    return null;
  }

  // Show saving state
  if (isSaving) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preparing to Publish</DialogTitle>
            <DialogDescription>
              Saving your latest changes...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show save error
  if (saveError) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Failed</DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {saveError}
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  // Check if project is saved to cloud
  if (!currentProjectId) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Project First</DialogTitle>
          </DialogHeader>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You must save your project to the cloud before publishing it to the gallery.
              Please save your project first, then try publishing again.
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  // Don't show publish dialog until auto-save completes
  if (!isReady) {
    return null;
  }

  // Convert ExportDataBundle to SessionData
  const sessionData = convertToSessionData(exportData);

  return (
    <PublishToGalleryDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      sessionData={sessionData}
      projectId={currentProjectId}
      onPublishSuccess={onPublishSuccess}
    />
  );
}
