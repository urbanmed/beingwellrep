
import { useEffect } from "react";
import { DocumentProcessing } from "@/components/vault/DocumentProcessing";
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
    <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-20 space-y-6">
      <DocumentProcessing />
      <FloatingUploadButton />
    </main>
  );
}
