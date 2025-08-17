
import { useEffect } from "react";
import { LazyDocumentProcessing } from "@/components/vault/LazyDocumentProcessing";
import { FloatingUploadButton } from "@/components/vault/FloatingUploadButton";

export default function Vault() {
  useEffect(() => {
    document.title = "Document Processing Tracker";
    const meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (meta) {
      meta.content = "Track document processing status and review processed health reports.";
    }
  }, []);

  return (
    <div className="pb-safe-offset-footer px-3 sm:px-4">
      <LazyDocumentProcessing />
      <FloatingUploadButton />
    </div>
  );
}
