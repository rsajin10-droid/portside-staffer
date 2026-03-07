import { supabase } from './supabase';

// ─── Drivers (Staff) ───

export const syncStaffToSupabase = async (name: string, mobile: string) => {
  try {
    const { error } = await supabase.from('drivers').upsert(
      { name, phone_number: mobile, password: mobile },
      { onConflict: 'phone_number' }
    );
    if (error) console.error('Supabase driver sync error:', error.message);
  } catch (e) {
    console.error('Supabase driver sync failed:', e);
  }
};

export const syncAllStaffToSupabase = async (staffList: { name: string; mobile: string }[]) => {
  try {
    const rows = staffList.map(s => ({ name: s.name, phone_number: s.mobile, password: s.mobile }));
    const { error } = await supabase.from('drivers').upsert(rows, { onConflict: 'phone_number' });
    if (error) console.error('Supabase bulk driver sync error:', error.message);
  } catch (e) {
    console.error('Supabase bulk driver sync failed:', e);
  }
};

export const deleteStaffFromSupabase = async (mobile: string) => {
  try {
    const { error } = await supabase.from('drivers').delete().eq('phone_number', mobile);
    if (error) console.error('Supabase driver delete error:', error.message);
  } catch (e) {
    console.error('Supabase driver delete failed:', e);
  }
};

export const updateStaffInSupabase = async (oldMobile: string, name: string, mobile: string) => {
  try {
    const { error } = await supabase.from('drivers')
      .update({ name, phone_number: mobile, password: mobile })
      .eq('phone_number', oldMobile);
    if (error) console.error('Supabase driver update error:', error.message);
  } catch (e) {
    console.error('Supabase driver update failed:', e);
  }
};

// ─── Attendance ───

export const syncAttendanceToSupabase = async (record: {
  id: string;
  date: string;
  shift: string;
  staff_name: string;
  mobile: string;
  status: string;
  sub_status?: string;
  vehicle_number?: string;
  created_by: string;
}) => {
  try {
    const { error } = await supabase.from('attendance').upsert(record, { onConflict: 'id' });
    if (error) console.error('Supabase attendance sync error:', error.message);
  } catch (e) {
    console.error('Supabase attendance sync failed:', e);
  }
};

export const deleteAttendanceFromSupabase = async (id: string) => {
  try {
    const { error } = await supabase.from('attendance').delete().eq('id', id);
    if (error) console.error('Supabase attendance delete error:', error.message);
  } catch (e) {
    console.error('Supabase attendance delete failed:', e);
  }
};

// ─── Jobs (Job Allotment) ───

export const syncJobToSupabase = async (record: {
  id: string;
  date: string;
  shift: string;
  vehicle_number: string;
  staff_name: string;
  mobile: string;
  created_by: string;
}) => {
  try {
    const { error } = await supabase.from('jobs').upsert(record, { onConflict: 'id' });
    if (error) console.error('Supabase job sync error:', error.message);
  } catch (e) {
    console.error('Supabase job sync failed:', e);
  }
};

export const deleteJobFromSupabase = async (id: string) => {
  try {
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) console.error('Supabase job delete error:', error.message);
  } catch (e) {
    console.error('Supabase job delete failed:', e);
  }
};
