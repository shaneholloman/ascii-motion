/**
 * ASCII Motion - PREMIUM FEATURE
 * Silent Save Handler
 * 
 * Handles silent saves for projects that have already been saved to cloud
 * This component must be rendered inside CanvasProvider to access useExportDataCollector
 * 
 * @premium This component requires authentication and uses premium cloud storage features
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CloudUpload } from 'lucide-react';
import { useCloudDialogState } from '../../hooks/useCloudDialogState';
import { useCloudProjectActions } from '../../hooks/useCloudProjectActions';
import { useProjectMetadataStore } from '../../stores/projectMetadataStore';
import { useExportDataCollector } from '../../utils/exportDataCollector';
import { useAuth } from '@ascii-motion/premium';
import { PublishedProjectSaveWarningDialog } from './PublishedProjectSaveWarningDialog';

export function SilentSaveHandler() {
  const { user } = useAuth();
  const { triggerSilentSave, setTriggerSilentSave } = useCloudDialogState();
  const { handleSaveToCloud, checkIfPublished } = useCloudProjectActions();
  const { projectName, projectDescription, currentProjectId } = useProjectMetadataStore();
  const exportData = useExportDataCollector();

  const [showPublishWarning, setShowPublishWarning] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<typeof exportData | null>(null);

  useEffect(() => {
    if (!triggerSilentSave || !user || !currentProjectId) {
      return;
    }

    // Reset the flag immediately to prevent duplicate saves
    setTriggerSilentSave(false);

    const performSilentSave = async () => {
      try {
        // Check if project is published
        const isPublished = await checkIfPublished(currentProjectId);
        
        if (isPublished) {
          // Show warning dialog
          setPendingSaveData(exportData);
          setShowPublishWarning(true);
          return;
        }

        // Not published, save directly
        await handleSaveToCloud(
          exportData,
          projectName,
          projectDescription,
          false // Don't force new - update existing
        );
        
        // Show success toast with project name and purple cloud icon
        toast.success('Saved to your projects', {
          description: projectName,
          icon: <CloudUpload className="h-5 w-5 text-purple-500" />,
        });
      } catch (error) {
        console.error('[SilentSaveHandler] Failed to save project:', error);
        
        // Show error toast
        toast.error('Failed to save project', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
        });
      }
    };

    performSilentSave();
  }, [triggerSilentSave, user, currentProjectId, handleSaveToCloud, checkIfPublished, exportData, projectName, projectDescription, setTriggerSilentSave]);

  const handleConfirmSave = async () => {
    setShowPublishWarning(false);
    
    if (!pendingSaveData) return;

    try {
      await handleSaveToCloud(
        pendingSaveData,
        projectName,
        projectDescription,
        false
      );
      
      toast.success('Saved & updated gallery', {
        description: projectName,
        icon: <CloudUpload className="h-5 w-5 text-purple-500" />,
      });
    } catch (error) {
      console.error('[SilentSaveHandler] Failed to save project:', error);
      toast.error('Failed to save project', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setPendingSaveData(null);
    }
  };

  const handleCancelSave = () => {
    setShowPublishWarning(false);
    setPendingSaveData(null);
  };

  return (
    <PublishedProjectSaveWarningDialog
      isOpen={showPublishWarning}
      onOpenChange={setShowPublishWarning}
      onConfirm={handleConfirmSave}
      onCancel={handleCancelSave}
    />
  );
}
