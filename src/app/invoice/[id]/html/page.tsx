import { notFound } from 'next/navigation';
import Image from 'next/image';
// import { FiPrinter } from 'react-icons/fi'; // Icons might need client wrapper or be removed for PDF view logic
import styles from './invoice.module.css';
import { formatDateIST } from '@/lib/dateUtils';
import dbConnect from '@/lib/db';
// Register models first
import '@/models/Category';
import Order from '@/models/Order';
import Product from '@/models/Product';

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
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const mode = searchParams.mode;
  const isThermal = mode === 'thermal';

  await dbConnect();

  let order: any = null;
  try {
     order = await Order.findById(id).lean();
     if (!order) {
         order = await Order.findOne({ orderId: id }).lean();
     }
  } catch (e) {
      console.error(e);
  }

  if (!order) {
      return <div style={{padding: '40px', textAlign: 'center'}}>Invoice not found</div>;
  }

  // --- Consolidated Logic ---
  let baseOrder = order;
  
  // 1. Identify Base Order and fetch all returns in parallel
  if (order.type === 'RETURN' && order.originalOrderId) {
      const original = await Order.findOne({ orderId: order.originalOrderId }).lean();
      if (original) baseOrder = original;
  }

  const allReturns = await Order.find({ 
      originalOrderId: baseOrder.orderId, 
      type: 'RETURN',
      status: { $ne: 'CANCELLED' } 
  }).sort({ createdAt: 1 }).lean();

  // 2. Global Enrichment: Collect all unique product names from ALL orders
  const allOrders = [baseOrder, ...allReturns];
  const allProductNames = Array.from(new Set(
      allOrders.flatMap(o => o.items.map((i: any) => i.productName))
  ));


  const products = await Product.find({ name: { $in: allProductNames } })
      .select('name mrp sku category')
      .lean();
  
  const productMap = new Map(products.map((p: any) => [p.name, p]));

  // 3. Apply enrichment in a single pass
  const enrich = (o: any) => {
      o.items = o.items.map((item: any) => {
          const product = productMap.get(item.productName);
          return {
              ...item,
              currentMrp: item.mrp || product?.mrp || item.price,
              sku: item.sku || product?.sku,
              category: item.category || (product as any)?.category,
          };
      });
  };

  allOrders.forEach(enrich);


  const isReturned = order.type === 'RETURN' || order.status === 'RETURNED';
  const isRefundOnly = order.returnType === 'REFUND_ONLY';
  const hasReturns = allReturns.length > 0;
  
  const invoiceTitle = hasReturns 
    ? 'CONSOLIDATED INVOICE' 
    : (isReturned ? (isRefundOnly ? 'REFUND RECEIPT' : 'RETURN INVOICE') : 'INVOICE');

  const getItemDetails = (item: any) => {
     if (item.sku) {
         return { sku: item.sku, category: item.category };
     }
     return { sku: '', category: '' };
  };

  const renderItemRow = (item: any, isReturn = false, retId?: string, returnType?: string) => {
      const details = getItemDetails(item);
      const isGstBill = baseOrder.isGstBill;
      const isShills = (item.productName || '').toUpperCase().includes('SHILLS') || 
                       (item.sku || '').toUpperCase().includes('SHILLS');

      const skuParts = details.sku ? details.sku.split('-') : [];
      const lastPart = skuParts.length > 0 ? skuParts[skuParts.length - 1] : '';
      const isNumeric = !isNaN(Number(lastPart)) && lastPart.trim() !== '';

      const returnLabel = returnType === 'REFUND_ONLY' ? 'Refund' : 'Return';

      return (
          <tr key={isReturn ? `ret-${retId}-${item.productName}-${item.sku}` : `base-${item.productName}-${item.sku}`} className={isReturn ? styles.returnRow : ''}>
              <td>
                  <div style={{ fontWeight: 600 }}>
                      {item.productName}
                      {isNumeric && <span style={{ fontWeight: 400, color: isReturn ? 'inherit' : '#444' }}> - {lastPart}</span>}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: isReturn ? 'inherit' : '#666', marginTop: '2px', opacity: isReturn ? 0.8 : 1 }}>
                      {details.sku && `#${details.sku} `}
                      {isReturn && `(${returnLabel})`}
                  </div>
              </td>
              <td>{item.quantity}</td>
              <td>{`₹${item.currentMrp}`}</td>
              <td>
                  {(() => {
                      if (isGstBill && isShills) return `₹${(item.price / 1.18).toFixed(2)}`;
                      return `₹${item.price}`;
                  })()}
              </td>
              {isGstBill && (
                  <>
                      <td>
                          {isShills ? (
                              `₹${((Math.min(item.price * (0.18 / 1.18), item.costPrice || 0) / 2) * item.quantity).toFixed(2)}`
                          ) : '₹0.00'}
                      </td>
                      <td>
                          {isShills ? (
                              `₹${((Math.min(item.price * (0.18 / 1.18), item.costPrice || 0) / 2) * item.quantity).toFixed(2)}`
                          ) : '₹0.00'}
                      </td>
                  </>
              )}
              <td>
                  <div style={{ fontWeight: 600 }}>
                      {isReturn ? '-' : ''}₹{(() => {
                          if (isGstBill && isShills) return ((item.price / 1.18) * item.quantity).toFixed(2);
                          return (item.price * item.quantity).toFixed(2);
                      })()}
                  </div>
              </td>
          </tr>
      );
  };

  const themeColor = isReturned ? '#f59e0b' : 'var(--primary)'; 

  return (
    <div className={`${styles.container} ${isThermal ? styles.thermal : ''}`}>
      {/* Watermark */}
      {!order.isGstBill && (
        <div className={styles.watermark}>
          <Image src="/logo.jpg" alt="Watermark" width={500} height={500} style={{ objectFit: 'contain' }} />
        </div>
      )}

      <div className={styles.content}>
        {/* Header */}

          <div className={styles.header}>
            <h1 className={styles.mainTitle} style={{ color: themeColor }}>{invoiceTitle}</h1>
            
            {/* LEFT COLUMN: Invoice No + Customer Info */}
            <div className={styles.headerLeft}>
              
               {/* Invoice IDs */}
              <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {hasReturns ? 'ORIGINAL INVOICE NO' : (isReturned ? (isRefundOnly ? 'REFUND ID' : 'RETURN INVOICE NO') : 'INVOICE NO')}
                  </div>
                  <div className={styles.mono} style={{ fontSize: '1.25rem', fontWeight: 700, color: '#000' }}>
                      {baseOrder.orderId}
                  </div>
                   {/* Reference ID for Returns if not consolidated */}
                  {(isReturned && !hasReturns && order.originalOrderId) && (
                      <div style={{ marginTop: '0.25rem' }}>
                          <span style={{ fontSize: '0.8rem', color: '#888', marginRight: '0.5rem' }}>Ref:</span>
                          <span className={styles.mono} style={{ fontSize: '0.9rem', fontWeight: 600, color: '#555' }}>
                              #{order.originalOrderId}
                          </span>
                      </div>
                  )}
                  {hasReturns && (
                      <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#666' }}>
                          Includes Returns: {allReturns.map(r => r.orderId).join(', ')}
                      </div>
                  )}
              </div>

              {/* Customer Info */}
              <div>
                  <div style={{ fontSize: '0.85rem', color: '#888', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bill To</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, textTransform: 'capitalize', marginBottom: '2px' }}>{baseOrder.customerName}</div>
                  <div style={{ fontSize: '1rem', color: '#444', marginBottom: '8px' }}>{baseOrder.mobileNumber}</div>
                  
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      Date: <span style={{ fontWeight: 600, color: '#000' }}>{formatDateIST(baseOrder.createdAt)}</span>
                  </div>
              </div>
            </div>

            {/* CENTER COLUMN: Logo */}
            <div className={styles.headerCenter}>
                {!baseOrder.isGstBill && (
                    <Image src="/logo.jpg" alt="Logo" width={100} height={100} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                )}
            </div>

            {/* RIGHT COLUMN: Store Info */}
            <div className={styles.headerRight}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: '4px' }}>
                    {baseOrder.isGstBill ? 'Amitesh Enterprises' : 'NailCart'}
                </div>

                <div className={styles.value} style={{ fontSize: '0.9rem', lineHeight: '1.5', color: '#555' }}>
                    {baseOrder.isGstBill ? (
                        <>
                            Flat No. 121, Vidarbha Theatre Complex,<br />
                            Tiranga Chowk, Hanuman Nagar, Nagpur<br />
                            Nagpur, Maharashtra - 440009<br />
                            <span style={{ fontWeight: 600, color: '#000' }}>GSTIN: 27NQJPS5560M1ZQ</span><br />
                            <span style={{ fontWeight: 600, color: '#000' }}>+91 8600220632</span>
                        </>
                    ) : (
                        <>
                            Shraddha Chowk, Plot No. 14,<br />
                            Opp. SS Collection, Chakradhar Nagar,<br />
                            Jawahar Nagar, Ayodhya Nagar,<br />
                            Nagpur, Maharashtra - 440024<br />
                            <span style={{ fontWeight: 600, color: '#000' }}>+91 8600220632</span>
                        </>
                    )}
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
                    {baseOrder.isGstBill && (
                        <>
                            <th>CGST (9%)</th>
                            <th>SGST (9%)</th>
                        </>
                    )}
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                {/* 1. ORIGINAL ITEMS */}
                {hasReturns && (
                    <tr>
                        <td colSpan={baseOrder.isGstBill ? 7 : 5} className={styles.sectionHeader}>
                            Purchased Items
                        </td>
                    </tr>
                )}
                {baseOrder.items.map((item: any) => renderItemRow(item))}

                {/* 2. RETURNED ITEMS */}
                {hasReturns && (
                    <>
                        <tr>
                            <td colSpan={baseOrder.isGstBill ? 7 : 5} className={`${styles.sectionHeader} ${styles.returnSectionHeader}`}>
                                Returned Items
                            </td>
                        </tr>
                        {allReturns.flatMap((ret) => 
                            ret.items.map((item: any) => renderItemRow(item, true, ret.orderId, ret.returnType))
                        )}
                    </>
                )}
            </tbody>
        </table>

        {/* Totals Section */}
        <div className={styles.totals}>
            <div className={styles.totalsBox}>
                <div className={styles.totalRow}>
                    <span>Original Subtotal</span>
                    <span>₹{(baseOrder.totalAmount + (baseOrder.discount || 0) - (baseOrder.courierFees || 0) - (baseOrder.gstAmount || 0)).toFixed(2)}</span>
                </div>
                {baseOrder.discount > 0 && (
                     <div className={styles.totalRow} style={{ color: '#ef4444' }}>
                        <span>Discount</span>
                        <span>- ₹{baseOrder.discount}</span>
                    </div>
                )}
                {(baseOrder.courierFees || 0) > 0 && (
                     <div className={styles.totalRow}>
                        <span>Courier Fees</span>
                        <span>+ ₹{baseOrder.courierFees}</span>
                    </div>
                )}
                {baseOrder.isGstBill && (
                    <>
                        <div className={styles.totalRow}>
                            <span>CGST (9%)</span>
                            <span>+ ₹{(baseOrder.gstAmount / 2).toFixed(2)}</span>
                        </div>
                        <div className={styles.totalRow}>
                            <span>SGST (9%)</span>
                            <span>+ ₹{(baseOrder.gstAmount / 2).toFixed(2)}</span>
                        </div>
                    </>
                )}
                <div className={`${styles.totalRow} ${!hasReturns ? styles.final : ''}`} style={hasReturns ? { fontWeight: 700, borderTop: '1px solid #eee', marginTop: '4px', paddingTop: '4px' } : {}}>
                    <span>{hasReturns ? 'Original Total' : 'Total Amount'}</span>
                    <span>₹{baseOrder.totalAmount}</span>
                </div>

                {hasReturns && (
                    <>
                        <div className={styles.totalRow} style={{ color: '#be123c', marginTop: '12px' }}>
                            <span>Total Refunded</span>
                            <span>- ₹{allReturns.reduce((sum, r) => sum + r.totalAmount, 0)}</span>
                        </div>
                        <div className={`${styles.totalRow} ${styles.final} ${styles.netTotalBox}`}>
                            <span style={{ fontSize: '1.1rem' }}>Final Net Total</span>
                            <span style={{ fontSize: '1.25rem' }}>₹{(baseOrder.totalAmount - allReturns.reduce((sum, r) => sum + r.totalAmount, 0)).toFixed(2)}</span>
                        </div>
                    </>
                )}
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
        {!order.isGstBill && (
            <div style={{ marginTop: '60px', textAlign: 'center', color: '#888', fontSize: '0.9rem' }}>
                🙏 Thank you for visiting! 🙏
            </div>
        )}

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
