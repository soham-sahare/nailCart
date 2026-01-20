'use client';

import { useState, useEffect } from 'react';
import { FiPlus } from 'react-icons/fi';
import { FaRupeeSign } from 'react-icons/fa';
import CustomDropdown from '@/components/ui/CustomDropdown';
import SearchInput from '@/components/ui/SearchInput';
import ActionButtons from '@/components/ui/ActionButtons';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import styles from './expenses.module.css';

interface Expense {
    _id: string;
    title: string;
    amount: number;
    category: string;
    description: string;
    paymentMethod: string;
    date: string;
    createdAt: string;
    upiAmount?: number;
    cashAmount?: number;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filter State
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  
  // Month Selection
  const formatMonthKey = (date: Date) => {
    return date.toLocaleString('default', { month: 'short', year: 'numeric' }).replace(' ', '-').toUpperCase();
  };
  const currentMonthKey = formatMonthKey(new Date());
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [availableMonths, setAvailableMonths] = useState<string[]>([currentMonthKey]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Misc',
    description: '',
    paymentMethod: 'UPI',
    upiAmount: 0,
    cashAmount: 0
  });

  const { showToast } = useToast();

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    setPage(1); // Reset to page 1 on filter change
    
    // 1. Filter by Search
    let filtered = expenses;
    if (search) {
        const lowerSearch = search.toLowerCase();
        filtered = filtered.filter((e) => 
          e.title.toLowerCase().includes(lowerSearch) || 
          e.category.toLowerCase().includes(lowerSearch) ||
          (e.description && e.description.toLowerCase().includes(lowerSearch))
        );
    }

    // 2. Filter by Selected Month
    if (selectedMonth !== 'All Time') {
        filtered = filtered.filter((e) => {
            const date = new Date(e.date);
            const monthKey = formatMonthKey(date);
            return monthKey === selectedMonth;
        });
    }

    setFilteredExpenses(filtered);
  }, [search, expenses, selectedMonth]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses?page=${page}&limit=${limit}&search=${search}`);
      const data = await res.json();
      if (data.success) {
        setExpenses(data.data);
        
        // Extract Unique Months
        const months = new Set<string>();
        months.add(currentMonthKey); 
        data.data.forEach((e: any) => {
            const date = new Date(e.date);
            const monthKey = formatMonthKey(date);
            months.add(monthKey);
        });
        setAvailableMonths(Array.from(months));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (expense?: Expense) => {
      if (expense) {
          setEditingExpense(expense);
          setFormData({
              title: expense.title,
              amount: String(expense.amount),
              category: expense.category,
              description: expense.description || '',
              paymentMethod: expense.paymentMethod,
              upiAmount: expense.upiAmount || 0,
              cashAmount: expense.cashAmount || 0
          });
      } else {
          setEditingExpense(null);
          setFormData({ title: '', amount: '', category: 'Misc', description: '', paymentMethod: 'UPI', upiAmount: 0, cashAmount: 0 });
      }
      setIsModalOpen(true);
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setEditingExpense(null);
      setViewingExpense(null);
      setDeleteId(null);
      setFormData({ title: '', amount: '', category: 'Misc', description: '', paymentMethod: 'UPI', upiAmount: 0, cashAmount: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate Split Payment
    if (formData.paymentMethod === 'SPLIT') {
        const total = Number(formData.amount);
        const splitTotal = Number(formData.upiAmount) + Number(formData.cashAmount);
        if (splitTotal !== total) {
            showToast('error', 'Payment Mismatch', `Split amounts (₹${splitTotal}) must equal total amount (₹${total})`);
            return;
        }
    }

    try {
      const url = editingExpense ? `/api/expenses/${editingExpense._id}` : '/api/expenses';
      const method = editingExpense ? 'PUT' : 'POST';
      
      const payload = {
          ...formData,
          amount: Number(formData.amount)
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const expenseTitle = formData.title;
        showToast('success', 'Success', editingExpense ? `Expense '${expenseTitle}' updated successfully` : `Expense '${expenseTitle}' created successfully`);
        handleCloseModal();
        fetchExpenses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const expenseTitle = expenses.find(e => e._id === deleteId)?.title || 'Unknown';
    try {
      await fetch(`/api/expenses/${deleteId}`, { method: 'DELETE' });
      showToast('success', 'Deleted', `Expense '${expenseTitle}' removed successfully`);
      handleCloseModal();
      fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate Totals based on filtered view
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);

  // Pagination Logic
  const totalPages = Math.ceil(filteredExpenses.length / limit);
  const paginatedExpenses = filteredExpenses.slice((page - 1) * limit, page * limit);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Expenses</h1>
      </div>

      <div className={styles.statsCard}>
          <div className={styles.statIcon}><FaRupeeSign /></div>
          <div>
              <h3>Total Expenses ({selectedMonth})</h3>
              <h2>₹{totalExpenses.toLocaleString()}</h2>
          </div>
      </div>

       {/* Controls & Table Group */}
      <div>
        <div className={`${styles.controls} glass`}>
          <SearchInput 
            value={search} 
            onChange={setSearch} 
            placeholder="Search expenses..." 
          />

          <div className={styles.controlActions}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: '#666', fontSize: '0.9rem' }}>Month:</span>
                <div style={{ width: '160px' }}>
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
                            { value: '10', label: '10' },
                            { value: '25', label: '25' },
                            { value: '50', label: '50' },
                            { value: '100' , label: '100' }
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
              <FiPlus /> Add Expense
            </button>
          </div>
        </div>
      
        <div className={styles.tableContainer}>
            <table className={styles.table}>
            <thead>
                <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {loading ? <tr><td colSpan={6} style={{textAlign: 'center', padding: '2rem'}}>Loading...</td></tr> : 
                paginatedExpenses.length === 0 ? <tr><td colSpan={6} style={{textAlign: 'center', padding: '2rem'}}>No expenses found.</td></tr> :
                paginatedExpenses.map((expense) => (
                <tr key={expense._id}>
                    <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 500 }}>
                                {new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-').toUpperCase()}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>
                                {new Date(expense.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                            </span>
                        </div>
                    </td>
                    <td>
                        <div style={{fontWeight: 600}}>{expense.title}</div>
                        <div style={{fontSize: '0.8rem', color: '#888'}}>{expense.description}</div>
                    </td>
                    <td><span className={styles.badge}>{expense.category}</span></td>
                    <td style={{fontWeight: 600, color: '#ef4444'}}>- ₹{expense.amount}</td>
                    <td>{expense.paymentMethod}</td>
                    <td>
                        <ActionButtons 
                            onView={() => setViewingExpense(expense)}
                            onEdit={() => handleOpenModal(expense)}
                            onDelete={() => { setDeleteId(expense._id); }}
                        />
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>

        <Pagination 
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingExpense ? 'Edit Expense' : 'Add New Expense'}
      >
        <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
            <label>Title</label>
            <input type="text" className="input-field" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Electricity Bill" />
            </div>
            <div className={styles.row}>
            <div className={styles.formGroup}>
                <label>Amount (₹)</label>
                <input 
                    type="number" 
                    className="input-field" 
                    required 
                    value={formData.amount} 
                    onChange={e => {
                        const val = e.target.value;
                        setFormData(prev => {
                            const newTotal = Number(val);
                            const currentUpi = Number(prev.upiAmount) || 0;
                            return {
                                ...prev, 
                                amount: val,
                                // If SPLIT, update Cash auto
                                cashAmount: prev.paymentMethod === 'SPLIT' ? Math.max(0, newTotal - currentUpi) : 0
                            };
                        });
                    }} 
                    placeholder="0.00" 
                />
            </div>
            </div>
            <div className={styles.row}>
            <div className={styles.formGroup}>
                <label>Category</label>
                <div style={{ width: '100%' }}>
                    <CustomDropdown 
                        options={['Utilities', 'Transport', 'Restock', 'Salaries', 'Rent', 'Maintenance', 'Marketing', 'Courier', 'Porter', 'Daily Collection', 'Misc'].map(c => ({ value: c, label: c }))}
                        value={formData.category}
                        onChange={(val) => setFormData({...formData, category: val})}
                    />
                </div>
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label style={{ marginBottom: '0.5rem', display: 'block' }}>Payment Method</label>
                    <div style={{ 
                        display: 'flex', 
                        gap: '1rem', 
                        padding: '0.75rem', 
                        background: 'var(--surface)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '8px',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                         <div style={{ display: 'flex', gap: '1rem' }}>
                            {['CASH', 'UPI', 'SPLIT'].map((method) => (
                                <label key={method} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value={method}
                                        checked={formData.paymentMethod === method}
                                        onChange={(e) => {
                                            const method = e.target.value;
                                            const total = Number(formData.amount) || 0;
                                            setFormData(prev => ({
                                                ...prev,
                                                paymentMethod: method,
                                                upiAmount: method === 'UPI' || method === 'SPLIT' ? total : 0,
                                                cashAmount: method === 'CASH' ? total : 0
                                            }));
                                        }}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                    />
                                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{method}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                     {/* Split Payment Inputs */}
                     {formData.paymentMethod === 'SPLIT' && (
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.25rem', display: 'block' }}>UPI Amount</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={formData.upiAmount}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        const total = Number(formData.amount);
                                        setFormData(prev => ({
                                            ...prev,
                                            upiAmount: val,
                                            cashAmount: Math.max(0, total - val)
                                        }));
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.25rem', display: 'block' }}>Cash Amount</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={formData.cashAmount}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        const total = Number(formData.amount);
                                        setFormData(prev => ({
                                            ...prev,
                                            cashAmount: val,
                                            upiAmount: Math.max(0, total - val)
                                        }));
                                    }}
                                />
                            </div>
                        </div>
                    )}
            </div>
            </div>
            <div className={styles.formGroup}>
            <label>Description (Optional)</label>
            <textarea className="input-field" rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className={styles.modalActions}>
            <button type="button" onClick={handleCloseModal} className={styles.btnCancel}>Cancel</button>
            <button type="submit" className="btn-primary">{editingExpense ? 'Update' : 'Save Expense'}</button>
            </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewingExpense}
        onClose={handleCloseModal}
        title="Expense Details"
      >
        {viewingExpense && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Title</span>
                    <span className={styles.detailValue} style={{ fontSize: '1.1rem' }}>{viewingExpense.title}</span>
                </div>
                <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Amount</span>
                    <span className={styles.detailValue} style={{color: '#ef4444', fontSize: '1.25rem', fontWeight: 700}}>₹{viewingExpense.amount}</span>
                </div>
                <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Category</span>
                    <span className={styles.badge}>{viewingExpense.category}</span>
                </div>
                <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Date</span>
                    <span className={styles.detailValue}>{new Date(viewingExpense.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Method</span>
                    <div style={{ textAlign: 'right' }}>
                         <span className={styles.detailValue}>{viewingExpense.paymentMethod}</span>
                         {viewingExpense.paymentMethod === 'SPLIT' && (
                             <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>
                                 UPI: <b>₹{viewingExpense.upiAmount}</b> • Cash: <b>₹{viewingExpense.cashAmount}</b>
                             </div>
                         )}
                    </div>
                </div>
                {viewingExpense.description && (
                        <div className={styles.detailRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span className={styles.detailLabel}>Description</span>
                        <span className={styles.detailValue} style={{fontSize: '0.95rem', fontWeight: 400, lineHeight: 1.5, textAlign: 'left', color: '#888'}}>{viewingExpense.description}</span>
                    </div>
                )}
                 <div className={styles.modalActions} style={{ marginTop: '1.5rem' }}>
                    <button className={styles.btnCancel} onClick={handleCloseModal}>Close</button>
                     <button className="btn-primary" onClick={() => {
                        setViewingExpense(null);
                        handleOpenModal(viewingExpense);
                    }}>Edit Expense</button>
                </div>
            </div>
        )}
      </Modal>

       {/* Delete Confirmation Modal */}
       <Modal
        isOpen={!!deleteId}
        onClose={handleCloseModal}
        title="Delete Expense?"
        width="400px"
      >
        <p style={{ color: 'var(--foreground)', marginBottom: '2rem', lineHeight: '1.6', fontSize: '1rem' }}>
            Are you sure you want to delete this expense? 
        </p>
        <div className={styles.modalActions}>
            <button className={styles.btnCancel} onClick={handleCloseModal}>Cancel</button>
            <button 
                className="btn-primary" 
                style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.75rem 1.5rem' }}
                onClick={confirmDelete}
            >
                Delete
            </button>
        </div>
      </Modal>

    </div>
  );
}
