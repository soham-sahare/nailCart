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
import styles from './products.module.css';
import { fetchCategories } from '@/lib/fetchers';

interface Product {
  _id: string;
  name: string;
  sku: string;
  category: { _id: string, name: string } | null;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  status: 'ACTIVE' | 'INACTIVE';
  description?: string;
  mrp?: number;
  isPending?: boolean;
  pendingAction?: 'UPDATE' | 'DELETE';
  isRejected?: boolean;
  requestId?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    categoryId: '',
    costPrice: '',
    sellingPrice: '',
    mrp: '',
    quantity: '',
    description: '',
    status: 'ACTIVE'
  });

  const { showToast } = useToast();

  useEffect(() => {
    fetchProducts();
    loadCategories();
  }, [search, limit, page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?search=${search}&limit=${limit}&page=${page}`);
      const data = await res.json();
      if (data.success) {
          setProducts(data.data);
          setTotalPages(data.pagination ? data.pagination.pages : 1);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const deleteRequest = async (requestId: string) => {
      if(!requestId) return;
      try {
          const res = await fetch(`/api/approvals/${requestId}`, { method: 'DELETE' });
          if(res.ok) {
              showToast('success', 'Cleared', 'Request removed');
              fetchProducts();
          } else {
              showToast('error', 'Error', 'Failed to remove request');
          }
      } catch(err) {
          console.error(err);
      }
  };

  const loadCategories = async () => {
    const data = await fetchCategories('', 1000);
    if (data && data.data) {
        setCategories(data.data);
    }
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        sku: product.sku,
        categoryId: product.category?._id || '',
        costPrice: String(product.costPrice),
        sellingPrice: String(product.sellingPrice),
        mrp: product.mrp ? String(product.mrp) : '',
        quantity: String(product.quantity),
        description: product.description || '',
        status: product.status as any
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        sku: '',
        categoryId: '',
        costPrice: '',
        sellingPrice: '',
        mrp: '',
        quantity: '',
        description: '',
        status: 'ACTIVE'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setViewingProduct(null);
    setDeleteId(null);
  }

  const handleDeleteClick = (id: string, name: string) => {
      setDeleteId(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const url = editingProduct ? `/api/products/${editingProduct._id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
             ...formData,
             category: formData.categoryId, // Map ID to expected schema field
             mrp: formData.mrp === '' ? undefined : formData.mrp // Send undefined if empty to skip validation/casting issues
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        const productName = formData.name;
        showToast('success', 'Success', data.message || (editingProduct ? `Product '${productName}' updated successfully` : `Product '${productName}' created successfully`));
        handleCloseModal();
        fetchProducts();
      } else {
        showToast('error', 'Error', data.message || 'Failed to save product');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const productName = products.find(p => p._id === deleteId)?.name;

    try {
      const res = await fetch(`/api/products/${deleteId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        handleCloseModal(); 
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

      <div>
        <div className={`${styles.controls} glass`}>
          <SearchInput 
            value={search} 
            onChange={setSearch} 
            placeholder="Search products (Name or SKU)..." 
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr key="loading-row"><td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>Loading...</td></tr>
              ) : products.length === 0 ? (
                <tr key="empty-row"><td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>No products found</td></tr>
              ) : (
                products.map((product) => {
                  const isRejected = product.isRejected;
                  const isPending = product.isPending;
                  const pendingAction = product.pendingAction;
                  
                  // Row Style
                  let rowStyle = {};
                  if (isRejected) rowStyle = { opacity: 0.8, background: 'rgba(239, 68, 68, 0.05)' };
                  else if (isPending) rowStyle = { opacity: 0.8, background: 'rgba(245, 158, 11, 0.05)' };

                  return (
                  <tr key={product._id} style={rowStyle}>
                    <td>{product.sku}</td>
                    <td style={{ fontWeight: 500 }}>
                        {product.name}
                        {isPending && !pendingAction && <span style={{ fontSize: '0.7rem', marginLeft: '0.5rem', color: '#f59e0b' }}>(Pending Create)</span>}
                        {pendingAction === 'UPDATE' && <span style={{ fontSize: '0.7rem', marginLeft: '0.5rem', color: '#f59e0b' }}>(Pending Update)</span>}
                        {pendingAction === 'DELETE' && <span style={{ fontSize: '0.7rem', marginLeft: '0.5rem', color: '#ef4444' }}>(Pending Delete)</span>}
                        {isRejected && <span style={{ fontSize: '0.7rem', marginLeft: '0.5rem', color: '#ef4444' }}>(Rejected)</span>}
                    </td>
                    <td>{product.category?.name || '-'}</td>
                    <td>₹{product.costPrice}</td>
                    <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                             {product.mrp && <div style={{ fontSize: '0.85rem', color: '#888', textDecoration: 'line-through' }}>₹{product.mrp}</div>}
                             <div style={{ fontWeight: 600 }}>₹{product.sellingPrice}</div>
                        </div>
                    </td>
                    <td>{product.quantity}</td>
                    <td>
                      <StatusBadge status={product.status} />
                    </td>
                    <td>
                      {isRejected ? (
                          <button 
                            className={styles.actionBtn}
                            style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}
                            onClick={() => deleteRequest(product.requestId!)}
                            title="Clear Rejected Request"
                          >
                           <FiX size={16} />
                          </button>
                      ) : (
                          <ActionButtons 
                              onView={() => setViewingProduct(product)}
                              onEdit={(isPending || pendingAction) ? undefined : () => handleOpenModal(product)} 
                              onDelete={(isPending || pendingAction) ? undefined : () => handleDeleteClick(product._id, product.name)}
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
        onClose={handleCloseModal}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        width="600px"
      >
        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Product Name</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" placeholder="e.g. Gel Polish Red" />
            </div>
            <div className={styles.formGroup}>
              <label>SKU</label>
              <input type="text" required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="input-field" placeholder="e.g. GEL-RED-01" />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Category</label>
            <div className={styles.selectWrapper}>
                <CustomDropdown 
                    options={[{value: '', label: 'Select Category'}, ...categories.map(c => ({ value: c._id, label: c.name }))]}
                    value={formData.categoryId}
                    onChange={(val) => setFormData({...formData, categoryId: val})}
                    searchable={true}
                    placeholder="Search Category..."
                />
            </div>
          </div>

           <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div className={styles.formGroup}>
              <label>Cost Price</label>
              <input type="number" required value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: e.target.value})} className="input-field" placeholder="0.00" />
            </div>
             <div className={styles.formGroup}>
              <label>MRP</label>
              <input type="number" value={formData.mrp} onChange={e => setFormData({...formData, mrp: e.target.value})} className="input-field" placeholder="0.00" />
            </div>
            <div className={styles.formGroup}>
              <label>Selling Price</label>
              <input type="number" required value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: e.target.value})} className="input-field" placeholder="0.00" />
            </div>
          </div>

           <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Quantity</label>
              <input type="number" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="input-field" placeholder="0" />
            </div>
             <div className={styles.formGroup}>
                <label>Status</label>
                 <div className={styles.selectWrapper}>
                    <CustomDropdown 
                        options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]}
                        value={formData.status}
                        onChange={(val) => setFormData({...formData, status: val as any})}
                    />
                </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Description (Optional)</label>
            <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input-field" />
          </div>

          <div className={styles.modalActions}>
             <button type="button" className={styles.btnCancel} onClick={handleCloseModal}>Cancel</button>
            <button type="submit" className="btn-primary">{editingProduct ? 'Update Product' : 'Create Product'}</button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewingProduct}
        onClose={handleCloseModal}
        title="Product Details"
      >
        {viewingProduct && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className={styles.viewGrid}>
                    <div className={styles.detailRow} style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                        <span className={styles.detailLabel}>Product Name</span>
                        <span className={styles.detailValue} style={{ textAlign: 'left' }}>{viewingProduct.name}</span>
                    </div>
                    <div className={styles.detailRow} style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                        <span className={styles.detailLabel}>SKU</span>
                        <span className={styles.detailValue} style={{ textAlign: 'left' }}>{viewingProduct.sku}</span>
                    </div>
                    <div className={styles.detailRow} style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                        <span className={styles.detailLabel}>Category</span>
                        <span className={styles.detailValue} style={{ textAlign: 'left' }}>{viewingProduct.category?.name || '-'}</span>
                    </div>
                     <div className={styles.detailRow} style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                        <span className={styles.detailLabel}>Status</span>
                        <StatusBadge status={viewingProduct.status} />
                    </div>
                </div>
                 <div className={styles.detailRow} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>Cost Price</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>₹{viewingProduct.costPrice}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>Price</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                             {viewingProduct.mrp && (
                                <div style={{ fontSize: '0.9rem', color: '#888', textDecoration: 'line-through' }}>
                                    ₹{viewingProduct.mrp}
                                </div>
                             )}
                             <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                                ₹{viewingProduct.sellingPrice}
                             </div>
                        </div>
                    </div>
                     <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>Stock</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{viewingProduct.quantity}</div>
                    </div>
                </div>
                 {viewingProduct.description && (
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>Description</div>
                        <div style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>{viewingProduct.description}</div>
                    </div>
                )}
                 <div className={styles.modalActions} style={{ marginTop: '1.5rem' }}>
                    <button className={styles.btnCancel} onClick={handleCloseModal}>Close</button>
                     <button className="btn-primary" onClick={() => {
                        handleCloseModal();
                        handleOpenModal(viewingProduct);
                    }}>Edit Product</button>
                </div>
            </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Product?"
        width="400px"
      >
        <p style={{ color: 'var(--foreground)', marginBottom: '2rem', lineHeight: '1.6' }}>
            Are you sure you want to delete <strong style={{ textDecoration: 'underline' }}>{products.find(p => p._id === deleteId)?.name}</strong>? 
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
