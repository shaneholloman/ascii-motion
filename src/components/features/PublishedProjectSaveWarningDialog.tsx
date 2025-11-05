/**
 * Warning dialog shown when saving a project that is currently published
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface PublishedProjectSaveWarningDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PublishedProjectSaveWarningDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  onCancel,
}: PublishedProjectSaveWarningDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Update Published Project?</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            This project is currently published in the community gallery. Saving will update the
            version displayed in the gallery, including the animation and preview image.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Save & Update Gallery</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
