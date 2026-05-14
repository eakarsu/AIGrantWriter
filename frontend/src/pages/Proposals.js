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
  FiPlus, FiEdit2, FiTrash2, FiX, FiFileText,
  FiDollarSign, FiCalendar, FiUsers, FiTarget, FiDownload
} from 'react-icons/fi';
import './DataPage.css';

const Proposals = () => {
  const toast = useToast();
  const [proposals, setProposals] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailTab, setDetailTab] = useState('details');
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
  const [formData, setFormData] = useState({
    title: '',
    organization_id: '',
    grant_id: '',
    status: 'draft',
    content: '',
    amount_requested: '',
    submission_date: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const fetchProposals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/proposals', {
        params: { search: searchQuery, page: currentPage, limit: itemsPerPage, sort: sortField, order: sortOrder }
      });
      setProposals(response.data.data || response.data);
      setTotalItems(response.data.total || (response.data.data ? response.data.total : response.data.length));
    } catch (error) {
      toast.error('Failed to fetch proposals');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentPage, itemsPerPage, sortField, sortOrder, toast]);

  const fetchDropdowns = useCallback(async () => {
    try {
      const [orgsRes, grantsRes] = await Promise.all([
        api.get('/organizations', { params: { limit: 100 } }),
        api.get('/grants', { params: { limit: 100 } })
      ]);
      setOrganizations(orgsRes.data.data || orgsRes.data);
      setGrants(grantsRes.data.data || grantsRes.data);
    } catch (error) {
      // silently fail for dropdowns
    }
  }, []);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

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

  // Client-side status filter on server-paginated data
  const displayData = statusFilter
    ? proposals.filter(p => p.status === statusFilter)
    : proposals;

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = 'Proposal title is required';
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
        await api.put(`/proposals/${selectedItem.id}`, formData);
        toast.success('Proposal updated successfully');
      } else {
        await api.post('/proposals', formData);
        toast.success('Proposal created successfully');
      }
      fetchProposals();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save proposal');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/proposals/${confirmDelete.id}`);
      toast.success('Proposal deleted successfully');
      fetchProposals();
      setShowDetailModal(false);
      setConfirmDelete({ open: false, id: null });
    } catch (error) {
      toast.error('Failed to delete proposal');
    }
  };

  const exportToCSV = () => {
    const headers = ['Title', 'Organization', 'Grant', 'Status', 'Amount Requested', 'Submission Date'];
    const csvData = proposals.map(p => [
      p.title, p.organization_name, p.grant_title, p.status, p.amount_requested, p.submission_date
    ]);
    const csvContent = [headers, ...csvData].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'proposals.csv';
    link.click();
    toast.success('CSV exported successfully');
  };

  const handleExportPdf = () => {
    const headers = ['Title', 'Organization', 'Status', 'Amount', 'Submission Date'];
    const data = proposals.map(p => [
      p.title, p.organization_name || '', p.status || '', `$${p.amount_requested?.toLocaleString() || '0'}`,
      p.submission_date ? new Date(p.submission_date).toLocaleDateString() : ''
    ]);
    exportToPdf({ title: 'Proposals', headers, data, filename: 'proposals.pdf' });
    toast.success('PDF exported successfully');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === proposals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(proposals.map(p => p.id)));
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    try {
      await api.delete('/proposals/bulk', { data: { ids: Array.from(selectedIds) } });
      toast.success(`${selectedIds.size} proposals deleted`);
      setSelectedIds(new Set());
      fetchProposals();
    } catch (error) {
      toast.error('Failed to delete proposals');
    }
  };

  const openModal = (item = null) => {
    setFormErrors({});
    if (item) {
      setSelectedItem(item);
      setFormData({
        title: item.title || '',
        organization_id: item.organization_id || '',
        grant_id: item.grant_id || '',
        status: item.status || 'draft',
        content: item.content || '',
        amount_requested: item.amount_requested || '',
        submission_date: item.submission_date ? item.submission_date.split('T')[0] : ''
      });
    } else {
      setSelectedItem(null);
      setFormData({
        title: '',
        organization_id: '',
        grant_id: '',
        status: 'draft',
        content: '',
        amount_requested: '',
        submission_date: ''
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
    setDetailTab('details');
    setVersions([]);
    setShowDetailModal(true);
  };

  const fetchVersions = async (id) => {
    setVersionsLoading(true);
    try {
      const res = await api.get(`/proposals/${id}/versions`);
      setVersions(res.data);
    } catch (error) {
      toast.error('Failed to fetch version history');
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleRestoreVersion = async (versionId) => {
    try {
      await api.post(`/proposals/${selectedItem.id}/versions/${versionId}/restore`);
      toast.success('Version restored successfully');
      fetchProposals();
      setShowDetailModal(false);
    } catch (error) {
      toast.error('Failed to restore version');
    }
  };

  const handleExportProposalPdf = (id) => {
    const token = localStorage.getItem('token');
    const url = `http://localhost:3001/api/proposals/${id}/export/pdf`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    // Use fetch to download with auth header
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `proposal-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(blobUrl);
        toast.success('PDF exported successfully');
      })
      .catch(() => toast.error('Failed to export PDF'));
  };

  const sortOptions = [
    { value: 'created_at', label: 'Date Created' },
    { value: 'title', label: 'Title' },
    { value: 'amount_requested', label: 'Amount' },
    { value: 'status', label: 'Status' },
  ];

  return (
    <div className="data-page">
      <div className="page-header">
        <div>
          <h1><FiFileText /> Proposals</h1>
          <p>Manage grant proposals and applications</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={exportToCSV}>
            <FiDownload /> CSV
          </button>
          <button className="btn btn-secondary" onClick={handleExportPdf}>
            <FiFileText /> PDF
          </button>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <FiPlus /> New Proposal
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
            placeholder="Search proposals..."
          />
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="pending_review">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <SortControl options={sortOptions} value={sortField} order={sortOrder} onChange={setSortField} onOrderChange={setSortOrder} />
        <span className="results-count">{totalItems} proposals</span>
      </div>

      {loading ? <LoadingSkeleton type="table" rows={5} /> : (
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" checked={selectedIds.size === proposals.length && proposals.length > 0} onChange={toggleSelectAll} /></th>
              <th>Proposal</th>
              <th>Organization</th>
              <th>Grant</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayData.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-row">
                  {searchQuery || statusFilter ? 'No proposals found matching your criteria' : 'No proposals yet'}
                </td>
              </tr>
            ) : (
              displayData.map((proposal) => (
                <tr key={proposal.id} onClick={() => openDetailModal(proposal)}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(proposal.id)} onChange={() => toggleSelect(proposal.id)} />
                  </td>
                  <td>
                    <div className="cell-main">
                      <span className="cell-title">{proposal.title}</span>
                      <span className="cell-subtitle">
                        {proposal.submission_date
                          ? `Submitted: ${new Date(proposal.submission_date).toLocaleDateString()}`
                          : 'Not submitted'}
                      </span>
                    </div>
                  </td>
                  <td>{proposal.organization_name || 'N/A'}</td>
                  <td>{proposal.grant_title || 'N/A'}</td>
                  <td style={{ fontWeight: 600, color: '#10B981' }}>${proposal.amount_requested?.toLocaleString() || 'N/A'}</td>
                  <td>
                    <span className={`status-badge status-${proposal.status}`}>
                      {proposal.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="action-buttons">
                      <button className="action-btn edit" onClick={() => openModal(proposal)} title="Edit">
                        <FiEdit2 />
                      </button>
                      <button className="action-btn delete" onClick={() => setConfirmDelete({ open: true, id: proposal.id })} title="Delete">
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
              <h2>{selectedItem ? 'Edit Proposal' : 'New Proposal'}</h2>
              <button className="modal-close" onClick={closeModal}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Proposal Title *</label>
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
                <div className="form-group">
                  <label>Grant</label>
                  <select
                    name="grant_id"
                    value={formData.grant_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Grant</option>
                    {grants.map(grant => (
                      <option key={grant.id} value={grant.id}>{grant.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="pending_review">Pending Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount Requested ($)</label>
                  <input
                    type="number"
                    name="amount_requested"
                    value={formData.amount_requested}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Submission Date</label>
                <input
                  type="date"
                  name="submission_date"
                  value={formData.submission_date}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Proposal Content</label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  rows="8"
                  placeholder="Enter your proposal content here..."
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {selectedItem ? 'Update' : 'Create'} Proposal
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

            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 24px', gap: '4px' }}>
              {['details', 'history'].map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    setDetailTab(tab);
                    if (tab === 'history' && versions.length === 0) fetchVersions(selectedItem.id);
                  }}
                  style={{
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontWeight: detailTab === tab ? 700 : 400,
                    borderBottom: detailTab === tab ? '2px solid #6366f1' : '2px solid transparent',
                    color: detailTab === tab ? '#6366f1' : '#64748b',
                    textTransform: 'capitalize',
                  }}
                >
                  {tab === 'history' ? 'History' : 'Details'}
                </button>
              ))}
            </div>

            <div className="detail-content">
              {detailTab === 'details' ? (
                <>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <FiUsers className="detail-icon" />
                      <div>
                        <span className="detail-label">Organization</span>
                        <span className="detail-value">{selectedItem.organization_name || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="detail-item">
                      <FiTarget className="detail-icon" />
                      <div>
                        <span className="detail-label">Grant</span>
                        <span className="detail-value">{selectedItem.grant_title || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="detail-item">
                      <FiDollarSign className="detail-icon" />
                      <div>
                        <span className="detail-label">Amount Requested</span>
                        <span className="detail-value">${selectedItem.amount_requested?.toLocaleString() || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="detail-item">
                      <FiCalendar className="detail-icon" />
                      <div>
                        <span className="detail-label">Submission Date</span>
                        <span className="detail-value">
                          {selectedItem.submission_date
                            ? new Date(selectedItem.submission_date).toLocaleDateString()
                            : 'Not submitted'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="detail-section" style={{ marginTop: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>Status</h3>
                      <span className={`status-badge status-${selectedItem.status}`}>
                        {selectedItem.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="detail-section">
                    <h3>Content</h3>
                    <div style={{
                      background: '#f8fafc',
                      padding: '16px',
                      borderRadius: '12px',
                      maxHeight: '300px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {selectedItem.content || 'No content yet'}
                    </div>
                  </div>
                </>
              ) : (
                <div className="detail-section">
                  <h3>Version History</h3>
                  {versionsLoading ? (
                    <p style={{ color: '#64748b' }}>Loading versions...</p>
                  ) : versions.length === 0 ? (
                    <p style={{ color: '#64748b' }}>No previous versions found. Versions are saved automatically each time you edit a proposal.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {versions.map((v) => (
                        <div key={v.id} style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '12px 16px',
                          background: '#f8fafc',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                          <div>
                            <strong>Version {v.version_number}</strong>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                              {new Date(v.created_at).toLocaleString()}
                              {v.created_by_name ? ` · by ${v.created_by_name}` : ''}
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                              {v.content ? v.content.substring(0, 100) + (v.content.length > 100 ? '...' : '') : 'No content'}
                            </div>
                          </div>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleRestoreVersion(v.id)}
                            style={{ flexShrink: 0, marginLeft: '12px' }}
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-actions">
              <button className="btn btn-danger" onClick={() => setConfirmDelete({ open: true, id: selectedItem.id })}>
                <FiTrash2 /> Delete
              </button>
              <button className="btn btn-secondary" onClick={() => handleExportProposalPdf(selectedItem.id)}>
                <FiDownload /> Export PDF
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
        title="Delete Proposal"
        message="Are you sure you want to delete this proposal? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default Proposals;
