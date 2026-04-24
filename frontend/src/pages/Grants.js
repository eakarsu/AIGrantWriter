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
  FiPlus, FiEdit2, FiTrash2, FiX, FiDollarSign,
  FiCalendar, FiGlobe, FiTarget, FiDownload, FiFileText
} from 'react-icons/fi';
import './DataPage.css';
import './Grants.css';

const Grants = () => {
  const toast = useToast();
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [sortField, setSortField] = useState('deadline');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
  const [formData, setFormData] = useState({
    title: '',
    funder_name: '',
    amount_min: '',
    amount_max: '',
    deadline: '',
    eligibility: '',
    focus_areas: '',
    description: '',
    requirements: '',
    website: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const fetchGrants = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/grants', {
        params: { search: searchQuery, page: currentPage, limit: itemsPerPage, sort: sortField, order: sortOrder }
      });
      setGrants(response.data.data);
      setTotalItems(response.data.total);
    } catch (error) {
      toast.error('Failed to fetch grants');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentPage, itemsPerPage, sortField, sortOrder, toast]);

  useEffect(() => {
    fetchGrants();
  }, [fetchGrants]);

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

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = 'Grant title is required';
    }
    if (formData.amount_min && formData.amount_max &&
        Number(formData.amount_min) > Number(formData.amount_max)) {
      errors.amount_max = 'Max amount must be greater than min amount';
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
        await api.put(`/grants/${selectedItem.id}`, formData);
        toast.success('Grant updated successfully');
      } else {
        await api.post('/grants', formData);
        toast.success('Grant created successfully');
      }
      fetchGrants();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save grant');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/grants/${confirmDelete.id}`);
      toast.success('Grant deleted successfully');
      fetchGrants();
      setShowDetailModal(false);
      setConfirmDelete({ open: false, id: null });
    } catch (error) {
      toast.error('Failed to delete grant');
    }
  };

  const exportToCSV = () => {
    const headers = ['Title', 'Funder', 'Amount Min', 'Amount Max', 'Deadline', 'Focus Areas', 'Eligibility'];
    const csvData = grants.map(grant => [
      grant.title,
      grant.funder_name,
      grant.amount_min,
      grant.amount_max,
      grant.deadline,
      grant.focus_areas,
      grant.eligibility
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell || ''}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'grants.csv';
    link.click();
    toast.success('CSV exported successfully');
  };

  const handleExportPdf = () => {
    const headers = ['Title', 'Funder', 'Amount Range', 'Deadline', 'Focus Areas'];
    const data = grants.map(grant => [
      grant.title,
      grant.funder_name || '',
      `$${grant.amount_min?.toLocaleString() || '0'} - $${grant.amount_max?.toLocaleString() || '0'}`,
      grant.deadline ? new Date(grant.deadline).toLocaleDateString() : '',
      grant.focus_areas || ''
    ]);
    exportToPdf({ title: 'Grants', headers, data, filename: 'grants.pdf' });
    toast.success('PDF exported successfully');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === grants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(grants.map(g => g.id)));
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    try {
      await api.delete('/grants/bulk', { data: { ids: Array.from(selectedIds) } });
      toast.success(`${selectedIds.size} grants deleted`);
      setSelectedIds(new Set());
      fetchGrants();
    } catch (error) {
      toast.error('Failed to delete grants');
    }
  };

  const openModal = (item = null) => {
    setFormErrors({});
    if (item) {
      setSelectedItem(item);
      setFormData({
        title: item.title || '',
        funder_name: item.funder_name || '',
        amount_min: item.amount_min || '',
        amount_max: item.amount_max || '',
        deadline: item.deadline ? item.deadline.split('T')[0] : '',
        eligibility: item.eligibility || '',
        focus_areas: item.focus_areas || '',
        description: item.description || '',
        requirements: item.requirements || '',
        website: item.website || ''
      });
    } else {
      setSelectedItem(null);
      setFormData({
        title: '',
        funder_name: '',
        amount_min: '',
        amount_max: '',
        deadline: '',
        eligibility: '',
        focus_areas: '',
        description: '',
        requirements: '',
        website: ''
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

  const getDaysUntilDeadline = (deadline) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeadlineStatus = (deadline) => {
    const days = getDaysUntilDeadline(deadline);
    if (days < 0) return 'expired';
    if (days <= 7) return 'urgent';
    if (days <= 30) return 'soon';
    return 'normal';
  };

  const sortOptions = [
    { value: 'deadline', label: 'Deadline' },
    { value: 'title', label: 'Title' },
    { value: 'amount_max', label: 'Amount' },
  ];

  return (
    <div className="data-page">
      <div className="page-header">
        <div>
          <h1><FiDollarSign /> Grants</h1>
          <p>Track and manage funding opportunities</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={exportToCSV}>
            <FiDownload /> CSV
          </button>
          <button className="btn btn-secondary" onClick={handleExportPdf}>
            <FiFileText /> PDF
          </button>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <FiPlus /> New Grant
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
        <SearchBar
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search grants..."
        />
        <SortControl options={sortOptions} value={sortField} order={sortOrder} onChange={setSortField} onOrderChange={setSortOrder} />
        <span className="results-count">{totalItems} grants</span>
      </div>

      {loading ? <LoadingSkeleton type="table" rows={5} /> : (
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" checked={selectedIds.size === grants.length && grants.length > 0} onChange={toggleSelectAll} /></th>
              <th>Grant</th>
              <th>Funder</th>
              <th>Amount</th>
              <th>Deadline</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {grants.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-row">
                  {searchQuery ? 'No grants found matching your search' : 'No grants yet'}
                </td>
              </tr>
            ) : (
              grants.map((grant) => (
                <tr key={grant.id} onClick={() => openDetailModal(grant)}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(grant.id)} onChange={() => toggleSelect(grant.id)} />
                  </td>
                  <td>
                    <div className="cell-main">
                      <span className="cell-title">{grant.title}</span>
                      <span className="cell-subtitle">{grant.focus_areas?.substring(0, 50)}...</span>
                    </div>
                  </td>
                  <td>{grant.funder_name}</td>
                  <td>
                    <span className="amount-text">
                      ${grant.amount_min?.toLocaleString()} - ${grant.amount_max?.toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <span className={`deadline-badge ${getDeadlineStatus(grant.deadline)}`}>
                      {new Date(grant.deadline).toLocaleDateString()}
                      <small> ({getDaysUntilDeadline(grant.deadline)}d)</small>
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="action-buttons">
                      <button className="action-btn edit" onClick={() => openModal(grant)} title="Edit">
                        <FiEdit2 />
                      </button>
                      <button className="action-btn delete" onClick={() => setConfirmDelete({ open: true, id: grant.id })} title="Delete">
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

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem ? 'Edit Grant' : 'New Grant'}</h2>
              <button className="modal-close" onClick={closeModal}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Grant Title *</label>
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
                  <label>Funder Name</label>
                  <input
                    type="text"
                    name="funder_name"
                    value={formData.funder_name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Deadline</label>
                  <input
                    type="date"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Minimum Amount ($)</label>
                  <input
                    type="number"
                    name="amount_min"
                    value={formData.amount_min}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Maximum Amount ($)</label>
                  <input
                    type="number"
                    name="amount_max"
                    value={formData.amount_max}
                    onChange={handleInputChange}
                    className={formErrors.amount_max ? 'error' : ''}
                  />
                  {formErrors.amount_max && <span className="error-text">{formErrors.amount_max}</span>}
                </div>
              </div>
              <div className="form-group">
                <label>Focus Areas</label>
                <input
                  type="text"
                  name="focus_areas"
                  value={formData.focus_areas}
                  onChange={handleInputChange}
                  placeholder="e.g., Education, Healthcare, Environment"
                />
              </div>
              <div className="form-group">
                <label>Eligibility</label>
                <textarea
                  name="eligibility"
                  value={formData.eligibility}
                  onChange={handleInputChange}
                  rows="2"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Requirements</label>
                <textarea
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleInputChange}
                  rows="2"
                />
              </div>
              <div className="form-group">
                <label>Website</label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {selectedItem ? 'Update' : 'Create'} Grant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              <div className="detail-section">
                <h3>Funder</h3>
                <p>{selectedItem.funder_name || 'Not specified'}</p>
              </div>
              <div className="detail-section">
                <h3>Description</h3>
                <p>{selectedItem.description || 'No description'}</p>
              </div>
              <div className="detail-section">
                <h3>Eligibility</h3>
                <p>{selectedItem.eligibility || 'Not specified'}</p>
              </div>
              <div className="detail-section">
                <h3>Requirements</h3>
                <p>{selectedItem.requirements || 'Not specified'}</p>
              </div>
              <div className="detail-grid">
                <div className="detail-item">
                  <FiDollarSign className="detail-icon" />
                  <div>
                    <span className="detail-label">Amount Range</span>
                    <span className="detail-value">
                      ${selectedItem.amount_min?.toLocaleString()} - ${selectedItem.amount_max?.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="detail-item">
                  <FiCalendar className="detail-icon" />
                  <div>
                    <span className="detail-label">Deadline</span>
                    <span className="detail-value">{new Date(selectedItem.deadline).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <FiTarget className="detail-icon" />
                  <div>
                    <span className="detail-label">Focus Areas</span>
                    <span className="detail-value">{selectedItem.focus_areas || 'N/A'}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <FiGlobe className="detail-icon" />
                  <div>
                    <span className="detail-label">Website</span>
                    <span className="detail-value">{selectedItem.website || 'N/A'}</span>
                  </div>
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

      <ConfirmDialog
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Grant"
        message="Are you sure you want to delete this grant? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default Grants;
