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
  FiPlus, FiEdit2, FiTrash2, FiX, FiFolder,
  FiFileText, FiUsers, FiCalendar, FiDownload
} from 'react-icons/fi';
import './DataPage.css';

const Documents = () => {
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
  const [formData, setFormData] = useState({
    title: '',
    doc_type: '',
    content: '',
    organization_id: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/documents', {
        params: { search: searchQuery, page: currentPage, limit: itemsPerPage, sort: sortField, order: sortOrder }
      });
      setDocuments(response.data.data || response.data);
      setTotalItems(response.data.total || (response.data.data ? response.data.total : response.data.length));
    } catch (error) {
      toast.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentPage, itemsPerPage, sortField, sortOrder, toast]);

  const fetchOrganizations = useCallback(async () => {
    try {
      const res = await api.get('/organizations', { params: { limit: 100 } });
      setOrganizations(res.data.data || res.data);
    } catch (error) {
      // silently fail for dropdowns
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

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

  // Client-side type filter
  const displayData = typeFilter
    ? documents.filter(d => d.doc_type === typeFilter)
    : documents;

  // Get unique document types from current data
  const docTypes = [...new Set(documents.map(d => d.doc_type).filter(Boolean))].sort();

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = 'Document title is required';
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
      if (selectedItem) {
        await api.put(`/documents/${selectedItem.id}`, formData);
        toast.success('Document updated successfully');
      } else {
        await api.post('/documents', formData);
        toast.success('Document created successfully');
      }
      fetchDocuments();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save document');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/documents/${confirmDelete.id}`);
      toast.success('Document deleted successfully');
      fetchDocuments();
      setShowDetailModal(false);
      setConfirmDelete({ open: false, id: null });
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const exportToCSV = () => {
    const headers = ['Title', 'Type', 'Organization', 'Created'];
    const csvData = documents.map(d => [d.title, d.doc_type, d.organization_name, d.created_at]);
    const csvContent = [headers, ...csvData].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'documents.csv';
    link.click();
    toast.success('CSV exported successfully');
  };

  const handleExportPdf = () => {
    const headers = ['Title', 'Type', 'Organization', 'Created'];
    const data = documents.map(d => [
      d.title || '', d.doc_type || '', d.organization_name || '',
      d.created_at ? new Date(d.created_at).toLocaleDateString() : ''
    ]);
    exportToPdf({ title: 'Documents', headers, data, filename: 'documents.pdf' });
    toast.success('PDF exported successfully');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map(d => d.id)));
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    try {
      await api.delete('/documents/bulk', { data: { ids: Array.from(selectedIds) } });
      toast.success(`${selectedIds.size} documents deleted`);
      setSelectedIds(new Set());
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to delete documents');
    }
  };

  const openModal = (item = null) => {
    setFormErrors({});
    if (item) {
      setSelectedItem(item);
      setFormData({
        title: item.title || '',
        doc_type: item.doc_type || '',
        content: item.content || '',
        organization_id: item.organization_id || ''
      });
    } else {
      setSelectedItem(null);
      setFormData({
        title: '',
        doc_type: '',
        content: '',
        organization_id: ''
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

  const getDocTypeColor = (type) => {
    const colors = {
      'Annual Report': '#4F46E5',
      'Strategic Plan': '#10B981',
      'Assessment': '#F59E0B',
      'Impact Report': '#EC4899',
      'Financial': '#8B5CF6',
      'Policy': '#06B6D4',
      'Procedure': '#EF4444',
      'Governance': '#14B8A6',
      'Research': '#6366F1',
      'Curriculum': '#F97316',
      'Technical': '#84CC16',
      'Report': '#A855F7',
      'Standards': '#0EA5E9',
      'Legal': '#D946EF'
    };
    return colors[type] || '#64748B';
  };

  const sortOptions = [
    { value: 'created_at', label: 'Date Created' },
    { value: 'title', label: 'Title' },
    { value: 'doc_type', label: 'Type' },
  ];

  return (
    <div className="data-page">
      <div className="page-header">
        <div>
          <h1><FiFolder /> Documents</h1>
          <p>Manage supporting documents and materials</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={exportToCSV}>
            <FiDownload /> CSV
          </button>
          <button className="btn btn-secondary" onClick={handleExportPdf}>
            <FiFileText /> PDF
          </button>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <FiPlus /> New Document
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
            placeholder="Search documents..."
          />
          <select
            className="filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: '12px', minWidth: '150px' }}
          >
            <option value="">All Types</option>
            {docTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <SortControl options={sortOptions} value={sortField} order={sortOrder} onChange={setSortField} onOrderChange={setSortOrder} />
        <span className="results-count">{totalItems} documents</span>
      </div>

      {loading ? <LoadingSkeleton type="table" rows={5} /> : (
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" checked={selectedIds.size === documents.length && documents.length > 0} onChange={toggleSelectAll} /></th>
              <th>Document</th>
              <th>Type</th>
              <th>Organization</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayData.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-row">
                  {searchQuery || typeFilter ? 'No documents found matching your criteria' : 'No documents yet'}
                </td>
              </tr>
            ) : (
              displayData.map((doc) => (
                <tr key={doc.id} onClick={() => openDetailModal(doc)}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(doc.id)} onChange={() => toggleSelect(doc.id)} />
                  </td>
                  <td>
                    <div className="cell-main">
                      <span className="cell-title">{doc.title}</span>
                      <span className="cell-subtitle">{doc.content?.substring(0, 60)}...</span>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        background: `${getDocTypeColor(doc.doc_type)}15`,
                        color: getDocTypeColor(doc.doc_type),
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      {doc.doc_type}
                    </span>
                  </td>
                  <td>{doc.organization_name || 'N/A'}</td>
                  <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="action-buttons">
                      <button className="action-btn edit" onClick={() => openModal(doc)} title="Edit">
                        <FiEdit2 />
                      </button>
                      <button className="action-btn delete" onClick={() => setConfirmDelete({ open: true, id: doc.id })} title="Delete">
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalItems > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
          />
        )}
      </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem ? 'Edit Document' : 'New Document'}</h2>
              <button className="modal-close" onClick={closeModal}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Document Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={formErrors.title ? 'error' : ''}
                />
                {formErrors.title && <span className="error-text">{formErrors.title}</span>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Document Type</label>
                  <select
                    name="doc_type"
                    value={formData.doc_type}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Type</option>
                    <option value="Annual Report">Annual Report</option>
                    <option value="Strategic Plan">Strategic Plan</option>
                    <option value="Assessment">Assessment</option>
                    <option value="Impact Report">Impact Report</option>
                    <option value="Financial">Financial</option>
                    <option value="Policy">Policy</option>
                    <option value="Procedure">Procedure</option>
                    <option value="Governance">Governance</option>
                    <option value="Research">Research</option>
                    <option value="Curriculum">Curriculum</option>
                    <option value="Technical">Technical</option>
                    <option value="Report">Report</option>
                    <option value="Standards">Standards</option>
                    <option value="Legal">Legal</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Organization</label>
                  <select
                    name="organization_id"
                    value={formData.organization_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Organization</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Content</label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  rows="10"
                  placeholder="Enter document content..."
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {selectedItem ? 'Update' : 'Create'} Document
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
              <h2>{selectedItem.title}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="detail-content">
              <div className="detail-grid">
                <div className="detail-item">
                  <FiFileText className="detail-icon" />
                  <div>
                    <span className="detail-label">Document Type</span>
                    <span className="detail-value">{selectedItem.doc_type || 'N/A'}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <FiUsers className="detail-icon" />
                  <div>
                    <span className="detail-label">Organization</span>
                    <span className="detail-value">{selectedItem.organization_name || 'N/A'}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <FiCalendar className="detail-icon" />
                  <div>
                    <span className="detail-label">Created</span>
                    <span className="detail-value">{new Date(selectedItem.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <FiCalendar className="detail-icon" />
                  <div>
                    <span className="detail-label">Updated</span>
                    <span className="detail-value">{new Date(selectedItem.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="detail-section" style={{ marginTop: '24px' }}>
                <h3>Content</h3>
                <div style={{
                  background: '#f8fafc',
                  padding: '20px',
                  borderRadius: '12px',
                  maxHeight: '400px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
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
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default Documents;
