import { useState, useMemo, useRef, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getStaffList } from '@/lib/storage';
import { Plus, Search, Paperclip, Trash2, BookOpen, AlertCircle } from 'lucide-react';

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

// Helper to manage log data in local storage
const getLogEntries = (): LogEntry[] => {
  try {
    return JSON.parse(localStorage.getItem('skl_logbook') || '[]');
  } catch {
    return [];
  }
};

const saveLogEntries = (entries: LogEntry[]) => {
  localStorage.setItem('skl_logbook', JSON.stringify(entries));
};

export default function DriverLogbook() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [staffList, setStaffList] = useState(getStaffList().sort((a, b) => a.name.localeCompare(b.name)));
  const [driverSearch, setDriverSearch] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedDriverName, setSelectedDriverName] = useState('');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryType, setEntryType] = useState('Late Coming');
  const [message, setMessage] = useState('');
  const [imageData, setImageData] = useState<string | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>([]);

  // Load entries on mount
  useEffect(() => {
    setEntries(getLogEntries());
  }, []);

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(driverSearch.toLowerCase()) || 
    s.mobile.includes(driverSearch)
  );

  const displayEntries = useMemo(() => {
    if (!selectedDriver) return [];
    return entries.filter(e => e.staffId === selectedDriver).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [entries, selectedDriver]);

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (limiting to 1MB for local storage safety)
    if (file.size > 1 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Please use an image under 1MB', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!selectedDriver || !message.trim()) {
      toast({ title: 'Missing Information', description: 'Select a driver and enter a message', variant: 'destructive' });
      return;
    }

    const entry: LogEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      date,
      staffId: selectedDriver,
      staffName: selectedDriverName,
      type: entryType,
      message: message.trim(),
      imageData,
      createdAt: new Date().toISOString(),
      createdBy: user?.displayName || user?.username || 'Supervisor',
    };

    const updated = [entry, ...entries];
    saveLogEntries(updated);
    setEntries(updated);
    
    toast({ title: 'Saved', description: 'Log entry added successfully' });
    setMessage('');
    setImageData(undefined);
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
      <div className="space-y-4 max-w-4xl mx-auto px-2">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="h-7 w-7 text-primary" />
          <h2 className="text-2xl font-bold">Driver Logbook (Staff Record)</h2>
        </div>

        {/* Driver Selection Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Select Driver</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search driver by name or phone..."
                value={driverSearch}
                onChange={e => {
                  setDriverSearch(e.target.value);
                  if (!e.target.value) { setSelectedDriver(''); setSelectedDriverName(''); }
                }}
                className="pl-9 h-11"
              />
              {driverSearch && !selectedDriver && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-xl max-h-60 overflow-auto">
                  {filteredStaff.map(s => (
                    <div 
                      key={s.id} 
                      className="px-4 py-3 hover:bg-primary/5 cursor-pointer border-b last:border-0 flex justify-between"
                      onClick={() => { 
                        setSelectedDriver(s.id); 
                        setDriverSearch(s.name); 
                        setSelectedDriverName(s.name); 
                      }}
                    >
                      <span className="font-bold uppercase text-sm">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.mobile}</span>
                    </div>
                  ))}
                  {filteredStaff.length === 0 && <div className="p-4 text-center text-muted-foreground">No driver found</div>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedDriver && (
          <>
            <div className="flex justify-between items-center">
              <Badge variant="secondary" className="px-3 py-1 uppercase">{selectedDriverName}</Badge>
              <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-2">
                {showForm ? 'Cancel' : <><Plus className="h-4 w-4" /> Add New Entry</>}
              </Button>
            </div>

            {showForm && (
              <Card className="border-primary/20 shadow-md animate-in fade-in slide-in-from-top-2">
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase">Incident Date</Label>
                      <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase">Category</Label>
                      <select 
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={entryType} 
                        onChange={e => setEntryType(e.target.value)}
                      >
                        {LOG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase">Details</Label>
                    <Textarea 
                      placeholder="Explain the incident or issue..." 
                      value={message} 
                      onChange={e => setMessage(e.target.value)} 
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="flex items-center justify-between border-t pt-4">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip className="h-4 w-4 mr-1" /> Attachment
                      </Button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageAttach} />
                      {imageData && (
                        <div className="relative group">
                          <img src={imageData} alt="preview" className="h-10 w-10 object-cover rounded border" />
                          <button 
                            onClick={() => setImageData(undefined)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                          >✕</button>
                        </div>
                      )}
                    </div>
                    <Button onClick={handleSave}>Save Record</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Entry List */}
            <div className="space-y-3">
              {displayEntries.length === 0 ? (
                <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                  <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No records found for this driver.</p>
                </div>
              ) : (
                displayEntries.map(entry => (
                  <Card key={entry.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-primary/10 text-primary border-none text-[10px] uppercase font-bold">
                            {entry.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-medium">{entry.date}</span>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(entry.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <p className="text-sm leading-relaxed">{entry.message}</p>
                      {entry.imageData && (
                        <div className="mt-2">
                          <img 
                            src={entry.imageData} 
                            alt="Log attachment" 
                            className="max-h-60 rounded-lg border cursor-pointer hover:opacity-90"
                            onClick={() => window.open(entry.imageData, '_blank')} 
                          />
                        </div>
                      )}
                      <div className="pt-2 border-t flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">Recorded by: {entry.createdBy}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(entry.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}

        {!selectedDriver && (
          <div className="py-20 text-center space-y-3 opacity-50">
            <Search className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Search and select a driver to view or add log entries.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
