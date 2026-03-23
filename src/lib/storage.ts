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
  subStatus?: 'dcd' | 'dcn'; // for absent with DCD/DCN
  vehicleNumber?: string; // വണ്ടി നമ്പർ ഇവിടെയുണ്ട്
  createdAt: string;
  createdBy: string;
}

export interface AppUser {
  id: string;
  username: string;
  password: string;
  displayName: string;
  deactivated?: boolean;
}

const get = <T>(key: string): T[] => {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};
const set = <T>(key: string, data: T[]) => localStorage.setItem(key, JSON.stringify(data));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// --- Users ---
export const getUsers = (): AppUser[] => {
  const users = get<AppUser>('skl_users');
  if (users.length === 0) {
    const def: AppUser = { id: uid(), username: 'admin', password: 'admin123', displayName: 'Admin' };
    set('skl_users', [def]);
    return [def];
  }
  return users;
};
export const addUser = (u: Omit<AppUser, 'id'>): AppUser => {
  const users = getUsers();
  const nu = { ...u, id: uid() };
  set('skl_users', [...users, nu]);
  return nu;
};

// --- Staff ---
export const getStaffList = (): Staff[] => get<Staff>('skl_staff');
export const addStaff = (s: Omit<Staff, 'id' | 'createdAt'>): Staff | null => {
  const list = getStaffList();
  if (list.some(x => x.name.toLowerCase() === s.name.toLowerCase())) return null;
  const ns = { ...s, id: uid(), createdAt: new Date().toISOString() };
  set('skl_staff', [...list, ns]);
  return ns;
};
export const deleteStaff = (id: string) => {
  set('skl_staff', getStaffList().filter(s => s.id !== id));
};

// --- Attendance (Modified to include vehicleNumber) ---
export const getAttendance = (): AttendanceRecord[] => get<AttendanceRecord>('skl_attendance');

export const addAttendance = (r: Omit<AttendanceRecord, 'id' | 'createdAt'>): AttendanceRecord | null => {
  const list = getAttendance();
  // ഒരു ഷിഫ്റ്റിൽ ഒരു ഡ്രൈവർക്ക് ഒരു തവണ മാത്രമേ അറ്റൻഡൻസ് നൽകാൻ പാടുള്ളൂ
  if (list.some(x => x.date === r.date && x.shift === r.shift && x.staffId === r.staffId)) return null;
  
  const nr = { ...r, id: uid(), createdAt: new Date().toISOString() };
  set('skl_attendance', [...list, nr]);
  return nr;
};

export const updateAttendance = (id: string, data: Partial<AttendanceRecord>) => {
  const list = getAttendance();
  set('skl_attendance', list.map(r => r.id === id ? { ...r, ...data } : r));
};

export const deleteAttendance = (id: string) => {
  set('skl_attendance', getAttendance().filter(r => r.id !== id));
};

export const getShiftAttendance = (date: string, shift: 'day' | 'night') =>
  getAttendance().filter(r => r.date === date && r.shift === shift);

// --- Vehicle Numbers (T001 to T100) ---
export const VEHICLES = Array.from({ length: 100 }, (_, i) => `T${String(i + 1).padStart(3, '0')}`);

// മുൻപ് വണ്ടി ഓടിച്ച ഡ്രൈവറെ കണ്ടെത്താൻ (ഇപ്പോൾ ഇത് അറ്റൻഡൻസ് ടേബിളിൽ നിന്ന് നോക്കും)
export const getLastDriver = (vehicle: string): { staffId: string; staffName: string; mobile: string } | null => {
  const records = getAttendance()
    .filter(j => j.vehicleNumber === vehicle)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  
  return records.length > 0 ? { staffId: records[0].staffId, staffName: records[0].staffName, mobile: records[0].mobile } : null;
};
