'use client';

import { useState, useEffect } from 'react';
import { FiPlus, FiCornerUpLeft, FiMinus } from 'react-icons/fi';
import CustomDropdown from '@/components/ui/CustomDropdown';
import SearchInput from '@/components/ui/SearchInput';
import ActionButtons from '@/components/ui/ActionButtons';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import styles from './sales.module.css';
import { formatDateIST } from '@/lib/dateUtils';
import { fetchProducts } from '@/lib/fetchers';

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
  courierFees?: number;
  totalAmount: number;
  paymentMethod?: string;
  upiAmount?: number;
  cashAmount?: number;
  status?: string;
  type?: string;
  originalOrderId?: string;
  hasReturn?: boolean;
  returnType?: string;
  createdAt: string;
  createdBy?: string;
}

interface Product {
  _id: string;
  name: string;
  sellingPrice: number;
  sku: string;
  category: { name: string };
  quantity: number;
}

export default function SalesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Month Selection
  const formatMonthKey = (date: Date) => {
    return date.toLocaleString('default', { month: 'short', year: 'numeric' }).replace(' ', '-').toUpperCase();
  };
  const currentMonthKey = formatMonthKey(new Date());
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  
  useEffect(() => {
      // Fetch available months from API
      const fetchMonths = async () => {
          try {
              const res = await fetch('/api/sales?mode=months');
              const data = await res.json();
              if (data.success) {
                  setAvailableMonths(data.data);
                  // Setup default: If current month exists in data, select it. Else select 'All Time' or first available?
                  // User behavior: usually wants to see latest. 
                  // If we default to currentMonthKey, and it has no data, query returns empty. That's fine.
                  // But 'availableMonths' list won't have it.
                  // Let's just default to 'All Time' if current month isn't in the list? 
                  // Or stick to currentMonthKey as default initial state (line 62).
              }
          } catch (err) {
              console.error('Failed to fetch months', err);
          }
      };
      fetchMonths();
  }, []);
  
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
    courierFees: number;
    totalAmount: number;
    paymentMethod: string;
    upiAmount: number;
    cashAmount: number;
  }>({
    customerName: '',
    mobileNumber: '',
    items: [],
    discount: 0,
    courierFees: 0,
    totalAmount: 0, // Will auto calc
    paymentMethod: 'UPI',
    upiAmount: 0,
    cashAmount: 0
  });
  const [activeProduct, setActiveProduct] = useState('');
  const [error, setError] = useState('');
  const [sendWhatsapp, setSendWhatsapp] = useState(false);
  const [sendReturnWhatsapp, setSendReturnWhatsapp] = useState(false);

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
          // Check stock limit
          if (newItems[existingItemIndex].quantity + 1 > (product.quantity || 0)) {
               showToast('error', 'Insufficient Stock', `Cannot add more "${productName}". Available: ${product.quantity}`);
               setActiveProduct('');
               return;
          }
          newItems[existingItemIndex].quantity += 1;
          setFormData({ ...formData, items: newItems });
          showToast('success', 'Merged', `"${productName}" already exists. Added +1 quantity.`);
      } else {
          // Add New Logic
          if ((product.quantity || 0) < 1) {
               showToast('error', 'Out of Stock', `"${productName}" is out of stock.`);
               setActiveProduct('');
               return;
          }
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

  // Delete & Return State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [returnOrder, setReturnOrder] = useState<Order | null>(null); // Full order being returned
  const [returnItems, setReturnItems] = useState<OrderItem[]>([]); // Items selected for return
  const [returnAction, setReturnAction] = useState<'restock' | 'refund'>('restock');
  const [returnPaymentMethod, setReturnPaymentMethod] = useState<string>('UPI');
  const [returnUpiAmount, setReturnUpiAmount] = useState<number>(0);
  const [returnCashAmount, setReturnCashAmount] = useState<number>(0);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const query = `page=${page}&limit=${limit}&search=${search}&month=${selectedMonth}`;
      const res = await fetch(`/api/sales?${query}`);
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

  const loadProducts = async () => {
    // Lite payload for faster loading
    const data = await fetchProducts('', 1000, 1, 'ACTIVE', 'name,sku,sellingPrice,quantity,category');
    if (data && data.data) {
        setProducts(data.data);
    }
  };

  useEffect(() => {
    fetchOrders();
    loadProducts();
  }, [search, page, limit, selectedMonth]);

  // Recalculate total when items change
  useEffect(() => {
      const subtotal = formData.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
      const total = Math.max(0, subtotal - Number(formData.discount) + Number(formData.courierFees || 0));
      setFormData(prev => ({ ...prev, totalAmount: total }));
  }, [formData.items, formData.discount, formData.courierFees]);

  // Auto-update payment amounts when total changes
  useEffect(() => {
      if (formData.paymentMethod === 'UPI') {
          setFormData(prev => ({ ...prev, upiAmount: prev.totalAmount, cashAmount: 0 }));
      } else if (formData.paymentMethod === 'CASH') {
          setFormData(prev => ({ ...prev, cashAmount: prev.totalAmount, upiAmount: 0 }));
      }
      // For SPLIT, keep the existing split unless it exceeds the new total
      else if (formData.paymentMethod === 'SPLIT') {
          setFormData(prev => {
              const currentSum = prev.upiAmount + prev.cashAmount;
              // If current split doesn't match total, adjust proportionally
              if (currentSum !== prev.totalAmount && currentSum > 0) {
                  const ratio = prev.totalAmount / currentSum;
                  return {
                      ...prev,
                      upiAmount: Math.round(prev.upiAmount * ratio),
                      cashAmount: Math.round(prev.cashAmount * ratio)
                  };
              }
              return prev;
          });
      }
  }, [formData.totalAmount, formData.paymentMethod]);

  const handleOpenModal = (order?: Order) => {
    if (order) {
      setEditingOrder(order);
      setFormData({
        customerName: order.customerName,
        mobileNumber: order.mobileNumber || '',
        items: order.items.map(i => ({...i})),
        discount: order.discount || 0,
        courierFees: order.courierFees || 0,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod || 'CASH',
        upiAmount: order.upiAmount || 0,
        cashAmount: order.cashAmount || 0
      });
    } else {
      setEditingOrder(null);
      setFormData({
        customerName: '',
        mobileNumber: '',
        items: [{ productName: '', quantity: 1, price: 0, sku: '', category: '' }],
        discount: 0,
        courierFees: 0,
        totalAmount: 0, // Will auto calc
        paymentMethod: 'UPI',
        upiAmount: 0,
        cashAmount: 0
      });
      setSendWhatsapp(false);
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingOrder(null);
    setViewingOrder(null);
    setDeleteId(null);
    setReturnOrder(null);
  };

  // Form Handlers
  const handleReturnClick = (order: Order) => {
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
      
      // Auto-update refund payment amounts
      const newTotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      if (returnPaymentMethod === 'UPI') {
          setReturnUpiAmount(newTotal);
          setReturnCashAmount(0);
      } else if (returnPaymentMethod === 'CASH') {
          setReturnCashAmount(newTotal);
          setReturnUpiAmount(0);
      } else if (returnPaymentMethod === 'SPLIT') {
          // Maintain proportional split
          const currentSum = returnUpiAmount + returnCashAmount;
          if (currentSum > 0) {
              const ratio = newTotal / currentSum;
              setReturnUpiAmount(Math.round(returnUpiAmount * ratio));
              setReturnCashAmount(Math.round(returnCashAmount * ratio));
          }
      }
  };

  const confirmReturn = async () => {
      if (!returnOrder) return;
      
      const itemsToReturn = returnItems.filter(i => i.quantity > 0);
      if (itemsToReturn.length === 0) {
          showToast('error', 'Selection Required', 'Please select at least one item to return.');
          return;
      }

      // Validate SPLIT payment amounts for refund
      if (returnPaymentMethod === 'SPLIT') {
          const refundTotal = itemsToReturn.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          const splitTotal = returnUpiAmount + returnCashAmount;
          if (splitTotal !== refundTotal) {
              showToast('error', 'Payment Mismatch', `Split refund total (₹${splitTotal}) must equal refund amount (₹${refundTotal})`);
              return;
          }
      }

      try {
        const res = await fetch(`/api/sales/return`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                originalOrderId: returnOrder.orderId,
                items: itemsToReturn,
                returnType: returnAction === 'restock' ? 'RESTOCK' : 'REFUND_ONLY',
                paymentMethod: returnPaymentMethod,
                upiAmount: returnUpiAmount,
                cashAmount: returnCashAmount
            })
        });
        
        const data = await res.json();
                if (res.ok) {
              const refundTotal = itemsToReturn.reduce((sum, item) => sum + (item.price * item.quantity), 0);
              showToast('success', 'Return Processed', 'Inventory updated and refund recorded.');
              
              if (sendReturnWhatsapp && returnOrder.mobileNumber) {
                  const message = generateReturnWhatsappMessage(returnOrder, itemsToReturn, refundTotal);
                  window.open(`https://api.whatsapp.com/send?phone=91${returnOrder.mobileNumber}&text=${encodeURIComponent(message)}`, '_blank');
              }

              handleCloseModal();
              fetchOrders();
          } else {
            handleCloseModal();
            showToast('error', 'Error', data.message || 'Failed to process return');
        }
      } catch (err) {
        showToast('error', 'Error', 'Failed to process return');
      } finally {
          setReturnOrder(null);
      }
  };

  const handleQuantityChange = (index: number, delta: number) => {
      const newItems = [...formData.items];
      const item = newItems[index];
      const currentQty = item.quantity || 0;
      const newQty = Math.max(1, currentQty + delta);
      
      // Stock Validation
      if (delta > 0) {
          const product = products.find(p => p.name === item.productName);
          if (product && newQty > (product.quantity || 0)) {
               showToast('error', 'Insufficient Stock', `Cannot exceed available quantity: ${product.quantity}`);
               return;
          }
      }

      newItems[index] = { ...item, quantity: newQty };
      setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
      if(formData.items.length === 1) return;
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
  }

  const generateWhatsappMessage = (order: Order): string => {
    const subtotal = order.totalAmount - (order.courierFees || 0) + (order.discount || 0);
    const invoiceUrl = `${window.location.origin}/invoice/${order._id}`;
    
    let msg = `\uD83C\uDF1F *BILL RECEIPT* \uD83C\uDF1F\n`;
    msg += `Hi *${order.customerName}*, thank you for shopping at NailCart! Here are your purchase details.\n\n`;

    msg += `\uD83C\uDD94 *Bill No:* #${order.orderId}\n`;
    msg += `\uD83D\uDCC5 *Date:* ${new Date().toLocaleDateString('en-IN')}\n\n`;

    msg += `\uD83D\uDED2 *YOUR ITEMS*\n`;
    order.items.forEach((item, index) => {
      msg += `${index + 1}. ${item.productName} (x${item.quantity}) - \u20B9${item.price * item.quantity}\n`;
    });
    msg += `\n`;

    msg += `\uD83D\uDCB0 *PAYMENT SUMMARY*\n\n`;
    msg += `Subtotal: \u20B9${subtotal}\n`;
    
    if (order.discount && order.discount > 0) {
      msg += `Discount: -\u20B9${order.discount} \uD83C\uDFF7\n`;
    }
    
    if (order.courierFees && order.courierFees > 0) {
      msg += `Shipping: +\u20B9${order.courierFees} \uD83D\uDE9A\n`;
    }
    
    msg += `*Total Amount: \u20B9${order.totalAmount}* \u2705\n\n`;

    if (order.paymentMethod) {
      msg += `\uD83D\uDCB3 *Payment Method:* ${order.paymentMethod}\n`;
      if (order.paymentMethod === 'SPLIT') {
        msg += `  • \uD83D\uDCF1 UPI: \u20B9${order.upiAmount || 0}\n`;
        msg += `  • \uD83D\uDCB5 Cash: \u20B9${order.cashAmount || 0}\n`;
      }
      msg += `\n`;
    }

    msg += `\uD83D\uDCC4 Click below to view or download your receipt:\n`;
    msg += `${invoiceUrl}\n\n`;

    msg += `We hope you love your purchase! \u2728\n`;
    msg += `*NailCart* \uD83D\uDE4F`;

    return msg;
  };

  const generateReturnWhatsappMessage = (order: Order, returnedItems: any[], refundTotal: number): string => {
    let msg = `\u21A9\uFE0F *RETURN RECEIPT* \u21A9\uFE0F\n`;
    msg += `Hi *${order.customerName}*, we have processed your return for Bill #${order.orderId}.\n\n`;

    msg += `\uD83D\uDCC5 *Date:* ${new Date().toLocaleDateString('en-IN')}\n\n`;

    msg += `\uD83D\uDCE6 *RETURNED ITEMS*\n`;
    returnedItems.forEach((item, index) => {
      msg += `${index + 1}. ${item.productName} (x${item.quantity}) - \u20B9${item.price * item.quantity}\n`;
    });
    msg += `\n`;

    msg += `\uD83D\uDCB0 *REFUND SUMMARY*\n\n`;
    msg += `*Refund Amount: \u20B9${refundTotal}* \u2705\n`;
    
    msg += `Refunded via: ${returnPaymentMethod}\n`; 
    if (returnPaymentMethod === 'SPLIT') {
        msg += `  • \uD83D\uDCF1 UPI: \u20B9${returnUpiAmount}\n`;
        msg += `  • \uD83D\uDCB5 Cash: \u20B9${returnCashAmount}\n`;
    }
    msg += `\n`;

    msg += `If you have any questions, please contact us.\n\n`;
    
    const invoiceUrl = `${window.location.origin}/invoice/${order._id}`;
    msg += `\uD83D\uDCC4 Click below to view or download your updated receipt:\n`;
    msg += `${invoiceUrl}\n\n`;

    msg += `*NailCart* \uD83D\uDE4F`;

    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate SPLIT payment amounts
    if (formData.paymentMethod === 'SPLIT') {
        const splitTotal = formData.upiAmount + formData.cashAmount;
        if (splitTotal !== formData.totalAmount) {
            showToast('error', 'Payment Mismatch', `Split payment total (₹${splitTotal}) must equal order total (₹${formData.totalAmount})`);
            return;
        }
    }

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
          // Use api.whatsapp.com for better emoji support
          window.open(`https://api.whatsapp.com/send?phone=91${savedOrder.mobileNumber}&text=${encodeURIComponent(message)}`, '_blank');
      } else if (savedOrder) {
          // If WhatsApp is NOT checked, open the invoice immediately
          window.open(`/invoice/${savedOrder._id}`, '_blank');
      }

      showToast('success', editingOrder ? 'Sale Updated' : 'Sale Created', 
        editingOrder ? `Sale '${savedOrder.orderId}' updated successfully` : `Sale '${savedOrder.orderId}' created successfully`);

    } catch (err: any) {
      setError(err.message);
      showToast('error', 'Error', err.message);
    }
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
        showToast('success', 'Sale Deleted', `Sale '${orderId}' has been deleted`);
      } else {
        showToast('error', 'Error', 'Failed to delete sale');
      }
    } catch (err) {
      showToast('error', 'Error', 'An unexpected error occurred');
    } finally {
      if (!isModalOpen) setDeleteId(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Sales</h1>
      </div>

      <div>
        <div className={`${styles.controls} glass`}>
          <SearchInput 
            value={search} 
            onChange={setSearch} 
            placeholder="Search sales (ID or Customer)..." 
          />

          <div className={styles.controlActions}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: '#666', fontSize: '0.9rem' }}>Month:</span>
                <div style={{ width: '200px' }}>
                    <CustomDropdown 
                        options={['All Time', ...availableMonths].map(m => ({ value: m, label: m }))}
                        value={selectedMonth}
                        onChange={setSelectedMonth}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: '#666', fontSize: '0.9rem' }}>Show:</span>
                <div style={{ width: '80px' }}>
                    <CustomDropdown 
                        options={[
                            { value: '5', label: '5' },
                            { value: '10', label: '10' },
                            { value: '25', label: '25' }
                        ]}
                        value={String(limit)}
                        onChange={(val) => setLimit(Number(val))}
                    />
                </div>
            </div>

            <button 
              className="btn-primary" 
              onClick={() => setIsModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}
            >
              <FiPlus /> New Order
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
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>No sales found</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <span 
                          style={{ color: 'var(--primary)', fontWeight: 600, fontFamily: 'monospace', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
                          onClick={() => window.open(`/invoice/${order._id}`, '_blank')}
                        >
                          {order.orderId}
                      </span>
                      {order.originalOrderId && (
                        <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>
                            Ref: {order.originalOrderId}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 500 }}>{order.customerName}</td>
                    <td>{order.mobileNumber || '-'}</td>
                    <td>
                      <StatusBadge status={order.status || 'PENDING'} />
                    </td>
                    <td style={{ fontWeight: 600 }}>₹{order.totalAmount}</td>
                    <td>
                       <ActionButtons 
                            onView={() => setViewingOrder(order)}
                            onEdit={order.status !== 'RETURNED' && order.status !== 'REFUNDED' ? () => handleOpenModal(order) : undefined}
                            onDelete={() => setDeleteId(order._id)}
                            customActions={
                                order.status === 'COMPLETED' && (
                                     <button
                                        className={`${styles.actionBtn}`}
                                        style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', marginRight: '0.5rem' }}
                                        onClick={(e) => { e.stopPropagation(); handleReturnClick(order); }}
                                        title="Process Return"
                                     >
                                        <FiCornerUpLeft size={16} />
                                     </button>
                                )
                            }
                       />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <Pagination 
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
        />
      </div>

      {/* Write Order Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingOrder ? 'Edit Sale' : 'New Sale'}
        width="800px"
      >
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
                            onChange={(val) => handleAddProduct(val as string)}
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
                                onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
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
                                onChange={(e) => setFormData({ ...formData, courierFees: Number(e.target.value) })}
                                min="0"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--primary)' }}>
                            Total: ₹{formData.totalAmount}
                        </div>

                        {/* Payment Method - Inline */}
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
                                                setFormData(prev => ({
                                                    ...prev,
                                                    paymentMethod: newMethod,
                                                    upiAmount: newMethod === 'UPI' ? prev.totalAmount : 0,
                                                    cashAmount: newMethod === 'CASH' ? prev.totalAmount : 0
                                                }));
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

                {/* Split Payment Fields */}
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
                                    setFormData(prev => ({
                                        ...prev,
                                        upiAmount: upi,
                                        cashAmount: Math.max(0, prev.totalAmount - upi)
                                    }));
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
                                    setFormData(prev => ({
                                        ...prev,
                                        cashAmount: cash,
                                        upiAmount: Math.max(0, prev.totalAmount - cash)
                                    }));
                                }}
                                min="0"
                                max={formData.totalAmount}
                            />
                        </div>
                    </div>
                )}

                {/* WhatsApp Checkbox */}
                {!editingOrder && (
                     <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <input 
                            type="checkbox" 
                            id="whatsapp" 
                            checked={sendWhatsapp} 
                            onChange={(e) => setSendWhatsapp(e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#25D366' }}
                        />
                        <label htmlFor="whatsapp" style={{ cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                             Send Invoice on  
                             <span style={{ color: '#25D366' }}>
                                 WhatsApp
                             </span>
                        </label>
                    </div>
                )}

            <div className={styles.modalActions}>
                <button type="button" className={styles.btnCancel} onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2rem' }}>
                    {editingOrder ? 'Update Sale' : 'Complete Sale'}
                </button>
            </div>
            </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewingOrder}
        onClose={handleCloseModal}
        title="Order Details"
        width="600px"
      >
        {viewingOrder && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: '#888' }}>Order ID</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{viewingOrder.orderId}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', color: '#888' }}>Date</div>
                         <div style={{ fontWeight: 500 }}>{formatDateIST(viewingOrder.createdAt)}</div>
                    </div>
               </div>

                <div className={styles.viewGrid}>
                    <div className={styles.detailRow} style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                        <span className={styles.detailLabel}>Customer Name</span>
                        <span className={styles.detailValue} style={{ textAlign: 'left' }}>{viewingOrder.customerName}</span>
                    </div>
                     <div className={styles.detailRow} style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                        <span className={styles.detailLabel}>Mobile</span>
                        <span className={styles.detailValue} style={{ textAlign: 'left' }}>{viewingOrder.mobileNumber}</span>
                    </div>
                     <div className={styles.detailRow} style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                        <span className={styles.detailLabel}>Status</span>
                        <StatusBadge status={viewingOrder.status || 'PENDING'} />
                    </div>
                     <div className={styles.detailRow} style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                        <span className={styles.detailLabel}>Order Date</span>
                        <span className={styles.detailValue} style={{ textAlign: 'left' }}>{formatDateIST(viewingOrder.createdAt)}</span>
                    </div>
                    {viewingOrder.createdBy && (
                        <div className={styles.detailRow} style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                            <span className={styles.detailLabel}>Created By</span>
                            <span className={styles.detailValue} style={{ textAlign: 'left', fontWeight: 600, color: 'var(--primary)' }}>{viewingOrder.createdBy}</span>
                        </div>
                    )}
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
                            {viewingOrder.items.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '0.75rem' }}>
                                        <div style={{ fontWeight: 500 }}>{item.productName}</div>
                                        {item.sku && <div style={{ fontSize: '0.75rem', color: '#888' }}>{item.sku}</div>}
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
                         <span style={{ fontWeight: 600 }}>₹{viewingOrder.totalAmount + (viewingOrder.discount || 0)}</span>
                     </div>
                     {viewingOrder.discount > 0 && (
                        <div style={{ display: 'flex', gap: '2rem', color: '#ef4444' }}>
                            <span>Discount:</span>
                            <span>- ₹{viewingOrder.discount}</span>
                        </div>
                     )}
                     <div style={{ display: 'flex', gap: '2rem', color: 'var(--foreground)' }}>
                            <span>Courier Fees:</span>
                            <span>+ ₹{viewingOrder.courierFees || 0}</span>
                        </div>
                     <div style={{ display: 'flex', gap: '2rem', fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                         <span>Total:</span>
                         <span>₹{viewingOrder.totalAmount}</span>
                     </div>
                 </div>

                  {/* Payment Method Details */}
                  {viewingOrder.paymentMethod && (
                      <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>Payment Method</div>
                          <div style={{ fontWeight: 600, fontSize: '1rem' }}>{viewingOrder.paymentMethod}</div>
                          {viewingOrder.paymentMethod === 'SPLIT' && (
                              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '2rem', fontSize: '0.9rem' }}>
                                  <div>
                                      <span style={{ color: '#888' }}>UPI: </span>
                                      <span style={{ fontWeight: 600 }}>₹{viewingOrder.upiAmount || 0}</span>
                                  </div>
                                  <div>
                                      <span style={{ color: '#888' }}>Cash: </span>
                                      <span style={{ fontWeight: 600 }}>₹{viewingOrder.cashAmount || 0}</span>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}

                  <div className={styles.modalActions} style={{ marginTop: '1.5rem' }}>
                    <button className={styles.btnCancel} onClick={handleCloseModal}>
                        Close
                    </button>
                    <button className="btn-primary" onClick={() => window.open(`/invoice/${viewingOrder._id}`, '_blank')}>
                         Print Invoice
                    </button>
                </div>
            </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={handleCloseModal}
        title="Delete Sale?"
        width="400px"
      >
        <p style={{ color: 'var(--foreground)', marginBottom: '2rem', lineHeight: '1.6' }}>
            Are you sure you want to delete sale <strong style={{ textDecoration: 'underline' }}>{orders.find(o => o._id === deleteId)?.orderId}</strong>?
            <br/>This action cannot be undone.
        </p>
        <div className={styles.modalActions}>
            <button className={styles.btnCancel} onClick={handleCloseModal}>Cancel</button>
            <button 
                className="btn-primary" 
                style={{ background: '#ef4444', color: 'white', border: 'none' }}
                onClick={confirmDelete}
            >
                Delete
            </button>
        </div>
      </Modal>

      {/* Return Modal */}
      <Modal
        isOpen={!!returnOrder}
        onClose={handleCloseModal}
        title="Process Return"
        width="600px"
      >
         {returnOrder && (
             <div>
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--surface-hover)', borderRadius: '12px' }}>
                     <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Order: {returnOrder.orderId}</div>
                     <div style={{ color: '#666', fontSize: '0.9rem' }}>Select items and quantities to return</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                    {returnOrder.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '12px' }}>
                             <div>
                                 <div style={{ fontWeight: 500 }}>{item.productName}</div>
                                 <div style={{ fontSize: '0.8rem', color: '#888' }}>Sold: {item.quantity} | Price: ₹{item.price}</div>
                             </div>

                             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                 <div style={{ fontSize: '0.85rem', fontWeight: 600, color: returnItems[idx]?.quantity > 0 ? '#ef4444' : '#ccc' }}>
                                     Return: {returnItems[idx]?.quantity || 0}
                                 </div>
                                 <div style={{ display: 'flex', gap: '4px' }}>
                                     <button 
                                        type="button"
                                        onClick={() => handleReturnItemChange(idx, -1)}
                                        style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                     >
                                         -
                                     </button>
                                       <button 
                                        type="button"
                                        onClick={() => handleReturnItemChange(idx, 1)}
                                        style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}
                                     >
                                         +
                                     </button>
                                 </div>
                             </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '2rem' }}>
                     <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Return Action</label>
                     <div style={{ display: 'flex', gap: '1rem' }}>
                         <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                             <input 
                                type="radio" 
                                checked={returnAction === 'restock'} 
                                onChange={() => setReturnAction('restock')}
                                name="returnAction"
                             />
                             <span>Restock Items & Refund</span>
                         </label>
                         <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                             <input 
                                type="radio" 
                                checked={returnAction === 'refund'} 
                                onChange={() => setReturnAction('refund')}
                                name="returnAction"
                             />
                             <span>Refund Only (Damaged)</span>
                         </label>
                     </div>
                </div>

                {/* Total Refund Amount */}
                <div style={{ textAlign: 'right', marginTop: '1.5rem', fontWeight: 700, fontSize: '1.3rem', color: 'var(--primary)' }}>
                    Refund Total: ₹{returnItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
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
                                    onChange={(e) => {
                                        const newMethod = e.target.value;
                                        setReturnPaymentMethod(newMethod);
                                        // Calculate total refund amount
                                        const totalRefund = returnItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                        setReturnUpiAmount(newMethod === 'UPI' ? totalRefund : 0);
                                        setReturnCashAmount(newMethod === 'CASH' ? totalRefund : 0);
                                    }}
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
                                    onChange={(e) => {
                                        const upi = Number(e.target.value);
                                        const totalRefund = returnItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                        setReturnUpiAmount(upi);
                                        setReturnCashAmount(Math.max(0, totalRefund - upi));
                                    }}
                                    min="0"
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.25rem', display: 'block' }}>Cash Amount (₹)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={returnCashAmount}
                                    onChange={(e) => {
                                        const cash = Number(e.target.value);
                                        const totalRefund = returnItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                        setReturnCashAmount(cash);
                                        setReturnUpiAmount(Math.max(0, totalRefund - cash));
                                    }}
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
                            onChange={(e) => setSendReturnWhatsapp(e.target.checked)}
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
                    <button className={styles.btnCancel} onClick={handleCloseModal}>Cancel</button>
                    <button 
                        className="btn-primary" 
                        onClick={confirmReturn}
                        style={{ padding: '0.75rem 2rem' }}
                    >
                        Confirm Return
                    </button>
                </div>
             </div>
         )}
      </Modal>

    </div>
  );
}
