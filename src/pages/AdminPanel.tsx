import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { getUsers, deactivateUser, type AppUser } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { syncAllUsersToSupabase, updateUserStatusInSupabase } from '@/lib/supabaseSync';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Truck, ClipboardCheck, RefreshCw, Upload } from 'lucide-react';

interface DriverRecord {
  id: string;
  name: string;
  phone_number: string;
  created_at: string;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [jobsCount, setJobsCount] = useState(0);
  const [leaveCount, setLeaveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    setAppUsers(getUsers());

    const [driversRes, attRes, jobsRes, leaveRes] = await Promise.all([
      supabase.from('drivers').select('*').order('name'),
      supabase.from('attendance').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }),
      supabase.from('leave_requests').select('id', { count: 'exact', head: true }),
    ]);

    setDrivers(driversRes.data || []);
    setAttendanceCount(attRes.count || 0);
    setJobsCount(jobsRes.count || 0);
    setLeaveCount(leaveRes.count || 0);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggleUser = async (u: AppUser) => {
    const users = getUsers();
    const updated = users.map(x =>
      x.id === u.id ? { ...x, deactivated: !u.deactivated } : x
    );
    localStorage.setItem('skl_users', JSON.stringify(updated));
    await updateUserStatusInSupabase(u.id, !u.deactivated);
    toast({
      title: u.deactivated ? `${u.displayName} activated` : `${u.displayName} deactivated`,
    });
    setAppUsers(updated);
  };

  const handleSyncAllUsers = async () => {
    const users = getUsers();
    await syncAllUsersToSupabase(users);
    toast({ title: `${users.length} users synced to database` });
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
            <Shield className="h-6 w-6" /> Admin Panel
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSyncAllUsers}>
              <Upload className="h-4 w-4 mr-1" /> Sync Users
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{appUsers.length}</p>
              <p className="text-xs text-muted-foreground">App Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Truck className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{drivers.length}</p>
              <p className="text-xs text-muted-foreground">Drivers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ClipboardCheck className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{attendanceCount}</p>
              <p className="text-xs text-muted-foreground">Attendance Records</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{leaveCount}</p>
              <p className="text-xs text-muted-foreground">Leave Requests</p>
            </CardContent>
          </Card>
        </div>

        {/* App Users with activate/deactivate */}
        <Card>
          <CardHeader><CardTitle>Supervisor App Users ({appUsers.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appUsers.map((u, i) => (
                  <TableRow key={u.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell>{u.displayName}</TableCell>
                    <TableCell>
                      {u.deactivated
                        ? <Badge variant="destructive">Deactivated</Badge>
                        : <Badge className="bg-green-600 text-white">Active</Badge>}
                    </TableCell>
                    <TableCell>
                      {u.username !== 'appadmin' ? (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={!u.deactivated}
                            onCheckedChange={() => handleToggleUser(u)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {u.deactivated ? 'Activate' : 'Deactivate'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Admin</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Drivers from Supabase */}
        <Card>
          <CardHeader><CardTitle>Drivers in Database ({drivers.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((d, i) => (
                    <TableRow key={d.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{d.phone_number}</TableCell>
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
