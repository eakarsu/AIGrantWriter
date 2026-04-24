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
  FiPlus, FiEdit2, FiTrash2, FiX, FiCalendar,
  FiCpu, FiRefreshCw, FiCopy, FiDownload, FiClock,
  FiAlertTriangle, FiCheckCircle, FiCheck, FiFileText
} from 'react-icons/fi';
import './DataPage.css';

const Deadlines = () => {
  const toast = useToast();
  const [deadlines, setDeadlines] = useState([]);
  const [allDeadlines, setAllDeadlines] = useState([]);
  const [grants, setGrants] = useState([]);
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
  const [sortField, setSortField] = useState('due_date');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    grant_id: '',
    organization_id: '',
    due_date: '',
    reminder_date: '',
    priority: 'medium',
    status: 'pending',
    notes: '',
    task_type: 'application'
  });
  const [aiForm, setAiForm] = useState({
    organization_id: ''
  });

  const loadAiExample = () => {
    if (organizations.length > 0) {
      setAiForm({ organization_id: String(organizations[0].id) });
      toast.info(`Selected: ${organizations[0].name}`);
    } else {
      toast.warning('Add an organization first');
    }
  };

  const fetchDeadlines = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/deadlines', {
        params: { search: searchQuery, page: currentPage, limit: itemsPerPage, sort: sortField, order: sortOrder }
      });
      const data = response.data.data || response.data;
      setDeadlines(data);
      setTotalItems(response.data.total || (response.data.data ? response.data.total : response.data.length));
    } catch (error) {
      toast.error('Failed to fetch deadlines');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentPage, itemsPerPage, sortField, sortOrder, toast]);

  const fetchDropdowns = useCallback(async () => {
    try {
      const [grantsRes, orgsRes, allDlRes] = await Promise.all([
        api.get('/grants', { params: { limit: 100 } }),
        api.get('/organizations', { params: { limit: 100 } }),
        api.get('/deadlines', { params: { limit: 100 } })
      ]);
      setGrants(grantsRes.data.data || grantsRes.data);
      setOrganizations(orgsRes.data.data || orgsRes.data);
      setAllDeadlines(allDlRes.data.data || allDlRes.data);
    } catch (error) {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchDeadlines();
  }, [fetchDeadlines]);

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

  // Client-side status filter
  const displayData = filterStatus !== 'all'
    ? deadlines.filter(d => d.status === filterStatus)
    : deadlines;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.due_date) {
      toast.error('Please enter a title and due date');
      return;
    }
    try {
      if (selectedItem) {
        await api.put(`/deadlines/${selectedItem.id}`, formData);
        toast.success('Deadline updated successfully');
      } else {
        await api.post('/deadlines', formData);
        toast.success('Deadline created successfully');
      }
      fetchDeadlines();
      fetchDropdowns();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save deadline');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/deadlines/${confirmDelete.id}`);
      toast.success('Deadline deleted successfully');
      fetchDeadlines();
      fetchDropdowns();
      setShowDetailModal(false);
      setConfirmDelete({ open: false, id: null });
    } catch (error) {
      toast.error('Failed to delete deadline');
    }
  };

  const handleMarkComplete = async (id) => {
    try {
      const deadline = deadlines.find(d => d.id === id);
      await api.put(`/deadlines/${id}`, { ...deadline, status: 'completed' });
      toast.success('Deadline marked as complete!');
      fetchDeadlines();
      fetchDropdowns();
    } catch (error) {
      toast.error('Failed to update deadline');
    }
  };

  const handleGenerateAI = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const response = await api.post('/ai/analyze-deadlines', aiForm);
      setAiResult(response.data);
      toast.success('Deadline analysis complete!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to analyze deadlines');
    } finally {
      setAiLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (aiResult?.deadline_analysis) {
      navigator.clipboard.writeText(aiResult.deadline_analysis);
      toast.success('Copied to clipboard!');
    }
  };

  const exportToCSV = () => {
    const headers = ['Title', 'Grant', 'Due Date', 'Priority', 'Status', 'Task Type'];
    const csvData = deadlines.map(d => [
      d.title, d.grant_title, d.due_date, d.priority, d.status, d.task_type
    ]);
    const csvContent = [headers, ...csvData].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'deadlines.csv';
    link.click();
    toast.success('CSV exported successfully');
  };

  const handleExportPdf = () => {
    const headers = ['Title', 'Grant', 'Due Date', 'Priority', 'Status'];
    const data = deadlines.map(d => [
      d.title || '', d.grant_title || '',
      d.due_date ? new Date(d.due_date).toLocaleDateString() : '',
      d.priority || '', d.status || ''
    ]);
    exportToPdf({ title: 'Deadlines', headers, data, filename: 'deadlines.pdf' });
    toast.success('PDF exported successfully');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === deadlines.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deadlines.map(d => d.id)));
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    try {
      await api.delete('/deadlines/bulk', { data: { ids: Array.from(selectedIds) } });
      toast.success(`${selectedIds.size} deadlines deleted`);
      setSelectedIds(new Set());
      fetchDeadlines();
      fetchDropdowns();
    } catch (error) {
      toast.error('Failed to delete deadlines');
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        title: item.title || '',
        grant_id: item.grant_id || '',
        organization_id: item.organization_id || '',
        due_date: item.due_date ? item.due_date.split('T')[0] : '',
        reminder_date: item.reminder_date ? item.reminder_date.split('T')[0] : '',
        priority: item.priority || 'medium',
        status: item.status || 'pending',
        notes: item.notes || '',
        task_type: item.task_type || 'application'
      });
    } else {
      setSelectedItem(null);
      setFormData({
        title: '',
        grant_id: '',
        organization_id: '',
        due_date: '',
        reminder_date: '',
        priority: 'medium',
        status: 'pending',
        notes: '',
        task_type: 'application'
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

  const getDaysUntil = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);
    return Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  };

  const getUrgencyClass = (date, status) => {
    if (status === 'completed') return 'completed';
    const days = getDaysUntil(date);
    if (days < 0) return 'overdue';
    if (days <= 3) return 'critical';
    if (days <= 7) return 'urgent';
    if (days <= 14) return 'soon';
    return 'normal';
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <FiAlertTriangle className="priority-icon high" />;
      case 'medium': return <FiClock className="priority-icon medium" />;
      default: return <FiCheckCircle className="priority-icon low" />;
    }
  };

  const sortOptions = [
    { value: 'due_date', label: 'Due Date' },
    { value: 'title', label: 'Title' },
    { value: 'priority', label: 'Priority' },
    { value: 'status', label: 'Status' },
  ];

  // Calculate stats from allDeadlines (full dataset)
  const statsSource = allDeadlines.length > 0 ? allDeadlines : deadlines;
  const stats = {
    overdue: statsSource.filter(d => getDaysUntil(d.due_date) < 0 && d.status !== 'completed').length,
    thisWeek: statsSource.filter(d => {
      const days = getDaysUntil(d.due_date);
      return days >= 0 && days <= 7 && d.status !== 'completed';
    }).length,
    upcoming: statsSource.filter(d => getDaysUntil(d.due_date) > 7 && d.status !== 'completed').length,
    completed: statsSource.filter(d => d.status === 'completed').length
  };

  return (
    <div className="data-page">
      <div className="page-header">
        <div>
          <h1><FiCalendar /> Deadline Tracker</h1>
          <p>Never miss a grant deadline with AI-powered tracking</p>
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
            <FiPlus /> New Deadline
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="deadline-stats">
        <div className="stat-mini overdue" onClick={() => setFilterStatus('all')}>
          <span className="stat-number">{stats.overdue}</span>
          <span className="stat-label">Overdue</span>
        </div>
        <div className="stat-mini urgent" onClick={() => setFilterStatus('pending')}>
          <span className="stat-number">{stats.thisWeek}</span>
          <span className="stat-label">This Week</span>
        </div>
        <div className="stat-mini upcoming" onClick={() => setFilterStatus('in_progress')}>
          <span className="stat-number">{stats.upcoming}</span>
          <span className="stat-label">Upcoming</span>
        </div>
        <div className="stat-mini completed" onClick={() => setFilterStatus('completed')}>
          <span className="stat-number">{stats.completed}</span>
          <span className="stat-label">Completed</span>
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
          placeholder="Search deadlines..."
        />
        <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <SortControl options={sortOptions} value={sortField} order={sortOrder} onChange={setSortField} onOrderChange={setSortOrder} />
        <span className="results-count">{totalItems} deadlines</span>
      </div>

      {loading ? <LoadingSkeleton type="table" rows={5} /> : (
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" checked={selectedIds.size === deadlines.length && deadlines.length > 0} onChange={toggleSelectAll} /></th>
              <th>Deadline</th>
              <th>Due Date</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayData.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-row">
                  {searchQuery || filterStatus !== 'all' ? 'No deadlines found' : 'No deadlines yet. Add your first deadline!'}
                </td>
              </tr>
            ) : (
              displayData.map((deadline) => {
                const daysUntil = getDaysUntil(deadline.due_date);
                const urgency = getUrgencyClass(deadline.due_date, deadline.status);
                return (
                  <tr key={deadline.id} className={`deadline-row ${urgency}`} onClick={() => openDetailModal(deadline)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(deadline.id)} onChange={() => toggleSelect(deadline.id)} />
                    </td>
                    <td>
                      <div className="cell-main">
                        <span className="cell-title">{deadline.title}</span>
                        <span className="cell-subtitle">{deadline.grant_title || deadline.task_type}</span>
                      </div>
                    </td>
                    <td>
                      <div className="date-cell">
                        <span className="date-value">{new Date(deadline.due_date).toLocaleDateString()}</span>
                        <span className={`days-badge ${urgency}`}>
                          {deadline.status === 'completed' ? 'Done' :
                           daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` :
                           daysUntil === 0 ? 'Today' :
                           `${daysUntil}d left`}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="priority-cell">
                        {getPriorityIcon(deadline.priority)}
                        <span>{deadline.priority}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-${deadline.status}`}>
                        {deadline.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="action-buttons">
                        {deadline.status !== 'completed' && (
                          <button className="action-btn complete" onClick={() => handleMarkComplete(deadline.id)} title="Mark Complete">
                            <FiCheckCircle />
                          </button>
                        )}
                        <button className="action-btn edit" onClick={() => openModal(deadline)} title="Edit">
                          <FiEdit2 />
                        </button>
                        <button className="action-btn delete" onClick={() => setConfirmDelete({ open: true, id: deadline.id })} title="Delete">
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
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem ? 'Edit Deadline' : 'New Deadline'}</h2>
              <button className="modal-close" onClick={closeModal}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title *</label>
                <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g., Submit LOI for Environmental Grant" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Grant</label>
                  <select name="grant_id" value={formData.grant_id} onChange={handleInputChange}>
                    <option value="">Select Grant</option>
                    {grants.map(g => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Organization</label>
                  <select name="organization_id" value={formData.organization_id} onChange={handleInputChange}>
                    <option value="">Select Organization</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Due Date *</label>
                  <input type="date" name="due_date" value={formData.due_date} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Reminder Date</label>
                  <input type="date" name="reminder_date" value={formData.reminder_date} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select name="priority" value={formData.priority} onChange={handleInputChange}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Task Type</label>
                <select name="task_type" value={formData.task_type} onChange={handleInputChange}>
                  <option value="application">Application</option>
                  <option value="reporting">Reporting</option>
                  <option value="revision">Revision</option>
                  <option value="meeting">Meeting</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="3" placeholder="Additional details..." />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">{selectedItem ? 'Update' : 'Create'} Deadline</button>
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
              <div className={`deadline-countdown ${getUrgencyClass(selectedItem.due_date, selectedItem.status)}`}>
                {selectedItem.status === 'completed' ? (
                  <span className="countdown-complete"><FiCheckCircle /> Completed</span>
                ) : (
                  <>
                    <span className="countdown-number">{Math.abs(getDaysUntil(selectedItem.due_date))}</span>
                    <span className="countdown-label">{getDaysUntil(selectedItem.due_date) < 0 ? 'days overdue' : 'days remaining'}</span>
                  </>
                )}
              </div>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Due Date</span>
                  <span className="detail-value">{new Date(selectedItem.due_date).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Priority</span>
                  <span className="detail-value">{selectedItem.priority}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Grant</span>
                  <span className="detail-value">{selectedItem.grant_title || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Task Type</span>
                  <span className="detail-value">{selectedItem.task_type}</span>
                </div>
              </div>
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
              <button className="btn btn-primary" onClick={() => { setShowDetailModal(false); openModal(selectedItem); }}>
                <FiEdit2 /> Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Analyze Modal */}
      {showAIModal && (
        <div className="modal-overlay" onClick={() => { setShowAIModal(false); setAiResult(null); }}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FiCpu /> AI Deadline Analyzer</h2>
              <button className="modal-close" onClick={() => { setShowAIModal(false); setAiResult(null); }}>
                <FiX />
              </button>
            </div>
            <div className="ai-form">
              <div className="example-buttons" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Quick Start:</span>
                <button className="btn btn-outline" style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '6px' }} onClick={loadAiExample}>Auto-Select Org</button>
              </div>
              <div className="form-group">
                <label>Organization (Optional)</label>
                <select value={aiForm.organization_id} onChange={(e) => setAiForm({ ...aiForm, organization_id: e.target.value })}>
                  <option value="">All Organizations</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <p className="form-hint">Analyze all your deadlines and get AI-powered recommendations for prioritization and planning.</p>
              <button className="btn btn-primary generate-btn" onClick={handleGenerateAI} disabled={aiLoading}>
                {aiLoading ? <><FiRefreshCw className="spinning" /> Analyzing...</> : <><FiCalendar /> Analyze Deadlines</>}
              </button>
            </div>
            {aiResult && (
              <div className="ai-output">
                <div className="ai-output-header">
                  <h3>Deadline Analysis</h3>
                  <div className="ai-output-actions">
                    <button className="btn btn-secondary" onClick={copyToClipboard}><FiCopy /> Copy</button>
                    <button className="btn btn-secondary" onClick={() => {
                      const blob = new Blob([aiResult.deadline_analysis], { type: 'text/plain' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = 'deadline-analysis.md';
                      link.click();
                    }}><FiDownload /> Download</button>
                    {aiResult.savedId && <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#D1FAE5', color: '#065F46', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}><FiCheck /> Saved</span>}
                  </div>
                </div>
                <div className="ai-output-content markdown-content">
                  <ReactMarkdown>{aiResult.deadline_analysis}</ReactMarkdown>
                </div>
                <div className="ai-meta">
                  <span>Deadlines Analyzed: {aiResult.deadlines_analyzed}</span>
                  <span>Grants Analyzed: {aiResult.grants_analyzed}</span>
                  <span>Model: {aiResult.model}</span>
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
        title="Delete Deadline"
        message="Are you sure you want to delete this deadline? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default Deadlines;
