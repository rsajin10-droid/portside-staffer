import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  getStaffList, 
  getAttendance, 
  addAttendance, 
  deleteAttendance, 
  AttendanceRecord, 
  Staff 
} from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  UserCheck, 
  UserX, 
  Trash2, 
  Moon, 
  Sun,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

const Attendance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentShift, setCurrentShift] = useState<'day' | 'night'>('day');
  const [staffSearch, setStaffSearch] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [withDCD, setWithDCD] = useState(false);
  const [withDCN, setWithDCN] = useState(false);

  // Load data on component mount and when date/shift changes
  useEffect(() => {
    refreshData();
  }, [date, currentShift]);

  const refreshData = () => {
    const allRecords = getAttendance();
    // Filter records for the selected date and shift
    const filtered = allRecords.filter(r => r.date === date && r.shift === currentShift);
    setRecords(filtered);
    setStaffList(getStaffList());
  };

  // Search filter for staff list
  const filteredStaff = useMemo(() => {
    if (!staffSearch) return [];
    return staffList.filter(s => 
      s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.mobile.includes(staffSearch)
    );
  }, [staffSearch, staffList]);

  const selectedStaffItem = staffList.find(s => s.id === selectedStaff);

  const handleMarkAttendance = (status: 'present' | 'absent') => {
    if (!selectedStaffItem) {
      toast({ title: "Please select a driver", variant: "destructive" });
      return;
    }

    let finalStatus: any = status;
    let subStatus: any = null;

    // Logic for DCD/DCN flags
    if (status === 'present') {
      if (withDCD) finalStatus = 'dcd';
      else if (withDCN) finalStatus = 'dcn';
    } else {
      if (withDCD) subStatus = 'dcd';
      else if (withDCN) subStatus = 'dcn';
    }

    const res = addAttendance({
      date,
      shift: currentShift,
      staffId: selectedStaffItem.id,
      staffName: selectedStaffItem.name,
      mobile: selectedStaffItem.mobile,
      status: finalStatus,
      subStatus,
      createdBy: user?.displayName || user?.username || 'Supervisor'
    });

    if (res) {
      toast({ title: `${selectedStaffItem.name} marked as ${finalStatus}` });
      setSelectedStaff('');
      setStaffSearch('');
      setWithDCD(false);
      setWithDCN(false);
      refreshData();
    } else {
      toast({ 
        title: "Already marked", 
        description: "This driver is already marked for this shift", 
        variant: "destructive" 
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteAttendance(id);
    refreshData();
    toast({ title: "Record deleted" });
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" /> Attendance
          </h2>
          <p className="text-sm text-muted-foreground">Manage daily driver attendance</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
          <div className="flex border rounded-md p-1 bg-muted">
            <Button
              variant={currentShift === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentShift('day')}
              className="gap-2"
            >
              <Sun className="w-4 h-4" /> Day
            </Button>
            <Button
              variant={currentShift === 'night' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentShift('night')}
              className="gap-2"
            >
              <Moon className="w-4 h-4" /> Night
            </Button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Entry Form Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
          <h3 className="font-semibold flex items-center gap-2">Mark Attendance</h3>
          
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search driver name or mobile..."
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              className="pl-9"
            />
            {staffSearch && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredStaff.map(s => (
                  <div
                    key={s.id}
                    className="p-3 hover:bg-muted cursor-pointer flex justify-between items-center border-b last:border-0"
                    onClick={() => {
                      setSelectedStaff(s.id);
                      setStaffSearch(s.name);
                    }}
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.mobile}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedStaffItem && (
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 animate-in fade-in zoom-in duration-200">
              <p className="text-sm font-medium text-primary mb-3">Selected: {selectedStaffItem.name}</p>
              
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={withDCD} 
                    onChange={(e) => { setWithDCD(e.target.checked); if(e.target.checked) setWithDCN(false); }}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">With DCD</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={withDCN} 
                    onChange={(e) => { setWithDCN(e.target.checked); if(e.target.checked) setWithDCD(false); }}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">With DCN</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => handleMarkAttendance('present')} className="bg-green-600 hover:bg-green-700 gap-2">
                  <UserCheck className="w-4 h-4" /> Present
                </Button>
                <Button onClick={() => handleMarkAttendance('absent')} variant="destructive" className="gap-2">
                  <UserX className="w-4 h-4" /> Absent
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Attendance List Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Records ({records.length})</h3>
            <span className="text-xs text-muted-foreground">{format(new Date(date), 'dd MMM yyyy')} - {currentShift.toUpperCase()}</span>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-auto pr-2">
            {records.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p>No records found</p>
              </div>
            ) : (
              records.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border group">
                  <div>
                    <p className="font-medium text-sm">{r.staffName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        r.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {r.status}
                      </span>
                      {r.subStatus && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase">
                          {r.subStatus}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(r.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
                          
