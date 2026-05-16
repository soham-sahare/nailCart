import { FiMinus } from 'react-icons/fi';
import Modal from '@/components/ui/Modal';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { Order, OrderItem, Product } from './types';
import styles from '../sales.module.css';

interface NewOrderModalProps {
    isOpen: boolean;
    editingOrder: Order | null;
    formData: any;
    contacts: any[];
    products: Product[];
    activeProduct: string;
    sendWhatsapp: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onFormDataChange: (data: any) => void;
    onContactSearch: (val: string) => void;
    onProductSearch: (val: string) => void;
    onContactSelect: (val: string) => void;
    onAddProduct: (val: string) => void;
    onQuantityChange: (index: number, delta: number) => void;
    onRemoveItem: (index: number) => void;
    onWhatsappToggle: (checked: boolean) => void;
}

export default function NewOrderModal({
    isOpen,
    editingOrder,
    formData,
    contacts,
    products,
    activeProduct,
    sendWhatsapp,
    onClose,
    onSubmit,
    onFormDataChange,
    onContactSearch,
    onProductSearch,
    onContactSelect,
    onAddProduct,
    onQuantityChange,
    onRemoveItem,
    onWhatsappToggle
}: NewOrderModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingOrder ? 'Edit Sale' : 'New Sale'}
            width="1100px"
        >
            <form onSubmit={onSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className={styles.formGrid}>
                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Customer Name</label>
                            <CustomDropdown
                                options={contacts.map(c => ({
                                    value: `${c.name}|${c.phone || ''}`,
                                    label: `${c.name} ${c.phone ? `[${c.phone}]` : ''}`
                                }))}
                                value={formData.customerName}
                                onChange={onContactSelect}
                                placeholder="🔍 Search Contact or Type Name..."
                                searchable={true}
                                allowCustomValue={true}
                                onSearch={onContactSearch}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Mobile Number</label>
                            <input
                                type="text"
                                className="input-field"
                                value={formData.mobileNumber}
                                onChange={(e) => onFormDataChange({ ...formData, mobileNumber: e.target.value })}
                                required
                                placeholder="Mobile Number"
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Order Items</label>
                        <div style={{ marginBottom: '1rem' }}>
                            <CustomDropdown
                                options={products.map(p => ({
                                    value: p._id,
                                    label: `${p.name} ${p.sku ? `(SKU: ${p.sku})` : ''}`
                                }))}
                                value={activeProduct}
                                onChange={onAddProduct}
                                placeholder="🔍 Search Product (Name, SKU)..."
                                searchable={true}
                                onSearch={onProductSearch}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {formData.items.map((item: OrderItem, index: number) => (
                                item.productName && (
                                    <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <div style={{ flex: 2, display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 12px', height: '42px', color: 'var(--foreground)' }}>
                                            <span style={{ fontWeight: 500 }}>{item.productName}</span>
                                            {item.sku && <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: '#666' }}>#{item.sku}</span>}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', height: '42px', background: 'var(--surface)' }}>
                                            <button
                                                type="button"
                                                onClick={() => onQuantityChange(index, -1)}
                                                style={{ width: '36px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', fontSize: '1.2rem', borderRight: '1px solid var(--border)', paddingBottom: '2px' }}
                                            >
                                                -
                                            </button>
                                            <div style={{ width: '40px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', fontWeight: 600 }}>
                                                {item.quantity}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => onQuantityChange(index, 1)}
                                                style={{ width: '36px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '1.2rem', borderLeft: '1px solid var(--border)', paddingBottom: '2px' }}
                                            >
                                                +
                                            </button>
                                        </div>

                                        <div style={{ position: 'relative', height: '42px' }}>
                                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground)', opacity: 0.6, fontSize: '0.9rem', pointerEvents: 'none', zIndex: 10 }}>₹</span>
                                            <input
                                                type="number"
                                                placeholder="Price"
                                                className="input-field"
                                                value={item.price}
                                                readOnly
                                                style={{ width: '100px', paddingLeft: '24px', paddingRight: '10px', height: '100%', textAlign: 'center', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'default', color: 'var(--foreground)' }}
                                            />
                                        </div>

                                        <button type="button" className={styles.removeItemBtn} onClick={() => onRemoveItem(index)}>
                                            <FiMinus size={16} />
                                        </button>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <label style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.25rem' }}>Discount (₹)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    style={{ width: '100px', textAlign: 'right' }}
                                    value={formData.discount}
                                    onChange={(e) => onFormDataChange({ ...formData, discount: Number(e.target.value) })}
                                    min="0"
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <label style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.25rem' }}>Courier Fees (₹)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    style={{ width: '100px', textAlign: 'right' }}
                                    value={formData.courierFees}
                                    onChange={(e) => onFormDataChange({ ...formData, courierFees: Number(e.target.value) })}
                                    min="0"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--primary)' }}>
                                Total Bill: ₹{formData.totalAmount}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.9rem', color: '#888' }}>Balance Due (₹)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    style={{ width: '120px', textAlign: 'right', fontWeight: 600, color: '#ef4444' }}
                                    value={formData.balance}
                                    onChange={(e) => onFormDataChange({ ...formData, balance: Number(e.target.value) })}
                                    min="0"
                                />
                                {formData.balance > 0 && (
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.addToLedger}
                                            onChange={(e) => onFormDataChange({ ...formData, addToLedger: e.target.checked })}
                                            style={{ width: '16px', height: '16px' }}
                                        />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>Add to Ledger</span>
                                    </label>
                                )}
                            </div>

                            <div style={{ padding: '0.75rem 1rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Payment Method</label>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    {['CASH', 'UPI', 'SPLIT'].map((method) => (
                                        <label key={method} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value={method}
                                                checked={formData.paymentMethod === method}
                                                onChange={(e) => {
                                                    const newMethod = e.target.value;
                                                    onFormDataChange({
                                                        ...formData,
                                                        paymentMethod: newMethod,
                                                        upiAmount: newMethod === 'UPI' ? formData.totalAmount : 0,
                                                        cashAmount: newMethod === 'CASH' ? formData.totalAmount : 0
                                                    });
                                                }}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontWeight: 500 }}>{method}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {formData.paymentMethod === 'SPLIT' && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.75rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <label style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.25rem' }}>UPI (₹)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    style={{ width: '100px', textAlign: 'right' }}
                                    value={formData.upiAmount}
                                    onChange={(e) => {
                                        const upi = Number(e.target.value);
                                        onFormDataChange({
                                            ...formData,
                                            upiAmount: upi,
                                            cashAmount: Math.max(0, formData.totalAmount - upi)
                                        });
                                    }}
                                    min="0"
                                    max={formData.totalAmount}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <label style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.25rem' }}>Cash (₹)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    style={{ width: '100px', textAlign: 'right' }}
                                    value={formData.cashAmount}
                                    onChange={(e) => {
                                        const cash = Number(e.target.value);
                                        onFormDataChange({
                                            ...formData,
                                            cashAmount: cash,
                                            upiAmount: Math.max(0, formData.totalAmount - cash)
                                        });
                                    }}
                                    min="0"
                                    max={formData.totalAmount}
                                />
                            </div>
                        </div>
                    )}

                    {!editingOrder && (
                        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                id="whatsapp"
                                checked={sendWhatsapp}
                                onChange={(e) => onWhatsappToggle(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#25D366' }}
                            />
                            <label htmlFor="whatsapp" style={{ cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                Send Invoice on
                                <span style={{ color: '#25D366' }}> WhatsApp</span>
                            </label>
                        </div>
                    )}

                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            id="isGstBill"
                            checked={formData.isGstBill}
                            onChange={(e) => onFormDataChange({ ...formData, isGstBill: e.target.checked })}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <label htmlFor="isGstBill" style={{ cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500, color: 'var(--primary)' }}>
                            Create GST Bill (Amitesh Enterprises)
                        </label>
                    </div>

                    <div className={styles.modalActions}>
                        <button type="button" className={styles.btnCancel} onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2rem' }}>
                            {editingOrder ? 'Update Sale' : 'Complete Sale'}
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
