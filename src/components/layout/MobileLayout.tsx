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
      <main className="flex-1 pb-16">
        {children}
      </main>
      {pathname !== "/vault" && <FloatingUploadButton />}
      <BottomNavigation />
    </div>
  );
}