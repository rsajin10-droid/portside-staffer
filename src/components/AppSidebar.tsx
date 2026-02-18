import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardCheck, Truck, FileText, Settings, LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar';

const items = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Staff Management', url: '/staff', icon: Users },
  { title: 'Attendance', url: '/attendance', icon: ClipboardCheck },
  { title: 'Job Allotment', url: '/job-allotment', icon: Truck },
  { title: 'Reports', url: '/reports', icon: FileText },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  return (
    <Sidebar>
      <SidebarContent>
        <div className="p-4 border-b border-sidebar-border">
          <h2 className="text-lg font-bold text-sidebar-primary">SKL</h2>
          <p className="text-xs text-sidebar-foreground/70">Staff Management System</p>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.url}
                    onClick={() => navigate(item.url)}
                    className="cursor-pointer"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => { logout(); navigate('/'); }}
                  className="cursor-pointer text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {user && (
          <div className="mt-auto p-4 border-t border-sidebar-border">
            <p className="text-xs text-sidebar-foreground/70">Logged in as</p>
            <p className="text-sm font-medium text-sidebar-foreground">{user.displayName}</p>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
