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
import {
  getStaffList, VEHICLES, getShiftJobs, addJobAllotment, updateJobAllotment,
  deleteJobAllotment, getLastDriver, getShiftAttendance, type JobAllotmentRecord, type Staff
} from '@/lib/storage';
import { Plus, Pencil, Trash2, Download, MessageCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function JobAllotment() {
  const { user, shift } = useAuth();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [currentShift, setCurrentShift] = useState<'day' | 'night'>(shift);
  const [staffList] = useState<Staff[]>(getStaffList());
  const [vehicle, setVehicle] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [mobile, setMobile] = useState('');
  const [records, setRecords] = useState<JobAllotmentRecord[]>([]);
  const [editId, setEditId] = useState<string | null>(null);

  // Repeat last shift state
  const [showRepeat, setShowRepeat] = useState(false);
  const [repeatDate, setRepeatDate] = useState(today);
  const [repeatShift, setRepeatShift] = useState<'day' | 'night'>(shift === 'day' ? 'night' : 'day');
  const [repeatRecords, setRepeatRecords] = useState<JobAllotmentRecord[]>([]);
  const [editRepeatId, setEditRepeatId] = useState<string | null>(null);
  const [editRepeatVehicle, setEditRepeatVehicle] = useState('');
  const [editRepeatVehicleSearch, setEditRepeatVehicleSearch] = useState('');
  const [editRepeatStaff, setEditRepeatStaff] = useState('');
  const [editRepeatStaffSearch, setEditRepeatStaffSearch] = useState('');

  const refresh = () => setRecords(getShiftJobs(date, currentShift));
  useEffect(() => { refresh(); }, [date, currentShift]);

  const attendanceDrivers = useMemo(() => {
    const att = getShiftAttendance(date, currentShift);
    return att.filter(a => a.status !== 'absent').map(a => staffList.find(s => s.id === a.staffId)).filter(Boolean) as Staff[];
  }, [date, currentShift, staffList]);

  useEffect(() => {
    if (params.get('repeat') === '1') {
      loadLastShift();
      setShowRepeat(true);
    }
  }, []);

  const loadLastShift = () => {
    const lastShift = currentShift === 'day' ? 'night' : 'day';
    const lastDate = currentShift === 'day' ? new Date(Date.now() - 86400000).toISOString().split('T')[0] : today;
    const lastJobs = getShiftJobs(lastDate, lastShift);
    setRepeatRecords(lastJobs);
  };

  const publishRepeat = () => {
    let added = 0;
    repeatRecords.forEach(j => {
      const res = addJobAllotment({ date: repeatDate, shift: repeatShift, vehicleNumber: j.vehicleNumber, staffId: j.staffId, staffName: j.staffName, mobile: j.mobile, createdBy: user?.displayName || '' });
      if (res) added++;
    });
    toast({ title: `${added} jobs published to ${repeatDate} ${repeatShift} shift` });
    setShowRepeat(false);
    setDate(repeatDate);
    setCurrentShift(repeatShift);
    refresh();
  };

  const removeRepeatRecord = (id: string) => setRepeatRecords(prev => prev.filter(r => r.id !== id));

  const startEditRepeat = (r: JobAllotmentRecord) => {
    setEditRepeatId(r.id);
    setEditRepeatVehicle(r.vehicleNumber);
    setEditRepeatVehicleSearch(r.vehicleNumber);
    setEditRepeatStaff(r.staffId);
    setEditRepeatStaffSearch(r.staffName);
  };

  const saveEditRepeat = () => {
    if (!editRepeatId || !editRepeatVehicle || !editRepeatStaff) return;
    const s = staffList.find(x => x.id === editRepeatStaff);
    if (!s) return;
    setRepeatRecords(prev => prev.map(r => r.id === editRepeatId ? { ...r, vehicleNumber: editRepeatVehicle, staffId: s.id, staffName: s.name, mobile: s.mobile } : r));
    setEditRepeatId(null);
    setEditRepeatVehicle(''); setEditRepeatVehicleSearch('');
    setEditRepeatStaff(''); setEditRepeatStaffSearch('');
  };

  const filteredRepeatVehicles = VEHICLES.filter(v => v.toLowerCase().includes(editRepeatVehicleSearch.toLowerCase()));
  const filteredRepeatStaff = staffList.filter(s => s.name.toLowerCase().includes(editRepeatStaffSearch.toLowerCase()));

  useEffect(() => {
    if (vehicle && !editId) {
      const last = getLastDriver(vehicle);
      if (last) {
        setSelectedStaff(last.staffId);
        setStaffSearch(last.staffName);
        setMobile(last.mobile);
      }
    }
  }, [vehicle]);

  const filteredVehicles = VEHICLES.filter(v => v.toLowerCase().includes(vehicleSearch.toLowerCase()));
  const filteredStaff = attendanceDrivers.filter(s => s.name.toLowerCase().includes(staffSearch.toLowerCase()));

  const handleAdd = () => {
    if (!vehicle || !selectedStaff) return toast({ title: 'Select vehicle and driver', variant: 'destructive' });
    const staffItem = staffList.find(s => s.id === selectedStaff);
    if (!staffItem) return;
    if (editId) {
      updateJobAllotment(editId, { vehicleNumber: vehicle, staffId: staffItem.id, staffName: staffItem.name, mobile: staffItem.mobile });
      setEditId(null);
      toast({ title: 'Updated' });
    } else {
      const res = addJobAllotment({ date, shift: currentShift, vehicleNumber: vehicle, staffId: staffItem.id, staffName: staffItem.name, mobile: staffItem.mobile, createdBy: user?.displayName || '' });
      if (!res) return toast({ title: 'Vehicle or driver already assigned this shift', variant: 'destructive' });
      toast({ title: 'Job allotted' });
    }
    setVehicle(''); setVehicleSearch(''); setSelectedStaff(''); setStaffSearch(''); setMobile('');
    refresh();
  };

  const handleEdit = (r: JobAllotmentRecord) => {
    setEditId(r.id); setVehicle(r.vehicleNumber); setVehicleSearch(r.vehicleNumber);
    setSelectedStaff(r.staffId); setStaffSearch(r.staffName); setMobile(r.mobile);
  };
  const handleDelete = (id: string) => { deleteJobAllotment(id); refresh(); toast({ title: 'Deleted' }); };

  const buildShareText = () => {
    let text = `*SKL - Job Allotment*\nDate: ${date} | Shift: ${currentShift.toUpperCase()}\nSupervisor: ${user?.displayName}\n\n`;
    records.forEach((r, i) => { text += `${i + 1}. ${r.vehicleNumber} - ${r.staffName} - ${r.mobile}\n`; });
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
      body: records.map((r, i) => [i + 1, r.vehicleNumber, r.staffName, r.mobile]),
    });
    doc.save(`job_allotment_${date}_${currentShift}.pdf`);
  };

  const shareWhatsApp = () => {
    const text = buildShareText();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold">Job Allotment</h2>

        {!showRepeat && (
          <Button variant="outline" onClick={() => { loadLastShift(); setShowRepeat(true); }}>
            Repeat Last Shift Job Allotment
          </Button>
        )}

        {showRepeat && (
          <Card className="border-accent">
            <CardHeader><CardTitle>Repeat Last Shift Jobs</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Publish to Date</Label>
                  <Input type="date" value={repeatDate} onChange={e => setRepeatDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Publish to Shift</Label>
                  <Select value={repeatShift} onValueChange={v => setRepeatShift(v as 'day' | 'night')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="overflow-auto max-h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repeatRecords.map(r => (
                      <TableRow key={r.id}>
                        {editRepeatId === r.id ? (
                          <>
                            <TableCell>
                              <Input value={editRepeatVehicleSearch} onChange={e => { setEditRepeatVehicleSearch(e.target.value); setEditRepeatVehicle(''); }} className="w-24" />
                              {editRepeatVehicleSearch && !editRepeatVehicle && (
                                <div className="border rounded-md max-h-32 overflow-auto bg-popover absolute z-50">
                                  {filteredRepeatVehicles.slice(0, 10).map(v => (
                                    <div key={v} className="px-2 py-1 hover:bg-muted cursor-pointer text-xs" onClick={() => { setEditRepeatVehicle(v); setEditRepeatVehicleSearch(v); }}>{v}</div>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input value={editRepeatStaffSearch} onChange={e => { setEditRepeatStaffSearch(e.target.value); setEditRepeatStaff(''); }} className="w-32" />
                              {editRepeatStaffSearch && !editRepeatStaff && (
                                <div className="border rounded-md max-h-32 overflow-auto bg-popover absolute z-50">
                                  {filteredRepeatStaff.slice(0, 10).map(s => (
                                    <div key={s.id} className="px-2 py-1 hover:bg-muted cursor-pointer text-xs" onClick={() => { setEditRepeatStaff(s.id); setEditRepeatStaffSearch(s.name); }}>{s.name}</div>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{staffList.find(s => s.id === editRepeatStaff)?.mobile || r.mobile}</TableCell>
                            <TableCell className="flex gap-1">
                              <Button size="sm" onClick={saveEditRepeat}>Save</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditRepeatId(null)}>Cancel</Button>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-medium">{r.vehicleNumber}</TableCell>
                            <TableCell>{r.staffName}</TableCell>
                            <TableCell>{r.mobile}</TableCell>
                            <TableCell className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => startEditRepeat(r)}><Pencil className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => removeRepeatRecord(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                    {repeatRecords.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No records from last shift</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex gap-2">
                <Button onClick={publishRepeat} disabled={repeatRecords.length === 0}>Publish</Button>
                <Button variant="outline" onClick={() => setShowRepeat(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>{editId ? 'Edit Allotment' : 'New Allotment'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Vehicle Number</Label>
                <Input placeholder="Type to search..." value={vehicleSearch}
                  onChange={e => { setVehicleSearch(e.target.value); setVehicle(''); }} />
                {vehicleSearch && !vehicle && (
                  <div className="border rounded-md max-h-40 overflow-auto bg-popover z-50 relative">
                    {filteredVehicles.slice(0, 20).map(v => (
                      <div key={v} className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                        onClick={() => { setVehicle(v); setVehicleSearch(v); }}>{v}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Driver Name</Label>
                <Input placeholder="Type to search..." value={staffSearch}
                  onChange={e => { setStaffSearch(e.target.value); setSelectedStaff(''); setMobile(''); }} />
                {staffSearch && !selectedStaff && (
                  <div className="border rounded-md max-h-40 overflow-auto bg-popover z-50 relative">
                    {filteredStaff.map(s => (
                      <div key={s.id} className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                        onClick={() => { setSelectedStaff(s.id); setStaffSearch(s.name); setMobile(s.mobile); }}>
                        {s.name} - {s.mobile}
                      </div>
                    ))}
                    {filteredStaff.length === 0 && <div className="px-3 py-2 text-muted-foreground text-sm">No drivers available</div>}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input value={mobile} readOnly className="bg-muted" />
              </div>
            </div>
            <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />{editId ? 'Update' : 'Allot'}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <CardTitle>Allotment List ({records.length})</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={shareAsPdf}><Download className="h-4 w-4 mr-1" />PDF</Button>
              <Button size="sm" variant="outline" onClick={shareWhatsApp} className="text-success"><MessageCircle className="h-4 w-4 mr-1" />WhatsApp</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{r.vehicleNumber}</TableCell>
                      <TableCell>{r.staffName}</TableCell>
                      <TableCell>{r.mobile}</TableCell>
                      <TableCell className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {records.length === 0 && (
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
