import { ReactNode } from "react";
import { BottomNavigation } from "./BottomNavigation";
import { Header } from "./Header";
import { FloatingUploadButton } from "@/components/vault/FloatingUploadButton";
import { useLocation } from "react-router-dom";

interface MobileLayoutProps {
  children: ReactNode;
  authMode?: boolean;
}

export function MobileLayout({ children, authMode = false }: MobileLayoutProps) {
  const { pathname } = useLocation();
  
  if (authMode) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 flex items-center justify-center p-4">
          {children}
        </main>
      </div>
    );
  }
  
  return (
    <div className="ios-viewport-height bg-background flex flex-col">
      <Header />
      <main className="flex-1 overflow-auto ios-content-height">
        {children}
      </main>
      {!(["/vault", "/ai-assistant", "/profile"].includes(pathname)) && <FloatingUploadButton />}
      <BottomNavigation />
    </div>
  );
}