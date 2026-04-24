import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../App';
import { useToast } from '../components/Toast';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { FiClock, FiTrash2, FiEye, FiCopy, FiX, FiFilter } from 'react-icons/fi';
import './DataPage.css';
import './AIHistory.css';

const TOOL_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'generate-proposal', label: 'Generate Proposal' },
  { value: 'improve-text', label: 'Improve Text' },
  { value: 'executive-summary', label: 'Executive Summary' },
  { value: 'match-grants', label: 'Match Grants' },
  { value: 'review-proposal', label: 'Review Proposal' },
  { value: 'budget-narrative', label: 'Budget Narrative' },
  { value: 'impact-measurement', label: 'Impact Measurement' },
  { value: 'deadline-analysis', label: 'Deadline Analysis' },
  { value: 'funder-research', label: 'Funder Research' },
];

const toolTypeLabel = (type) => {
  const found = TOOL_TYPES.find(t => t.value === type);
  return found ? found.label : type;
};

const AIHistory = () => {
  const toast = useToast();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedResult, setSelectedResult] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', currentPage);
      params.set('limit', itemsPerPage);
      if (search) params.set('search', search);
      if (filterType) params.set('tool_type', filterType);

      const response = await api.get(`/ai/results?${params.toString()}`);
      setResults(response.data.results);
      setTotalItems(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      toast.error('Failed to load AI results');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, search, filterType, toast]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/ai/results/${deleteTarget.id}`);
      toast.success('AI result deleted');
      setDeleteTarget(null);
      if (selectedResult?.id === deleteTarget.id) setSelectedResult(null);
      fetchResults();
    } catch (error) {
      toast.error('Failed to delete AI result');
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleViewDetail = async (result) => {
    // If content is already loaded (from list), use it; otherwise fetch full detail
    if (result.content) {
      setSelectedResult(result);
    } else {
      try {
        const response = await api.get(`/ai/results/${result.id}`);
        setSelectedResult(response.data);
      } catch {
        toast.error('Failed to load result details');
      }
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getSnippet = (content, maxLen = 120) => {
    if (!content) return '—';
    const text = content.replace(/[#*_`>\-\[\]()]/g, '').replace(/\n+/g, ' ').trim();
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  };

  return (
    <div className="data-page">
      <div className="page-header">
        <div>
          <h1><FiClock /> AI History</h1>
          <p>Browse, search, and manage all your saved AI results</p>
        </div>
      </div>

      <div className="data-toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by title..."
        />
        <div className="history-filter">
          <FiFilter className="filter-icon" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            {TOOL_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <span className="results-count">{totalItems} result{totalItems !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading results...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="empty-state">
          <FiClock size={48} />
          <h3>No AI Results Found</h3>
          <p>{search || filterType ? 'Try adjusting your search or filter.' : 'Use AI Tools to generate results that will appear here.'}</p>
        </div>
      ) : (
        <>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Tool Type</th>
                  <th>Preview</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map(result => (
                  <tr key={result.id} className="clickable-row" onClick={() => handleViewDetail(result)}>
                    <td className="title-cell">{result.title}</td>
                    <td>
                      <span className={`tool-badge tool-badge-${result.tool_type}`}>
                        {toolTypeLabel(result.tool_type)}
                      </span>
                    </td>
                    <td className="snippet-cell">{getSnippet(result.content)}</td>
                    <td className="date-cell">{formatDate(result.created_at)}</td>
                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                      <button className="btn-icon" title="View" onClick={() => handleViewDetail(result)}>
                        <FiEye />
                      </button>
                      <button className="btn-icon btn-icon-danger" title="Delete" onClick={() => setDeleteTarget(result)}>
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
          />
        </>
      )}

      {/* Detail Modal */}
      {selectedResult && (
        <div className="modal-overlay" onClick={() => setSelectedResult(null)}>
          <div className="modal detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedResult.title}</h2>
              <button className="modal-close" onClick={() => setSelectedResult(null)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-meta">
                <span className={`tool-badge tool-badge-${selectedResult.tool_type}`}>
                  {toolTypeLabel(selectedResult.tool_type)}
                </span>
                <span className="detail-date">{formatDate(selectedResult.created_at)}</span>
                {selectedResult.model && <span className="detail-model">Model: {selectedResult.model}</span>}
                {selectedResult.tokens_used && <span className="detail-tokens">Tokens: {selectedResult.tokens_used}</span>}
              </div>

              <div className="detail-section">
                <div className="detail-section-header">
                  <h3>Result</h3>
                  <button
                    className={`btn btn-sm btn-secondary copy-btn ${copied ? 'copied' : ''}`}
                    onClick={() => handleCopy(selectedResult.content || '')}
                  >
                    <FiCopy /> {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="detail-content">
                  <pre>{selectedResult.content}</pre>
                </div>
              </div>

              {selectedResult.input_data && Object.keys(selectedResult.input_data).length > 0 && (
                <div className="detail-section">
                  <h3>Input Data</h3>
                  <div className="detail-content detail-input-data">
                    {Object.entries(selectedResult.input_data).map(([key, value]) => (
                      <div key={key} className="input-data-row">
                        <span className="input-data-key">{key.replace(/_/g, ' ')}:</span>
                        <span className="input-data-value">{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={() => { setDeleteTarget(selectedResult); }}>
                <FiTrash2 /> Delete
              </button>
              <button className="btn btn-secondary" onClick={() => setSelectedResult(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete AI Result"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default AIHistory;
