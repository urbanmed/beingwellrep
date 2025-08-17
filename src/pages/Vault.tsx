
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
    <main className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 pb-16 sm:pb-20 space-y-4 sm:space-y-6">
      <LazyDocumentProcessing />
      <FloatingUploadButton />
    </main>
  );
}
