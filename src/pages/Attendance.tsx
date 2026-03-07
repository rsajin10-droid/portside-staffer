import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { type Staff } from '@/lib/storage';
import { Pencil, Trash2, Minimize2, Maximize2 } from 'lucide-react';
import {
  fetchAttendance, insertAttendance, updateAttendanceRecord, deleteAttendanceRecord,
  fetchDrivers, subscribeToTable, type SupabaseAttendance, supabase
} from '@/lib/supabaseData';

const statusColors: Record<string, string> = {
  present: 'bg-success text-success-foreground',
  absent: 'bg-destructive text-destructive-foreground',
  extra_duty: 'bg-warning text-warning-foreground',
  dcd: 'bg-info text-info-foreground',
  dcn: 'bg-secondary text-secondary-foreground',
};

const statusLabels: Record<string, string> = {
  present: 'Present', absent: 'Absent', extra_duty: 'OT', dcd: 'DCD', dcn: 'DCN',
};

export default function Attendance() {
  const { user, shift } = useAuth();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [currentShift, setCurrentShift] = useState<'day' | 'night'>(shift);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [records, setRecords] = useState<SupabaseAttendance[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterDriver, setFilterDriver] = useState('');
  const [withDCD, setWithDCD] = useState(false);
  const [withDCN, setWithDCN] = useState(false);
  const [fullPage, setFullPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('app_users')
        .select('role')
        .eq('id', user.id)
        .single();
      setUserRole(data?.role || 'supervisor');
    };
    checkUserRole();
  }, [user]);

  useEffect(() => {
    fetchDrivers().then(drivers => {
      setStaffList(drivers.map(d => ({
        id: d.phone_number || d.name,
        name: d.name,
        mobile: d.phone_number,
        createdAt: d.created_at || '',
      })));
    });
  }, []);

  const refresh = async () => {
    if (!userRole) return;
    setLoading(true);
    const isAdminUser = userRole === 'admin' || user?.username === 'appadmin';
    const data = await fetchAttendance(date, currentShift, user?.username || '', isAdminUser);
    setRecords(data);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [date, currentShift, userRole]);

  useEffect(() => {
    const unsub = subscribeToTable('attendance', refresh);
    return unsub;
  }, [date, currentShift, user?.username, userRole]);

  const selectedStaffItem = useMemo(() => {
    if (!selectedStaff) return null;
    return staffList.find(x => x.id === selectedStaff) || staffList.find(x => x.name === staffSearch);
  }, [selectedStaff, staffSearch, staffList]);

  const markAttendance = async (status: string) => {
    const driverToMark = selectedStaffItem;
    if (!driverToMark) return toast({ title: 'Select a driver', variant: 'destructive' });

    let finalStatus = status;
    let subStatus: string | null = null;

    if (status === 'present') {
      if (withDCD) finalStatus = 'dcd';
      else if (withDCN) finalStatus = 'dcn';
    } else if (status === 'absent') {
      finalStatus = 'absent';
      if (withDCD) subStatus = 'dcd';
      else if (withDCN) subStatus = 'dcn';
    }

    try {
      if (editId) {
        await updateAttendanceRecord(editId, { status: finalStatus, sub_status: subStatus });
        setEditId(null);
        toast({ title: 'Updated successfully' });
      } else {
        await insertAttendance({
          date, 
          shift: currentShift, 
          staff_id: driverToMark.id,
          staff_name: driverToMark.name, 
          mobile: driverToMark.mobile,
          status: finalStatus, 
          sub_status: subStatus, 
          created_by: user?.displayName || user?.username || 'Unknown',
        });
        toast({ title: `${driverToMark.name} marked successfully` });
      }
      setSelectedStaff(''); 
      setStaffSearch('');
      setWithDCD(false); 
      setWithDCN(false);
      refresh();
    } catch (error: any) {
      toast({ title: 'Operation failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (r: SupabaseAttendance) => {
    setEditId(r.id);
    setSelectedStaff(r.staff_id || '');
    setStaffSearch(r.staff_name);
    setFullPage(false);
  };

  const handleDelete = async (id: string) => {
    const success = await deleteAttendanceRecord(id);
    if (success) {
      toast({ title: 'Record deleted' });
      refresh();
    }
  };

  const filteredRecords = records.filter(r => !filterDriver || r.staff_name.toLowerCase().includes(filterDriver.toLowerCase()));

  return (
    <Layout>
      <div className="space-y-4 max-w-6xl mx-auto px-2 pb-10">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Attendance {userRole === 'admin' ? '(Admin Mode)' : ''}</h2>
          <Button variant="ghost" size="sm" onClick={() => setFullPage(!fullPage)}>
            {fullPage ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>

        {!fullPage && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Mark Driver Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40 h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Shift</Label>
                    <Select value={currentShift} onValueChange={(v: any) => setCurrentShift(v)}>
                      <SelectTrigger className="w-32 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="night">Night</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[200px] space-y-1">
                    <Label className="text-xs">Driver Name</Label>
                    <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select Driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffList.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t mt-2">
                  <Button onClick={() => markAttendance('present')} className="bg-success hover:bg-success/90 h-9 text-xs">Present</Button>
                  <Button onClick={() => markAttendance('absent')} variant="destructive" className="h-9 text-xs">Absent</Button>
                  <Button onClick={() => markAttendance('extra_duty')} className="bg-warning text-warning-foreground hover:bg-warning/90 h-9 text-xs">OT</Button>
                  <div className="flex items-center space-x-3 ml-auto px-2 bg-muted rounded-md h-9">
                    <div className="flex items-center space-x-1">
                      <Checkbox id="dcd" checked={withDCD} onCheckedChange={(v: any) => { setWithDCD(v); if(v) setWithDCN(false); }} />
                      <Label htmlFor="dcd" className="text-xs font-bold">DCD</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Checkbox id="dcn" checked={withDCN} onCheckedChange={(v: any) => { setWithDCN(v); if(v) setWithDCD(false); }} />
                      <Label htmlFor="dcn" className="text-xs font-bold">DCN</Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Attendance List ({filteredRecords.length})
            </CardTitle>
            <Input 
              placeholder="Search driver..." 
              value={filterDriver} 
              onChange={e => setFilterDriver(e.target.value)} 
              className="w-48 h-8 text-xs" 
            />
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-12 text-xs">#</TableHead>
                    <TableHead className="text-xs">Driver Details</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Created By</TableHead>
                    <TableHead className="text-right text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-xs">Loading...</TableCell></TableRow>
                  ) : filteredRecords.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground">No records found for this shift.</TableCell></TableRow>
                  ) : (
                    filteredRecords.map((r, i) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs py-2">{i + 1}</TableCell>
                        <TableCell className="py-2">
                          <div className="font-bold text-sm">{r.staff_name}</div>
                          <div className="text-[10px] text-muted-foreground">{r.mobile}</div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge className={`${statusColors[r.status]} text-[10px] px-2 py-0`}>
                            {statusLabels[r.status]}
                            {r.status === 'absent' && r.sub_status ? ` (${r.sub_status.toUpperCase()})` : ''}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                            {r.created_by || 'Unknown'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-2">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(r)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
                  }
