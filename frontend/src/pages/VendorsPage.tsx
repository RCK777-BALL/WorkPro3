import { useEffect, useState } from 'react';
import Button from '@/components/common/Button';
import DataTable from '@/components/common/DataTable';
import VendorModal from '@/components/vendors/VendorModal';
import http from '@/lib/http';
import type { Vendor } from '@/types';
import { useToast } from '@/context/ToastContext';

const VendorsPage = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const { addToast } = useToast();

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await http.get('/vendors');
      setVendors(res.data as Vendor[]);
    } catch (err) {
      console.error('Failed to load vendors', err);
      addToast('Failed to load vendors', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleSave = async (data: { name: string; contact: string }) => {
    try {
      if (editing) {
        const res = await http.put(`/vendors/${editing.id}`, data);
        setVendors((prev) => prev.map((v) => (v.id === editing.id ? res.data : v)));
      } else {
        const res = await http.post('/vendors', data);
        setVendors((prev) => [...prev, res.data]);
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to save vendor', err);
      addToast('Failed to save vendor', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await http.delete(`/vendors/${id}`);
      setVendors((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      console.error('Failed to delete vendor', err);
      addToast('Failed to delete vendor', 'error');
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' as const },
    { header: 'Contact', accessor: 'contact' as const },
    {
      header: 'Actions',
      accessor: (v: Vendor) => (
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={() => { setEditing(v); setModalOpen(true); }}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(v.id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
          <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Vendors</h2>
          <Button
            variant="primary"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Add Vendor
          </Button>
        </div>
        <DataTable columns={columns} data={vendors} keyField="id" isLoading={loading} emptyMessage="No vendors" />
        <VendorModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          vendor={editing}
          onSave={handleSave}
        />
      </div>
  );
};

export default VendorsPage;
