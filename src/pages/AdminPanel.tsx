import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getUsers, 
  getStaffList, 
  getAttendance, 
  getJobAllotments, 
  getLeaveRequests,
  deactivateUser,
  type AppUser 
} from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Truck, ClipboardCheck, RefreshCw, Database } from 'lucide-react';

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [staffCount, setStaffCount] = useState(0);
  const [counts, setCounts] = useState({ attendance: 0, jobs: 0, leave: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    // Load users
    const users = getUsers();
    setAppUsers(users);

    // Load counts from local storage
    const staff = getStaffList();
    const attendance = getAttendance();
    const jobs = getJobAllotments();
    const leaves = getLeaveRequests();

    setStaffCount(staff.length);
    setCounts({
      attendance: attendance.length,
      jobs: jobs.length,
      leave: leaves.length
    });
    
    setLoading(false);
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const handleToggleUser = (u: AppUser) => {
    // Note: In storage.ts we only have deactivateUser function.
    // For a simple local toggle, we update the array and save
    const users = getUsers();
    const updated = users.map(x =>
      x.id === u.id ? { ...x, deactivated: !u.deactivated } : x
    );
    localStorage.setItem('skl_users', JSON.stringify(updated));
    
    toast({
      title: u.deactivated ? `${u.displayName} activated` : `${u.displayName} deactivated`,
    });
    setAppUsers(updated);
  };

  if (user?.username !== 'appadmin') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <Shield className="h-16 w-16 text-destructive" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">Only the admin can access this panel.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" /> Admin Panel (Local)
          </h2>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{appUsers.length}</p>
              <p className="text-xs text-muted-foreground uppercase font-bold">App Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Truck className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{staffCount}</p>
              <p className="text-xs text-muted-foreground uppercase font-bold">Staff</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ClipboardCheck className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{counts.attendance}</p>
              <p className="text-xs text-muted-foreground uppercase font-bold">Attendance</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Database className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{counts.jobs}</p>
              <p className="text-xs text-muted-foreground uppercase font-bold">Jobs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{counts.leave}</p>
              <p className="text-xs text-muted-foreground uppercase font-bold">Leave Requests</p>
            </CardContent>
          </Card>
        </div>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle>System Users ({appUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto border rounded-md">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appUsers.map((u, i) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-xs">{i + 1}</TableCell>
                      <TableCell className="font-medium">{u.username}</TableCell>
                      <TableCell>{u.displayName}</TableCell>
                      <TableCell>
                        {u.deactivated
                          ? <Badge variant="destructive">Deactivated</Badge>
                          : <Badge className="bg-green-600 text-white">Active</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {u.username !== 'appadmin' ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">
                              {u.deactivated ? 'Activate' : 'Deactivate'}
                            </span>
                            <Switch
                              checked={!u.deactivated}
                              onCheckedChange={() => handleToggleUser(u)}
                            />
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-primary uppercase">System Admin</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

// Simple Calendar icon for the card
function Calendar({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
