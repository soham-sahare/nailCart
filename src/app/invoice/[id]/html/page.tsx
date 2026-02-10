import { notFound } from 'next/navigation';
import Image from 'next/image';
// import { FiPrinter } from 'react-icons/fi'; // Icons might need client wrapper or be removed for PDF view logic
import styles from './invoice.module.css';
import { formatDateIST } from '@/lib/dateUtils';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product'; // Ensure model is registered

// Register models
import '@/models/Category';

interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
  mrp?: number;
}

export default async function InvoicePage(props: { 
    params: Promise<{ id: string }>;
    searchParams: Promise<{ mode?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { id } = params;
  const mode = searchParams.mode;
  const isThermal = mode === 'thermal';

  await dbConnect();

  let order: any = null;
  try {
     order = await Order.findById(id).lean();
     if (!order) {
         // Fallback to orderId
         order = await Order.findOne({ orderId: id }).lean();
     }
  } catch (e) {
      console.error(e);
  }

  if (!order) {
      return <div style={{padding: '40px', textAlign: 'center'}}>Invoice not found</div>;
  }

  // OPTIMIZATION: Only fetch products if snapshot data is missing
  // Check if all items have mrp and sku already
  const needsEnrichment = order.items.some((item: any) => !item.mrp || !item.sku);
  
  if (needsEnrichment) {
      // Enrich with current MRP/SKU for legacy orders missing snapshot
      const productNames = order.items.map((i: any) => i.productName);
      const products = await Product.find({ name: { $in: productNames } }).select('name mrp sku category').lean();
      const productMap = new Map(products.map((p: any) => [p.name, p]));

      order.items = order.items.map((item: any) => {
          const product = productMap.get(item.productName);
          return {
              ...item,
              currentMrp: item.mrp || product?.mrp,
              sku: item.sku || product?.sku, 
              category: item.category || (product as any)?.category,
          };
      });
  } else {
      // All items have snapshot data, just use currentMrp = mrp
      order.items = order.items.map((item: any) => ({
          ...item,
          currentMrp: item.mrp,
      }));
  }

  const getItemDetails = (item: any) => {
     if (item.sku) {
         return { sku: item.sku, category: item.category };
     }
     return { sku: '', category: '' };
  };

  const isReturned = order.type === 'RETURN' || order.status === 'RETURNED';
  const isRefundOnly = order.returnType === 'REFUND_ONLY';
  
  const invoiceTitle = isReturned 
    ? (isRefundOnly ? 'REFUND RECEIPT' : 'RETURN INVOICE') 
    : 'INVOICE';

  const themeColor = isReturned ? '#f59e0b' : 'var(--primary)'; 

  return (
    <div className={`${styles.container} ${isThermal ? styles.thermal : ''}`}>
      {/* Watermark */}
      <div className={styles.watermark}>
        <Image src="/logo.jpg" alt="Watermark" width={500} height={500} style={{ objectFit: 'contain' }} />
      </div>

      <div className={styles.content}>
        {/* Header */}

          <div className={styles.header}>
            <h1 className={styles.mainTitle} style={{ color: themeColor }}>{invoiceTitle}</h1>
            
            {/* LEFT COLUMN: Invoice No + Customer Info */}
            <div className={styles.headerLeft}>
              
               {/* Invoice IDs */}
              <div style={{ marginBottom: '1.5rem' }}>
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

              {/* Customer Info */}
              <div>
                  <div style={{ fontSize: '0.85rem', color: '#888', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bill To</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, textTransform: 'capitalize', marginBottom: '2px' }}>{order.customerName}</div>
                  <div style={{ fontSize: '1rem', color: '#444', marginBottom: '8px' }}>{order.mobileNumber}</div>
                  
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      Date: <span style={{ fontWeight: 600, color: '#000' }}>{formatDateIST(order.createdAt)}</span>
                  </div>
              </div>
            </div>

            {/* CENTER COLUMN: Logo */}
            <div className={styles.headerCenter}>
                <Image src="/logo.jpg" alt="Logo" width={100} height={100} style={{ borderRadius: '50%', objectFit: 'cover' }} />
            </div>

            {/* RIGHT COLUMN: Store Info */}
            <div className={styles.headerRight}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: '4px' }}>NailCart</div>

                <div className={styles.value} style={{ fontSize: '0.9rem', lineHeight: '1.5', color: '#555' }}>
                    Shraddha Chowk, Plot No. 14,
                    Opp. SS Collection, Chakradhar Nagar,
                    Jawahar Nagar, Ayodhya Nagar,<br />
                    Nagpur, Maharashtra - 440024<br />
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
                    <th>MRP</th>
                    <th>Price</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                {order.items.map((item: any, idx: number) => {
                    const details = getItemDetails(item);
                    return (
                        <tr key={idx}>
                            <td>
                                <div style={{ fontWeight: 600 }}>
                                    {(() => {
                                        const skuParts = details.sku ? details.sku.split('-') : [];
                                        const lastPart = skuParts.length > 0 ? skuParts[skuParts.length - 1] : '';
                                        const isNumeric = !isNaN(Number(lastPart)) && lastPart.trim() !== '';
                                        
                                        return (
                                            <>
                                                {item.productName}
                                                {isNumeric && <span style={{ fontWeight: 400, color: '#444' }}> - {lastPart}</span>}
                                            </>
                                        );
                                    })()}
                                </div>
                                {details.sku && (
                                    <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>
                                        #{details.sku}
                                    </div>
                                )}
                            </td>
                            <td>{item.quantity}</td>
                            <td>{`₹${item.mrp || (item as any).currentMrp || item.price}`}</td>
                            <td>₹{item.price}</td>
                            <td>
                                <div style={{ fontWeight: 600 }}>₹{item.price * item.quantity}</div>

                            </td>
                        </tr>
                    );
                })}
            </tbody>

        </table>

        {/* Totals Section */}
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
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      Payment Method: <span style={{ fontWeight: 600, color: '#000' }}>{order.paymentMethod}</span>
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
        
            </div>
        </div>

        {/* Footer Note */}
        <div style={{ marginTop: '60px', textAlign: 'center', color: '#888', fontSize: '0.9rem' }}>
            Thank you for visiting!
        </div>

      </div>

      {/* Print button is removed in this view as it is meant to be consumed by Puppeteer, 
          OR we can keep it for debugging but it won't be interactive in PDF. 
          Actually, let's keep it but make it a client component if interactive, 
          or just hide it in print media query (which class .printBtn does). 
          Since we removed 'use client', onClick won't work. We should remove the button or make it a separate Client Component.
      */}
    </div>
  );
}
