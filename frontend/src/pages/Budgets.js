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
  FiPlus, FiEdit2, FiTrash2, FiX, FiPieChart,
  FiDollarSign, FiCpu, FiRefreshCw, FiCopy, FiDownload, FiCheck, FiFileText
} from 'react-icons/fi';
import './DataPage.css';

const Budgets = () => {
  const toast = useToast();
  const [budgets, setBudgets] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    organization_id: '',
    proposal_id: '',
    total_amount: '',
    personnel: '',
    equipment: '',
    supplies: '',
    travel: '',
    contractual: '',
    other: '',
    indirect: '',
    status: 'draft',
    narrative: ''
  });
  const [aiForm, setAiForm] = useState({
    project_description: '',
    total_amount: '',
    categories: ''
  });

  const aiExamples = [
    { label: 'Health Clinic', project_description: 'Mobile health clinic serving rural communities. Operating 5 days/week across 15 locations providing preventive care, chronic disease management, vaccinations, and health screenings. Staff: 1 physician, 2 nurse practitioners, 1 medical assistant, 1 community health worker. Serving 5,000 patients annually.', total_amount: '250000', categories: 'Personnel, Vehicle & Equipment, Medical Supplies, Operations, Outreach' },
    { label: 'STEM Education', project_description: 'Year-round after-school STEM Academy in 5 Title I schools for 300 students grades 6-8. Includes coding, robotics, science enrichment 4 days/week plus 6-week summer intensive. Monthly family engagement nights and annual STEM fair with 3 local tech company partnerships.', total_amount: '150000', categories: 'Personnel, Technology & Equipment, Curriculum Materials, Family Engagement, Evaluation' },
    { label: 'Housing Program', project_description: 'Transitional housing and employment support for 40 individuals experiencing homelessness. 20-unit facility with case management (1:15 ratio), vocational training, mental health counseling, financial literacy workshops, and permanent housing placement over 18 months.', total_amount: '500000', categories: 'Facility Operations, Personnel, Client Services, Vocational Training, Housing Placement, Administration' }
  ];

  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/budgets', {
        params: { search: searchQuery, page: currentPage, limit: itemsPerPage, sort: sortField, order: sortOrder }
      });
      setBudgets(response.data.data || response.data);
      setTotalItems(response.data.total || (response.data.data ? response.data.total : response.data.length));
    } catch (error) {
      toast.error('Failed to fetch budgets');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentPage, itemsPerPage, sortField, sortOrder, toast]);

  const fetchDropdowns = useCallback(async () => {
    try {
      const [orgsRes, proposalsRes] = await Promise.all([
        api.get('/organizations', { params: { limit: 100 } }),
        api.get('/proposals', { params: { limit: 100 } })
      ]);
      setOrganizations(orgsRes.data.data || orgsRes.data);
      setProposals(proposalsRes.data.data || proposalsRes.data);
    } catch (error) {
      // silently fail for dropdowns
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please enter a budget title');
      return;
    }
    try {
      if (selectedItem) {
        await api.put(`/budgets/${selectedItem.id}`, formData);
        toast.success('Budget updated successfully');
      } else {
        await api.post('/budgets', formData);
        toast.success('Budget created successfully');
      }
      fetchBudgets();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save budget');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/budgets/${confirmDelete.id}`);
      toast.success('Budget deleted successfully');
      fetchBudgets();
      setShowDetailModal(false);
      setConfirmDelete({ open: false, id: null });
    } catch (error) {
      toast.error('Failed to delete budget');
    }
  };

  const handleGenerateAI = async () => {
    if (!aiForm.project_description.trim()) {
      toast.warning('Please enter a project description');
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    try {
      const response = await api.post('/ai/generate-budget', aiForm);
      setAiResult(response.data);
      toast.success('Budget generated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate budget');
    } finally {
      setAiLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (aiResult?.budget) {
      navigator.clipboard.writeText(aiResult.budget);
      toast.success('Copied to clipboard!');
    }
  };

  const exportToCSV = () => {
    const headers = ['Title', 'Organization', 'Total Amount', 'Personnel', 'Equipment', 'Supplies', 'Travel', 'Status'];
    const csvData = budgets.map(b => [
      b.title, b.organization_name, b.total_amount, b.personnel, b.equipment, b.supplies, b.travel, b.status
    ]);
    const csvContent = [headers, ...csvData].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'budgets.csv';
    link.click();
    toast.success('CSV exported successfully');
  };

  const handleExportPdf = () => {
    const headers = ['Title', 'Organization', 'Total', 'Personnel', 'Equipment', 'Status'];
    const data = budgets.map(b => [
      b.title || '', b.organization_name || '', `$${Number(b.total_amount || 0).toLocaleString()}`,
      `$${Number(b.personnel || 0).toLocaleString()}`, `$${Number(b.equipment || 0).toLocaleString()}`, b.status || ''
    ]);
    exportToPdf({ title: 'Budgets', headers, data, filename: 'budgets.pdf' });
    toast.success('PDF exported successfully');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === budgets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(budgets.map(b => b.id)));
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    try {
      await api.delete('/budgets/bulk', { data: { ids: Array.from(selectedIds) } });
      toast.success(`${selectedIds.size} budgets deleted`);
      setSelectedIds(new Set());
      fetchBudgets();
    } catch (error) {
      toast.error('Failed to delete budgets');
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        title: item.title || '',
        organization_id: item.organization_id || '',
        proposal_id: item.proposal_id || '',
        total_amount: item.total_amount || '',
        personnel: item.personnel || '',
        equipment: item.equipment || '',
        supplies: item.supplies || '',
        travel: item.travel || '',
        contractual: item.contractual || '',
        other: item.other || '',
        indirect: item.indirect || '',
        status: item.status || 'draft',
        narrative: item.narrative || ''
      });
    } else {
      setSelectedItem(null);
      setFormData({
        title: '',
        organization_id: '',
        proposal_id: '',
        total_amount: '',
        personnel: '',
        equipment: '',
        supplies: '',
        travel: '',
        contractual: '',
        other: '',
        indirect: '',
        status: 'draft',
        narrative: ''
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

  const getStatusBadge = (status) => {
    const statusClasses = {
      draft: 'status-draft',
      pending: 'status-pending',
      approved: 'status-approved',
      submitted: 'status-submitted'
    };
    return statusClasses[status] || 'status-draft';
  };

  const sortOptions = [
    { value: 'created_at', label: 'Date Created' },
    { value: 'title', label: 'Title' },
    { value: 'total_amount', label: 'Total Amount' },
    { value: 'status', label: 'Status' },
  ];

  return (
    <div className="data-page">
      <div className="page-header">
        <div>
          <h1><FiPieChart /> Budget Builder</h1>
          <p>Create and manage grant budgets with AI assistance</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={exportToCSV}>
            <FiDownload /> CSV
          </button>
          <button className="btn btn-secondary" onClick={handleExportPdf}>
            <FiFileText /> PDF
          </button>
          <button className="btn btn-secondary" onClick={() => setShowAIModal(true)}>
            <FiCpu /> AI Generate
          </button>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <FiPlus /> New Budget
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
          placeholder="Search budgets..."
        />
        <SortControl options={sortOptions} value={sortField} order={sortOrder} onChange={setSortField} onOrderChange={setSortOrder} />
        <span className="results-count">{totalItems} budgets</span>
      </div>

      {loading ? <LoadingSkeleton type="table" rows={5} /> : (
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" checked={selectedIds.size === budgets.length && budgets.length > 0} onChange={toggleSelectAll} /></th>
              <th>Budget</th>
              <th>Organization</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {budgets.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-row">
                  {searchQuery ? 'No budgets found matching your search' : 'No budgets yet. Create your first budget!'}
                </td>
              </tr>
            ) : (
              budgets.map((budget) => (
                <tr key={budget.id} onClick={() => openDetailModal(budget)}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(budget.id)} onChange={() => toggleSelect(budget.id)} />
                  </td>
                  <td>
                    <div className="cell-main">
                      <span className="cell-title">{budget.title}</span>
                      <span className="cell-subtitle">{budget.proposal_title || 'No proposal linked'}</span>
                    </div>
                  </td>
                  <td>{budget.organization_name || 'N/A'}</td>
                  <td>
                    <span className="amount-text">
                      ${Number(budget.total_amount || 0).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusBadge(budget.status)}`}>
                      {budget.status}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="action-buttons">
                      <button className="action-btn edit" onClick={() => openModal(budget)} title="Edit">
                        <FiEdit2 />
                      </button>
                      <button className="action-btn delete" onClick={() => setConfirmDelete({ open: true, id: budget.id })} title="Delete">
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
              <h2>{selectedItem ? 'Edit Budget' : 'New Budget'}</h2>
              <button className="modal-close" onClick={closeModal}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Budget Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Youth STEM Program Budget FY2025"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Organization</label>
                  <select name="organization_id" value={formData.organization_id} onChange={handleInputChange}>
                    <option value="">Select Organization</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Linked Proposal</label>
                  <select name="proposal_id" value={formData.proposal_id} onChange={handleInputChange}>
                    <option value="">Select Proposal</option>
                    {proposals.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Total Amount ($)</label>
                  <input type="number" name="total_amount" value={formData.total_amount} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange}>
                    <option value="draft">Draft</option>
                    <option value="pending">Pending Review</option>
                    <option value="approved">Approved</option>
                    <option value="submitted">Submitted</option>
                  </select>
                </div>
              </div>
              <div className="form-section-title">Budget Categories</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Personnel ($)</label>
                  <input type="number" name="personnel" value={formData.personnel} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Equipment ($)</label>
                  <input type="number" name="equipment" value={formData.equipment} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Supplies ($)</label>
                  <input type="number" name="supplies" value={formData.supplies} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Travel ($)</label>
                  <input type="number" name="travel" value={formData.travel} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Contractual ($)</label>
                  <input type="number" name="contractual" value={formData.contractual} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Other ($)</label>
                  <input type="number" name="other" value={formData.other} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-group">
                <label>Indirect Costs ($)</label>
                <input type="number" name="indirect" value={formData.indirect} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Budget Narrative</label>
                <textarea name="narrative" value={formData.narrative} onChange={handleInputChange} rows="4" placeholder="Explain the budget allocations..." />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">{selectedItem ? 'Update' : 'Create'} Budget</button>
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
              <h2>{selectedItem.title}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="detail-content">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Organization</span>
                  <span className="detail-value">{selectedItem.organization_name || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total Amount</span>
                  <span className="detail-value">${Number(selectedItem.total_amount || 0).toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className={`status-badge ${getStatusBadge(selectedItem.status)}`}>{selectedItem.status}</span>
                </div>
              </div>
              <div className="budget-breakdown">
                <h3>Budget Breakdown</h3>
                <div className="budget-items">
                  <div className="budget-item"><span>Personnel</span><span>${Number(selectedItem.personnel || 0).toLocaleString()}</span></div>
                  <div className="budget-item"><span>Equipment</span><span>${Number(selectedItem.equipment || 0).toLocaleString()}</span></div>
                  <div className="budget-item"><span>Supplies</span><span>${Number(selectedItem.supplies || 0).toLocaleString()}</span></div>
                  <div className="budget-item"><span>Travel</span><span>${Number(selectedItem.travel || 0).toLocaleString()}</span></div>
                  <div className="budget-item"><span>Contractual</span><span>${Number(selectedItem.contractual || 0).toLocaleString()}</span></div>
                  <div className="budget-item"><span>Other</span><span>${Number(selectedItem.other || 0).toLocaleString()}</span></div>
                  <div className="budget-item"><span>Indirect</span><span>${Number(selectedItem.indirect || 0).toLocaleString()}</span></div>
                </div>
              </div>
              {selectedItem.narrative && (
                <div className="detail-section">
                  <h3>Budget Narrative</h3>
                  <p>{selectedItem.narrative}</p>
                </div>
              )}
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

      {/* AI Generate Modal */}
      {showAIModal && (
        <div className="modal-overlay" onClick={() => { setShowAIModal(false); setAiResult(null); }}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FiCpu /> AI Budget Generator</h2>
              <button className="modal-close" onClick={() => { setShowAIModal(false); setAiResult(null); }}>
                <FiX />
              </button>
            </div>
            <div className="ai-form">
              <div className="example-buttons" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Load Sample:</span>
                {aiExamples.map((ex, i) => (
                  <button key={i} className="btn btn-outline" style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '6px' }} onClick={() => setAiForm({ project_description: ex.project_description, total_amount: ex.total_amount, categories: ex.categories })}>{ex.label}</button>
                ))}
              </div>
              <div className="form-group">
                <label>Project Description *</label>
                <textarea
                  value={aiForm.project_description}
                  onChange={(e) => setAiForm({ ...aiForm, project_description: e.target.value })}
                  rows="4"
                  placeholder="Describe your project, activities, and goals..."
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Total Amount ($)</label>
                  <input
                    type="number"
                    value={aiForm.total_amount}
                    onChange={(e) => setAiForm({ ...aiForm, total_amount: e.target.value })}
                    placeholder="e.g., 100000"
                  />
                </div>
                <div className="form-group">
                  <label>Budget Categories</label>
                  <input
                    type="text"
                    value={aiForm.categories}
                    onChange={(e) => setAiForm({ ...aiForm, categories: e.target.value })}
                    placeholder="e.g., Personnel, Equipment, Travel"
                  />
                </div>
              </div>
              <button className="btn btn-primary generate-btn" onClick={handleGenerateAI} disabled={aiLoading}>
                {aiLoading ? <><FiRefreshCw className="spinning" /> Generating...</> : <><FiCpu /> Generate Budget</>}
              </button>
            </div>
            {aiResult && (
              <div className="ai-output">
                <div className="ai-output-header">
                  <h3>Generated Budget</h3>
                  <div className="ai-output-actions">
                    <button className="btn btn-secondary" onClick={copyToClipboard}><FiCopy /> Copy</button>
                    <button className="btn btn-secondary" onClick={() => {
                      const blob = new Blob([aiResult.budget], { type: 'text/plain' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = 'budget-narrative.md';
                      link.click();
                    }}><FiDownload /> Download</button>
                    {aiResult.savedId && <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#D1FAE5', color: '#065F46', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}><FiCheck /> Saved</span>}
                  </div>
                </div>
                <div className="ai-output-content markdown-content">
                  <ReactMarkdown>{aiResult.budget}</ReactMarkdown>
                </div>
                <div className="ai-meta">
                  <span>Model: {aiResult.model}</span>
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
        title="Delete Budget"
        message="Are you sure you want to delete this budget? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default Budgets;
