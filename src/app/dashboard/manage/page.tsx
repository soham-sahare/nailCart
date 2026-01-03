'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiCheck, FiX, FiRefreshCcw } from 'react-icons/fi';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import styles from './manage.module.css';

export default function ManagePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { showToast } = useToast();

    // Data States
    const [users, setUsers] = useState<any[]>([]);
    const [approvals, setApprovals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [userForm, setUserForm] = useState({ username: '', password: '' });
    
    // View Request Modal
    const [viewRequest, setViewRequest] = useState<any>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/admin/login');
        } else if (status === 'authenticated') {
            const role = (session?.user as any).role;
            if (role !== 'OWNER') {
                router.push('/dashboard'); // or show unauthorized
            } else {
                fetchData();
            }
        }
    }, [status, session, router]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, approvalsRes] = await Promise.all([
                fetch('/api/users'),
                fetch('/api/approvals')
            ]);
            
            const usersData = await usersRes.json();
            const approvalsData = await approvalsRes.json();

            if (usersData.success) setUsers(usersData.data);
            if (approvalsData.success) setApprovals(approvalsData.data);

        } catch (err) {
            console.error(err);
            showToast('error', 'Error', 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userForm)
            });
            const data = await res.json();
            
            if (res.ok) {
                showToast('success', 'User Created', `Staff ${data.data.username} created.`);
                setIsUserModalOpen(false);
                setUserForm({ username: '', password: '' });
                fetchData();
            } else {
                showToast('error', 'Error', data.message || 'Failed to create user');
            }
        } catch (err) {
            showToast('error', 'Error', 'Something went wrong');
        }
    };

    const handleApproval = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
        // Validation handled by modal actions
        
        try {
            const res = await fetch('/api/approvals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, action })
            });
            const data = await res.json();

            if (res.ok) {
                showToast('success', 'Success', data.message);
                setViewRequest(null);
                fetchData();
            } else {
                showToast('error', 'Error', data.message || 'Failed to process request');
            }
        } catch (err) {
            showToast('error', 'Error', 'Something went wrong');
        }
    };

    if (status === 'loading' || loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

    // Filter staff only (Owner is hidden or shown?) - Let's show all but highlight role
    const staffUsers = users.filter(u => u.role === 'STAFF');

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Management Dashboard</h1>
                <button className="btn-primary" onClick={fetchData}>
                    <FiRefreshCcw /> Refresh
                </button>
            </div>

            {/* Approvals Section */}
            <div className={styles.section}>
                <div className={styles.header} style={{ marginBottom: '1.5rem' }}>
                    <h2 className={styles.sectionTitle}>Pending Approvals ({approvals.length})</h2>
                </div>
                
                {approvals.length === 0 ? (
                    <p style={{ color: '#666' }}>No pending approvals.</p>
                ) : (
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Model</th>
                                    <th>Requested By</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {approvals.map(req => (
                                    <tr key={req._id}>
                                        <td>
                                            <span className={`${styles.badge} ${
                                                req.type === 'CREATE' ? styles.badgeCreate : 
                                                req.type === 'UPDATE' ? styles.badgeUpdate : styles.badgeDelete
                                            }`}>
                                                {req.type}
                                            </span>
                                        </td>
                                        <td>{req.model}</td>
                                        <td>{req.requestedBy}</td>
                                        <td>{new Date(req.requestDate).toLocaleDateString()}</td>
                                        <td>
                                            <button 
                                                className={styles.btnApprove} 
                                                style={{ background: 'var(--primary)', marginRight: '0.5rem' }} // Use primary color for View
                                                onClick={() => setViewRequest(req)}
                                            >
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

             {/* Staff Management Section */}
             <div className={styles.section}>
                <div className={styles.header} style={{ marginBottom: '1.5rem' }}>
                    <h2 className={styles.sectionTitle}>Staff Accounts</h2>
                    <button className="btn-primary" onClick={() => setIsUserModalOpen(true)}>
                        <FiPlus /> Add Staff
                    </button>
                </div>
                
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Role</th>
                                <th>Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffUsers.length === 0 ? (
                                <tr><td colSpan={3} style={{ textAlign: 'center' }}>No staff accounts found.</td></tr>
                            ) : (
                                staffUsers.map(user => (
                                    <tr key={user._id}>
                                        <td style={{ fontWeight: 500 }}>{user.username}</td>
                                        <td>
                                            <span className={styles.badge} style={{ background: '#eee', color: '#555' }}>{user.role}</span>
                                        </td>
                                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            <Modal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                title="Create Staff Account"
                width="400px"
            >
                <form onSubmit={handleCreateUser}>
                    <div className={styles.formGroup}>
                        <label>Username</label>
                        <input 
                            type="text" 
                            className={styles.input} 
                            required 
                            value={userForm.username}
                            onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Password</label>
                        <input 
                            type="password" 
                            className={styles.input} 
                            required 
                            value={userForm.password}
                            onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                        />
                    </div>
                    <div className={styles.modalActions}>
                        <button type="button" className={styles.btnCancel} onClick={() => setIsUserModalOpen(false)}>Cancel</button>
                        <button type="submit" className="btn-primary">Create Staff</button>
                    </div>
                </form>
            </Modal>

            {/* Review Request Modal */}
            <Modal
                isOpen={!!viewRequest}
                onClose={() => setViewRequest(null)}
                title={`Review ${viewRequest?.type} Request`}
                width="600px"
            >
                {viewRequest && (
                    <div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: 'var(--surface-hover)', padding: '1rem', borderRadius: '0.5rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Requested By</div>
                                    <div style={{ fontWeight: 600 }}>{viewRequest.requestedBy}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Model</div>
                                    <div style={{ fontWeight: 600 }}>{viewRequest.model}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Type</div>
                                    <div style={{ fontWeight: 600 }}>{viewRequest.type}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Date</div>
                                    <div style={{ fontWeight: 600 }}>{new Date(viewRequest.requestDate).toLocaleDateString()}</div>
                                </div>
                            </div>

                            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: 600 }}>Request Details</h3>
                            <div className={styles.jsonPreview} style={{ background: 'transparent', padding: 0, border: 'none', maxHeight: 'none', color: 'var(--foreground)' }}>
                                {Object.entries(viewRequest.data || {}).map(([key, value]) => {
                                    if (['status', 'category', 'isPending', 'description', '_id', 'createdAt', 'updatedAt', '__v'].includes(key) && !value) return null; // Skip empty optional/system fields
                                    if (key === '__v') return null;

                                    const oldValue = viewRequest.currentData ? viewRequest.currentData[key] : undefined;
                                    const isChanged = viewRequest.type === 'UPDATE' && oldValue !== undefined && JSON.stringify(oldValue) !== JSON.stringify(value);

                                    const formatValue = (k: string, v: any) => {
                                        if (k === 'costPrice' || k === 'sellingPrice' || k === 'mrp') return `₹${v}`;
                                        return String(v);
                                    };

                                    return (
                                        <div key={key} style={{ marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                            <span style={{ display: 'block', fontSize: '0.8rem', color: '#888', textTransform: 'capitalize', marginBottom: '0.25rem' }}>
                                                {key.replace(/([A-Z])/g, ' $1').trim()} 
                                            </span>
                                            <span style={{ fontWeight: 500 }}>
                                                {isChanged && (
                                                    <span style={{ textDecoration: 'line-through', color: '#999', marginRight: '0.5rem', opacity: 0.7 }}>
                                                        {formatValue(key, oldValue)}
                                                    </span>
                                                )}
                                                <span style={isChanged ? { color: 'var(--primary)', fontWeight: 600 } : {}}>
                                                    {formatValue(key, value)}
                                                </span>
                                            </span>
                                        </div>
                                    );
                                })}
                                {(!viewRequest.data || Object.keys(viewRequest.data).length === 0) && (
                                    <p style={{ color: '#666', fontStyle: 'italic' }}>No data changes (Delete Request)</p>
                                )}
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button 
                                type="button" 
                                className={styles.btnReject} 
                                onClick={() => handleApproval(viewRequest._id, 'REJECT')}
                            >
                                <FiX /> Reject Request
                            </button>
                            <button 
                                type="button" 
                                className={styles.btnApprove} 
                                onClick={() => handleApproval(viewRequest._id, 'APPROVE')}
                            >
                                <FiCheck /> Approve Request
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
