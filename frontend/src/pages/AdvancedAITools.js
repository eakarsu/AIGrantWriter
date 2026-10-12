
import FullAIExamples, { useFullAIExamples } from "../components/FullAIExamples.jsx";
import React, { useState, useEffect } from 'react';
import { api } from '../App';
import { useToast } from '../components/Toast';
import AIReport from '../components/AIReport';
import {
  FiCpu, FiCheckSquare, FiTarget, FiCopy, FiDownload, FiRefreshCw,
  FiTrendingUp, FiClipboard, FiUsers
} from 'react-icons/fi';
import './AITools.css';

const AdvancedAITools = () => {
  const fullAIExamples = useFullAIExamples();

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
      setOrganizations(Array.isArray(orgsRes.data?.data) ? orgsRes.data.data : []);
      setGrants(Array.isArray(grantsRes.data?.data) ? grantsRes.data.data : []);
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
      const content = response.data.outline ?? response.data.result ?? response.data;
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
      const content = response.data.analysis ?? response.data.result ?? response.data;
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
      const content = response.data.report ?? response.data.result ?? response.data;
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
      const content = response.data.simulation ?? response.data.result ?? response.data;
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
      const content = response.data.report ?? response.data.result ?? response.data;
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
      const content = response.data.plan ?? response.data.result ?? response.data;
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
    <div className="ai-tools-page" data-full-ai-workspace="AdvancedAITools"><FullAIExamples controller={fullAIExamples} disabled={Boolean(loading)} />
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
                  onChange={e => setOutlineForm({ ...outlineForm, organization_id: e.target.value })} data-full-ai-field={fullAIExamples.bind({ current: outlineForm.organization_id, change: e => setOutlineForm({ ...outlineForm, organization_id: e.target.value }), label: "outlineForm.organization_id", manual: false, json: false, sample: '' }, "p1-8731", undefined)}
                >
                  <option value="">-- Optional --</option>
                  {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Grant *</label>
                <select
                  value={outlineForm.grant_id}
                  onChange={e => setOutlineForm({ ...outlineForm, grant_id: e.target.value })} data-full-ai-field={fullAIExamples.bind({ current: outlineForm.grant_id, change: e => setOutlineForm({ ...outlineForm, grant_id: e.target.value }), label: "outlineForm.grant_id", manual: false, json: false, sample: '' }, "p1-9211", undefined)}
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
                  placeholder="Optional summary of your project..." data-full-ai-field={fullAIExamples.bind({ current: outlineForm.project_summary, change: e => setOutlineForm({ ...outlineForm, project_summary: e.target.value }), label: "outlineForm.project_summary", manual: false, json: false, sample: '' }, "p1-9693", undefined)}
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
                  onChange={e => setGapForm({ ...gapForm, organization_id: e.target.value })} data-full-ai-field={fullAIExamples.bind({ current: gapForm.organization_id, change: e => setGapForm({ ...gapForm, organization_id: e.target.value }), label: "gapForm.organization_id", manual: false, json: false, sample: '' }, "p1-10559", undefined)}
                >
                  <option value="">-- Select Organization --</option>
                  {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Grant</label>
                <select
                  value={gapForm.grant_id}
                  onChange={e => setGapForm({ ...gapForm, grant_id: e.target.value })} data-full-ai-field={fullAIExamples.bind({ current: gapForm.grant_id, change: e => setGapForm({ ...gapForm, grant_id: e.target.value }), label: "gapForm.grant_id", manual: false, json: false, sample: '' }, "p1-11036", undefined)}
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
                  placeholder="Paste funder requirements text here..." data-full-ai-field={fullAIExamples.bind({ current: gapForm.funder_requirements, change: e => setGapForm({ ...gapForm, funder_requirements: e.target.value }), label: "gapForm.funder_requirements", manual: false, json: false, sample: '' }, "p1-11513", undefined)}
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
                  placeholder="Paste full proposal text..." data-full-ai-field={fullAIExamples.bind({ current: complianceForm.proposal_content, change: e => setComplianceForm({ ...complianceForm, proposal_content: e.target.value }), label: "complianceForm.proposal_content", manual: false, json: false, sample: '' }, "p1-12398", undefined)}
                />
              </div>
              <div className="form-group">
                <label>Funder Requirements *</label>
                <textarea
                  value={complianceForm.funder_requirements}
                  onChange={e => setComplianceForm({ ...complianceForm, funder_requirements: e.target.value })}
                  rows={6}
                  placeholder="Paste funder requirements/RFP..." data-full-ai-field={fullAIExamples.bind({ current: complianceForm.funder_requirements, change: e => setComplianceForm({ ...complianceForm, funder_requirements: e.target.value }), label: "complianceForm.funder_requirements", manual: false, json: false, sample: '' }, "p1-12814", undefined)}
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
                  onChange={e => setImpactForm({ ...impactForm, organization_id: e.target.value })} data-full-ai-field={fullAIExamples.bind({ current: impactForm.organization_id, change: e => setImpactForm({ ...impactForm, organization_id: e.target.value }), label: "impactForm.organization_id", manual: false, json: false, sample: '' }, "p1-13700", undefined)}
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
                  placeholder="Describe the project: who, what, where, how..." data-full-ai-field={fullAIExamples.bind({ current: impactForm.project_description, change: e => setImpactForm({ ...impactForm, project_description: e.target.value }), label: "impactForm.project_description", manual: false, json: false, sample: '' }, "p1-14191", undefined)}
                />
              </div>
              <div className="form-group">
                <label>Target Population</label>
                <input
                  type="text"
                  value={impactForm.target_population}
                  onChange={e => setImpactForm({ ...impactForm, target_population: e.target.value })}
                  placeholder="e.g., Low-income youth ages 12-18" data-full-ai-field={fullAIExamples.bind({ current: impactForm.target_population, change: e => setImpactForm({ ...impactForm, target_population: e.target.value }), label: "impactForm.target_population", manual: false, json: false, sample: '' }, "p1-14616", undefined)}
                />
              </div>
              <div className="form-group">
                <label>Budget (USD)</label>
                <input
                  type="number"
                  value={impactForm.budget_amount}
                  onChange={e => setImpactForm({ ...impactForm, budget_amount: e.target.value })}
                  placeholder="e.g., 250000" data-full-ai-field={fullAIExamples.bind({ current: impactForm.budget_amount, change: e => setImpactForm({ ...impactForm, budget_amount: e.target.value }), label: "impactForm.budget_amount", manual: false, json: false, sample: '' }, "p1-15019", undefined)}
                />
              </div>
              <div className="form-group">
                <label>Duration (months)</label>
                <input
                  type="number"
                  value={impactForm.duration_months}
                  onChange={e => setImpactForm({ ...impactForm, duration_months: e.target.value })}
                  placeholder="e.g., 12" data-full-ai-field={fullAIExamples.bind({ current: impactForm.duration_months, change: e => setImpactForm({ ...impactForm, duration_months: e.target.value }), label: "impactForm.duration_months", manual: false, json: false, sample: '' }, "p1-15400", undefined)}
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
                  placeholder="e.g., Q1 2026 or Annual 2025" data-full-ai-field={fullAIExamples.bind({ current: auditForm.reporting_period, change: e => setAuditForm({ ...auditForm, reporting_period: e.target.value }), label: "auditForm.reporting_period", manual: false, json: false, sample: '' }, "p1-16229", undefined)}
                />
              </div>
              <div className="form-group">
                <label>Grant</label>
                <select
                  value={auditForm.grant_id}
                  onChange={e => setAuditForm({ ...auditForm, grant_id: e.target.value })} data-full-ai-field={fullAIExamples.bind({ current: auditForm.grant_id, change: e => setAuditForm({ ...auditForm, grant_id: e.target.value }), label: "auditForm.grant_id", manual: false, json: false, sample: '' }, "p1-16615", undefined)}
                >
                  <option value="">-- Optional --</option>
                  {grants.map(g => <option key={g.id} value={g.id}>{g.title || g.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Organization</label>
                <select
                  value={auditForm.organization_id}
                  onChange={e => setAuditForm({ ...auditForm, organization_id: e.target.value })} data-full-ai-field={fullAIExamples.bind({ current: auditForm.organization_id, change: e => setAuditForm({ ...auditForm, organization_id: e.target.value }), label: "auditForm.organization_id", manual: false, json: false, sample: '' }, "p1-17084", undefined)}
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
                  placeholder="Briefly note key achievements, expenditures, or activities for this period..." data-full-ai-field={fullAIExamples.bind({ current: auditForm.achievements_summary, change: e => setAuditForm({ ...auditForm, achievements_summary: e.target.value }), label: "auditForm.achievements_summary", manual: false, json: false, sample: '' }, "p1-17584", undefined)}
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
                  placeholder="e.g., Ford Foundation" data-full-ai-field={fullAIExamples.bind({ current: funderForm.funder_name, change: e => setFunderForm({ ...funderForm, funder_name: e.target.value }), label: "funderForm.funder_name", manual: false, json: false, sample: '' }, "p1-18496", undefined)}
                />
              </div>
              <div className="form-group">
                <label>Organization</label>
                <select
                  value={funderForm.organization_id}
                  onChange={e => setFunderForm({ ...funderForm, organization_id: e.target.value })} data-full-ai-field={fullAIExamples.bind({ current: funderForm.organization_id, change: e => setFunderForm({ ...funderForm, organization_id: e.target.value }), label: "funderForm.organization_id", manual: false, json: false, sample: '' }, "p1-18875", undefined)}
                >
                  <option value="">-- Optional --</option>
                  {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Relationship Stage</label>
                <select
                  value={funderForm.relationship_stage}
                  onChange={e => setFunderForm({ ...funderForm, relationship_stage: e.target.value })} data-full-ai-field={fullAIExamples.bind({ current: funderForm.relationship_stage, change: e => setFunderForm({ ...funderForm, relationship_stage: e.target.value }), label: "funderForm.relationship_stage", manual: false, json: false, sample: '' }, "p1-19363", undefined)}
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
                  placeholder="When did you last connect, what was discussed, and what's the open thread..." data-full-ai-field={fullAIExamples.bind({ current: funderForm.last_interaction_summary, change: e => setFunderForm({ ...funderForm, last_interaction_summary: e.target.value }), label: "funderForm.last_interaction_summary", manual: false, json: false, sample: '' }, "p1-20021", undefined)}
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
                <AIReport response={aiResult.content} title="AI analysis" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedAITools;
