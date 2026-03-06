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
import { Pencil, Trash2, Download, MessageCircle, Minimize2, Maximize2 } from 'lucide-react';
import {
  fetchAttendance, insertAttendance, updateAttendanceRecord, deleteAttendanceRecord,
  fetchDrivers, subscribeToTable, type SupabaseAttendance, supabase
} from '@/lib/supabaseData';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const getShareStatus = (status: string, withDcdFlag?: boolean, withDcnFlag?: boolean) => {
  if (status === 'absent') {
    if (withDcdFlag) return '(A) DCD';
    if (withDcnFlag) return '(A) DCN';
    return '(A)';
  }
  if (status === 'extra_duty') return '(OT)';
  if (status === 'dcd') return 'DCD';
  if (status === 'dcn') return 'DCN';
  return '';
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

  const markAttendance = async (status: string) => {
    if (!selectedStaffItem) return toast({ title: 'Select a driver', variant: 'destructive' });

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

    if (editId) {
      await updateAttendanceRecord(editId, { status: finalStatus, sub_status: subStatus });
      setEditId(null);
      toast({ title: 'Updated' });
    } else {
      const res = await insertAttendance({
        date, 
        shift: currentShift, 
        staff_id: selectedStaffItem.id,
        staff_name: selectedStaffItem.name, 
        mobile: selectedStaffItem.mobile,
        status: finalStatus, 
        sub_status: subStatus, 
        created_by: user?.displayName || user?.username || 'Unknown',
      });
      if (!res) return toast({ title: 'Already exists', variant: 'destructive' });
      toast({ title: `${selectedStaffItem.name} marked` });
    }
    setSelectedStaff(''); 
    setStaffSearch('');
    setWithDCD(false); 
    setWithDCN(false);
    refresh();
  };

  const selectedStaffItem = useMemo(() => selectedStaff ? staffList.find(x => x.id === selectedStaff) : null, [selectedStaff, staffList]);
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Daily Attendance Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-36 h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Shift</Label>
                  <Select value={currentShift} onValueChange={(v: any) => setCurrentShift(v)}>
                    <SelectTrigger className="w-28 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px] space-y-1">
                  <Label className="text-xs">Search Driver</Label>
                  <Input 
                    placeholder="Search name..." 
                    value={staffSearch} 
                    onChange={e => setStaffSearch(e.target.value)} 
                    className="h-9 text-sm" 
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={() => markAttendance('present')} className="bg-success hover:bg-success/90 h-9 px-4 text-xs">Mark Present</Button>
                <Button onClick={() => markAttendance('absent')} variant="destructive" className="h-9 px-4 text-xs">Mark Absent</Button>
                <Button onClick={() => markAttendance('extra_duty')} className="bg-warning text-warning-foreground hover:bg-warning/90 h-9 px-4 text-xs">OT Duty</Button>
                <div className="flex items-center space-x-2 ml-2">
                  <Checkbox id="dcd" checked={withDCD} onCheckedChange={(v: any) => { setWithDCD(v); if(v) setWithDCN(false); }} />
                  <Label htmlFor="dcd" className="text-xs cursor-pointer">DCD</Label>
                  <Checkbox id="dcn" checked={withDCN} onCheckedChange={(v: any) => { setWithDCN(v); if(v) setWithDCD(false); }} />
                  <Label htmlFor="dcn" className="text-xs cursor-pointer">DCN</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Record List ({filteredRecords.length})</CardTitle>
            <Input 
              placeholder="Filter list..." 
              value={filterDriver} 
              onChange={e => setFilterDriver(e.target.value)} 
              className="w-40 h-8 text-xs" 
            />
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-10 text-xs">#</TableHead>
                    <TableHead className="text-xs">Driver Name</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Created By</TableHead>
                    <TableHead className="text-right text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground">Loading records...</TableCell></TableRow>
                  ) : filteredRecords.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground">No records found</TableCell></TableRow>
                  ) : (
                    filteredRecords.map((r, i) => (
                      <TableRow key={r.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs py-2">{i + 1}</TableCell>
                        <TableCell className="py-2">
                          <div className="font-medium text-sm">{r.staff_name}</div>
                          <div className="text-[10px] text-muted-foreground">{r.mobile}</div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge className={`${statusColors[r.status]} text-[10px] px-2 py-0 h-5`}>
                            {statusLabels[r.status]}
                            {r.status === 'absent' && r.sub_status ? ` (${r.sub_status.toUpperCase()})` : ''}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 italic">
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
