import { useState } from 'react';
import { createPurchaseOrder } from '@/api/purchasing';

export default function PurchaseOrderPage() {
  const [vendor, setVendor] = useState('');
  const [item, setItem] = useState('');
  const [qty, setQty] = useState(0);

  const submit = async () => {
    await createPurchaseOrder({ vendor, items: [{ item, quantity: qty }] });
    setVendor('');
    setItem('');
    setQty(0);
  };

  return (
    <div>
      <h1>Create Purchase Order</h1>
      <input
        placeholder="Vendor ID"
        value={vendor}
        onChange={(e) => setVendor(e.target.value)}
      />
      <input
        placeholder="Item ID"
        value={item}
        onChange={(e) => setItem(e.target.value)}
      />
      <input
        type="number"
        placeholder="Quantity"
        value={qty}
        onChange={(e) => setQty(Number(e.target.value))}
      />
      <button onClick={submit}>Create</button>
    </div>
  );
}
