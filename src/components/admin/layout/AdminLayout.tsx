import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        
        <main className="flex-1 overflow-auto">
          <header className="h-16 flex items-center border-b bg-background px-4 pt-safe mt-4 sm:mt-2">
            <SidebarTrigger className="mr-4" />
            <h1 className="text-lg font-semibold text-foreground">
              Admin Panel
            </h1>
          </header>
          
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}