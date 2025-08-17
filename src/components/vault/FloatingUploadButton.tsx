import { useState } from "react";
import { Plus, FileUp, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipInfo } from "@/components/ui/tooltip-info";
import { QuickUploadModal } from "./QuickUploadModal";
import { useIsMobile } from "@/hooks/use-mobile";

interface FloatingUploadButtonProps {
  onUploadComplete?: () => void;
}

export function FloatingUploadButton({ onUploadComplete }: FloatingUploadButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const isMobile = useIsMobile();

  const handleUploadSuccess = () => {
    setShowModal(false);
    onUploadComplete?.();
  };

  if (isMobile) {
    return (
      <>
        {/* Mobile: Fixed bottom button with lab integration hint */}
        <div className="fixed bottom-20 sm:bottom-24 left-3 right-3 z-50">
          <div className="flex flex-col items-center space-y-2">
            {/* Lab integration hint */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border border-blue-200/50 dark:border-blue-800/50 rounded-lg px-3 py-1.5 shadow-sm">
              <div className="flex items-center space-x-2">
                <Lightbulb className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                  Lab integrations coming soon
                </span>
              </div>
            </div>
            
            {/* Upload button */}
            <Button
              onClick={() => setShowModal(true)}
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-200 text-white border-0 min-h-[44px] touch-target active:scale-95"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Report
            </Button>
          </div>
        </div>

        <QuickUploadModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onUploadComplete={handleUploadSuccess}
        />
      </>
    );
  }

  return (
    <>
      {/* Desktop: Floating button in bottom right */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end space-y-3">
        {/* Lab integration hint */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border border-blue-200/50 dark:border-blue-800/50 rounded-lg px-4 py-2 shadow-sm">
          <div className="flex items-center space-x-2">
            <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              Lab integrations coming soon
            </span>
          </div>
        </div>

        {/* Upload button with tooltip */}
        <div className="flex items-center space-x-2">
          <TooltipInfo 
            content="Auto-categorization enabled. AI will handle the rest!" 
            side="left" 
          />
          <Button
            onClick={() => setShowModal(true)}
            size="lg"
            className="h-14 w-14 rounded-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-200 group"
          >
            <FileUp className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
          </Button>
        </div>
      </div>

      <QuickUploadModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onUploadComplete={handleUploadSuccess}
      />
    </>
  );
}