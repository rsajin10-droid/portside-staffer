import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Truck, Users, Clock, RotateCcw } from 'lucide-react';
import { getShiftAttendance } from '@/lib/storage';
import seaportImg from '@/assets/seaport.jpg';

export default function Dashboard() {
  const { user, shift } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const shiftAtt = getShiftAttendance(today, shift);

  const present = shiftAtt.filter(a => a.status === 'present' || a.status === 'dcd' || a.status === 'dcn').length;
  const absent = shiftAtt.filter(a => a.status === 'absent').length;
  const overtime = shiftAtt.filter(a => a.status === 'extra_duty').length;

  const stats = [
    { label: 'Present', value: present, color: 'bg-success text-success-foreground', icon: Users },
    { label: 'Absent', value: absent, color: 'bg-destructive text-destructive-foreground', icon: Clock },
    { label: 'Extra Duty', value: overtime, color: 'bg-warning text-warning-foreground', icon: Clock },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Hero */}
        <div className="relative rounded-xl overflow-hidden h-48 md:h-64">
          <img src={seaportImg} alt="Vizhinjam Seaport" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-primary/60 flex items-center justify-center flex-col">
            <h1 className="text-2xl md:text-4xl font-bold text-primary-foreground">VIZHINJAM INTERNATIONAL SEAPORT</h1>
            <p className="text-primary-foreground/80 mt-2">Welcome, {user?.displayName} | {shift.toUpperCase()} Shift | {today}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(s => (
            <Card key={s.label} className={`${s.color} border-0`}>
              <CardContent className="p-4 flex items-center gap-4">
                <s.icon className="h-8 w-8 opacity-80" />
                <div>
                  <p className="text-3xl font-bold">{s.value}</p>
                  <p className="text-sm opacity-80">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button onClick={() => navigate('/attendance')} className="h-20 flex-col gap-2" variant="outline">
            <ClipboardCheck className="h-6 w-6" /> Attendance
          </Button>
          <Button onClick={() => navigate('/job-allotment')} className="h-20 flex-col gap-2" variant="outline">
            <Truck className="h-6 w-6" /> Job Allotment
          </Button>
          <Button onClick={() => navigate('/attendance?repeat=1')} className="h-20 flex-col gap-2 text-xs" variant="outline">
            <RotateCcw className="h-6 w-6" /> Repeat Last Attendance
          </Button>
          <Button onClick={() => navigate('/job-allotment?repeat=1')} className="h-20 flex-col gap-2 text-xs" variant="outline">
            <RotateCcw className="h-6 w-6" /> Repeat Last Job Allot
          </Button>
        </div>
      </div>
    </Layout>
  );
}
