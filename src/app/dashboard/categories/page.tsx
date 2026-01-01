'use client';

import { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiMoreVertical, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
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
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', status: 'ACTIVE' });
  const [error, setError] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/categories?search=${search}&page=${page}&limit=${limit}`);
      const data = await res.json();
      setCategories(data.data);
      setTotalPages(data.pagination.pages);
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
    setOpenDropdownId(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', status: 'ACTIVE' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setOpenDropdownId(null);
        fetchCategories();
      }
    } catch (err) {
      console.error(err);
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

      <div className={styles.controls}>
        <div className={styles.searchGroup}>
          <FiSearch color="#888" />
          <input
            type="text"
            placeholder="Search categories..."
            className={`input-field ${styles.searchInput}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#666' }}>Records per page:</span>
          <select 
            className={styles.limitSelect}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Category Name</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ textAlign: 'center' }}>Loading...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={3} style={{ textAlign: 'center' }}>No categories found</td></tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat._id}>
                  <td>{cat.name}</td>
                  <td>
                    <span className={cat.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive}>
                      {cat.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.dropdown}>
                      <button 
                        className={styles.actionBtn}
                        onClick={() => setOpenDropdownId(openDropdownId === cat._id ? null : cat._id)}
                      >
                        <FiMoreVertical />
                      </button>
                      
                      {openDropdownId === cat._id && (
                        <div className={styles.dropdownMenu}>
                          <button 
                            className={styles.dropdownItem}
                            onClick={() => handleOpenModal(cat)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <FiEdit2 size={14} /> Edit
                            </div>
                          </button>
                          <button 
                            className={styles.dropdownItem} 
                            style={{ color: '#ef4444' }}
                            onClick={() => handleDelete(cat._id)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <FiTrash2 size={14} /> Delete
                            </div>
                          </button>
                        </div>
                      )}
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
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
              <button className={styles.closeBtn} onClick={handleCloseModal}>
                <FiX />
              </button>
            </div>

            {error && <div className={styles.error} style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Category Name</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Status</label>
                  <select
                    className="input-field"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
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
    </div>
  );
}
