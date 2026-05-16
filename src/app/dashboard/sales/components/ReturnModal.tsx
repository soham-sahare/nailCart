import Modal from '@/components/ui/Modal';
import { Order, OrderItem } from './types';
import styles from '../sales.module.css';

interface ReturnModalProps {
    order: Order | null;
    isOpen: boolean;
    returnItems: OrderItem[];
    returnAction: 'restock' | 'refund';
    returnPaymentMethod: string;
    returnUpiAmount: number;
    returnCashAmount: number;
    sendReturnWhatsapp: boolean;
    onClose: () => void;
    onItemChange: (index: number, delta: number) => void;
    onActionChange: (action: 'restock' | 'refund') => void;
    onPaymentMethodChange: (method: string) => void;
    onUpiChange: (amount: number) => void;
    onCashChange: (amount: number) => void;
    onWhatsappToggle: (checked: boolean) => void;
    onConfirm: () => void;
}

export default function ReturnModal({
    order,
    isOpen,
    returnItems,
    returnAction,
    returnPaymentMethod,
    returnUpiAmount,
    returnCashAmount,
    sendReturnWhatsapp,
    onClose,
    onItemChange,
    onActionChange,
    onPaymentMethodChange,
    onUpiChange,
    onCashChange,
    onWhatsappToggle,
    onConfirm
}: ReturnModalProps) {
    if (!order) return null;

    const refundTotal = returnItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Process Return"
            width="600px"
        >
            <div>
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--surface-hover)', borderRadius: '12px' }}>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Order: {order.orderId}</div>
                    <div style={{ color: '#666', fontSize: '0.9rem' }}>Select items and quantities to return</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                    {[...order.items].sort((a, b) => {
                        if (a.quantity !== b.quantity) return b.quantity - a.quantity;
                        if (a.productName !== b.productName) return a.productName.localeCompare(b.productName);
                        return b.price - a.price;
                    }).map((item, idx) => {
                        const originalIdx = order.items.findIndex(i => i === item);
                        return (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '12px' }}>
                                <div>
                                    <div style={{ fontWeight: 500 }}>{item.productName}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>
                                        {item.sku && `#${item.sku} | `}Sold: {item.quantity} | Price: ₹{item.price}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: returnItems[originalIdx]?.quantity > 0 ? '#ef4444' : '#ccc' }}>
                                        Return: {returnItems[originalIdx]?.quantity || 0}
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            type="button"
                                            onClick={() => onItemChange(originalIdx, -1)}
                                            style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            -
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onItemChange(originalIdx, 1)}
                                            style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ marginTop: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Return Action</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                checked={returnAction === 'restock'}
                                onChange={() => onActionChange('restock')}
                                name="returnAction"
                            />
                            <span>Restock Items & Refund</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                checked={returnAction === 'refund'}
                                onChange={() => onActionChange('refund')}
                                name="returnAction"
                            />
                            <span>Refund Only (Damaged)</span>
                        </label>
                    </div>
                </div>

                {/* Total Refund Amount */}
                <div style={{ textAlign: 'right', marginTop: '1.5rem', fontWeight: 700, fontSize: '1.3rem', color: 'var(--primary)' }}>
                    Refund Total: ₹{refundTotal}
                </div>

                {/* Refund Payment Method */}
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <label style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', display: 'block' }}>Refund Payment Method</label>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        {['CASH', 'UPI', 'SPLIT'].map((method) => (
                            <label key={method} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="returnPaymentMethod"
                                    value={method}
                                    checked={returnPaymentMethod === method}
                                    onChange={(e) => onPaymentMethodChange(e.target.value)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <span style={{ fontWeight: 500 }}>{method}</span>
                            </label>
                        ))}
                    </div>

                    {/* Split Refund Payment Fields */}
                    {returnPaymentMethod === 'SPLIT' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.25rem', display: 'block' }}>UPI Amount (₹)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={returnUpiAmount}
                                    onChange={(e) => onUpiChange(Number(e.target.value))}
                                    min="0"
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.25rem', display: 'block' }}>Cash Amount (₹)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={returnCashAmount}
                                    onChange={(e) => onCashChange(Number(e.target.value))}
                                    min="0"
                                />
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <input
                                type="checkbox"
                                id="returnWhatsapp"
                                checked={sendReturnWhatsapp}
                                onChange={(e) => onWhatsappToggle(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#25D366' }}
                            />
                            <label htmlFor="returnWhatsapp" style={{ cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                Send Receipt on
                                <span style={{ color: '#25D366' }}>
                                    WhatsApp
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className={styles.modalActions}>
                    <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
                    <button
                        className="btn-primary"
                        onClick={onConfirm}
                        style={{ padding: '0.75rem 2rem' }}
                    >
                        Confirm Return
                    </button>
                </div>
            </div>
        </Modal>
    );
}
