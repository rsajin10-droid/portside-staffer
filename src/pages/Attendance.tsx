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
  getAttendance, type AttendanceRecord, type Staff, VEHICLES
} from '@/lib/storage';
import { Pencil, Trash2, Download, MessageCircle, Truck } from 'lucide-react';
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
  const [staffList] = useState<Staff[]>(getStaffList());
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterDriver, setFilterDriver] = useState('');
  const [withDCD, setWithDCD] = useState(false);
  const [withDCN, setWithDCN] = useState(false);

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
      const res = addAttendance({ 
        date: repeatDate, shift: repeatShift, staffId: a.staffId, staffName: a.staffName, 
        mobile: a.mobile, status: a.status, vehicleNumber: a.vehicleNumber, 
        createdBy: user?.displayName || '' 
      });
      if (res) added++;
    });
    toast({ title: `${added} records published` });
    setShowRepeat(false);
    setDate(repeatDate);
    setCurrentShift(repeatShift);
    refresh();
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
      updateAttendance(editId, { status: finalStatus, subStatus, vehicleNumber: selectedVehicle });
      setEditId(null);
      toast({ title: 'Updated' });
    } else {
      const res = addAttendance({ 
        date, shift: currentShift, staffId: staff.id, staffName: staff.name, 
        mobile: staff.mobile, status: finalStatus, subStatus, 
        vehicleNumber: selectedVehicle, 
        createdBy: user?.displayName || '' 
      });
      if (!res) return toast({ title: 'Already marked', variant: 'destructive' });
      toast({ title: 'Saved' });
    }
    
    setSelectedStaff(''); setStaffSearch(''); setSelectedVehicle('');
    setWithDCD(false); setWithDCN(false);
    refresh();
  };

  const handleDelete = (id: string) => { deleteAttendance(id); refresh(); toast({ title: 'Deleted' }); };
  const handleEdit = (r: AttendanceRecord) => { 
    setEditId(r.id); setSelectedStaff(r.staffId); 
    setStaffSearch(r.staffName); setSelectedVehicle(r.vehicleNumber || '');
  };

  // വാട്ട്‌സ്ആപ്പ് റിപ്പോർട്ടിൽ വണ്ടി നമ്പർ ഉള്ളവർ മാത്രം
  const buildShareText = () => {
    const withVehicle = filteredRecords.filter(r => r.vehicleNumber && r.vehicleNumber.trim() !== '');
    
    let text = `*SKL Attendance Report*\nDate: ${date} | Shift: ${currentShift.toUpperCase()}\n\n`;
    
    if (withVehicle.length === 0) {
      text += "_No vehicles assigned._";
    } else {
      withVehicle.forEach((r, i) => {
        const st = getShareStatus(r.status, r.subStatus === 'dcd', r.subStatus === 'dcn');
        text += `${i + 1}. ${r.staffName} - [${r.vehicleNumber}]${st ? ' - ' + st : ''}\n`;
      });
    }
    return text;
  };

  const shareAsPdf = () => {
    const doc = new jsPDF();
    doc.text('Attendance List', 14, 15);
    autoTable(doc, {
      startY: 25,
      head: [['#', 'Driver', 'Vehicle', 'Status']],
      body: filteredRecords.map((r, i) => [i + 1, r.staffName, r.vehicleNumber || '---', statusLabels[r.status]]),
    });
    doc.save(`attendance_${date}.pdf`);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildShareText())}`, '_blank');
  };

  return (
    <Layout>
      <div className="space-y-4 max-w-4xl mx-auto px-1 pb-10">
        <h2 className="text-xl font-bold tracking-tight">Attendance</h2>

        <Card className="border-dashed bg-slate-50/50">
            <CardContent className="p-3">
                {!showRepeat ? (
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowRepeat(true)}>Repeat Previous Shift Data</Button>
                ) : (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-8 text-xs" />
                            <Select value={fromShift} onValueChange={v => setFromShift(v as any)}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="day">Day</SelectItem><SelectItem value="night">Night</SelectItem></SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" className="flex-1 text-xs" onClick={publishRepeat}>Publish Now</Button>
                            <Button size="sm" variant="ghost" className="flex-1 text-xs" onClick={() => setShowRepeat(false)}>Cancel</Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2 bg-slate-50/80"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Marking Form</CardTitle></CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-[10px] font-bold">DATE</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-[10px] font-bold">SHIFT</Label>
                    <Select value={currentShift} onValueChange={v => setCurrentShift(v as any)}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="day">Day</SelectItem><SelectItem value="night">Night</SelectItem></SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1 relative">
                    <Label className="text-[10px] font-bold">DRIVER NAME</Label>
                    <Input placeholder="Search driver..." value={staffSearch} onChange={e => { setStaffSearch(e.target.value); setSelectedStaff(''); }} className="h-9" />
                    {staffSearch && !selectedStaff && (
                        <div className="absolute z-50 w-full bg-white border shadow-xl rounded-md mt-1 max-h-40 overflow-auto">
                            {filteredStaff.map(s => (<div key={s.id} className="p-2.5 hover:bg-slate-50 cursor-pointer text-sm border-b last:border-0" onClick={() => { setSelectedStaff(s.id); setStaffSearch(s.name); }}>{s.name}</div>))}
                        </div>
                    )}
                </div>
                <div className="space-y-1">
                    <Label className="text-[10px] font-bold flex items-center gap-1 text-blue-600 uppercase tracking-tighter"><Truck className="w-3 h-3" /> Vehicle (Optional)</Label>
                    <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                        <SelectTrigger className="h-9 border-blue-100 bg-blue-50/40 font-semibold"><SelectValue placeholder="T001 - T100" /></SelectTrigger>
                        <SelectContent className="max-h-60">{VEHICLES.map(v => (<SelectItem key={v} value={v}>{v}</SelectItem>))}</SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex gap-6 py-1">
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer"><Checkbox checked={withDCD} onCheckedChange={(v) => { setWithDCD(!!v); if (v) setWithDCN(false); }} />DCD</label>
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer"><Checkbox checked={withDCN} onCheckedChange={(v) => { setWithDCN(!!v); if (v) setWithDCD(false); }} />DCN</label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => markAttendance('present')} className="bg-emerald-600 hover:bg-emerald-700 h-11 text-xs font-bold uppercase tracking-wide">Present</Button>
              <Button onClick={() => markAttendance('absent')} variant="destructive" className="h-11 text-xs font-bold uppercase tracking-wide">Absent</Button>
              <Button onClick={() => markAttendance('extra_duty')} className="bg-amber-500 hover:bg-amber-600 h-11 text-xs font-bold uppercase tracking-wide text-white">OT (Duty)</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader className="p-3 bg-slate-900 text-white flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-widest">Shift Records ({filteredRecords.length})</CardTitle>
            <Input placeholder="Quick Filter..." value={filterDriver} onChange={e => setFilterDriver(e.target.value)} className="w-28 h-7 text-[10px] bg-slate-800 border-none text-white focus:ring-0" />
          </CardHeader>
          <div className="overflow-auto max-h-[450px]">
            <Table>
              <TableHeader className="bg-slate-50"><TableRow><TableHead className="w-8 text-[9px] font-black uppercase">#</TableHead><TableHead className="text-[9px] font-black uppercase">Driver</TableHead><TableHead className="text-[9px] font-black uppercase">Vehicle</TableHead><TableHead className="text-[9px] font-black uppercase">Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredRecords.map((r, i) => (
                  <TableRow key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="py-2.5 text-[10px] text-slate-400 font-medium">{i + 1}</TableCell>
                    <TableCell className="py-2.5 text-xs font-bold text-slate-700">{r.staffName}</TableCell>
                    <TableCell className="py-2.5 text-xs font-black text-blue-600 tracking-tight">{r.vehicleNumber || '---'}</TableCell>
                    <TableCell className="py-2.5"><Badge className={`${statusColors[r.status]} text-[9px] px-1.5 h-5 font-bold uppercase border-0 shadow-none`}>{statusLabels[r.status]} {r.subStatus ? `(${r.subStatus})` : ''}</Badge></TableCell>
                    <TableCell className="py-2.5 text-right"><div className="flex gap-1 justify-end"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5 text-slate-400" /></Button><Button size="icon" variant="ghost" className="h-7 w-7 text-rose-100 hover:text-rose-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="p-3 border-t grid grid-cols-2 gap-3 bg-slate-50/50">
              <Button size="sm" variant="outline" onClick={shareAsPdf} className="h-10 text-xs font-bold border-slate-200"><Download className="w-3.5 h-3.5 mr-2" /> Download PDF</Button>
              <Button size="sm" onClick={shareWhatsApp} className="h-10 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"><MessageCircle className="w-3.5 h-3.5 mr-2" /> WhatsApp Report</Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
