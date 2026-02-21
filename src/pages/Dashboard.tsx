import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ClipboardCheck, Truck, Users, Clock, RotateCcw, TrendingUp, Shield } from 'lucide-react';
import { getShiftAttendance } from '@/lib/storage';
import seaportImg from '@/assets/seaport.jpg';
import gradientLogo from '@/assets/vizhinjam-gradient-logo.webp';

export default function Dashboard() {
  const { user, shift } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const [profileImage, setProfileImage] = useState('');

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

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden h-44 md:h-64 shadow-xl">
          <img src={seaportImg} alt="Vizhinjam Seaport" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col items-center justify-center p-4">
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
              <p className="text-xs text-warning-foreground/80 font-medium">Extra Duty</p>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <Button onClick={() => navigate('/attendance')} className="h-16 md:h-20 flex-col gap-1 text-xs md:text-sm shadow-md" variant="outline">
            <ClipboardCheck className="h-5 w-5 md:h-6 md:w-6 text-success" /> <span>Attendance</span>
          </Button>
          <Button onClick={() => navigate('/job-allotment')} className="h-16 md:h-20 flex-col gap-1 text-xs md:text-sm shadow-md" variant="outline">
            <Truck className="h-5 w-5 md:h-6 md:w-6 text-info" /> <span>Job Allotment</span>
          </Button>
          <Button onClick={() => navigate('/attendance?repeat=1')} className="h-16 md:h-20 flex-col gap-1 text-xs shadow-md" variant="outline">
            <RotateCcw className="h-5 w-5 md:h-6 md:w-6 text-warning" /> <span>Repeat Attendance</span>
          </Button>
          <Button onClick={() => navigate('/job-allotment?repeat=1')} className="h-16 md:h-20 flex-col gap-1 text-xs shadow-md" variant="outline">
            <RotateCcw className="h-5 w-5 md:h-6 md:w-6 text-accent" /> <span>Repeat Job Allot</span>
          </Button>
        </div>
      </div>
    </Layout>
  );
}