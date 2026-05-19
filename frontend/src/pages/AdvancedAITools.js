import React, { useState, useEffect } from 'react';
import { api } from '../App';
import { useToast } from '../components/Toast';
import ReactMarkdown from 'react-markdown';
import {
  FiCpu, FiCheckSquare, FiTarget, FiCopy, FiDownload, FiRefreshCw,
  FiTrendingUp, FiClipboard, FiUsers
} from 'react-icons/fi';
import './AITools.css';

const AdvancedAITools = () => {
  const toast = useToast();
  const [organizations, setOrganizations] = useState([]);
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [activeTab, setActiveTab] = useState('outline');

  // Forms
  const [outlineForm, setOutlineForm] = useState({
    organization_id: '',
    grant_id: '',
    project_summary: ''
  });
  const [gapForm, setGapForm] = useState({
    organization_id: '',
    grant_id: '',
    funder_requirements: ''
  });
  const [complianceForm, setComplianceForm] = useState({
    proposal_content: '',
    funder_requirements: ''
  });
  const [impactForm, setImpactForm] = useState({
    organization_id: '',
    project_description: '',
    target_population: '',
    budget_amount: '',
    duration_months: ''
  });
  const [auditForm, setAuditForm] = useState({
    reporting_period: '',
    grant_id: '',
    organization_id: '',
    achievements_summary: ''
  });
  const [funderForm, setFunderForm] = useState({
    funder_name: '',
    organization_id: '',
    relationship_stage: '',
    last_interaction_summary: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [orgsRes, grantsRes] = await Promise.all([
        api.get('/organizations'),
        api.get('/grants')
      ]);
      setOrganizations(orgsRes.data || []);
      setGrants(grantsRes.data || []);
    } catch (error) {
      toast.error('Failed to load reference data');
    }
  };

  const getErrorMessage = (error) => {
    if (error.response?.status === 429) return 'Rate limit reached. Please wait a few minutes.';
    if (error.response?.status === 503) return 'AI service is not configured on the server (missing API key). Please contact your administrator.';
    return error.response?.data?.error || error.message || 'An unexpected error occurred';
  };

  const handleOutline = async () => {
    if (!outlineForm.grant_id) {
      toast.warning('Please select a grant');
      return;
    }
    setLoading(true);
    setAiResult(null);
    try {
      const response = await api.post('/ai/proposal-outline-generator', outlineForm);
      const content = response.data.outline || response.data.result || JSON.stringify(response.data, null, 2);
      setAiResult({ type: 'outline', title: 'Proposal Outline', content });
      toast.success('Outline generated!');
    } catch (error) {
      const msg = getErrorMessage(error);
      setAiResult({ type: 'error', title: 'Error', content: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGap = async () => {
    if (!gapForm.organization_id) {
      toast.warning('Please select an organization');
      return;
    }
    setLoading(true);
    setAiResult(null);
    try {
      const response = await api.post('/ai/gap-analysis', gapForm);
      const content = response.data.analysis || response.data.result || JSON.stringify(response.data, null, 2);
      setAiResult({ type: 'gap', title: 'Gap Analysis', content });
      toast.success('Gap analysis complete!');
    } catch (error) {
      const msg = getErrorMessage(error);
      setAiResult({ type: 'error', title: 'Error', content: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCompliance = async () => {
    if (!complianceForm.proposal_content.trim() || !complianceForm.funder_requirements.trim()) {
      toast.warning('Please provide both proposal content and funder requirements');
      return;
    }
    setLoading(true);
    setAiResult(null);
    try {
      const response = await api.post('/ai/compliance-checker', complianceForm);
      const content = response.data.report || response.data.result || JSON.stringify(response.data, null, 2);
      setAiResult({ type: 'compliance', title: 'Compliance Scorecard', content });
      toast.success('Compliance check complete!');
    } catch (error) {
      const msg = getErrorMessage(error);
      setAiResult({ type: 'error', title: 'Error', content: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleImpact = async () => {
    if (!impactForm.project_description.trim()) {
      toast.warning('Please describe the project');
      return;
    }
    setLoading(true);
    setAiResult(null);
    try {
      const response = await api.post('/ai/impact-simulator', impactForm);
      const content = response.data.simulation || response.data.result || JSON.stringify(response.data, null, 2);
      setAiResult({ type: 'impact', title: 'Impact Simulation', content });
      toast.success('Impact simulation complete!');
    } catch (error) {
      const msg = getErrorMessage(error);
      setAiResult({ type: 'error', title: 'Error', content: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAudit = async () => {
    if (!auditForm.reporting_period.trim()) {
      toast.warning('Please specify a reporting period');
      return;
    }
    setLoading(true);
    setAiResult(null);
    try {
      const response = await api.post('/ai/audit-prep', auditForm);
      const content = response.data.report || response.data.result || JSON.stringify(response.data, null, 2);
      setAiResult({ type: 'audit', title: 'Audit Prep', content });
      toast.success('Audit-prep package generated!');
    } catch (error) {
      const msg = getErrorMessage(error);
      setAiResult({ type: 'error', title: 'Error', content: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFunder = async () => {
    if (!funderForm.funder_name.trim()) {
      toast.warning('Please enter a funder name');
      return;
    }
    setLoading(true);
    setAiResult(null);
    try {
      const response = await api.post('/ai/funder-relationship', funderForm);
      const content = response.data.plan || response.data.result || JSON.stringify(response.data, null, 2);
      setAiResult({ type: 'funder', title: 'Funder Relationship Plan', content });
      toast.success('Funder plan generated!');
    } catch (error) {
      const msg = getErrorMessage(error);
      setAiResult({ type: 'error', title: 'Error', content: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (aiResult?.content) {
      navigator.clipboard.writeText(aiResult.content);
      toast.success('Copied!');
    }
  };

  const downloadAsText = () => {
    if (aiResult?.content) {
      const blob = new Blob([aiResult.content], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${aiResult.title.toLowerCase().replace(/\s+/g, '-')}.md`;
      link.click();
    }
  };

  const tools = [
    { id: 'outline', icon: FiCpu, label: 'Proposal Outline' },
    { id: 'gap', icon: FiTarget, label: 'Gap Analysis' },
    { id: 'compliance', icon: FiCheckSquare, label: 'Compliance Checker' },
    { id: 'impact', icon: FiTrendingUp, label: 'Impact Simulator' },
    { id: 'audit', icon: FiClipboard, label: 'Audit Prep' },
    { id: 'funder', icon: FiUsers, label: 'Funder Relations' }
  ];

  return (
    <div className="ai-tools-page">
      <div className="page-header">
        <h1>Advanced AI Tools</h1>
        <p>Outline generator, gap analysis, and compliance checking</p>
      </div>
      <div className="ai-tools-container">
        <aside className="tools-sidebar">
          <div className="tools-list">
            {tools.map(t => (
              <button
                key={t.id}
                className={`tool-btn ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => { setActiveTab(t.id); setAiResult(null); }}
              >
                <t.icon /> <span>{t.label}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="tool-content">
          {activeTab === 'outline' && (
            <div className="tool-section">
              <h2>Proposal Outline Generator</h2>
              <p>Generate a structured proposal outline from funder requirements.</p>
              <div className="form-group">
                <label>Organization</label>
                <select
                  value={outlineForm.organization_id}
                  onChange={e => setOutlineForm({ ...outlineForm, organization_id: e.target.value })}
                >
                  <option value="">-- Optional --</option>
                  {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Grant *</label>
                <select
                  value={outlineForm.grant_id}
                  onChange={e => setOutlineForm({ ...outlineForm, grant_id: e.target.value })}
                >
                  <option value="">-- Select Grant --</option>
                  {grants.map(g => <option key={g.id} value={g.id}>{g.title || g.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Project Summary</label>
                <textarea
                  value={outlineForm.project_summary}
                  onChange={e => setOutlineForm({ ...outlineForm, project_summary: e.target.value })}
                  rows={4}
                  placeholder="Optional summary of your project..."
                />
              </div>
              <button className="btn-primary" onClick={handleOutline} disabled={loading}>
                {loading ? <><FiRefreshCw className="spin" /> Generating...</> : 'Generate Outline'}
              </button>
            </div>
          )}

          {activeTab === 'gap' && (
            <div className="tool-section">
              <h2>Gap Analysis</h2>
              <p>Identify your organization's qualification gaps versus funder requirements.</p>
              <div className="form-group">
                <label>Organization *</label>
                <select
                  value={gapForm.organization_id}
                  onChange={e => setGapForm({ ...gapForm, organization_id: e.target.value })}
                >
                  <option value="">-- Select Organization --</option>
                  {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Grant</label>
                <select
                  value={gapForm.grant_id}
                  onChange={e => setGapForm({ ...gapForm, grant_id: e.target.value })}
                >
                  <option value="">-- Optional --</option>
                  {grants.map(g => <option key={g.id} value={g.id}>{g.title || g.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Funder Requirements (text)</label>
                <textarea
                  value={gapForm.funder_requirements}
                  onChange={e => setGapForm({ ...gapForm, funder_requirements: e.target.value })}
                  rows={6}
                  placeholder="Paste funder requirements text here..."
                />
              </div>
              <button className="btn-primary" onClick={handleGap} disabled={loading}>
                {loading ? <><FiRefreshCw className="spin" /> Analyzing...</> : 'Run Gap Analysis'}
              </button>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="tool-section">
              <h2>Compliance Checker</h2>
              <p>Audit your proposal against funder requirements and produce a compliance scorecard.</p>
              <div className="form-group">
                <label>Proposal Content *</label>
                <textarea
                  value={complianceForm.proposal_content}
                  onChange={e => setComplianceForm({ ...complianceForm, proposal_content: e.target.value })}
                  rows={8}
                  placeholder="Paste full proposal text..."
                />
              </div>
              <div className="form-group">
                <label>Funder Requirements *</label>
                <textarea
                  value={complianceForm.funder_requirements}
                  onChange={e => setComplianceForm({ ...complianceForm, funder_requirements: e.target.value })}
                  rows={6}
                  placeholder="Paste funder requirements/RFP..."
                />
              </div>
              <button className="btn-primary" onClick={handleCompliance} disabled={loading}>
                {loading ? <><FiRefreshCw className="spin" /> Checking...</> : 'Check Compliance'}
              </button>
            </div>
          )}

          {activeTab === 'impact' && (
            <div className="tool-section">
              <h2>Impact Simulator</h2>
              <p>Project social impact, beneficiaries, and KPI ranges for a planned project.</p>
              <div className="form-group">
                <label>Organization</label>
                <select
                  value={impactForm.organization_id}
                  onChange={e => setImpactForm({ ...impactForm, organization_id: e.target.value })}
                >
                  <option value="">-- Optional --</option>
                  {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Project Description *</label>
                <textarea
                  value={impactForm.project_description}
                  onChange={e => setImpactForm({ ...impactForm, project_description: e.target.value })}
                  rows={6}
                  placeholder="Describe the project: who, what, where, how..."
                />
              </div>
              <div className="form-group">
                <label>Target Population</label>
                <input
                  type="text"
                  value={impactForm.target_population}
                  onChange={e => setImpactForm({ ...impactForm, target_population: e.target.value })}
                  placeholder="e.g., Low-income youth ages 12-18"
                />
              </div>
              <div className="form-group">
                <label>Budget (USD)</label>
                <input
                  type="number"
                  value={impactForm.budget_amount}
                  onChange={e => setImpactForm({ ...impactForm, budget_amount: e.target.value })}
                  placeholder="e.g., 250000"
                />
              </div>
              <div className="form-group">
                <label>Duration (months)</label>
                <input
                  type="number"
                  value={impactForm.duration_months}
                  onChange={e => setImpactForm({ ...impactForm, duration_months: e.target.value })}
                  placeholder="e.g., 12"
                />
              </div>
              <button className="btn-primary" onClick={handleImpact} disabled={loading}>
                {loading ? <><FiRefreshCw className="spin" /> Simulating...</> : 'Simulate Impact'}
              </button>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="tool-section">
              <h2>Audit Prep</h2>
              <p>Generate a quarterly or annual reporting / audit-prep checklist.</p>
              <div className="form-group">
                <label>Reporting Period *</label>
                <input
                  type="text"
                  value={auditForm.reporting_period}
                  onChange={e => setAuditForm({ ...auditForm, reporting_period: e.target.value })}
                  placeholder="e.g., Q1 2026 or Annual 2025"
                />
              </div>
              <div className="form-group">
                <label>Grant</label>
                <select
                  value={auditForm.grant_id}
                  onChange={e => setAuditForm({ ...auditForm, grant_id: e.target.value })}
                >
                  <option value="">-- Optional --</option>
                  {grants.map(g => <option key={g.id} value={g.id}>{g.title || g.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Organization</label>
                <select
                  value={auditForm.organization_id}
                  onChange={e => setAuditForm({ ...auditForm, organization_id: e.target.value })}
                >
                  <option value="">-- Optional --</option>
                  {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Achievements / Activities Summary</label>
                <textarea
                  value={auditForm.achievements_summary}
                  onChange={e => setAuditForm({ ...auditForm, achievements_summary: e.target.value })}
                  rows={5}
                  placeholder="Briefly note key achievements, expenditures, or activities for this period..."
                />
              </div>
              <button className="btn-primary" onClick={handleAudit} disabled={loading}>
                {loading ? <><FiRefreshCw className="spin" /> Preparing...</> : 'Generate Audit Prep'}
              </button>
            </div>
          )}

          {activeTab === 'funder' && (
            <div className="tool-section">
              <h2>Funder Relationship Plan</h2>
              <p>Build a stewardship & cultivation plan for a specific funder.</p>
              <div className="form-group">
                <label>Funder Name *</label>
                <input
                  type="text"
                  value={funderForm.funder_name}
                  onChange={e => setFunderForm({ ...funderForm, funder_name: e.target.value })}
                  placeholder="e.g., Ford Foundation"
                />
              </div>
              <div className="form-group">
                <label>Organization</label>
                <select
                  value={funderForm.organization_id}
                  onChange={e => setFunderForm({ ...funderForm, organization_id: e.target.value })}
                >
                  <option value="">-- Optional --</option>
                  {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Relationship Stage</label>
                <select
                  value={funderForm.relationship_stage}
                  onChange={e => setFunderForm({ ...funderForm, relationship_stage: e.target.value })}
                >
                  <option value="">-- Select --</option>
                  <option value="new">New / Prospective</option>
                  <option value="cultivating">Cultivating</option>
                  <option value="active">Active Grantee</option>
                  <option value="lapsed">Lapsed</option>
                </select>
              </div>
              <div className="form-group">
                <label>Last Interaction Summary</label>
                <textarea
                  value={funderForm.last_interaction_summary}
                  onChange={e => setFunderForm({ ...funderForm, last_interaction_summary: e.target.value })}
                  rows={5}
                  placeholder="When did you last connect, what was discussed, and what's the open thread..."
                />
              </div>
              <button className="btn-primary" onClick={handleFunder} disabled={loading}>
                {loading ? <><FiRefreshCw className="spin" /> Building...</> : 'Build Plan'}
              </button>
            </div>
          )}

          {aiResult && (
            <div className="ai-result-card">
              <div className="result-header">
                <h3>{aiResult.title}</h3>
                {aiResult.type !== 'error' && (
                  <div className="result-actions">
                    <button onClick={copyToClipboard} title="Copy"><FiCopy /></button>
                    <button onClick={downloadAsText} title="Download"><FiDownload /></button>
                  </div>
                )}
              </div>
              <div className={`result-content ${aiResult.type === 'error' ? 'error' : ''}`}>
                <ReactMarkdown>{String(aiResult.content)}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedAITools;
