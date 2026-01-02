'use client';

import { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiEye, FiMinus, FiCornerUpLeft } from 'react-icons/fi';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { useToast } from '@/components/ui/Toast';
import styles from './sales.module.css';
import { formatDateIST } from '@/lib/dateUtils';

interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
  sku?: string;
  category?: string;
}

interface Order {
  _id: string;
  orderId: string;
  customerName: string;
  mobileNumber: string;
  title: string;
  items: OrderItem[];
  discount: number;
  totalAmount: number;
  status?: string;
  type?: string;
  originalOrderId?: string;
  hasReturn?: boolean;
  returnType?: string;
  createdAt: string;
}

interface Product {
  _id: string;
  name: string;
  sellingPrice: number;
  sku: string;
  category: { name: string };
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
  
  const [formData, setFormData] = useState<{
    customerName: string;
    mobileNumber: string;
    items: OrderItem[];
    discount: number;
    totalAmount: number;
  }>({
    customerName: '',
    mobileNumber: '',
    items: [],
    discount: 0,
    totalAmount: 0 // Will auto calc
  });
  const [activeProduct, setActiveProduct] = useState('');
  const [error, setError] = useState('');
  const [sendWhatsapp, setSendWhatsapp] = useState(false);

  // ... (fetchOrder, fetchProducts, etc remain same)

  // Add Product Handler (Single Search)
  const handleAddProduct = (productName: string) => {
      if (!productName) return;

      const product = products.find(p => p.name === productName);
      if (!product) return;

      // Check if product already exists
      const existingItemIndex = formData.items.findIndex(item => item.productName === productName);

      if (existingItemIndex !== -1) {
          // Merge Logic: Increment Quantity
          const newItems = [...formData.items];
          newItems[existingItemIndex].quantity += 1;
          setFormData({ ...formData, items: newItems });
          showToast('success', 'Merged', `"${productName}" already exists. Added +1 quantity.`);
      } else {
          // Add New Logic
          const newItem: OrderItem = {
              productName: product.name,
              quantity: 1,
              price: product.sellingPrice,
              sku: product.sku,
              category: product.category?.name || ''
          };

          setFormData({ 
              ...formData, 
              // If the list has only one empty item (initial state), replace it. Otherwise append.
              items: (formData.items.length === 1 && !formData.items[0].productName) 
                  ? [newItem] 
                  : [...formData.items, newItem] 
          });
      }
      
      setActiveProduct(''); // Reset dropdown
  };

  // ... (handleDeleteClick, etc)




