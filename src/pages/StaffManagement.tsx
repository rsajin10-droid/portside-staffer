import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Upload, List, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import {
  fetchDrivers, insertDriver, updateDriver, deleteDriver, bulkInsertDrivers,
  subscribeToTable, type SupabaseDriver
} from '@/lib/supabaseData';
import * as XLSX from 'xlsx';

export default function StaffManagement() {
  const [staff, setStaff] = useState<SupabaseDriver[]>([]);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editOldMobile, setEditOldMobile] = useState('');
  const [showList, setShowList] = useState(false);
  const [search, setSearch] = useState('');
  const [fullScreen, setFullScreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const refresh = async () => {
    setLoading(true);
    const data = await fetchDrivers();
    setStaff(data);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  // Real-time subscription
  useEffect(() => {
    const unsub = subscribeToTable('drivers', refresh);
    return unsub;
  }, []);

  const handleAdd = async () => {
    if (!name.trim() || !mobile.trim()) return toast({ title: 'Fill all fields', variant: 'destructive' });
    if (!/^\d{10}$/.test(mobile)) return toast({ title: 'Mobile must be 10 digits', variant: 'destructive' });
    if (editId) {
      await updateDriver(editOldMobile, name.trim(), mobile);
      setEditId(null); setEditOldMobile('');
      toast({ title: 'Staff updated' });
    } else {
      const res = await insertDriver(name.trim(), mobile);
      if (!res) return toast({ title: 'Failed to add', variant: 'destructive' });
      toast({ title: 'Staff added' });
    }
    setName(''); setMobile('');
    refresh();
  };

  const handleEdit = (s: SupabaseDriver) => {
    setEditId(s.id || s.phone_number);
    setEditOldMobile(s.phone_number);
    setName(s.name);
    setMobile(s.phone_number);
  };

  const handleDelete = async (s: SupabaseDriver) => {
    await deleteDriver(s.phone_number);
    refresh();
    toast({ title: 'Staff deleted' });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = ev.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

        const items: { name: string; mobile: string }[] = [];
        for (const row of jsonData) {
          const nameVal = row['name'] || row['Name'] || row['NAME'] || row['Driver Name'] || row['driver name'] || row['Driver'] || row['driver'] || '';
          const mobileVal = row['mobile'] || row['Mobile'] || row['MOBILE'] || row['Phone'] || row['phone'] || row['Mobile Number'] || row['mobile number'] || row['Contact'] || '';
          const nameStr = String(nameVal).trim();
          const mobileStr = String(mobileVal).replace(/\D/g, '').slice(-10);
          if (nameStr && mobileStr.length === 10) {
            items.push({ name: nameStr, mobile: mobileStr });
          }
        }

        if (items.length === 0) {
          toast({ title: 'No valid data found. Ensure columns: Name, Mobile', variant: 'destructive' });
          return;
        }
        await bulkInsertDrivers(items);
        refresh();
        toast({ title: `${items.length} staff imported/updated` });
      } catch (err) {
        toast({ title: 'Failed to read file. Ensure it is a valid Excel file.', variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const filtered = staff.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold">Staff Management</h2>
        <Card>
          <CardHeader><CardTitle>{editId ? 'Edit Staff' : 'Add New Staff'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Driver Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Enter name" />
              </div>
              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <Input value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 digit number" />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />{editId ? 'Update' : 'Add Staff'}</Button>
              {editId && <Button variant="outline" onClick={() => { setEditId(null); setEditOldMobile(''); setName(''); setMobile(''); }}>Cancel</Button>}
              <label className="cursor-pointer">
                <Button variant="outline" asChild><span><Upload className="h-4 w-4 mr-1" />Import Excel</span></Button>
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
              </label>
              <Button variant="outline" onClick={() => setShowList(!showList)}>
                <List className="h-4 w-4 mr-1" />{showList ? 'Hide' : 'All Staff'} ({staff.length})
              </Button>
              <Button variant="outline" onClick={refresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {showList && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setFullScreen(!fullScreen)}>
                  {fullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>
              <div className={`overflow-auto ${fullScreen ? 'max-h-[calc(100vh-250px)]' : 'max-h-96'}`}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s, i) => (
                      <TableRow key={s.id || s.phone_number}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.phone_number}</TableCell>
                        <TableCell className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(s)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
