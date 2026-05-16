'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
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
import { useDebounce } from '@/hooks/useDebounce';

import { OrderItem, Order, Product } from './components/types';
import SalesTable from './components/SalesTable';
import OrderDetailsModal from './components/OrderDetailsModal';
import ReturnModal from './components/ReturnModal';
import NewOrderModal from './components/NewOrderModal';


export default function SalesPage() {
    const { data: session } = useSession();
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 500);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [showGstOnly, setShowGstOnly] = useState(false);

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
        balance: number;
        addToLedger: boolean;
        isGstBill: boolean;
        gstAmount: number;
    }>({
        customerName: '',
        mobileNumber: '',
        items: [],
        discount: 0,
        courierFees: 0,
        totalAmount: 0, // Will auto calc
        paymentMethod: 'UPI',
        upiAmount: 0,
        cashAmount: 0,
        balance: 0,
        addToLedger: false,
        isGstBill: false,
        gstAmount: 0
    });
    const [activeProduct, setActiveProduct] = useState('');
    const [error, setError] = useState('');
    const [sendWhatsapp, setSendWhatsapp] = useState(false);
    const [sendReturnWhatsapp, setSendReturnWhatsapp] = useState(false);

    // Add Product Handler (Single Search)
    const handleAddProduct = (productId: string) => {
        if (!productId) return;

        const product = products.find(p => p._id === productId);
        if (!product) return;

        const productName = product.name;

        const existingItemIndex = formData.items.findIndex(item =>
            item.productName === productName &&
            (item.sku || '') === (product.sku || '')
        );

        if (existingItemIndex !== -1) {
            // Merge Logic: Increment Quantity
            const newItems = [...formData.items];
            const currentItem = newItems[existingItemIndex];
            
            // Validation: Use snapshot first, fallback to current search result product
            const maxAllowed = currentItem.availableQty ?? product.quantity ?? 0;

            if (currentItem.quantity + 1 > maxAllowed) {
                showToast('error', 'Insufficient Stock', `Cannot add more "${productName}". Available: ${maxAllowed}`);
                setActiveProduct('');
                return;
            }
            newItems[existingItemIndex].quantity += 1;
            setFormData({ ...formData, items: newItems });
            showToast('success', 'Merged', `"${productName}" already exists. Added +1 quantity.`);
        } else {
            // Add New Logic: Use snapshot
            if ((product.quantity || 0) < 1) {
                showToast('error', 'Out of Stock', `"${productName}" is out of stock.`);
                setActiveProduct('');
                return;
            }
            const newItem: OrderItem = {
                productId: product._id,
                productName: product.name,
                quantity: 1,
                price: product.sellingPrice,
                sku: product.sku,
                category: product.category?.name || '',
                costPrice: product.costPrice,
                availableQty: product.quantity // Snapshot
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

    const handleContactSelect = (value: string) => {
        // 1. Try to find in the 'Recent Customers' list (from history) using composite key "Name|Phone"
        const [namePart, phonePart] = value.split('|');
        const recent = contacts.find(c => c.name === namePart && (c.phone || '') === (phonePart || ''));
        
        if (recent) {
            setFormData(prev => ({
                ...prev,
                customerName: recent.name,
                mobileNumber: recent.phone || ''
            }));
            return;
        }

        // 2. Fallback: Try to find by name only (for manually typed or manual selection)
        const contactByName = contacts.find(c => c.name === value);
        if (contactByName) {
             setFormData(prev => ({
                ...prev,
                customerName: contactByName.name,
                mobileNumber: contactByName.phone || contactByName.phoneNumber || ''
            }));
            return;
        }

        // 3. Custom value typed manually
        setFormData(prev => ({
            ...prev,
            customerName: value
        }));
    };

    // Delete & Return State
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [returnOrder, setReturnOrder] = useState<Order | null>(null); // Full order being returned
    const [returnItems, setReturnItems] = useState<OrderItem[]>([]); // Items selected for return
    const [returnAction, setReturnAction] = useState<'restock' | 'refund'>('restock');
    const [returnPaymentMethod, setReturnPaymentMethod] = useState<string>('UPI');
    const [returnUpiAmount, setReturnUpiAmount] = useState<number>(0);
    const [returnCashAmount, setReturnCashAmount] = useState<number>(0);

    // Products Search State
    const [productSearch, setProductSearch] = useState('');
    const debouncedProductSearch = useDebounce(productSearch, 300);

    // Contacts Search State
    const [contacts, setContacts] = useState<any[]>([]);
    const [contactSearch, setContactSearch] = useState('');
    const debouncedContactSearch = useDebounce(contactSearch, 300);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const query = `page=${page}&limit=${limit}&search=${debouncedSearch}&month=${selectedMonth}&gstOnly=${showGstOnly}`;
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
        const data = await fetchProducts(debouncedProductSearch, 20, 1, 'ACTIVE', 'name,sku,sellingPrice,quantity,category,costPrice');
        if (data && data.data) {
            // Deduplicate products by _id to prevent dropdown duplicates
            const uniqueProducts = Array.from(new Map(data.data.map((p: any) => [p._id, p])).values());
            setProducts(uniqueProducts as Product[]);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [debouncedSearch, page, limit, selectedMonth, showGstOnly]);

    useEffect(() => {
        loadProducts();
    }, [debouncedProductSearch]);

    const loadContacts = async () => {
        try {
            // Priority: Search Recent Sales History (Last 40 Days)
            const res = await fetch(`/api/sales/customers/recent?search=${debouncedContactSearch}`);
            const data = await res.json();
            if (data.success) {
                setContacts(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch recent customers', err);
        }
    };

    useEffect(() => {
        loadContacts();
    }, [debouncedContactSearch]);

    // Recalculate total when items change
    useEffect(() => {
        const itemSum = formData.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
        let gstAmount = 0;
        
        if (formData.isGstBill) {
            formData.items.forEach(item => {
                const isShills = (item.productName || '').toUpperCase().includes('SHILLS') || 
                               (item.sku || '').toUpperCase().includes('SHILLS');
                
                if (isShills) {
                    const itemQty = Number(item.quantity) || 0;
                    const itemPrice = Number(item.price) || 0;
                    const itemCost = Number(item.costPrice) || 0;

                    // Inclusive Logic: Base = Price / 1.18. Tax = Price - Base.
                    const itemInclusiveTotal = itemPrice * itemQty;
                    const itemBaseTotal = itemInclusiveTotal / 1.18;
                    const calculatedTax = itemInclusiveTotal - itemBaseTotal;
                    
                    // Capped Tax Rule: Tax per unit cannot exceed Cost Price per unit
                    // (But for inclusive bills, we usually keep the Price fixed and just breakdown the tax)
                    const potentialGstPerUnit = itemPrice * (0.18 / 1.18);
                    const cappedGstPerUnit = Math.min(potentialGstPerUnit, itemCost);

                    gstAmount += (cappedGstPerUnit * itemQty);
                }
            });
        }

        // Total is fixed (inclusive). Note: discount and courier fees are added/subtracted after item sum.
        const total = Math.max(0, itemSum - Number(formData.discount) + Number(formData.courierFees || 0));
        setFormData(prev => ({ ...prev, totalAmount: total, gstAmount }));
    }, [formData.items, formData.discount, formData.courierFees, formData.isGstBill]);

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
                items: order.items.map(i => ({ ...i })),
                discount: order.discount || 0,
                courierFees: order.courierFees || 0,
                totalAmount: order.totalAmount,
                paymentMethod: order.paymentMethod || 'CASH',
                upiAmount: order.upiAmount || 0,
                cashAmount: order.cashAmount || 0,
                balance: (order as any).balance || 0,
                addToLedger: (order as any).isLedger || false,
                isGstBill: (order as any).isGstBill || false,
                gstAmount: (order as any).gstAmount || 0
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
                cashAmount: 0,
                balance: 0,
                addToLedger: false,
                isGstBill: false,
                gstAmount: 0
            });
            setSendWhatsapp(false);
        }
        setContactSearch('');
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
                const savedReturn = data.data;
                const refundTotal = itemsToReturn.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                showToast('success', 'Return Processed', 'Inventory updated and refund recorded.');

                if (sendReturnWhatsapp && returnOrder.mobileNumber) {
                    const message = generateReturnWhatsappMessage(returnOrder, itemsToReturn, refundTotal);
                    window.open(`https://api.whatsapp.com/send?phone=91${returnOrder.mobileNumber}&text=${encodeURIComponent(message)}`, '_blank');
                } else if (savedReturn) {
                    // Automatically open the new return/refund invoice
                    window.open(`/invoice/${savedReturn._id}`, '_blank');
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
            // 1. Try to find the product in current search results using COMPOSITE KEY
            const product = products.find(p => 
                p.name === item.productName && (p.sku || '') === (item.sku || '')
            );

            // 2. Use snapshot if product is not in current search results
            const maxAllowed = product ? product.quantity : (item.availableQty ?? 9999);

            if (newQty > maxAllowed) {
                showToast('error', 'Insufficient Stock', `Cannot exceed available quantity: ${maxAllowed}`);
                return;
            }
        }

        newItems[index] = { ...item, quantity: newQty };
        setFormData({ ...formData, items: newItems });
    };

    const removeItem = (index: number) => {
        if (formData.items.length === 1) return;
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    }

    const generateWhatsappMessage = (order: Order): string => {
        const subtotal = order.totalAmount - (order.courierFees || 0) + (order.discount || 0);
        const invoiceUrl = `${window.location.origin}/invoice/${order._id}`;

        let msg = `\uD83C\uDF1F *BILL RECEIPT* \uD83C\uDF1F\n`;
        msg += `Hi *${order.customerName}*, thank you for shopping at NailCart! Here are your purchase details.\n\n`;

        msg += `\uD83C\uDD94 *Bill No:* #${order.orderId}\n`;
        msg += `\uD83D\uDCC5 *Date:* ${formatDateIST(order.createdAt)}\n\n`;

        msg += `\uD83D\uDED2 *YOUR ITEMS*\n`;
        order.items.forEach((item, index) => {
            const priceStr = (item.mrp && item.mrp > item.price)
                ? `~₹${item.mrp}~ \u20B9${item.price}`
                : `\u20B9${item.price}`;

            msg += `${index + 1}. ${item.productName} (x${item.quantity}) - ${priceStr}\n`;
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

        msg += `\uD83D\uDCC5 *Date:* ${formatDateIST(new Date().toISOString())}\n\n`;

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

            <div className="glass" style={{ borderRadius: '1.5rem', overflow: 'hidden' }}>

                <div className={styles.controls} style={{ border: 'none', background: 'transparent' }}>
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

                        {/* GST Filter Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem', marginRight: '0.5rem' }}>
                            <input
                                type="checkbox"
                                id="gstOnlyFilter"
                                checked={showGstOnly}
                                onChange={(e) => setShowGstOnly(e.target.checked)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <label htmlFor="gstOnlyFilter" style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                                GST Bills Only
                            </label>
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

                <SalesTable 
                    orders={orders}
                    loading={loading}
                    session={session}
                    onView={setViewingOrder}
                    onEdit={handleOpenModal}
                    onDelete={setDeleteId}
                    onReturn={handleReturnClick}
                />

                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                    />
                </div>
            </div>


            {/* New/Edit Order Modal */}
            <NewOrderModal 
                isOpen={isModalOpen}
                editingOrder={editingOrder}
                formData={formData}
                contacts={contacts}
                products={products}
                activeProduct={activeProduct}
                sendWhatsapp={sendWhatsapp}
                onClose={handleCloseModal}
                onSubmit={handleSubmit}
                onFormDataChange={setFormData}
                onContactSearch={setContactSearch}
                onProductSearch={setProductSearch}
                onContactSelect={handleContactSelect}
                onAddProduct={handleAddProduct}
                onQuantityChange={handleQuantityChange}
                onRemoveItem={removeItem}
                onWhatsappToggle={setSendWhatsapp}
            />

            {/* Order Details Modal */}
            <OrderDetailsModal 
                order={viewingOrder}
                onClose={handleCloseModal}
            />

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteId}
                onClose={handleCloseModal}
                title="Delete Sale?"
                width="400px"
            >
                <p style={{ color: 'var(--foreground)', marginBottom: '2rem', lineHeight: '1.6' }}>
                    Are you sure you want to delete sale <strong style={{ textDecoration: 'underline' }}>{orders.find(o => o._id === deleteId)?.orderId}</strong>?
                    <br />This action cannot be undone.
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
            <ReturnModal 
                order={returnOrder}
                isOpen={!!returnOrder}
                returnItems={returnItems}
                returnAction={returnAction}
                returnPaymentMethod={returnPaymentMethod}
                returnUpiAmount={returnUpiAmount}
                returnCashAmount={returnCashAmount}
                sendReturnWhatsapp={sendReturnWhatsapp}
                onClose={handleCloseModal}
                onItemChange={handleReturnItemChange}
                onActionChange={setReturnAction}
                onPaymentMethodChange={(newMethod) => {
                    setReturnPaymentMethod(newMethod);
                    const totalRefund = returnItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    setReturnUpiAmount(newMethod === 'UPI' ? totalRefund : 0);
                    setReturnCashAmount(newMethod === 'CASH' ? totalRefund : 0);
                }}
                onUpiChange={(upi) => {
                    const totalRefund = returnItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    setReturnUpiAmount(upi);
                    setReturnCashAmount(Math.max(0, totalRefund - upi));
                }}
                onCashChange={(cash) => {
                    const totalRefund = returnItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    setReturnCashAmount(cash);
                    setReturnUpiAmount(Math.max(0, totalRefund - cash));
                }}
                onWhatsappToggle={setSendReturnWhatsapp}
                onConfirm={confirmReturn}
            />
        </div>
    );
}