  // Delete & Return State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [returnOrder, setReturnOrder] = useState<Order | null>(null); // Full order being returned
  const [returnItems, setReturnItems] = useState<OrderItem[]>([]); // Items selected for return
  const [returnAction, setReturnAction] = useState<'restock' | 'refund'>('restock');

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
      const res = await fetch('/api/products?limit=1000&status=ACTIVE'); // Fetch all active for dropdown
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
        items: [{ productName: '', quantity: 1, price: 0, sku: '', category: '' }],
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
    setViewingOrder(null);
    setDeleteId(null);
    setReturnOrder(null);
  };

  // Form Handlers
  const handleReturnClick = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setReturnOrder(order);
    // Initialize return items with 0 quantity but keeping details
    setReturnItems(order.items.map(item => ({
        ...item,
        quantity: 0 // Default to 0, user selects what to return
    })));
  };
  
  const handleReturnItemChange = (index: number, delta: number) => {
      if (!returnOrder) return;
      const maxQty = returnOrder.items[index].quantity;
      const newItems = [...returnItems];
      const currentQty = newItems[index].quantity;
      const newQty = Math.max(0, Math.min(maxQty, currentQty + delta));
      
      newItems[index].quantity = newQty;
      setReturnItems(newItems);
  };

  const confirmReturn = async () => {
      if (!returnOrder) return;
      
      const itemsToReturn = returnItems.filter(i => i.quantity > 0);
      if (itemsToReturn.length === 0) {
          showToast('error', 'Selection Required', 'Please select at least one item to return.');
          return;
      }

      try {
        const res = await fetch(`/api/sales/return`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                originalOrderId: returnOrder.orderId,
                items: itemsToReturn,
                returnType: returnAction === 'restock' ? 'RESTOCK' : 'REFUND_ONLY'
            })
        });
        
        const data = await res.json();
        
        if (data.success) {
            showToast('success', 'Return Processed', `Return Invoice ${data.data.orderId} created.`);
            fetchOrders(); // Refresh list
            handleCloseModal(); // Close modals
        } else {
            showToast('error', 'Error', data.message || 'Failed to process return');
        }
      } catch (err) {
        showToast('error', 'Error', 'Failed to process return');
      } finally {
          setReturnOrder(null);
      }
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
      const newItems = [...formData.items];
      const item = { ...newItems[index] };

      if (field === 'productName') {
          const product = products.find(p => p.name === value);
          item.productName = value;
          if (product) {
              item.price = product.sellingPrice;
              item.sku = product.sku;
              item.category = product.category?.name || '';
          }
      } else {
          (item as any)[field] = value;
      }
      
      newItems[index] = item;
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

  const handleDeleteClick = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  const getStatusInfo = (order: Order) => {
      if (order.status === 'RETURNED') {
          if (order.returnType === 'REFUND_ONLY') {
              return { label: 'REFUND', className: styles.statusRefunded };
          }
          return { label: 'RETURN', className: styles.statusReturned };
      }
      if (order.status === 'CANCELLED') return { label: 'CANCELLED', className: styles.statusCancelled };
      return { label: 'COMPLETED', className: styles.statusCompleted };
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
              <th>Status</th>
              <th>Total Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center' }}>Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center' }}>No sales found</td></tr>
            ) : (
              orders.map((order) => (
                <tr key={order._id}>
                  <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                          {order.originalOrderId && (
                              <span style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px' }}>
                                  Ref: <span style={{ fontFamily: 'monospace' }}>{order.originalOrderId}</span>
                              </span>
                          )}
                      </div>
                  </td>
                  <td>{order.customerName}</td>
                  <td style={{ fontFamily: 'monospace' }}>{order.mobileNumber}</td>
                  <td>
                    {(() => {
                        const { label, className } = getStatusInfo(order);
                        return <span className={className}>{label}</span>;
                    })()}
                  </td>
                  <td>₹{order.totalAmount}</td>
                  <td>
                    <div className={styles.actions}>
                      <button 
                        className={`${styles.actionBtn} ${styles.btnView}`}
                        onClick={(e) => { e.stopPropagation(); handleViewOrder(order); }}
                        title="View Details"
                      >
                        <FiEye size={16} />
                      </button>

                      {order.status !== 'RETURNED' && (
                        <button 
                            className={`${styles.actionBtn} ${styles.btnEdit}`}
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(order); }}
                            title="Edit"
                        >
                            <FiEdit2 size={16} />
                        </button>
                      )}

                      {order.status !== 'RETURNED' && order.type !== 'RETURN' && !order.hasReturn && (
                        <button
                            className={`${styles.actionBtn} ${styles.btnReturn}`}
                            onClick={(e) => handleReturnClick(order, e)}
                            title="Return / Refund"
                        >
                            <FiCornerUpLeft size={16} />
                        </button>
                      )}

                      <button 
                        className={`${styles.actionBtn} ${styles.btnDelete}`}
                        onClick={(e) => handleDeleteClick(order._id, e)}
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
                    
                    {/* Master Search Dropdown */}
                    <div style={{ marginBottom: '1rem' }}>
                         <CustomDropdown
                            options={products.map(p => ({ value: p.name, label: p.name }))}
                            value={activeProduct}
                            onChange={handleAddProduct}
                            placeholder="🔍 Search & Add Product..."
                            searchable={true}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {formData.items.map((item, index) => (
                             item.productName && (
                            <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <div style={{ flex: 2, display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 12px', height: '42px', color: 'var(--foreground)' }}>
                                    <span style={{ fontWeight: 500 }}>{item.productName}</span>
                                    {item.sku && <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: '#666' }}>#{item.sku}</span>}
                                </div>

                                {/* Quantity Stepper */}
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    border: '1px solid var(--border)', 
                                    borderRadius: '8px', 
                                    overflow: 'hidden',
                                    height: '42px', 
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
                                            paddingBottom: '2px' 
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
                                        readOnly
                                        style={{ 
                                            width: '100px', 
                                            paddingLeft: '24px', 
                                            paddingRight: '10px',
                                            height: '100%',
                                            textAlign: 'center', 
                                            borderRadius: '8px',
                                            background: 'var(--surface)', 
                                            border: '1px solid var(--border)',
                                            cursor: 'default',
                                            color: 'var(--foreground)'
                                        }} 
                                    />
                                </div>

                                <button type="button" className={styles.removeItemBtn} onClick={() => removeItem(index)}>
                                    <FiMinus size={16} />
                                </button>
                            </div>
                        )
                        ))}
                    </div>
                    {/* Add Item Button Removed */}
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
                    <span className={styles.detailLabel}>Status</span>
                    <span className={styles.detailValue}>
                        {(() => {
                            const { label, className } = getStatusInfo(viewingOrder);
                            return <span className={className}>{label}</span>;
                        })()}
                    </span>
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

      {/* Partial Return Modal */}
      {returnOrder && (
        <div className={styles.modalOverlay}>
            <div className={`${styles.modal} glass`} style={{ maxWidth: '600px' }}>
                <div className={styles.modalHeader}>
                    <h2 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        Create Return Invoice
                    </h2>
                    <button className={styles.closeBtn} onClick={handleCloseModal}>
                        <FiX />
                    </button>
                </div>
                <div style={{ marginBottom: '1.5rem', fontSize: '0.95rem', color: '#666' }}>
                    Creating return for order <strong style={{ fontFamily: 'monospace', color: 'var(--foreground)' }}>{returnOrder.orderId}</strong>
                </div>

                {/* Items Selection Table */}
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '1.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead style={{ background: 'var(--surface-hover)', position: 'sticky', top: 0 }}>
                            <tr>
                                <th style={{ padding: '10px 15px', textAlign: 'left', fontWeight: 600 }}>Item</th>
                                <th style={{ padding: '10px 15px', textAlign: 'center', fontWeight: 600 }}>Sold</th>
                                <th style={{ padding: '10px 15px', textAlign: 'center', fontWeight: 600 }}>Return Qty</th>
                                <th style={{ padding: '10px 15px', textAlign: 'right', fontWeight: 600 }}>Refund</th>
                            </tr>
                        </thead>
                        <tbody>
                            {returnOrder.items.map((item, idx) => {
                                const returnItem = returnItems[idx] || { quantity: 0 };
                                const isSelected = returnItem.quantity > 0;
                                
                                return (
                                <tr key={idx} style={{ borderBottom: '1px solid var(--border)', background: isSelected ? 'rgba(var(--primary-rgb), 0.02)' : 'transparent' }}>
                                    <td style={{ padding: '10px 15px' }}>
                                        <div style={{ fontWeight: 500 }}>{item.productName}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#888' }}>₹{item.price}</div>
                                    </td>
                                    <td style={{ padding: '10px 15px', textAlign: 'center', color: '#666' }}>
                                        {item.quantity}
                                    </td>
                                    <td style={{ padding: '10px 15px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <button 
                                                type="button"
                                                onClick={() => handleReturnItemChange(idx, -1)}
                                                className={styles.pageBtn}
                                                style={{ width: '28px', height: '28px', fontSize: '1rem', padding: 0 }}
                                                disabled={returnItem.quantity <= 0}
                                            >
                                                -
                                            </button>
                                            <span style={{ width: '20px', textAlign: 'center', fontWeight: 600 }}>{returnItem.quantity}</span>
                                            <button 
                                                type="button"
                                                onClick={() => handleReturnItemChange(idx, 1)}
                                                className={styles.pageBtn}
                                                style={{ width: '28px', height: '28px', fontSize: '1rem', padding: 0, color: 'var(--primary)', borderColor: 'var(--primary)' }}
                                                disabled={returnItem.quantity >= item.quantity}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </td>
                                    <td style={{ padding: '10px 15px', textAlign: 'right', fontWeight: 600, color: isSelected ? 'var(--primary)' : 'inherit' }}>
                                        ₹{returnItem.quantity * item.price}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                     <span style={{ fontWeight: 600, color: '#666' }}>Total Refund Amount:</span>
                     <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                        ₹{returnItems.reduce((sum, item, idx) => sum + (item.quantity * (returnOrder.items[idx]?.price || 0)), 0)}
                     </span>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <label style={{ 
                        flex: 1,
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem', 
                        padding: '1rem', 
                        border: `1px solid ${returnAction === 'restock' ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        background: returnAction === 'restock' ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
                        transition: 'all 0.2s'
                    }}
                    onClick={() => setReturnAction('restock')}
                    >
                        <input 
                            type="radio" 
                            name="returnAction" 
                            checked={returnAction === 'restock'} 
                            onChange={() => setReturnAction('restock')} 
                            style={{ accentColor: 'var(--primary)', transform: 'scale(1.2)' }}
                        />
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--foreground)' }}>Return Stock</div>
                            <div style={{ fontSize: '0.75rem', color: '#888' }}>Items added back to inventory.</div>
                        </div>
                    </label>

                    <label style={{ 
                        flex: 1,
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem', 
                        padding: '1rem', 
                        border: `1px solid ${returnAction === 'refund' ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        background: returnAction === 'refund' ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
                        transition: 'all 0.2s'
                    }}
                    onClick={() => setReturnAction('refund')}
                    >
                        <input 
                            type="radio" 
                            name="returnAction" 
                            checked={returnAction === 'refund'} 
                            onChange={() => setReturnAction('refund')} 
                            style={{ accentColor: 'var(--primary)', transform: 'scale(1.2)' }}
                        />
                         <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--foreground)' }}>Refund Only</div>
                            <div style={{ fontSize: '0.75rem', color: '#888' }}>Money refunded, stock unchanged.</div>
                        </div>
                    </label>
                </div>

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
                        onClick={confirmReturn}
                        disabled={returnItems.every(i => i.quantity === 0)}
                    >
                        Confirm Return
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
