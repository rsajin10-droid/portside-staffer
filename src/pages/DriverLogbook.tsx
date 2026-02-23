import { useState, useMemo, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getStaffList, type Staff } from '@/lib/storage';
import { Plus, Search, Paperclip, Trash2, Image as ImageIcon } from 'lucide-react';

interface LogEntry {
  id: string;
  date: string;
  staffId: string;
  staffName: string;
  type: string;
  message: string;
  imageData?: string;
  createdAt: string;
  createdBy: string;
}

const LOG_TYPES = ['Late Coming', 'Early Leaving', 'Misconduct', 'Vehicle Issue', 'Accident', 'Other'];

const getLogEntries = (): LogEntry[] => {
  try { return JSON.parse(localStorage.getItem('skl_logbook') || '[]'); } catch { return []; }
};
const saveLogEntries = (entries: LogEntry[]) => localStorage.setItem('skl_logbook', JSON.stringify(entries));

export default function DriverLogbook() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const staffList = getStaffList().sort((a, b) => a.name.localeCompare(b.name));

  // Create entry state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [driverSearch, setDriverSearch] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [entryType, setEntryType] = useState('Late Coming');
  const [message, setMessage] = useState('');
  const [imageData, setImageData] = useState<string | undefined>();
  const [showForm, setShowForm] = useState(false);

  // Filter state
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDriver, setFilterDriver] = useState('');

  const [entries, setEntries] = useState<LogEntry[]>(getLogEntries());

  const filteredStaff = staffList.filter(s => s.name.toLowerCase().includes(driverSearch.toLowerCase()));
  const filteredFilterStaff = staffList.filter(s => s.name.toLowerCase().includes(filterSearch.toLowerCase()));

  const displayEntries = useMemo(() => {
    let result = entries;
    if (filterDriver) result = result.filter(e => e.staffId === filterDriver);
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [entries, filterDriver]);

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image too large (max 5MB)', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!selectedDriver || !message.trim()) {
      toast({ title: 'Select driver and enter message', variant: 'destructive' });
      return;
    }
    const staff = staffList.find(s => s.id === selectedDriver);
    if (!staff) return;
    const entry: LogEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      date,
      staffId: staff.id,
      staffName: staff.name,
      type: entryType,
      message: message.trim(),
      imageData,
      createdAt: new Date().toISOString(),
      createdBy: user?.displayName || '',
    };
    const updated = [...entries, entry];
    saveLogEntries(updated);
    setEntries(updated);
    toast({ title: 'Log entry saved' });
    setMessage('');
    setImageData(undefined);
    setSelectedDriver('');
    setDriverSearch('');
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    saveLogEntries(updated);
    setEntries(updated);
    toast({ title: 'Entry deleted' });
  };

  return (
    <Layout>
      <div className="space-y-4 max-w-4xl mx-auto px-1">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold">Driver Logbook</h2>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" />{showForm ? 'Cancel' : 'New Entry'}
          </Button>
        </div>

        {showForm && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3"><CardTitle className="text-base">Create Entry</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <select className="w-full h-9 text-sm rounded-md border border-input bg-background px-3" value={entryType} onChange={e => setEntryType(e.target.value)}>
                    {LOG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Driver Name</Label>
                <Input placeholder="Search driver..." value={driverSearch}
                  onChange={e => { setDriverSearch(e.target.value); setSelectedDriver(''); }}
                  className="h-9 text-sm" />
                {driverSearch && !selectedDriver && (
                  <div className="border rounded-md max-h-40 overflow-auto bg-popover z-50 relative shadow-lg">
                    {filteredStaff.map(s => (
                      <div key={s.id} className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                        onClick={() => { setSelectedDriver(s.id); setDriverSearch(s.name); }}>{s.name} - {s.mobile}</div>
                    ))}
                    {filteredStaff.length === 0 && <div className="px-3 py-2 text-muted-foreground text-sm">No driver found</div>}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Message</Label>
                <Textarea placeholder="Enter details..." value={message} onChange={e => setMessage(e.target.value)} className="text-sm min-h-[80px]" />
              </div>
              <div className="flex items-center gap-3">
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="h-4 w-4 mr-1" />Attach Image
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageAttach} />
                {imageData && (
                  <div className="flex items-center gap-2">
                    <img src={imageData} alt="attachment" className="h-10 w-10 object-cover rounded border" />
                    <Button size="sm" variant="ghost" onClick={() => setImageData(undefined)}>✕</Button>
                  </div>
                )}
              </div>
              <Button size="sm" onClick={handleSave}>Save Entry</Button>
            </CardContent>
          </Card>
        )}

        {/* Filter */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 pb-3">
            <CardTitle className="text-base">Log Entries ({displayEntries.length})</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Input placeholder="Filter by driver..." value={filterSearch}
                  onChange={e => { setFilterSearch(e.target.value); if (!e.target.value) setFilterDriver(''); }}
                  className="w-40 h-8 text-xs" />
                {filterSearch && !filterDriver && (
                  <div className="border rounded-md max-h-40 overflow-auto bg-popover z-50 absolute shadow-lg w-48">
                    <div className="px-3 py-2 hover:bg-muted cursor-pointer text-xs font-medium text-primary"
                      onClick={() => { setFilterDriver(''); setFilterSearch(''); }}>Show All</div>
                    {filteredFilterStaff.map(s => (
                      <div key={s.id} className="px-3 py-2 hover:bg-muted cursor-pointer text-xs"
                        onClick={() => { setFilterDriver(s.id); setFilterSearch(s.name); }}>{s.name}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 md:px-6">
            <div className="space-y-3">
              {displayEntries.map(entry => (
                <div key={entry.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{entry.staffName}</span>
                      <Badge variant="outline" className="text-[10px]">{entry.type}</Badge>
                      <span className="text-[10px] text-muted-foreground">{entry.date}</span>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(entry.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <p className="text-xs text-foreground/80">{entry.message}</p>
                  {entry.imageData && (
                    <img src={entry.imageData} alt="attachment" className="max-h-40 rounded-md border cursor-pointer"
                      onClick={() => window.open(entry.imageData, '_blank')} />
                  )}
                  <p className="text-[10px] text-muted-foreground">By {entry.createdBy} • {new Date(entry.createdAt).toLocaleString()}</p>
                </div>
              ))}
              {displayEntries.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">No log entries found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
