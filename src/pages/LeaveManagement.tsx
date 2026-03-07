import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calendar, CheckCircle, XCircle, RefreshCw, Inbox } from 'lucide-react';
import { getLeaveRequests, updateLeaveStatus, type LeaveRequest } from '@/lib/storage';

export default function LeaveManagement() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const refresh = () => {
    setLoading(true);
    // Fetch data from local storage instead of Supabase
    const data = getLeaveRequests();
    setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleUpdateStatus = (id: string, status: 'approved' | 'rejected') => {
    const success = updateLeaveStatus(id, status);
    if (!success) {
      toast({ title: 'Update failed', variant: 'destructive' });
    } else {
      toast({ title: `Leave ${status} successfully` });
      refresh();
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-600 hover:bg-green-700 text-white">Approved</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const rejected = requests.filter(r => r.status === 'rejected').length;

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" /> Leave Management (Local)
          </h2>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{pending}</p>
              <p className="text-xs text-muted-foreground uppercase font-bold">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{approved}</p>
              <p className="text-xs text-muted-foreground uppercase font-bold">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{rejected}</p>
              <p className="text-xs text-muted-foreground uppercase font-bold">Rejected</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Leave Requests</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                <Inbox className="h-10 w-10" />
                <p>No leave requests yet</p>
              </div>
            ) : (
              <div className="overflow-auto border rounded-md max-h-[60vh]">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Driver Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((r, i) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{i + 1}</TableCell>
                        <TableCell className="font-bold text-sm uppercase">{r.driverName}</TableCell>
                        <TableCell className="text-sm">{r.leaveDate}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{r.reason || 'No reason'}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell className="text-right">
                          {r.status === 'pending' ? (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 h-8" onClick={() => handleUpdateStatus(r.id, 'approved')}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-red-50 h-8" onClick={() => handleUpdateStatus(r.id, 'rejected')}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs uppercase font-medium">Closed</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
