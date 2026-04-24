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
  FiPlus, FiEdit2, FiTrash2, FiX, FiUsers,
  FiMail, FiPhone, FiGlobe, FiMapPin, FiDollarSign,
  FiDownload, FiFileText
} from 'react-icons/fi';
import './DataPage.css';

const Organizations = () => {
  const toast = useToast();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
  const [formData, setFormData] = useState({
    name: '',
    mission: '',
    description: '',
    website: '',
    contact_email: '',
    phone: '',
    address: '',
    tax_id: '',
    annual_budget: '',
    staff_count: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/organizations', {
        params: { search: searchQuery, page: currentPage, limit: itemsPerPage, sort: sortField, order: sortOrder }
      });
      setOrganizations(response.data.data);
      setTotalItems(response.data.total);
    } catch (error) {
      toast.error('Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentPage, itemsPerPage, sortField, sortOrder, toast]);

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

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Organization name is required';
    }
    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      errors.contact_email = 'Invalid email format';
    }
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      errors.website = 'Website must start with http:// or https://';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
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
        await api.put(`/organizations/${selectedItem.id}`, formData);
        toast.success('Organization updated successfully');
      } else {
        await api.post('/organizations', formData);
        toast.success('Organization created successfully');
      }
      fetchOrganizations();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save organization');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/organizations/${confirmDelete.id}`);
      toast.success('Organization deleted successfully');
      fetchOrganizations();
      setShowDetailModal(false);
      setConfirmDelete({ open: false, id: null });
    } catch (error) {
      toast.error('Failed to delete organization');
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Mission', 'Email', 'Phone', 'Website', 'Address', 'Annual Budget', 'Staff Count'];
    const csvData = organizations.map(org => [
      org.name, org.mission, org.contact_email, org.phone, org.website, org.address, org.annual_budget, org.staff_count
    ]);
    const csvContent = [headers, ...csvData].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'organizations.csv';
    link.click();
    toast.success('CSV exported successfully');
  };

  const handleExportPdf = () => {
    const headers = ['Name', 'Email', 'Phone', 'Annual Budget', 'Staff'];
    const data = organizations.map(org => [
      org.name, org.contact_email || '', org.phone || '', `$${org.annual_budget?.toLocaleString() || '0'}`, org.staff_count || ''
    ]);
    exportToPdf({ title: 'Organizations', headers, data, filename: 'organizations.pdf' });
    toast.success('PDF exported successfully');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === organizations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(organizations.map(o => o.id)));
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    try {
      await api.delete('/organizations/bulk', { data: { ids: Array.from(selectedIds) } });
      toast.success(`${selectedIds.size} organizations deleted`);
      setSelectedIds(new Set());
      fetchOrganizations();
    } catch (error) {
      toast.error('Failed to delete organizations');
    }
  };

  const openModal = (item = null) => {
    setFormErrors({});
    if (item) {
      setSelectedItem(item);
      setFormData({
        name: item.name || '',
        mission: item.mission || '',
        description: item.description || '',
        website: item.website || '',
        contact_email: item.contact_email || '',
        phone: item.phone || '',
        address: item.address || '',
        tax_id: item.tax_id || '',
        annual_budget: item.annual_budget || '',
        staff_count: item.staff_count || ''
      });
    } else {
      setSelectedItem(null);
      setFormData({
        name: '',
        mission: '',
        description: '',
        website: '',
        contact_email: '',
        phone: '',
        address: '',
        tax_id: '',
        annual_budget: '',
        staff_count: ''
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

  const sortOptions = [
    { value: 'created_at', label: 'Date Created' },
    { value: 'name', label: 'Name' },
    { value: 'annual_budget', label: 'Budget' },
    { value: 'staff_count', label: 'Staff' },
  ];

  return (
    <div className="data-page">
      <div className="page-header">
        <div>
          <h1><FiUsers /> Organizations</h1>
          <p>Manage nonprofit organizations and their profiles</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={exportToCSV}>
            <FiDownload /> CSV
          </button>
          <button className="btn btn-secondary" onClick={handleExportPdf}>
            <FiFileText /> PDF
          </button>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <FiPlus /> New Organization
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
          placeholder="Search organizations..."
        />
        <SortControl options={sortOptions} value={sortField} order={sortOrder} onChange={setSortField} onOrderChange={setSortOrder} />
        <span className="results-count">{totalItems} organizations</span>
      </div>

      {loading ? <LoadingSkeleton type="table" rows={5} /> : (
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" checked={selectedIds.size === organizations.length && organizations.length > 0} onChange={toggleSelectAll} /></th>
              <th>Organization</th>
              <th>Contact</th>
              <th>Budget</th>
              <th>Staff</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {organizations.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-row">
                  {searchQuery ? 'No organizations found matching your search' : 'No organizations yet'}
                </td>
              </tr>
            ) : (
              organizations.map((org) => (
                <tr key={org.id} onClick={() => openDetailModal(org)}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(org.id)} onChange={() => toggleSelect(org.id)} />
                  </td>
                  <td>
                    <div className="cell-main">
                      <span className="cell-title">{org.name}</span>
                      <span className="cell-subtitle">{org.mission?.substring(0, 60)}...</span>
                    </div>
                  </td>
                  <td>
                    <div className="cell-main">
                      <span className="cell-title">{org.contact_email}</span>
                      <span className="cell-subtitle">{org.phone}</span>
                    </div>
                  </td>
                  <td>${org.annual_budget?.toLocaleString() || 'N/A'}</td>
                  <td>{org.staff_count || 'N/A'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="action-buttons">
                      <button className="action-btn edit" onClick={() => openModal(org)} title="Edit">
                        <FiEdit2 />
                      </button>
                      <button className="action-btn delete" onClick={() => setConfirmDelete({ open: true, id: org.id })} title="Delete">
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
              <h2>{selectedItem ? 'Edit Organization' : 'New Organization'}</h2>
              <button className="modal-close" onClick={closeModal}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Organization Name *</label>
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
                <label>Mission Statement</label>
                <textarea
                  name="mission"
                  value={formData.mission}
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
              <div className="form-row">
                <div className="form-group">
                  <label>Website</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder="https://"
                    className={formErrors.website ? 'error' : ''}
                  />
                  {formErrors.website && <span className="error-text">{formErrors.website}</span>}
                </div>
                <div className="form-group">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    name="contact_email"
                    value={formData.contact_email}
                    onChange={handleInputChange}
                    className={formErrors.contact_email ? 'error' : ''}
                  />
                  {formErrors.contact_email && <span className="error-text">{formErrors.contact_email}</span>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Tax ID</label>
                  <input
                    type="text"
                    name="tax_id"
                    value={formData.tax_id}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Annual Budget</label>
                  <input
                    type="number"
                    name="annual_budget"
                    value={formData.annual_budget}
                    onChange={handleInputChange}
                    placeholder="e.g., 1000000"
                  />
                </div>
                <div className="form-group">
                  <label>Staff Count</label>
                  <input
                    type="number"
                    name="staff_count"
                    value={formData.staff_count}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {selectedItem ? 'Update' : 'Create'} Organization
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
              <div className="detail-section">
                <h3>Mission</h3>
                <p>{selectedItem.mission || 'No mission statement'}</p>
              </div>
              <div className="detail-section">
                <h3>Description</h3>
                <p>{selectedItem.description || 'No description'}</p>
              </div>
              <div className="detail-grid">
                <div className="detail-item">
                  <FiMail className="detail-icon" />
                  <div>
                    <span className="detail-label">Email</span>
                    <span className="detail-value">{selectedItem.contact_email || 'N/A'}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <FiPhone className="detail-icon" />
                  <div>
                    <span className="detail-label">Phone</span>
                    <span className="detail-value">{selectedItem.phone || 'N/A'}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <FiGlobe className="detail-icon" />
                  <div>
                    <span className="detail-label">Website</span>
                    <span className="detail-value">{selectedItem.website || 'N/A'}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <FiMapPin className="detail-icon" />
                  <div>
                    <span className="detail-label">Address</span>
                    <span className="detail-value">{selectedItem.address || 'N/A'}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <FiDollarSign className="detail-icon" />
                  <div>
                    <span className="detail-label">Annual Budget</span>
                    <span className="detail-value">${selectedItem.annual_budget?.toLocaleString() || 'N/A'}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <FiUsers className="detail-icon" />
                  <div>
                    <span className="detail-label">Staff Count</span>
                    <span className="detail-value">{selectedItem.staff_count || 'N/A'}</span>
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

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Organization"
        message="Are you sure you want to delete this organization? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default Organizations;
