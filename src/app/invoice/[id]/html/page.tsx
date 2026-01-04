'use client';

import { useState, useEffect } from 'react';
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
  courierFees?: number;
  totalAmount: number;
  paymentMethod?: string;
  upiAmount?: number;
  cashAmount?: number;

  status: string;
  type?: string;
  originalOrderId?: string;
  returnType?: string;
  createdAt: string;
  updatedAt: string;
}


interface Product {
  name: string;
  sku: string;
  category: { name: string };
}

import { useSearchParams } from 'next/navigation';

export default function InvoicePage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const isThermal = mode === 'thermal';
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setLoading(false);
        setError('Invoice ID is missing.');
        return;
      }
      try {
        // OPTIMIZED: Fetch Single Order only
        const res = await fetch(`/api/sales/${id}`); 
        const data = await res.json();
        
        if (data.success && data.data) {
             setOrder(data.data);
             // We no longer fetch all products. 
             // We rely on item details embedded in order or snapshots.
             // If legacy orders exist without proper snapshot, we might need a fallback, 
             // but for performance refactor, we assume data integrity or accept minor metadata loss on very old orders.
        } else {
             setError('Invoice not found.');
        }

      } catch (err) {
        console.error(err);
        setError('Failed to fetch invoice data.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  if (loading) return <div style={{padding: '40px', textAlign: 'center'}}>Loading Invoice...</div>;
  if (!order) return <div style={{padding: '40px', textAlign: 'center'}}>Invoice not found</div>;

  const getItemDetails = (item: OrderItem) => {
     // Use saved details if available (Preferred)
     if ((item as any).sku && (item as any).category) {
         return { sku: (item as any).sku, category: (item as any).category };
     }
     // Fallback: If no snapshot, return empty string to prevent errors. 
     // (Fetching 1000 products just for this fallback is not worth the performance cost)
     return { sku: '', category: '' };
  };



  const isReturned = order?.type === 'RETURN' || order?.status === 'RETURNED'; // Support both new and old methods
  const isRefundOnly = order?.returnType === 'REFUND_ONLY';
  
  const invoiceTitle = isReturned 
    ? (isRefundOnly ? 'REFUND RECEIPT' : 'RETURN INVOICE') 
    : 'INVOICE';

  // Use amber/yellow for return to match dashboard
  const themeColor = isReturned ? '#f59e0b' : 'var(--primary)'; 

  return (
    <div className={`${styles.container} ${isThermal ? styles.thermal : ''}`}>
      {/* ... header ... */}
      <div className={styles.watermark}>
        <Image src="/logo.jpg" alt="Watermark" width={500} height={500} style={{ objectFit: 'contain' }} />
      </div>

      <div className={styles.content}>
        {/* Header */}

          <div className={styles.header}>
            <h1 className={styles.mainTitle} style={{ color: themeColor }}>{invoiceTitle}</h1>
            
            {/* LEFT COLUMN: Invoice No + Customer Info */}
            <div className={styles.headerLeft}>
              
               {/* Invoice IDs (Top Left) */}
              <div style={{ marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.85rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {isReturned ? (isRefundOnly ? 'REFUND ID' : 'RETURN INVOICE NO') : 'INVOICE NO'}
                  </div>
                  <div className={styles.mono} style={{ fontSize: '1.25rem', fontWeight: 700, color: '#000' }}>
                      {order.orderId}
                  </div>
                   {/* Reference ID for Returns */}
                  {(isReturned && order.originalOrderId) && (
                      <div style={{ marginTop: '0.25rem' }}>
                          <span style={{ fontSize: '0.8rem', color: '#888', marginRight: '0.5rem' }}>Ref:</span>
                          <span className={styles.mono} style={{ fontSize: '0.9rem', fontWeight: 600, color: '#555' }}>
                              #{order.originalOrderId}
                          </span>
                      </div>
                  )}
              </div>

              {/* Customer Info (Left) */}
              <div>
                  <div style={{ fontSize: '0.85rem', color: '#888', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bill To</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, textTransform: 'capitalize', marginBottom: '2px' }}>{order.customerName}</div>
                  <div style={{ fontSize: '1rem', color: '#444', marginBottom: '8px' }}>{order.mobileNumber}</div>
                  
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      Date: <span style={{ fontWeight: 600, color: '#000' }}>{formatDateIST(order.createdAt)}</span>
                  </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Store Info */}
            <div className={styles.headerRight}>
                <Image src="/logo.jpg" alt="Logo" width={70} height={70} style={{ borderRadius: '50%', marginBottom: '10px' }} />
                <div style={{ fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: '4px' }}>NailCart</div>
                {/* <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#444', marginBottom: '10px' }}>GSTIN: 27ABCDE1234F1Z5</div> */}

                <div className={styles.value} style={{ fontSize: '0.9rem', lineHeight: '1.5', color: '#555' }}>
                    Shraddha Chowk, Plot No. 14,<br />
                    Opp. SS Collection, Chakradhar Nagar,<br />
                    Jawahar Nagar, Ayodhya Nagar,<br />
                    Nagpur, Maharashtra 440024<br />
                    <span style={{ fontWeight: 600, color: '#000' }}>+91 8600220632</span>
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
                {order.items.map((item, idx) => {
                    const details = getItemDetails(item);
                    return (
                        <tr key={idx}>
                            <td>
                                <div style={{ fontWeight: 600 }}>{item.productName}</div>
                                {(details.sku || details.category) && (
                                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px' }}>
                                        {details.sku && <span style={{ marginRight: '8px' }}>#{details.sku}</span>}
                                        {details.category && <span>#{details.category}</span>}
                                    </div>
                                )}
                            </td>
                            <td>{item.quantity}</td>
                            <td>₹{item.price}</td>
                            <td>₹{item.price * item.quantity}</td>
                        </tr>
                    );
                })}
            </tbody>

        </table>

        {/* Totals Section - Separate from table */}
        <div className={styles.totals}>
            <div className={styles.totalsBox}>
                <div className={styles.totalRow}>
                    <span>Subtotal</span>
                    <span>₹{order.totalAmount + (order.discount || 0) - (order.courierFees || 0)}</span>
                </div>
                {order.discount > 0 && (
                     <div className={styles.totalRow} style={{ color: '#ef4444' }}>
                        <span>Discount</span>
                        <span>- ₹{order.discount}</span>
                    </div>
                )}
                {(order.courierFees || 0) > 0 && (
                     <div className={styles.totalRow}>
                        <span>Courier Fees</span>
                        <span>+ ₹{order.courierFees}</span>
                    </div>
                )}
                <div className={styles.totalRow + ' ' + styles.final}>
                    <span>Total</span>
                    <span>₹{order.totalAmount}</span>
                </div>
                {/* Payment Method */}
        {order.paymentMethod && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'transparent', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <div style={{ fontSize: '0.85rem', color: '#888', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Method</div>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>{order.paymentMethod}</div>
                {order.paymentMethod === 'SPLIT' && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '2rem', fontSize: '0.9rem' }}>
                        <div>
                            <span style={{ color: '#888' }}>UPI: </span>
                            <span style={{ fontWeight: 600 }}>₹{order.upiAmount || 0}</span>
                        </div>
                        <div>
                            <span style={{ color: '#888' }}>Cash: </span>
                            <span style={{ fontWeight: 600 }}>₹{order.cashAmount || 0}</span>
                        </div>
                    </div>
                )}
            </div>
        )}
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
