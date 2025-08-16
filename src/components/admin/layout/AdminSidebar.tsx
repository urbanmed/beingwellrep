import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  FileText, 
  Shield, 
  Settings,
  AlertTriangle,
  Activity,
  Database,
  MessageSquare,
  LogOut,
  Clock,
  Brain,
  Download,
  Upload
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAuth } from "@/contexts/AuthContext";

const adminNavItems = [
  { 
    title: "Dashboard", 
    url: "/admin", 
    icon: LayoutDashboard,
    roles: ['moderator', 'admin', 'super_admin']
  },
  { 
    title: "Analytics", 
    url: "/admin/analytics", 
    icon: BarChart3,
    roles: ['moderator', 'admin', 'super_admin']
  },
  { 
    title: "Processing Queue", 
    url: "/admin/processing", 
    icon: Clock,
    roles: ['moderator', 'admin', 'super_admin']
  },
  { 
    title: "AI Assistant", 
    url: "/admin/ai-chat", 
    icon: Brain,
    roles: ['moderator', 'admin', 'super_admin']
  },
  { 
    title: "Health Insights", 
    url: "/admin/insights", 
    icon: Brain,
    roles: ['moderator', 'admin', 'super_admin']
  },
  { 
    title: "Data Export", 
    url: "/admin/export", 
    icon: Download,
    roles: ['moderator', 'admin', 'super_admin']
  },
  { 
    title: "Data Import", 
    url: "/admin/import", 
    icon: Upload,
    roles: ['admin', 'super_admin']
  },
  { 
    title: "SOS Monitoring", 
    url: "/admin/sos", 
    icon: AlertTriangle,
    roles: ['moderator', 'admin', 'super_admin']
  },
  { 
    title: "Content Management", 
    url: "/admin/content", 
    icon: FileText,
    roles: ['moderator', 'admin', 'super_admin']
  },
  { 
    title: "Custom Prompts", 
    url: "/admin/prompts", 
    icon: MessageSquare,
    roles: ['admin', 'super_admin']
  },
  { 
    title: "Medical Data", 
    url: "/admin/medical", 
    icon: Activity,
    roles: ['admin', 'super_admin']
  },
  { 
    title: "User Management", 
    url: "/admin/users", 
    icon: Users,
    roles: ['admin', 'super_admin']
  },
  { 
    title: "System Health", 
    url: "/admin/system", 
    icon: Database,
    roles: ['admin', 'super_admin']
  },
  { 
    title: "Audit Logs", 
    url: "/admin/audit", 
    icon: Shield,
    roles: ['admin', 'super_admin']
  },
  { 
    title: "Settings", 
    url: "/admin/settings", 
    icon: Settings,
    roles: ['super_admin']
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { userRole } = useAdminAuth();
  const { signOut } = useAuth();
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => {
    if (path === '/admin') {
      return currentPath === '/admin';
    }
    return currentPath.startsWith(path);
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted/50";

  const hasAccess = (roles: string[]) => {
    if (!userRole) return false;
    return roles.includes(userRole);
  };

  const filteredNavItems = adminNavItems.filter(item => hasAccess(item.roles));

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Sidebar
      className={collapsed ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Panel</SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/admin'}
                      className={({ isActive }) => getNavCls({ isActive })}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {!collapsed && <span>Sign Out</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}