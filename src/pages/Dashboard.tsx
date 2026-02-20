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
      <div className="space-y-6">
        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden h-52 md:h-72 shadow-xl">
          <img src={seaportImg} alt="Vizhinjam Seaport" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/50 to-transparent flex items-end p-6 md:p-8">
            <div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-primary-foreground tracking-tight drop-shadow-lg">
                VIZHINJAM INTERNATIONAL SEAPORT
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className="bg-secondary/80 text-secondary-foreground px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    {profileImage ? <AvatarImage src={profileImage} alt={user?.displayName} /> : null}
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">{(user?.displayName || '?')[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {user?.displayName}
                </span>
                <span className="bg-accent/80 text-accent-foreground px-3 py-1 rounded-full text-sm font-medium capitalize">
                  {shift} Shift
                </span>
                <span className="bg-primary-foreground/20 text-primary-foreground px-3 py-1 rounded-full text-sm">
                  {today}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-success/90 to-success border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-5 flex flex-col items-center text-center">
              <Users className="h-8 w-8 text-success-foreground mb-2" />
              <p className="text-4xl font-black text-success-foreground">{present}</p>
              <p className="text-sm text-success-foreground/80 font-medium">Present</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-destructive/90 to-destructive border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-5 flex flex-col items-center text-center">
              <Clock className="h-8 w-8 text-destructive-foreground mb-2" />
              <p className="text-4xl font-black text-destructive-foreground">{absent}</p>
              <p className="text-sm text-destructive-foreground/80 font-medium">Absent</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-warning/90 to-warning border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-5 flex flex-col items-center text-center">
              <TrendingUp className="h-8 w-8 text-warning-foreground mb-2" />
              <p className="text-4xl font-black text-warning-foreground">{overtime}</p>
              <p className="text-sm text-warning-foreground/80 font-medium">Extra Duty</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-info/90 to-info border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-5 flex flex-col items-center text-center">
              <Shield className="h-8 w-8 text-info-foreground mb-2" />
              <p className="text-4xl font-black text-info-foreground">{total}</p>
              <p className="text-sm text-info-foreground/80 font-medium">Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button onClick={() => navigate('/attendance')} className="h-20 flex-col gap-2 shadow-md hover:shadow-lg transition-shadow" variant="outline">
            <ClipboardCheck className="h-6 w-6 text-success" /> <span>Attendance</span>
          </Button>
          <Button onClick={() => navigate('/job-allotment')} className="h-20 flex-col gap-2 shadow-md hover:shadow-lg transition-shadow" variant="outline">
            <Truck className="h-6 w-6 text-info" /> <span>Job Allotment</span>
          </Button>
          <Button onClick={() => navigate('/attendance?repeat=1')} className="h-20 flex-col gap-2 text-xs shadow-md hover:shadow-lg transition-shadow" variant="outline">
            <RotateCcw className="h-6 w-6 text-warning" /> <span>Repeat Attendance</span>
          </Button>
          <Button onClick={() => navigate('/job-allotment?repeat=1')} className="h-20 flex-col gap-2 text-xs shadow-md hover:shadow-lg transition-shadow" variant="outline">
            <RotateCcw className="h-6 w-6 text-accent" /> <span>Repeat Job Allot</span>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
