'use client';

import { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiEye } from 'react-icons/fi';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { useToast } from '@/components/ui/Toast';
import styles from './categories.module.css';

interface Category {
  _id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  
  // Toast
  const { showToast } = useToast();
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ name: '', status: 'ACTIVE' });
  const [error, setError] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/categories?search=${search}&page=${page}&limit=${limit}`);
      const data = await res.json();
      setCategories(data.data || []);
      setTotalPages(data.pagination ? data.pagination.pages : 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [search, page, limit]);

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

  const handleViewCategory = (category: Category) => {
    setViewingCategory(category);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setViewingCategory(null);
    setDeleteId(null);
    setFormData({ name: '', status: 'ACTIVE' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Capture values before async/reset
    const categoryName = formData.name;
    const isEdit = !!editingCategory;

    try {
      const url = editingCategory 
        ? `/api/categories/${editingCategory._id}` 
        : '/api/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      handleCloseModal();
      fetchCategories();
      
      if (isEdit) {
          showToast('success', 'Category Updated', `Category "${categoryName}" has been updated successfully.`);
      } else {
          showToast('success', 'Category Created', `Category "${categoryName}" has been created.`);
      }

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

    const categoryToDelete = categories.find(c => c._id === deleteId);
    const categoryName = categoryToDelete?.name || 'Category';

    try {
      const res = await fetch(`/api/categories/${deleteId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        handleCloseModal(); // Ensure modal closes
        fetchCategories();
        showToast('success', 'Category Deleted', `Category "${categoryName}" has been deleted.`);
      } else {
        showToast('error', 'Error', 'Failed to delete category');
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
        <h1 className={styles.title}>Categories</h1>
        <button 
          className="btn-primary" 
          onClick={() => handleOpenModal()}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <FiPlus /> Add Category
        </button>
      </div>

      <div className={`${styles.controls} glass`}>
        <div className={styles.searchGroup}>
          <FiSearch color="#888" size={20} />
          <input
            type="text"
            placeholder="Search categories..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '140px' }}>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>Show:</span>
          <div style={{ flexGrow: 1 }}>
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
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Category Name</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: '3rem' }}>Loading...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: '3rem' }}>No categories found</td></tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat._id}>
                  <td style={{ fontWeight: 500 }}>{cat.name}</td>
                  <td>
                    <span className={cat.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive}>
                      {cat.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                      <button 
                        className={`${styles.actionBtn} ${styles.btnView}`}
                        onClick={() => handleViewCategory(cat)}
                        title="View Details"
                      >
                        <FiEye size={16} />
                      </button>

                      <button 
                        className={`${styles.actionBtn} ${styles.btnEdit}`}
                        onClick={() => handleOpenModal(cat)}
                        title="Edit"
                      >
                        <FiEdit2 size={16} />
                      </button>

                      <button 
                        className={`${styles.actionBtn} ${styles.btnDelete}`}
                        onClick={() => handleDeleteClick(cat._id)}
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
          &lt;
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
          &gt;
        </button>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} glass`}>
            <div className={styles.modalHeader}>
              <h2 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {editingCategory ? 'Edit Category' : 'New Category'}
              </h2>
              <button className={styles.closeBtn} onClick={handleCloseModal}>
                <FiX />
              </button>
            </div>

            {error && <div className={styles.error} style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem'}}>Category Name</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g. Nail Polish"
                  />
                </div>
                
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem'}}>Status</label>
                  <CustomDropdown
                    options={[
                      { value: 'ACTIVE', label: 'ACTIVE' },
                      { value: 'INACTIVE', label: 'INACTIVE' }
                    ]}
                    value={formData.status}
                    onChange={(value: string) => setFormData({ ...formData, status: value as 'ACTIVE' | 'INACTIVE' })}
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.btnCancel} onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingCategory ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingCategory && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} glass`}>
            <div className={styles.modalHeader}>
              <h2 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                Category Details
              </h2>
              <button className={styles.closeBtn} onClick={handleCloseModal}>
                <FiX />
              </button>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Name</span>
              <span className={styles.detailValue}>{viewingCategory.name}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Status</span>
              <div style={{ marginTop: '0.5rem' }}>
                <span className={viewingCategory.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive}>
                  {viewingCategory.status}
                </span>
              </div>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Category ID</span>
              <span className={styles.detailValue} style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>
                {viewingCategory._id}
              </span>
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
                Delete Category?
              </h2>
              <button className={styles.closeBtn} onClick={handleCloseModal}>
                <FiX />
              </button>
            </div>
            
            <p style={{ color: 'var(--foreground)', marginBottom: '2rem', lineHeight: '1.6', fontSize: '1.1rem' }}>
              Are you sure you want to delete <strong style={{ textDecoration: 'underline', textDecorationColor: 'var(--primary)', textUnderlineOffset: '4px' }}>{categories.find(c => c._id === deleteId)?.name || 'this category'}</strong>?
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
