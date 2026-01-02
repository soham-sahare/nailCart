'use client';

import { useState, useEffect } from 'react';
import { FiPlus } from 'react-icons/fi';
import CustomDropdown from '@/components/ui/CustomDropdown';
import SearchInput from '@/components/ui/SearchInput';
import ActionButtons from '@/components/ui/ActionButtons';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import styles from './categories.module.css';

interface Category {
  _id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  slug: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
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
    fetchCategories();
  }, [search, limit, page]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/categories?search=${search}&limit=${limit}&page=${page}`);
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
        setTotalPages(data.pagination ? data.pagination.pages : 1);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'Failed to fetch categories');
    } finally {
      setLoading(false);
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

      showToast('success', 'Success', editingCategory ? 'Category updated' : 'Category created');
      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/categories/${deleteId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        showToast('success', 'Deleted', 'Category removed successfully');
        setDeleteId(null);
        fetchCategories();
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
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '3rem' }}>Loading...</td></tr>
              ) : categories.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '3rem' }}>No categories found</td></tr>
              ) : (
                categories.map((category) => (
                  <tr key={category._id}>
                    <td>{category.name}</td>
                    <td>
                      <StatusBadge status={category.status} />
                    </td>
                    <td>
                      <ActionButtons 
                          onView={() => setViewingCategory(category)}
                          onEdit={() => handleOpenModal(category)}
                          onDelete={() => handleDeleteClick(category._id, category.name)}
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
