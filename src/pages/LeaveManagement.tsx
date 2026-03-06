import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Calendar, CheckCircle, XCircle, RefreshCw, Inbox } from 'lucide-react';

interface LeaveRequest {
  id: string;
  driver_name: string;
  leave_date: string;
  reason: string;
  status: string;
  created_at: string;
}

export default function LeaveManagement() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Failed to fetch leave requests', description: error.message, variant: 'destructive' });
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();

    // Real-time subscription
    const channel = supabase
      .channel('leave_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('leave_requests')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Leave ${status} successfully` });
      fetchRequests();
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-600 hover:bg-green-700 text-white">Approved</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</Badge>;
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
            <Calendar className="h-6 w-6" /> Leave Management
          </h2>
          <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{approved}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{rejected}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
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
              <div className="overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Driver Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((r, i) => (
                      <TableRow key={r.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{r.driver_name}</TableCell>
                        <TableCell>{r.leave_date}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.reason || 'No reason'}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell>
                          {r.status === 'pending' ? (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => updateStatus(r.id, 'approved')}>
                                <CheckCircle className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-red-50" onClick={() => updateStatus(r.id, 'rejected')}>
                                <XCircle className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
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
