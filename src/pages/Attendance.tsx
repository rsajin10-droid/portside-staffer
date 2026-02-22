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
import {
  getStaffList, getShiftAttendance, addAttendance, updateAttendance, deleteAttendance,
  getAttendance, type AttendanceRecord, type Staff
} from '@/lib/storage';
import { Pencil, Trash2, Download, MessageCircle } from 'lucide-react';
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

const getShareStatus = (status: string, withDcdFlag?: boolean, withDcnFlag?: boolean) => {
  if (status === 'absent') {
    if (withDcdFlag) return '(A) DCD';
    if (withDcnFlag) return '(A) DCN';
    return '(A)';
  }
  if (status === 'extra_duty') return '(ED)';
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
  const [staffList] = useState<Staff[]>(getStaffList());
  const [selectedStaff, setSelectedStaff] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterDriver, setFilterDriver] = useState('');
  const [withDCD, setWithDCD] = useState(false);
  const [withDCN, setWithDCN] = useState(false);

  // Repeat last shift state
  const [showRepeat, setShowRepeat] = useState(false);
  const [fromDate, setFromDate] = useState(today);
  const [fromShift, setFromShift] = useState<'day' | 'night'>(shift === 'day' ? 'night' : 'day');
  const [repeatDate, setRepeatDate] = useState(today);
  const [repeatShift, setRepeatShift] = useState<'day' | 'night'>(shift);
  const [repeatRecords, setRepeatRecords] = useState<AttendanceRecord[]>([]);

  const refresh = () => setRecords(getShiftAttendance(date, currentShift));
  useEffect(() => { refresh(); }, [date, currentShift]);

  useEffect(() => {
    if (params.get('repeat') === '1') {
      loadFromShift();
      setShowRepeat(true);
    }
  }, []);

  const loadFromShift = () => {
    const lastAtt = getAttendance().filter(a => a.date === fromDate && a.shift === fromShift);
    setRepeatRecords(lastAtt);
  };

  useEffect(() => {
    if (showRepeat) loadFromShift();
  }, [fromDate, fromShift]);

  const publishRepeat = () => {
    let added = 0;
    repeatRecords.forEach(a => {
      const res = addAttendance({ date: repeatDate, shift: repeatShift, staffId: a.staffId, staffName: a.staffName, mobile: a.mobile, status: a.status, createdBy: user?.displayName || '' });
      if (res) added++;
    });
    toast({ title: `${added} records published to ${repeatDate} ${repeatShift} shift` });
    setShowRepeat(false);
    setDate(repeatDate);
    setCurrentShift(repeatShift);
    refresh();
  };

  const removeRepeatRecord = (id: string) => setRepeatRecords(prev => prev.filter(r => r.id !== id));
  const updateRepeatStatus = (id: string, status: AttendanceRecord['status']) => {
    setRepeatRecords(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const staff = useMemo(() => selectedStaff ? staffList.find(x => x.id === selectedStaff) : null, [selectedStaff, staffList]);
  const filteredStaff = staffList.filter(s => s.name.toLowerCase().includes(staffSearch.toLowerCase()));
  const filteredRecords = records.filter(r => !filterDriver || r.staffName.toLowerCase().includes(filterDriver.toLowerCase()));

  const markAttendance = (status: AttendanceRecord['status']) => {
    if (!staff) return toast({ title: 'Select a driver', variant: 'destructive' });
    
    let finalStatus = status;
    let subStatus: 'dcd' | 'dcn' | undefined = undefined;

    if (status === 'present') {
      if (withDCD) finalStatus = 'dcd';
      else if (withDCN) finalStatus = 'dcn';
    } else if (status === 'absent') {
      finalStatus = 'absent';
      if (withDCD) subStatus = 'dcd';
      else if (withDCN) subStatus = 'dcn';
    }

    if (editId) {
      updateAttendance(editId, { status: finalStatus, subStatus });
      setEditId(null);
      toast({ title: 'Updated' });
    } else {
      const res = addAttendance({ date, shift: currentShift, staffId: staff.id, staffName: staff.name, mobile: staff.mobile, status: finalStatus, subStatus, createdBy: user?.displayName || '' });
      if (!res) return toast({ title: 'Already marked for this shift', variant: 'destructive' });
      toast({ title: `${staff.name} marked as ${statusLabels[finalStatus]}${subStatus ? ' + ' + subStatus.toUpperCase() : ''}` });
    }
    setSelectedStaff(''); setStaffSearch('');
    setWithDCD(false); setWithDCN(false);
    refresh();
  };

  const handleDelete = (id: string) => { deleteAttendance(id); refresh(); toast({ title: 'Deleted' }); };
  const handleEdit = (r: AttendanceRecord) => { setEditId(r.id); setSelectedStaff(r.staffId); setStaffSearch(r.staffName); };

  const buildShareText = () => {
    const sorted = [...filteredRecords];
    const extraDuty = sorted.filter(r => r.status === 'extra_duty');
    const others = sorted.filter(r => r.status !== 'extra_duty');
    const finalList = [...others, ...extraDuty];
    let text = `*SKL - Attendance*\nDate: ${date} | Shift: ${currentShift.toUpperCase()}\nSupervisor: ${user?.displayName}\n\n`;
    finalList.forEach((r, i) => {
      const st = getShareStatus(r.status, r.subStatus === 'dcd', r.subStatus === 'dcn');
      text += `${i + 1}. ${r.staffName} - ${r.mobile}${st ? ' - ' + st : ''}\n`;
    });
    return text;
  };

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
        const st = getShareStatus(r.status, r.subStatus === 'dcd', r.subStatus === 'dcn');
        return [i + 1, r.staffName, r.mobile, st || 'Present'];
      }),
    });
    doc.save(`attendance_${date}_${currentShift}.pdf`);
  };

  const shareWhatsApp = () => {
    const text = buildShareText();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <Layout>
      <div className="space-y-4 max-w-4xl mx-auto px-1">
        <h2 className="text-xl md:text-2xl font-bold">Attendance</h2>

        {!showRepeat && (
          <Button variant="outline" size="sm" onClick={() => { loadFromShift(); setShowRepeat(true); }}>
            Repeat Shift Attendance
          </Button>
        )}

        {showRepeat && (
          <Card className="border-accent">
            <CardHeader className="pb-3"><CardTitle className="text-base md:text-lg">Repeat Attendance</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">From Date</Label>
                  <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">From Shift</Label>
                  <Select value={fromShift} onValueChange={v => setFromShift(v as 'day' | 'night')}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-primary">Publish to Date</Label>
                  <Input type="date" value={repeatDate} onChange={e => setRepeatDate(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-primary">Publish to Shift</Label>
                  <Select value={repeatShift} onValueChange={v => setRepeatShift(v as 'day' | 'night')}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="overflow-auto max-h-60 -mx-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Driver</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repeatRecords.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs py-1.5">{r.staffName}</TableCell>
                        <TableCell className="py-1.5">
                          <Select value={r.status} onValueChange={v => updateRepeatStatus(r.id, v as AttendanceRecord['status'])}>
                            <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Present</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="extra_duty">Extra Duty</SelectItem>
                              <SelectItem value="dcd">DCD</SelectItem>
                              <SelectItem value="dcn">DCN</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeRepeatRecord(r.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {repeatRecords.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground text-xs">No records from selected shift</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={publishRepeat} disabled={repeatRecords.length === 0}>Publish</Button>
                <Button size="sm" variant="outline" onClick={() => setShowRepeat(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base md:text-lg">Mark Attendance</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Shift</Label>
                <Select value={currentShift} onValueChange={v => setCurrentShift(v as 'day' | 'night')}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label className="text-xs">Driver Name</Label>
                <Input
                  placeholder="Search driver..."
                  value={staffSearch}
                  onChange={e => { setStaffSearch(e.target.value); setSelectedStaff(''); }}
                  className="h-9 text-sm"
                />
                {staffSearch && !selectedStaff && (
                  <div className="border rounded-md max-h-40 overflow-auto bg-popover z-50 relative shadow-lg">
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
            {staff && <p className="text-xs text-muted-foreground">Mobile: {staff.mobile}</p>}
            
            {/* DCD/DCN checkboxes */}
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox checked={withDCD} onCheckedChange={(v) => { setWithDCD(!!v); if (v) setWithDCN(false); }} />
                <span>With DCD</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox checked={withDCN} onCheckedChange={(v) => { setWithDCN(!!v); if (v) setWithDCD(false); }} />
                <span>With DCN</span>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => markAttendance('present')} className="bg-success hover:bg-success/90 text-success-foreground">Present{withDCD ? ' + DCD' : withDCN ? ' + DCN' : ''}</Button>
              <Button size="sm" onClick={() => markAttendance('absent')} variant="destructive">Absent{withDCD ? ' + DCD' : withDCN ? ' + DCN' : ''}</Button>
              <Button size="sm" onClick={() => markAttendance('extra_duty')} className="bg-warning hover:bg-warning/90 text-warning-foreground">Extra Duty</Button>
            </div>
            <p className="text-[10px] text-muted-foreground">DCD = Duty Change Day | DCN = Duty Change Night</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 pb-3">
            <CardTitle className="text-base">List ({filteredRecords.length})</CardTitle>
            <div className="flex gap-1.5 flex-wrap">
              <Input placeholder="Filter..." value={filterDriver} onChange={e => setFilterDriver(e.target.value)} className="w-32 h-8 text-xs" />
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={shareAsPdf}><Download className="h-3.5 w-3.5 mr-1" />PDF</Button>
              <Button size="sm" variant="outline" className="h-8 text-xs text-success" onClick={shareWhatsApp}><MessageCircle className="h-3.5 w-3.5 mr-1" />WA</Button>
            </div>
          </CardHeader>
          <CardContent className="px-2 md:px-6">
            <div className="overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-8">#</TableHead>
                    <TableHead className="text-xs">Driver</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Mobile</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs py-1.5">{i + 1}</TableCell>
                      <TableCell className="text-xs font-medium py-1.5">{r.staffName}</TableCell>
                      <TableCell className="text-xs py-1.5 hidden sm:table-cell">{r.mobile}</TableCell>
                      <TableCell className="py-1.5"><Badge className={`${statusColors[r.status]} text-[10px] px-1.5`}>{statusLabels[r.status]}{r.status === 'absent' && r.subStatus ? ` + ${r.subStatus.toUpperCase()}` : ''}</Badge></TableCell>
                      <TableCell className="flex gap-0.5 py-1.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRecords.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-xs">No records</TableCell></TableRow>
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