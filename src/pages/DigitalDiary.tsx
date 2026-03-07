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
import { CalendarIcon, Save, Trash2, BookOpenText } from 'lucide-react';
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

const getEntries = (): DiaryEntry[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};
const saveEntries = (entries: DiaryEntry[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));

export default function DigitalDiary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [content, setContent] = useState('');
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [existingEntry, setExistingEntry] = useState<DiaryEntry | null>(null);

  const dateKey = format(selectedDate, 'yyyy-MM-dd');

  useEffect(() => {
    const all = getEntries();
    setEntries(all);
  }, []);

  useEffect(() => {
    const entry = entries.find(e => e.date === dateKey);
    setExistingEntry(entry || null);
    setContent(entry?.content || '');
  }, [dateKey, entries]);

  const handleSave = () => {
    if (!content.trim()) {
      toast({ title: 'Empty note', description: 'Please write something before saving.', variant: 'destructive' });
      return;
    }
    const all = getEntries();
    const now = new Date().toISOString();
    if (existingEntry) {
      const updated = all.map(e => e.id === existingEntry.id ? { ...e, content: content.trim(), updatedAt: now } : e);
      saveEntries(updated);
      setEntries(updated);
      toast({ title: 'Note updated', description: `Diary entry for ${format(selectedDate, 'dd MMM yyyy')} updated.` });
    } else {
      const newEntry: DiaryEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        date: dateKey,
        content: content.trim(),
        createdBy: user?.id || '',
        createdAt: now,
        updatedAt: now,
      };
      const updated = [...all, newEntry];
      saveEntries(updated);
      setEntries(updated);
      toast({ title: 'Note saved', description: `Diary entry for ${format(selectedDate, 'dd MMM yyyy')} saved.` });
    }
  };

  const handleDelete = () => {
    if (!existingEntry) return;
    const updated = getEntries().filter(e => e.id !== existingEntry.id);
    saveEntries(updated);
    setEntries(updated);
    setContent('');
    toast({ title: 'Note deleted', description: `Diary entry for ${format(selectedDate, 'dd MMM yyyy')} removed.` });
  };

  // Dates that have entries (for calendar highlighting)
  const entryDates = entries.map(e => new Date(e.date + 'T00:00:00'));

  // Recent entries for quick access
  const recentEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <BookOpenText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Digital Diary</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main editor */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg">
                    {format(selectedDate, 'EEEE, dd MMMM yyyy')}
                  </CardTitle>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal")}>
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Change Date
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(d) => d && setSelectedDate(d)}
                        modifiers={{ hasEntry: entryDates }}
                        modifiersStyles={{ hasEntry: { fontWeight: 'bold', textDecoration: 'underline' } }}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {existingEntry && (
                  <p className="text-xs text-muted-foreground">
                    Last edited: {format(new Date(existingEntry.updatedAt), 'dd MMM yyyy, hh:mm a')}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Write your daily notes here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[250px] resize-y"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="gap-2">
                    <Save className="h-4 w-4" />
                    {existingEntry ? 'Update' : 'Save'}
                  </Button>
                  {existingEntry && (
                    <Button variant="destructive" onClick={handleDelete} className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent entries sidebar */}
          <div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Recent Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No diary entries yet.</p>
                ) : (
                  recentEntries.map(entry => (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedDate(new Date(entry.date + 'T00:00:00'))}
                      className={cn(
                        "w-full text-left p-2 rounded-md border transition-colors hover:bg-accent",
                        entry.date === dateKey && "bg-accent border-primary"
                      )}
                    >
                      <p className="text-xs font-medium">{format(new Date(entry.date + 'T00:00:00'), 'dd MMM yyyy, EEEE')}</p>
                      <p className="text-xs text-muted-foreground truncate">{entry.content}</p>
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
