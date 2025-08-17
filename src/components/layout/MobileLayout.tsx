import { ReactNode } from "react";
import { BottomNavigation } from "./BottomNavigation";
import { Header } from "./Header";
import { FloatingUploadButton } from "@/components/vault/FloatingUploadButton";
import { useLocation } from "react-router-dom";

interface MobileLayoutProps {
  children: ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pb-[calc(56px+env(safe-area-inset-bottom)+8px)] sm:pb-[calc(64px+env(safe-area-inset-bottom)+8px)]">
        {children}
      </main>
      {!(["/vault", "/ai-assistant", "/profile"].includes(pathname)) && <FloatingUploadButton />}
      <BottomNavigation />
    </div>
  );
}