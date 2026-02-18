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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  getStaffList, getShiftAttendance, addAttendance, updateAttendance, deleteAttendance,
  getAttendance, type AttendanceRecord, type Staff
} from '@/lib/storage';
import { Pencil, Trash2, Share2, Download } from 'lucide-react';
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
  present: 'Present', absent: 'Absent', extra_duty: 'Extra Duty', dcd: 'DCD', dcn: 'DCN',
};

export default function Attendance() {
  const { user, shift } = useAuth();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [currentShift, setCurrentShift] = useState<'day' | 'night'>(shift);
  const [staffList] = useState<Staff[]>(getStaffList());
  const [selectedStaff, setSelectedStaff] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterDriver, setFilterDriver] = useState('');

  const refresh = () => setRecords(getShiftAttendance(date, currentShift));
  useEffect(() => { refresh(); }, [date, currentShift]);

  // Repeat last shift
  useEffect(() => {
    if (params.get('repeat') === '1') {
      const lastShift = currentShift === 'day' ? 'night' : 'day';
      const lastDate = currentShift === 'day' ? today : new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const lastAtt = getAttendance().filter(a => a.date === (currentShift === 'day' ? lastDate : today) && a.shift === lastShift);
      let added = 0;
      lastAtt.forEach(a => {
        const res = addAttendance({ date, shift: currentShift, staffId: a.staffId, staffName: a.staffName, mobile: a.mobile, status: a.status, createdBy: user?.displayName || '' });
        if (res) added++;
      });
      if (added) toast({ title: `${added} records copied from last shift` });
      refresh();
    }
  }, []);

  const staff = useMemo(() => {
    const s = selectedStaff ? staffList.find(x => x.id === selectedStaff) : null;
    return s;
  }, [selectedStaff, staffList]);

  const filteredStaff = staffList.filter(s => s.name.toLowerCase().includes(staffSearch.toLowerCase()));
  const filteredRecords = records.filter(r => !filterDriver || r.staffName.toLowerCase().includes(filterDriver.toLowerCase()));

  const markAttendance = (status: AttendanceRecord['status']) => {
    if (!staff) return toast({ title: 'Select a driver', variant: 'destructive' });
    if (editId) {
      updateAttendance(editId, { status });
      setEditId(null);
      toast({ title: 'Updated' });
    } else {
      const res = addAttendance({ date, shift: currentShift, staffId: staff.id, staffName: staff.name, mobile: staff.mobile, status, createdBy: user?.displayName || '' });
      if (!res) return toast({ title: 'Already marked for this shift', variant: 'destructive' });
      toast({ title: `${staff.name} marked as ${statusLabels[status]}` });
    }
    setSelectedStaff(''); setStaffSearch('');
    refresh();
  };

  const handleDelete = (id: string) => { deleteAttendance(id); refresh(); toast({ title: 'Deleted' }); };
  const handleEdit = (r: AttendanceRecord) => { setEditId(r.id); setSelectedStaff(r.staffId); setStaffSearch(r.staffName); };

  const shareAsPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('SKL - Attendance List', 14, 15);
    doc.setFontSize(10);
    doc.text(`Date: ${date} | Shift: ${currentShift.toUpperCase()} | Supervisor: ${user?.displayName}`, 14, 24);

    const sorted = [...filteredRecords];
    const extraDuty = sorted.filter(r => r.status === 'extra_duty');
    const others = sorted.filter(r => r.status !== 'extra_duty');
    const finalList = [...others, ...extraDuty];

    autoTable(doc, {
      startY: 30,
      head: [['#', 'Driver Name', 'Mobile', 'Status']],
      body: finalList.map((r, i) => {
        let st = '';
        if (r.status === 'absent') st = `(A)${r.status === 'absent' && (r as any).dutyChange ? ` ${(r as any).dutyChange}` : ''}`;
        else if (r.status === 'dcd') st = 'DCD';
        else if (r.status === 'dcn') st = 'DCN';
        else if (r.status === 'extra_duty') st = '(ED)';
        else st = 'P';
        return [i + 1, r.staffName, r.mobile, st];
      }),
    });
    doc.save(`attendance_${date}_${currentShift}.pdf`);
  };

  const shareAsText = () => {
    const sorted = [...filteredRecords];
    const extraDuty = sorted.filter(r => r.status === 'extra_duty');
    const others = sorted.filter(r => r.status !== 'extra_duty');
    const finalList = [...others, ...extraDuty];
    let text = `SKL - Attendance\nDate: ${date} | Shift: ${currentShift.toUpperCase()}\nSupervisor: ${user?.displayName}\n\n`;
    finalList.forEach((r, i) => {
      let st = r.status === 'absent' ? '(A)' : r.status === 'extra_duty' ? '(ED)' : r.status === 'dcd' ? 'DCD' : r.status === 'dcn' ? 'DCN' : 'P';
      text += `${i + 1}. ${r.staffName} - ${r.mobile} - ${st}\n`;
    });
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold">Attendance</h2>

        <Card>
          <CardHeader><CardTitle>Mark Attendance</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Shift</Label>
                <Select value={currentShift} onValueChange={v => setCurrentShift(v as 'day' | 'night')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Driver Name</Label>
                <Input
                  placeholder="Type to search..."
                  value={staffSearch}
                  onChange={e => { setStaffSearch(e.target.value); setSelectedStaff(''); }}
                />
                {staffSearch && !selectedStaff && (
                  <div className="border rounded-md max-h-40 overflow-auto bg-popover">
                    {filteredStaff.map(s => (
                      <div key={s.id} className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                        onClick={() => { setSelectedStaff(s.id); setStaffSearch(s.name); }}>
                        {s.name} - {s.mobile}
                      </div>
                    ))}
                    {filteredStaff.length === 0 && <div className="px-3 py-2 text-muted-foreground text-sm">No staff found</div>}
                  </div>
                )}
              </div>
            </div>
            {staff && <p className="text-sm text-muted-foreground">Mobile: {staff.mobile}</p>}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => markAttendance('present')} className="bg-success hover:bg-success/90 text-success-foreground">Present</Button>
              <Button onClick={() => markAttendance('absent')} variant="destructive">Absent</Button>
              <Button onClick={() => markAttendance('extra_duty')} className="bg-warning hover:bg-warning/90 text-warning-foreground">Extra Duty</Button>
              <Button onClick={() => markAttendance('dcd')} className="bg-info hover:bg-info/90 text-info-foreground">DCD</Button>
              <Button onClick={() => markAttendance('dcn')} variant="secondary">DCN</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <CardTitle>Attendance List ({filteredRecords.length})</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Input placeholder="Filter by driver..." value={filterDriver} onChange={e => setFilterDriver(e.target.value)} className="w-48" />
              <Button size="sm" variant="outline" onClick={shareAsPdf}><Download className="h-4 w-4 mr-1" />PDF</Button>
              <Button size="sm" variant="outline" onClick={shareAsText}><Share2 className="h-4 w-4 mr-1" />Copy Text</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Driver Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{r.staffName}</TableCell>
                      <TableCell>{r.mobile}</TableCell>
                      <TableCell><Badge className={statusColors[r.status]}>{statusLabels[r.status]}</Badge></TableCell>
                      <TableCell className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRecords.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No records</TableCell></TableRow>
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
