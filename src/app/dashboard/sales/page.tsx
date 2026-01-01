'use client';

import { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiEye, FiMinus } from 'react-icons/fi';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { useToast } from '@/components/ui/Toast';
import styles from './sales.module.css';
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

interface Product {
  _id: string;
  name: string;
  sellingPrice: number;
}

export default function SalesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  
  // Toast
  const { showToast } = useToast();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  
  const [formData, setFormData] = useState({
    customerName: '',
    mobileNumber: '',
    items: [{ productName: '', quantity: 1, price: 0 }],
    discount: 0,
    totalAmount: 0 // Will auto calc
  });
  const [error, setError] = useState('');

  // WhatsApp State
  const [sendWhatsapp, setSendWhatsapp] = useState(false);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales?search=${search}&page=${page}&limit=${limit}`);
      const data = await res.json();
      setOrders(data.data);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=1000'); // Fetch all for dropdown
      const data = await res.json();
      setProducts(data.data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, [search, page, limit]);

  // Recalculate total when items change
  useEffect(() => {
      const subtotal = formData.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
      const total = Math.max(0, subtotal - Number(formData.discount));
      setFormData(prev => ({ ...prev, totalAmount: total }));
  }, [formData.items, formData.discount]);

  const handleOpenModal = (order?: Order) => {
    if (order) {
      setEditingOrder(order);
      setFormData({
        customerName: order.customerName,
        mobileNumber: order.mobileNumber || '',
        items: order.items.map(i => ({...i})),
        discount: order.discount || 0,
        totalAmount: order.totalAmount
      });
    } else {
      setEditingOrder(null);
      setFormData({
        customerName: '',
        mobileNumber: '',
        items: [{ productName: '', quantity: 1, price: 0 }],
        discount: 0,
        totalAmount: 0 // Will auto calc
      });
      setSendWhatsapp(false);
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleViewOrder = (order: Order) => {
    setViewingOrder(order);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingOrder(null);
    setViewingOrder(null);
    setDeleteId(null);
  };

  // Form Handlers
  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
      const newItems = [...formData.items];
      
      if (field === 'productName') {
        // Find product and auto-fill price
        const product = products.find(p => p.name === value);
        if (product) {
             newItems[index] = { ...newItems[index], productName: value, price: product.sellingPrice };
        } else {
             newItems[index] = { ...newItems[index], productName: value };
        }
      } else {
        newItems[index] = { ...newItems[index], [field]: value };
      }
      
      setFormData({ ...formData, items: newItems });
  };

  const handleQuantityChange = (index: number, delta: number) => {
      const newItems = [...formData.items];
      const currentQty = newItems[index].quantity || 0;
      const newQty = Math.max(1, currentQty + delta);
      newItems[index] = { ...newItems[index], quantity: newQty };
      setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
      setFormData({ ...formData, items: [...formData.items, { productName: '', quantity: 1, price: 0 }] });
  };

  const removeItem = (index: number) => {
      if(formData.items.length === 1) return;
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
  }

  const generateWhatsappMessage = (order: Order) => {
      let message = `*BILL INVOICE* 🧾\n\n`;
      message += `*Sale ID:* ${order.orderId}\n`;
      message += `*Date:* ${new Date().toLocaleDateString()}\n`;
      message += `*Customer:* ${order.customerName}\n\n`;
      message += `*Items:*\n`;
      
      order.items.forEach(item => {
          message += `• ${item.productName} (x${item.quantity}) - ₹${item.price * item.quantity}\n`;
      });
      
      message += `\n*Subtotal:* ₹${order.totalAmount + (order.discount || 0)}\n`;
      if (order.discount > 0) {
          message += `*Discount:* -₹${order.discount}\n`;
      }
      message += `*TOTAL AMOUNT:* ₹${order.totalAmount}\n\n`;
      
      
      // Add Invoice Link (Public)
      const invoiceUrl = `${window.location.origin}/invoice/${order._id}`;
      message += `📄 *View Invoice:* ${invoiceUrl}\n\n`;

      message += `Thank you for shopping with us! ✨`;
      
      return encodeURIComponent(message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const url = editingOrder 
        ? `/api/sales/${editingOrder._id}` 
        : '/api/sales';
      
      const method = editingOrder ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      handleCloseModal();
      fetchOrders();

      const savedOrder = data.data; // API returns { success: true, data: order }

      if (sendWhatsapp && savedOrder && savedOrder.mobileNumber) {
          const message = generateWhatsappMessage(savedOrder);
          const url = `https://wa.me/91${savedOrder.mobileNumber}?text=${message}`; // Assuming India +91, can be dynamic later
          window.open(url, '_blank');
      } else if (savedOrder) {
          // If WhatsApp is NOT checked, open the invoice immediately
          window.open(`/invoice/${savedOrder._id}`, '_blank');
      }

      showToast('success', editingOrder ? 'Sale Updated' : 'Sale Created', 
        editingOrder ? `Sale ${savedOrder.orderId} updated successfully.` : `New sale ${savedOrder.orderId} created successfully.`);

    } catch (err: any) {
      setError(err.message);
      showToast('error', 'Error', err.message);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    const orderToDelete = orders.find(o => o._id === deleteId);
    const orderId = orderToDelete?.orderId || 'Unknown';

    try {
      const res = await fetch(`/api/sales/${deleteId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        handleCloseModal();
        fetchOrders();
        showToast('success', 'Sale Deleted', `Sale ${orderId} has been deleted.`);
      } else {
        showToast('error', 'Error', 'Failed to delete sale');
      }
    } catch (err) {
      showToast('error', 'Error', 'An unexpected error occurred');
    } finally {
      if (!isModalOpen) setDeleteId(null);
    }
  };

  const getStatusClass = (status: string) => {
      switch(status) {
          case 'COMPLETED': return styles.statusCompleted;
          case 'CANCELLED': return styles.statusCancelled;
          default: return styles.statusPending;
      }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Sales</h1>
      </div>

      <div className={`${styles.controls} glass`}>
        <div className={styles.searchGroup}>
          <FiSearch color="#888" size={20} />
          <input
            type="text"
            placeholder="Search sales (ID or Customer)..."
            className={`input-field ${styles.searchInput}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.controlActions}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#666' }}>Show:</span>
              <div style={{ width: '80px' }}>
                  <CustomDropdown 
                      options={[
                          { value: '5', label: '5' },
                          { value: '10', label: '10' },
                          { value: '20', label: '20' }
                      ]}
                      value={String(limit)}
                      onChange={(val) => setLimit(Number(val))}
                  />
              </div>
          </div>

          <button 
            className="btn-primary" 
            onClick={() => handleOpenModal()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}
          >
            <FiPlus /> Add Sale
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Sale ID</th>
              <th>Customer</th>
              <th>Mobile Number</th>
              <th>Total Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center' }}>Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center' }}>No sales found</td></tr>
            ) : (
              orders.map((order) => (
                <tr key={order._id}>
                  <td>
                      <a 
                        href={`/invoice/${order._id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                            fontFamily: 'monospace', 
                            fontWeight: 600, 
                            color: 'var(--primary)', 
                            textDecoration: 'underline',
                            cursor: 'pointer' 
                        }}
                      >
                        {order.orderId}
                      </a>
                  </td>
                  <td>{order.customerName}</td>
                  <td style={{ fontFamily: 'monospace' }}>{order.mobileNumber}</td>
                  <td>₹{order.totalAmount}</td>
                  <td>
                    <div className={styles.actions}>
                      <button 
                        className={`${styles.actionBtn} ${styles.btnView}`}
                        onClick={() => handleViewOrder(order)}
                        title="View Details"
                      >
                        <FiEye size={16} />
                      </button>

                      <button 
                        className={`${styles.actionBtn} ${styles.btnEdit}`}
                        onClick={() => handleOpenModal(order)}
                        title="Edit"
                      >
                        <FiEdit2 size={16} />
                      </button>

                      <button 
                        className={`${styles.actionBtn} ${styles.btnDelete}`}
                        onClick={() => handleDeleteClick(order._id)}
                        title="Delete"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <button 
          className={styles.pageBtn} 
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Prev
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            className={`${styles.pageBtn} ${page === p ? styles.active : ''}`}
            onClick={() => setPage(p)}
          >
            {p}
          </button>
        ))}
        <button 
          className={styles.pageBtn}
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} glass`}>
            <div className={styles.modalHeader}>
              <h2 className="gradient-text" style={{ fontSize: '1.5rem' }}>
                {editingOrder ? 'Edit Sale' : 'New Sale'}
              </h2>
              <button className={styles.closeBtn} onClick={handleCloseModal}>
                <FiX />
              </button>
            </div>

            {error && <div className={styles.error} style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                 
                <div className={styles.formGrid}>
                    <div>
                        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Customer Name</label>
                        <input
                            type="text"
                            className="input-field"
                            value={formData.customerName}
                            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                            required
                            placeholder="Full Name"
                        />
                    </div>
                     <div>
                        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Mobile Number</label>
                        <input
                            type="text"
                            className="input-field"
                            value={formData.mobileNumber}
                            onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                            required
                            placeholder="Mobile Number"
                        />
                    </div>
                </div>

                <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Order Items</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {formData.items.map((item, index) => (
                            <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <div style={{ flex: 2 }}>
                                    <CustomDropdown
                                        options={products.map(p => ({ value: p.name, label: p.name }))}
                                        value={item.productName}
                                        onChange={(val) => handleItemChange(index, 'productName', val)}
                                        placeholder="Select Product"
                                        searchable={true}
                                    />
                                </div>

                                {/* Quantity Stepper */}
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    border: '1px solid var(--border)', 
                                    borderRadius: '50px', // More pill-shaped
                                    overflow: 'hidden',
                                    height: '42px', // Compact height
                                    background: 'var(--surface)'
                                }}>
                                    <button 
                                        type="button"
                                        onClick={() => handleQuantityChange(index, -1)}
                                        style={{ 
                                            width: '36px',
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'transparent',
                                            border: 'none', 
                                            color: 'var(--foreground)',
                                            cursor: 'pointer',
                                            fontSize: '1.2rem',
                                            borderRight: '1px solid var(--border)',
                                            paddingBottom: '2px' // Visual center fix
                                        }}
                                    >
                                        -
                                    </button>
                                    <div style={{
                                        width: '40px',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.95rem',
                                        fontWeight: 600
                                    }}>
                                        {item.quantity}
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => handleQuantityChange(index, 1)}
                                        style={{ 
                                            width: '36px',
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'transparent',
                                            border: 'none', 
                                            color: 'var(--primary)',
                                            cursor: 'pointer',
                                            fontSize: '1.2rem',
                                            borderLeft: '1px solid var(--border)',
                                            paddingBottom: '2px'
                                        }}
                                    >
                                        +
                                    </button>
                                </div>

                                {/* Price Input */}
                                <div style={{ position: 'relative', height: '42px' }}>
                                    <span style={{ 
                                        position: 'absolute', 
                                        left: '12px', 
                                        top: '50%', 
                                        transform: 'translateY(-50%)', 
                                        color: 'var(--foreground)',
                                        opacity: 0.6,
                                        fontSize: '0.9rem',
                                        pointerEvents: 'none',
                                        zIndex: 10
                                    }}>₹</span>
                                    <input 
                                        type="number"
                                        placeholder="Price" 
                                        className="input-field" 
                                        value={item.price} 
                                        onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))}
                                        required
                                        min="0"
                                        style={{ 
                                            width: '100px', 
                                            paddingLeft: '24px', 
                                            paddingRight: '10px',
                                            height: '100%',
                                            textAlign: 'center', 
                                            borderRadius: '50px'
                                        }} 
                                    />
                                </div>

                                {formData.items.length > 1 && (
                                    <button type="button" className={styles.removeItemBtn} onClick={() => removeItem(index)}>
                                        <FiMinus size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <button type="button" className={styles.addItemBtn} onClick={addItem}>
                        <FiPlus /> Add Item
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                         <label style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.25rem' }}>Discount (₹)</label>
                         <input 
                            type="number" 
                            className="input-field" 
                            style={{ width: '100px', textAlign: 'right' }}
                            value={formData.discount}
                            onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                            min="0"
                         />
                    </div>
                </div>

                <div style={{ textAlign: 'right', marginTop: '0.5rem', fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)' }}>
                    Total: ₹{formData.totalAmount}
                </div>

              </div>

              <div className={styles.modalActions}>
                <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                        type="checkbox" 
                        id="whatsappDetails" 
                        checked={sendWhatsapp}
                        onChange={(e) => setSendWhatsapp(e.target.checked)}
                        style={{ width: '1.2rem', height: '1.2rem', accentColor: '#25D366', cursor: 'pointer' }}
                    />
                    <label htmlFor="whatsappDetails" style={{ cursor: 'pointer', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        Send Bill on WhatsApp <span style={{fontSize: '1.2rem'}}>📱</span>  
                    </label>
                </div>

                <button type="button" className={styles.btnCancel} onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingOrder ? 'Update' : 'Generate Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingOrder && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} glass`}>
            <div className={styles.modalHeader}>
              <h2 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                Sale Details
              </h2>
              <button className={styles.closeBtn} onClick={handleCloseModal}>
                <FiX />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Sale ID</span>
                    <span className={styles.detailValue} style={{ fontFamily: 'monospace' }}>{viewingOrder.orderId}</span>
                </div>
                <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Customer</span>
                    <span className={styles.detailValue}>{viewingOrder.customerName}</span>
                </div>
                <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Mobile</span>
                    <span className={styles.detailValue} style={{ fontFamily: 'monospace' }}>{viewingOrder.mobileNumber}</span>
                </div>
                <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Date</span>
                    <span className={styles.detailValue}>{formatDateIST(viewingOrder.createdAt)}</span>
                </div>

                <div style={{ marginTop: '1rem' }}>
                    <div className={styles.detailRow} style={{ borderBottom: 'none', paddingBottom: '0.5rem' }}>
                        <span className={styles.detailLabel}>Items</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', overflow: 'hidden' }}>
                        {viewingOrder.items.map((item, idx) => (
                            <div key={idx} style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                padding: '0.75rem 1rem',
                                borderBottom: idx !== viewingOrder.items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                            }}>
                                <span>{item.productName} <span style={{opacity: 0.6}}>x{item.quantity}</span></span>
                                <span>₹{item.price * item.quantity}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.detailRow} style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                    <span className={styles.detailLabel}>Subtotal</span>
                    <span className={styles.detailValue}>₹{viewingOrder.totalAmount + (viewingOrder.discount || 0)}</span>
                </div>
                {viewingOrder.discount > 0 && (
                    <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Discount</span>
                        <span className={styles.detailValue} style={{ color: '#ef4444' }}>- ₹{viewingOrder.discount}</span>
                    </div>
                )}
                <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Total Amount</span>
                    <span className={styles.detailValue} style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>₹{viewingOrder.totalAmount}</span>
                </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={handleCloseModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} glass`} style={{ maxWidth: '400px' }}>
            <div className={styles.modalHeader}>
              <h2 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                Delete Sale?
              </h2>
              <button className={styles.closeBtn} onClick={handleCloseModal}>
                <FiX />
              </button>
            </div>
            
            <p style={{ color: 'var(--foreground)', marginBottom: '2rem', lineHeight: '1.6', fontSize: '1.1rem' }}>
              Are you sure you want to delete sale <strong style={{ textDecoration: 'underline', textDecorationColor: 'var(--primary)', textUnderlineOffset: '4px', fontFamily: 'monospace' }}>{orders.find(o => o._id === deleteId)?.orderId}</strong>?
            </p>

            <div className={styles.modalActions}>
              <button 
                className={styles.btnCancel} 
                onClick={handleCloseModal}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.75rem 1.5rem' }}
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
