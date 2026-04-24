import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../App';
import { useToast } from '../components/Toast';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSkeleton from '../components/LoadingSkeleton';
import SortControl from '../components/SortControl';
import { exportToPdf } from '../utils/exportPdf';
import {
  FiPlus, FiEdit2, FiTrash2, FiX, FiLayout,
  FiTag, FiFileText, FiCopy, FiDownload
} from 'react-icons/fi';
import './DataPage.css';

const Templates = () => {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    content: '',
    fields: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/templates', {
        params: { search: searchQuery, page: currentPage, limit: itemsPerPage, sort: sortField, order: sortOrder }
      });
      setTemplates(response.data.data || response.data);
      setTotalItems(response.data.total || (response.data.data ? response.data.total : response.data.length));
    } catch (error) {
      toast.error('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentPage, itemsPerPage, sortField, sortOrder, toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Debounced search
  const [searchTimeout, setSearchTimeout] = useState(null);
  const handleSearch = (value) => {
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(setTimeout(() => {
      setSearchQuery(value);
      setCurrentPage(1);
    }, 300));
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Client-side category filter on server-paginated data
  const displayData = categoryFilter
    ? templates.filter(t => t.category === categoryFilter)
    : templates;

  // Get unique categories from current page data
  const categories = [...new Set(templates.map(t => t.category).filter(Boolean))].sort();

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Template name is required';
    }
    if (formData.fields) {
      try {
        JSON.parse(formData.fields);
      } catch {
        errors.fields = 'Invalid JSON format';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }
    try {
      const submitData = {
        ...formData,
        fields: formData.fields ? JSON.parse(formData.fields) : null
      };

      if (selectedItem) {
        await api.put(`/templates/${selectedItem.id}`, submitData);
        toast.success('Template updated successfully');
      } else {
        await api.post('/templates', submitData);
        toast.success('Template created successfully');
      }
      fetchTemplates();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save template');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/templates/${confirmDelete.id}`);
      toast.success('Template deleted successfully');
      fetchTemplates();
      setShowDetailModal(false);
      setConfirmDelete({ open: false, id: null });
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const copyToClipboard = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('Template content copied to clipboard!');
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Category', 'Description'];
    const csvData = templates.map(t => [t.name, t.category, t.description]);
    const csvContent = [headers, ...csvData].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'templates.csv';
    link.click();
    toast.success('CSV exported successfully');
  };

  const handleExportPdf = () => {
    const headers = ['Name', 'Category', 'Description'];
    const data = templates.map(t => [t.name || '', t.category || '', (t.description || '').substring(0, 80)]);
    exportToPdf({ title: 'Templates', headers, data, filename: 'templates.pdf' });
    toast.success('PDF exported successfully');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === templates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(templates.map(t => t.id)));
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    try {
      await api.delete('/templates/bulk', { data: { ids: Array.from(selectedIds) } });
      toast.success(`${selectedIds.size} templates deleted`);
      setSelectedIds(new Set());
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to delete templates');
    }
  };

  const openModal = (item = null) => {
    setFormErrors({});
    if (item) {
      setSelectedItem(item);
      setFormData({
        name: item.name || '',
        category: item.category || '',
        description: item.description || '',
        content: item.content || '',
        fields: item.fields ? JSON.stringify(item.fields, null, 2) : ''
      });
    } else {
      setSelectedItem(null);
      setFormData({
        name: '',
        category: '',
        description: '',
        content: '',
        fields: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
    setFormErrors({});
  };

  const openDetailModal = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Proposal': '#4F46E5',
      'LOI': '#10B981',
      'Budget': '#F59E0B',
      'Summary': '#EC4899',
      'Evaluation': '#8B5CF6',
      'Planning': '#06B6D4',
      'Assessment': '#EF4444',
      'Reporting': '#14B8A6',
      'Governance': '#6366F1',
      'Legal': '#F97316',
      'Fundraising': '#84CC16',
      'Standards': '#A855F7'
    };
    return colors[category] || '#64748B';
  };

  const sortOptions = [
    { value: 'created_at', label: 'Date Created' },
    { value: 'name', label: 'Name' },
    { value: 'category', label: 'Category' },
  ];

  return (
    <div className="data-page">
      <div className="page-header">
        <div>
          <h1><FiLayout /> Templates</h1>
          <p>Reusable document templates for grant writing</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={exportToCSV}>
            <FiDownload /> CSV
          </button>
          <button className="btn btn-secondary" onClick={handleExportPdf}>
            <FiFileText /> PDF
          </button>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <FiPlus /> New Template
          </button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="bulk-actions-bar">
          <span>{selectedIds.size} selected</span>
          <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
            <FiTrash2 /> Delete Selected
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedIds(new Set())}>
            Clear Selection
          </button>
        </div>
      )}

      <div className="data-toolbar">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <SearchBar
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search templates..."
          />
          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: '12px', minWidth: '150px' }}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <SortControl options={sortOptions} value={sortField} order={sortOrder} onChange={setSortField} onOrderChange={setSortOrder} />
        <span className="results-count">{totalItems} templates</span>
      </div>

      {loading ? <LoadingSkeleton type="cards" rows={6} /> : (
      <div className="data-grid">
        {displayData.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <p>{searchQuery || categoryFilter ? 'No templates found matching your criteria' : 'No templates yet'}</p>
          </div>
        ) : (
          displayData.map((template) => (
            <div key={template.id} className="data-card" onClick={() => openDetailModal(template)} style={{ position: 'relative' }}>
              <div className="card-select" onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 1 }}>
                <input type="checkbox" checked={selectedIds.has(template.id)} onChange={() => toggleSelect(template.id)} />
              </div>
              <div className="data-card-header">
                <div>
                  <div className="data-card-title">{template.name}</div>
                  <div className="data-card-subtitle">{template.description?.substring(0, 50) || 'No description'}</div>
                </div>
                <span
                  className="category-badge"
                  style={{
                    background: `${getCategoryColor(template.category)}20`,
                    color: getCategoryColor(template.category),
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}
                >
                  {template.category}
                </span>
              </div>
              <div className="data-card-body">
                <p>{template.content?.substring(0, 150)}...</p>
              </div>
              <div className="data-card-footer">
                <div className="data-card-meta">
                  <span><FiFileText /> Template</span>
                </div>
                <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                  <button className="action-btn edit" onClick={() => openModal(template)} title="Edit">
                    <FiEdit2 />
                  </button>
                  <button className="action-btn delete" onClick={() => setConfirmDelete({ open: true, id: template.id })} title="Delete">
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      )}
      {!loading && totalItems > itemsPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
        />
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem ? 'Edit Template' : 'New Template'}</h2>
              <button className="modal-close" onClick={closeModal}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Template Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={formErrors.name ? 'error' : ''}
                  />
                  {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Category</option>
                    <option value="Proposal">Proposal</option>
                    <option value="LOI">Letter of Intent</option>
                    <option value="Budget">Budget</option>
                    <option value="Summary">Summary</option>
                    <option value="Evaluation">Evaluation</option>
                    <option value="Planning">Planning</option>
                    <option value="Assessment">Assessment</option>
                    <option value="Reporting">Reporting</option>
                    <option value="Governance">Governance</option>
                    <option value="Legal">Legal</option>
                    <option value="Fundraising">Fundraising</option>
                    <option value="Standards">Standards</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Content</label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  rows="10"
                  placeholder="Enter template content with placeholders like [ORGANIZATION NAME]..."
                />
              </div>
              <div className="form-group">
                <label>Fields (JSON)</label>
                <textarea
                  name="fields"
                  value={formData.fields}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder='{"sections": ["intro", "body", "conclusion"]}'
                  className={formErrors.fields ? 'error' : ''}
                />
                {formErrors.fields && <span className="error-text">{formErrors.fields}</span>}
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {selectedItem ? 'Update' : 'Create'} Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem.name}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="detail-content">
              <div className="detail-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="detail-item">
                  <FiTag className="detail-icon" />
                  <div>
                    <span className="detail-label">Category</span>
                    <span className="detail-value">{selectedItem.category || 'N/A'}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <FiFileText className="detail-icon" />
                  <div>
                    <span className="detail-label">Description</span>
                    <span className="detail-value">{selectedItem.description || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="detail-section" style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3>Template Content</h3>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => copyToClipboard(selectedItem.content)}
                  >
                    <FiCopy /> Copy
                  </button>
                </div>
                <div style={{
                  background: '#f8fafc',
                  padding: '20px',
                  borderRadius: '12px',
                  maxHeight: '400px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: '1.6'
                }}>
                  {selectedItem.content || 'No content'}
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-danger" onClick={() => setConfirmDelete({ open: true, id: selectedItem.id })}>
                <FiTrash2 /> Delete
              </button>
              <button className="btn btn-primary" onClick={() => { setShowDetailModal(false); openModal(selectedItem); }}>
                <FiEdit2 /> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Template"
        message="Are you sure you want to delete this template? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default Templates;
