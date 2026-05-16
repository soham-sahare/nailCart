import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import ActionButtons from '@/components/ui/ActionButtons';
import { FiCornerUpLeft } from 'react-icons/fi';
import { Order } from './types';
import styles from '../sales.module.css';

interface SalesTableProps {
    orders: Order[];
    loading: boolean;
    session: any;
    onView: (order: Order) => void;
    onEdit: (order: Order) => void;
    onDelete: (id: string) => void;
    onReturn: (order: Order) => void;
}

export default function SalesTable({ 
    orders, 
    loading, 
    session, 
    onView, 
    onEdit, 
    onDelete, 
    onReturn 
}: SalesTableProps) {
    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Sale ID</th>
                        <th>Customer</th>
                        <th>Mobile Number</th>
                        <th>Status</th>
                        <th>Total Amount</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>Loading...</td></tr>
                    ) : orders.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>No sales found</td></tr>
                    ) : (
                        orders.map((order) => (
                            <tr key={order._id}>
                                <td>
                                    <Link
                                        href={`/invoice/${order._id}`}
                                        target="_blank"
                                        style={{ color: 'var(--primary)', fontWeight: 600, fontFamily: 'monospace', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px', display: 'inline-block' }}
                                    >
                                        {order.orderId}
                                    </Link>
                                    {order.originalOrderId && (
                                        <Link 
                                            href={`/invoice/${order.originalOrderId}`}
                                            target="_blank"
                                            style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem', display: 'block', textDecoration: 'none', cursor: 'pointer' }}
                                            onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                            onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                        >
                                            Ref: {order.originalOrderId}
                                        </Link>
                                    )}
                                </td>
                                <td style={{ fontWeight: 500 }}>{order.customerName}</td>
                                <td>{order.mobileNumber || '-'}</td>
                                <td>
                                    <StatusBadge status={order.status || 'PENDING'} />
                                </td>
                                <td style={{ fontWeight: 600 }}>₹{order.totalAmount}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                        <ActionButtons
                                            onView={() => onView(order)}
                                            onEdit={(session?.user as any)?.role !== 'STAFF' && order.status !== 'RETURNED' && order.status !== 'REFUNDED' ? () => onEdit(order) : undefined}
                                            onDelete={(session?.user as any)?.role !== 'STAFF' ? () => onDelete(order._id) : undefined}
                                            customActions={
                                                order.status === 'COMPLETED' && (
                                                    <button
                                                        className={`${styles.actionBtn}`}
                                                        style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', marginRight: '0.5rem' }}
                                                        onClick={(e) => { e.stopPropagation(); onReturn(order); }}
                                                        title="Process Return"
                                                    >
                                                        <FiCornerUpLeft size={16} />
                                                    </button>
                                                )
                                            }
                                        />
                                    </div>
                                </td>

                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
