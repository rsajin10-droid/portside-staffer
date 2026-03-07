import { supabase } from './supabase';

// ─── Types ───
export interface SupabaseAttendance {
  id: string;
  date: string;
  shift: string;
  staff_id?: string;
  staff_name: string;
  mobile: string;
  status: string;
  sub_status?: string | null;
  vehicle_number?: string | null;
  created_by: string;
  created_at?: string;
}

export interface SupabaseJob {
  id: string;
  date: string;
  shift: string;
  vehicle_number: string;
  staff_id?: string;
  staff_name: string;
  mobile: string;
  created_by: string;
  created_at?: string;
}

export interface SupabaseDriver {
  id?: string;
  name: string;
  phone_number: string;
  password?: string;
  created_at?: string;
}

export interface SupabaseLeaveRequest {
  id: string;
  driver_name: string;
  leave_date: string;
  reason: string;
  status: string;
  created_at: string;
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ─── Helper: checks if user is admin ───
export const isAdmin = (username?: string) => username === 'appadmin';

// ─── Attendance CRUD ───
export const fetchAttendance = async (date: string, shift: string, createdBy?: string, isAdminUser = false) => {
  let query = supabase.from('attendance').select('*').eq('date', date).eq('shift', shift);
  if (!isAdminUser && createdBy) {
    query = query.eq('created_by', createdBy);
  }
  const { data, error } = await query.order('created_at', { ascending: true });
  if (error) { console.error('Fetch attendance error:', error.message); return []; }
  return (data || []) as SupabaseAttendance[];
};

export const fetchAllAttendance = async (createdBy?: string, isAdminUser = false) => {
  let query = supabase.from('attendance').select('*');
  if (!isAdminUser && createdBy) {
    query = query.eq('created_by', createdBy);
  }
  const { data, error } = await query.order('created_at', { ascending: true });
  if (error) { console.error('Fetch all attendance error:', error.message); return []; }
  return (data || []) as SupabaseAttendance[];
};

export const insertAttendance = async (record: Omit<SupabaseAttendance, 'id' | 'created_at'>) => {
  const id = uid();
  const { data, error } = await supabase.from('attendance').insert({ ...record, id }).select().single();
  if (error) { console.error('Insert attendance error:', error.message); return null; }
  return data as SupabaseAttendance;
};

export const updateAttendanceRecord = async (id: string, updates: Partial<SupabaseAttendance>) => {
  const { error } = await supabase.from('attendance').update(updates).eq('id', id);
  if (error) console.error('Update attendance error:', error.message);
  return !error;
};

export const deleteAttendanceRecord = async (id: string) => {
  const { error } = await supabase.from('attendance').delete().eq('id', id);
  if (error) console.error('Delete attendance error:', error.message);
  return !error;
};

// Check duplicate attendance
export const checkAttendanceDuplicate = async (date: string, shift: string, staffId: string) => {
  const { data } = await supabase.from('attendance').select('id').eq('date', date).eq('shift', shift).eq('staff_id', staffId).limit(1);
  return (data && data.length > 0);
};

// ─── Jobs CRUD ───
export const fetchJobs = async (date: string, shift: string, createdBy?: string, isAdminUser = false) => {
  let query = supabase.from('jobs').select('*').eq('date', date).eq('shift', shift);
  if (!isAdminUser && createdBy) {
    query = query.eq('created_by', createdBy);
  }
  const { data, error } = await query.order('vehicle_number', { ascending: true });
  if (error) { console.error('Fetch jobs error:', error.message); return []; }
  return (data || []) as SupabaseJob[];
};

export const insertJob = async (record: Omit<SupabaseJob, 'id' | 'created_at'>) => {
  const id = uid();
  const { data, error } = await supabase.from('jobs').insert({ ...record, id }).select().single();
  if (error) { console.error('Insert job error:', error.message); return null; }
  return data as SupabaseJob;
};

export const updateJobRecord = async (id: string, updates: Partial<SupabaseJob>) => {
  const { error } = await supabase.from('jobs').update(updates).eq('id', id);
  if (error) console.error('Update job error:', error.message);
  return !error;
};

export const deleteJobRecord = async (id: string) => {
  const { error } = await supabase.from('jobs').delete().eq('id', id);
  if (error) console.error('Delete job error:', error.message);
  return !error;
};

// Check duplicate job (vehicle or staff)
export const checkJobDuplicate = async (date: string, shift: string, vehicleNumber: string, staffId: string, excludeId?: string) => {
  let query = supabase.from('jobs').select('id, vehicle_number, staff_id').eq('date', date).eq('shift', shift);
  const { data } = await query;
  if (!data) return false;
  return data.some(j => j.id !== excludeId && (j.vehicle_number === vehicleNumber || j.staff_id === staffId));
};

// Get last driver for a vehicle
export const getLastDriverForVehicle = async (vehicle: string) => {
  const { data } = await supabase.from('jobs').select('staff_id, staff_name, mobile').eq('vehicle_number', vehicle).order('created_at', { ascending: false }).limit(1);
  if (data && data.length > 0) return data[0];
  return null;
};

// ─── Drivers CRUD ───
export const fetchDrivers = async () => {
  const { data, error } = await supabase.from('drivers').select('*').order('name');
  if (error) { console.error('Fetch drivers error:', error.message); return []; }
  return (data || []) as SupabaseDriver[];
};

export const insertDriver = async (name: string, mobile: string) => {
  const { data, error } = await supabase.from('drivers').upsert(
    { name, phone_number: mobile, password: mobile },
    { onConflict: 'phone_number' }
  ).select().single();
  if (error) { console.error('Insert driver error:', error.message); return null; }
  return data as SupabaseDriver;
};

export const updateDriver = async (oldMobile: string, name: string, mobile: string) => {
  const { error } = await supabase.from('drivers').update({ name, phone_number: mobile, password: mobile }).eq('phone_number', oldMobile);
  if (error) console.error('Update driver error:', error.message);
  return !error;
};

export const deleteDriver = async (mobile: string) => {
  const { error } = await supabase.from('drivers').delete().eq('phone_number', mobile);
  if (error) console.error('Delete driver error:', error.message);
  return !error;
};

export const bulkInsertDrivers = async (items: { name: string; mobile: string }[]) => {
  const rows = items.map(s => ({ name: s.name, phone_number: s.mobile, password: s.mobile }));
  const { error } = await supabase.from('drivers').upsert(rows, { onConflict: 'phone_number' });
  if (error) console.error('Bulk insert drivers error:', error.message);
  return !error;
};

// ─── Leave Requests ───
export const fetchLeaveRequests = async () => {
  const { data, error } = await supabase.from('leave_requests').select('*').order('created_at', { ascending: false });
  if (error) { console.error('Fetch leave requests error:', error.message); return []; }
  return (data || []) as SupabaseLeaveRequest[];
};

export const updateLeaveStatus = async (id: string, status: 'approved' | 'rejected') => {
  const { error } = await supabase.from('leave_requests').update({ status }).eq('id', id);
  if (error) console.error('Update leave status error:', error.message);
  return !error;
};

// ─── App Users ───
export const fetchAppUsers = async () => {
  const { data, error } = await supabase.from('app_users').select('*').order('created_at', { ascending: true });
  if (error) { console.error('Fetch app users error:', error.message); return []; }
  return data || [];
};

export const syncUserToSupabase = async (user: { id: string; username: string; displayName: string; deactivated?: boolean }) => {
  const { error } = await supabase.from('app_users').upsert({
    id: user.id,
    username: user.username,
    display_name: user.displayName,
    deactivated: user.deactivated || false,
  }, { onConflict: 'id' });
  if (error) console.error('Sync user error:', error.message);
};

export const updateUserStatus = async (id: string, deactivated: boolean) => {
  const { error } = await supabase.from('app_users').update({ deactivated }).eq('id', id);
  if (error) console.error('Update user status error:', error.message);
  return !error;
};

// ─── Counts for admin ───
export const fetchCounts = async () => {
  const [att, jobs, leave] = await Promise.all([
    supabase.from('attendance').select('id', { count: 'exact', head: true }),
    supabase.from('jobs').select('id', { count: 'exact', head: true }),
    supabase.from('leave_requests').select('id', { count: 'exact', head: true }),
  ]);
  return {
    attendance: att.count || 0,
    jobs: jobs.count || 0,
    leave: leave.count || 0,
  };
};

// ─── Real-time subscription helper ───
export const subscribeToTable = (table: string, callback: () => void) => {
  const channel = supabase
    .channel(`${table}_realtime_${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
      callback();
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

// ─── Migrate localStorage to Supabase ───
export const migrateLocalDataToSupabase = async (createdBy: string) => {
  // Migrate attendance
  try {
    const localAtt = JSON.parse(localStorage.getItem('skl_attendance') || '[]');
    for (const a of localAtt) {
      await supabase.from('attendance').upsert({
        id: a.id,
        date: a.date,
        shift: a.shift,
        staff_id: a.staffId,
        staff_name: a.staffName,
        mobile: a.mobile,
        status: a.status,
        sub_status: a.subStatus || null,
        vehicle_number: a.vehicleNumber || null,
        created_by: a.createdBy || createdBy,
      }, { onConflict: 'id' });
    }
  } catch (e) { console.error('Migrate attendance failed:', e); }

  // Migrate jobs
  try {
    const localJobs = JSON.parse(localStorage.getItem('skl_jobs') || '[]');
    for (const j of localJobs) {
      await supabase.from('jobs').upsert({
        id: j.id,
        date: j.date,
        shift: j.shift,
        vehicle_number: j.vehicleNumber,
        staff_id: j.staffId,
        staff_name: j.staffName,
        mobile: j.mobile,
        created_by: j.createdBy || createdBy,
      }, { onConflict: 'id' });
    }
  } catch (e) { console.error('Migrate jobs failed:', e); }

  // Migrate staff
  try {
    const localStaff = JSON.parse(localStorage.getItem('skl_staff') || '[]');
    if (localStaff.length > 0) {
      await bulkInsertDrivers(localStaff.map((s: any) => ({ name: s.name, mobile: s.mobile })));
    }
  } catch (e) { console.error('Migrate staff failed:', e); }

  console.log('Local data migration complete');
};
