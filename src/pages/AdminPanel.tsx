import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { getUsers, type AppUser } from '@/lib/storage';
import {
  fetchAppUsers, fetchDrivers, fetchCounts, syncUserToSupabase, updateUserStatus,
  subscribeToTable, migrateLocalDataToSupabase, type SupabaseDriver
} from '@/lib/supabaseData';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Truck, ClipboardCheck, RefreshCw, Upload, Database } from 'lucide-react';

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [drivers, setDrivers] = useState<SupabaseDriver[]>([]);
  const [counts, setCounts] = useState({ attendance: 0, jobs: 0, leave: 0 });
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setAppUsers(getUsers());
    const [driversData, countsData] = await Promise.all([
      fetchDrivers(),
      fetchCounts(),
    ]);
    setDrivers(driversData);
    setCounts(countsData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Real-time subscriptions
  useEffect(() => {
    const unsubs = [
      subscribeToTable('drivers', fetchData),
      subscribeToTable('attendance', fetchData),
      subscribeToTable('jobs', fetchData),
      subscribeToTable('leave_requests', fetchData),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const handleToggleUser = async (u: AppUser) => {
    const users = getUsers();
    const updated = users.map(x =>
      x.id === u.id ? { ...x, deactivated: !u.deactivated } : x
    );
    localStorage.setItem('skl_users', JSON.stringify(updated));
    await updateUserStatus(u.id, !u.deactivated);
    toast({
      title: u.deactivated ? `${u.displayName} activated` : `${u.displayName} deactivated`,
    });
    setAppUsers(updated);
  };

  const handleSyncAllUsers = async () => {
    const users = getUsers();
    for (const u of users) {
      await syncUserToSupabase(u);
    }
    toast({ title: `${users.length} users synced to database` });
  };

  const handleMigrateLocalData = async () => {
    setMigrating(true);
    await migrateLocalDataToSupabase(user?.displayName || 'Admin');
    await handleSyncAllUsers();
    toast({ title: 'All local data migrated to database successfully' });
    setMigrating(false);
    fetchData();
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
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleMigrateLocalData} disabled={migrating}>
              <Database className={`h-4 w-4 mr-1 ${migrating ? 'animate-spin' : ''}`} /> Migrate Local Data
            </Button>
            <Button variant="outline" size="sm" onClick={handleSyncAllUsers}>
              <Upload className="h-4 w-4 mr-1" /> Sync Users
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
              <p className="text-2xl font-bold">{counts.attendance}</p>
              <p className="text-xs text-muted-foreground">Attendance</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{counts.jobs}</p>
              <p className="text-xs text-muted-foreground">Jobs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{counts.leave}</p>
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
                    <TableRow key={d.id || d.phone_number}>
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
