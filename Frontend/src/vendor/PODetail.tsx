import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getVendorPurchaseOrder, updateVendorPurchaseOrder } from '../utils/api';

interface PurchaseOrder {
  id: string;
  status: string;
}

export default function VendorPODetail() {
  const { id } = useParams<{ id: string }>();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('vendorToken');
    if (!token) {
      navigate('/vendor/login');
      return;
    }
    if (!id) return;
    getVendorPurchaseOrder(id, token)
      .then((data) => {
        setPo(data);
        setStatus(data.status);
      })
      .catch((err) => console.error(err));
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('vendorToken');
    if (!token || !id) return;
    await updateVendorPurchaseOrder(id, { status }, token);
    navigate('/vendor/pos');
  };

  if (!po) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl mb-4">PO {po.id}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <label className="flex flex-col">
          <span>Status</span>
          <input
            className="input input-bordered"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </label>
        <button type="submit" className="btn-primary">
          Update
        </button>
      </form>
    </div>
  );
}

