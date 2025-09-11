import { useState } from 'react';
import { createGoodsReceipt } from '@/api/purchasing';

export default function GoodsReceiptPage() {
  const [po, setPo] = useState('');
  const [item, setItem] = useState('');
  const [qty, setQty] = useState(0);

  const submit = async () => {
    await createGoodsReceipt({ purchaseOrder: po, items: [{ item, quantity: qty }] });
    setPo('');
    setItem('');
    setQty(0);
  };

  return (
    <div>
      <h1>Goods Receipt</h1>
      <input
        placeholder="PO ID"
        value={po}
        onChange={(e) => setPo(e.target.value)}
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
      <button onClick={submit}>Receive</button>
    </div>
  );
}
