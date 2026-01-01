'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { FiPrinter } from 'react-icons/fi';
import styles from './invoice.module.css';
import { formatDateIST } from '@/lib/dateUtils';

interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  orderId: string;
  customerName: string;
  mobileNumber: string;
  items: OrderItem[];
  discount: number;
  totalAmount: number;
  createdAt: string;
}

export default function InvoicePage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/sales?search=${id}`); // Reusing search to find by ID if direct fetch is tricky, or just filter match
        // Actually best to fetch all and find, or ideally have a single get endpoint.
        // Let's assume we can fetch list and filter since I don't have a direct single-fetch public endpoint doc handy,
        // Wait, I edited /api/sales/[id] earlier! I can use that.
        const resSingle = await fetch(`/api/sales/${id}`); // Assuming this is GET compatible? 
        // Wait, route.ts only had PUT/DELETE. I need to add GET to [id]/route.ts or just use the list.
        // Quickest path given I shouldn't edit backend needlessly: Fetch list and filter.
        // Actually, let's just make a quick GET in [id]/route.ts, it's safer.
        // Or for now, just fetch list with search param if search works on ID.
        // My search logic: `or: [{ orderId: regex }, { customerName: regex }]`.
        // So I can search by ID.
        
        // Let's try fetching the specific one via list for safety first.
        const resList = await fetch('/api/sales?limit=1000'); 
        const data = await resList.json();
        const found = data.data.find((o: any) => o._id === id);
        setOrder(found || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrder();
  }, [id]);

  if (loading) return <div style={{padding: '40px', textAlign: 'center'}}>Loading Invoice...</div>;
  if (!order) return <div style={{padding: '40px', textAlign: 'center'}}>Invoice not found</div>;

  return (
    <div className={styles.container}>
      {/* Watermark */}
      <div className={styles.watermark}>
        <Image src="/logo.jpg" alt="Watermark" width={500} height={500} style={{ objectFit: 'contain' }} />
      </div>

      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
            <div className={styles.customerInfo}>
                <div className={styles.label}>Invoice No.</div>
                <div className={styles.value} style={{ fontWeight: 700 }}>{order.orderId}</div>
    
                <div className={styles.label}>Bill To</div>
                <div className={styles.value} style={{ fontWeight: 700 }}>
                    {order.customerName} <br/> 
                    <span style={{ fontWeight: 400 }}>{order.mobileNumber || 'N/A'}</span>
                </div>    
                   
                <div className={styles.label}>Date</div>
                <div className={styles.value}>{formatDateIST(order.createdAt)}</div>
            </div>

            <div className={styles.ownerInfo}>
                <Image src="/logo.jpg" alt="Logo" width={80} height={80} style={{ borderRadius: '50%', marginBottom: '10px' }} />
                <div className={styles.title}>NailCart</div>
                <span style={{ fontSize: '0.9rem', color: '#333', fontWeight: 600 }}>GSTIN: 27ABCDE1234F1Z5</span>

                <div className={styles.value}>
                    Shraddha Chowk, Plot No. 14, Opp. SS Collection,<br />
                    Chakradhar Nagar, Jawahar Nagar, Ayodhya Nagar,<br />
                    Nagpur, Maharashtra 440024<br />
                    +91 8600220632
                </div>
            </div>
        </div>

        {/* Items Table with Footer Totals */}
        <table className={styles.table}>
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                {order.items.map((item, idx) => (
                    <tr key={idx}>
                        <td>{item.productName}</td>
                        <td>{item.quantity}</td>
                        <td>₹{item.price}</td>
                        <td>₹{item.price * item.quantity}</td>
                    </tr>
                ))}
            </tbody>

        </table>

        {/* Totals Section - Separate from table */}
        <div className={styles.totals}>
            <div className={styles.totalsBox}>
                <div className={styles.totalRow}>
                    <span>Subtotal</span>
                    <span>₹{order.totalAmount + (order.discount || 0)}</span>
                </div>
                {order.discount > 0 && (
                     <div className={styles.totalRow} style={{ color: '#ef4444' }}>
                        <span>Discount</span>
                        <span>- ₹{order.discount}</span>
                    </div>
                )}
                <div className={styles.totalRow + ' ' + styles.final}>
                    <span>Total</span>
                    <span>₹{order.totalAmount}</span>
                </div>
            </div>
        </div>

        {/* Footer Note */}
        <div style={{ marginTop: '60px', textAlign: 'center', color: '#888', fontSize: '0.9rem' }}>
            Thank you for visiting!
        </div>

      </div>

      <button className={styles.printBtn} onClick={() => window.print()}>
        <FiPrinter size={20} /> Print / Save PDF
      </button>

    </div>
  );
}
