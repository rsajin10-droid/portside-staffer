import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { getAttendance, getStaffList, getJobAllotments, type AttendanceRecord } from '@/lib/storage';
import { Download, Eye, MessageCircle, FileText, Calendar as CalendarIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type ReportMode = 'day' | 'month_driver' | 'all_drivers_custom';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Reports() {
  const { user } = useAuth();
  const [mode, setMode] = useState<ReportMode>('day');

  // Day wise states
  const [dayDate, setDayDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayShift, setDayShift] = useState<'day' | 'night' | 'both'>('both');

  // Month + driver states
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [driverSearch, setDriverSearch] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');

  // All drivers + custom date states
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  const [showReport, setShowReport] = useState(false);

  const staffList = getStaffList().sort((a, b) => a.name.localeCompare(b.name));
  const allAttendance = getAttendance();
  const allJobs = getJobAllotments();
  const filteredStaffSearch = staffList.filter(s => s.name.toLowerCase().includes(driverSearch.toLowerCase()));

  const getStatusLabel = (r: AttendanceRecord) => {
    if (r.status === 'absent') {
      if (r.subStatus === 'dcd') return '(A) DCD';
      if (r.subStatus === 'dcn') return '(A) DCN';
      return 'A';
    }
    if (r.status === 'extra_duty') return 'OT';
    if (r.status === 'dcd') return 'DCD';
    if (r.status === 'dcn') return 'DCN';
    return 'P';
  };

  // 1. Day wise report logic
  const dayReportData = useMemo(() => {
    let records = allAttendance.filter(r => r.date === dayDate);
    if (dayShift !== 'both') records = records.filter(r => r.shift === dayShift);
    return records.map((r, i) => {
      const job = allJobs.find(j => j.date === r.date && j.shift === r.shift && j.staffId === r.staffId);
      return { ...r, serial: i + 1, vehicle: job?.vehicleNumber || '-', statusLabel: getStatusLabel(r) };
    });
  }, [dayDate, dayShift, allAttendance, allJobs]);

  // 2. Month + driver report logic
  const monthDriverData = useMemo(() => {
    if (!selectedDriver) return [];
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
    return allAttendance
      .filter(r => r.staffId === selectedDriver && r.date >= startDate && r.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r, i) => ({ ...r, serial: i + 1, statusLabel: getStatusLabel(r) }));
  }, [selectedDriver, month, year, allAttendance]);

  const monthDriverStats = useMemo(() => {
    if (!monthDriverData.length) return null;
    const present = monthDriverData.filter(r => ['present', 'dcd', 'dcn'].includes(r.status)).length;
    const ot = monthDriverData.filter(r => r.status === 'extra_duty').length;
    const absent = monthDriverData.filter(r => r.status === 'absent').length;
    return { present, absent, ot, totalDuty: present + ot };
  }, [monthDriverData]);

  // Export PDF - Day Wise
  const downloadDayPdf = () => {
    const doc = new jsPDF();
    doc.text('SKL - Day Wise Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Date: ${dayDate} | Shift: ${dayShift.toUpperCase()}`, 14, 22);
    autoTable(doc, {
      startY: 30,
      head: [['#', 'Driver Name', 'Vehicle', 'Shift', 'Status']],
      body: dayReportData.map(r => [r.serial, r.staffName, r.vehicle, r.shift.toUpperCase(), r.statusLabel]),
    });
    doc.save(`day_report_${dayDate}.pdf`);
  };

  // Export Excel - Custom Range
  const downloadAllDriversExcel = () => {
    const ws = XLSX.utils.json_to_sheet(allDriversData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'All Drivers Report');
    XLSX.writeFile(wb, `skl_report_${dateFrom}_to_${dateTo}.xlsx`);
  };

  const allDriversData = useMemo(() => {
    const records = allAttendance.filter(r => r.date >= dateFrom && r.date <= dateTo);
    const driverMap = new Map();
    records.forEach(r => {
      const existing = driverMap.get(r.staffId) || { name: r.staffName, present: 0, absent: 0, ot: 0 };
      if (['present', 'dcd', 'dcn'].includes(r.status)) existing.present++;
      else if (r.status === 'absent') existing.absent++;
      else if (r.status === 'extra_duty') existing.ot++;
      driverMap.set(r.staffId, existing);
    });
    return Array.from(driverMap.values());
  }, [dateFrom, dateTo, allAttendance]);

  return (
    <Layout>
      <div className="space-y-4 max-w-4xl mx-auto px-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" /> Reports
        </h2>

        <div className="flex gap-2 flex-wrap mb-6">
          <Button size="sm" variant={mode === 'day' ? 'default' : 'outline'} onClick={() => { setMode('day'); setShowReport(false); }}>Day Wise</Button>
          <Button size="sm" variant={mode === 'month_driver' ? 'default' : 'outline'} onClick={() => { setMode('month_driver'); setShowReport(false); }}>Monthly Driver</Button>
          <Button size="sm" variant={mode === 'all_drivers_custom' ? 'default' : 'outline'} onClick={() => { setMode('all_drivers_custom'); setShowReport(false); }}>Custom Range</Button>
        </div>

        {/* --- Day Wise Input --- */}
        {mode === 'day' && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Select Date</Label>
                  <Input type="date" value={dayDate} onChange={e => setDayDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Shift</Label>
                  <Select value={dayShift} onValueChange={(v: any) => setDayShift(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Both</SelectItem>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setShowReport(true)}><Eye className="h-4 w-4 mr-1" /> View</Button>
                <Button size="sm" variant="outline" onClick={downloadDayPdf}><Download className="h-4 w-4 mr-1" /> PDF</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* --- Custom Range Input --- */}
        {mode === 'all_drivers_custom' && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>From Date</Label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>To Date</Label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </div>
              <Button size="sm" variant="outline" className="text-green-700" onClick={downloadAllDriversExcel}>
                <Download className="h-4 w-4 mr-1" /> Download Excel
              </Button>
            </CardContent>
          </Card>
        )}

        {/* --- Report Table --- */}
        {showReport && mode === 'day' && (
          <Card className="mt-4">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-sm">Summary for {dayDate}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayReportData.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.serial}</TableCell>
                      <TableCell className="text-sm font-medium">{r.staffName}</TableCell>
                      <TableCell className="text-sm">{r.vehicle}</TableCell>
                      <TableCell className="text-xs uppercase">{r.shift}</TableCell>
                      <TableCell className="text-xs font-bold">{r.statusLabel}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
                }
