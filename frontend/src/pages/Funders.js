import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../App';
import { useToast } from '../components/Toast';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSkeleton from '../components/LoadingSkeleton';
import SortControl from '../components/SortControl';
import { exportToPdf } from '../utils/exportPdf';
import ReactMarkdown from 'react-markdown';
import {
  FiPlus, FiEdit2, FiTrash2, FiX, FiSearch,
  FiCpu, FiRefreshCw, FiCopy, FiDownload, FiGlobe,
  FiDollarSign, FiMapPin, FiMail, FiCheck, FiFileText
} from 'react-icons/fi';
import './DataPage.css';

const Funders = () => {
  const toast = useToast();
  const [funders, setFunders] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    funder_type: 'Private Foundation',
    website: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    focus_areas: '',
    geographic_focus: '',
    funding_range_min: '',
    funding_range_max: '',
    application_process: '',
    deadline_info: '',
    requirements: '',
    past_grants: '',
    notes: ''
  });
  const [aiForm, setAiForm] = useState({
    funder_name: '',
    organization_id: '',
    additional_info: ''
  });

  const aiExamples = [
    { label: 'Ford Foundation', funder_name: 'The Ford Foundation', additional_info: 'We are a nonprofit focused on education equity and youth development in urban areas. Interested in their social justice and education funding streams.' },
    { label: 'Gates Foundation', funder_name: 'Bill & Melinda Gates Foundation', additional_info: 'We run K-12 education technology programs and are exploring their US education grants. Our focus is improving math and reading outcomes through adaptive learning software.' },
    { label: 'MacArthur Foundation', funder_name: 'John D. and Catherine T. MacArthur Foundation', additional_info: 'We work on criminal justice reform and reentry programs. Looking for funding for our housing-first approach to reducing recidivism in Cook County, Illinois.' }
  ];

  const funderTypes = ['Private Foundation', 'Community Foundation', 'Corporate Foundation', 'Government Agency', 'Nonprofit Organization', 'Impact Fund'];

  const fetchFunders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/funders', {
        params: { search: searchQuery, page: currentPage, limit: itemsPerPage, sort: sortField, order: sortOrder }
      });
      setFunders(response.data.data || response.data);
      setTotalItems(response.data.total || (response.data.data ? response.data.total : response.data.length));
    } catch (error) {
      toast.error('Failed to fetch funders');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentPage, itemsPerPage, sortField, sortOrder, toast]);

  const fetchOrganizations = useCallback(async () => {
    try {
      const res = await api.get('/organizations', { params: { limit: 100 } });
      setOrganizations(res.data.data || res.data);
    } catch (error) {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchFunders();
  }, [fetchFunders]);

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
  const displayData = filterType !== 'all'
    ? funders.filter(f => f.funder_type === filterType)
    : funders;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter a funder name');
      return;
    }
    try {
      if (selectedItem) {
        await api.put(`/funders/${selectedItem.id}`, formData);
        toast.success('Funder updated successfully');
      } else {
        await api.post('/funders', formData);
        toast.success('Funder created successfully');
      }
      fetchFunders();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save funder');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/funders/${confirmDelete.id}`);
      toast.success('Funder deleted successfully');
      fetchFunders();
      setShowDetailModal(false);
      setConfirmDelete({ open: false, id: null });
    } catch (error) {
      toast.error('Failed to delete funder');
    }
  };

  const handleGenerateAI = async () => {
    if (!aiForm.funder_name.trim()) {
      toast.warning('Please enter a funder name to research');
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    try {
      const response = await api.post('/ai/research-funder', aiForm);
      setAiResult(response.data);
      toast.success('Funder research complete!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to research funder');
    } finally {
      setAiLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (aiResult?.funder_research) {
      navigator.clipboard.writeText(aiResult.funder_research);
      toast.success('Copied to clipboard!');
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Type', 'Funding Range', 'Focus Areas', 'Geographic Focus', 'Email'];
    const csvData = funders.map(f => [
      f.name, f.funder_type,
      `$${Number(f.funding_range_min || 0).toLocaleString()} - $${Number(f.funding_range_max || 0).toLocaleString()}`,
      f.focus_areas, f.geographic_focus, f.contact_email
    ]);
    const csvContent = [headers, ...csvData].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'funders.csv';
    link.click();
    toast.success('CSV exported successfully');
  };

  const handleExportPdf = () => {
    const headers = ['Name', 'Type', 'Max Funding', 'Focus Areas', 'Geographic'];
    const data = funders.map(f => [
      f.name || '', f.funder_type || '', `$${Number(f.funding_range_max || 0).toLocaleString()}`,
      (f.focus_areas || '').substring(0, 40), f.geographic_focus || ''
    ]);
    exportToPdf({ title: 'Funders', headers, data, filename: 'funders.pdf' });
    toast.success('PDF exported successfully');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === funders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(funders.map(f => f.id)));
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    try {
      await api.delete('/funders/bulk', { data: { ids: Array.from(selectedIds) } });
      toast.success(`${selectedIds.size} funders deleted`);
      setSelectedIds(new Set());
      fetchFunders();
    } catch (error) {
      toast.error('Failed to delete funders');
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        name: item.name || '',
        funder_type: item.funder_type || 'Private Foundation',
        website: item.website || '',
        contact_email: item.contact_email || '',
        contact_phone: item.contact_phone || '',
        address: item.address || '',
        focus_areas: item.focus_areas || '',
        geographic_focus: item.geographic_focus || '',
        funding_range_min: item.funding_range_min || '',
        funding_range_max: item.funding_range_max || '',
        application_process: item.application_process || '',
        deadline_info: item.deadline_info || '',
        requirements: item.requirements || '',
        past_grants: item.past_grants || '',
        notes: item.notes || ''
      });
    } else {
      setSelectedItem(null);
      setFormData({
        name: '',
        funder_type: 'Private Foundation',
        website: '',
        contact_email: '',
        contact_phone: '',
        address: '',
        focus_areas: '',
        geographic_focus: '',
        funding_range_min: '',
        funding_range_max: '',
        application_process: '',
        deadline_info: '',
        requirements: '',
        past_grants: '',
        notes: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  const openDetailModal = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const getFunderTypeColor = (type) => {
    const colors = {
      'Private Foundation': '#4F46E5',
      'Community Foundation': '#10B981',
      'Corporate Foundation': '#F59E0B',
      'Government Agency': '#EF4444',
      'Nonprofit Organization': '#8B5CF6',
      'Impact Fund': '#06B6D4'
    };
    return colors[type] || '#6B7280';
  };

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'funder_type', label: 'Type' },
    { value: 'funding_range_max', label: 'Max Funding' },
  ];

  return (
    <div className="data-page">
      <div className="page-header">
        <div>
          <h1><FiSearch /> Funder Research</h1>
          <p>Research and track potential funding sources with AI assistance</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={exportToCSV}>
            <FiDownload /> CSV
          </button>
          <button className="btn btn-secondary" onClick={handleExportPdf}>
            <FiFileText /> PDF
          </button>
          <button className="btn btn-secondary" onClick={() => setShowAIModal(true)}>
            <FiCpu /> AI Research
          </button>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <FiPlus /> New Funder
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
          placeholder="Search funders..."
        />
        <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {funderTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <SortControl options={sortOptions} value={sortField} order={sortOrder} onChange={setSortField} onOrderChange={setSortOrder} />
        <span className="results-count">{totalItems} funders</span>
      </div>

      {loading ? <LoadingSkeleton type="table" rows={5} /> : (
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" checked={selectedIds.size === funders.length && funders.length > 0} onChange={toggleSelectAll} /></th>
              <th>Funder</th>
              <th>Type</th>
              <th>Funding Range</th>
              <th>Focus Areas</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayData.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-row">
                  {searchQuery || filterType !== 'all' ? 'No funders found' : 'No funders yet. Add your first funder!'}
                </td>
              </tr>
            ) : (
              displayData.map((funder) => (
                <tr key={funder.id} onClick={() => openDetailModal(funder)}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(funder.id)} onChange={() => toggleSelect(funder.id)} />
                  </td>
                  <td>
                    <div className="cell-main">
                      <span className="cell-title">{funder.name}</span>
                      <span className="cell-subtitle">{funder.geographic_focus || 'National'}</span>
                    </div>
                  </td>
                  <td>
                    <span className="type-badge" style={{ backgroundColor: getFunderTypeColor(funder.funder_type) }}>
                      {funder.funder_type}
                    </span>
                  </td>
                  <td>
                    <span className="amount-text">
                      ${Number(funder.funding_range_min || 0).toLocaleString()} - ${Number(funder.funding_range_max || 0).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <span className="focus-areas">{funder.focus_areas?.substring(0, 50) || 'N/A'}...</span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="action-buttons">
                      <button className="action-btn edit" onClick={() => openModal(funder)} title="Edit">
                        <FiEdit2 />
                      </button>
                      <button className="action-btn delete" onClick={() => setConfirmDelete({ open: true, id: funder.id })} title="Delete">
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
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem ? 'Edit Funder' : 'New Funder'}</h2>
              <button className="modal-close" onClick={closeModal}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Funder Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., Gates Foundation" />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select name="funder_type" value={formData.funder_type} onChange={handleInputChange}>
                    {funderTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Website</label>
                  <input type="url" name="website" value={formData.website} onChange={handleInputChange} placeholder="https://" />
                </div>
                <div className="form-group">
                  <label>Contact Email</label>
                  <input type="email" name="contact_email" value={formData.contact_email} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input type="text" name="contact_phone" value={formData.contact_phone} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Geographic Focus</label>
                  <input type="text" name="geographic_focus" value={formData.geographic_focus} onChange={handleInputChange} placeholder="e.g., National, Northeast US" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Min Funding ($)</label>
                  <input type="number" name="funding_range_min" value={formData.funding_range_min} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Max Funding ($)</label>
                  <input type="number" name="funding_range_max" value={formData.funding_range_max} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-group">
                <label>Focus Areas</label>
                <input type="text" name="focus_areas" value={formData.focus_areas} onChange={handleInputChange} placeholder="e.g., Education, Healthcare, Environment" />
              </div>
              <div className="form-group">
                <label>Application Process</label>
                <textarea name="application_process" value={formData.application_process} onChange={handleInputChange} rows="2" placeholder="Describe the application process..." />
              </div>
              <div className="form-group">
                <label>Deadline Info</label>
                <input type="text" name="deadline_info" value={formData.deadline_info} onChange={handleInputChange} placeholder="e.g., Rolling, Annual in March" />
              </div>
              <div className="form-group">
                <label>Requirements</label>
                <textarea name="requirements" value={formData.requirements} onChange={handleInputChange} rows="2" placeholder="Key requirements for applicants..." />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="2" placeholder="Additional notes..." />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">{selectedItem ? 'Update' : 'Create'} Funder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal detail-modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem.name}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="detail-content">
              <div className="funder-header">
                <span className="type-badge large" style={{ backgroundColor: getFunderTypeColor(selectedItem.funder_type) }}>
                  {selectedItem.funder_type}
                </span>
                {selectedItem.website && (
                  <a href={selectedItem.website} target="_blank" rel="noopener noreferrer" className="website-link">
                    <FiGlobe /> Visit Website
                  </a>
                )}
              </div>
              <div className="detail-grid">
                <div className="detail-item">
                  <FiDollarSign className="detail-icon" />
                  <div>
                    <span className="detail-label">Funding Range</span>
                    <span className="detail-value">${Number(selectedItem.funding_range_min || 0).toLocaleString()} - ${Number(selectedItem.funding_range_max || 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <FiMapPin className="detail-icon" />
                  <div>
                    <span className="detail-label">Geographic Focus</span>
                    <span className="detail-value">{selectedItem.geographic_focus || 'N/A'}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <FiMail className="detail-icon" />
                  <div>
                    <span className="detail-label">Contact</span>
                    <span className="detail-value">{selectedItem.contact_email || 'N/A'}</span>
                  </div>
                </div>
              </div>
              {selectedItem.focus_areas && (
                <div className="detail-section">
                  <h3>Focus Areas</h3>
                  <p>{selectedItem.focus_areas}</p>
                </div>
              )}
              {selectedItem.application_process && (
                <div className="detail-section">
                  <h3>Application Process</h3>
                  <p>{selectedItem.application_process}</p>
                </div>
              )}
              {selectedItem.requirements && (
                <div className="detail-section">
                  <h3>Requirements</h3>
                  <p>{selectedItem.requirements}</p>
                </div>
              )}
              {selectedItem.deadline_info && (
                <div className="detail-section">
                  <h3>Deadline Information</h3>
                  <p>{selectedItem.deadline_info}</p>
                </div>
              )}
              {selectedItem.notes && (
                <div className="detail-section">
                  <h3>Notes</h3>
                  <p>{selectedItem.notes}</p>
                </div>
              )}
            </div>
            <div className="form-actions">
              <button className="btn btn-danger" onClick={() => setConfirmDelete({ open: true, id: selectedItem.id })}>
                <FiTrash2 /> Delete
              </button>
              <button className="btn btn-secondary" onClick={() => {
                setAiForm({ funder_name: selectedItem.name, organization_id: '', additional_info: '' });
                setShowDetailModal(false);
                setShowAIModal(true);
              }}>
                <FiCpu /> AI Research
              </button>
              <button className="btn btn-primary" onClick={() => { setShowDetailModal(false); openModal(selectedItem); }}>
                <FiEdit2 /> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Research Modal */}
      {showAIModal && (
        <div className="modal-overlay" onClick={() => { setShowAIModal(false); setAiResult(null); }}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FiCpu /> AI Funder Research</h2>
              <button className="modal-close" onClick={() => { setShowAIModal(false); setAiResult(null); }}>
                <FiX />
              </button>
            </div>
            <div className="ai-form">
              <div className="example-buttons" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Load Sample:</span>
                {aiExamples.map((ex, i) => (
                  <button key={i} className="btn btn-outline" style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '6px' }} onClick={() => setAiForm(prev => ({ ...prev, funder_name: ex.funder_name, additional_info: ex.additional_info }))}>{ex.label}</button>
                ))}
              </div>
              <div className="form-group">
                <label>Funder Name to Research *</label>
                <input
                  type="text"
                  value={aiForm.funder_name}
                  onChange={(e) => setAiForm({ ...aiForm, funder_name: e.target.value })}
                  placeholder="e.g., Ford Foundation, Bill & Melinda Gates Foundation"
                />
              </div>
              <div className="form-group">
                <label>Your Organization (for alignment analysis)</label>
                <select value={aiForm.organization_id} onChange={(e) => setAiForm({ ...aiForm, organization_id: e.target.value })}>
                  <option value="">Select Organization</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Additional Context (Optional)</label>
                <textarea
                  value={aiForm.additional_info}
                  onChange={(e) => setAiForm({ ...aiForm, additional_info: e.target.value })}
                  rows="2"
                  placeholder="Any specific questions or context for the research..."
                />
              </div>
              <button className="btn btn-primary generate-btn" onClick={handleGenerateAI} disabled={aiLoading}>
                {aiLoading ? <><FiRefreshCw className="spinning" /> Researching...</> : <><FiSearch /> Research Funder</>}
              </button>
            </div>
            {aiResult && (
              <div className="ai-output">
                <div className="ai-output-header">
                  <h3>Research Results: {aiResult.funder_name}</h3>
                  <div className="ai-output-actions">
                    <button className="btn btn-secondary" onClick={copyToClipboard}><FiCopy /> Copy</button>
                    <button className="btn btn-secondary" onClick={() => {
                      const blob = new Blob([aiResult.funder_research], { type: 'text/plain' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `funder-research-${aiResult.funder_name.toLowerCase().replace(/\s+/g, '-')}.md`;
                      link.click();
                    }}><FiDownload /> Download</button>
                    {aiResult.savedId && <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#D1FAE5', color: '#065F46', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}><FiCheck /> Saved</span>}
                  </div>
                </div>
                <div className="ai-output-content markdown-content">
                  <ReactMarkdown>{aiResult.funder_research}</ReactMarkdown>
                </div>
                <div className="ai-meta">
                  <span>Model: {aiResult.model}</span>
                  {aiResult.organization && <span>For: {aiResult.organization}</span>}
                  {aiResult.usage && <span>Tokens: {aiResult.usage.total_tokens}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Funder"
        message="Are you sure you want to delete this funder? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default Funders;
