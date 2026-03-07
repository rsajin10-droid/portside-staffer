import { supabase } from './supabase';

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

/**
 * Check if the user has admin privileges
 */
export const isAdmin = (username?: string, role?: string) => {
  return username === 'appadmin' || role === 'admin';
};

/**
 * ATTENDANCE MODULE
 */

export const fetchAttendance = async (date: string, shift: string, createdBy?: string, isAdminUser = false) => {
  let query = supabase.from('attendance').select('*').eq('date', date).eq('shift', shift);
  
  if (!isAdminUser && createdBy) {
    query = query.eq('created_by', createdBy);
  }
  
  const { data, error } = await query.order('created_at', { ascending: true });
  if (error) { 
    console.error('Fetch attendance error:', error.message); 
    return []; 
  }
  return (data || []) as SupabaseAttendance[];
};

export const insertAttendance = async (record: Omit<SupabaseAttendance, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('attendance')
    .insert([record])
    .select();

  if (error) { 
    console.error('Insert attendance error:', error.message); 
    throw error; 
  }
  return data ? data[0] as SupabaseAttendance : null;
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

export const checkAttendanceDuplicate = async (date: string, shift: string, staffId: string) => {
  const { data } = await supabase
    .from('attendance')
    .select('id')
    .eq('date', date)
    .eq('shift', shift)
    .eq('staff_id', staffId);
    
  return (data && data.length > 0);
};

/**
 * JOBS MODULE
 */

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
  const { data, error } = await supabase.from('jobs').insert([record]).select();
  if (error) { console.error('Insert job error:', error.message); return null; }
  return data ? data[0] as SupabaseJob : null;
};

/**
 * MASTER DATA & USER SYNC
 */

export const fetchDrivers = async () => {
  const { data, error } = await supabase.from('drivers').select('*').order('name');
  if (error) { console.error('Fetch drivers error:', error.message); return []; }
  return (data || []) as SupabaseDriver[];
};

export const syncUserToSupabase = async (user: { id: string; username: string; displayName: string; role?: string; deactivated?: boolean }) => {
  const { error } = await supabase.from('app_users').upsert({
    id: user.id,
    username: user.username,
    display_name: user.displayName,
    role: user.role || 'supervisor',
    deactivated: user.deactivated || false,
  }, { onConflict: 'id' });
  if (error) console.error('Sync user error:', error.message);
};

/**
 * REALTIME SUBSCRIPTION
 */

export const subscribeToTable = (table: string, callback: () => void) => {
  const channel = supabase
    .channel(`${table}_realtime_${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
      callback();
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};
