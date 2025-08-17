import { ReactNode, useEffect } from "react";
import { BottomNavigation } from "./BottomNavigation";
import { Header } from "./Header";
import { FloatingUploadButton } from "@/components/vault/FloatingUploadButton";
import { useLocation } from "react-router-dom";
import { initializeIOSNativeBridge } from "@/lib/utils/ios-native-bridge";

interface MobileLayoutProps {
  children: ReactNode;
  authMode?: boolean;
}

export function MobileLayout({ children, authMode = false }: MobileLayoutProps) {
  const { pathname } = useLocation();
  
  // Initialize iOS native bridge on mount
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    const initBridge = async () => {
      try {
        cleanup = await initializeIOSNativeBridge();
      } catch (error) {
        console.error('Failed to initialize iOS bridge:', error);
      }
    };
    
    initBridge();
    
    return () => {
      cleanup?.();
    };
  }, []);
  
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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-[7rem] pb-[5rem] overflow-auto">
        {children}
      </main>
      {!(["/vault", "/ai-assistant", "/profile"].includes(pathname)) && <FloatingUploadButton />}
      <BottomNavigation />
    </div>
  );
}