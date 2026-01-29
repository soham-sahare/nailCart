'use client';

import { useState, useEffect } from 'react';
import { FiPlus, FiX } from 'react-icons/fi';
import CustomDropdown from '@/components/ui/CustomDropdown';
import SearchInput from '@/components/ui/SearchInput';
import ActionButtons from '@/components/ui/ActionButtons';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import styles from './categories.module.css';
import { fetchCategories } from '@/lib/fetchers';
import { useDebounce } from '@/hooks/useDebounce';

interface Category {
  _id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  slug: string;
  isPending?: boolean;
  pendingAction?: 'UPDATE' | 'DELETE';
  isRejected?: boolean;
  requestId?: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  // ... (rest of component: use placeholders to avoid matching large blocks, only target the start)

  // Wait, I cannot use replace_file_content for non-contiguous changes easily if I don't provide the whole block.
  // I will split this into two calls or use multi_replace.
  // Actually, I can just use multi_replace.
  // But replace_file_content is requested.
  // I will just update the interface first.
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', status: 'ACTIVE' });
  const [error, setError] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    loadCategories();
  }, [debouncedSearch, limit, page]);

  const loadCategories = async () => {
    setLoading(true);
    const data = await fetchCategories(debouncedSearch, limit, page);
    if (data && data.data) {
        setCategories(data.data);
        setTotalPages(data.pagination ? data.pagination.pages : 1);
    }
    setLoading(false);
  };

  const deleteRequest = async (requestId: string) => {
      if(!requestId) return;
      try {
          const res = await fetch(`/api/approvals/${requestId}`, { method: 'DELETE' });
          if(res.ok) {
              showToast('success', 'Cleared', 'Request removed');
              loadCategories();
          } else {
              showToast('error', 'Error', 'Failed to remove request');
          }
      } catch(err) {
          console.error(err);
      }
  };

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, status: category.status });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', status: 'ACTIVE' });
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string, name: string) => {
      setDeleteId(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(isSubmitting) return;
    setIsSubmitting(true);

    setError('');
    
    try {
      const url = editingCategory ? `/api/categories/${editingCategory._id}` : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      showToast('success', 'Success', data.message || (editingCategory ? `Category '${formData.name}' updated successfully` : `Category '${formData.name}' created successfully`));
      setIsModalOpen(false);
      loadCategories();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/categories/${deleteId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        const categoryName = categories.find(c => c._id === deleteId)?.name || 'Unknown';
        showToast('success', 'Deleted', `Category '${categoryName}' removed successfully`);
        setDeleteId(null);
        loadCategories();
      } else {
        showToast('error', 'Error', 'Failed to delete category');
      }
    } catch (err) {
      showToast('error', 'Error', 'Failed to delete category');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Categories</h1>
      </div>

      <div>
        <div className={`${styles.controls} glass`}>
          <SearchInput 
            value={search} 
            onChange={setSearch} 
            placeholder="Search categories..." 
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
              <FiPlus /> Add Category
            </button>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr key="loading-row"><td colSpan={3} style={{ textAlign: 'center', padding: '3rem' }}>Loading...</td></tr>
              ) : categories.length === 0 ? (
                <tr key="empty-row"><td colSpan={3} style={{ textAlign: 'center', padding: '3rem' }}>No categories found</td></tr>
              ) : (
                categories.map((category, index) => {
                  const isRejected = category.isRejected;
                  const isPending = category.isPending;
                  const pendingAction = category.pendingAction;
                  
                  // Row Style
                  let rowStyle = {};
                  if (isRejected) rowStyle = { opacity: 0.8, background: 'rgba(239, 68, 68, 0.05)' };
                  else if (isPending) rowStyle = { opacity: 0.8, background: 'rgba(245, 158, 11, 0.05)' };

                  return (
                  <tr key={category._id || category.requestId || `cat-${index}`} style={rowStyle}>
                    <td>
                         {category.name} 
                         {isPending && !pendingAction && <span style={{ fontSize: '0.7rem', marginLeft: '0.5rem', color: '#f59e0b' }}>(Pending Create)</span>}
                         {pendingAction === 'UPDATE' && <span style={{ fontSize: '0.7rem', marginLeft: '0.5rem', color: '#f59e0b' }}>(Pending Update)</span>}
                         {pendingAction === 'DELETE' && <span style={{ fontSize: '0.7rem', marginLeft: '0.5rem', color: '#ef4444' }}>(Pending Delete)</span>}
                         {isRejected && <span style={{ fontSize: '0.7rem', marginLeft: '0.5rem', color: '#ef4444' }}>(Rejected)</span>}
                    </td>
                    <td>
                      <StatusBadge status={category.status} />
                    </td>
                    <td>
                      {isRejected ? (
                          <button 
                            className={styles.actionBtn}
                            style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}
                            onClick={() => deleteRequest(category.requestId!)}
                            title="Clear Rejected Request"
                          >
                           <FiX size={16} />
                          </button>
                      ) : (
                          <ActionButtons 
                              onView={() => setViewingCategory(category)}
                              onEdit={(isPending || pendingAction) ? undefined : () => handleOpenModal(category)}
                              onDelete={(isPending || pendingAction) ? undefined : () => handleDeleteClick(category._id, category.name)}
                          />
                      )}
                    </td>
                  </tr>
                )})
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
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
      >
        <form onSubmit={handleSubmit}>
          {error && <div className={styles.errorMsg}>{error}</div>}
          
          <div className={styles.formGroup}>
            <label>Category Name</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              className="input-field"
              placeholder="e.g. Nail Polish"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Status</label>
            <div className={styles.selectWrapper}>
                <CustomDropdown 
                  options={[
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'INACTIVE', label: 'Inactive' }
                  ]}
                  value={formData.status}
                  onChange={(val) => setFormData({...formData, status: val as any})}
                />
            </div>
          </div>

          <div className={styles.modalActions}>
             <button type="button" className={styles.btnCancel} onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingCategory ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewingCategory}
        onClose={() => setViewingCategory(null)}
        title="Category Details"
      >
         {viewingCategory && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Name</span>
                    <span className={styles.detailValue}>{viewingCategory.name}</span>
                </div>
                 <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Status</span>
                    <StatusBadge status={viewingCategory.status} />
                </div>
                 <div className={styles.modalActions} style={{ marginTop: '1.5rem' }}>
                    <button className={styles.btnCancel} onClick={() => setViewingCategory(null)}>Close</button>
                     <button className="btn-primary" onClick={() => {
                        setViewingCategory(null);
                        handleOpenModal(viewingCategory);
                    }}>Edit Category</button>
                </div>
            </div>
         )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Category?"
        width="400px"
      >
        <p style={{ color: 'var(--foreground)', marginBottom: '2rem', lineHeight: '1.6' }}>
            Are you sure you want to delete <strong style={{ textDecoration: 'underline' }}>{categories.find(c => c._id === deleteId)?.name}</strong>?
            <br/>This action cannot be undone.
        </p>
        <div className={styles.modalActions}>
            <button className={styles.btnCancel} onClick={() => setDeleteId(null)}>Cancel</button>
            <button 
                className="btn-primary" 
                style={{ background: '#ef4444', color: 'white', border: 'none' }}
                onClick={confirmDelete}
            >
                Delete
            </button>
        </div>
      </Modal>
    </div>
  );
}
