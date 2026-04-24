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
  FiPlus, FiEdit2, FiTrash2, FiX, FiTarget,
  FiCpu, FiRefreshCw, FiCopy, FiDownload, FiTrendingUp, FiCheck, FiFileText
} from 'react-icons/fi';
import './DataPage.css';

const ImpactMetrics = () => {
  const toast = useToast();
  const [metrics, setMetrics] = useState([]);
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
    metric_type: 'output',
    target_value: '',
    current_value: '',
    unit: '',
    description: '',
    measurement_method: '',
    reporting_frequency: 'monthly',
    start_date: '',
    end_date: '',
    status: 'active'
  });
  const [aiForm, setAiForm] = useState({
    organization_id: '',
    project_description: '',
    current_metrics: ''
  });

  const aiExamples = [
    { label: 'Youth Mentorship', project_description: 'Youth mentorship and career development pairing at-risk youth ages 14-21 with professional mentors for 12 months. Includes weekly mentoring sessions, monthly career workshops, job shadowing, resume training, and internship connections. Targeting youth from low-income households and foster care.', current_metrics: 'Currently tracking: number of mentor matches, session attendance, participant satisfaction' },
    { label: 'Literacy Program', project_description: 'Two-generation family literacy program serving 200 families with children ages 0-5 in communities where 45% of adults read below 6th-grade level. Weekly parent-child reading circles at 8 sites, adult GED classes, home library building (10 books/family/quarter), and kindergarten readiness support.', current_metrics: 'Tracking: program enrollment, books distributed, parent attendance at reading circles' },
    { label: 'Green Jobs', project_description: '16-week workforce training preparing 120 adults annually for renewable energy careers. 8 weeks classroom instruction (solar, weatherization, energy auditing) plus 8 weeks paid on-the-job training. Includes NABCEP/BPI/OSHA certification prep, job placement, and 12-month post-placement support.', current_metrics: 'Tracking: enrollment numbers, certification pass rates, job placement rate at 30 days' }
  ];

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/impact-metrics', {
        params: { search: searchQuery, page: currentPage, limit: itemsPerPage, sort: sortField, order: sortOrder }
      });
      setMetrics(response.data.data || response.data);
      setTotalItems(response.data.total || (response.data.data ? response.data.total : response.data.length));
    } catch (error) {
      toast.error('Failed to fetch metrics');
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
    fetchMetrics();
  }, [fetchMetrics]);

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
      toast.error('Please enter a metric title');
      return;
    }
    try {
      if (selectedItem) {
        await api.put(`/impact-metrics/${selectedItem.id}`, formData);
        toast.success('Metric updated successfully');
      } else {
        await api.post('/impact-metrics', formData);
        toast.success('Metric created successfully');
      }
      fetchMetrics();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save metric');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/impact-metrics/${confirmDelete.id}`);
      toast.success('Metric deleted successfully');
      fetchMetrics();
      setShowDetailModal(false);
      setConfirmDelete({ open: false, id: null });
    } catch (error) {
      toast.error('Failed to delete metric');
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
      const response = await api.post('/ai/measure-impact', aiForm);
      setAiResult(response.data);
      toast.success('Impact framework generated!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate impact framework');
    } finally {
      setAiLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (aiResult?.impact_analysis) {
      navigator.clipboard.writeText(aiResult.impact_analysis);
      toast.success('Copied to clipboard!');
    }
  };

  const exportToCSV = () => {
    const headers = ['Title', 'Organization', 'Type', 'Target', 'Current', 'Unit', 'Status'];
    const csvData = metrics.map(m => [
      m.title, m.organization_name, m.metric_type, m.target_value, m.current_value, m.unit, m.status
    ]);
    const csvContent = [headers, ...csvData].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'impact-metrics.csv';
    link.click();
    toast.success('CSV exported successfully');
  };

  const handleExportPdf = () => {
    const headers = ['Title', 'Type', 'Target', 'Current', 'Unit', 'Status'];
    const data = metrics.map(m => [
      m.title || '', m.metric_type || '', String(m.target_value || 0), String(m.current_value || 0), m.unit || '', m.status || ''
    ]);
    exportToPdf({ title: 'Impact Metrics', headers, data, filename: 'impact-metrics.pdf' });
    toast.success('PDF exported successfully');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === metrics.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(metrics.map(m => m.id)));
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    try {
      await api.delete('/impact-metrics/bulk', { data: { ids: Array.from(selectedIds) } });
      toast.success(`${selectedIds.size} metrics deleted`);
      setSelectedIds(new Set());
      fetchMetrics();
    } catch (error) {
      toast.error('Failed to delete metrics');
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        title: item.title || '',
        organization_id: item.organization_id || '',
        proposal_id: item.proposal_id || '',
        metric_type: item.metric_type || 'output',
        target_value: item.target_value || '',
        current_value: item.current_value || '',
        unit: item.unit || '',
        description: item.description || '',
        measurement_method: item.measurement_method || '',
        reporting_frequency: item.reporting_frequency || 'monthly',
        start_date: item.start_date ? item.start_date.split('T')[0] : '',
        end_date: item.end_date ? item.end_date.split('T')[0] : '',
        status: item.status || 'active'
      });
    } else {
      setSelectedItem(null);
      setFormData({
        title: '',
        organization_id: '',
        proposal_id: '',
        metric_type: 'output',
        target_value: '',
        current_value: '',
        unit: '',
        description: '',
        measurement_method: '',
        reporting_frequency: 'monthly',
        start_date: '',
        end_date: '',
        status: 'active'
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

  const getProgressPercent = (current, target) => {
    if (!target || target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getMetricTypeColor = (type) => {
    const colors = {
      output: '#10B981',
      outcome: '#6366F1',
      impact: '#EC4899'
    };
    return colors[type] || '#6B7280';
  };

  const sortOptions = [
    { value: 'created_at', label: 'Date Created' },
    { value: 'title', label: 'Title' },
    { value: 'metric_type', label: 'Type' },
    { value: 'target_value', label: 'Target Value' },
  ];

  return (
    <div className="data-page">
      <div className="page-header">
        <div>
          <h1><FiTarget /> Impact Measurer</h1>
          <p>Track and measure program outcomes with AI insights</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={exportToCSV}>
            <FiDownload /> CSV
          </button>
          <button className="btn btn-secondary" onClick={handleExportPdf}>
            <FiFileText /> PDF
          </button>
          <button className="btn btn-secondary" onClick={() => setShowAIModal(true)}>
            <FiCpu /> AI Analyze
          </button>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <FiPlus /> New Metric
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
          placeholder="Search metrics..."
        />
        <SortControl options={sortOptions} value={sortField} order={sortOrder} onChange={setSortField} onOrderChange={setSortOrder} />
        <span className="results-count">{totalItems} metrics</span>
      </div>

      {loading ? <LoadingSkeleton type="table" rows={5} /> : (
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" checked={selectedIds.size === metrics.length && metrics.length > 0} onChange={toggleSelectAll} /></th>
              <th>Metric</th>
              <th>Type</th>
              <th>Progress</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {metrics.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-row">
                  {searchQuery ? 'No metrics found matching your search' : 'No metrics yet. Create your first impact metric!'}
                </td>
              </tr>
            ) : (
              metrics.map((metric) => {
                const progress = getProgressPercent(metric.current_value, metric.target_value);
                return (
                  <tr key={metric.id} onClick={() => openDetailModal(metric)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(metric.id)} onChange={() => toggleSelect(metric.id)} />
                    </td>
                    <td>
                      <div className="cell-main">
                        <span className="cell-title">{metric.title}</span>
                        <span className="cell-subtitle">{metric.organization_name || 'No organization'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="type-badge" style={{ backgroundColor: getMetricTypeColor(metric.metric_type) }}>
                        {metric.metric_type}
                      </span>
                    </td>
                    <td>
                      <div className="progress-cell">
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${progress}%`, backgroundColor: getMetricTypeColor(metric.metric_type) }}></div>
                        </div>
                        <span className="progress-text">{metric.current_value || 0} / {metric.target_value || 0} {metric.unit}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-${metric.status}`}>
                        {metric.status}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="action-buttons">
                        <button className="action-btn edit" onClick={() => openModal(metric)} title="Edit">
                          <FiEdit2 />
                        </button>
                        <button className="action-btn delete" onClick={() => setConfirmDelete({ open: true, id: metric.id })} title="Delete">
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
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
              <h2>{selectedItem ? 'Edit Metric' : 'New Impact Metric'}</h2>
              <button className="modal-close" onClick={closeModal}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Metric Title *</label>
                <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g., Students Completing Program" />
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
                  <label>Metric Type</label>
                  <select name="metric_type" value={formData.metric_type} onChange={handleInputChange}>
                    <option value="output">Output (Direct products)</option>
                    <option value="outcome">Outcome (Changes achieved)</option>
                    <option value="impact">Impact (Long-term effects)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Unit of Measurement</label>
                  <input type="text" name="unit" value={formData.unit} onChange={handleInputChange} placeholder="e.g., participants, %, hours" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Target Value</label>
                  <input type="number" name="target_value" value={formData.target_value} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Current Value</label>
                  <input type="number" name="current_value" value={formData.current_value} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows="2" placeholder="What does this metric measure?" />
              </div>
              <div className="form-group">
                <label>Measurement Method</label>
                <input type="text" name="measurement_method" value={formData.measurement_method} onChange={handleInputChange} placeholder="e.g., Pre/post surveys, attendance records" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Reporting Frequency</label>
                  <select name="reporting_frequency" value={formData.reporting_frequency} onChange={handleInputChange}>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange}>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">{selectedItem ? 'Update' : 'Create'} Metric</button>
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
              <div className="metric-progress-large">
                <div className="progress-circle" style={{ '--progress': getProgressPercent(selectedItem.current_value, selectedItem.target_value), '--color': getMetricTypeColor(selectedItem.metric_type) }}>
                  <span className="progress-value">{getProgressPercent(selectedItem.current_value, selectedItem.target_value)}%</span>
                </div>
                <div className="progress-details">
                  <p className="progress-current">{selectedItem.current_value || 0} {selectedItem.unit}</p>
                  <p className="progress-target">of {selectedItem.target_value || 0} {selectedItem.unit} target</p>
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Type</span>
                  <span className="type-badge" style={{ backgroundColor: getMetricTypeColor(selectedItem.metric_type) }}>{selectedItem.metric_type}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className={`status-badge status-${selectedItem.status}`}>{selectedItem.status}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Organization</span>
                  <span className="detail-value">{selectedItem.organization_name || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Reporting</span>
                  <span className="detail-value">{selectedItem.reporting_frequency}</span>
                </div>
              </div>
              {selectedItem.description && (
                <div className="detail-section">
                  <h3>Description</h3>
                  <p>{selectedItem.description}</p>
                </div>
              )}
              {selectedItem.measurement_method && (
                <div className="detail-section">
                  <h3>Measurement Method</h3>
                  <p>{selectedItem.measurement_method}</p>
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
              <h2><FiCpu /> AI Impact Framework Generator</h2>
              <button className="modal-close" onClick={() => { setShowAIModal(false); setAiResult(null); }}>
                <FiX />
              </button>
            </div>
            <div className="ai-form">
              <div className="example-buttons" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Load Sample:</span>
                {aiExamples.map((ex, i) => (
                  <button key={i} className="btn btn-outline" style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '6px' }} onClick={() => setAiForm(prev => ({ ...prev, project_description: ex.project_description, current_metrics: ex.current_metrics }))}>{ex.label}</button>
                ))}
              </div>
              <div className="form-group">
                <label>Organization (Optional)</label>
                <select value={aiForm.organization_id} onChange={(e) => setAiForm({ ...aiForm, organization_id: e.target.value })}>
                  <option value="">Select Organization</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Project Description *</label>
                <textarea
                  value={aiForm.project_description}
                  onChange={(e) => setAiForm({ ...aiForm, project_description: e.target.value })}
                  rows="4"
                  placeholder="Describe your project, goals, and target population..."
                />
              </div>
              <div className="form-group">
                <label>Current Metrics (Optional)</label>
                <textarea
                  value={aiForm.current_metrics}
                  onChange={(e) => setAiForm({ ...aiForm, current_metrics: e.target.value })}
                  rows="2"
                  placeholder="List any metrics you're already tracking..."
                />
              </div>
              <button className="btn btn-primary generate-btn" onClick={handleGenerateAI} disabled={aiLoading}>
                {aiLoading ? <><FiRefreshCw className="spinning" /> Analyzing...</> : <><FiTrendingUp /> Generate Impact Framework</>}
              </button>
            </div>
            {aiResult && (
              <div className="ai-output">
                <div className="ai-output-header">
                  <h3>Impact Measurement Framework</h3>
                  <div className="ai-output-actions">
                    <button className="btn btn-secondary" onClick={copyToClipboard}><FiCopy /> Copy</button>
                    <button className="btn btn-secondary" onClick={() => {
                      const blob = new Blob([aiResult.impact_analysis], { type: 'text/plain' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = 'impact-framework.md';
                      link.click();
                    }}><FiDownload /> Download</button>
                    {aiResult.savedId && <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#D1FAE5', color: '#065F46', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}><FiCheck /> Saved</span>}
                  </div>
                </div>
                <div className="ai-output-content markdown-content">
                  <ReactMarkdown>{aiResult.impact_analysis}</ReactMarkdown>
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
        title="Delete Metric"
        message="Are you sure you want to delete this impact metric? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default ImpactMetrics;
