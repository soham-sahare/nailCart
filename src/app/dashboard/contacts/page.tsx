'use client';

import { useState, useEffect } from 'react';
import { FiPlus } from 'react-icons/fi';
import CustomDropdown from '@/components/ui/CustomDropdown';
import SearchInput from '@/components/ui/SearchInput';
import ActionButtons from '@/components/ui/ActionButtons';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import styles from './contacts.module.css';

interface Contact {
    _id: string;
    name: string;
    phoneNumber: string;
    email?: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    email: ''
  });

  const { showToast } = useToast();

  useEffect(() => {
    fetchContacts();
  }, [search]); // Re-fetch on search to filter from API side if supported, or we filter locally

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts?search=${search}`);
      const data = await res.json();
      if (data.success) {
        setContacts(data.data);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  };

  // Client-side pagination logic since API currently returns all
  const paginatedContacts = contacts.slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil(contacts.length / limit);

  // Reset page when search or limit changes
  useEffect(() => {
      setPage(1);
  }, [search, limit]);

  const handleOpenModal = (contact?: Contact) => {
      if (contact) {
          setEditingContact(contact);
          setFormData({
              name: contact.name,
              phoneNumber: contact.phoneNumber,
              email: contact.email || ''
          });
      } else {
          setEditingContact(null);
          setFormData({ name: '', phoneNumber: '', email: '' });
      }
      setIsModalOpen(true);
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setEditingContact(null);
      setDeleteId(null);
      setFormData({ name: '', phoneNumber: '', email: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingContact ? `/api/contacts/${editingContact._id}` : '/api/contacts';
      const method = editingContact ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();

      if (res.ok) {
        showToast('success', 'Success', editingContact ? 'Contact updated' : 'Contact created');
        handleCloseModal();
        fetchContacts();
      } else {
        showToast('error', 'Error', data.message || 'Failed to save contact');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'Something went wrong');
    }
  };

  const handleDelete = async () => {
      if (!deleteId) return;
      try {
          const res = await fetch(`/api/contacts/${deleteId}`, { method: 'DELETE' });
          if (res.ok) {
              showToast('success', 'Deleted', 'Contact deleted successfully');
              fetchContacts();
              handleCloseModal();
          } else {
              showToast('error', 'Error', 'Failed to delete contact');
          }
      } catch (err) {
          showToast('error', 'Error', 'Something went wrong');
      }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ paddingLeft: '0.5rem' }}>
            <h1 className={styles.title}>Contacts</h1>
        </div>
      </div>

      <div>
        <div className={`${styles.controls} glass`}>
             <SearchInput 
                value={search} 
                onChange={setSearch} 
                placeholder="Search contacts..." 
              />

              <div className={styles.controlActions}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                  onClick={() => handleOpenModal()}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}
                >
                  <FiPlus /> Add Contact
                </button>
              </div>
        </div>

        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Phone Number</th>
                        <th>Email</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '3rem' }}>Loading...</td></tr>
                    ) : contacts.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '3rem' }}>No contacts found</td></tr>
                    ) : (
                        paginatedContacts.map(contact => (
                            <tr key={contact._id}>
                                <td style={{ fontWeight: 600 }}>{contact.name}</td>
                                <td>{contact.phoneNumber}</td>
                                <td style={{ color: '#888' }}>{contact.email || '-'}</td>
                                <td>
                                    <ActionButtons 
                                        onEdit={() => handleOpenModal(contact)}
                                        onDelete={() => setDeleteId(contact._id)}
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
            totalPages={totalPages || 1}
            onPageChange={setPage}
        />
      </div>

      {/* Edit/Add Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingContact ? 'Edit Contact' : 'Add New Contact'}
        width="500px"
      >
        <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
                <label>Name (Mandatory)</label>
                <input 
                    type="text" 
                    className="input-field" 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="John Doe" 
                />
            </div>
            <div className={styles.formGroup}>
                <label>Phone Number (Mandatory)</label>
                <input 
                    type="text" 
                    className="input-field" 
                    required 
                    value={formData.phoneNumber} 
                    onChange={e => setFormData({...formData, phoneNumber: e.target.value})} 
                    placeholder="9876543210" 
                />
            </div>
            <div className={styles.formGroup}>
                <label>Email (Optional)</label>
                <input 
                    type="email" 
                    className="input-field" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    placeholder="john@example.com" 
                />
            </div>
            
            <div className={styles.modalActions}>
                <button type="button" onClick={handleCloseModal} className={styles.btnCancel}>Cancel</button>
                <button type="submit" className="btn-primary">{editingContact ? 'Update Contact' : 'Save Contact'}</button>
            </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Contact?"
        width="400px"
      >
        <p style={{ color: 'var(--foreground)', marginBottom: '2rem', lineHeight: '1.6' }}>
            Are you sure you want to delete <strong style={{ textDecoration: 'underline' }}>{contacts.find(c => c._id === deleteId)?.name}</strong>?
            <br/>This action cannot be undone.
        </p>
        <div className={styles.modalActions}>
            <button className={styles.btnCancel} onClick={() => setDeleteId(null)}>Cancel</button>
            <button 
                className="btn-primary" 
                style={{ background: '#ef4444', color: 'white', border: 'none' }}
                onClick={handleDelete}
            >
                Delete
            </button>
        </div>
      </Modal>
    </div>
  );
}
