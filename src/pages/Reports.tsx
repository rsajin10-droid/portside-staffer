import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getAttendance, getStaffList, getJobAllotments, type AttendanceRecord } from '@/lib/storage';
import { Download, Eye, MessageCircle } from 'lucide-react';
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

  // Day wise
  const [dayDate, setDayDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayShift, setDayShift] = useState<'day' | 'night' | 'both'>('both');

  // Month + driver
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [driverSearch, setDriverSearch] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');

  // All drivers + custom date
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  // Show report in app
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

  // Day wise report data
  const dayReportData = useMemo(() => {
    let records = allAttendance.filter(r => r.date === dayDate);
    if (dayShift !== 'both') records = records.filter(r => r.shift === dayShift);
    return records.map((r, i) => {
      const job = allJobs.find(j => j.date === r.date && j.shift === r.shift && j.staffId === r.staffId);
      return { ...r, serial: i + 1, vehicle: job?.vehicleNumber || '-', statusLabel: getStatusLabel(r) };
    });
  }, [dayDate, dayShift, allAttendance, allJobs]);

  // Month + driver report data
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

  // All drivers + custom date report data
  const allDriversData = useMemo(() => {
    const records = allAttendance.filter(r => r.date >= dateFrom && r.date <= dateTo);
    const driverMap = new Map<string, { name: string; mobile: string; present: number; absent: number; ot: number }>();
    records.forEach(r => {
      const existing = driverMap.get(r.staffId) || { name: r.staffName, mobile: r.mobile, present: 0, absent: 0, ot: 0 };
      if (['present', 'dcd', 'dcn'].includes(r.status)) existing.present++;
      else if (r.status === 'absent') existing.absent++;
      else if (r.status === 'extra_duty') existing.ot++;
      driverMap.set(r.staffId, existing);
    });
    return Array.from(driverMap.entries()).map(([id, d], i) => ({ id, ...d, serial: i + 1 }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [dateFrom, dateTo, allAttendance]);

  // Generate date range for Excel columns
  const getDateRange = (from: string, to: string): string[] => {
    const dates: string[] = [];
    const d = new Date(from);
    const end = new Date(to);
    while (d <= end) {
      dates.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() + 1);
    }
    return dates;
  };

  // Download functions
  const downloadDayPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('SKL - Day Wise Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Date: ${dayDate} | Shift: ${dayShift === 'both' ? 'Both' : dayShift.toUpperCase()} | By: ${user?.displayName}`, 14, 24);
    autoTable(doc, {
      startY: 30,
      head: [['#', 'Driver Name', 'Mobile', 'Vehicle', 'Shift', 'Status']],
      body: dayReportData.map(r => [r.serial, r.staffName, r.mobile, r.vehicle, r.shift.toUpperCase(), r.statusLabel]),
    });
    doc.save(`day_report_${dayDate}.pdf`);
  };

  const downloadMonthDriverPdf = () => {
    if (!selectedDriver) return;
    const staff = staffList.find(s => s.id === selectedDriver);
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('SKL - Monthly Driver Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Driver: ${staff?.name} | ${MONTHS[month]} ${year} | By: ${user?.displayName}`, 14, 24);
    if (monthDriverStats) {
      doc.text(`Present: ${monthDriverStats.present} | Absent: ${monthDriverStats.absent} | OT: ${monthDriverStats.ot} | Total Duty: ${monthDriverStats.totalDuty}`, 14, 32);
    }

    // Calendar style: build a grid of days
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calendarData: string[][] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayRecords = monthDriverData.filter(r => r.date === dateStr);
      const statuses = dayRecords.map(r => r.statusLabel).join(', ') || 'WO';
      calendarData.push([String(d), new Date(dateStr).toLocaleDateString('en', { weekday: 'short' }), statuses]);
    }
    autoTable(doc, {
      startY: 38,
      head: [['Day', 'Weekday', 'Status']],
      body: calendarData,
    });
    doc.save(`driver_${staff?.name}_${MONTHS[month]}_${year}.pdf`);
  };

  const downloadCalendarJpg = () => {
    if (!selectedDriver) return;
    const staff = staffList.find(s => s.id === selectedDriver);
    const driverName = staff?.name || 'Driver';
    const title = `${driverName} - ${MONTHS[month]} ${year}`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const totalRows = Math.ceil((firstDay + daysInMonth) / 7);

    const W = 600, pad = 20, headerH = 50, dayHeaderH = 30, cellH = 55, footerH = 40;
    const cellW = (W - pad * 2) / 7;
    const H = pad + headerH + dayHeaderH + totalRows * cellH + footerH + pad;

    const canvas = document.createElement('canvas');
    canvas.width = W * 2; canvas.height = H * 2;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2);

    // Background
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    const r = 12;
    ctx.beginPath(); ctx.moveTo(pad + r, pad); ctx.lineTo(W - pad - r, pad); ctx.quadraticCurveTo(W - pad, pad, W - pad, pad + r);
    ctx.lineTo(W - pad, H - pad - r); ctx.quadraticCurveTo(W - pad, H - pad, W - pad - r, H - pad);
    ctx.lineTo(pad + r, H - pad); ctx.quadraticCurveTo(pad, H - pad, pad, H - pad - r);
    ctx.lineTo(pad, pad + r); ctx.quadraticCurveTo(pad, pad, pad + r, pad); ctx.fill();

    // Title
    ctx.fillStyle = '#1e293b'; ctx.font = 'bold 20px sans-serif';
    ctx.fillText(title, pad + 16, pad + 32);

    // Day headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const gridTop = pad + headerH;
    ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#64748b'; ctx.textAlign = 'center';
    days.forEach((d, i) => ctx.fillText(d, pad + i * cellW + cellW / 2, gridTop + 18));

    // Calendar cells
    const cellTop = gridTop + dayHeaderH;
    for (let d = 1; d <= daysInMonth; d++) {
      const idx = firstDay + d - 1;
      const col = idx % 7, row = Math.floor(idx / 7);
      const x = pad + col * cellW + 4, y = cellTop + row * cellH + 2;
      const cw = cellW - 8, ch = cellH - 4;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayRecs = monthDriverData.filter(rc => rc.date === dateStr);
      const status = dayRecs.length > 0 ? dayRecs.map(rc => rc.statusLabel).join('/') : 'WO';

      let bg = '#f1f5f9', fg = '#94a3b8';
      if (status.includes('P')) { bg = '#dcfce7'; fg = '#16a34a'; }
      else if (status.includes('A')) { bg = '#fee2e2'; fg = '#dc2626'; }
      else if (status.includes('OT')) { bg = '#fef3c7'; fg = '#d97706'; }

      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 8); ctx.fill();
      ctx.fillStyle = fg; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(String(d), x + cw / 2, y + 22);
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(status, x + cw / 2, y + 38);
    }

    // Footer stats
    const stats = monthDriverStats;
    if (stats) {
      const fy = cellTop + totalRows * cellH + 16;
      ctx.textAlign = 'left'; ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = '#16a34a'; ctx.fillText(`Total Present: ${stats.present}`, pad + 16, fy);
      ctx.fillStyle = '#dc2626'; ctx.fillText(`Total Absent: ${stats.absent}`, pad + 170, fy);
      ctx.fillStyle = '#d97706'; ctx.fillText(`Total OT: ${stats.ot}`, pad + 320, fy);
      ctx.fillStyle = '#1e293b'; ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`Total Duty: ${stats.totalDuty}`, pad + 430, fy);
    }

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `${driverName}_${MONTHS[month]}_${year}.jpg`, { type: 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: title });
      } else {
        // Fallback: download the file
        const link = document.createElement('a');
        link.download = file.name;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
      }
    }, 'image/jpeg', 0.95);
  };

  const downloadAllDriversExcel = () => {
    const dateRange = getDateRange(dateFrom, dateTo);
    
    // Build rows: Employee Name, Mobile Number, then dates as columns
    const rows: Record<string, string | number>[] = [];
    
    staffList.forEach(staff => {
      const row: Record<string, string | number> = {
        'Employee Name': staff.name,
        'Mobile Number': staff.mobile,
      };
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalOT = 0;
      
      dateRange.forEach(dateStr => {
        const record = allAttendance.find(r => r.staffId === staff.id && r.date === dateStr);
        const formattedDate = new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        if (!record) {
          row[formattedDate] = 'WO';
        } else if (record.status === 'absent') {
          row[formattedDate] = 'A';
          totalAbsent++;
        } else if (record.status === 'extra_duty') {
          row[formattedDate] = 'OT';
          totalOT++;
        } else {
          row[formattedDate] = 'P';
          totalPresent++;
        }
      });
      
      row['Total Duty'] = totalPresent + totalOT;
      rows.push(row);
    });
    
    // Sort alphabetically
    rows.sort((a, b) => String(a['Employee Name']).localeCompare(String(b['Employee Name'])));
    
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'All Drivers');
    XLSX.writeFile(wb, `all_drivers_${dateFrom}_to_${dateTo}.xlsx`);
  };

  return (
    <Layout>
      <div className="space-y-4 max-w-4xl mx-auto px-1">
        <h2 className="text-xl md:text-2xl font-bold">Reports</h2>

        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant={mode === 'day' ? 'default' : 'outline'} onClick={() => { setMode('day'); setShowReport(false); }}>Day Wise</Button>
          <Button size="sm" variant={mode === 'month_driver' ? 'default' : 'outline'} onClick={() => { setMode('month_driver'); setShowReport(false); }}>Month + Driver</Button>
          <Button size="sm" variant={mode === 'all_drivers_custom' ? 'default' : 'outline'} onClick={() => { setMode('all_drivers_custom'); setShowReport(false); }}>All Drivers + Custom Date</Button>
        </div>

        {/* Day Wise */}
        {mode === 'day' && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Day Wise Report</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={dayDate} onChange={e => { setDayDate(e.target.value); setShowReport(false); }} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Shift</Label>
                  <Select value={dayShift} onValueChange={v => { setDayShift(v as any); setShowReport(false); }}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Both</SelectItem>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => setShowReport(true)}><Eye className="h-4 w-4 mr-1" />View Report</Button>
                <Button size="sm" variant="outline" onClick={downloadDayPdf}><Download className="h-4 w-4 mr-1" />PDF</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Month + Driver */}
        {mode === 'month_driver' && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Monthly Driver Report</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Month</Label>
                  <Select value={String(month)} onValueChange={v => { setMonth(Number(v)); setShowReport(false); }}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Year</Label>
                  <Input type="number" value={year} onChange={e => { setYear(Number(e.target.value)); setShowReport(false); }} className="h-9 text-sm" />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <Label className="text-xs">Driver</Label>
                  <Input placeholder="Search driver..." value={driverSearch}
                    onChange={e => { setDriverSearch(e.target.value); setSelectedDriver(''); setShowReport(false); }}
                    className="h-9 text-sm" />
                  {driverSearch && !selectedDriver && (
                    <div className="border rounded-md max-h-40 overflow-auto bg-popover z-50 relative shadow-lg">
                      {filteredStaffSearch.map(s => (
                        <div key={s.id} className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                          onClick={() => { setSelectedDriver(s.id); setDriverSearch(s.name); }}>{s.name}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {monthDriverStats && (
                <div className="flex gap-4 text-sm flex-wrap">
                  <span className="text-success font-medium">Present: {monthDriverStats.present}</span>
                  <span className="text-destructive font-medium">Absent: {monthDriverStats.absent}</span>
                  <span className="text-warning font-medium">OT: {monthDriverStats.ot}</span>
                  <span className="font-bold">Total Duty: {monthDriverStats.totalDuty}</span>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => setShowReport(true)} disabled={!selectedDriver}><Eye className="h-4 w-4 mr-1" />View Report</Button>
                <Button size="sm" variant="outline" className="text-success" onClick={downloadCalendarJpg} disabled={!selectedDriver}><MessageCircle className="h-4 w-4 mr-1" />WA (JPG)</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Drivers + Custom Date */}
        {mode === 'all_drivers_custom' && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">All Drivers - Custom Date Range</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setShowReport(false); }} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setShowReport(false); }} className="h-9 text-sm" />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={downloadAllDriversExcel}><Download className="h-4 w-4 mr-1" />Excel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Display Report in System */}
        {showReport && mode === 'day' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Day Report - {dayDate} ({dayReportData.length} records)</CardTitle>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              <div className="overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-8">#</TableHead>
                      <TableHead className="text-xs">Driver</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Mobile</TableHead>
                      <TableHead className="text-xs">Vehicle</TableHead>
                      <TableHead className="text-xs">Shift</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dayReportData.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs py-1.5">{r.serial}</TableCell>
                        <TableCell className="text-xs font-medium py-1.5">{r.staffName}</TableCell>
                        <TableCell className="text-xs py-1.5 hidden sm:table-cell">{r.mobile}</TableCell>
                        <TableCell className="text-xs py-1.5">{r.vehicle}</TableCell>
                        <TableCell className="text-xs py-1.5 uppercase">{r.shift}</TableCell>
                        <TableCell className="py-1.5"><Badge variant="outline" className="text-[10px]">{r.statusLabel}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {dayReportData.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-xs">No records</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {showReport && mode === 'month_driver' && selectedDriver && (
          <div>
            <Card className="bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">{driverSearch} - {MONTHS[month]} {year}</CardTitle>
              </CardHeader>
              <CardContent className="px-3 md:px-6">
                {/* Calendar style view matching sample image */}
                <div className="grid grid-cols-7 gap-1.5 text-center mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="text-xs font-bold text-muted-foreground py-1.5">{d}</div>
                  ))}
                  {(() => {
                    const firstDay = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const cells: React.ReactNode[] = [];
                    for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} />);
                    for (let d = 1; d <= daysInMonth; d++) {
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      const dayRecs = monthDriverData.filter(r => r.date === dateStr);
                      const status = dayRecs.length > 0 ? dayRecs.map(r => r.statusLabel).join('/') : 'WO';
                      const bgColor = status.includes('P') ? 'bg-green-100 text-green-700 border-green-200' :
                        status.includes('A') && !status.includes('(A)') ? 'bg-red-100 text-red-600 border-red-200' :
                        status.includes('(A)') ? 'bg-red-100 text-red-600 border-red-200' :
                        status.includes('OT') ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-500 border-slate-200';
                      cells.push(
                        <div key={d} className={`rounded-xl p-2 border ${bgColor}`}>
                          <div className="text-sm font-bold">{d}</div>
                          <div className="text-[10px] font-semibold">{status}</div>
                        </div>
                      );
                    }
                    return cells;
                  })()}
                </div>
                {monthDriverStats && (
                  <div className="flex gap-4 text-sm flex-wrap border-t pt-3">
                    <span className="text-green-600 font-semibold">P: {monthDriverStats.present}</span>
                    <span className="text-red-500 font-semibold">A: {monthDriverStats.absent}</span>
                    <span className="text-amber-600 font-semibold">OT: {monthDriverStats.ot}</span>
                    <span className="font-bold text-foreground">Total Duty: {monthDriverStats.totalDuty}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
