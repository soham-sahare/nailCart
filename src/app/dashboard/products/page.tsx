'use client';

import { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiEye } from 'react-icons/fi';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { useToast } from '@/components/ui/Toast';
import styles from './products.module.css';

interface Category {
  _id: string;
  name: string;
}

interface Product {
  _id: string;
  sku: string;
  name: string;
  category: Category;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  
  // Toast
  const { showToast } = useToast();

  // For Modal Dropdown
  const [categories, setCategories] = useState<Category[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    categoryId: '',
    costPrice: '',
    sellingPrice: '',
    quantity: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });
  const [error, setError] = useState('');

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?search=${search}&page=${page}&limit=${limit}`);
      const data = await res.json();
      setProducts(data.data);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
      try {
          const res = await fetch('/api/categories?limit=100'); // Fetch enough categories
          const data = await res.json();
          setCategories(data.data);
      } catch (err) {
          console.error("Failed to load categories for dropdown");
      }
  }

  useEffect(() => {
    fetchProducts();
  }, [search, page, limit]);

  const handleOpenModal = (product?: Product) => {
    fetchCategories(); // Ensure categories are loaded
    if (product) {
      setEditingProduct(product);
      setFormData({
        sku: product.sku,
        name: product.name,
        categoryId: product.category?._id || '',
        costPrice: product.costPrice.toString(),
        sellingPrice: product.sellingPrice.toString(),
        quantity: product.quantity.toString(),
        status: product.status
      });
    } else {
      setEditingProduct(null);
      setFormData({
        sku: '',
        name: '',
        categoryId: '',
        costPrice: '',
        sellingPrice: '',
        quantity: '',
        status: 'ACTIVE'
      });
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleViewProduct = (product: Product) => {
    setViewingProduct(product);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setViewingProduct(null);
    setDeleteId(null);
    setFormData({
        sku: '',
        name: '',
        categoryId: '',
        costPrice: '',
        sellingPrice: '',
        quantity: '',
        status: 'ACTIVE'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Capture values before async/reset
    const productName = formData.name;
    const isEdit = !!editingProduct;

    try {
      const payload = {
        sku: formData.sku,
        name: formData.name,
        category: formData.categoryId,
        costPrice: Number(formData.costPrice),
        sellingPrice: Number(formData.sellingPrice),
        quantity: Number(formData.quantity),
        status: formData.status
      };

      const url = editingProduct 
        ? `/api/products/${editingProduct._id}` 
        : '/api/products';
      
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      handleCloseModal();
      fetchProducts();

      if (isEdit) {
        showToast('success', 'Product Updated', `Product "${productName}" has been updated.`);
      } else {
        showToast('success', 'Product Created', `Product "${productName}" has been created.`);
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

    const productToDelete = products.find(p => p._id === deleteId);
    const productName = productToDelete?.name || 'Product';

    try {
      const res = await fetch(`/api/products/${deleteId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        handleCloseModal(); // Ensure modal (if any) closes
        fetchProducts();
        showToast('success', 'Product Deleted', `Product "${productName}" has been deleted.`);
      } else {
        showToast('error', 'Error', 'Failed to delete product');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'An unexpected error occurred');
    } finally {
      if (!isModalOpen) setDeleteId(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Products</h1>
      </div>

      <div className={`${styles.controls} glass`}>
        <div className={styles.searchGroup}>
          <FiSearch color="#888" size={20} />
          <input
            type="text"
            placeholder="Search products (Name or SKU)..."
            className={`input-field ${styles.searchInput}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.controlActions}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#666' }}>Show:</span>
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

          <button 
            className="btn-primary" 
            onClick={() => handleOpenModal()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}
          >
            <FiPlus /> Add Product
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Cost Price</th>
              <th>Selling Price</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center' }}>Loading...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center' }}>No products found</td></tr>
            ) : (
              products.map((prod) => (
                <tr key={prod._id}>
                  <td>{prod.sku}</td>
                  <td>{prod.name}</td>
                  <td>{prod.category?.name || 'N/A'}</td>
                  <td>${prod.costPrice}</td>
                  <td>${prod.sellingPrice}</td>
                  <td>{prod.quantity}</td>
                  <td>
                    <span className={prod.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive}>
                      {prod.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button 
                        className={`${styles.actionBtn} ${styles.btnView}`}
                        onClick={() => handleViewProduct(prod)}
                        title="View Details"
                      >
                        <FiEye size={16} />
                      </button>

                      <button 
                        className={`${styles.actionBtn} ${styles.btnEdit}`}
                        onClick={() => handleOpenModal(prod)}
                        title="Edit"
                      >
                        <FiEdit2 size={16} />
                      </button>

                      <button 
                        className={`${styles.actionBtn} ${styles.btnDelete}`}
                        onClick={() => handleDeleteClick(prod._id)}
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
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <button className={styles.closeBtn} onClick={handleCloseModal}>
                <FiX />
              </button>
            </div>

            {error && <div className={styles.error} style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                <div className={styles.formGrid}>
                    <div>
                        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>SKU</label>
                        <input
                            type="text"
                            className="input-field"
                            value={formData.sku}
                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Product Name</label>
                        <input
                            type="text"
                            className="input-field"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                </div>

                <div>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Category</label>
                  <select
                    className="input-field"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGrid}>
                    <div>
                        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Cost Price</label>
                        <input
                            type="number"
                            className="input-field"
                            value={formData.costPrice}
                            onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                            required
                            min="0"
                            step="0.01"
                        />
                    </div>
                    <div>
                        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Selling Price</label>
                        <input
                            type="number"
                            className="input-field"
                            value={formData.sellingPrice}
                            onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                            required
                            min="0"
                            step="0.01"
                        />
                    </div>
                </div>

                <div className={styles.formGrid}>
                    <div>
                        <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Quantity</label>
                        <input
                            type="number"
                            className="input-field"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            required
                            min="0"
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
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.btnCancel} onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingProduct ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingProduct && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} glass`}>
            <div className={styles.modalHeader}>
              <h2 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                Product Details
              </h2>
              <button className={styles.closeBtn} onClick={handleCloseModal}>
                <FiX />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: '#888', fontWeight: 600 }}>SKU</span>
                    <span>{viewingProduct.sku}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: '#888', fontWeight: 600 }}>Name</span>
                    <span>{viewingProduct.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: '#888', fontWeight: 600 }}>Category</span>
                    <span>{viewingProduct.category?.name || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: '#888', fontWeight: 600 }}>Cost Price</span>
                    <span>${viewingProduct.costPrice}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: '#888', fontWeight: 600 }}>Selling Price</span>
                    <span>${viewingProduct.sellingPrice}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: '#888', fontWeight: 600 }}>Quantity</span>
                    <span>{viewingProduct.quantity}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: '#888', fontWeight: 600 }}>Status</span>
                    <span className={viewingProduct.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive}>{viewingProduct.status}</span>
                </div>
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
                Delete Product?
              </h2>
              <button className={styles.closeBtn} onClick={handleCloseModal}>
                <FiX />
              </button>
            </div>
            
            <p style={{ color: 'var(--foreground)', marginBottom: '2rem', lineHeight: '1.6', fontSize: '1.1rem' }}>
              Are you sure you want to delete <strong style={{ textDecoration: 'underline', textDecorationColor: 'var(--primary)', textUnderlineOffset: '4px' }}>{products.find(p => p._id === deleteId)?.name || 'this product'}</strong>?
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
