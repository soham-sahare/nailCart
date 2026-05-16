import { useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDateIST } from '@/lib/dateUtils';
import { Order } from './types';
import styles from '../sales.module.css';
import { downloadPDF } from '@/lib/pdfUtils';

interface OrderDetailsModalProps {
    order: Order | null;
    onClose: () => void;
}

export default function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
    const [isDownloading, setIsDownloading] = useState(false);

    if (!order) return null;

    const handleDownload = async () => {
        setIsDownloading(true);
        // Small delay to ensure any layout shifts finish
        setTimeout(async () => {
            await downloadPDF('order-details-content', `invoice-${order.orderId}.pdf`);
            setIsDownloading(false);
        }, 100);
    };

    return (
        <Modal
            isOpen={!!order}
            onClose={onClose}
            title="Order Details"
            width="700px"
        >
            <div id="order-details-content" style={{ background: 'var(--background)', padding: '20px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.9rem', color: '#888' }}>Order ID</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                {order.orderId}
                            </div>
                            {order.originalOrderId && (
                                <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.25rem' }}>
                                    Ref: {order.originalOrderId}
                                </div>
                            )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.9rem', color: '#888' }}>Date</div>
                            <div style={{ fontWeight: 500 }}>{formatDateIST(order.createdAt)}</div>
                        </div>
                    </div>

                    <div className={styles.viewGrid}>
                        <div className={styles.detailRow} style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                            <span className={styles.detailLabel}>Customer Name</span>
                            <span className={styles.detailValue} style={{ textAlign: 'left' }}>{order.customerName}</span>
                        </div>
                        <div className={styles.detailRow} style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                            <span className={styles.detailLabel}>Mobile</span>
                            <span className={styles.detailValue} style={{ textAlign: 'left' }}>{order.mobileNumber}</span>
                        </div>
                        <div className={styles.detailRow} style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                            <span className={styles.detailLabel}>Status</span>
                            <StatusBadge status={order.status || 'PENDING'} />
                        </div>
                        <div className={styles.detailRow} style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                            <span className={styles.detailLabel}>Created By</span>
                            <span className={styles.detailValue} style={{ textAlign: 'left', fontWeight: 600, color: 'var(--primary)' }}>{order.createdBy || 'System'}</span>
                        </div>
                    </div>

                    {/* Items List */}
                    <div style={{ marginTop: '1rem', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: 'var(--surface-hover)' }}>
                                <tr>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#666' }}>Item</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: '#666' }}>Qty</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', color: '#666' }}>Price</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', color: '#666' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...order.items].sort((a, b) => b.quantity - a.quantity).map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.75rem' }}>
                                            <div style={{ fontWeight: 500 }}>{item.productName}</div>
                                            {item.sku && <div style={{ fontSize: '0.75rem', color: '#888' }}>#{item.sku}</div>}
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>{item.quantity}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{item.price}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{item.price * item.quantity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', marginTop: '1rem', paddingRight: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '2rem' }}>
                            <span style={{ color: '#888' }}>Subtotal:</span>
                            <span style={{ fontWeight: 600 }}>₹{order.totalAmount + (order.discount || 0) - (order.courierFees || 0)}</span>
                        </div>
                        {order.discount > 0 && (
                            <div style={{ display: 'flex', gap: '2rem', color: '#ef4444' }}>
                                <span>Discount:</span>
                                <span>- ₹{order.discount}</span>
                            </div>
                        )}
                        {(order.courierFees || 0) > 0 && (
                            <div style={{ display: 'flex', gap: '2rem' }}>
                                <span>Courier Fees:</span>
                                <span>+ ₹{order.courierFees}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '2rem', fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                            <span>Total:</span>
                            <span>₹{order.totalAmount}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.modalActions} style={{ marginTop: '1.5rem' }}>
                <button className={styles.btnCancel} onClick={onClose}>
                    Close
                </button>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                        className="btn-secondary" 
                        onClick={handleDownload}
                        disabled={isDownloading}
                        style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        {isDownloading ? 'Generating...' : 'Download PDF'}
                    </button>
                    <button className="btn-primary" onClick={() => window.open(`/invoice/${order._id}`, '_blank')}>
                        Print Original
                    </button>
                </div>
            </div>
        </Modal>
    );
}
