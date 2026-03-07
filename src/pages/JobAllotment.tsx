import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { VEHICLES, type Staff } from '@/lib/storage';
import { Plus, Pencil, Trash2, Download, MessageCircle, Maximize2, Minimize2 } from 'lucide-react';
import {
  fetchJobs, fetchAttendance, insertJob, updateJobRecord, deleteJobRecord,
  getLastDriverForVehicle, checkJobDuplicate, fetchDrivers, isAdmin, subscribeToTable,
  type SupabaseJob
} from '@/lib/supabaseData';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function JobAllotment() {
  const { user, shift } = useAuth();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [currentShift, setCurrentShift] = useState<'day' | 'night'>(shift);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [vehicle, setVehicle] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [mobile, setMobile] = useState('');
  const [records, setRecords] = useState<SupabaseJob[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Repeat state
  const [showRepeat, setShowRepeat] = useState(false);
  const [fromDate, setFromDate] = useState(today);
  const [fromShift, setFromShift] = useState<'day' | 'night'>(shift === 'day' ? 'night' : 'day');
  const [repeatDate, setRepeatDate] = useState(today);
  const [repeatShift, setRepeatShift] = useState<'day' | 'night'>(shift);
  const [repeatRecords, setRepeatRecords] = useState<SupabaseJob[]>([]);
  const [editRepeatId, setEditRepeatId] = useState<string | null>(null);
  const [editRepeatVehicle, setEditRepeatVehicle] = useState('');
  const [editRepeatVehicleSearch, setEditRepeatVehicleSearch] = useState('');
  const [editRepeatStaff, setEditRepeatStaff] = useState('');
  const [editRepeatStaffSearch, setEditRepeatStaffSearch] = useState('');
  const [fullScreen, setFullScreen] = useState(false);

  const adminUser = isAdmin(user?.username);
  const createdBy = user?.displayName || '';

  // Load staff from Supabase
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

  // Attendance-based drivers for current shift
  const [attendanceDrivers, setAttendanceDrivers] = useState<Staff[]>([]);
  useEffect(() => {
    fetchAttendance(date, currentShift, createdBy, adminUser).then(att => {
      const presentDrivers = att.filter(a => a.status !== 'absent').map(a => {
        const s = staffList.find(st => st.id === a.staff_id || st.name === a.staff_name);
        return s || { id: a.staff_id || a.staff_name, name: a.staff_name, mobile: a.mobile, createdAt: '' };
      });
      setAttendanceDrivers(presentDrivers);
    });
  }, [date, currentShift, staffList]);

  const refresh = async () => {
    setLoading(true);
    const data = await fetchJobs(date, currentShift, createdBy, adminUser);
    setRecords(data);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [date, currentShift]);

  // Real-time subscription
  useEffect(() => {
    const unsub = subscribeToTable('jobs', refresh);
    return unsub;
  }, [date, currentShift, createdBy, adminUser]);

  useEffect(() => {
    if (params.get('repeat') === '1') {
      loadFromShift();
      setShowRepeat(true);
    }
  }, []);

  const loadFromShift = async () => {
    const lastJobs = await fetchJobs(fromDate, fromShift, createdBy, adminUser);
    setRepeatRecords(lastJobs);
  };

  useEffect(() => {
    if (showRepeat) loadFromShift();
  }, [fromDate, fromShift]);

  const publishRepeat = async () => {
    let added = 0;
    for (const j of repeatRecords) {
      const res = await insertJob({
        date: repeatDate, shift: repeatShift, vehicle_number: j.vehicle_number,
        staff_id: j.staff_id, staff_name: j.staff_name, mobile: j.mobile, created_by: createdBy,
      });
      if (res) added++;
    }
    toast({ title: `${added} jobs published to ${repeatDate} ${repeatShift} shift` });
    setShowRepeat(false);
    setDate(repeatDate);
    setCurrentShift(repeatShift);
    refresh();
  };

  const removeRepeatRecord = (id: string) => setRepeatRecords(prev => prev.filter(r => r.id !== id));

  const startEditRepeat = (r: SupabaseJob) => {
    setEditRepeatId(r.id);
    setEditRepeatVehicle(r.vehicle_number);
    setEditRepeatVehicleSearch(r.vehicle_number);
    setEditRepeatStaff(r.staff_id || r.staff_name);
    setEditRepeatStaffSearch(r.staff_name);
  };

  const saveEditRepeat = () => {
    if (!editRepeatId || !editRepeatVehicle || !editRepeatStaff) return;
    const s = staffList.find(x => x.id === editRepeatStaff);
    if (!s) return;
    setRepeatRecords(prev => prev.map(r => r.id === editRepeatId ? { ...r, vehicle_number: editRepeatVehicle, staff_id: s.id, staff_name: s.name, mobile: s.mobile } : r));
    setEditRepeatId(null);
    setEditRepeatVehicle(''); setEditRepeatVehicleSearch('');
    setEditRepeatStaff(''); setEditRepeatStaffSearch('');
  };

  const filteredRepeatVehicles = VEHICLES.filter(v => v.toLowerCase().includes(editRepeatVehicleSearch.toLowerCase()));
  const filteredRepeatStaff = staffList.filter(s => s.name.toLowerCase().includes(editRepeatStaffSearch.toLowerCase()));

  useEffect(() => {
    if (vehicle && !editId) {
      getLastDriverForVehicle(vehicle).then(last => {
        if (last) {
          setSelectedStaff(last.staff_id || last.staff_name);
          setStaffSearch(last.staff_name);
          setMobile(last.mobile);
        }
      });
    }
  }, [vehicle]);

  const filteredVehicles = VEHICLES.filter(v => v.toLowerCase().includes(vehicleSearch.toLowerCase()));
  const assignedDriverIds = new Set(records.filter(r => r.id !== editId).map(r => r.staff_id || r.staff_name));
  const filteredStaffForJob = attendanceDrivers.filter(s => s.name.toLowerCase().includes(staffSearch.toLowerCase()) && !assignedDriverIds.has(s.id));

  const handleAdd = async () => {
    if (!vehicle || !selectedStaff) return toast({ title: 'Select vehicle and driver', variant: 'destructive' });
    const staffItem = staffList.find(s => s.id === selectedStaff);
    if (!staffItem) return;

    if (editId) {
      await updateJobRecord(editId, { vehicle_number: vehicle, staff_id: staffItem.id, staff_name: staffItem.name, mobile: staffItem.mobile });
      setEditId(null);
      toast({ title: 'Updated' });
    } else {
      const isDuplicate = await checkJobDuplicate(date, currentShift, vehicle, staffItem.id);
      if (isDuplicate) return toast({ title: 'Vehicle or driver already assigned this shift', variant: 'destructive' });
      const res = await insertJob({
        date, shift: currentShift, vehicle_number: vehicle,
        staff_id: staffItem.id, staff_name: staffItem.name, mobile: staffItem.mobile, created_by: createdBy,
      });
      if (!res) return toast({ title: 'Failed to add job', variant: 'destructive' });
      toast({ title: 'Job allotted' });
    }
    setVehicle(''); setVehicleSearch(''); setSelectedStaff(''); setStaffSearch(''); setMobile('');
    refresh();
  };

  const handleEdit = (r: SupabaseJob) => {
    setEditId(r.id); setVehicle(r.vehicle_number); setVehicleSearch(r.vehicle_number);
    setSelectedStaff(r.staff_id || r.staff_name); setStaffSearch(r.staff_name); setMobile(r.mobile);
  };
  const handleDelete = async (id: string) => {
    await deleteJobRecord(id);
    refresh();
    toast({ title: 'Deleted' });
  };

  const buildShareText = () => {
    let text = `*SKL - Job Allotment*\nDate: ${date} | Shift: ${currentShift.toUpperCase()}\nSupervisor: ${user?.displayName}\n\n`;
    records.forEach((r, i) => { text += `${i + 1}. ${r.vehicle_number} - ${r.staff_name} - ${r.mobile}\n`; });
    return text;
  };

  const shareAsPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('SKL - Job Allotment', 14, 15);
    doc.setFontSize(10);
    doc.text(`Date: ${date} | Shift: ${currentShift.toUpperCase()} | Supervisor: ${user?.displayName}`, 14, 24);
    autoTable(doc, {
      startY: 30,
      head: [['#', 'Vehicle', 'Driver Name', 'Mobile']],
      body: records.map((r, i) => [i + 1, r.vehicle_number, r.staff_name, r.mobile]),
    });
    doc.save(`job_allotment_${date}_${currentShift}.pdf`);
  };

  const shareWhatsApp = () => {
    const text = buildShareText();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <Layout>
      <div className="space-y-4 max-w-4xl mx-auto px-1">
        <h2 className="text-xl md:text-2xl font-bold">Job Allotment</h2>

        {!showRepeat && (
          <Button variant="outline" size="sm" onClick={() => { loadFromShift(); setShowRepeat(true); }}>
            Repeat Shift Jobs
          </Button>
        )}

        {showRepeat && (
          <Card className="border-accent">
            <CardHeader className="pb-3"><CardTitle className="text-base md:text-lg">Repeat Jobs</CardTitle></CardHeader>
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
              <div className="overflow-auto max-h-72 -mx-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Vehicle</TableHead>
                      <TableHead className="text-xs">Driver</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Mobile</TableHead>
                      <TableHead className="text-xs w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repeatRecords.map(r => (
                      <TableRow key={r.id}>
                        {editRepeatId === r.id ? (
                          <>
                            <TableCell className="py-1.5">
                              <div className="relative">
                                <Input value={editRepeatVehicleSearch} onChange={e => { setEditRepeatVehicleSearch(e.target.value); setEditRepeatVehicle(''); }} className="w-20 h-7 text-xs" />
                                {editRepeatVehicleSearch && !editRepeatVehicle && (
                                  <div className="border rounded-md max-h-32 overflow-auto bg-popover absolute z-50 shadow-lg w-24">
                                    {filteredRepeatVehicles.slice(0, 10).map(v => (
                                      <div key={v} className="px-2 py-1 hover:bg-muted cursor-pointer text-xs" onClick={() => { setEditRepeatVehicle(v); setEditRepeatVehicleSearch(v); }}>{v}</div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-1.5">
                              <div className="relative">
                                <Input value={editRepeatStaffSearch} onChange={e => { setEditRepeatStaffSearch(e.target.value); setEditRepeatStaff(''); }} className="w-28 h-7 text-xs" />
                                {editRepeatStaffSearch && !editRepeatStaff && (
                                  <div className="border rounded-md max-h-32 overflow-auto bg-popover absolute z-50 shadow-lg w-36">
                                    {filteredRepeatStaff.slice(0, 10).map(s => (
                                      <div key={s.id} className="px-2 py-1 hover:bg-muted cursor-pointer text-xs" onClick={() => { setEditRepeatStaff(s.id); setEditRepeatStaffSearch(s.name); }}>{s.name}</div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-1.5 hidden sm:table-cell text-xs">{staffList.find(s => s.id === editRepeatStaff)?.mobile || r.mobile}</TableCell>
                            <TableCell className="flex gap-0.5 py-1.5">
                              <Button size="sm" className="h-7 text-xs" onClick={saveEditRepeat}>Save</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditRepeatId(null)}>✕</Button>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="text-xs font-medium py-1.5">{r.vehicle_number}</TableCell>
                            <TableCell className="text-xs py-1.5">{r.staff_name}</TableCell>
                            <TableCell className="text-xs py-1.5 hidden sm:table-cell">{r.mobile}</TableCell>
                            <TableCell className="flex gap-0.5 py-1.5">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditRepeat(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeRepeatRecord(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                    {repeatRecords.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-xs">No records from selected shift</TableCell></TableRow>
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
          <CardHeader className="pb-3"><CardTitle className="text-base md:text-lg">{editId ? 'Edit Allotment' : 'New Allotment'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
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
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Vehicle Number</Label>
                <Input placeholder="Search vehicle..." value={vehicleSearch}
                  onChange={e => { setVehicleSearch(e.target.value); setVehicle(''); }}
                  className="h-9 text-sm" />
                {vehicleSearch && !vehicle && (
                  <div className="border rounded-md max-h-40 overflow-auto bg-popover z-50 relative shadow-lg">
                    {filteredVehicles.slice(0, 20).map(v => (
                      <div key={v} className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                        onClick={() => { setVehicle(v); setVehicleSearch(v); }}>{v}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Driver Name</Label>
                <Input placeholder="Search driver..." value={staffSearch}
                  onChange={e => { setStaffSearch(e.target.value); setSelectedStaff(''); setMobile(''); }}
                  className="h-9 text-sm" />
                {staffSearch && !selectedStaff && (
                  <div className="border rounded-md max-h-40 overflow-auto bg-popover z-50 relative shadow-lg">
                    {filteredStaffForJob.map(s => (
                      <div key={s.id} className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                        onClick={() => { setSelectedStaff(s.id); setStaffSearch(s.name); setMobile(s.mobile); }}>
                        {s.name} - {s.mobile}
                      </div>
                    ))}
                    {filteredStaffForJob.length === 0 && <div className="px-3 py-2 text-muted-foreground text-sm">No drivers available</div>}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mobile</Label>
                <Input value={mobile} readOnly className="bg-muted h-9 text-sm" />
              </div>
            </div>
            <Button size="sm" onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />{editId ? 'Update' : 'Allot'}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 pb-3">
            <CardTitle className="text-base">List ({records.length})</CardTitle>
            <div className="flex gap-1.5 items-center">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setFullScreen(!fullScreen)}>
                {fullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={shareAsPdf}><Download className="h-3.5 w-3.5 mr-1" />PDF</Button>
              <Button size="sm" variant="outline" className="h-8 text-xs text-success" onClick={shareWhatsApp}><MessageCircle className="h-3.5 w-3.5 mr-1" />WA</Button>
            </div>
          </CardHeader>
          <CardContent className="px-2 md:px-6">
            <div className={`overflow-auto ${fullScreen ? 'max-h-[calc(100vh-200px)]' : 'max-h-96'}`}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-8">#</TableHead>
                    <TableHead className="text-xs">Vehicle</TableHead>
                    <TableHead className="text-xs">Driver</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Mobile</TableHead>
                    <TableHead className="text-xs w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs py-1.5">{i + 1}</TableCell>
                      <TableCell className="text-xs font-medium py-1.5">{r.vehicle_number}</TableCell>
                      <TableCell className="text-xs py-1.5">{r.staff_name}</TableCell>
                      <TableCell className="text-xs py-1.5 hidden sm:table-cell">{r.mobile}</TableCell>
                      <TableCell className="flex gap-0.5 py-1.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {records.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-xs">{loading ? 'Loading...' : 'No records'}</TableCell></TableRow>
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
