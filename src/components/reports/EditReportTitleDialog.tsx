import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface EditReportTitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  currentTitle: string;
  onTitleUpdated: (newTitle: string) => void;
}

export function EditReportTitleDialog({
  open,
  onOpenChange,
  reportId,
  currentTitle,
  onTitleUpdated,
}: EditReportTitleDialogProps) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      setTitle(currentTitle || "");
    }
  }, [open, currentTitle]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Title cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('reports')
        .update({ title: title.trim() })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report title updated successfully",
      });
      
      onTitleUpdated(title.trim());
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating report title:', error);
      toast({
        title: "Error",
        description: "Failed to update report title",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const FormContent = () => (
    <>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter report title"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave();
              }
            }}
          />
        </div>
      </div>
      <div className={`flex ${isMobile ? 'flex-col' : ''} gap-2 ${isMobile ? 'mt-auto' : ''}`}>
        <Button 
          variant="outline" 
          onClick={() => onOpenChange(false)}
          className={isMobile ? 'h-11' : ''}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className={isMobile ? 'h-11' : ''}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[95vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Edit Report Title</DrawerTitle>
            <DrawerDescription>
              Change the title of this report to make it easier to identify.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 flex flex-col h-full">
            <FormContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Report Title</DialogTitle>
          <DialogDescription>
            Change the title of this report to make it easier to identify.
          </DialogDescription>
        </DialogHeader>
        <FormContent />
      </DialogContent>
    </Dialog>
  );
}