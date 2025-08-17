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
    <div className="ios-viewport-height bg-background flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-auto relative" style={{ 
        paddingTop: 'calc(var(--header-height) + var(--safe-area-inset-top, 0px))',
        marginBottom: 'calc(5rem + var(--safe-area-inset-bottom, 0px))'
      }}>
        {children}
      </main>
      {!(["/vault", "/ai-assistant", "/profile"].includes(pathname)) && <FloatingUploadButton />}
      <BottomNavigation />
    </div>
  );
}