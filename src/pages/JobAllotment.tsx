import { useState, useEffect, useMemo } from 'react';
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
  VEHICLES, 
  getStaffList, 
  getAttendance, 
  getJobAllotments, 
  addJobAllotment, 
  deleteJobAllotment,
  getLastDriver,
  type Staff,
  type JobAllotmentRecord,
  setStorageData
} from '@/lib/storage';
import { Plus, Pencil, Trash2, Download, MessageCircle, Maximize2, Minimize2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function JobAllotment() {
  const { user, shift } = useAuth();
  const { toast } = useToast();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [currentShift, setCurrentShift] = useState<'day' | 'night'>(shift || 'day');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [vehicle, setVehicle] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [mobile, setMobile] = useState('');
  const [records, setRecords] = useState<JobAllotmentRecord[]>([]);
  const [fullScreen, setFullScreen] = useState(false);

  // Load initial data
  useEffect(() => {
    refreshData();
  }, [date, currentShift]);

  const refreshData = () => {
    const allJobs = getJobAllotments();
    const filtered = allJobs.filter(j => j.date === date && j.shift === currentShift);
    setRecords(filtered);
    setStaffList(getStaffList());
  };

  // Get present drivers from attendance for the selected shift
  const attendanceDrivers = useMemo(() => {
    const attendance = getAttendance().filter(a => a.date === date && a.shift === currentShift && a.status !== 'absent');
    return attendance.map(a => ({
      id: a.staffId,
      name: a.staffName,
      mobile: a.mobile,
      createdAt: ''
    }));
  }, [date, currentShift]);

  // Auto-fill last used driver when vehicle is selected
  useEffect(() => {
    if (vehicle) {
      const lastDriver = getLastDriver(vehicle);
      if (lastDriver) {
        setSelectedStaff(lastDriver.staffId);
        setStaffSearch(lastDriver.staffName);
        setMobile(lastDriver.mobile);
      }
    }
  }, [vehicle]);

  const filteredVehicles = VEHICLES.filter(v => v.toLowerCase().includes(vehicleSearch.toLowerCase()));
  const assignedStaffIds = new Set(records.map(r => r.staffId));
  const availableDrivers = attendanceDrivers.filter(s => 
    s.name.toLowerCase().includes(staffSearch.toLowerCase()) && !assignedStaffIds.has(s.id)
  );

  const handleAdd = () => {
    if (!vehicle || !selectedStaff) {
      return toast({ title: 'Select vehicle and driver', variant: 'destructive' });
    }

    const staffItem = staffList.find(s => s.id === selectedStaff);
    if (!staffItem) return;

    const res = addJobAllotment({
      date,
      shift: currentShift,
      vehicleNumber: vehicle,
      staffId: staffItem.id,
      staffName: staffItem.name,
      mobile: staffItem.mobile,
      createdBy: user?.displayName || user?.username || 'Supervisor'
    });

    if (res) {
      toast({ title: 'Job allotted successfully' });
      setVehicle('');
      setVehicleSearch('');
      setSelectedStaff('');
      setStaffSearch('');
      setMobile('');
      refreshData();
    } else {
      toast({ title: 'Vehicle or Driver already assigned', variant: 'destructive' });
    }
  };

  const handleDelete = (id: string) => {
    deleteJobAllotment(id);
    refreshData();
    toast({ title: 'Job deleted' });
  };

  const shareAsPdf = () => {
    const doc = new jsPDF();
    doc.text('SKL - Job Allotment', 14, 15);
    doc.setFontSize(10);
    doc.text(`Date: ${date} | Shift: ${currentShift.toUpperCase()}`, 14, 22);
    autoTable(doc, {
      startY: 30,
      head: [['#', 'Vehicle', 'Driver Name', 'Mobile']],
      body: records.map((r, i) => [i + 1, r.vehicleNumber, r.staffName, r.mobile]),
    });
    doc.save(`jobs_${date}.pdf`);
  };

  const shareWhatsApp = () => {
    let text = `*SKL Job Allotment*\nDate: ${date} | Shift: ${currentShift.toUpperCase()}\n\n`;
    records.forEach((r, i) => {
      text += `${i + 1}. ${r.vehicleNumber} - ${r.staffName}\n`;
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <Layout>
      <div className="space-y-4 max-w-4xl mx-auto px-2">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Job Allotment</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={shareAsPdf}><Download className="h-4 w-4 mr-1" /> PDF</Button>
            <Button size="sm" variant="outline" className="text-green-600" onClick={shareWhatsApp}><MessageCircle className="h-4 w-4 mr-1" /> WhatsApp</Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">New Allotment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Shift</Label>
                <Select value={currentShift} onValueChange={(v: any) => setCurrentShift(v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Label className="text-xs font-bold">Vehicle</Label>
                <Input 
                  placeholder="Search vehicle..." 
                  value={vehicleSearch} 
                  onChange={e => { setVehicleSearch(e.target.value); setVehicle(''); }} 
                  className="h-9"
                />
                {vehicleSearch && !vehicle && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-auto">
                    {filteredVehicles.map(v => (
                      <div key={v} className="p-2 hover:bg-muted cursor-pointer text-sm" onClick={() => { setVehicle(v); setVehicleSearch(v); }}>{v}</div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <Label className="text-xs font-bold">Driver</Label>
                <Input 
                  placeholder="Search driver..." 
                  value={staffSearch} 
                  onChange={e => { setStaffSearch(e.target.value); setSelectedStaff(''); }} 
                  className="h-9"
                />
                {staffSearch && !selectedStaff && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-auto">
                    {availableDrivers.map(s => (
                      <div key={s.id} className="p-2 hover:bg-muted cursor-pointer text-sm" onClick={() => { setSelectedStaff(s.id); setStaffSearch(s.name); setMobile(s.mobile); }}>
                        {s.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs font-bold">Mobile</Label>
                <Input value={mobile} readOnly className="h-9 bg-muted" />
              </div>
            </div>

            <Button onClick={handleAdd} className="w-full h-10 gap-2">
              <Plus className="h-4 w-4" /> Allot Job
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Today's Jobs ({records.length})</CardTitle>
            <Button size="icon" variant="ghost" onClick={() => setFullScreen(!fullScreen)}>
              {fullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            <div className={`overflow-auto border rounded-md ${fullScreen ? 'max-h-[80vh]' : 'max-h-96'}`}>
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground text-sm">No jobs allotted yet.</TableCell></TableRow>
                  ) : (
                    records.map((r, i) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{i + 1}</TableCell>
                        <TableCell className="font-bold text-primary">{r.vehicleNumber}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{r.staffName}</div>
                          <div className="text-[10px] text-muted-foreground">{r.mobile}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)} className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
