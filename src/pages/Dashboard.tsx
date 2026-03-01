import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ClipboardCheck, Truck, Users, Clock, TrendingUp, Shield, Plus, Trash2, CalendarDays } from 'lucide-react';
import { getShiftAttendance } from '@/lib/storage';
import seaportImg from '@/assets/seaport.jpg';
import gradientLogo from '@/assets/vizhinjam-gradient-logo.webp';

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  date: string;
}

const getTodos = (): TodoItem[] => {
  try { return JSON.parse(localStorage.getItem('skl_todos') || '[]'); } catch { return []; }
};
const saveTodos = (items: TodoItem[]) => localStorage.setItem('skl_todos', JSON.stringify(items));

export default function Dashboard() {
  const { user, shift } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const [profileImage, setProfileImage] = useState('');
  const [selectedDate, setSelectedDate] = useState(today);
  const [todos, setTodos] = useState<TodoItem[]>(getTodos());
  const [newTodo, setNewTodo] = useState('');

  useEffect(() => {
    if (user) {
      try {
        const p = JSON.parse(localStorage.getItem(`skl_profile_${user.id}`) || '{}');
        setProfileImage(p.profileImage || '');
      } catch {}
    }
  }, [user]);
  
  const shiftAtt = getShiftAttendance(today, shift);
  const present = shiftAtt.filter(a => a.status === 'present' || a.status === 'dcd' || a.status === 'dcn').length;
  const absent = shiftAtt.filter(a => a.status === 'absent').length;
  const overtime = shiftAtt.filter(a => a.status === 'extra_duty').length;
  const total = shiftAtt.length;

  const dateTodos = todos.filter(t => t.date === selectedDate);

  const addTodo = () => {
    if (!newTodo.trim()) return;
    const updated = [...todos, { id: Date.now().toString(36), text: newTodo.trim(), done: false, date: selectedDate }];
    saveTodos(updated);
    setTodos(updated);
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    const updated = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    saveTodos(updated);
    setTodos(updated);
  };

  const deleteTodo = (id: string) => {
    const updated = todos.filter(t => t.id !== id);
    saveTodos(updated);
    setTodos(updated);
  };

  // Generate mini calendar for current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const startDay = monthStart.getDay(); // 0=Sun
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const getDateStr = (day: number) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const hasTodos = (day: number) => todos.some(t => t.date === getDateStr(day));

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden h-44 md:h-64 shadow-xl">
          <img src={seaportImg} alt="Vizhinjam Seaport" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-start justify-start p-3 md:p-4">
            <img src={gradientLogo} alt="Vizhinjam International Seaport" className="h-16 md:h-28 object-contain drop-shadow-lg" />
          </div>
        </div>

        {/* User Info Bar */}
        <div className="flex flex-wrap items-center gap-2 px-1">
          <Avatar className="h-10 w-10 border-2 border-primary">
            {profileImage ? <AvatarImage src={profileImage} alt={user?.displayName} /> : null}
            <AvatarFallback className="text-sm bg-primary text-primary-foreground font-bold">{(user?.displayName || '?')[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="font-semibold text-foreground">{user?.displayName}</span>
          <span className="bg-accent/80 text-accent-foreground px-2.5 py-0.5 rounded-full text-xs font-medium capitalize">
            {shift} Shift
          </span>
          <span className="bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full text-xs">
            {today}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-success/90 to-success border-0 shadow-lg">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Users className="h-6 w-6 md:h-8 md:w-8 text-success-foreground mb-1" />
              <p className="text-3xl md:text-4xl font-black text-success-foreground">{present}</p>
              <p className="text-xs text-success-foreground/80 font-medium">Present</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-destructive/90 to-destructive border-0 shadow-lg">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Clock className="h-6 w-6 md:h-8 md:w-8 text-destructive-foreground mb-1" />
              <p className="text-3xl md:text-4xl font-black text-destructive-foreground">{absent}</p>
              <p className="text-xs text-destructive-foreground/80 font-medium">Absent</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-warning/90 to-warning border-0 shadow-lg">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-warning-foreground mb-1" />
              <p className="text-3xl md:text-4xl font-black text-warning-foreground">{overtime}</p>
              <p className="text-xs text-warning-foreground/80 font-medium">Overtime</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-info/90 to-info border-0 shadow-lg">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Shield className="h-6 w-6 md:h-8 md:w-8 text-info-foreground mb-1" />
              <p className="text-3xl md:text-4xl font-black text-info-foreground">{total}</p>
              <p className="text-xs text-info-foreground/80 font-medium">Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <Button onClick={() => navigate('/attendance')} className="h-16 md:h-20 flex-col gap-1 text-xs md:text-sm shadow-md" variant="outline">
            <ClipboardCheck className="h-5 w-5 md:h-6 md:w-6 text-success" /> <span>Attendance</span>
          </Button>
          <Button onClick={() => navigate('/job-allotment')} className="h-16 md:h-20 flex-col gap-1 text-xs md:text-sm shadow-md" variant="outline">
            <Truck className="h-5 w-5 md:h-6 md:w-6 text-info" /> <span>Job Allotment</span>
          </Button>
        </div>

        {/* Calendar + Todo */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              {monthName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Mini Calendar */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                if (day === null) return <div key={`e-${i}`} />;
                const dateStr = getDateStr(day);
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                const has = hasTodos(day);
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`relative text-xs py-1.5 rounded-lg font-medium transition-all
                      ${isSelected ? 'bg-primary text-primary-foreground shadow-md scale-110' : 
                        isToday ? 'bg-accent text-accent-foreground' : 
                        'hover:bg-muted'}
                    `}
                  >
                    {day}
                    {has && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-warning" />}
                  </button>
                );
              })}
            </div>

            {/* Todo for selected date */}
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                To-Do — {new Date(selectedDate + 'T00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Add task..."
                  value={newTodo}
                  onChange={e => setNewTodo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTodo()}
                  className="h-8 text-xs flex-1"
                />
                <Button size="sm" className="h-8 px-2" onClick={addTodo}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-1 max-h-40 overflow-auto">
                {dateTodos.map(t => (
                  <div key={t.id} className="flex items-center gap-2 group">
                    <input type="checkbox" checked={t.done} onChange={() => toggleTodo(t.id)} className="rounded" />
                    <span className={`text-xs flex-1 ${t.done ? 'line-through text-muted-foreground' : ''}`}>{t.text}</span>
                    <button onClick={() => deleteTodo(t.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                ))}
                {dateTodos.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-2">No tasks for this day</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
