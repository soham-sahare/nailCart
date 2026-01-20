'use client';

import { useState, useEffect, Suspense } from 'react';
import { FiPlus, FiArrowUpRight, FiArrowDownLeft, FiCheckCircle, FiTrash2, FiEye, FiEdit2 } from 'react-icons/fi';
import CustomDropdown from '@/components/ui/CustomDropdown';
import SearchInput from '@/components/ui/SearchInput';
import ActionButtons from '@/components/ui/ActionButtons';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { useSearchParams } from 'next/navigation';
import { formatDateIST } from '@/lib/dateUtils';
import styles from './ledger.module.css';
import { useDebounce } from '@/hooks/useDebounce';

function LedgerContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [viewingEntry, setViewingEntry] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clearingEntry, setClearingEntry] = useState<any>(null);
  const [clearPaymentMethod, setClearPaymentMethod] = useState<string>('UPI');
  const [clearUpiAmount, setClearUpiAmount] = useState<number>(0);
  const [clearCashAmount, setClearCashAmount] = useState<number>(0);

  const [formData, setFormData] = useState({
    partyName: '',
    description: '',
    type: 'RECEIVABLE', 
    amount: '',
    status: 'PENDING',
    dueDate: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Contacts Integration
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
      fetchContactsList();
  }, []);

  const fetchContactsList = async () => {
      try {
          const res = await fetch('/api/contacts');
          const data = await res.json();
          if (data.success) {
              setContacts(data.data);
          }
      } catch (err) {
          console.error(err);
      }
  };

  useEffect(() => {
    const party = searchParams.get('party');
    if (party) {
        setSearch(party);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchLedger();
  }, [limit, debouncedSearch, page]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const query = debouncedSearch ? `&search=${debouncedSearch}` : '';
      const res = await fetch(`/api/ledger?limit=${limit}&page=${page}${query}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.data);
        if (data.pagination) {
            setTotalPages(data.pagination.pages);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (entry?: any) => {
      if (entry) {
          setEditingEntry(entry);
          setFormData({
              partyName: entry.partyName,
              description: entry.description || '',
              type: entry.type,
              amount: entry.amount,
              status: entry.status,
              dueDate: entry.dueDate ? new Date(entry.dueDate).toISOString().split('T')[0] : '',
              date: new Date(entry.date).toISOString().split('T')[0]
          });
      } else {
          setEditingEntry(null);
          setFormData({
            partyName: '',
            description: '',
            type: 'RECEIVABLE',
            amount: '',
            status: 'PENDING',
            dueDate: '',
            date: new Date().toISOString().split('T')[0]
          });
      }
      setIsModalOpen(true);
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setEditingEntry(null);
      setViewingEntry(null);
      setDeleteId(null);
      setClearingEntry(null);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
        const url = editingEntry ? `/api/ledger/${editingEntry._id}` : '/api/ledger';
        const method = editingEntry ? 'PATCH' : 'POST'; 
      
      const res = await fetch(url, {
        method: method, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        handleCloseModal();
        fetchLedger();
        showToast('success', editingEntry ? 'Entry Updated' : 'Entry Created', editingEntry ? `Ledger entry for '${formData.partyName}' updated successfully` : `Ledger entry for '${formData.partyName}' created successfully`);
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Error', err.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/ledger/${deleteId}`, { method: 'DELETE' });
      handleCloseModal();
      fetchLedger();
      const partyName = entries.find((e: any) => e._id === deleteId)?.partyName || 'Unknown';
      showToast('success', 'Entry Deleted', `Ledger entry for '${partyName}' has been deleted.`);
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'Failed to delete entry');
    }
  };

  const confirmClear = async () => {
      if (!clearingEntry) return;

      // Validate split payment
      if (clearPaymentMethod === 'SPLIT') {
          const totalSplit = clearUpiAmount + clearCashAmount;
          if (totalSplit !== clearingEntry.amount) {
              showToast('error', 'Payment Mismatch', `Split payment total (₹${totalSplit}) must match entry total (₹${clearingEntry.amount})`);
              return;
          }
      }

      try {
          const res = await fetch(`/api/ledger/${clearingEntry._id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  status: 'CLEARED',
                  dueDate: new Date().toISOString(),
                  paymentMethod: clearPaymentMethod,
                  upiAmount: clearUpiAmount,
                  cashAmount: clearCashAmount
              })
          });

          if (res.ok) {
              handleCloseModal();
              fetchLedger();
              showToast('success', 'Entry Cleared', 'Ledger entry marked as cleared.');
          } else {
              showToast('error', 'Error', 'Failed to clear entry');
          }
      } catch (err) {
          console.error(err);
          showToast('error', 'Error', 'Failed to clear entry');
      }
  };

  // Stats calculation
  const totalReceivable = entries
    .filter((e: any) => e.type === 'RECEIVABLE' && e.status === 'PENDING')
    .reduce((sum, e: any) => sum + e.amount, 0);

  const totalPayable = entries
    .filter((e: any) => e.type === 'PAYABLE' && e.status === 'PENDING')
    .reduce((sum, e: any) => sum + e.amount, 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Ledger</h1>
      </div>

      <div className={styles.statsContainer} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
         <div className={`${styles.statsCard} glass`}>
            <div className={`${styles.statIcon} ${styles.iconGreen}`}>
                <FiArrowDownLeft />
            </div>
            <div>
                <div className={styles.statTitle}>Receivables</div>
                <div className={styles.statValue} style={{ color: '#10b981' }}>₹{totalReceivable.toLocaleString()}</div>
            </div>
         </div>
         <div className={`${styles.statsCard} glass`}>
            <div className={`${styles.statIcon} ${styles.iconRed}`}>
                <FiArrowUpRight />
            </div>
            <div>
                <div className={styles.statTitle}>Payables</div>
                <div className={styles.statValue} style={{ color: '#ef4444' }}>₹{totalPayable.toLocaleString()}</div>
            </div>
         </div>
        
        <Pagination 
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
        />
      </div>

      <div>
        <div className={`${styles.controls} glass`}>
          <SearchInput 
            value={search} 
            onChange={setSearch} 
            placeholder="Search ledger..." 
          />

          <div className={styles.controlActions}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '140px' }}>
              <span style={{ fontSize: '0.9rem', color: '#666' }}>Show:</span>
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
              onClick={() => window.location.href = '/dashboard/ledger/summary'}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '0.9rem', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            >
              <FiEye /> View User Summary
            </button>

            <button 
              className="btn-primary" 
              onClick={() => handleOpenModal()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}
            >
              <FiPlus /> Add Record
            </button>
          </div>
        </div>

        <div className={styles.tableContainer}>
            <table className={styles.table}>
            <thead>
                <tr>
                    <th>Open Date</th>
                    <th>Close Date</th>
                    <th>Party Name</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {loading ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>Loading...</td></tr>
                ) : entries.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>No entries found</td></tr>
                ) : (
                    entries.map((entry: any) => (
                    <tr key={entry._id} className={entry.status === 'CLEARED' ? styles.rowCleared : ''}>
                        <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 500 }}>
                                    {new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-').toUpperCase()}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>
                                    {new Date(entry.createdAt || entry.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                </span>
                            </div>
                        </td>
                        <td>
                            {entry.dueDate ? (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 500 }}>
                                        {new Date(entry.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-').toUpperCase()}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>
                                        {new Date(entry.dueDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                    </span>
                                </div>
                            ) : '-'}
                        </td>
                        <td style={{ fontWeight: 500 }}>{entry.partyName}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.description}>
                            {entry.description}
                        </td>
                        <td>
                            <StatusBadge 
                                status={entry.type === 'RECEIVABLE' ? 'IN' : 'OUT'} 
                                variant={entry.type === 'RECEIVABLE' ? 'success' : 'error'} 
                            />
                        </td>
                        <td style={{ fontWeight: 600 }}>₹{entry.amount}</td>
                        <td>
                             <StatusBadge status={entry.status} />
                        </td>
                        <td>
                            <ActionButtons 
                                onView={() => setViewingEntry(entry)}
                                onEdit={() => handleOpenModal(entry)}
                                onDelete={() => setDeleteId(entry._id)}
                                customActions={
                                    entry.status !== 'CLEARED' && (
                                        <button 
                                            className={`${styles.actionBtn}`} 
                                            style={{ color: '#16a34a', background: 'rgba(22, 163, 74, 0.1)', marginRight: '0.5rem' }}
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setClearingEntry(entry);
                                                setClearPaymentMethod('UPI');
                                                setClearUpiAmount(entry.amount);
                                                setClearCashAmount(0);
                                            }}
                                            title="Clear Entry"
                                        >
                                            <FiCheckCircle size={16} />
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


      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingEntry ? 'Edit Ledger Entry' : 'New Ledger Entry'}
      >
        <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  


                  <div style={{ position: 'relative' }}>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Party Name</label>
                    <div style={{ height: '50px' }}> {/* Box wrapper for height consistency */}
                        <CustomDropdown 
                            options={contacts.map(c => ({ value: c.name, label: c.name }))}
                            value={formData.partyName}
                            onChange={(val) => setFormData({ ...formData, partyName: val })}
                            placeholder="Select or type new name..."
                            searchable={true}
                            allowCustomValue={true}
                        />
                    </div>
                  </div>

                  <div>
                     <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Description (Optional)</label>
                     <textarea
                        className="input-field"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                        placeholder="Transaction details..."
                     />
                  </div>

                  <div>
                        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Type</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div 
                                onClick={() => setFormData({ ...formData, type: 'RECEIVABLE' })}
                                className={`${styles.typeOption} ${formData.type === 'RECEIVABLE' ? styles.selectedGreen : ''}`}
                            >
                                <span style={{ fontSize: '1.2rem' }}>↓</span> Receivable
                            </div>
                             <div 
                                onClick={() => setFormData({ ...formData, type: 'PAYABLE' })}
                                className={`${styles.typeOption} ${formData.type === 'PAYABLE' ? styles.selectedRed : ''}`}
                            >
                                <span style={{ fontSize: '1.2rem' }}>↑</span> Payable
                            </div>
                        </div>
                  </div>

                  <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Amount (₹)</label>
                    <input
                        type="number"
                        className="input-field"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                        min="0"
                    />
                  </div>
              </div>

               <div className={styles.modalActions}>
                <button type="button" className={styles.btnCancel} onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingEntry ? 'Update' : 'Save'}
                </button>
              </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewingEntry}
        onClose={handleCloseModal}
        title="Transaction Details"
      >
            {viewingEntry && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className={styles.viewGrid}>
                    <div className={styles.detailRow} style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', justifyContent: 'flex-start' }}>
                        <span className={styles.detailLabel}>Party Name</span>
                        <span className={styles.detailValue} style={{ textAlign: 'left' }}>{viewingEntry.partyName}</span>
                    </div>

                    <div className={styles.detailRow} style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', justifyContent: 'flex-start' }}>
                        <span className={styles.detailLabel}>Amount</span>
                        <span className={styles.detailValue} style={{ fontWeight: 700, textAlign: 'left' }}>₹{viewingEntry.amount}</span>
                    </div>

                    <div className={styles.detailRow} style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', justifyContent: 'flex-start' }}>
                        <span className={styles.detailLabel}>Transaction Type</span>
                        <StatusBadge 
                                status={viewingEntry.type === 'RECEIVABLE' ? 'IN' : 'OUT'} 
                                variant={viewingEntry.type === 'RECEIVABLE' ? 'success' : 'error'} 
                        />
                    </div>

                    <div className={styles.detailRow} style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', justifyContent: 'flex-start' }}>
                        <span className={styles.detailLabel}>Status</span>
                        <StatusBadge status={viewingEntry.status} />
                    </div>

                    <div className={styles.detailRow} style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', justifyContent: 'flex-start' }}>
                        <span className={styles.detailLabel}>Open Date</span>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                                {formatDateIST(viewingEntry.createdAt || viewingEntry.date).split(' ')[0]}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>
                                {formatDateIST(viewingEntry.createdAt || viewingEntry.date).split(' ').slice(1).join(' ')}
                            </div>
                        </div>
                    </div>

                    <div className={styles.detailRow} style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', justifyContent: 'flex-start' }}>
                        <span className={styles.detailLabel}>Close Date</span>
                         <div style={{ textAlign: 'left' }}>
                            {viewingEntry.dueDate ? (
                                <>
                                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                                         {formatDateIST(viewingEntry.dueDate).split(' ')[0]}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>
                                         {formatDateIST(viewingEntry.dueDate).split(' ').slice(1).join(' ')}
                                    </div>
                                </>
                            ) : '-'}
                        </div>
                    </div>
                </div>

                <div className={styles.detailRow} style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', justifyContent: 'flex-start' }}>
                    <span className={styles.detailLabel}>Payment Method</span>
                     <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                            {viewingEntry.paymentMethod || '-'}
                        </div>
                        {viewingEntry.paymentMethod === 'SPLIT' && (
                            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px', display: 'flex', gap: '0.75rem' }}>
                                <span>UPI: <span style={{ fontWeight: 600 }}>₹{viewingEntry.upiAmount}</span></span>
                                <span>Cash: <span style={{ fontWeight: 600 }}>₹{viewingEntry.cashAmount}</span></span>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.detailRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    <span className={styles.detailLabel}>Description</span>
                    <span className={styles.detailValue} style={{ fontSize: '1rem', color: '#666', textAlign: 'left', lineHeight: 1.5 }}>
                        {viewingEntry.description || 'No description provided.'}
                    </span>
                </div>

                    <div className={styles.modalActions} style={{marginTop: '1.5rem'}}>
                         <button className={styles.btnCancel} onClick={handleCloseModal}>
                            Close
                        </button>
                    </div>
                </div>
            )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={handleCloseModal}
        title="Delete Entry?"
        width="400px"
      >
            <p style={{ color: 'var(--foreground)', marginBottom: '2rem', lineHeight: '1.6', fontSize: '1.1rem' }}>
                Are you sure you want to delete this ledger entry for <strong style={{ textDecoration: 'underline' }}>{entries.find(e => e._id === deleteId)?.partyName || 'this party'}</strong>?
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

      {/* Clear Confirmation Modal */}
      <Modal
        isOpen={!!clearingEntry}
        onClose={handleCloseModal}
        title="Clear Entry?"
        width="400px"
      >
             <p style={{ color: 'var(--foreground)', marginBottom: '2rem', lineHeight: '1.6', fontSize: '1.1rem' }}>
                Are you sure you want to mark this entry for <strong style={{ textDecoration: 'underline' }}>{clearingEntry?.partyName}</strong> as <strong>CLEARED</strong>?
                <br/><br/>
                <span style={{ fontSize: '0.9rem', color: '#666' }}>This will set the Close Date to today.</span>
            </p>
            
            {/* Payment Method Selection */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <label style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', display: 'block' }}>Payment Method</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {['CASH', 'UPI', 'SPLIT'].map((method) => (
                        <label key={method} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="clearPaymentMethod"
                                value={method}
                                checked={clearPaymentMethod === method}
                                onChange={(e) => {
                                    const newMethod = e.target.value;
                                    setClearPaymentMethod(newMethod);
                                    if (newMethod === 'UPI') {
                                        setClearUpiAmount(clearingEntry.amount);
                                        setClearCashAmount(0);
                                    } else if (newMethod === 'CASH') {
                                        setClearCashAmount(clearingEntry.amount);
                                        setClearUpiAmount(0);
                                    } else {
                                        setClearUpiAmount(0);
                                        setClearCashAmount(0);
                                    }
                                }}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ fontWeight: 500 }}>{method}</span>
                        </label>
                    ))}
                </div>
                
                {/* Split Payment Fields */}
                {clearPaymentMethod === 'SPLIT' && clearingEntry && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.25rem', display: 'block' }}>UPI Amount (₹)</label>
                            <input
                                type="number"
                                className="input-field"
                                value={clearUpiAmount}
                                onChange={(e) => {
                                    const upi = Number(e.target.value);
                                    setClearUpiAmount(upi);
                                    setClearCashAmount(Math.max(0, clearingEntry.amount - upi));
                                }}
                                min="0"
                                max={clearingEntry.amount}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.25rem', display: 'block' }}>Cash Amount (₹)</label>
                            <input
                                type="number"
                                className="input-field"
                                value={clearCashAmount}
                                onChange={(e) => {
                                    const cash = Number(e.target.value);
                                    setClearCashAmount(cash);
                                    setClearUpiAmount(Math.max(0, clearingEntry.amount - cash));
                                }}
                                min="0"
                                max={clearingEntry.amount}
                            />
                        </div>
                    </div>
                )}
            </div>
            <div className={styles.modalActions}>
                <button className={styles.btnCancel} onClick={handleCloseModal}>Cancel</button>
                <button 
                    className="btn-primary" 
                    style={{ background: '#16a34a', color: 'white', border: 'none' }}
                    onClick={confirmClear}
                >
                    Confirm Clear
                </button>
            </div>
      </Modal>
    </div>
  );
}

export default function LedgerPage() {
    return (
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading Ledger...</div>}>
            <LedgerContent />
        </Suspense>
    );
}
