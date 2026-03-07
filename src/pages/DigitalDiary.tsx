import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { CalendarIcon, Save, Trash2, BookOpenText, History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'skl_diary';

// Helper functions for Local Storage
const getEntries = (): DiaryEntry[] => {
  try { 
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); 
  } catch { 
    return []; 
  }
};

const saveEntries = (entries: DiaryEntry[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

export default function DigitalDiary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [content, setContent] = useState('');
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [existingEntry, setExistingEntry] = useState<DiaryEntry | null>(null);

  const dateKey = format(selectedDate, 'yyyy-MM-dd');

  // Load all entries on mount
  useEffect(() => {
    setEntries(getEntries());
  }, []);

  // Update content when selected date changes
  useEffect(() => {
    const entry = entries.find(e => e.date === dateKey);
    setExistingEntry(entry || null);
    setContent(entry?.content || '');
  }, [dateKey, entries]);

  const handleSave = () => {
    if (!content.trim()) {
      toast({ 
        title: 'Empty Note', 
        description: 'Please write something before saving.', 
        variant: 'destructive' 
      });
      return;
    }

    const all = getEntries();
    const now = new Date().toISOString();

    if (existingEntry) {
      const updated = all.map(e => 
        e.id === existingEntry.id ? { ...e, content: content.trim(), updatedAt: now } : e
      );
      saveEntries(updated);
      setEntries(updated);
      toast({ title: 'Success', description: 'Diary entry updated.' });
    } else {
      const newEntry: DiaryEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        date: dateKey,
        content: content.trim(),
        createdBy: user?.username || 'user',
        createdAt: now,
        updatedAt: now,
      };
      const updated = [newEntry, ...all];
      saveEntries(updated);
      setEntries(updated);
      toast({ title: 'Success', description: 'Diary entry saved.' });
    }
  };

  const handleDelete = () => {
    const updated = entries.filter(e => e.id !== existingEntry?.id);
    saveEntries(updated);
    setEntries(updated);
    setContent('');
    toast({ title: 'Deleted', description: 'Diary entry removed.' });
  };

  // Dates to highlight on calendar
  const entryDates = entries.map(e => new Date(e.date));

  // Sort entries for the sidebar
  const recentEntries = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  return (
    <Layout>
      <div className="space-y-4 max-w-6xl mx-auto px-2">
        <div className="flex items-center gap-3 mb-2">
          <BookOpenText className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">Digital Diary (Supervisor Notes)</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editor Section */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-4 border-b bg-muted/20">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-lg font-bold">
                    {format(selectedDate, 'EEEE, dd MMMM yyyy')}
                  </CardTitle>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 border-primary/20">
                        <CalendarIcon className="h-4 w-4 mr-2 text-primary" />
                        Select Date
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(d) => d && setSelectedDate(d)}
                        className="p-3"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <Textarea
                  placeholder="Note down daily events, supervisor instructions, or truck-related issues..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[350px] text-base leading-relaxed p-4 focus-visible:ring-primary"
                />
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} className="gap-2 px-6">
                    <Save className="h-4 w-4" />
                    {existingEntry ? 'Update Note' : 'Save Note'}
                  </Button>
                  {existingEntry && (
                    <Button variant="outline" onClick={handleDelete} className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/5">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Sidebar Section */}
          <div className="space-y-4">
            <Card className="shadow-sm sticky top-4">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <History className="h-4 w-4" /> Recent Entries
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {recentEntries.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    No diary entries recorded.
                  </div>
                ) : (
                  recentEntries.map(entry => (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedDate(new Date(entry.date))}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all hover:shadow-sm",
                        entry.date === dateKey 
                          ? "bg-primary/5 border-primary ring-1 ring-primary/20" 
                          : "bg-background hover:border-primary/30"
                      )}
                    >
                      <p className="text-xs font-bold text-primary mb-1">
                        {format(new Date(entry.date), 'dd MMM yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {entry.content}
                      </p>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
