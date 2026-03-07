export interface Staff {
  id: string;
  name: string;
  mobile: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  shift: 'day' | 'night';
  staffId: string;
  staffName: string;
  mobile: string;
  status: 'present' | 'absent' | 'extra_duty' | 'dcd' | 'dcn';
  subStatus?: 'dcd' | 'dcn' | null;
  createdAt: string;
  createdBy: string;
}

export interface JobAllotmentRecord {
  id: string;
  date: string;
  shift: 'day' | 'night';
  vehicleNumber: string;
  staffId: string;
  staffName: string;
  mobile: string;
  createdAt: string;
  createdBy: string;
}

export interface LeaveRequest {
  id: string;
  driverName: string;
  leaveDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface AppUser {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role?: 'admin' | 'supervisor';
  deactivated?: boolean;
}

// --- Vehicles List (T001 to T200) ---
export const VEHICLES = Array.from({ length: 200 }, (_, i) => `T${String(i + 1).padStart(3, '0')}`);

// --- Local Storage Helpers ---

const get = <T>(key: string): T[] => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};

const set = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// --- Users Management ---

export const getUsers = (): AppUser[] => {
  const users = get<AppUser>('skl_users');
  let updated = false;
  const list = [...users];

  if (!list.some(u => u.username === 'appadmin')) {
    list.push({ 
      id: uid(), 
      username: 'appadmin', 
      password: 'Admin@1097', 
      displayName: 'Admin',
      role: 'admin'
    });
    updated = true;
  }
  
  if (updated) set('skl_users', list);
  return list;
};

export const addUser = (u: Omit<AppUser, 'id'>): AppUser => {
  const users = getUsers();
  const nu = { ...u, id: uid() };
  set('skl_users', [...users, nu]);
  return nu;
};

export const deactivateUser = (id: string, status: boolean) => {
  const users = getUsers();
  const updated = users.map(u => u.id === id ? { ...u, deactivated: status } : u);
  set('skl_users', updated);
};

// --- Staff Management ---

export const getStaffList = (): Staff[] => get<Staff>('skl_staff');

export const addStaff = (s: Omit<Staff, 'id' | 'createdAt'>): Staff | null => {
  const list = getStaffList();
  if (list.some(x => x.name.toLowerCase() === s.name.toLowerCase())) return null;
  const ns = { ...s, id: uid(), createdAt: new Date().toISOString() };
  set('skl_staff', [...list, ns]);
  return ns;
};

export const updateStaff = (id: string, data: Partial<Staff>) => {
  const list = getStaffList();
  set('skl_staff', list.map(s => s.id === id ? { ...s, ...data } : s));
};

export const deleteStaff = (id: string) => {
  set('skl_staff', getStaffList().filter(s => s.id !== id));
};

// --- Attendance Management ---

export const getAttendance = (): AttendanceRecord[] => get<AttendanceRecord>('skl_attendance');

/**
 * Required for Dashboard to count today's attendance
 */
export const getShiftAttendance = (date: string, shift: 'day' | 'night') => {
  return getAttendance().filter(r => r.date === date && r.shift === shift);
};

export const addAttendance = (r: Omit<AttendanceRecord, 'id' | 'createdAt'>): AttendanceRecord | null => {
  const list = getAttendance();
  if (list.some(x => x.date === r.date && x.shift === r.shift && x.staffId === r.staffId)) return null;
  
  const nr = { ...r, id: uid(), createdAt: new Date().toISOString() };
  set('skl_attendance', [nr, ...list]);
  return nr;
};

// --- Job Allotment Management ---

export const getJobAllotments = (): JobAllotmentRecord[] => get<JobAllotmentRecord>('skl_jobs');

/**
 * Required for Dashboard to count active jobs/trucks
 */
export const getShiftJobs = (date: string, shift: 'day' | 'night') => {
  return getJobAllotments().filter(j => j.date === date && j.shift === shift);
};

export const addJobAllotment = (r: Omit<JobAllotmentRecord, 'id' | 'createdAt'>): JobAllotmentRecord | null => {
  const list = getJobAllotments();
  if (list.some(x => x.date === r.date && x.shift === r.shift && (x.vehicleNumber === r.vehicleNumber || x.staffId === r.staffId))) return null;
  
  const nr = { ...r, id: uid(), createdAt: new Date().toISOString() };
  set('skl_jobs', [nr, ...list]);
  return nr;
};

// --- Leave Management ---

export const getLeaveRequests = (): LeaveRequest[] => get<LeaveRequest>('skl_leave_requests');

export const updateLeaveStatus = (id: string, status: 'approved' | 'rejected') => {
  const requests = getLeaveRequests();
  const updated = requests.map(r => r.id === id ? { ...r, status } : r);
  set('skl_leave_requests', updated);
  return true;
};
