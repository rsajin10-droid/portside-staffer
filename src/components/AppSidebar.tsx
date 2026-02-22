import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardCheck, Truck, FileText, Settings, LogOut
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar';
import sklLogo from '@/assets/skl-logo.png';

const items = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Staff Management', url: '/staff', icon: Users },
  { title: 'Attendance', url: '/attendance', icon: ClipboardCheck },
  { title: 'Job Allotment', url: '/job-allotment', icon: Truck },
  { title: 'Reports', url: '/reports', icon: FileText },
  { title: 'Settings', url: '/settings', icon: Settings },
];

function SidebarUserProfile({ user }: { user: { id: string; displayName: string } }) {
  const [profileImage, setProfileImage] = useState('');
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(`skl_profile_${user.id}`) || '{}');
      setProfileImage(p.profileImage || '');
    } catch {}
  }, [user.id]);
  return (
    <div className="mt-auto p-4 border-t border-sidebar-border flex items-center gap-3">
      <Avatar className="h-9 w-9 border-2 border-sidebar-primary">
        {profileImage ? <AvatarImage src={profileImage} alt={user.displayName} /> : null}
        <AvatarFallback className="text-xs bg-sidebar-accent text-sidebar-accent-foreground font-bold">
          {(user.displayName || '?')[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-xs text-sidebar-foreground/70">Logged in as</p>
        <p className="text-sm font-medium text-sidebar-foreground truncate">{user.displayName}</p>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  return (
    <Sidebar>
      <SidebarContent>
        <div className="p-4 border-b border-sidebar-border flex items-center gap-3">
          <img src={sklLogo} alt="SKL" className="h-10 w-10 object-contain rounded" />
          <div>
            <h2 className="text-lg font-bold text-sidebar-primary">SKL</h2>
            <p className="text-xs text-sidebar-foreground/70">Staff Management System</p>
          </div>
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
        {user && <SidebarUserProfile user={user} />}
      </SidebarContent>
    </Sidebar>
  );
}
