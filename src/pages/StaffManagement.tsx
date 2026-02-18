import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getStaffList, addStaff, updateStaff, deleteStaff, importStaffBulk, type Staff } from '@/lib/storage';
import { Plus, Pencil, Trash2, Upload, List } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function StaffManagement() {
  const [staff, setStaff] = useState<Staff[]>(getStaffList());
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const refresh = () => setStaff(getStaffList());

  const handleAdd = () => {
    if (!name.trim() || !mobile.trim()) return toast({ title: 'Fill all fields', variant: 'destructive' });
    if (!/^\d{10}$/.test(mobile)) return toast({ title: 'Mobile must be 10 digits', variant: 'destructive' });
    if (editId) {
      updateStaff(editId, { name: name.trim(), mobile });
      setEditId(null);
      toast({ title: 'Staff updated' });
    } else {
      const res = addStaff({ name: name.trim(), mobile });
      if (!res) return toast({ title: 'Name already exists', variant: 'destructive' });
      toast({ title: 'Staff added' });
    }
    setName(''); setMobile('');
    refresh();
  };

  const handleEdit = (s: Staff) => { setEditId(s.id); setName(s.name); setMobile(s.mobile); };
  const handleDelete = (id: string) => { deleteStaff(id); refresh(); toast({ title: 'Staff deleted' }); };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' });
      const data = XLSX.utils.sheet_to_json<{ name?: string; Name?: string; mobile?: string; Mobile?: string }>(wb.Sheets[wb.SheetNames[0]]);
      const items = data.map(r => ({ name: String(r.name || r.Name || ''), mobile: String(r.mobile || r.Mobile || '') })).filter(r => r.name && r.mobile);
      const count = importStaffBulk(items);
      refresh();
      toast({ title: `${count} staff imported` });
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const filtered = staff.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

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
              {editId && <Button variant="outline" onClick={() => { setEditId(null); setName(''); setMobile(''); }}>Cancel</Button>}
              <label className="cursor-pointer">
                <Button variant="outline" asChild><span><Upload className="h-4 w-4 mr-1" />Import Excel</span></Button>
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
              </label>
              <Button variant="outline" onClick={() => setShowList(!showList)}>
                <List className="h-4 w-4 mr-1" />{showList ? 'Hide' : 'All Staff'} ({staff.length})
              </Button>
            </div>
          </CardContent>
        </Card>

        {showList && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} />
              <div className="overflow-auto max-h-96">
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
                      <TableRow key={s.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.mobile}</TableCell>
                        <TableCell className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(s)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
